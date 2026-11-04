import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Flip } from "gsap/Flip";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";

gsap.registerPlugin(ScrollTrigger, Flip, DrawSVGPlugin);

/*
 * Scroll-scrubbed assembly engine.
 * Every section has one progress value p (0..1) tweened by a ScrollTrigger.
 * Everything visible is a pure function of p, so scrolling up reverses it exactly.
 * Each frame does all layout reads first, then all writes.
 */

// Section timeline: every glyph launches together; each word/line box starts drawing
// just before that word lands, so measuring overlaps flight instead of queuing behind it.
const ASSEMBLE: [number, number] = [0.03, 0.72];
const SECTION_BOX_AT = 0.72;
const BOX_LEAD = 0.03; // stroke starts this much before the last glyph lands
const FLIGHT = 0.6; // share of the assembly window each glyph spends in flight
const JITTER = 0.3; // launch spread, so the burst reads as one event, not a queue
const BOX_SPAN = 0.12; // word/line box lifetime, in section progress
const SECTION_BOX_SPAN = 0.08;
const MAX_LIVE_BOXES = 6;
const EMIT_HOLD_MS = 400; // keeps pool glyph flashes under 3 per second
const RECOUNT_MS = 300;
const PARTICLE_CAP = 3000;
const SPLIT_PX = 4;

const ease = gsap.parseEase("power3.inOut");
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const DIGITS = "0123456789";
const SYMS = "#%&/+=<>$@";

// Characters the pangram lacks mutate from the nearest-looking pool glyph.
const LOOKALIKE: Record<string, string> = {
  "0": "o", "1": "l", "2": "z", "3": "e", "4": "h", "5": "s", "6": "b", "7": "t", "8": "b", "9": "q",
  $: "s", "@": "a", "%": "o", "/": "l", "&": "e", "×": "x", "+": "t", "-": "i", "(": "c", ")": "j",
  "'": ",", ":": ";", "!": "i", "?": "q", "░": "x", "·": ".", "#": "h", "*": "x", "|": "l", _: "i",
  "=": "z", "<": "k", ">": "v", '"': ",",
};

function hash(a: number, b: number) {
  let h = Math.imul(a, 374761393) + Math.imul(b, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}
const swapCase = (c: string) => (c === c.toLowerCase() ? c.toUpperCase() : c.toLowerCase());

type Src = { x: number; y: number; h: number };
type Target = { ch: string; rx: number; ry: number; w: number; h: number; font: string; color: string; parent: HTMLElement };
type Glyph = Target & {
  from: string; mutate: boolean; src: number; seed: number; s: number;
  node?: HTMLSpanElement; shown?: string; op?: string; tf?: string;
};
type Unit = { el: HTMLElement; mode: "dom" | "canvas"; a: number; b: number; glyphs: Glyph[]; words: HTMLElement[]; op: string };
type Box = {
  kind: "section" | "heading" | "word" | "line"; label: string; at: number;
  rx: number; ry: number; w: number; h: number; docX: number; docY: number;
};
type Run = { section: HTMLElement; p: number; top: number; left: number; visible: boolean; units: Unit[]; boxes: Box[] };
type SvgBox = {
  root: SVGGElement; stroke: SVGPathElement; dash: SVGPathElement; ticks: SVGPathElement;
  chip: SVGGElement; chipRect: SVGRectElement; chipText: SVGTextElement; xy: SVGTextElement;
  dims: SVGGElement; dimPath: SVGPathElement; dimW: SVGTextElement; dimH: SVGTextElement;
  cache: Record<string, string>;
};

/* ---------- glyph atlas: each glyph rasterized once, then blitted ---------- */

type Cell = { x: number; y: number; w: number; h: number };
class Atlas {
  readonly canvas = document.createElement("canvas");
  private ctx = this.canvas.getContext("2d")!;
  private cells = new Map<string, Cell>();
  private cx = 0;
  private cy = 0;
  private rowH = 0;
  constructor(private dpr: number) {
    this.canvas.width = this.canvas.height = 2048;
  }
  cell(ch: string, font: string, color: string): Cell {
    const key = font + "|" + color + "|" + ch;
    const hit = this.cells.get(key);
    if (hit) return hit;
    const { ctx, dpr: d } = this;
    ctx.setTransform(d, 0, 0, d, 0, 0);
    ctx.font = font;
    const m = ctx.measureText(ch);
    const asc = m.fontBoundingBoxAscent;
    const w = Math.ceil((m.width + 2) * d);
    const h = Math.ceil((asc + m.fontBoundingBoxDescent) * d);
    if (this.cx + w > this.canvas.width) {
      this.cx = 0;
      this.cy += this.rowH;
      this.rowH = 0;
    }
    if (this.cy + h > this.canvas.height) {
      // ponytail: full reset when the atlas fills; one page's glyph set fits easily at 2048²
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.setTransform(d, 0, 0, d, 0, 0);
      this.cells.clear();
      this.cx = this.cy = this.rowH = 0;
    }
    ctx.fillStyle = color;
    ctx.textBaseline = "alphabetic";
    ctx.fillText(ch, this.cx / d + 1, this.cy / d + asc);
    const cell = { x: this.cx, y: this.cy, w, h };
    this.cx += w + 2;
    this.rowH = Math.max(this.rowH, h + 2);
    this.cells.set(key, cell);
    return cell;
  }
}

/* ---------- measurement (read phase only) ---------- */

function measureChars(el: HTMLElement, ox: number, oy: number): Target[] {
  const out: Target[] = [];
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  const styles = new Map<Element, { font: string; color: string }>();
  for (let n = walker.nextNode() as Text | null; n; n = walker.nextNode() as Text | null) {
    const parent = n.parentElement!;
    if (parent.closest(".sr-only")) continue;
    let st = styles.get(parent);
    if (!st) {
      const cs = getComputedStyle(parent);
      st = { font: `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`, color: cs.color };
      styles.set(parent, st);
    }
    const text = n.data;
    for (let i = 0; i < text.length; i++) {
      if (/\s/.test(text[i])) continue;
      range.setStart(n, i);
      range.setEnd(n, i + 1);
      const r = range.getClientRects()[0];
      if (r) out.push({ ch: text[i], rx: r.left - ox, ry: r.top - oy, w: r.width, h: r.height, ...st, parent });
    }
  }
  return out;
}

function label(el: Element) {
  const tag = el.tagName.toLowerCase();
  if (el.id) return `${tag}#${el.id}`;
  const cls = el.classList[0];
  return cls ? `${tag}.${cls}` : tag;
}

/* ---------- lifecycle ---------- */

export function startEngine(): () => void {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return startReduced();

  const root = document.documentElement;
  let teardown: (() => void) | null = null;
  let resizeAt = -Infinity;
  let last = { w: innerWidth, h: innerHeight };
  let timer = 0;
  let alive = true;
  const once = { glitched: false }; // survives resize rebuilds: the screen glitch plays once per visit

  const boot = () => {
    teardown?.();
    teardown = build(resizeAt, once);
  };
  root.classList.add("engine-on");
  document.fonts.ready.then(() => alive && boot());

  // Rebuild on real viewport changes only (mobile URL-bar jitter is ignored).
  const ro = new ResizeObserver(() => {
    const w = innerWidth, h = innerHeight;
    if (w === last.w && Math.abs(h - last.h) < 120) return;
    last = { w, h };
    clearTimeout(timer);
    timer = window.setTimeout(() => {
      resizeAt = performance.now();
      boot();
    }, 200);
  });
  ro.observe(document.querySelector<HTMLCanvasElement>("canvas.stage")!);

  return () => {
    alive = false;
    ro.disconnect();
    clearTimeout(timer);
    teardown?.();
    root.classList.remove("engine-on");
  };
}

/* Reduced motion: static text, sections crossfade in, no inspector. */
function startReduced(): () => void {
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add("is-in")),
    { threshold: 0.15 },
  );
  document.querySelectorAll("section").forEach((s) => io.observe(s));
  return () => io.disconnect();
}

/* ---------- build: measure everything, then wire ScrollTriggers ---------- */

/*
 * One-shot full-screen slice glitch (green, pink, white, black).
 * Exactly 3 pulses inside 0.6 s: the WCAG 2.3.1 ceiling, never more.
 */
function screenGlitch(layer: HTMLElement, pool: HTMLElement) {
  const COLORS = ["#00ff85", "#ff2e97", "#ffffff", "#000000"];
  const bands = Array.from({ length: 12 }, (_, i) => {
    const b = document.createElement("div");
    const color = COLORS[i % COLORS.length];
    b.className = "gband";
    // Every third band is a Ben-Day dot screen instead of a flat fill: comic-print texture.
    b.style.background = i % 3 === 1 && color !== "#000000"
      ? `radial-gradient(circle, ${color} 0 38%, transparent 40%) 0 0 / 9px 9px`
      : color;
    if (i % COLORS.length === 2) b.style.mixBlendMode = "difference";
    layer.appendChild(b);
    return b;
  });
  const ghost = pool.querySelector<HTMLElement>(".pool-glitch");
  const r = gsap.utils.random;
  const frame = () => {
    bands.forEach((b) => {
      const top = r(0, 92, 1);
      const show = Math.random() < 0.6;
      gsap.set(b, {
        clipPath: `inset(${top}% 0 ${Math.max(0, 100 - top - r(2, 9, 1))}% 0)`,
        x: r(-80, 80, 1),
        opacity: show ? r(0.55, 0.9) : 0,
      });
    });
    if (ghost) {
      const top = r(10, 60, 1);
      gsap.set(ghost, { clipPath: `inset(${top}% 0 ${100 - top - r(20, 40, 1)}% 0)`, x: r([-24, 24]), opacity: 1 });
    }
  };
  const off = () => {
    gsap.set(bands, { opacity: 0 });
    if (ghost) gsap.set(ghost, { opacity: 0, x: 0 });
  };
  window.dispatchEvent(new Event("pangram:glitch")); // the 3D layer tears in sync
  const tl = gsap.timeline({ onComplete: () => layer.replaceChildren() });
  // pulse = on, re-slice, off. Re-slicing inside a pulse changes pattern, not luminance state.
  for (const at of [0, 0.22, 0.48]) {
    tl.call(frame, [], at).call(frame, [], at + 0.04).call(off, [], at + 0.09);
  }
  return tl;
}

function build(resizeAt: number, once: { glitched: boolean }): () => void {
  const mobile = matchMedia("(max-width: 767px)").matches;
  const dpr = Math.min(2, devicePixelRatio || 1);
  const canvas = document.querySelector<HTMLCanvasElement>("canvas.stage")!;
  const c2d = canvas.getContext("2d")!;
  const flight = document.querySelector<HTMLElement>(".flight")!;
  const svg = document.querySelector<SVGSVGElement>("svg.inspector")!;
  const pool = document.querySelector<HTMLElement>(".pool")!;
  const twin = document.querySelector<HTMLElement>(".pool-twin")!;
  const hudGlyphs = document.getElementById("hud-glyphs")!;
  const hudNodes = document.getElementById("hud-nodes")!;
  const atlas = new Atlas(dpr);

  const vw = innerWidth, vh = innerHeight;
  canvas.width = Math.round(vw * dpr);
  canvas.height = Math.round(vh * dpr);
  c2d.setTransform(dpr, 0, 0, dpr, 0, 0);

  // Pool: source positions come from the docked twin (fixed, so scroll-independent).
  const twinSpans = [...twin.querySelectorAll<HTMLElement>(".pc")];
  const pangram = twinSpans.map((s) => s.textContent ?? " ").join("");
  const poolSpans = [...pool.querySelectorAll<HTMLElement>(".pc")];
  const srcs: Src[] = twinSpans.map((s) => {
    const r = s.getBoundingClientRect();
    return { x: r.left, y: r.top, h: r.height };
  });
  const byChar = new Map<string, number[]>();
  [...pangram].forEach((c, i) => {
    if (c === " ") return;
    const k = c.toLowerCase();
    byChar.set(k, [...(byChar.get(k) ?? []), i]);
  });
  const pick = (ch: string, k: number) => {
    let list = byChar.get(ch.toLowerCase());
    let mutate = false;
    if (!list) {
      const base = ch.normalize("NFD")[0].toLowerCase(); // accented letters start from their base glyph
      list = byChar.get(base) ?? byChar.get(LOOKALIKE[ch] ?? "x") ?? byChar.get("x")!;
      mutate = true;
    }
    const src = list[k % list.length];
    return { src, from: pangram[src], mutate };
  };

  // Label advance measured once, so chip widths never read SVG layout per frame.
  const mctx = document.createElement("canvas").getContext("2d")!;
  mctx.font = `500 12px "Martian Mono Variable", monospace`;
  const labelCharW = mctx.measureText("0").width;

  const sections = [...document.querySelectorAll<HTMLElement>("section[data-length]")];
  const runs: Run[] = sections.map(buildRun);

  function buildRun(section: HTMLElement): Run {
    const sr = section.getBoundingClientRect();
    const units: Unit[] = [...section.querySelectorAll<HTMLElement>("[data-unit]")].map((el) => {
      const targets = measureChars(el, sr.left, sr.top);
      const n = targets.length;
      const glyphs: Glyph[] = targets.map((t, i) => ({
        ...t,
        ...pick(t.ch, i + Math.round(t.rx)),
        seed: i * 31 + n,
        s: ((hash(i, n + Math.round(t.ry)) % 1000) / 1000) * JITTER,
      }));
      return {
        el,
        mode: el.dataset.unit === "dom" ? "dom" : "canvas",
        a: ASSEMBLE[0],
        b: ASSEMBLE[1],
        glyphs,
        words: [...el.querySelectorAll<HTMLElement>(".w")],
        op: "",
      };
    });
    const total = units.reduce((s, u) => s + u.glyphs.length, 0);
    if (total > PARTICLE_CAP) console.warn(`#${section.id}: ${total} glyphs over cap; word-by-word mode not built yet`);

    const boxes: Box[] = [];
    const landAt = (gs: Glyph[]) =>
      ASSEMBLE[0] + (ASSEMBLE[1] - ASSEMBLE[0]) * (Math.max(...gs.map((g) => g.s)) + FLIGHT) - BOX_LEAD;
    const rel = (r: DOMRect) => ({
      rx: r.left - sr.left, ry: r.top - sr.top, w: r.width, h: r.height,
      docX: r.left + scrollX, docY: r.top + scrollY,
    });
    for (const u of units) {
      if (!u.glyphs.length) continue;
      if (u.mode === "dom") {
        // Heading: a box per word, then one for the whole heading.
        if (u.words.length > 1) {
          for (const w of u.words) {
            const gs = u.glyphs.filter((g) => w.contains(g.parent));
            if (gs.length) boxes.push({ kind: "word", label: label(w), at: landAt(gs), ...rel(w.getBoundingClientRect()) });
          }
        }
        boxes.push({ kind: "heading", label: label(u.el), at: landAt(u.glyphs) + 0.02, ...rel(u.el.getBoundingClientRect()) });
      } else {
        // Body: a box per rendered line, never per word.
        const lines = new Map<number, Glyph[]>();
        for (const g of u.glyphs) {
          const key = Math.round(g.ry / 4);
          lines.set(key, [...(lines.get(key) ?? []), g]);
        }
        let n = 0;
        for (const gs of lines.values()) {
          n++;
          const x0 = Math.min(...gs.map((g) => g.rx));
          const y0 = Math.min(...gs.map((g) => g.ry));
          const x1 = Math.max(...gs.map((g) => g.rx + g.w));
          boxes.push({
            kind: "line", label: `${label(u.el)}:line(${n})`, at: landAt(gs),
            rx: x0, ry: y0, w: x1 - x0, h: Math.max(...gs.map((g) => g.h)),
            docX: sr.left + x0 + scrollX, docY: sr.top + y0 + scrollY,
          });
        }
      }
    }
    boxes.push({ kind: "section", label: label(section), at: SECTION_BOX_AT, ...rel(sr) });
    if (import.meta.env.DEV) {
      for (const b of boxes) {
        if ((b.kind === "section" || b.kind === "heading") && (b.h % 1 || b.docY % 1)) {
          console.warn(`fractional box ${b.label}: h ${b.h}, y ${b.docY}; fix the spacing scale`);
        }
      }
    }
    return { section, p: 0, top: sr.top, left: sr.left, visible: false, units, boxes };
  }

  // Headings fly as DOM clones in an aria-hidden layer; body glyphs go to the canvas.
  const clones: HTMLSpanElement[] = [];
  if (!mobile) {
    for (const r of runs) for (const u of r.units) {
      if (u.mode !== "dom") continue;
      for (const g of u.glyphs) {
        const s = document.createElement("span");
        s.className = "clone";
        s.style.font = g.font;
        s.style.color = g.color;
        s.style.lineHeight = `${g.h}px`;
        s.style.height = `${g.h}px`;
        s.style.opacity = "0";
        flight.appendChild(s);
        g.node = s;
        clones.push(s);
      }
    }
  }

  // Inspector: a small pool of reusable box groups, positioned by transform.
  const NS = "http://www.w3.org/2000/svg";
  const mk = <K extends keyof SVGElementTagNameMap>(tag: K, cls: string, parent: Element): SVGElementTagNameMap[K] => {
    const e = document.createElementNS(NS, tag);
    e.setAttribute("class", cls);
    parent.appendChild(e);
    return e;
  };
  svg.replaceChildren();
  svg.setAttribute("viewBox", `0 0 ${vw} ${vh}`);
  const svgPool: SvgBox[] = Array.from({ length: MAX_LIVE_BOXES + sections.length + 2 }, () => {
    const root = mk("g", "ibox", svg);
    root.style.visibility = "hidden";
    const dims = mk("g", "ibox-dims", root);
    const stroke = mk("path", "ibox-stroke", root);
    const dash = mk("path", "ibox-dash", root);
    const ticks = mk("path", "ibox-ticks", root);
    const xy = mk("text", "ibox-xy", root);
    const chip = mk("g", "ibox-chip", root);
    const chipRect = mk("rect", "ibox-chip-bg", chip);
    chipRect.setAttribute("height", "20");
    const chipText = mk("text", "ibox-chip-text", chip);
    chipText.setAttribute("x", "6");
    chipText.setAttribute("y", "14");
    return {
      root, stroke, dash, ticks, xy, chip, chipRect, chipText, dims,
      dimPath: mk("path", "ibox-dim", dims),
      dimW: mk("text", "ibox-dim-text", dims),
      dimH: mk("text", "ibox-dim-text", dims),
      cache: {},
    };
  });

  const put = (b: SvgBox, el: Element, key: string, attr: string, v: string) => {
    if (b.cache[key] === v) return;
    b.cache[key] = v;
    if (attr === "text") el.textContent = v;
    else if (attr === "visibility") (el as SVGElement).style.visibility = v;
    else el.setAttribute(attr, v);
  };

  // Digits lock left to right as c goes 0..1; deterministic so scrubbing back reverses it.
  const scramble = (v: number, c: number, seed: number) => {
    const s = String(Math.round(v));
    if (c >= 1) return s;
    const lock = Math.floor(c * s.length);
    let o = "";
    for (let i = 0; i < s.length; i++) o += i < lock ? s[i] : DIGITS[hash(seed + i, Math.floor(c * 30)) % 10];
    return o;
  };

  function drawBox(sb: SvgBox, b: Box, r: Run, local: number, now: number, sx: number, sy: number) {
    const persisted = b.kind === "section" && local >= 1;
    const x = Math.round(r.left + b.rx), y = Math.round(r.top + b.ry);
    const w = Math.round(b.w), h = Math.round(b.h);
    put(sb, sb.root, "vis", "visibility", "visible");
    put(sb, sb.root, "tf", "transform", `translate(${x} ${y})`);
    const d = `M0 0H${w}V${h}H0Z`;
    put(sb, sb.dash, "d", "d", d);
    const draw = clamp01(local / 0.18);
    const pct = (Math.round(draw * 200) / 2).toFixed(1);
    if (sb.cache.draw !== pct || sb.cache.sd !== d) {
      sb.cache.draw = pct;
      sb.cache.sd = d;
      sb.stroke.setAttribute("d", d);
      gsap.set(sb.stroke, { drawSVG: `0% ${pct}%` }); // edge by edge, clockwise from top-left
    }
    const t = 6;
    put(sb, sb.ticks, "td", "d", `M-${t} 0H0V-${t}M${w} -${t}V0H${w + t}M${w + t} ${h}H${w}V${h + t}M0 ${h + t}V${h}H-${t}`);
    const fade = b.kind === "section" ? 1 : 1 - clamp01((local - 0.8) / 0.2);
    const chipOn = persisted ? 0 : clamp01((local - 0.15) / 0.08) * fade;
    put(sb, sb.stroke, "so", "opacity", persisted ? "0" : fade.toFixed(3));
    put(sb, sb.dash, "do", "opacity", persisted ? "0.35" : "0");
    put(sb, sb.ticks, "to", "opacity", draw >= 1 && !persisted ? fade.toFixed(3) : "0");

    const c = Math.min(clamp01((local - 0.18) / 0.22), clamp01((now - resizeAt) / RECOUNT_MS));
    const seed = Math.round(b.rx * 7 + b.ry);
    const text = `${b.label}  ${scramble(w, c, seed)} × ${scramble(h, c, seed + 7)}`;
    put(sb, sb.chipText, "txt", "text", text);
    const chipW = Math.round(text.length * labelCharW + 12);
    put(sb, sb.chipRect, "cw", "width", String(chipW));
    // Chip sits above the box, flips inside at the top edge, right-aligns at the right edge.
    const cx = x + chipW > vw - 8 ? Math.max(0, w - chipW) : 0;
    const cy = y < 28 ? 4 : -24;
    put(sb, sb.chip, "ct", "transform", `translate(${cx} ${cy}) scale(${(0.85 + 0.15 * chipOn).toFixed(3)})`);
    put(sb, sb.chip, "co", "opacity", chipOn.toFixed(3));
    // Document coordinates read live (pin spacers shift them after build).
    put(sb, sb.xy, "xyt", "text", `x ${scramble(x + sx, c, seed + 3)}  y ${scramble(y + sy, c, seed + 5)}`);
    put(sb, sb.xy, "xyp", "transform", `translate(0 ${y + h + 40 > vh ? -32 : h + 18})`);
    put(sb, sb.xy, "xyo", "opacity", chipOn.toFixed(3));
    put(sb, sb.dimPath, "dp", "d", `M0 ${h + 6}H${w}M${w + 6} 0V${h}`);
    put(sb, sb.dimW, "dwt", "text", scramble(w, c, seed + 11));
    put(sb, sb.dimW, "dwp", "transform", `translate(${Math.max(0, Math.round(w / 2) - 12)} ${h + 32})`);
    put(sb, sb.dimH, "dht", "text", scramble(h, c, seed + 13));
    put(sb, sb.dimH, "dhp", "transform", `translate(${w + 10} ${Math.round(h / 2) + 4})`);
    put(sb, sb.dims, "dmo", "opacity", (b.kind === "line" ? 0 : chipOn).toFixed(3));
  }

  function displayChar(g: Glyph, t: number) {
    if (!g.mutate) {
      if (t < 0.45) return g.from;
      if (t < 0.5) return swapCase(g.from); // the glitch frame flips case
      return g.ch;
    }
    if (t < 0.3) return g.from;
    if (t >= 0.85) return g.ch;
    const set = /\d/.test(g.ch) ? DIGITS : SYMS;
    return set[hash(g.seed, Math.floor(t * 14)) % set.length];
  }

  /* ---------- per-frame render ---------- */

  const emitUntil = new Float64Array(pangram.length);
  const emitOn: boolean[] = new Array(pangram.length).fill(false);
  let dirty = true;
  const markDirty = () => {
    dirty = true;
  };

  function render() {
    const now = performance.now();
    if (!dirty && now - resizeAt > RECOUNT_MS + 50 && !emitOn.some(Boolean)) return;
    dirty = false;

    // READ
    const sx = Math.round(scrollX), sy = Math.round(scrollY);
    for (const r of runs) {
      const b = r.section.getBoundingClientRect();
      r.top = b.top;
      r.left = b.left;
      r.visible = b.bottom > 0 && b.top < vh;
    }

    // WRITE
    c2d.clearRect(0, 0, vw, vh);
    let landed = 0;
    let nodes = 0;
    const live: { b: Box; r: Run; local: number }[] = [];

    for (const r of runs) {
      for (const b of r.boxes) {
        const local = (r.p - b.at) / (b.kind === "section" ? SECTION_BOX_SPAN : BOX_SPAN);
        if (local <= 0) continue;
        nodes++;
        if (r.visible && (b.kind === "section" || local < 1)) live.push({ b, r, local });
      }
      for (const u of r.units) {
        const uu = clamp01((r.p - u.a) / (u.b - u.a));
        if (mobile) {
          // Word-level assembly on small screens; no particles.
          u.words.forEach((w, i) => {
            const v = clamp01(uu * u.words.length - i).toFixed(2);
            if (w.style.opacity !== v) w.style.opacity = v;
          });
          if (u.op !== "1") (u.el.style.opacity = "1"), (u.op = "1");
          landed += Math.round(u.glyphs.length * uu);
          continue;
        }
        const handoff = clamp01((uu - 0.9) / 0.1);
        const op = handoff.toFixed(3);
        if (u.op !== op) (u.el.style.opacity = op), (u.op = op);
        for (const g of u.glyphs) {
          const t = clamp01((uu - g.s) / FLIGHT);
          if (t >= 1) landed++;
          const hidden = t <= 0 || handoff >= 1 || !r.visible;
          if (g.node) {
            const o = hidden ? "0" : (1 - handoff).toFixed(3);
            if (g.op !== o) (g.node.style.opacity = o), (g.op = o);
          }
          if (hidden) continue;
          if (t < 0.12) emitUntil[g.src] = now + EMIT_HOLD_MS;
          const src = srcs[g.src];
          const e = ease(t);
          const x = src.x + (r.left + g.rx - src.x) * e;
          const y = src.y + (r.top + g.ry - src.y) * e;
          const h = src.h + (g.h - src.h) * e;
          const ch = displayChar(g, t);
          if (g.node) {
            if (g.shown !== ch) {
              g.node.textContent = ch;
              g.node.dataset.c = ch;
              g.shown = ch;
            }
            const tf = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) scale(${(h / g.h).toFixed(4)})`;
            if (g.tf !== tf) (g.node.style.transform = tf), (g.tf = tf);
            const split = t > 0.1 && t < 0.9 ? "1" : "";
            if ((g.node.dataset.split ?? "") !== split) g.node.dataset.split = split;
          } else {
            const cell = atlas.cell(ch, g.font, g.color);
            const dw = (cell.w / cell.h) * h;
            const alpha = 1 - handoff;
            if (t < 1) {
              const k = Math.sin(Math.PI * t) * SPLIT_PX;
              const pc = atlas.cell(ch, g.font, "#6930C3");
              const cc = atlas.cell(ch, g.font, "#64DFDF");
              c2d.globalAlpha = alpha * 0.6;
              c2d.drawImage(atlas.canvas, pc.x, pc.y, pc.w, pc.h, x - 1 - k, y, dw, h);
              c2d.drawImage(atlas.canvas, cc.x, cc.y, cc.w, cc.h, x - 1 + k, y, dw, h);
            }
            c2d.globalAlpha = alpha;
            c2d.drawImage(atlas.canvas, cell.x, cell.y, cell.w, cell.h, x - 1, y, dw, h);
          }
        }
      }
    }
    c2d.globalAlpha = 1;

    // Source glyphs stutter while they emit (held, so at most ~2.5 flashes per second).
    for (let i = 0; i < emitOn.length; i++) {
      const on = emitUntil[i] > now;
      if (on !== emitOn[i]) {
        emitOn[i] = on;
        poolSpans[i]?.classList.toggle("emit", on);
      }
    }

    // Inspector: section outlines always; at most 6 word/line boxes; sections only on mobile.
    const sectionBoxes = live.filter((l) => l.b.kind === "section");
    const others = mobile
      ? []
      : live.filter((l) => l.b.kind !== "section").sort((a, b) => b.b.at - a.b.at).slice(0, MAX_LIVE_BOXES);
    const shown = [...sectionBoxes, ...others];
    svgPool.forEach((sb, i) => {
      const l = shown[i];
      if (l) drawBox(sb, l.b, l.r, l.local, now, sx, sy);
      else put(sb, sb.root, "vis", "visibility", "hidden");
    });

    const gText = String(26 + landed);
    if (hudGlyphs.textContent !== gText) hudGlyphs.textContent = gText;
    const nText = String(nodes);
    if (hudNodes.textContent !== nText) hudNodes.textContent = nText;
  }

  const ctx = gsap.context(() => {
    // Hero: the pool shrinks in place to a dim centered source behind the text.
    // Both states are fixed, so Flip.fit is scroll-independent.
    let heroST: ScrollTrigger | undefined;
    const glitchLayer = document.querySelector<HTMLElement>(".glitch-screen");
    // Armed only once the hero top has been seen, so a reload restored mid-page never fires it off-screen.
    let armed = false;
    const fireOnce = (progress: number) => {
      if (progress < 0.04) armed = true;
      else if (armed && progress < 0.6 && !once.glitched && glitchLayer) {
        once.glitched = true;
        screenGlitch(glitchLayer, pool);
      }
    };
    if (!mobile) {
      const vars = Flip.fit(pool, twin, { getVars: true, scale: true }) as gsap.TweenVars;
      heroST = gsap.to(pool, {
        ...vars,
        opacity: 0.22,
        ease: "power2.inOut",
        scrollTrigger: {
          trigger: "#hero",
          start: "top top",
          end: "bottom top",
          scrub: 0.5,
          onUpdate: (self) => fireOnce(self.progress),
          onRefresh: (self) => fireOnce(self.progress),
        },
      }).scrollTrigger;
    } else {
      ScrollTrigger.create({
        trigger: "#hero", start: "top top", end: "bottom top",
        onUpdate: (s) => fireOnce(s.progress),
        onRefresh: (s) => fireOnce(s.progress),
      });
    }

    // Idle micro-glitch on the hero pool: one slice burst every 4 to 6 s.
    const layer = pool.querySelector<HTMLElement>(".pool-glitch");
    const schedule = () => gsap.delayedCall(gsap.utils.random(4, 6), glitch);
    const glitch = () => {
      if (!layer || (heroST && heroST.progress > 0.02) || scrollY > 40) return schedule();
      const top = gsap.utils.random(5, 70, 1);
      const band = gsap.utils.random(8, 22, 1);
      gsap
        .timeline({ onComplete: schedule })
        .set(layer, { clipPath: `inset(${top}% 0 ${100 - top - band}% 0)`, x: gsap.utils.random([-6, 6]), opacity: 1 })
        .set(layer, { x: gsap.utils.random([-3, 3]) }, 0.05)
        .set(layer, { opacity: 0 }, 0.12);
    };
    schedule();

    for (const r of runs) {
      gsap.to(r, {
        p: 1,
        ease: "none",
        onUpdate: markDirty,
        scrollTrigger: {
          trigger: r.section,
          start: mobile ? "top 85%" : "top top",
          end: mobile ? "bottom 45%" : `+=${r.section.dataset.length}%`,
          pin: !mobile,
          scrub: 0.6,
          onRefresh: markDirty,
        },
      });
    }
  });

  gsap.ticker.add(render);
  ScrollTrigger.refresh();

  return () => {
    gsap.ticker.remove(render);
    ctx.revert();
    clones.forEach((c) => c.remove());
    svg.replaceChildren();
    for (const r of runs) for (const u of r.units) {
      u.el.style.opacity = "";
      u.words.forEach((w) => (w.style.opacity = ""));
    }
    poolSpans.forEach((s) => s.classList.remove("emit"));
    c2d.clearRect(0, 0, vw, vh);
  };
}
