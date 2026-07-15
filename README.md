# shreyas@portfolio:~$

Interactive terminal portfolio — a 90s CRT shell where visitors `cd` into a persona
folder (`recruiter/`, `developer/`, `stalker/`, `haters/`, `professionals/`) and explore
with Claude Code-style slash commands (`/experience`, `/skills`, `/projects`, ...).

Live: https://shreyas290601.github.io/AIE-portfolio/

## Stack

- Vite + React + TypeScript, no runtime dependencies beyond React
- Pure CSS CRT effects (scanlines, phosphor glow, green/amber themes)
- Deployed to GitHub Pages via GitHub Actions on every push to `main`

## Develop

```bash
npm install
npm run dev      # local dev server
npm run build    # type-check + production build to dist/
npm run preview  # serve the production build locally
```

## Content

All resume content lives in `src/data/resume.ts`; persona tone and welcome copy in
`src/data/personas.ts`; command behavior in `src/terminal/commands.tsx`. Edit those,
push, and the site redeploys.

## Hosting notes

The build uses a relative base (`base: "./"`), so the same `dist/` works on GitHub
Pages and on Vercel without changes. To move to Vercel: import the repo, framework
preset "Vite", done.
