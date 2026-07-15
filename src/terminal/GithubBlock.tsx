import { useEffect, useState } from "react";
import { CONTACT, ORGS } from "../data/resume";

interface Repo {
  name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  pushed_at: string;
  fork: boolean;
  stargazers_count: number;
}

const SPIN = ["|", "/", "-", "\\"];

function Spinner({ label }: { label: string }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    const t = setInterval(() => setI((n) => (n + 1) % SPIN.length), 110);
    return () => clearInterval(t);
  }, []);
  return (
    <p className="dim" role="status">
      <span aria-hidden="true">[{SPIN[i]}]</span> {label}
    </p>
  );
}

function ago(iso: string): string {
  const days = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

export default function GithubBlock() {
  const [repos, setRepos] = useState<Repo[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("https://api.github.com/users/SHREYAS290601/repos?sort=pushed&per_page=12")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data: Repo[]) => {
        if (alive) setRepos(data.filter((r) => !r.fork).slice(0, 8));
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="out-block">
      <div className="out-title">Live from the GitHub API</div>
      {!repos && !failed && <Spinner label="fetching github.com/SHREYAS290601 ..." />}
      {failed && (
        <p className="err">
          fetch failed (rate limit, probably). Browse directly:{" "}
          <a href={CONTACT.github} target="_blank" rel="noreferrer">
            github.com/SHREYAS290601
          </a>
        </p>
      )}
      {repos && (
        <ul className="plain">
          {repos.map((r) => (
            <li key={r.name}>
              <a href={r.html_url} target="_blank" rel="noreferrer">
                {r.name}
              </a>{" "}
              <span className="dim">
                — {r.language ?? "misc"} · pushed {ago(r.pushed_at)}
                {r.description ? ` · ${r.description}` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="out-title">Org work (private repos, so just the headline)</div>
      <ul className="plain">
        {ORGS.map((o) => (
          <li key={o.handle}>
            <span className="dir">{o.handle}</span> <span className="dim">— {o.desc}</span>
          </li>
        ))}
      </ul>
      <p className="hint">Public list refreshes live on every visit; curated picks live in /projects.</p>
    </div>
  );
}
