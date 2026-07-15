import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Relative base so the same build works on GitHub Pages
// (/AIE-portfolio/) and on Vercel (/) without changes.
export default defineConfig({
  base: "./",
  plugins: [react()],
});
