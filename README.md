# AdWorld

AdWorld is an interactive advertising decision simulator. It turns a campaign idea into a synthetic market, generates an experiment plan, runs simulated outcomes, and assembles a decision brief. A built-in demo uses fixed scenarios so you can explore the flow without an API key.

This is a prototype for exploring decisions, not a source of measured customer behavior or a substitute for a live experiment. Treat generated audiences, forecasts, and recommendations as hypotheses.

## Run locally

Requires Node.js and npm.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. The demo mode works without credentials.

## AI-assisted mode

The current Vite configuration injects `GEMINI_API_KEY` into the client bundle. Browser code and bundled values are visible to visitors, so **do not use a private or production key** with a public deployment. Move Gemini calls behind a server endpoint before enabling AI-assisted mode for other users.

## Project map

- `App.tsx` — the eight-phase interface and workflow.
- `geminiService.ts` — Gemini-backed generation.
- `simulationEngine.ts` — local simulation logic.
- `fixtures.ts` — fixed demo scenarios and outputs.
- `types.ts` — shared domain types.

## Build

```bash
npm run build
```
