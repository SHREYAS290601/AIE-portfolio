import { useEffect } from "react";
import {
  CASES, CHIPS, dateRange, education, identity, isCleared, monthIndex, roles, SIGNAL, skills,
  type CaseStudy, type Role,
} from "./data/content";
import { startEngine } from "./engine";

const LANE_LABEL: Record<string, string> = { premier: "PREMIER", "uiuc-ai": "UIUC AI", dsrs: "DSRS", apptware: "APPTWARE" };

// Lanes from the first degree to now, so concurrent roles visibly overlap. Decorative: dates are in the articles.
// The axis stretches ZOOM× from 2025 on: on a linear scale the 2026 roles shrink to slivers.
const ZOOM = 4;
function Lanes() {
  // Axis runs from January of the first role's year to the end of this month.
  const start = Math.floor(Math.min(...roles.map((r) => monthIndex(r.start))) / 12) * 12;
  const now = monthIndex(null);
  const brk = monthIndex("Jan 2025");
  const u = (m: number) => (m <= brk ? m - start : brk - start + (m - brk) * ZOOM);
  const total = u(now + 1);
  const at = (m: number) => (u(m) / total) * 100;
  const pct = (m: number) => `${at(m).toFixed(3)}%`;
  const years = Array.from({ length: Math.floor(now / 12) - start / 12 + 1 }, (_, i) => start / 12 + i);
  return (
    <div className="lanes" aria-hidden="true">
      <div className="lane-rules">
        {years.map((y) => (
          <span key={y} className={y * 12 === brk ? "lane-rule is-zoom" : "lane-rule"} style={{ left: pct(y * 12) }} />
        ))}
        <span className="lane-now" />
        <span className="lane-scan" />
      </div>
      {roles.map((r) => (
        <div className="lane" key={r.id} data-role={r.id}>
          <span className="lane-label">{LANE_LABEL[r.id] ?? r.id}</span>
          <div className="lane-track">
            <span
              className="lane-bar"
              style={{ left: pct(monthIndex(r.start)), width: `${(at(monthIndex(r.end) + 1) - at(monthIndex(r.start))).toFixed(3)}%` }}
            />
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
          <span className="lane-now-label">NOW</span>
        </div>
      </div>
    </div>
  );
}

function CaseArticle({ c, n }: { c: CaseStudy; n: number }) {
  return (
    <article id={`case-${c.id}`} className="case" data-run aria-labelledby={`case-${c.id}-title`}>
      <div className="case-head">
        <span className="case-index" data-unit="canvas">
          {String(n).padStart(2, "0")}
        </span>
        <h3 id={`case-${c.id}-title`} className="case-title" data-unit={c.title.length < 40 ? "dom" : "canvas"}>
          <Words text={c.title.toUpperCase()} />
        </h3>
      </div>
      <dl className="case-body">
        <dt>Problem</dt>
        <dd data-unit="canvas">{c.problem}</dd>
        <dt>Built</dt>
        <dd data-unit="canvas">{c.built}</dd>
        <dt>How it's verified</dt>
        <dd data-unit="canvas">{c.verified}</dd>
      </dl>
      <div className="case-side">
        <figure className="diagram" data-unit="canvas" data-nolines aria-label={`${c.title} architecture`}>
          {c.diagram.map((stage, i) => (
            <div key={i} className="dstage">
              {stage.map((node) => (
                <div key={node} className="node">
                  {node}
                </div>
              ))}
            </div>
          ))}
        </figure>
        <p className="case-label">Numbers</p>
        <ul className="chips">
          {c.numbers.map((x) => (
            <li key={x} className="chip" data-unit="canvas">
              {x}
            </li>
          ))}
        </ul>
        <p className="case-label">Stack</p>
        <p className="case-stack" data-unit="canvas">
          {c.stack.join(" · ")}
        </p>
      </div>
    </article>
  );
}

// Only confirmed contacts exist in the bundle (see vite.config.ts); nothing renders until then.
function ContactLinks() {
  const { email, linkedin, portfolio } = identity.contact;
  const links = [
    email && { label: "Email", href: `mailto:${email.value}`, text: email.value },
    linkedin && { label: "LinkedIn", href: linkedin.value, text: "LinkedIn" },
    portfolio && { label: "Portfolio", href: portfolio.value, text: "Portfolio" },
  ].filter((l): l is { label: string; href: string; text: string } => Boolean(l));
  if (!links.length) {
    return (
      <p className="contact-note" data-unit="canvas">
        Links publish once confirmed.
      </p>
    );
  }
  return (
    <ul className="contact-links">
      {links.map((l) => (
        <li key={l.label} data-unit="canvas">
          <a href={l.href} rel="noopener noreferrer" target={l.href.startsWith("http") ? "_blank" : undefined}>
            {l.text}
          </a>
        </li>
      ))}
    </ul>
  );
}

function RoleArticle({ r }: { r: Role }) {
  const log = r.facts.filter((f) => f.text && !r.headline.includes(f.id));
  const org = r.org.toUpperCase();
  return (
    <article id={`role-${r.id}`} className="job" data-run data-role={r.id} aria-labelledby={`role-${r.id}-org`}>
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
          <summary>
            Full log ({log.length})<span className="sr-only"> for {r.org}</span>
          </summary>
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

        <section id="intro" className="intro" data-run data-pin="1" data-length="80" aria-labelledby="intro-name">
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

        <section id="signal" className="signal" data-run data-pin="1" data-length="110" aria-labelledby="signal-title">
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

        <section id="systems" className="systems" data-run aria-labelledby="systems-title">
          <h2 id="systems-title" className="section-title" data-unit="dom">
            <Words text="SYSTEMS" />
          </h2>
          <div className="cases">
            {CASES.map((c, i) => (
              <CaseArticle key={c.id} c={c} n={i + 1} />
            ))}
          </div>
        </section>

        {/* STACK: glyphs scatter into an unsorted cloud, then sort into the 7 categories. */}
        <section id="stack" className="stack" data-run data-pin="1" data-length="100" data-cloud="1" aria-labelledby="stack-title">
          <h2 id="stack-title" className="section-title" data-unit="dom">
            <Words text="STACK" />
          </h2>
          <div className="stack-grid">
            {skills.map((s) => (
              <div key={s.category} className="stack-cat">
                <h3 className="stack-name" data-unit="dom">
                  <Words text={s.category.toUpperCase()} />
                </h3>
                <ul className="stack-items">
                  {s.items.map((it) => (
                    <li key={it} data-unit="canvas">
                      {it}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section id="school" className="school" data-run aria-labelledby="school-title">
          <h2 id="school-title" className="section-title" data-unit="dom">
            <Words text="SCHOOL" />
          </h2>
          <div className="degrees">
            {education.map((d) => (
              <div key={d.school} className="degree">
                <h3 className="degree-school" data-unit={d.school.length < 40 ? "dom" : "canvas"}>
                  <Words text={d.school} />
                </h3>
                <p className="degree-name" data-unit="canvas">
                  {d.degree}
                </p>
                <p className="degree-meta" data-unit="canvas">
                  {`GPA ${d.gpa} · ${dateRange(d.start, d.end)} · ${d.location.toUpperCase()}`}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* CONTACT: the page collapses back into the pangram, which becomes the contact line. */}
        <section
          id="contact" className="contact" data-run data-pin="1" data-length="120"
          data-collapse="1" data-assemble="0.5,0.92" aria-labelledby="contact-title"
        >
          <h2 id="contact-title" className="section-title" data-unit="dom">
            <Words text="CONTACT" />
          </h2>
          <p className="contact-line" data-unit="canvas">
            {"Let's talk about your data."}
          </p>
          <ContactLinks />
        </section>
      </main>
    </>
  );
}
