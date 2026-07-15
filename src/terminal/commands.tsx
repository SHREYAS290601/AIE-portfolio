import { Fragment, type ReactNode } from "react";
import {
  CONTACT,
  EXPERIENCE,
  PROJECTS,
  SKILLS,
  EDUCATION,
  CERTIFICATES,
  FUN_FACTS,
} from "../data/resume";
import { PERSONAS, PERSONA_KEYS, type PersonaKey } from "../data/personas";

export type ThemeName = "green" | "amber";

export interface TermState {
  persona: PersonaKey | null;
}

export interface CommandResult {
  output?: ReactNode;
  clear?: boolean;
  setPersona?: PersonaKey | null | undefined;
  leavePersona?: boolean;
  theme?: ThemeName;
}

export interface CommandSpec {
  name: string;
  description: string;
  requiresPersona: boolean;
  personaOnly?: PersonaKey; // only offered inside this persona folder
}

/* ---------------------------------------------------------------- */
/* command catalog (drives the slash menu + help)                    */
/* ---------------------------------------------------------------- */

export const COMMANDS: CommandSpec[] = [
  { name: "/help", description: "list available commands", requiresPersona: false },
  { name: "ls", description: "list the persona folders", requiresPersona: false },
  { name: "cd <folder>", description: "enter a persona folder (e.g. cd recruiter)", requiresPersona: false },
  { name: "/experience", description: "work history", requiresPersona: true },
  { name: "/skills", description: "my skills, grouped by area", requiresPersona: true },
  { name: "/projects", description: "selected systems I built", requiresPersona: true },
  { name: "/certificates", description: "certifications", requiresPersona: true },
  { name: "/education", description: "degrees and GPAs", requiresPersona: true },
  { name: "/contact", description: "email, phone, links", requiresPersona: false },
  { name: "/resume", description: "one-screen resume summary", requiresPersona: true },
  { name: "/socials", description: "where else to find me", requiresPersona: true },
  { name: "/why-hire-me", description: "the 30-second pitch", requiresPersona: true, personaOnly: "recruiter" },
  { name: "/stack", description: "the full toolchain, layer by layer", requiresPersona: true, personaOnly: "developer" },
  { name: "/funfacts", description: "things the resume left out", requiresPersona: true, personaOnly: "stalker" },
  { name: "/roast", description: "I roast myself before you can", requiresPersona: true, personaOnly: "haters" },
  { name: "/collaborate", description: "what I'd like to build with you", requiresPersona: true, personaOnly: "professionals" },
  { name: "/theme", description: "switch phosphor: /theme green | amber", requiresPersona: false },
  { name: "whoami", description: "who is typing / who am I", requiresPersona: false },
  { name: "clear", description: "wipe the screen", requiresPersona: false },
  { name: "cd ..", description: "leave the current folder", requiresPersona: true },
];

export function visibleCommands(state: TermState): CommandSpec[] {
  return COMMANDS.filter((c) => {
    if (c.personaOnly) return state.persona === c.personaOnly;
    if (c.requiresPersona) return state.persona !== null;
    return true;
  });
}

/* ---------------------------------------------------------------- */
/* small render helpers                                              */
/* ---------------------------------------------------------------- */

const RULE = "─".repeat(46);

function Rule() {
  return <div className="rule" aria-hidden="true">{RULE}</div>;
}

function Title({ children }: { children: ReactNode }) {
  return <div className="out-title">{children}</div>;
}

function LsListing() {
  return (
    <div className="out-block">
      <p className="dim">5 directories found. Pick who you are today:</p>
      <ul className="plain">
        {PERSONA_KEYS.map((k) => (
          <li key={k}>
            <span className="dir">{k}/</span>{" "}
            <span className="dim">— {PERSONAS[k].tagline}</span>
          </li>
        ))}
      </ul>
      <p className="hint">try: cd recruiter</p>
    </div>
  );
}

function ContactBlock() {
  return (
    <dl className="kv">
      <dt>email</dt>
      <dd>
        <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
      </dd>
      <dt>phone</dt>
      <dd>
        <a href={CONTACT.phoneHref}>{CONTACT.phone}</a>
      </dd>
      <dt>linkedin</dt>
      <dd>
        <a href={CONTACT.linkedin} target="_blank" rel="noreferrer">
          linkedin.com/in/shreyaskulkarni29
        </a>
      </dd>
      <dt>github</dt>
      <dd>
        <a href={CONTACT.github} target="_blank" rel="noreferrer">
          github.com/SHREYAS290601
        </a>
      </dd>
    </dl>
  );
}

/* ---------------------------------------------------------------- */
/* persona-flavored sections                                         */
/* ---------------------------------------------------------------- */

const EXPERIENCE_INTRO: Record<PersonaKey, string> = {
  recruiter: "Impact first. Every number below shipped to production or research use.",
  developer: "Tech cut enabled — each role includes implementation notes.",
  stalker: "The full trail, verified and chronological. Cross-reference away.",
  haters: "Feel free to fact-check every line. Please. It's all real.",
  professionals: "Work history with research and production context.",
};

function ExperienceBlock({ persona }: { persona: PersonaKey }) {
  const showDev = persona === "developer";
  return (
    <div className="out-block">
      <p className="dim">{EXPERIENCE_INTRO[persona]}</p>
      {EXPERIENCE.map((r) => (
        <div key={r.title + r.period}>
          <Title>
            {r.title} @ {r.org}
          </Title>
          <p className="dim">
            {r.period} · {r.location}
          </p>
          <ul className="plain">
            {r.bullets.map((b) => (
              <li key={b}>{b}</li>
            ))}
            {showDev &&
              r.devNotes.map((b) => (
                <li key={b}>
                  <span className="dim">[dev] </span>
                  {b}
                </li>
              ))}
          </ul>
        </div>
      ))}
      <Rule />
    </div>
  );
}

const SKILLS_OUTRO: Record<PersonaKey, string> = {
  recruiter: "Keyword-scanner friendly. Human-verified.",
  developer: "Ask me about any of these — I have opinions.",
  stalker: "Yes, this matches the LinkedIn. Consistency is a feature.",
  haters: "\"Jack of all trades\"? The full quote ends \"...oftentimes better than master of one.\"",
  professionals: "Happy to trade notes on any of these areas.",
};

function SkillsBlock({ persona }: { persona: PersonaKey }) {
  return (
    <div className="out-block">
      {Object.entries(SKILLS).map(([group, items]) => (
        <div key={group}>
          <Title>{group}</Title>
          <p>{items.join(" · ")}</p>
        </div>
      ))}
      <p className="hint">{SKILLS_OUTRO[persona]}</p>
    </div>
  );
}

function ProjectsBlock({ persona }: { persona: PersonaKey }) {
  return (
    <div className="out-block">
      {PROJECTS.map((p) => (
        <div key={p.name}>
          <Title>{p.name}</Title>
          <p className="dim">
            {p.where} · {p.stack.join(", ")}
          </p>
          <p>{p.desc}</p>
          {p.link && (
            <p>
              <a href={p.link} target="_blank" rel="noreferrer">
                demo / write-up ↗
              </a>
            </p>
          )}
        </div>
      ))}
      {persona === "haters" && (
        <p className="hint">Four real systems. Zero todo-list apps. Sorry to disappoint.</p>
      )}
    </div>
  );
}

function EducationBlock() {
  return (
    <div className="out-block">
      {EDUCATION.map((e) => (
        <div key={e.school}>
          <Title>{e.school}</Title>
          <p>
            {e.degree} · {e.gpa} <span className="dim">({e.period})</span>
          </p>
        </div>
      ))}
    </div>
  );
}

function CertificatesBlock() {
  return (
    <div className="out-block">
      <ul className="plain">
        {CERTIFICATES.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
    </div>
  );
}

function ResumeBlock() {
  return (
    <div className="out-block">
      <Title>{CONTACT.name} — one-screen resume</Title>
      <p>
        Data Scientist @ DSRS, University of Illinois · M.S. Information Science (3.93 GPA), May 2026.
      </p>
      <p>
        Builds agentic RAG systems (95% retrieval accuracy), LLM eval benchmarks (0.906 top-3 routing
        accuracy), and high-throughput data platforms (25K records/min CDC). Previously shipped
        production CV, NLP, and speech systems at Apptware across healthcare and enterprise clients.
      </p>
      <p className="dim">
        Full resume PDF: email{" "}
        <a href={`mailto:${CONTACT.email}?subject=Resume%20request`}>{CONTACT.email}</a> and it lands
        in your inbox within the day.
      </p>
    </div>
  );
}

function SocialsBlock({ persona }: { persona: PersonaKey }) {
  return (
    <div className="out-block">
      {persona === "stalker" && <p className="dim">All public. You didn't even need the trench coat.</p>}
      <ContactBlock />
    </div>
  );
}

function WhyHireMeBlock() {
  return (
    <div className="out-block">
      <Title>The 30-second pitch</Title>
      <ul className="plain">
        <li>I ship AI systems that survive contact with production — not notebook demos.</li>
        <li>Numbers I own: 95% retrieval accuracy, 50% MRR lift, 60% ETL latency cut, 15,856 documents auto-coded.</li>
        <li>Full-stack data: from Debezium CDC pipelines to LangGraph agents to the PowerBI layer execs read.</li>
        <li>I use Claude Code and Codex daily, but I own the architecture, evaluation, and debugging myself.</li>
        <li>Available May 2026 (or earlier for internships/co-ops). One email away: {CONTACT.email}</li>
      </ul>
    </div>
  );
}

function StackBlock() {
  return (
    <div className="out-block">
      <Title>Toolchain, layer by layer</Title>
      <dl className="kv">
        <dt>agents</dt>
        <dd>LangGraph decision trees, tool calling, Claude Code / Codex skills, FastAPI glue</dd>
        <dt>retrieval</dt>
        <dd>PGVector + Vectara, hybrid search, semantic chunking, custom rerankers, MRR-driven A/B tests</dd>
        <dt>models</dt>
        <dd>GPT-5/4, Claude, Qwen-3, Gemma-3, Llama · LoRA/QLoRA fine-tuning · embedding benchmarks vs Bedrock Titan</dd>
        <dt>data</dt>
        <dd>PySpark, Kafka + Debezium CDC, Snowflake, Databricks, dbt, Airflow, Prefect</dd>
        <dt>infra</dt>
        <dd>Docker, Kubernetes, Azure Container Instances, AWS (SageMaker/Bedrock/Lambda/RDS), MLflow</dd>
        <dt>eval</dt>
        <dd>Custom benchmarks (10K+ rows), LangSmith, Arize Phoenix, group-based validation</dd>
      </dl>
      <p className="hint">Currently building: Preflight, a Docker-sandboxed merge validator. Ask me about it.</p>
    </div>
  );
}

function FunFactsBlock() {
  return (
    <div className="out-block">
      <ul className="plain">
        {FUN_FACTS.map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ul>
    </div>
  );
}

const ROASTS = [
  "Maintains a 3.93 GPA and still says \"could have optimized that query better.\"",
  "Built a system that reads 15,856 SEC documents so he never has to read one himself.",
  "Says \"it's just a simple pipeline\" — the pipeline: Postgres, Debezium, Kafka, MinIO, Snowflake, dbt, Airflow.",
  "Made this portfolio a terminal because a normal website felt \"too easy.\"",
  "His idea of relaxing is A/B testing chunking strategies.",
];

function RoastBlock() {
  return (
    <div className="out-block">
      <p className="dim">Self-roast protocol engaged. Saving you the effort:</p>
      <ul className="plain">
        {ROASTS.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
      <p className="hint">Still here? The other commands work too. /experience has receipts.</p>
    </div>
  );
}

function CollaborateBlock() {
  return (
    <div className="out-block">
      <Title>Open collaboration threads</Title>
      <ul className="plain">
        <li>Early-termination policies for SWE-agent trajectories under bounded test-time budgets.</li>
        <li>Evidence-based merge validation for AI-generated code (Preflight).</li>
        <li>Retrieval evaluation: embedding benchmarks, hybrid search, reranking under domain shift.</li>
        <li>Applied agent systems for research data services (GitHub/Asana/Box knowledge bases).</li>
      </ul>
      <p>
        Reach me at <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a> — happy to trade drafts,
        datasets, or war stories.
      </p>
    </div>
  );
}

function WhoamiBlock({ persona }: { persona: PersonaKey | null }) {
  return (
    <div className="out-block">
      <p>
        {persona ? `You: ${PERSONAS[persona].user}. ` : "You: guest. "}
        Me: {CONTACT.name} — data scientist & AI systems engineer, University of Illinois.
      </p>
      {!persona && <p className="hint">Run ls to pick a folder and unlock the good commands.</p>}
    </div>
  );
}

function HelpBlock({ state }: { state: TermState }) {
  const cmds = visibleCommands(state);
  return (
    <div className="out-block">
      <p className="dim">
        {state.persona
          ? `Commands available in ~/${state.persona}:`
          : "Commands available (more unlock after you cd into a folder):"}
      </p>
      <dl className="kv">
        {cmds.map((c) => (
          <Fragment key={c.name}>
            <dt>{c.name}</dt>
            <dd>{c.description}</dd>
          </Fragment>
        ))}
      </dl>
      {!state.persona && <LsListing />}
    </div>
  );
}

function WelcomeBlock({ persona }: { persona: PersonaKey }) {
  const p = PERSONAS[persona];
  return (
    <div className="out-block">
      <p className="dim">
        Entered <span className="dir">~/{persona}</span>
      </p>
      {p.welcome.map((line) => (
        <p key={line}>{line}</p>
      ))}
      <p className="hint">
        Type / to open the command menu — try /experience, /projects, or {p.special.name}.
      </p>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* executor                                                          */
/* ---------------------------------------------------------------- */

function err(msg: string, hint?: string): CommandResult {
  return {
    output: (
      <div className="out-block">
        <p className="err">{msg}</p>
        {hint && <p className="hint">{hint}</p>}
      </div>
    ),
  };
}

export function runCommand(raw: string, state: TermState): CommandResult {
  const input = raw.trim();
  if (!input) return {};

  const lower = input.toLowerCase();
  const [head, ...rest] = lower.split(/\s+/);
  const arg = rest.join(" ");
  // accept both "/experience" and "experience"
  const cmd = head.startsWith("/") ? head.slice(1) : head;

  // folder navigation ------------------------------------------------
  if (cmd === "ls" || cmd === "dir") return { output: <LsListing /> };

  if (cmd === "cd") {
    if (!arg || arg === "~" || arg === "/" || arg === "..") {
      if (state.persona && (arg === ".." || !arg || arg === "~" || arg === "/")) {
        return {
          setPersona: null,
          leavePersona: true,
          output: (
            <div className="out-block">
              <p className="dim">Back to ~. Run ls to pick another folder.</p>
            </div>
          ),
        };
      }
      return { output: <LsListing /> };
    }
    const target = arg.replace(/\/$/, "") as PersonaKey;
    if (PERSONA_KEYS.includes(target)) {
      return { setPersona: target, output: <WelcomeBlock persona={target} /> };
    }
    return err(`cd: no such directory: ${arg}`, "run ls to see the available folders");
  }

  // typing a bare persona name also enters it
  if (PERSONA_KEYS.includes(cmd as PersonaKey)) {
    return { setPersona: cmd as PersonaKey, output: <WelcomeBlock persona={cmd as PersonaKey} /> };
  }

  // global commands ---------------------------------------------------
  switch (cmd) {
    case "help":
    case "?":
      return { output: <HelpBlock state={state} /> };
    case "clear":
    case "cls":
      return { clear: true };
    case "whoami":
      return { output: <WhoamiBlock persona={state.persona} /> };
    case "contact":
      return { output: <div className="out-block"><ContactBlock /></div> };
    case "theme": {
      if (arg === "green" || arg === "amber") {
        return {
          theme: arg,
          output: (
            <div className="out-block">
              <p className="dim">Phosphor set to {arg}.</p>
            </div>
          ),
        };
      }
      return err("usage: /theme green | amber");
    }
    case "exit":
    case "logout":
      if (state.persona) {
        return {
          setPersona: null,
          leavePersona: true,
          output: (
            <div className="out-block">
              <p className="dim">Logged out of ~/{state.persona}. You're back at ~.</p>
            </div>
          ),
        };
      }
      return err("exit: you can check out any time you like, but you can never leave.");
    case "sudo":
      return err("sudo: permission denied.", "nice try though. bonus points for instinct.");
    case "pwd":
      return {
        output: (
          <div className="out-block">
            <p>/home/{state.persona ?? "guest"}{state.persona ? `/${state.persona}` : ""}</p>
          </div>
        ),
      };
  }

  // persona-gated commands --------------------------------------------
  const gated = [
    "experience",
    "skills",
    "skill",
    "projects",
    "certificates",
    "certs",
    "education",
    "resume",
    "socials",
    "why-hire-me",
    "stack",
    "funfacts",
    "roast",
    "collaborate",
  ];
  if (gated.includes(cmd) && !state.persona) {
    return err(
      `/${cmd}: locked. Pick a folder first.`,
      "run ls, then cd into recruiter, developer, stalker, haters, or professionals",
    );
  }

  const persona = state.persona!;
  switch (cmd) {
    case "experience":
      return { output: <ExperienceBlock persona={persona} /> };
    case "skills":
    case "skill":
      return { output: <SkillsBlock persona={persona} /> };
    case "projects":
      return { output: <ProjectsBlock persona={persona} /> };
    case "certificates":
    case "certs":
      return { output: <CertificatesBlock /> };
    case "education":
      return { output: <EducationBlock /> };
    case "resume":
      return { output: <ResumeBlock /> };
    case "socials":
      return { output: <SocialsBlock persona={persona} /> };
    case "why-hire-me":
      if (persona !== "recruiter") break;
      return { output: <WhyHireMeBlock /> };
    case "stack":
      if (persona !== "developer") break;
      return { output: <StackBlock /> };
    case "funfacts":
      if (persona !== "stalker") break;
      return { output: <FunFactsBlock /> };
    case "roast":
      if (persona !== "haters") break;
      return { output: <RoastBlock /> };
    case "collaborate":
      if (persona !== "professionals") break;
      return { output: <CollaborateBlock /> };
  }

  if (gated.includes(cmd)) {
    return err(
      `/${cmd}: not available in ~/${persona}.`,
      `that one belongs to another folder — run /help to see what ~/${persona} offers`,
    );
  }

  return err(`command not found: ${input}`, "type /help or press / to see the menu");
}
