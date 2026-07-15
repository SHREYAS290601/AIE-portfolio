import { useEffect, useState } from "react";
import Terminal from "./terminal/Terminal";

const BOOT_LINES = [
  "BIOS v2.9.6 — PHOSPHOR OK",
  "memory check ........ 640K (should be enough for anybody)",
  "mounting /home/shreyas ........ done",
  "loading resume.sys ........ done",
  "starting portfolio shell ........ ok",
];

function Boot({ onDone }: { onDone: () => void }) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      onDone();
      return;
    }
    if (shown >= BOOT_LINES.length) {
      const t = setTimeout(onDone, 350);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setShown((s) => s + 1), 220);
    return () => clearTimeout(t);
  }, [shown, onDone]);

  return (
    <div className="term-output" aria-hidden="true">
      {BOOT_LINES.slice(0, shown).map((l) => (
        <p key={l} className="dim boot-line">{l}</p>
      ))}
    </div>
  );
}

export default function App() {
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    const skip = () => setBooted(true);
    window.addEventListener("keydown", skip, { once: true });
    window.addEventListener("pointerdown", skip, { once: true });
    return () => {
      window.removeEventListener("keydown", skip);
      window.removeEventListener("pointerdown", skip);
    };
  }, []);

  return (
    <div className="crt">
      <div className="crt-screen">
        <div className="titlebar">
          <span className="dots" aria-hidden="true">● ● ●</span>
          <span className="title">shreyas@portfolio: ~ — 80×24</span>
          <span aria-hidden="true">tty1</span>
        </div>
        {booted ? <Terminal /> : <Boot onDone={() => setBooted(true)} />}
      </div>
    </div>
  );
}
