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

// Strict CSP for the production build (dev needs Vite's inline HMR client, so build only).
// GitHub Pages can't send headers, so it ships as a meta tag; frame-ancestors needs a real header.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join("; ");
function cspMeta(): Plugin {
  return {
    name: "csp-meta",
    apply: "build",
    transformIndexHtml: (html) =>
      html.replace("<head>", `<head>\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`),
  };
}

// Relative base so the same build works on GitHub Pages
// (/AIE-portfolio/) and on Vercel (/) without changes.
export default defineConfig({
  base: "./",
  plugins: [redactUncleared(), react(), cspMeta()],
  // Never inline fonts as data: URLs, so CSP can keep font-src 'self'.
  build: { assetsInlineLimit: (file) => (file.endsWith(".woff2") ? false : undefined) },
});
