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

type Contact = { value: string } | null;
const data = resume as unknown as {
  identity: {
    name: string; title: string; thesis: string; pangram: string;
    contact: { email: Contact; linkedin: Contact; portfolio: Contact };
  };
  roles: Role[];
  projects: { facts: Fact[] }[];
  education: Degree[];
  skills: { category: string; items: string[] }[];
};

export const identity = data.identity;
export const roles = data.roles;
export const education = data.education;
export const skills = data.skills;

/*
 * Case studies. Copy reuses resume facts; numbers are verbatim. `facts` lists the sources,
 * so a case disappears if any of them is not cleared.
 */
export type CaseStudy = {
  id: string; title: string; facts: string[];
  problem: string; built: string; verified: string;
  numbers: string[]; stack: string[]; diagram: string[][];
};
const CASE_SPEC: CaseStudy[] = [
  {
    id: "grader",
    title: "LLM grading system",
    facts: ["uiuc-ai.grader", "uiuc-ai.release-gate", "uiuc-ai.reliability", "uiuc-ai.cost", "uiuc-ai.infra"],
    problem: "Grade finance coursework arriving as DOCX, PDF, and text against JSON rubrics and solution keys, without any grade reaching students before a human approves it.",
    built: "Canvas REST API ingestion and document extraction feed Claude on Azure AI Foundry with structured tool calls. Azure infrastructure in Bicep: Container Apps Jobs, App Service, a FastAPI review console, queues, and Blob Storage as the system of record.",
    verified: "Every submission is graded twice; divergence above 5% or a grade-boundary result goes to human review. Grades post hidden and need a separate release approval. 317 correctness checks and 46 fault-injection checks cover 240 concurrent operations, 23 hostile queue messages, and injected HTTP 429 errors.",
    numbers: ["$0.04 per submission", "$35 total", "860 submissions", "about 75% of tokens cached", "317 + 46 checks"],
    stack: ["Claude", "Azure AI Foundry", "Canvas REST API", "FastAPI", "Bicep", "Container Apps Jobs", "Blob Storage", "GitHub Actions OIDC"],
    diagram: [["Canvas API"], ["DOCX / PDF / text"], ["Claude pass 1", "Claude pass 2"], ["Divergence > 5%"], ["Human review"], ["Release"]],
  },
  {
    id: "agvance",
    title: "Mapping a database with no foreign keys",
    facts: ["premier.schema", "premier.star-schema", "premier.settlement-quality", "premier.indexing"],
    problem: "A vendor SQL Server database (Agvance) with 925 tables, 14,539 columns, and zero foreign keys.",
    built: "Recovered 697 natural keys, audited 128 Agvance API operations, and produced a 10-report evidence base, inferring relationships across about 85% of tables. On top: a star-schema analytics database with T-SQL ETL on SQL Server Agent, nightly rebuilds, and 15-minute conditional refreshes.",
    verified: "Snapshots reconcile against fresh recomputation. The checks surfaced a settlement field that double-counted bushels by 1.395x, a business rule hiding 967,647 bu of open corn, and zero prices in 114,040 of 178,570 settlement rows, fixed with a settlement-line price fallback.",
    numbers: ["925 tables", "697 natural keys", "about 85% of tables", "52x heaviest recomputation", "about 8 ms vs 360 ms"],
    stack: ["SQL Server", "T-SQL", "SQL Server Agent", "Agvance REST", "Python"],
    diagram: [["Agvance SQL Server"], ["Key recovery"], ["Fact", "Dimension", "Snapshot"], ["SQL Server Agent"], ["Reconcile"]],
  },
  {
    id: "agents",
    title: "Local agents that can't fake numbers",
    facts: ["premier.multi-agent", "premier.backend", "premier.bedrock"],
    problem: "Answer grower questions against live APIs without unsupported numbers.",
    built: "A local multi-agent system on DGX Spark: a Gemma 4 orchestrator with specialized sub-agents, llama.cpp, and the OpenAI Agents SDK, calling an async Python/FastAPI backend with 14 routes across 8 grower insight tiers. Grower summaries come from Claude Sonnet 5.5 on AWS Bedrock with prompt-hash caching.",
    verified: "Benchmarked against live APIs: 7 of 7 correct with zero unsupported numerical outputs. The backend runs 196 offline pytest checks via pre-commit, with ContextVar request isolation.",
    numbers: ["7 of 7 correct", "zero unsupported numbers", "45% faster inference", "196 pytest checks"],
    stack: ["Gemma 4", "llama.cpp", "OpenAI Agents SDK", "DGX Spark", "FastAPI", "Pydantic", "SQLAlchemy", "AWS Bedrock"],
    diagram: [["Question"], ["Gemma 4 orchestrator"], ["Sub-agents"], ["FastAPI, 14 routes"], ["Agvance", "Barchart", "farmdoc"]],
  },
  {
    id: "rag",
    title: "Retrieval chosen by measurement",
    facts: ["dsrs.agentic-rag", "dsrs.ab-tests", "dsrs.embedding-bench", "dsrs.ingestion"],
    problem: "Choose retrieval strategies and embedding models for research workflows by evidence, not by default.",
    built: "Agentic RAG with LangGraph and Qwen-3-32B, plus a model-agnostic embedding benchmark on Supabase Postgres with pgvector, per-model vector columns, and cosine-search RPCs. Multiprocessing ingestion moves 7,000+ MongoDB documents into PostgreSQL vector stores with Pydantic validation.",
    verified: "Statistical A/B tests compared custom scoring, hybrid search, and semantic chunking. Qwen3, EmbeddingGemma, and Jina v4 were scored on BEIR SciFact with nDCG@10, Recall@10, and rank overlap. Ingestion keeps 100% data integrity.",
    numbers: ["95% retrieval accuracy", "+50% precision and MRR", "7,000+ docs in under 10 seconds", "768-2048 dimensions"],
    stack: ["LangGraph", "Qwen-3-32B", "Supabase", "pgvector", "MongoDB", "PostgreSQL", "Pydantic", "FastAPI"],
    diagram: [["MongoDB"], ["Ingest, Pydantic"], ["pgvector"], ["LangGraph agent"], ["Answer"]],
  },
  {
    id: "pantryops",
    title: "PantryOps Edge",
    facts: ["pantryops.pantryops"],
    problem: "Turn post-shopping photos into an editable pantry inventory where AI estimates can never overwrite what the user confirmed.",
    built: "An RF-DETR, PaddleOCR, and barcode pipeline produces provenance-tagged inventory, served by FastAPI, Postgres, and Celery to an Expo React Native app.",
    verified: "One ledger service enforces source, confidence, and status on every write. Built test-first, with a WCAG 2.1 AA mobile UI.",
    numbers: ["15+ endpoints", "18 models", "16 agents"],
    stack: ["FastAPI", "Postgres", "Celery", "Expo React Native", "RF-DETR", "PaddleOCR"],
    diagram: [["Photo"], ["RF-DETR", "PaddleOCR", "Barcode"], ["Ledger service"], ["Postgres"], ["Expo app"]],
  },
];

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
export const CASES = CASE_SPEC.filter((c) => c.facts.every(isCleared));

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
