import { useEffect } from "react";
import { CHIPS, dateRange, education, identity, isCleared, monthIndex, roles, SIGNAL, type Role } from "./data/content";
import { startEngine } from "./engine";

const LANE_LABEL: Record<string, string> = { premier: "PREMIER", "uiuc-ai": "UIUC AI", dsrs: "DSRS", apptware: "APPTWARE" };

// Lanes from the first degree to now, so concurrent roles visibly overlap. Decorative: dates are in the articles.
// The axis stretches ZOOM× from 2025 on: on a linear scale the 2026 roles shrink to slivers.
const ZOOM = 4;
function Lanes() {
  const start = monthIndex(education[education.length - 1].start);
  const brk = monthIndex("Jan 2025");
  const u = (m: number) => (m <= brk ? m - start : brk - start + (m - brk) * ZOOM);
  const total = u(monthIndex(null) + 1);
  const at = (m: number) => (u(m) / total) * 100;
  const pct = (m: number) => `${at(m).toFixed(3)}%`;
  const span = monthIndex(null) + 1 - start;
  const rows = [
    ...roles.map((r) => ({ label: LANE_LABEL[r.id] ?? r.id, bars: [{ id: r.id, s: r.start, e: r.end }] })),
    { label: "SCHOOL", bars: education.map((d, i) => ({ id: `edu-${i}`, s: d.start, e: d.end as string | null })) },
  ];
  const firstYear = Math.floor(start / 12) + 1;
  const years = Array.from({ length: Math.floor((start + span) / 12) - firstYear + 1 }, (_, i) => firstYear + i);
  return (
    <div className="lanes" aria-hidden="true">
      {rows.map((row) => (
        <div className="lane" key={row.label}>
          <span className="lane-label">{row.label}</span>
          <div className="lane-track">
            {row.bars.map((b) => (
              <span
                key={b.id}
                className="lane-bar"
                data-role={b.id}
                style={{ left: pct(monthIndex(b.s)), width: `${(at(monthIndex(b.e) + 1) - at(monthIndex(b.s))).toFixed(3)}%` }}
              />
            ))}
          </div>
        </div>
      ))}
      <div className="lane lane-axis">
        <span className="lane-label" />
        <div className="lane-track">
          {years.map((y) => (
            <span key={y} className="lane-year" style={{ left: pct(y * 12) }}>
              {String(y).slice(2)}
            </span>
          ))}
          <span className="lane-zoom" style={{ left: pct(brk) }}>
            ×{ZOOM}
          </span>
        </div>
      </div>
    </div>
  );
}

function RoleArticle({ r }: { r: Role }) {
  const log = r.facts.filter((f) => f.text && !r.headline.includes(f.id));
  const org = r.org.toUpperCase();
  return (
    <article id={`role-${r.id}`} className="role" data-run data-role={r.id} aria-labelledby={`role-${r.id}-org`}>
      <p className="role-dates" data-unit="canvas">
        {dateRange(r.start, r.end)}
      </p>
      {/* Headings under 40 characters fly as DOM glyphs; longer ones go to the canvas. */}
      <h3 id={`role-${r.id}-org`} className="role-org" data-unit={org.length < 40 ? "dom" : "canvas"}>
        <Words text={org} />
      </h3>
      <p className="role-title" data-unit="dom">
        <Words text={r.title} />
      </p>
      <p className="role-story" data-unit="canvas">
        <Words text={r.story} />
      </p>
      <ul className="chips" aria-label="Headline metrics">
        {r.headline
          .filter((id) => isCleared(id) && CHIPS[id])
          .map((id) => (
            <li key={id} className="chip" data-unit="canvas">
              {CHIPS[id]}
            </li>
          ))}
      </ul>
      {log.length > 0 && (
        <details className="log">
          <summary>Full log ({log.length})</summary>
          <ul className="log-list" data-run="oneshot">
            {log.map((f) => (
              <li key={f.id} data-unit="canvas">
                {f.text}
              </li>
            ))}
          </ul>
        </details>
      )}
    </article>
  );
}

// Words wrapped in spans: word boxes on desktop, word-level assembly on mobile.
function Words({ text }: { text: string }) {
  const words = text.split(" ");
  return (
    <>
      {words.map((w, i) => (
        <span key={i}>
          <span className="w">{w}</span>
          {i < words.length - 1 ? " " : null}
        </span>
      ))}
    </>
  );
}

function PoolChars({ text }: { text: string }) {
  return (
    <>
      {[...text].map((c, i) => (
        <span key={i} className="pc" data-c={c}>
          {c}
        </span>
      ))}
    </>
  );
}

export default function App() {
  useEffect(() => startEngine(), []);
  useEffect(() => {
    // three.js loads after first paint so it never competes with LCP.
    let stop: (() => void) | undefined;
    let cancelled = false;
    const canvas = document.querySelector<HTMLCanvasElement>("canvas.webgl");
    import("./scene3d")
      .then(({ startScene }) => {
        if (!cancelled && canvas) stop = startScene(canvas);
      })
      .catch((err) => console.error("3D layer failed to load", err)); // decorative: page works without it
    return () => {
      cancelled = true;
      stop?.();
    };
  }, []);
  const pangram = identity.pangram;

  return (
    <>
      <a className="skip" href="#intro">
        Skip to content
      </a>

      {/* Decorative layers: 3D field, the pool, its docked twin, particle canvas, flight layer, inspector, HUD. */}
      <canvas className="webgl" aria-hidden="true" />
      <div className="pool" aria-hidden="true">
        <PoolChars text={pangram} />
        <span className="pool-glitch">{pangram}</span>
      </div>
      <div className="pool-twin" aria-hidden="true">
        <PoolChars text={pangram} />
      </div>
      <canvas className="stage" aria-hidden="true" />
      <div className="flight" aria-hidden="true" />
      <svg className="inspector" aria-hidden="true" />
      <div className="hud" aria-hidden="true">
        glyphs <span id="hud-glyphs">26</span> · nodes <span id="hud-nodes">0</span>
      </div>
      <div className="scanlines" aria-hidden="true" />
      <div className="glitch-screen" aria-hidden="true" />

      <main>
        <div id="hero" className="hero">
          <p className="scroll-cue" aria-hidden="true">
            scroll
          </p>
        </div>

        <section id="intro" className="intro" data-run data-pin="1" data-length="110" aria-labelledby="intro-name">
          <h1 id="intro-name" className="name" data-unit="dom">
            <Words text={identity.name.toUpperCase()} />
          </h1>
          <p className="role" data-unit="dom">
            <Words text={identity.title.toUpperCase()} />
          </p>
          <p className="thesis" data-unit="canvas">
            <Words text={identity.thesis} />
          </p>
        </section>

        <section id="signal" className="signal" data-run data-pin="1" data-length="170" aria-labelledby="signal-title">
          <h2 id="signal-title" className="section-title" data-unit="dom">
            <Words text="SIGNAL" />
          </h2>
          <ul className="metrics">
            {SIGNAL.map((s) => {
              return (
                <li key={s.fact} className={s.cleared ? "metric" : "metric is-pending"}>
                  <span className="metric-value" data-unit="dom">
                    {s.cleared ? (
                      <Words text={s.value} />
                    ) : (
                      <>
                        <span className="w" aria-hidden="true">
                          {s.value}
                        </span>
                        <span className="sr-only">Figure pending clearance.</span>
                      </>
                    )}
                  </span>
                  <span className="metric-caption" data-unit="canvas">
                    <Words text={s.caption} />
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        <section id="work" className="work" data-run aria-labelledby="work-title">
          <h2 id="work-title" className="section-title" data-unit="dom">
            <Words text="WORK" />
          </h2>
          <div className="work-grid">
            <Lanes />
            <div className="roles">
              {roles.map((r) => (
                <RoleArticle key={r.id} r={r} />
              ))}
            </div>
          </div>
        </section>

        <section id="next" className="next" aria-label="Coming next">
          <p className="next-note">SYSTEMS · STACK · SCHOOL · CONTACT assemble here next.</p>
        </section>
      </main>
    </>
  );
}
