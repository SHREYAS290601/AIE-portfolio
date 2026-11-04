import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

// Fail closed: facts not cleared and contacts not confirmed never reach the
// bundle. Approving one means flipping its flag in src/data/resume.json.
function redactUncleared(): Plugin {
  return {
    name: "redact-uncleared",
    enforce: "pre",
    transform(code, id) {
      if (!id.split("?")[0].endsWith("/src/data/resume.json")) return null;
      const data = JSON.parse(code);
      delete data.sources;
      for (const group of [...data.roles, ...data.projects]) {
        for (const fact of group.facts) {
          if (fact.clearance !== "public") fact.text = null;
          delete fact.sources;
          delete fact.details;
        }
      }
      for (const key of Object.keys(data.identity.contact)) {
        const c = data.identity.contact[key];
        data.identity.contact[key] = c.status === "confirmed" ? { value: c.value } : null;
      }
      for (const e of data.education) delete e.sources;
      for (const s of data.skills) delete s.sources;
      return { code: JSON.stringify(data), map: null };
    },
  };
}

// Relative base so the same build works on GitHub Pages
// (/AIE-portfolio/) and on Vercel (/) without changes.
export default defineConfig({
  base: "./",
  plugins: [redactUncleared(), react()],
});
