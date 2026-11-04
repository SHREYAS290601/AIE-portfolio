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
const GHOST_PURPLE = "#6930C3";
const GHOST_CYAN = "#64DFDF";

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
type Collapse = { g: Glyph; run: Run; s: number };
type Run = {
  section: HTMLElement; p: number; top: number; left: number; visible: boolean; units: Unit[]; boxes: Box[];
  srcs: Src[]; // pool glyph positions this run flies from
  cloud: boolean; // glyphs detour through a scattered cloud before sorting into place
  collapse: Collapse[]; // glyphs from the rest of the page that stream back into the pool
  st?: ScrollTrigger;
  near: boolean; // within a viewport of the screen (IntersectionObserver); far runs skip rect reads
  offSynced: boolean; // last frame was off-screen, so its clones are already hidden
};
const COLLAPSE_CAP = 1500;
const COLLAPSE_END = 0.4; // share of the contact run spent collapsing the page
type SvgBox = {
  root: SVGGElement; stroke: SVGPathElement; dash: SVGPathElement; ticks: SVGPathElement;
  chip: SVGGElement; chipRect: SVGRectElement; chipText: SVGTextElement; xy: SVGTextElement;
  dims: SVGGElement; dimPath: SVGPathElement; dimW: SVGTextElement; dimH: SVGTextElement;
  cache: Record<string, string>;
};

/* ---------- glyph atlas: each glyph rasterized once, then blitted ---------- */

// Multi-page atlas: a full page opens a new one instead of resetting (a reset mid-scroll
// re-rasterizes everything and shows up as long tasks).
type Cell = { page: HTMLCanvasElement; x: number; y: number; w: number; h: number };
const ATLAS_PAGE = 2048;
class Atlas {
  private pages: CanvasRenderingContext2D[] = [];
  private cells = new Map<string, Cell>();
  private cx = 0;
  private cy = 0;
  private rowH = 0;
  constructor(private dpr: number) {
    this.addPage();
  }
  private addPage() {
    const c = document.createElement("canvas");
    c.width = c.height = ATLAS_PAGE;
    this.pages.push(c.getContext("2d")!);
    this.cx = this.cy = this.rowH = 0;
  }
  has(ch: string, font: string, color: string) {
    return this.cells.has(font + "|" + color + "|" + ch);
  }
  cell(ch: string, font: string, color: string): Cell {
    const key = font + "|" + color + "|" + ch;
    const hit = this.cells.get(key);
    if (hit) return hit;
    const d = this.dpr;
    let ctx = this.pages[this.pages.length - 1];
    ctx.setTransform(d, 0, 0, d, 0, 0);
    ctx.font = font;
    const m = ctx.measureText(ch);
    const asc = m.fontBoundingBoxAscent;
    const w = Math.ceil((m.width + 2) * d);
    const h = Math.ceil((asc + m.fontBoundingBoxDescent) * d);
    if (this.cx + w > ATLAS_PAGE) {
      this.cx = 0;
      this.cy += this.rowH;
      this.rowH = 0;
    }
    if (this.cy + h > ATLAS_PAGE) {
      this.addPage();
      ctx = this.pages[this.pages.length - 1];
      ctx.setTransform(d, 0, 0, d, 0, 0);
      ctx.font = font;
    }
    ctx.fillStyle = color;
    ctx.textBaseline = "alphabetic";
    ctx.fillText(ch, this.cx / d + 1, this.cy / d + asc);
    const cell = { page: ctx.canvas, x: this.cx, y: this.cy, w, h };
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
  // Glyphs are mid-flight when drawn and hand off to crisp DOM text, so 1.5x is plenty; it halves atlas area at 2x DPR.
  const atlas = new Atlas(Math.min(1.5, dpr));

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
  // The pool's hero-size positions (build runs before the dock tween, so the pool is untransformed).
  // CONTACT reassembles from these after the page collapses back into the full-size sentence.
  const srcsHero: Src[] = poolSpans.map((s) => {
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

  // A run is any [data-run] element: pinned sections, scrolled role articles, or one-shot lists.
  const runEls = [...document.querySelectorAll<HTMLElement>("[data-run]:not([data-run='oneshot'])")];
  const runs: Run[] = runEls.map(buildRun);

  function buildRun(section: HTMLElement): Run {
    const sr = section.getBoundingClientRect();
    const win = (section.dataset.assemble?.split(",").map(Number) ?? ASSEMBLE) as [number, number];
    const own = [...section.querySelectorAll<HTMLElement>("[data-unit]")].filter((el) => el.closest("[data-run]") === section);
    const units: Unit[] = own.map((el) => {
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
        a: win[0],
        b: win[1],
        glyphs,
        words: [...el.querySelectorAll<HTMLElement>(".w")],
        op: "",
      };
    });
    const total = units.reduce((s, u) => s + u.glyphs.length, 0);
    if (total > PARTICLE_CAP) console.warn(`#${section.id}: ${total} glyphs over cap; word-by-word mode not built yet`);

    const boxes: Box[] = [];
    const landAt = (gs: Glyph[]) => win[0] + (win[1] - win[0]) * (Math.max(...gs.map((g) => g.s)) + FLIGHT) - BOX_LEAD;
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
      } else if (!u.el.hasAttribute("data-nolines")) {
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
    // Diagram nodes: every node gets its own box, labelled with its text, as it lands.
    const glyphsAll = units.flatMap((u) => u.glyphs);
    for (const node of section.querySelectorAll<HTMLElement>(".node")) {
      if (node.closest("[data-run]") !== section) continue;
      const gs = glyphsAll.filter((g) => node.contains(g.parent));
      if (gs.length) {
        boxes.push({ kind: "word", label: `${label(node)} ${node.textContent?.trim() ?? ""}`, at: landAt(gs), ...rel(node.getBoundingClientRect()) });
      }
    }
    if (section.tagName === "SECTION" || section.tagName === "ARTICLE") {
      boxes.push({ kind: "section", label: label(section), at: Math.min(win[1], SECTION_BOX_AT + (win[1] - ASSEMBLE[1])), ...rel(sr) });
    }
    if (import.meta.env.DEV) {
      for (const b of boxes) {
        if ((b.kind === "section" || b.kind === "heading") && (b.h % 1 || b.docY % 1)) {
          console.warn(`fractional box ${b.label}: h ${b.h}, y ${b.docY}; fix the spacing scale`);
        }
      }
    }
    const collapse = section.dataset.collapse === "1";
    return {
      section, p: 0, top: sr.top, left: sr.left, visible: false, units, boxes,
      srcs: collapse && !mobile ? srcsHero : srcs,
      cloud: section.dataset.cloud === "1",
      collapse: [],
      near: true, // until the observer reports
      offSynced: false,
    };
  }

  // CONTACT's collapse samples glyphs from every other run (capped), so the whole page streams home.
  for (const r of runs) {
    if (r.section.dataset.collapse !== "1" || mobile) continue;
    const all: Collapse[] = [];
    for (const o of runs) if (o !== r) for (const u of o.units) for (const g of u.glyphs) all.push({ g, run: o, s: 0 });
    const step = Math.max(1, Math.ceil(all.length / COLLAPSE_CAP));
    r.collapse = all.filter((_, i) => i % step === 0).map((c, i) => ({ ...c, s: ((hash(i, 99) % 1000) / 1000) * 0.3 }));
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
  const svgPool: SvgBox[] = Array.from({ length: MAX_LIVE_BOXES + runEls.length + 2 }, () => {
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

  const contactRun = runs.find((r) => r.section.dataset.collapse === "1");
  let hudFinal = false;
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

    // READ: only runs near the viewport (IntersectionObserver), plus every run while CONTACT
    // collapses, since the page's glyphs fly home from wherever their sections sit.
    const sx = Math.round(scrollX), sy = Math.round(scrollY);
    const collapsing = !!contactRun && contactRun.near && contactRun.p < COLLAPSE_END;
    for (const r of runs) {
      if (!r.near && !collapsing) {
        r.visible = false;
        continue;
      }
      const b = r.section.getBoundingClientRect();
      r.top = b.top;
      r.left = b.left;
      r.visible = r.near && b.bottom > 0 && b.top < vh;
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
      // CONTACT: glyphs from the whole page stream back into the full-size pool.
      if (r.collapse.length && r.visible) {
        const cp = clamp01(r.p / COLLAPSE_END);
        if (cp > 0 && cp < 1) {
          for (const c of r.collapse) {
            const t = clamp01((cp - c.s) / 0.7);
            if (t <= 0 || t >= 1) continue;
            const dst = srcsHero[c.g.src], e = ease(t);
            const x0 = c.run.left + c.g.rx, y0 = c.run.top + c.g.ry;
            const h = c.g.h + (dst.h - c.g.h) * e;
            const cell = atlas.cell(t > 0.7 ? pangram[c.g.src] : c.g.ch, c.g.font, c.g.color);
            c2d.globalAlpha = 1 - t * 0.5;
            c2d.drawImage(cell.page, cell.x, cell.y, cell.w, cell.h, x0 + (dst.x - x0) * e - 1, y0 + (dst.y - y0) * e, (cell.w / cell.h) * h, h);
          }
          c2d.globalAlpha = 1;
        }
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
        // Off-screen fast path: nothing to draw; count landed glyphs without walking them.
        // One full pass after leaving the screen hides any clones still showing.
        if (!r.visible && r.offSynced) {
          if (uu >= 1) landed += u.glyphs.length;
          else if (uu > 0) for (const g of u.glyphs) if (uu - g.s >= FLIGHT) landed++;
          continue;
        }
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
          const src = r.srcs[g.src];
          const e = ease(t);
          const tx = r.left + g.rx, ty = r.top + g.ry;
          let x: number, y: number;
          if (r.cloud) {
            // first half: scatter to a random point on screen; second half: sort into place
            const mx = ((hash(g.seed, 7) % 1000) / 1000) * vw, my = ((hash(g.seed, 13) % 1000) / 1000) * vh;
            const half = t < 0.5;
            const k = ease(half ? t * 2 : (t - 0.5) * 2);
            x = half ? src.x + (mx - src.x) * k : mx + (tx - mx) * k;
            y = half ? src.y + (my - src.y) * k : my + (ty - my) * k;
          } else {
            x = src.x + (tx - src.x) * e;
            y = src.y + (ty - src.y) * e;
          }
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
            // RGB-split ghosts on one glyph in three: reads the same in a burst, a third of the draws.
            if (t < 1 && g.seed % 3 === 0) {
              const k = Math.sin(Math.PI * t) * SPLIT_PX;
              const pc = atlas.cell(ch, g.font, GHOST_PURPLE);
              const cc = atlas.cell(ch, g.font, GHOST_CYAN);
              c2d.globalAlpha = alpha * 0.6;
              c2d.drawImage(pc.page, pc.x, pc.y, pc.w, pc.h, x - 1 - k, y, dw, h);
              c2d.drawImage(cc.page, cc.x, cc.y, cc.w, cc.h, x - 1 + k, y, dw, h);
            }
            c2d.globalAlpha = alpha;
            c2d.drawImage(cell.page, cell.x, cell.y, cell.w, cell.h, x - 1, y, dw, h);
          }
        }
      }
    }
    c2d.globalAlpha = 1;
    for (const r of runs) r.offSynced = !r.visible;

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

    // At CONTACT the HUD locks: totals stop at the full page count and turn mint.
    const final = contactRun ? contactRun.p >= 0.95 : false;
    if (final !== hudFinal) {
      hudFinal = final;
      hudGlyphs.parentElement?.classList.toggle("is-final", final);
    }
    if (!final) {
      const gText = String(26 + landed);
      if (hudGlyphs.textContent !== gText) hudGlyphs.textContent = gText;
      const nText = String(nodes);
      if (hudNodes.textContent !== nText) hudNodes.textContent = nText;
    }
  }

  const ctx = gsap.context(() => {
    // Hero: the pool shrinks in place to a dim centered source behind the text.
    // Both states are fixed, so Flip.fit is scroll-independent.
    let heroST: ScrollTrigger | undefined;
    let heroVars: gsap.TweenVars | undefined;
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
      heroVars = vars;
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
      const pin = !mobile && r.section.dataset.pin === "1";
      r.st = gsap.to(r, {
        p: 1,
        ease: "none",
        onUpdate: markDirty,
        scrollTrigger: {
          trigger: r.section,
          start: pin ? "top top" : "top 85%",
          end: pin ? `+=${r.section.dataset.length}%` : "top 30%",
          pin,
          scrub: 0.6,
          onRefresh: markDirty,
        },
      }).scrollTrigger;
    }

    // CONTACT: once the page has streamed home, the pool grows back to the hero sentence, then
    // fades as the contact line assembles out of it. Full circle.
    const st = contactRun?.st;
    if (st && heroVars && !mobile) {
      const home = Object.fromEntries(Object.keys(heroVars).map((k) => [k, k.startsWith("scale") ? 1 : 0]));
      const at = (f: number) => () => st.start + (st.end - st.start) * f;
      gsap.fromTo(pool, { ...heroVars, opacity: 0.22 }, {
        ...home, opacity: 1, ease: "power2.inOut", immediateRender: false,
        scrollTrigger: { start: at(COLLAPSE_END - 0.1), end: at(COLLAPSE_END + 0.1), scrub: 0.5 },
      });
      gsap.fromTo(pool, { opacity: 1 }, {
        opacity: 0, ease: "none", immediateRender: false,
        scrollTrigger: { start: at(0.55), end: at(0.8), scrub: 0.5 },
      });
    }

    // WORK lanes: bars draw left to right as the section enters; the role in view lights its bar.
    const bars = gsap.utils.toArray<HTMLElement>(".lane-bar");
    if (bars.length && !mobile) {
      gsap.fromTo(bars, { scaleX: 0 }, {
        scaleX: 1, ease: "none", stagger: 0.08, transformOrigin: "0 50%",
        scrollTrigger: { trigger: "#work", start: "top 75%", end: "top 15%", scrub: 0.6 },
      });
      for (const a of gsap.utils.toArray<HTMLElement>("article[data-role]")) {
        ScrollTrigger.create({
          trigger: a, start: "top 55%", end: "bottom 55%",
          toggleClass: { targets: `.lane-bar[data-role="${a.dataset.role}"]`, className: "is-active" },
        });
      }
    }
  });

  // "Full log": opening a <details> assembles its list once, on a short timer instead of scroll.
  const oneShots = new Map<HTMLElement, { run: Run; tween: gsap.core.Tween }>();
  const onToggle = (e: Event) => {
    const d = e.target;
    if (!(d instanceof HTMLDetailsElement)) return;
    const list = d.querySelector<HTMLElement>("[data-run='oneshot']");
    if (!list) return;
    const prev = oneShots.get(list);
    if (prev) {
      prev.tween.kill();
      runs.splice(runs.indexOf(prev.run), 1);
      oneShots.delete(list);
    }
    const units = [...list.querySelectorAll<HTMLElement>("[data-unit]")];
    if (!d.open || mobile) {
      units.forEach((u) => (u.style.opacity = d.open ? "1" : ""));
      markDirty();
      return;
    }
    const run = buildRun(list);
    runs.push(run);
    oneShots.set(list, { run, tween: gsap.to(run, { p: 1, duration: 1.4, ease: "none", onUpdate: markDirty }) });
  };
  document.addEventListener("toggle", onToggle, true); // toggle does not bubble; capture catches it

  // Which runs are within one viewport of the screen; far runs skip per-frame rect reads.
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        const r = runs.find((x) => x.section === e.target);
        if (r) r.near = e.isIntersecting;
      }
      markDirty();
    },
    { rootMargin: "100% 0px" },
  );
  runs.forEach((r) => io.observe(r.section));

  // Pre-rasterize every glyph the page will draw, in idle time, so first flights never stall.
  const warm: [string, string, string][] = [];
  const seen = new Set<string>();
  const want = (ch: string, font: string, color: string) => {
    const k = font + "|" + color + "|" + ch;
    if (!seen.has(k)) (seen.add(k), warm.push([ch, font, color]));
  };
  if (!mobile) {
    for (const r of runs) for (const u of r.units) for (const g of u.glyphs) {
      want(g.ch, g.font, g.color);
      want(g.from, g.font, g.color);
      if (u.mode === "canvas" && g.seed % 3 === 0) {
        want(g.ch, g.font, GHOST_PURPLE);
        want(g.ch, g.font, GHOST_CYAN);
      }
      if (g.mutate) for (const c of /\d/.test(g.ch) ? DIGITS : SYMS) want(c, g.font, g.color);
    }
  }
  // 6 ms slices on timers, not requestIdleCallback: an always-animating page rarely goes idle,
  // so idle callbacks starved and glyphs still rasterized mid-flight.
  let warmHandle = 0;
  const warmStep = () => {
    const end = performance.now() + 6;
    while (warm.length && performance.now() < end) {
      const [ch, font, color] = warm.pop()!;
      if (!atlas.has(ch, font, color)) atlas.cell(ch, font, color);
    }
    if (warm.length) warmHandle = window.setTimeout(warmStep, 0);
  };
  warmHandle = window.setTimeout(warmStep, 0);
  const cancelIdle = window.clearTimeout;

  gsap.ticker.add(render);
  ScrollTrigger.refresh();

  return () => {
    gsap.ticker.remove(render);
    io.disconnect();
    cancelIdle(warmHandle);
    document.removeEventListener("toggle", onToggle, true);
    oneShots.forEach(({ tween }) => tween.kill());
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
