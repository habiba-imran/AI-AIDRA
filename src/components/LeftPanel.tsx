import { Play, Pause, RotateCcw, Zap, Construction, UserPlus, Flame, Sparkles, Settings } from 'lucide-react';
import type { SimulationActions } from '../engine/simulationEngine';
import type {
  LocalSearch,
  MLModel,
  ObjectivePriority,
  SearchAlgorithm,
  SimSpeed,
  SimulationState,
} from '../types';

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[9px] font-semibold tracking-[0.12em] text-[#3b82f6] uppercase mb-1.5 mt-0.5">
      {children}
    </div>
  );
}

function SimButton({
  children,
  variant,
  onClick,
}: {
  children: React.ReactNode;
  variant: 'green' | 'amber' | 'slate' | 'red-pulse' | 'orange' | 'purple' | 'red-gradient' | 'blue-gradient';
  onClick?: () => void;
}) {
  const base = 'w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] font-medium transition-all duration-200 cursor-pointer';
  const variants: Record<string, string> = {
    'green': 'bg-[#22c55e] text-[#f1f5f9] glow-green hover:bg-[#16a34a]',
    'amber': 'bg-[#f59e0b] text-[#020817] glow-amber hover:bg-[#d97706]',
    'slate': 'bg-transparent border border-[#334155] text-[#94a3b8] hover:bg-[#1e293b] hover:text-[#f1f5f9]',
    'red-pulse': 'bg-[#7f1d1d] text-red-300 border border-red-500/50 animate-pulse-red hover:bg-[#991b1b]',
    'orange': 'bg-transparent border border-orange-500/50 text-orange-400 hover:bg-orange-500/10',
    'purple': 'bg-transparent border border-purple-500/50 text-purple-400 hover:bg-purple-500/10',
    'red-gradient': 'bg-gradient-to-r from-red-600 to-orange-600 text-[#f1f5f9] hover:from-red-500 hover:to-orange-500',
    'blue-gradient': 'bg-gradient-to-r from-[#3b82f6] to-[#6366f1] text-[#f1f5f9] glow-blue hover:from-[#2563eb] hover:to-[#4f46e5]',
  };
  return (
    <button type="button" className={`${base} ${variants[variant]}`} onClick={onClick}>
      {children}
    </button>
  );
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
  { label: 'A* \u2B50', value: 'Astar' },
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

export default function LeftPanel({ state, actions }: LeftPanelProps) {
  const { ambulances, rescueTeam, speed, searchAlgorithm, localSearch, mlModel, objectivePriority, fuzzyLogicEnabled } =
    state;

  const iconSm = 'w-3.5 h-3.5 shrink-0';

  return (
    <div
      className="w-[236px] shrink-0 h-full min-h-0 bg-[#0f172a] border-r border-[#1e293b] overflow-y-auto overscroll-contain p-2 space-y-2"
      style={{ boxShadow: 'inset 4px 0 12px -6px rgba(59,130,246,0.12)' }}
    >
      {/* Simulation Controls */}
      <div>
        <SectionLabel>Simulation Controls</SectionLabel>
        <div className="space-y-1">
          <SimButton variant="green" onClick={actions.startSimulation}><Play className={iconSm} /> Start</SimButton>
          <SimButton variant="amber" onClick={actions.pauseSimulation}><Pause className={iconSm} /> Pause</SimButton>
          <SimButton variant="slate" onClick={actions.resetSimulation}><RotateCcw className={iconSm} /> Reset</SimButton>
        </div>
        <div className="border-t border-[#1e293b] my-2" />
        <div className="space-y-1">
          <SimButton variant="red-pulse" onClick={actions.triggerAfterShock}><Zap className={iconSm} /> Aftershock</SimButton>
          <SimButton variant="orange" onClick={actions.blockRandomRoad}><Construction className={iconSm} /> Block road</SimButton>
          <SimButton variant="purple" onClick={actions.addNewVictim}><UserPlus className={iconSm} /> Add victim</SimButton>
          <SimButton variant="red-gradient" onClick={actions.spreadFireZone}><Flame className={iconSm} /> Spread fire</SimButton>
        </div>
      </div>

      {/* Resource Status — above AI config so it stays visible without scrolling */}
      <div>
        <SectionLabel>Resources</SectionLabel>
        <div className="space-y-1.5">
          {ambulances.map((amb) => {
            const uiStatus = ambStatusUi(amb.status);
            const victimCount = amb.assignedVictims.length;
            const assignedLabel =
              victimCount === 0
                ? 'Standby at BASE'
                : amb.assignedVictims.join(', ');
            const etaLabel = amb.eta === null ? '—' : `${amb.eta} min`;
            return (
            <div key={amb.id} className={`card-glass p-2 rounded-md ${uiStatus === 'EN ROUTE' ? 'border-glow-left-blue' : 'border-glow-left-amber'}`}>
              <div className="flex items-center justify-between gap-1 mb-1">
                <div className="flex items-center gap-1 min-w-0">
                  <span className="text-[11px] shrink-0">🚑</span>
                  <span className="text-[10px] font-medium text-[#f1f5f9] truncate">{amb.label}</span>
                </div>
                <span className={`text-[8px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${
                  uiStatus === 'EN ROUTE'
                    ? 'bg-green-500/20 text-green-400 badge-glow-green'
                    : 'bg-amber-500/20 text-amber-400 badge-glow-amber'
                }`}>
                  {uiStatus}
                </span>
              </div>
              <div className="mb-0.5">
                <div className="flex items-center justify-between text-[9px] text-[#94a3b8] mb-0.5">
                  <span>Victims {victimCount}/{amb.capacity}</span>
                </div>
                <div className="w-full h-1 bg-[#1e293b] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#3b82f6] rounded-full transition-all"
                    style={{ width: `${(victimCount / amb.capacity) * 100}%` }}
                  />
                </div>
              </div>
              <div className={`text-[9px] leading-tight truncate ${uiStatus === 'EN ROUTE' ? 'text-red-400' : 'text-[#64748b]'}`}>
                → {assignedLabel}
              </div>
              {uiStatus === 'EN ROUTE' && (
                <div className="text-[9px] text-green-400 mt-0.5">
                  ETA MC1: {etaLabel}
                </div>
              )}
            </div>
            );
          })}

          <div className="card-glass p-2 rounded-md border-glow-left-amber">
            <div className="flex items-center justify-between gap-1 mb-0.5">
              <div className="flex items-center gap-1 min-w-0">
                <span className="text-[11px] shrink-0">👷</span>
                <span className="text-[10px] font-medium text-[#f1f5f9] truncate">{rescueTeam.label}</span>
              </div>
              <span className="text-[8px] font-semibold px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400 badge-glow-green shrink-0">
                {teamStatusUi(rescueTeam.status)}
              </span>
            </div>
            <div className="text-[9px] text-amber-400 truncate">→ {rescueTeam.assignedVictim ?? '—'}</div>
            <div className="text-[9px] text-green-400">ETA {rescueTeam.eta === null ? '—' : `${rescueTeam.eta}m`}</div>
          </div>

          <div className="card-glass p-2 rounded-md">
            <div className="flex items-center justify-between mb-0.5">
              <div className="flex items-center gap-1">
                <span className="text-[11px]">🧰</span>
                <span className="text-[10px] font-medium text-[#f1f5f9]">Kits</span>
              </div>
              <span className="text-[10px] text-green-400 font-medium">7/10</span>
            </div>
            <div className="w-full h-1 bg-[#1e293b] rounded-full overflow-hidden">
              <div className="h-full bg-[#22c55e] rounded-full" style={{ width: '70%' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Sim Speed */}
      <div>
        <SectionLabel>Sim Speed</SectionLabel>
        <div className="flex gap-0.5">
          {(['Slow', 'Normal', 'Fast'] as SimSpeed[]).map((sp) => {
            const short = sp === 'Normal' ? 'Norm' : sp === 'Slow' ? 'Slow' : 'Fast';
            return (
            <button
              type="button"
              key={sp}
              title={sp}
              onClick={() => actions.setSpeed(sp)}
              className={`flex-1 py-1 rounded-md text-[9px] font-medium transition-all cursor-pointer leading-none ${
                speed === sp
                  ? 'bg-[#3b82f6] text-[#f1f5f9] glow-blue'
                  : 'bg-transparent border border-[#334155] text-[#94a3b8] hover:bg-[#1e293b]'
              }`}
            >
              {speed === sp ? `${short}✓` : short}
            </button>
            );
          })}
        </div>
      </div>

      {/* Algorithm Settings */}
      <div>
        <SectionLabel>AI Configuration</SectionLabel>
        <div className="space-y-2">
          <div>
            <label className="text-[9px] text-[#94a3b8] mb-0.5 block">Search</label>
            <select
              className="w-full bg-[#020817] border border-[#1e293b] rounded-md px-2 py-1 text-[10px] text-[#f1f5f9] appearance-none cursor-pointer focus:outline-none focus:border-[#3b82f6] transition-colors"
              value={searchAlgorithm}
              onChange={(e) => actions.setSearchAlgorithm(e.target.value as SearchAlgorithm)}
            >
              {SEARCH_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[9px] text-[#94a3b8] mb-0.5 block">Local search</label>
            <select
              className="w-full bg-[#020817] border border-[#1e293b] rounded-md px-2 py-1 text-[10px] text-[#f1f5f9] appearance-none cursor-pointer focus:outline-none focus:border-[#3b82f6] transition-colors"
              value={localSearch}
              onChange={(e) => actions.setLocalSearch(e.target.value as LocalSearch)}
            >
              {LOCAL_SEARCH_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[9px] text-[#94a3b8] mb-0.5 block">ML model</label>
            <select
              className="w-full bg-[#020817] border border-[#1e293b] rounded-md px-2 py-1 text-[10px] text-[#f1f5f9] appearance-none cursor-pointer focus:outline-none focus:border-[#3b82f6] transition-colors"
              value={mlModel}
              onChange={(e) => actions.setMLModel(e.target.value as MLModel)}
            >
              {ML_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[9px] text-[#94a3b8] mb-0.5 block">Objective</label>
            <select
              className="w-full bg-[#020817] border border-[#1e293b] rounded-md px-2 py-1 text-[10px] text-[#f1f5f9] appearance-none cursor-pointer focus:outline-none focus:border-[#3b82f6] transition-colors"
              value={objectivePriority}
              onChange={(e) => actions.setObjectivePriority(e.target.value as ObjectivePriority)}
            >
              {OBJECTIVE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between py-0.5 cursor-pointer" onClick={actions.toggleFuzzyLogic}>
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-[10px] text-[#f1f5f9]">Fuzzy</span>
            </div>
            <div className={`w-8 h-4 rounded-full relative cursor-pointer ${fuzzyLogicEnabled ? 'bg-[#3b82f6] glow-blue' : 'bg-[#334155]'}`}>
              <div className={`absolute top-0.5 w-3 h-3 bg-[#f1f5f9] rounded-full transition-all ${fuzzyLogicEnabled ? 'right-0.5' : 'left-0.5'}`} />
            </div>
          </div>

          <SimButton variant="blue-gradient" onClick={actions.applyAndReplan}><Settings className={iconSm} /> Replan</SimButton>
        </div>
      </div>
    </div>
  );
}
