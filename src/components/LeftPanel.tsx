import { useState } from 'react';
import { Zap, Construction, Flame } from 'lucide-react';
import type { SimulationActions } from '../engine/simulationEngine';
import type { SimulationState } from '../types';

const sectionHeaderClass =
  'text-[10px] font-medium uppercase tracking-[0.08em] text-[#64748b] mb-1.5 mt-0';

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className={sectionHeaderClass}>{children}</div>;
}

type AmbUiStatus = 'EN ROUTE' | 'IDLE' | 'STRANDED';
type TeamUiStatus = 'RIDING' | 'STANDBY' | 'STRANDED';

function ambStatusUi(status: SimulationState['ambulances'][0]['status']): AmbUiStatus {
  if (status === 'idle') return 'IDLE';
  if (status === 'stranded') return 'STRANDED';
  return 'EN ROUTE';
}

function teamStatusUi(team: SimulationState['rescueTeam']): TeamUiStatus {
  if (team.status === 'stranded') return 'STRANDED';
  if (team.ridesWith != null) return 'RIDING';
  return 'STANDBY';
}

interface LeftPanelProps {
  state: SimulationState;
  actions: SimulationActions;
  /** When set, panel sits inside the live-sim sidebar scroll area (no outer chrome). */
  variant?: 'standalone' | 'embedded';
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

export default function LeftPanel({ state, actions, variant = 'standalone' }: LeftPanelProps) {
  const embedded = variant === 'embedded';
  const { ambulances, rescueTeam } = state;
  const [actionRow, setActionRow] = useState('10');
  const [actionCol, setActionCol] = useState('10');

  const coordInputClass =
    'min-w-0 h-8 px-2 bg-[#020817] border border-[#1e293b]/80 rounded text-[13px] text-[#f1f5f9] focus:outline-none focus:border-[#3b82f6]';

  const runWithCoords = (rowText: string, colText: string, action: (row: number, col: number) => void) => {
    const row = parseGridCoord(rowText);
    const col = parseGridCoord(colText);
    if (row === null || col === null) return;
    action(row, col);
  };

  const outerClass = embedded
    ? 'flex w-full min-h-0 min-w-0 flex-col bg-transparent'
    : 'w-[clamp(180px,16vw,212px)] shrink-0 h-full min-h-0 flex flex-col bg-[#0f172a] border border-[#1e293b]/80 rounded-lg overflow-hidden';

  const scrollClass = embedded
    ? 'overflow-x-hidden px-2 pt-2 pb-2 space-y-1.5'
    : 'flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-2 pt-2 pb-1.5 space-y-1.5';

  return (
    <div className={outerClass}>
      <div className={scrollClass}>
        <div className="space-y-1.5">
          <div className="flex items-center gap-1 min-w-0">
            <span className="text-[7px] font-semibold uppercase tracking-[0.06em] text-[#64748b] leading-snug shrink-0 w-[3.5rem] select-none">
              Simulation controls
            </span>
            <input
              type="number"
              min={0}
              max={17}
              value={actionRow}
              onChange={(e) => setActionRow(e.target.value)}
              className={`${coordInputClass} flex-1 min-w-0 h-8 px-1.5 text-center text-[13px]`}
              placeholder="r"
              aria-label="Row"
            />
            <input
              type="number"
              min={0}
              max={17}
              value={actionCol}
              onChange={(e) => setActionCol(e.target.value)}
              className={`${coordInputClass} flex-1 min-w-0 h-8 px-1.5 text-center text-[13px]`}
              placeholder="c"
              aria-label="Column"
            />
          </div>
          <div className="grid grid-cols-3 gap-1">
            <button
              type="button"
              className="min-h-[30px] h-[30px] flex items-center justify-center gap-0.5 rounded border border-red-500/50 bg-[#7f1d1d]/80 text-red-200 text-[10px] font-medium hover:bg-[#991b1b] cursor-pointer px-0.5"
              onClick={() => runWithCoords(actionRow, actionCol, actions.triggerAfterShock)}
            >
              <Zap className="w-3 h-3 shrink-0" /> Shock
            </button>
            <button
              type="button"
              className="min-h-[30px] h-[30px] flex items-center justify-center gap-0.5 rounded border border-orange-500/50 text-orange-400 text-[10px] font-medium hover:bg-orange-500/10 cursor-pointer px-0.5"
              onClick={() => runWithCoords(actionRow, actionCol, actions.blockRoadAt)}
            >
              <Construction className="w-3 h-3 shrink-0" /> Block
            </button>
            <button
              type="button"
              className="min-h-[30px] h-[30px] flex items-center justify-center gap-0.5 rounded bg-gradient-to-r from-red-600 to-orange-600 text-[#f1f5f9] text-[10px] font-medium hover:from-red-500 hover:to-orange-500 cursor-pointer px-0.5"
              onClick={() => runWithCoords(actionRow, actionCol, actions.spreadFireFrom)}
            >
              <Flame className="w-3 h-3 shrink-0" /> Fire
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
              const accentClass =
                uiStatus === 'EN ROUTE'
                  ? 'border-l-2 border-l-[#3b82f6]'
                  : uiStatus === 'STRANDED'
                    ? 'border-l-2 border-l-red-500'
                    : 'border-l-2 border-l-amber-500/50';
              const badgeClass =
                uiStatus === 'EN ROUTE'
                  ? 'bg-green-500/20 text-green-400'
                  : uiStatus === 'STRANDED'
                    ? 'bg-red-500/25 text-red-300'
                    : 'bg-amber-500/20 text-amber-400';
              const trailingLabel =
                uiStatus === 'STRANDED' ? 'Out of service — no path to MC' : assignedLabel;
              return (
                <div
                  key={amb.id}
                  className={`rounded border border-[#1e293b]/80 py-2 px-2.5 ${accentClass}`}
                >
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <div className="flex items-center gap-1 min-w-0 text-[12px] font-medium text-[#f1f5f9] truncate">
                      <span className="shrink-0">🚑</span>
                      <span className="truncate">{amb.label}</span>
                    </div>
                    <span
                      className={`text-[10px] font-medium px-2 py-1 rounded-full shrink-0 ${badgeClass}`}
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
                      uiStatus === 'EN ROUTE'
                        ? 'text-red-400'
                        : uiStatus === 'STRANDED'
                          ? 'text-red-300'
                          : 'text-[#64748b]'
                    }`}
                  >
                    → {trailingLabel}
                  </div>
                  {uiStatus === 'EN ROUTE' && (
                    <div className="text-[11px] text-green-400 mt-0.5">ETA MC: {etaLabel}</div>
                  )}
                </div>
              );
            })}

            {(() => {
              const teamUi = teamStatusUi(rescueTeam);
              const teamAccent =
                teamUi === 'RIDING'
                  ? 'border-l-purple-500'
                  : teamUi === 'STRANDED'
                    ? 'border-l-red-500'
                    : 'border-l-amber-500/50';
              const teamBadge =
                teamUi === 'RIDING'
                  ? 'bg-purple-500/25 text-purple-300'
                  : teamUi === 'STRANDED'
                    ? 'bg-red-500/25 text-red-300'
                    : 'bg-amber-500/20 text-amber-400';
              const teamLine =
                teamUi === 'RIDING'
                  ? `Riding with ${rescueTeam.ridesWith} (½ decay for passengers)`
                  : teamUi === 'STRANDED'
                    ? 'Stranded with host ambulance'
                    : 'Standby — no active ambulance to host';
              return (
                <div className={`rounded border border-[#1e293b]/80 border-l-2 ${teamAccent} py-2 px-2.5`}>
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <div className="flex items-center gap-1 min-w-0 text-[12px] font-medium text-[#f1f5f9] truncate">
                      <span className="shrink-0">👷</span>
                      <span className="truncate">{rescueTeam.label}</span>
                    </div>
                    <span className={`text-[10px] font-medium px-2 py-1 rounded-full shrink-0 ${teamBadge}`}>
                      {teamUi}
                    </span>
                  </div>
                  <div className="text-[11px] text-purple-300 leading-snug">
                    {teamLine}
                  </div>
                  {teamUi === 'RIDING' && (
                    <div className="text-[10px] text-[#94a3b8] mt-0.5">
                      Position mirrors {rescueTeam.ridesWith} on the map
                    </div>
                  )}
                </div>
              );
            })()}

            {(() => {
              /**
               * Kits widget reflects live `kitsRemaining / kitsBudget`. Bar color shifts as
               * supply runs low so the user can see the global hard constraint approaching:
               * green ≥ 50%, amber ≥ 20%, red below that. At 0 the panel turns red and the
               * CSP can no longer assign anyone — they all fall into the wait queue.
               */
              const used = state.kitsBudget - state.kitsRemaining;
              const fillPct = Math.max(
                0,
                Math.min(100, (state.kitsRemaining / state.kitsBudget) * 100)
              );
              const ratio = state.kitsRemaining / state.kitsBudget;
              const barColor =
                ratio >= 0.5
                  ? 'bg-[#22c55e]'
                  : ratio >= 0.2
                  ? 'bg-amber-400'
                  : 'bg-red-500';
              const textColor =
                ratio >= 0.5
                  ? 'text-green-400'
                  : ratio >= 0.2
                  ? 'text-amber-300'
                  : 'text-red-400';
              return (
                <div className="flex items-center gap-2 rounded border border-[#1e293b]/80 py-2 px-2.5">
                  <span className="text-[12px] font-medium text-[#f1f5f9] shrink-0">🧰 Kits</span>
                  <span className={`text-[12px] font-medium shrink-0 ${textColor}`}>
                    {state.kitsRemaining}/{state.kitsBudget}
                  </span>
                  <div className="flex-1 min-w-0 h-2 bg-[#1e293b] rounded-full overflow-hidden">
                    <div
                      className={`h-full ${barColor} rounded-full transition-all duration-300`}
                      style={{ width: `${fillPct}%` }}
                    />
                  </div>
                  {used > 0 && (
                    <span className="text-[10px] text-[#94a3b8] font-mono-display shrink-0">
                      {used} used
                    </span>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
