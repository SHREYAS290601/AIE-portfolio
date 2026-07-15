import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { PERSONAS, type PersonaKey } from "../data/personas";
import {
  runCommand,
  visibleCommands,
  type TermState,
  type ThemeName,
} from "./commands";

interface Entry {
  id: number;
  prompt: string;
  input: string;
  output: ReactNode;
}

const BANNER = String.raw`
 ____  _   _ ____  _______   ___    ____
/ ___|| | | |  _ \| ____\ \ / / \  / ___|
\___ \| |_| | |_) |  _|  \ V / _ \ \___ \
 ___) |  _  |  _ <| |___  | |/ ___ \ ___) |
|____/|_| |_|_| \_\_____| |_/_/   \_\____/
`;

function promptFor(persona: PersonaKey | null): string {
  return persona
    ? `${PERSONAS[persona].user}@shreyas:~/${persona}$`
    : "guest@shreyas:~$";
}

const INTRO_CHIPS = ["ls", "cd recruiter", "cd developer", "/help"];
const PERSONA_CHIPS = ["/experience", "/projects", "/skills", "/certificates", "cd .."];

export default function Terminal() {
  const [persona, setPersona] = useState<PersonaKey | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [value, setValue] = useState("");
  const [histIdx, setHistIdx] = useState(-1);
  const [menuIdx, setMenuIdx] = useState(0);
  const [announce, setAnnounce] = useState("");

  const inputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(0);
  const histRef = useRef<string[]>([]);

  const state: TermState = useMemo(() => ({ persona }), [persona]);

  const menuItems = useMemo(() => {
    if (!value.startsWith("/") || value.includes(" ")) return [];
    const q = value.toLowerCase();
    return visibleCommands(state).filter((c) => c.name.startsWith(q) && c.name !== q);
  }, [value, state]);

  useEffect(() => setMenuIdx(0), [value]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [entries]);

  const execute = useCallback(
    (raw: string) => {
      const trimmed = raw.trim();
      const result = runCommand(trimmed, { persona });
      if (result.theme) {
        document.documentElement.dataset.theme = result.theme satisfies ThemeName;
        // degauss wobble, like slapping the side of the monitor
        const screen = document.querySelector(".crt-screen");
        if (screen) {
          screen.classList.remove("degauss");
          void (screen as HTMLElement).offsetWidth; // restart animation
          screen.classList.add("degauss");
          setTimeout(() => screen.classList.remove("degauss"), 600);
        }
      }
      if (result.setPersona !== undefined || result.leavePersona) {
        setPersona(result.leavePersona ? null : (result.setPersona ?? null));
      }
      if (result.clear) {
        setEntries([]);
      } else if (trimmed) {
        setEntries((prev) => [
          ...prev,
          {
            id: ++idRef.current,
            prompt: promptFor(persona),
            input: trimmed,
            output: result.output ?? null,
          },
        ]);
      }
      if (trimmed) {
        histRef.current.push(trimmed);
        setAnnounce(`Ran ${trimmed}. Output updated below.`);
      }
      setHistIdx(-1);
      setValue("");
    },
    [persona],
  );

  const acceptMenu = useCallback(
    (i: number) => {
      const item = menuItems[i];
      if (!item) return;
      setValue(item.name.split(" ")[0]);
      inputRef.current?.focus();
    },
    [menuItems],
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (menuItems.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMenuIdx((i) => (i + 1) % menuItems.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMenuIdx((i) => (i - 1 + menuItems.length) % menuItems.length);
        return;
      }
      if (e.key === "Tab") {
        e.preventDefault();
        acceptMenu(menuIdx);
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const item = menuItems[menuIdx];
        if (item) execute(item.name.split(" ")[0]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setValue("");
        return;
      }
    }

    if (e.key === "Enter") {
      e.preventDefault();
      execute(value);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const h = histRef.current;
      if (h.length === 0) return;
      const next = histIdx === -1 ? h.length - 1 : Math.max(0, histIdx - 1);
      setHistIdx(next);
      setValue(h[next]);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const h = histRef.current;
      if (histIdx === -1) return;
      const next = histIdx + 1;
      if (next >= h.length) {
        setHistIdx(-1);
        setValue("");
      } else {
        setHistIdx(next);
        setValue(h[next]);
      }
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      const cmds = visibleCommands(state).map((c) => c.name.split(" ")[0]);
      const match = cmds.find((c) => c.startsWith(value) && c !== value);
      if (match) setValue(match);
    }
  };

  const prompt = promptFor(persona);
  const chips = persona ? PERSONA_CHIPS : INTRO_CHIPS;

  return (
    <div
      className="term"
      onClick={(e) => {
        // keep taps on links/buttons working; anything else refocuses the input
        const t = e.target as HTMLElement;
        if (!t.closest("a, button, input")) inputRef.current?.focus();
      }}
    >
      <div className="term-output">
        <h1 className="sr-only">Shreyas Kulkarni — interactive terminal portfolio</h1>
        <pre className="banner" aria-hidden="true">{BANNER}</pre>
        <p className="dim">
          shreyas-portfolio v2.0 · data scientist &amp; AI systems engineer · uptime: since 2001
        </p>
        <p>
          Welcome to my corner of the internet. This is a real(ish) shell — <strong>5 folders,
          one for each kind of visitor.</strong>
        </p>
        <p className="hint">
          Start with <code>ls</code>, then <code>cd</code> into whoever you are today. Press{" "}
          <code>/</code> anytime for the command menu.
        </p>

        <div role="log" aria-label="Terminal output">
          {entries.map((en, i) => (
            <div className={i === entries.length - 1 ? "entry entry-fresh" : "entry"} key={en.id}>
              <div className="echo-line">
                <span className="prompt-tag">{en.prompt}</span> {en.input}
              </div>
              {en.output}
            </div>
          ))}
        </div>
        <div ref={endRef} />
      </div>

      <div className="input-line">
        {menuItems.length > 0 && (
          <div
            className="cmd-menu"
            role="listbox"
            id="cmd-menu"
            aria-label="Command suggestions"
          >
            {menuItems.map((c, i) => (
              <div
                key={c.name}
                role="option"
                id={`cmd-opt-${i}`}
                aria-selected={i === menuIdx}
                onMouseDown={(e) => {
                  e.preventDefault();
                  execute(c.name.split(" ")[0]);
                }}
              >
                <span className="cname">{c.name}</span>
                <span className="cdesc">{c.description}</span>
              </div>
            ))}
          </div>
        )}
        <label className="prompt-tag" htmlFor="term-input">
          {prompt}
        </label>
        <input
          id="term-input"
          ref={inputRef}
          className="term-input"
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          role="combobox"
          aria-expanded={menuItems.length > 0}
          aria-controls="cmd-menu"
          aria-activedescendant={menuItems.length > 0 ? `cmd-opt-${menuIdx}` : undefined}
          aria-label={`Terminal input, prompt ${prompt}. Type a command or press slash for suggestions.`}
        />
      </div>

      <div className="chips" aria-label="Quick commands">
        {chips.map((c) => (
          <button key={c} type="button" onClick={() => execute(c)}>
            [{c}]
          </button>
        ))}
      </div>

      <div className="statusline">
        <span>
          mode: <strong>{persona ?? "guest"}</strong>
        </span>
        <span>theme: /theme green | amber</span>
        <span>
          <span className="blink" aria-hidden="true">▮</span> ready
        </span>
      </div>

      <div className="sr-only" role="status" aria-live="polite">
        {announce}
      </div>
    </div>
  );
}
