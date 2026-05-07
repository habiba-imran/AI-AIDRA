import { useState } from 'react';
import { Zap, Construction, UserPlus, Flame, Sparkles, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import type { SimulationActions } from '../engine/simulationEngine';
import type { LocalSearch, MLModel, ObjectivePriority, SearchAlgorithm, SimulationState } from '../types';

const sectionHeaderClass =
  'text-[10px] font-medium uppercase tracking-[0.08em] text-[#64748b] mb-1.5 mt-0';

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className={sectionHeaderClass}>{children}</div>;
}

function ambStatusUi(status: SimulationState['ambulances'][0]['status']): 'EN ROUTE' | 'IDLE' {
  if (status === 'idle') return 'IDLE';
  return 'EN ROUTE';
}

function teamStatusUi(status: SimulationState['rescueTeam']['status']): string {
  if (status === 'idle') return 'IDLE';
  return 'ACTIVE';
}

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

interface LeftPanelProps {
  state: SimulationState;
  actions: SimulationActions;
}

function parseGridCoord(text: string): number | null {
  const t = text.trim();
  if (t === '') return null;
  const n = Number(t);
  if (!Number.isFinite(n)) return null;
  const i = Math.trunc(n);
  if (i < 0 || i > 17) return null;
  return i;
}

export default function LeftPanel({ state, actions }: LeftPanelProps) {
  const { ambulances, rescueTeam, searchAlgorithm, localSearch, mlModel, objectivePriority, fuzzyLogicEnabled } = state;
  const [actionRow, setActionRow] = useState('10');
  const [actionCol, setActionCol] = useState('10');
  const [aiConfigOpen, setAiConfigOpen] = useState(false);

  const coordInputClass =
    'min-w-0 h-8 px-2 bg-[#020817] border border-[#1e293b]/80 rounded text-[13px] text-[#f1f5f9] focus:outline-none focus:border-[#3b82f6]';

  const selectClass =
    'w-full min-w-0 h-7 px-2 py-1 text-[12px] bg-[#020817] border border-[#1e293b]/80 rounded appearance-none cursor-pointer focus:outline-none focus:border-[#3b82f6]';

  const runWithCoords = (rowText: string, colText: string, action: (row: number, col: number) => void) => {
    const row = parseGridCoord(rowText);
    const col = parseGridCoord(colText);
    if (row === null || col === null) return;
    action(row, col);
  };

  return (
    <div className="w-[clamp(180px,16vw,212px)] shrink-0 h-full min-h-0 flex flex-col bg-[#0f172a] border border-[#1e293b]/80 rounded-lg overflow-hidden">
      {/* Top: Grid Actions + Resources (scroll only if very short viewport) */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-2 pt-2 pb-1.5 space-y-1.5">
        <div>
          <SectionLabel>Simulation controls</SectionLabel>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              min={0}
              max={17}
              value={actionRow}
              onChange={(e) => setActionRow(e.target.value)}
              className={coordInputClass}
              placeholder="r"
            />
            <input
              type="number"
              min={0}
              max={17}
              value={actionCol}
              onChange={(e) => setActionCol(e.target.value)}
              className={coordInputClass}
              placeholder="c"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <button
              type="button"
              className="h-[30px] flex items-center justify-center gap-1 rounded border border-red-500/50 bg-[#7f1d1d]/80 text-red-200 text-[12px] font-medium hover:bg-[#991b1b] cursor-pointer"
              onClick={() => runWithCoords(actionRow, actionCol, actions.triggerAfterShock)}
            >
              <Zap className="w-3.5 h-3.5 shrink-0" /> Shock
            </button>
            <button
              type="button"
              className="h-[30px] flex items-center justify-center gap-1 rounded border border-orange-500/50 text-orange-400 text-[12px] font-medium hover:bg-orange-500/10 cursor-pointer"
              onClick={() => runWithCoords(actionRow, actionCol, actions.blockRoadAt)}
            >
              <Construction className="w-3.5 h-3.5 shrink-0" /> Block
            </button>
            <button
              type="button"
              className="h-[30px] flex items-center justify-center gap-1 rounded border border-purple-500/50 text-purple-400 text-[12px] font-medium hover:bg-purple-500/10 cursor-pointer"
              onClick={() => runWithCoords(actionRow, actionCol, actions.addVictimAt)}
            >
              <UserPlus className="w-3.5 h-3.5 shrink-0" /> Victim
            </button>
            <button
              type="button"
              className="h-[30px] flex items-center justify-center gap-1 rounded bg-gradient-to-r from-red-600 to-orange-600 text-[#f1f5f9] text-[12px] font-medium hover:from-red-500 hover:to-orange-500 cursor-pointer"
              onClick={() => runWithCoords(actionRow, actionCol, actions.spreadFireFrom)}
            >
              <Flame className="w-3.5 h-3.5 shrink-0" /> Fire
            </button>
          </div>
        </div>

        <div>
          <SectionLabel>Resources</SectionLabel>
          <div className="space-y-1">
            {ambulances.map((amb) => {
              const uiStatus = ambStatusUi(amb.status);
              const victimCount = amb.assignedVictims.length;
              const assignedLabel =
                victimCount === 0 ? 'Standby at BASE' : amb.assignedVictims.join(', ');
              const etaLabel = amb.eta === null ? '—' : `${amb.eta} min`;
              return (
                <div
                  key={amb.id}
                  className={`rounded border border-[#1e293b]/80 py-2 px-2.5 ${
                    uiStatus === 'EN ROUTE' ? 'border-l-2 border-l-[#3b82f6]' : 'border-l-2 border-l-amber-500/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <div className="flex items-center gap-1 min-w-0 text-[12px] font-medium text-[#f1f5f9] truncate">
                      <span className="shrink-0">🚑</span>
                      <span className="truncate">{amb.label}</span>
                    </div>
                    <span
                      className={`text-[10px] font-medium px-2 py-1 rounded-full shrink-0 ${
                        uiStatus === 'EN ROUTE'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-amber-500/20 text-amber-400'
                      }`}
                    >
                      {uiStatus}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-[#64748b] mb-0.5">
                    <span>
                      Victims {victimCount}/{amb.capacity}
                    </span>
                  </div>
                  <div className="w-full h-1 bg-[#1e293b] rounded-full overflow-hidden mb-0.5">
                    <div
                      className="h-full bg-[#3b82f6] rounded-full transition-all"
                      style={{ width: `${(victimCount / amb.capacity) * 100}%` }}
                    />
                  </div>
                  <div
                    className={`text-[11px] leading-tight truncate ${
                      uiStatus === 'EN ROUTE' ? 'text-red-400' : 'text-[#64748b]'
                    }`}
                  >
                    → {assignedLabel}
                  </div>
                  {uiStatus === 'EN ROUTE' && (
                    <div className="text-[11px] text-green-400 mt-0.5">ETA MC1: {etaLabel}</div>
                  )}
                </div>
              );
            })}

            <div className="rounded border border-[#1e293b]/80 border-l-2 border-l-amber-500/50 py-2 px-2.5">
              <div className="flex items-center justify-between gap-1 mb-0.5">
                <div className="flex items-center gap-1 min-w-0 text-[12px] font-medium text-[#f1f5f9] truncate">
                  <span className="shrink-0">👷</span>
                  <span className="truncate">{rescueTeam.label}</span>
                </div>
                <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-green-500/20 text-green-400 shrink-0">
                  {teamStatusUi(rescueTeam.status)}
                </span>
              </div>
              <div className="text-[11px] text-amber-400 truncate">→ {rescueTeam.assignedVictim ?? '—'}</div>
              <div className="text-[11px] text-green-400">ETA {rescueTeam.eta === null ? '—' : `${rescueTeam.eta}m`}</div>
            </div>

            <div className="flex items-center gap-2 rounded border border-[#1e293b]/80 py-2 px-2.5">
              <span className="text-[12px] font-medium text-[#f1f5f9] shrink-0">🧰 Kits</span>
              <span className="text-[12px] text-green-400 font-medium shrink-0">10/10</span>
              <div className="flex-1 min-w-0 h-2 bg-[#1e293b] rounded-full overflow-hidden">
                <div className="h-full bg-[#22c55e] rounded-full" style={{ width: '100%' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom dropdown: AI Configuration */}
      <div className="shrink-0 border-t border-[#1e293b]/80 px-2 py-1.5 relative">
        <button
          type="button"
          onClick={() => setAiConfigOpen((v) => !v)}
          className="w-full flex items-center justify-between text-left"
        >
          <div className={sectionHeaderClass}>AI Configuration</div>
          {aiConfigOpen ? (
            <ChevronUp className="w-4 h-4 text-[#94a3b8]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[#94a3b8]" />
          )}
        </button>
        {aiConfigOpen && (
          <div className="absolute left-2.5 right-2.5 bottom-full mb-2 z-20 card-glass border border-[#1e293b]/80 rounded-md p-2 grid grid-cols-[minmax(0,0.95fr)_minmax(0,1.4fr)] gap-x-2 gap-y-1.5 items-center">
          <label className="text-[11px] text-[#64748b]">Search</label>
          <select
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

          <label className="text-[11px] text-[#64748b]">Local search</label>
          <select
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

          <label className="text-[11px] text-[#64748b]">ML model</label>
          <select
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

          <label className="text-[11px] text-[#64748b]">Objective</label>
          <select
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

          <label className="text-[11px] text-[#64748b] flex items-center gap-1 min-w-0">
            <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            Fuzzy
          </label>
          <div className="flex justify-end items-center">
            <button
              type="button"
              onClick={actions.toggleFuzzyLogic}
              className={`relative w-9 h-5 rounded-full border border-[#1e293b]/80 cursor-pointer ${
                fuzzyLogicEnabled ? 'bg-[#3b82f6]' : 'bg-[#334155]'
              }`}
              aria-pressed={fuzzyLogicEnabled}
            >
              <span
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-[#f1f5f9] transition-all ${
                  fuzzyLogicEnabled ? 'right-0.5' : 'left-0.5'
                }`}
              />
            </button>
          </div>
          </div>
        )}
      </div>

      {/* Bottom: Replan pinned */}
      <div className="shrink-0 border-t border-[#1e293b]/80 p-2 pt-2">
        <button
          type="button"
          onClick={actions.applyAndReplan}
          className="w-full h-[38px] flex items-center justify-center gap-2 rounded-md text-[13px] font-medium bg-gradient-to-r from-[#3b82f6] to-[#6366f1] text-[#f1f5f9] hover:from-[#2563eb] hover:to-[#4f46e5] cursor-pointer"
        >
          <Settings className="w-4 h-4" /> Replan
        </button>
      </div>
    </div>
  );
}
