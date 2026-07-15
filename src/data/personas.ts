export type PersonaKey =
  | "recruiter"
  | "developer"
  | "stalker"
  | "haters"
  | "professionals";

export interface Persona {
  key: PersonaKey;
  user: string; // shown in the shell prompt
  tagline: string; // shown by `ls`
  welcome: string[];
  special: { name: string; description: string };
}

export const PERSONAS: Record<PersonaKey, Persona> = {
  recruiter: {
    key: "recruiter",
    user: "recruiter",
    tagline: "hiring? start here — metrics, impact, availability",
    welcome: [
      "Welcome, recruiter. No 6-page PDF here — just numbers and shipped systems.",
      "TL;DR: Data Scientist @ UIUC research services, M.S. May 2026, production AI + data engineering.",
    ],
    special: {
      name: "/why-hire-me",
      description: "the 30-second pitch",
    },
  },
  developer: {
    key: "developer",
    user: "dev",
    tagline: "for engineers — stacks, architectures, tradeoffs",
    welcome: [
      "Hey, fellow builder. This folder has the tech-heavy cuts: orchestration graphs, ingest paths, eval design.",
      "Everything here ran somewhere real — no tutorial repos.",
    ],
    special: {
      name: "/stack",
      description: "the full toolchain, layer by layer",
    },
  },
  stalker: {
    key: "stalker",
    user: "stalker",
    tagline: "doing a deep dive? saves you 12 open tabs",
    welcome: [
      "Ah, a thorough researcher. Respect. Everything public in one place — no login walls.",
      "Tip: /funfacts has the stuff LinkedIn doesn't know.",
    ],
    special: {
      name: "/funfacts",
      description: "things the resume left out",
    },
  },
  haters: {
    key: "haters",
    user: "hater",
    tagline: "come to judge? bold. proceed",
    welcome: [
      "Oh, you found the haters folder. On purpose. Interesting choice.",
      "Every command in here still works. The facts don't care.",
    ],
    special: {
      name: "/roast",
      description: "I roast myself before you can",
    },
  },
  professionals: {
    key: "professionals",
    user: "colleague",
    tagline: "peers & collaborators — research, talks, projects",
    welcome: [
      "Welcome, colleague. Open to collaborations on agent evaluation, RAG systems, and data platforms.",
      "Current research direction: early-termination policies for SWE-agent trajectories under bounded budgets.",
    ],
    special: {
      name: "/collaborate",
      description: "what I'd like to build with you",
    },
  },
};

export const PERSONA_KEYS = Object.keys(PERSONAS) as PersonaKey[];
