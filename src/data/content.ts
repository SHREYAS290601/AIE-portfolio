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

const data = resume as unknown as {
  identity: { name: string; title: string; thesis: string; pangram: string };
  roles: Role[];
  projects: { facts: Fact[] }[];
};

export const identity = data.identity;
export const roles = data.roles;

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
