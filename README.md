# AI-AIDRA

**Adaptive Intelligent Disaster Response Agent** — a course CCP demo: live grid simulation, multi-algorithm search, CSP resource allocation, ML risk estimates, fuzzy uncertainty on routing, dynamic replanning, and reporting.

[![Open in Bolt](https://bolt.new/static/open-in-bolt.svg)](https://bolt.new/~/sb1-3yfzmmn3)

## Requirements

- **Node.js** 18+ (LTS recommended)
- npm 9+

## Commands

Run from this directory (`AI-AIDRA/`), not the parent `AI FINAL` folder (the parent `package-lock.json` is not wired to an app).

| Command | Purpose |
|--------|---------|
| `npm install` | Install dependencies |
| `npm run dev` | Vite dev server |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc --noEmit` on app sources |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit tests (pure utils) |
| `npm run test:watch` | Vitest watch mode |

## Using the app

1. **Live Simulation** — Start the clock, trigger hazards (aftershock, block road, fire spread), add victims, change **objective** (time / risk / balanced), **Apply & Replan** when settings change.
2. **Search Trace** — Inspect BFS / DFS / Greedy / A* with optional fuzzy-weighted costs when fuzzy is enabled after a plan exists.
3. **CSP Solver** — Run allocation; compare heuristic ablation in **Analytics** after a solve.
4. **ML Studio** — Train/eval kNN, Gaussian Naive Bayes, and MLP; pick active model for CSP risk hints.
5. **Analytics** — Live bars when session data exists; benchmark rows remain as reference.
6. **Export** — In the right panel **Log** header, **Export** downloads a JSON snapshot (`aidra-run-<timestamp>.json`) with decision log, KPIs, objectives, and counters for your write-up.

## Implementation phases (high level)

| Phase | Scope |
|-------|--------|
| 1 | Types, grid generator, simulation tick, KPIs, toasts |
| 2 | BFS/DFS/Greedy/A*, local search, routes on map |
| 3 | CSP + backtracking heuristics + UI |
| 4 | ML pipeline, CSP informed by ML |
| 5 | Fuzzy routing weights → search + CSP ordering |
| 6 | Path optimality KPI, Analytics wired to live data |
| 7 | Live priority reasoning, log highlights latest entry |
| 8 | Environment events refresh routes when sim is running |
| 9 | README, Vitest, JSON export |

## Rubric alignment (quick checklist)

- Multiple search strategies + local search + CSP + **two+ ML models** + **fuzzy** uncertainty.
- **Replanning** on grid changes with logged **environment replan** when running; manual **Apply & Replan** for settings.
- **Traceability**: search trace, decision log, ML/fuzzy info lines, **Export JSON**.
- **KPIs**: victims saved, avg rescue time, path optimality vs peer algorithms, risk exposure, resource util, replan count, ML metrics in ML Studio.

## Stack

React 18, TypeScript, Vite, Tailwind CSS, Lucide icons.
