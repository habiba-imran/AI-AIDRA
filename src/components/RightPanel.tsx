import { useEffect, useMemo, useRef } from 'react';
import { X } from 'lucide-react';
import type { SimulationActions } from '../engine/simulationEngine';
import type { LogEntryType, SimulationState, Victim, VictimStatus } from '../types';
import {
  buildPriorityReasoning,
  formatSeverityUpper,
  severityAccentClass,
} from '../utils/priorityReasoning';
import { downloadRunSnapshot } from '../utils/exportRun';

function SectionLabel({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-1 mt-0.5">
      <div className="text-[11px] font-semibold tracking-[0.1em] text-[#3b82f6] uppercase">
        {children}
      </div>
      {action}
    </div>
  );
}

function SeverityBadge({ severity, compact }: { severity: string; compact?: boolean }) {
  const config: Record<string, { bg: string; text: string; glow: string; dot: string; short: string }> = {
    Critical: { bg: 'bg-red-500/20', text: 'text-red-400', glow: 'badge-glow-red', dot: '🔴', short: 'Crit' },
    Moderate: { bg: 'bg-amber-500/20', text: 'text-amber-400', glow: 'badge-glow-amber', dot: '🟡', short: 'Mod' },
    Minor: { bg: 'bg-green-500/20', text: 'text-green-400', glow: 'badge-glow-green', dot: '🟢', short: 'Min' },
  };
  const c = config[severity] || config.Minor;
  const label = compact ? c.short : severity;
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${c.bg} ${c.text} ${c.glow} whitespace-nowrap`}>
      {compact ? label : `${c.dot} ${severity}`}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string }> = {
    'En Route': { bg: 'bg-blue-500/20', text: 'text-blue-400' },
    'Waiting': { bg: 'bg-amber-500/20', text: 'text-amber-400' },
    'Active': { bg: 'bg-green-500/20', text: 'text-green-400' },
    'Lost': { bg: 'bg-red-500/20', text: 'text-red-400' },
  };
  const c = config[status] || config.Waiting;
  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${c.bg} ${c.text} whitespace-nowrap`}>
      {status}
    </span>
  );
}

function SurvivalBar({ pct }: { pct: number }) {
  const color = pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-amber-500' : 'bg-red-500';
  const displayPct = `${(Math.round(pct * 10) / 10).toFixed(1).replace(/\.0$/, '')}%`;
  return (
    <div className="flex items-center gap-1">
      <div className="w-8 h-1.5 bg-[#1e293b] rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-[#cbd5e1] tabular-nums">{displayPct}</span>
    </div>
  );
}

const logColorMap: Record<LogEntryType, string> = {
  normal: 'text-[#4ade80]',
  replan: 'text-[#f59e0b]',
  event: 'text-[#ef4444]',
  success: 'text-[#4ade80]',
  info: 'text-[#38bdf8]',
};

function victimStatusUi(s: VictimStatus): string {
  switch (s) {
    case 'waiting':
      return 'Waiting';
    case 'en-route':
      return 'En Route';
    case 'rescued':
      return 'Active';
    case 'lost':
      return 'Lost';
    default: {
      const _e: never = s;
      return _e;
    }
  }
}

function severityUi(sev: Victim['severity']): string {
  if (sev === 'critical') return 'Critical';
  if (sev === 'moderate') return 'Moderate';
  return 'Minor';
}

function formatVictimEta(eta: Victim['eta']): string {
  if (eta === null) return '—';
  return `${eta}m`;
}

interface RightPanelProps {
  state: SimulationState;
  actions: SimulationActions;
}

function mlRiskShort(id: string, estimates: SimulationState['victimMlEstimates']): string {
  const e = estimates[id];
  if (!e) return '—';
  const tag = ['L', 'M', 'H'][e.predictedClass];
  return `${tag} ${e.survivalEstimatePct}%`;
}

export default function RightPanel({ state, actions }: RightPanelProps) {
  const { victims, decisionLog, victimMlEstimates } = state;
  const priorityReasoning = useMemo(() => buildPriorityReasoning(state), [
    state.victims,
    state.cspSolution,
    state.objectivePriority,
    state.fuzzyLogicEnabled,
    state.victimMlEstimates,
  ]);
  const lastLogIndex = decisionLog.length > 0 ? decisionLog.length - 1 : -1;
  const logScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = logScrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [decisionLog]);

  return (
    <div className="flex-[1.42] xl:flex-[1.22] min-w-0 h-full min-h-0 flex flex-col bg-[#0f172a] p-2 gap-2">
      <div className="shrink-0 min-w-0">
        <SectionLabel>Victims</SectionLabel>
        <table className="w-full text-[11px] table-fixed">
          <thead>
            <tr className="text-[#94a3b8] text-[10px] uppercase tracking-wide">
              <th className="text-left py-0.5 font-medium w-[28px]">ID</th>
              <th className="text-left py-0.5 font-medium">Sev</th>
              <th className="text-left py-0.5 font-medium w-[56px]">Status</th>
              <th className="text-left py-0.5 font-medium w-[32px]">Asgn</th>
              <th className="text-left py-0.5 font-medium">Surv</th>
              <th className="text-left py-0.5 font-medium w-[32px]">ML</th>
              <th className="text-left py-0.5 font-medium w-[26px]">ETA</th>
            </tr>
          </thead>
          <tbody>
            {victims.map((v, i) => (
              <tr
                key={v.id}
                className={`border-t border-[#1e293b] ${i % 2 === 0 ? 'bg-[#0f172a]' : 'bg-[#0a0f1e]'}`}
              >
                <td className="py-0.5 font-semibold text-[#f1f5f9]">{v.id}</td>
                <td className="py-0.5"><SeverityBadge compact severity={severityUi(v.severity)} /></td>
                <td className="py-0.5"><StatusBadge status={victimStatusUi(v.status)} /></td>
                <td className="py-0.5 text-[#cbd5e1] truncate text-[10px]">{v.assignedTo ?? '—'}</td>
                <td className="py-0.5"><SurvivalBar pct={v.survivalPct} /></td>
                <td className="py-0.5 text-[#cbd5e1] font-mono-display text-[10px]">{mlRiskShort(v.id, victimMlEstimates)}</td>
                <td className="py-0.5 text-[#cbd5e1] font-mono-display text-[10px]">{formatVictimEta(v.eta)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="shrink-0 card-glass p-2.5 rounded-md border-glow-left-purple min-w-0">
        <SectionLabel>Priority</SectionLabel>
        <div className="text-[11px] text-[#e2e8f0] leading-snug space-y-1.5">
          {priorityReasoning.hasQueue && priorityReasoning.primary ? (
            <p>
              <span className={`font-semibold ${severityAccentClass(priorityReasoning.primary.severity)}`}>
                {priorityReasoning.primary.id}
              </span>{' '}
              first —{' '}
              <span className={severityAccentClass(priorityReasoning.primary.severity)}>
                {formatSeverityUpper(priorityReasoning.primary.severity)}
              </span>
              . <span className="text-[#94a3b8]">{priorityReasoning.primary.reason}</span>
            </p>
          ) : (
            <p className="text-[#94a3b8]">
              No victims in <span className="text-[#f1f5f9]">waiting</span> /{' '}
              <span className="text-[#f1f5f9]">en-route</span>.
            </p>
          )}
          {priorityReasoning.secondary ? (
            <p className="text-[#94a3b8]">{priorityReasoning.secondary}</p>
          ) : priorityReasoning.hasQueue ? (
            <p className="text-[#94a3b8]">No further queued victims.</p>
          ) : null}
          <div className="border-t border-[#1e293b] pt-1 mt-1 space-y-0.5">
            <p className="text-[#94a3b8]">
              Route: <span className="text-[#f1f5f9]">{priorityReasoning.objectiveTitle}</span>
            </p>
            <p className="text-[#94a3b8]">
              Trade-off: <span className="text-[#f1f5f9]">{priorityReasoning.tradeoffLine}</span>
            </p>
            <p className="text-[#94a3b8] text-[10px] leading-snug">{priorityReasoning.fuzzyNote}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col gap-1 min-w-0">
        <SectionLabel
          action={
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => downloadRunSnapshot(state)}
                className="text-[10px] text-[#94a3b8] hover:text-[#f1f5f9] transition-colors cursor-pointer"
              >
                Export
              </button>
              <button
                type="button"
                onClick={actions.clearLog}
                className="text-[10px] text-[#94a3b8] hover:text-[#f1f5f9] transition-colors flex items-center gap-0.5 cursor-pointer"
              >
                <X className="w-3 h-3" /> Clear
              </button>
            </div>
          }
        >
          Log
        </SectionLabel>
        <div
          ref={logScrollRef}
          className="flex-1 min-h-[64px] overflow-y-auto overscroll-contain bg-[#020817] rounded-md border border-[#1e293b] p-2.5 font-mono-display text-[11px] space-y-1 leading-snug text-[#e2e8f0]"
        >
          {decisionLog.map((entry, i) => (
            <div
              key={entry.id}
              className={`${logColorMap[entry.type]} ${
                i === lastLogIndex ? 'border-l-2 border-[#3b82f6] pl-1.5 bg-[#1e293b]/30' : ''
              }`}
            >
              <span className="text-[#64748b]">[{entry.timestamp}]</span> {entry.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
