export const CONTACT = {
  name: "Shreyas Sachin Kulkarni",
  phone: "(217) 866-6174",
  phoneHref: "tel:+12178666174",
  email: "ssk16@illinois.edu",
  linkedin: "https://www.linkedin.com/in/shreyaskulkarni29/",
  github: "https://github.com/SHREYAS290601",
  site: "https://shreyas290601.github.io/AIE-portfolio/",
};

export interface Role {
  org: string;
  title: string;
  period: string;
  location: string;
  bullets: string[];
  devNotes: string[]; // tech-heavy variants for the developer persona
}

export const EXPERIENCE: Role[] = [
  {
    org: "Data Science Research Services (DSRS), University of Illinois",
    title: "Data Scientist",
    period: "Jul 2025 - Present",
    location: "Champaign, IL",
    bullets: [
      "Architected an agentic RAG orchestration layer hitting 95% retrieval accuracy, then migrated the workflow to Claude Code and Codex skills backed by FastAPI.",
      "Lifted Mean Reciprocal Rank by 50% via statistical A/B tests across custom scoring, hybrid search, and semantic chunking.",
      "Accelerated production ETL to 1,000+ event records per 1.5s with 60%+ lower latency on Azure Container Instances.",
      "Loaded 7,000+ documents into vector stores in under 10 seconds with 100% data integrity.",
      "Automated 70+ structured variables across 15,856 SEC enforcement documents (2010-2025) with LLM coding plus regex-based violation detection.",
      "Built a 10K+ row workflow-routing benchmark reaching 0.641 macro F1 and 0.906 top-3 accuracy on unseen seed groups.",
    ],
    devNotes: [
      "LangGraph decision trees over Qwen-3-32B; agent skills ported to Claude Code + Codex, served via FastAPI helpers.",
      "Async pagination + processing loops on Azure Container Instances; MongoDB + PostgreSQL (PGVector) as vector stores with Pydantic schema validation and multiprocessing ingest.",
      "Benchmarked Qwen-3, Gemma-3, and Jina embeddings against AWS Bedrock Titan on managed Postgres (Amazon RDS).",
      "SEC pipeline pairs DeepSeek-V4 Flash indicator coding with deterministic regex violation detection.",
      "Routing benchmark: rule-based labels, ambiguity modeling, group-based validation, sequence-level decoding.",
    ],
  },
  {
    org: "Apptware Pvt. Ltd.",
    title: "Associate Data Scientist",
    period: "Apr 2023 - Jun 2024",
    location: "Pune, India",
    bullets: [
      "Developed Pix2Pix models over 17,000+ CT images to generate synthetic MRIs under healthcare privacy constraints.",
      "Cut manual processing 90% with a 24/7 AWS service generating SEO reports for 20+ clients.",
      "Processed 470,000+ records into analytics-ready datasets with SQL + PySpark, surfaced via Azure-hosted PowerBI.",
      "Reduced speech-to-text latency 80% (1s to 200ms) by deploying HuggingFace models on AWS Lambda for IVR.",
      "Managed end-to-end YOLO development across 18,000+ annotated images for edge-device object detection.",
    ],
    devNotes: [
      "PyTorch Pix2Pix (GAN) training pipeline; hierarchical ECG classification with XGBoost + Isolation Forest.",
      "PySpark + SQL medallion-style ETL feeding PowerBI; AWS Lambda cold-start tuning for STT inference.",
    ],
  },
  {
    org: "Apptware Pvt. Ltd.",
    title: "Data Science Intern",
    period: "Sep 2022 - Apr 2023",
    location: "Pune, India",
    bullets: [
      "Delivered an LLM chatbot with Chainlit + LangChain wiring GPT-4 and SQL into 20+ tool-called functions.",
      "Reduced document-processing latency 40% with Azure Computer Vision OCR over enterprise documents.",
      "Fine-tuned Falcon-7B and LLaMA with LoRA/QLoRA for scalable NLP applications.",
      "Built a hybrid NLP workflow (LDA + Llama semantic interpretation + few-shot classification) for insurance text.",
    ],
    devNotes: [
      "LoRA/QLoRA fine-tuning with optimized post-training inference; automated tool calling via LangChain agents.",
    ],
  },
];

export interface Project {
  name: string;
  where: string;
  desc: string;
  stack: string[];
  link?: string;
}

export const PROJECTS: Project[] = [
  {
    name: "Preflight",
    where: "Solo project · published on PyPI",
    desc: "Sandbox-first merge validation for Python repositories. Provisions isolated Docker sandboxes, runs evidence-based checks on candidate changes, and emits structured, agentic merge recommendations.",
    stack: ["Python", "Docker", "Agentic analysis", "CLI"],
    link: "https://github.com/SHREYAS290601/preflight",
  },
  {
    name: "Idoneus",
    where: "Solo project, ongoing",
    desc: "CLI-first LLM inference advisor: tells you which model + quantization + runtime to run on your hardware, why, what will break, and how to verify it — deterministic rules and calibrated uncertainty, not guesswork.",
    stack: ["Python", "LLM inference", "Quantization", "CLI"],
    link: "https://github.com/SHREYAS290601/idoneus",
  },
  {
    name: "Reality Check ATS",
    where: "Solo project",
    desc: "AI resume tailoring and job scanner for new-grad roles. Upload a resume, paste a job description, get a brutally honest roast plus a rewritten LaTeX experience section and tailored cover letter.",
    stack: ["Streamlit", "PyMuPDF", "Custom LLM endpoint"],
    link: "https://github.com/SHREYAS290601/automated_job_search_recommendations",
  },
  {
    name: "PantryOps Edge (KitchenOS)",
    where: "Solo project, ongoing",
    desc: "Mobile-first, edge-vision grocery memory app: plans groceries, confirms purchases via checklist, enriches products from images/OCR/barcodes, tracks pantry quantities, and recommends recipes.",
    stack: ["Python", "Edge CV", "OCR", "Mobile-first"],
    link: "https://github.com/SHREYAS290601/KitchenOS",
  },
  {
    name: "ARS.FLOW",
    where: "Team project",
    desc: "Platform for discovering and evaluating verification-first AI skills — public website plus a source-of-truth skills catalog and registry.",
    stack: ["TypeScript", "Vercel", "AI skills registry"],
    link: "https://github.com/SHREYAS290601/ars.flow-website",
  },
  {
    name: "Multi-Insurance-Agent-System",
    where: "University of Illinois",
    desc: "6-agent LangGraph architecture with OpenAI function calling and SCAN structural constraints; observability via LangSmith and Arize Phoenix; lower latency than keyword-search RAG baselines.",
    stack: ["LangGraph", "OpenAI", "LangSmith", "Arize Phoenix"],
    link: "https://github.com/SHREYAS290601/multi-agent-system",
  },
  {
    name: "Containerized Banking Data Architecture",
    where: "University of Illinois",
    desc: "End-to-end CDC pipeline (Postgres, Debezium, Kafka, MinIO, Snowflake, dbt, Airflow, GitHub Actions) sustaining ~25,000 transactions and account updates per minute.",
    stack: ["Debezium", "Kafka", "Snowflake", "dbt", "Airflow", "Docker"],
    link: "https://github.com/SHREYAS290601/banking-snowflake-dbt-airflow",
  },
  {
    name: "Automated Insurance Claim Audit Pipeline",
    where: "University of Illinois",
    desc: "Azure Databricks pipeline with Medallion Architecture and an Xception-based CV model (94% accuracy), optimized for a 4GB compute budget via Hive Metastore and MLflow.",
    stack: ["Azure Databricks", "PySpark", "MLflow", "Xception"],
    link: "https://www.linkedin.com/feed/update/urn:li:activity:7429979052737974272/",
  },
];

export interface Org {
  handle: string;
  desc: string;
}

// Org work is in private repos — described here at a high level only.
export const ORGS: Org[] = [
  {
    handle: "GiesDSRS",
    desc: "Data Science Research Services, Gies College of Business — agentic RAG, knowledge-base ingestion, research data tooling (private repos)",
  },
  {
    handle: "gies-ai-hub",
    desc: "AI learning platform engineering at Gies (private repos)",
  },
  {
    handle: "uiucdisruptionlab",
    desc: "UIUC Disruption Lab — applied emerging-tech projects (private repos)",
  },
];

export const SKILLS: Record<string, string[]> = {
  "AI & Agents": [
    "LangChain",
    "LangGraph",
    "RAG",
    "LLMs (GPT-5/4, Claude, Llama)",
    "PGVector / Vectara",
    "Prompt engineering",
    "Claude Code",
    "Codex",
    "Cursor",
  ],
  "ML & Deep Learning": [
    "PyTorch",
    "TensorFlow",
    "YOLO",
    "Transfer learning",
    "Pix2Pix (GANs)",
    "XGBoost",
    "Random Forest",
    "Scikit-Learn",
  ],
  "Data Engineering": [
    "PySpark",
    "Docker",
    "Kubernetes",
    "ETL pipelines",
    "Snowflake",
    "Databricks",
    "Prefect",
    "Kafka",
    "dbt",
    "Airflow",
  ],
  "Cloud & DevOps": [
    "AWS (SageMaker, Bedrock, S3, RDS, EC2, Lambda)",
    "Azure",
    "GCP (Vertex AI, Gemini Enterprise)",
    "MLflow",
    "Git",
  ],
  Languages: ["Python (advanced, Pydantic)", "SQL", "R", "JavaScript", "Regex", "BigQuery ML"],
  "BI & Tools": ["PowerBI", "Tableau", "SAP Business Objects", "Excel", "MongoDB", "Linux"],
};

export const EDUCATION = [
  {
    school: "University of Illinois Urbana-Champaign",
    degree: "M.S. Information Science",
    gpa: "3.93 GPA",
    period: "Aug 2024 - May 2026",
  },
  {
    school: "Savitribai Phule Pune University",
    degree: "B.E. Computer Engineering (minor: Data Science)",
    gpa: "3.86 GPA",
    period: "Aug 2019 - Jul 2023",
  },
];

export const CERTIFICATES = [
  "Microsoft Certified: Azure AI Fundamentals",
  "ML Algorithms with R in Business Analytics (Coursera)",
  "Introduction to Business Analytics with R (Coursera)",
  "ML, Data Science and Deep Learning with Python (Udemy)",
  "Deep Learning for Healthcare Specialization (in progress)",
];

export const FUN_FACTS = [
  "Went from annotating 18,000 images to making LLMs annotate 15,856 SEC documents. Delegation arc complete.",
  "Bike rider. The best debugging happens two wheels and zero screens away from the code.",
  "Gamer. Years of boss fights turn out to be great training for production incidents.",
  "Watches anime. A lot of anime. \"Just one more episode\" is the only estimate I've ever missed.",
  "Builds merge tooling (Preflight) because reviewing unverified AI code once was one time too many.",
  "Runs terminals with green phosphor. Obviously.",
];
