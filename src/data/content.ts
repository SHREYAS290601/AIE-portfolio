import resume from "./resume.json";

// Shape after the redact-uncleared Vite plugin: uncleared text is null.
export type Fact = { id: string; text: string | null; clearance: string };
export type Role = {
  id: string;
  org: string;
  title: string;
  start: string;
  end: string | null;
  story: string;
  headline: string[];
  facts: Fact[];
};

export type Degree = { school: string; degree: string; gpa: string; start: string; end: string; location: string };

const data = resume as unknown as {
  identity: { name: string; title: string; thesis: string; pangram: string };
  roles: Role[];
  projects: { facts: Fact[] }[];
  education: Degree[];
};

export const identity = data.identity;
export const roles = data.roles;
export const education = data.education;

// Short chip copy per headline fact. Numbers are verbatim from the fact text.
export const CHIPS: Record<string, string> = {
  "premier.schema": "697 natural keys recovered",
  "premier.indexing": "52x heaviest recomputation",
  "premier.multi-agent": "7 of 7, zero unsupported numbers",
  "premier.settlement-quality": "1.395x double count caught",
  "uiuc-ai.cost": "$0.04 per submission",
  "uiuc-ai.reliability": "317 + 46 checks",
  "uiuc-ai.grader": "5% divergence goes to a human",
  "dsrs.agentic-rag": "95% retrieval accuracy",
  "dsrs.ab-tests": "+50% precision and MRR",
  "dsrs.ingestion": "7,000+ docs in under 10 seconds",
  "dsrs.sec": "15,856 SEC documents",
  "apptware.pipelines": "470,000+ records",
  "apptware.pix2pix": "17,000+ CT images",
  "apptware.ivr": "1s to 200ms IVR latency",
  "apptware.seo": "20+ clients",
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "Aug 2026" to a month index; null means present. */
export function monthIndex(s: string | null): number {
  if (!s) {
    const d = new Date();
    return d.getFullYear() * 12 + d.getMonth();
  }
  const [m, y] = s.split(" ");
  const i = MONTHS.indexOf(m.slice(0, 3));
  if (i < 0 || !y) throw new Error(`unparseable date: ${s}`);
  return Number(y) * 12 + i;
}
export const dateRange = (start: string, end: string | null) => `${start} · ${end ?? "Present"}`.toUpperCase();

const facts = new Map<string, Fact>();
for (const g of [...data.roles, ...data.projects]) for (const f of g.facts) facts.set(f.id, f);

export const isCleared = (id: string) => facts.get(id)?.text != null;

// Uncleared items carry no value or caption here, so nothing leaks into the bundle.
type SignalSpec = { fact: string; value?: string; caption?: string };
const SIGNAL_SPEC: SignalSpec[] = [
  { fact: "premier.schema", value: "925", caption: "tables mapped with zero foreign keys; 697 natural keys recovered." },
  { fact: "premier.indexing", value: "52x", caption: "heaviest recomputation, 14.3 s to 0.27 s, via read-only indexes." },
  { fact: "uiuc-ai.cost", value: "$0.04", caption: "per graded submission: 860 submissions, $35 total." },
  { fact: "uiuc-ai.reliability", value: "317 + 46", caption: "correctness and fault-injection checks on the LLM grader." },
  { fact: "premier.multi-agent", value: "7/7", caption: "correct answers from a local multi-agent system, zero unsupported numerical outputs." },
  { fact: "dsrs.agentic-rag", value: "95%", caption: "retrieval accuracy, agentic RAG on LangGraph and Qwen-3-32B." },
  { fact: "dsrs.ab-tests", value: "+50%", caption: "retrieval precision and MRR, from A/B-tested search strategies." },
];

export const PLACEHOLDER_VALUE = "░░░";
export const SIGNAL = SIGNAL_SPEC.map((s) =>
  isCleared(s.fact) && s.value && s.caption
    ? { fact: s.fact, value: s.value, caption: s.caption, cleared: true }
    : { fact: s.fact, value: PLACEHOLDER_VALUE, caption: "Premier Cooperative figure, pending clearance.", cleared: false },
);
