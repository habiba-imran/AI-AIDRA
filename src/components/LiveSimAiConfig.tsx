import { useState } from 'react';
import { ChevronDown, SlidersHorizontal, Sparkles } from 'lucide-react';
import type { SimulationActions } from '../engine/simulationEngine';
import type { LocalSearch, MLModel, ObjectivePriority, SearchAlgorithm } from '../types';

const SEARCH_OPTIONS: Array<{ label: string; value: SearchAlgorithm }> = [
  { label: 'BFS', value: 'BFS' },
  { label: 'DFS', value: 'DFS' },
  { label: 'Greedy Best-First', value: 'Greedy' },
  { label: 'A* ⭐', value: 'Astar' },
];

const LOCAL_SEARCH_OPTIONS: Array<{ label: string; value: LocalSearch }> = [
  { label: 'Hill Climbing', value: 'HillClimbing' },
  { label: 'Simulated Annealing', value: 'SimulatedAnnealing' },
];

const ML_OPTIONS: Array<{ label: string; value: MLModel }> = [
  { label: 'kNN', value: 'kNN' },
  { label: 'Naive Bayes', value: 'NaiveBayes' },
  { label: 'MLP', value: 'MLP' },
];

const OBJECTIVE_OPTIONS: Array<{ label: string; value: ObjectivePriority }> = [
  { label: 'Minimize Time', value: 'MinimizeTime' },
  { label: 'Minimize Risk', value: 'MinimizeRisk' },
  { label: 'Balanced', value: 'Balanced' },
];

const selectClass =
  'flex-1 min-w-0 h-8 px-2 text-[11px] bg-[#020817] border border-[#1e293b] rounded-lg text-[#f1f5f9] appearance-none cursor-pointer focus:outline-none focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6]/30';

/** Fixed label column so every row lines up (heading | control on one line). */
const labelClass =
  'w-[6.75rem] shrink-0 text-[9px] font-semibold uppercase tracking-[0.08em] text-[#64748b] leading-tight text-left';

const rowClass = 'flex min-h-8 items-center gap-2';

export interface LiveSimAiConfigProps {
  searchAlgorithm: SearchAlgorithm;
  localSearch: LocalSearch;
  mlModel: MLModel;
  objectivePriority: ObjectivePriority;
  fuzzyLogicEnabled: boolean;
  actions: Pick<
    SimulationActions,
    | 'setSearchAlgorithm'
    | 'setLocalSearch'
    | 'setMLModel'
    | 'setObjectivePriority'
    | 'toggleFuzzyLogic'
  >;
}

export default function LiveSimAiConfig({
  searchAlgorithm,
  localSearch,
  mlModel,
  objectivePriority,
  fuzzyLogicEnabled,
  actions,
}: LiveSimAiConfigProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="shrink-0 rounded-lg border border-[#1e293b]/80 bg-[#0a1020]/90 shadow-inner overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-2.5 py-2 text-left transition-colors hover:bg-[#1e293b]/40"
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-indigo-500/15 text-indigo-300">
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block text-[11px] font-semibold tracking-wide text-[#e2e8f0]">
              AI configuration
            </span>
            <span className="block truncate text-[9px] text-[#64748b]">
              Search · local search · ML · objective · fuzzy
            </span>
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-[#94a3b8] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>

      {open && (
        <div className="space-y-2 border-t border-[#1e293b]/80 bg-[#060a14]/60 px-2.5 py-2.5">
          <div className={rowClass}>
            <label className={labelClass} htmlFor="live-sim-search">
              Path search
            </label>
            <select
              id="live-sim-search"
              className={selectClass}
              value={searchAlgorithm}
              onChange={(e) => actions.setSearchAlgorithm(e.target.value as SearchAlgorithm)}
            >
              {SEARCH_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className={rowClass}>
            <label className={labelClass} htmlFor="live-sim-local">
              Local search
            </label>
            <select
              id="live-sim-local"
              className={selectClass}
              value={localSearch}
              onChange={(e) => actions.setLocalSearch(e.target.value as LocalSearch)}
            >
              {LOCAL_SEARCH_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className={rowClass}>
            <label className={labelClass} htmlFor="live-sim-ml">
              ML model
            </label>
            <select
              id="live-sim-ml"
              className={selectClass}
              value={mlModel}
              onChange={(e) => actions.setMLModel(e.target.value as MLModel)}
            >
              {ML_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className={rowClass}>
            <label className={labelClass} htmlFor="live-sim-obj">
              Objective
            </label>
            <select
              id="live-sim-obj"
              className={selectClass}
              value={objectivePriority}
              onChange={(e) => actions.setObjectivePriority(e.target.value as ObjectivePriority)}
            >
              {OBJECTIVE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className={`${rowClass} rounded-md border border-[#1e293b]/80 bg-[#0f172a]/80 px-2 -mx-0.5`}>
            <span className={`${labelClass} flex items-center gap-1.5 normal-case`}>
              <Sparkles className="h-3 w-3 shrink-0 text-purple-400" aria-hidden />
              Fuzzy
            </span>
            <div className="flex min-w-0 flex-1 justify-end">
              <button
                type="button"
                onClick={actions.toggleFuzzyLogic}
                className={`relative h-6 w-11 shrink-0 rounded-full border border-[#334155] transition-colors ${
                  fuzzyLogicEnabled ? 'bg-[#3b82f6]' : 'bg-[#334155]'
                }`}
                aria-pressed={fuzzyLogicEnabled}
                aria-label={fuzzyLogicEnabled ? 'Disable fuzzy routing' : 'Enable fuzzy routing'}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-[#f8fafc] shadow transition-all ${
                    fuzzyLogicEnabled ? 'right-0.5' : 'left-0.5'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
