import { useEffect } from "react";
import { identity, SIGNAL } from "./data/content";
import { startEngine } from "./engine";

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

        <section id="intro" className="intro" data-length="110" aria-labelledby="intro-name">
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

        <section id="signal" className="signal" data-length="170" aria-labelledby="signal-title">
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

        <section id="next" className="next" aria-label="Coming next">
          <p className="next-note">WORK · SYSTEMS · STACK · SCHOOL · CONTACT assemble here after Checkpoint 2.</p>
        </section>
      </main>
    </>
  );
}
