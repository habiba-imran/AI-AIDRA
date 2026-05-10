# AIDRA — Adaptive Intelligent Disaster Response Agent

> **Course:** AIC-201 · Artificial Intelligence — Complex Computing Problem (CCP)  
> **Instructor:** Dr. Arshad Farhad · **Semester:** 5-A  
> **Author:** Umm-e-Habiba Imran (01-134241-048)

A fully integrated hybrid AI simulation system for autonomous urban disaster triage, routing, and resource allocation under uncertainty. Built as a single-page React/TypeScript application with a real-time tick-driven simulation engine.

---

## 🔗 Links

| Resource | URL |
|----------|-----|
| 🌐 Deployed Demo | https://aidra-048.netlify.app/ |
| 🎥 LinkedIn Demo Video | https://shorturl.at/L2BfO |

---

## 🧠 AI Modules Integrated

| Module | Implementation | Purpose |
|--------|---------------|---------|
| **Search** | BFS, DFS, Greedy Best-First, A* | Multi-victim pathfinding with risk-weighted heuristics |
| **Local Search** | Hill Climbing, Simulated Annealing | Route refinement and escape from local optima |
| **CSP** | Backtracking + MRV + Forward Checking | Resource allocation under 6 hard constraints |
| **Machine Learning** | kNN, Gaussian Naive Bayes, MLP (8→16→3) | Victim risk classification feeding CSP priority ordering |
| **Fuzzy Logic** | Mamdani-style 4-rule inference system | Uncertainty-based modulation of search costs and CSP bumps |

All modules are **genuinely integrated** — ML predictions feed CSP variable ordering, fuzzy outputs scale search edge costs, and CSP solutions dispatch ambulance routes computed by A*.

---

## 🎮 Features

- **Live Grid Simulation** — 18×18 dynamic grid with fire zones, structural collapses, road blockages, and medical centers
- **Dynamic Replanning** — Aftershock, road block, fire spread, and new victim events trigger automatic route + CSP re-solve
- **Conflicting Objectives** — Toggle between Minimize Time, Minimize Risk, and Balanced routing strategies
- **ML Studio** — Train/evaluate 3 classifiers on synthetic 500-sample dataset with per-class P/R/F1, confusion matrix heatmaps, and CSV export
- **Search Trace** — Step-by-step visualization of all 4 search algorithms with trade-off analysis cards
- **Analytics Dashboard** — Live KPI time-series sparklines (survival decay, risk exposure, rescue progress), algorithm comparisons, and mission summary
- **Decision Log** — Timestamped, categorized log entries with full JSON export for reproducibility
- **Wave Dispatch** — Automatic CSP re-fire when ambulances return idle with victims still waiting
- **Medical Kit Budget** — Global consumable constraint (10 kits) enforced across all dispatch waves
- **Step Forward / Step Back** — Manual tick-by-tick simulation control with undo history

---

## 📊 KPIs Tracked

| KPI | Description |
|-----|-------------|
| Victims Saved | Count and percentage of rescued victims |
| Avg Rescue Time | Mean simulation seconds from start to pickup |
| Path Optimality | Ratio of best-known cost to selected route cost |
| Risk Exposure | Sum of cell risk values along all active routes |
| Resource Utilization | Percentage of active units at any given tick |
| Replan Count | Number of dynamic environment-triggered replans |
| ML Metrics | Per-model accuracy, precision, recall, F1, confusion matrix |

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript |
| Build | Vite 5 |
| Styling | Tailwind CSS |
| Icons | Lucide React |
| Charts | Custom SVG (no external chart library) |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** 18+ (LTS recommended)
- npm 9+

### Installation & Run

```bash
# Clone the repository
git clone <YOUR_GITHUB_REPO_URL>
cd AI-AIDRA

# Install dependencies
npm install

# Start development server
npm run dev
```

> ⚠️ Run from the `AI-AIDRA/` directory, not the parent folder.

### Available Commands

| Command | Purpose |
|---------|---------|
| `npm install` | Install dependencies |
| `npm run dev` | Vite dev server (http://localhost:5173) |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc --noEmit` type checking |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit tests |

---

## 📁 Project Structure

```
AI-AIDRA/
├── src/
│   ├── engine/               # Core AI modules
│   │   ├── search.ts         # BFS, DFS, Greedy, A* implementations
│   │   ├── localSearch.ts    # Hill Climbing, Simulated Annealing
│   │   ├── csp.ts            # CSP solver with MRV + Forward Checking
│   │   ├── mlRiskPipeline.ts # kNN, Naive Bayes, MLP training & inference
│   │   ├── fuzzyLogic.ts     # Mamdani fuzzy inference system
│   │   ├── simulationEngine.ts # Tick engine, state machine, replanning
│   │   └── gridGenerator.ts  # Grid, victim, and resource initialization
│   ├── components/           # React UI components
│   │   ├── CenterPanel.tsx   # Grid map visualization
│   │   ├── MlStudio.tsx      # ML training, evaluation, confusion matrices
│   │   ├── Analytics.tsx     # KPI charts, sparklines, mission summary
│   │   ├── SearchTrace.tsx   # Algorithm trace visualization
│   │   └── RightPanel.tsx    # Decision log, priority reasoning
│   ├── types/index.ts        # Complete TypeScript type definitions
│   └── utils/                # Formatters, analytics helpers, export
├── AIC201_Assignment3_Report.tex  # IEEE-format technical report
└── README.md
```

---

## 🔄 How It Works

1. **Simulation starts** → Grid generated with hazards, victims placed, ambulances at base
2. **ML inference** → Each victim's geographic features → risk class prediction (Low/Med/High)
3. **CSP solver** → Allocates victims to ambulances using MRV ordering (informed by ML scores)
4. **A* search** → Computes risk-weighted paths from base → victim → medical center
5. **Fuzzy logic** → Adjusts edge costs and CSP priority bumps based on environmental uncertainty
6. **Tick engine** → Moves ambulances along routes, decays victim survival, checks for rescues
7. **Dynamic events** → Aftershock/fire/block triggers replan → CSP re-solve → A* recompute
8. **Mission complete** → Summary generated when all victims resolved

---

## 📝 Implementation Phases

| Phase | Scope |
|-------|-------|
| 1 | Types, grid generator, simulation tick engine, KPIs, toast system |
| 2 | BFS/DFS/Greedy/A* search, local search, route rendering on grid |
| 3 | CSP formulation + backtracking with MRV/FC heuristics + UI |
| 4 | ML pipeline (kNN, NB, MLP) with CSP integration |
| 5 | Fuzzy logic routing weights → search costs + CSP ordering |
| 6 | Path optimality KPI, Analytics wired to live session data |
| 7 | Priority reasoning panel, log auto-scroll, victim status cards |
| 8 | Dynamic environment events with automatic replanning |
| 9 | KPI time-series sparklines, mission summary, confusion matrix heatmaps |

---

## 📋 CCP Rubric Alignment

- ✅ Multiple search strategies (BFS, DFS, Greedy, A*) + local search (HC, SA)
- ✅ CSP with backtracking, MRV, Forward Checking, and ablation comparison
- ✅ 3 ML models (kNN, NB, MLP) with per-class evaluation metrics and confusion matrices
- ✅ Fuzzy logic for uncertainty handling with logged rule firings
- ✅ Dynamic replanning on environment changes with timestamped decision log
- ✅ Conflicting objectives (time vs risk) with explicit trade-off justification
- ✅ KPI tracking: victims saved, avg rescue time, path optimality, risk exposure, resource util
- ✅ Time-series KPI charts (survival decay, risk curve, rescue progress)
- ✅ Mission summary auto-generated at run completion
- ✅ Full JSON export for reproducible analysis

---

## 📄 License

This project was developed as an academic assignment for AIC-201 at Bahria University, Islamabad.
