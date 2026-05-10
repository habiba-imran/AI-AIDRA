import { useEffect, useMemo, useRef, useState } from 'react';
import { X, ChevronDown, ChevronUp, Download, Trash2, Sparkles, Brain } from 'lucide-react';
import type { SimulationActions } from '../engine/simulationEngine';
import type { LogEntryType, SimulationState, Victim, VictimStatus } from '../types';
import {
  buildPriorityReasoning,
  formatSeverityUpper,
  severityAccentClass,
} from '../utils/priorityReasoning';
import { downloadRunSnapshot } from '../utils/exportRun';
import { formatTime } from '../utils/formatters';

function SectionLabel({ children, action, icon }: { children: React.ReactNode; action?: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-1.5 mt-0.5">
      <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-[0.12em] text-[#3b82f6] uppercase">
        {icon}
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
  
  // Handle "Active (Amb1)" by matching the base status
  let styleKey = 'Waiting';
  if (status.startsWith('Active')) styleKey = 'Active';
  else if (status === 'En Route') styleKey = 'En Route';
  else if (status === 'Lost') styleKey = 'Lost';
  
  const c = config[styleKey];

  return (
    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${c.bg} ${c.text} whitespace-nowrap uppercase tracking-tighter`}>
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
      <span className="text-[9px] text-[#cbd5e1] tabular-nums font-mono-display">{displayPct}</span>
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
    case 'waiting': return 'Waiting';
    case 'en-route': return 'En Route';
    case 'rescued': return 'Active';
    case 'lost': return 'Lost';
    default: return 'Waiting';
  }
}

function severityUi(sev: Victim['severity']): string {
  if (sev === 'critical') return 'Critical';
  if (sev === 'moderate') return 'Moderate';
  return 'Minor';
}

function formatVictimEta(v: Victim): string {
  if (v.status === 'rescued' && v.rescuedAtSeconds !== null) {
    return `@${formatTime(v.rescuedAtSeconds)}`;
  }
  if (v.eta === null) return '—';
  return `${v.eta}s`;
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
  const { victims, decisionLog, victimMlEstimates, fuzzyLogicEnabled, fuzzySnapshot, mlModel, mlEvalSnapshot } = state;
  const [isLogExpanded, setIsLogExpanded] = useState(false);
  
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
    if (!el && !isLogExpanded) return;
    if (el) el.scrollTop = el.scrollHeight;
  }, [decisionLog, isLogExpanded]);

  return (
    <div className="flex-1 min-w-0 h-full flex flex-col bg-[#0f172a] overflow-hidden border-l border-[#1e293b]">
      {/* Top Half: Victims + Priority reasoning (Scrollable) */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-4 custom-scrollbar">
        {/* Victims Table */}
        <section>
          <SectionLabel>Victims</SectionLabel>
          <div className="rounded-lg border border-[#1e293b] bg-[#0a0f1e] overflow-x-auto custom-scrollbar">
            <table className="w-full text-[10px] min-w-[500px]">
              <thead>
                <tr className="text-[#64748b] text-[9px] uppercase tracking-wider bg-[#0f172a] border-b border-[#1e293b]">
                  <th className="text-left px-3 py-2 font-bold">ID</th>
                  <th className="text-left px-3 py-2 font-bold">Sev</th>
                  <th className="text-left px-3 py-2 font-bold">Status</th>
                  <th className="text-left px-3 py-2 font-bold">Surv</th>
                  <th className="text-left px-3 py-2 font-bold">ML</th>
                  <th className="text-left px-3 py-2 font-bold text-right">ETA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e293b]">
                {victims.map((v) => (
                  <tr key={v.id} className="hover:bg-[#1e293b]/30 transition-colors">
                    <td className="px-3 py-1.5 font-bold text-[#f1f5f9]">{v.id}</td>
                    <td className="px-3 py-1.5"><SeverityBadge compact severity={severityUi(v.severity)} /></td>
                    <td className="px-3 py-1.5">
                      <StatusBadge 
                        status={v.status === 'rescued' && v.assignedTo 
                          ? `Active (${v.assignedTo})` 
                          : victimStatusUi(v.status)
                        } 
                      />
                    </td>
                    <td className="px-3 py-1.5"><SurvivalBar pct={v.survivalPct} /></td>
                    <td className="px-3 py-1.5 text-[#94a3b8] font-mono-display text-[9px]">{mlRiskShort(v.id, victimMlEstimates)}</td>
                    <td className="px-3 py-1.5 text-[#94a3b8] font-mono-display text-[9px] text-right">{formatVictimEta(v)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Priority Reasoning */}
        <section>
          <SectionLabel>Priority reasoning</SectionLabel>
          <div className="card-glass p-3 rounded-lg border-l-2 border-purple-500/50 bg-[#0a0f1e]/50 space-y-3">
            <div className="space-y-2">
              {priorityReasoning.hasQueue ? (
                priorityReasoning.fullQueue.map((v, idx) => (
                  <div key={v.id} className={`text-[10px] leading-relaxed ${idx === 0 ? 'bg-[#3b82f6]/10 p-2 rounded border border-[#3b82f6]/20' : 'pl-2 border-l border-[#334155]'}`}>
                    <p>
                      <span className={`font-bold ${severityAccentClass(v.severity)}`}>{idx + 1}. {v.id}</span>
                      {' '}<span className="text-[#94a3b8]">— {v.reason}</span>
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-[10px] text-[#64748b] italic">No active victims in queue.</p>
              )}
            </div>
            
            <div className="pt-2 border-t border-[#1e293b] grid grid-cols-1 gap-1 text-[9px]">
              <div className="flex justify-between">
                <span className="text-[#64748b]">Strategy:</span>
                <span className="text-[#f1f5f9] font-bold">{priorityReasoning.objectiveTitle}</span>
              </div>
              <p className="text-[#94a3b8] leading-tight italic">{priorityReasoning.tradeoffLine}</p>
              <p className="text-[#38bdf8] font-medium mt-1">{priorityReasoning.fuzzyNote}</p>
            </div>
          </div>
        </section>

        {/* Fuzzy & ML Status (Condensed) */}
        <section className="grid grid-cols-2 gap-2">
          <div className="card-glass p-2 rounded-lg border border-[#1e293b] bg-[#0a0f1e]/40">
            <div className="flex items-center gap-1 mb-1">
              <Sparkles className="w-3 h-3 text-purple-400" />
              <span className="text-[9px] font-bold uppercase tracking-wider text-purple-400">Fuzzy Logic</span>
            </div>
            <div className="font-mono-display text-[8px] text-[#94a3b8] space-y-0.5">
              <div className="flex justify-between"><span>Hazard:</span><span className="text-amber-400">{fuzzySnapshot?.hazardCrisp.toFixed(2) ?? '—'}</span></div>
              <div className="flex justify-between"><span>Urgency:</span><span className="text-amber-400">{fuzzySnapshot?.urgencyCrisp.toFixed(2) ?? '—'}</span></div>
              <div className="text-purple-300/80 truncate mt-1">{fuzzyLogicEnabled ? 'Engine Active' : 'Off'}</div>
            </div>
          </div>
          <div className="card-glass p-2 rounded-lg border border-[#1e293b] bg-[#0a0f1e]/40">
            <div className="flex items-center gap-1 mb-1">
              <Brain className="w-3 h-3 text-green-400" />
              <span className="text-[9px] font-bold uppercase tracking-wider text-green-400">ML Model</span>
            </div>
            <div className="font-mono-display text-[8px] text-[#94a3b8] space-y-0.5">
              <div className="flex justify-between"><span>Active:</span><span className="text-green-400 font-bold">{mlModel}</span></div>
              <div className="flex justify-between"><span>Accuracy:</span><span className="text-green-400">{mlEvalSnapshot?.reports[mlModel]?.accuracy ? `${(mlEvalSnapshot.reports[mlModel].accuracy * 100).toFixed(0)}%` : '—'}</span></div>
              <div className="text-[#64748b] truncate mt-1">Inference ready</div>
            </div>
          </div>
        </section>
      </div>

      {/* Bottom Half: Log (Collapsible) */}
      <div className={`shrink-0 flex flex-col bg-[#0a0f1e] border-t border-[#1e293b] transition-all duration-300 ease-in-out ${isLogExpanded ? 'h-[40%]' : 'h-[42px]'}`}>
        <button 
          onClick={() => setIsLogExpanded(!isLogExpanded)}
          className="flex items-center justify-between px-3 h-[42px] hover:bg-[#1e293b]/30 transition-colors cursor-pointer group"
        >
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#3b82f6]">System Log</span>
            <span className="text-[9px] text-[#64748b] bg-[#1e293b] px-1.5 rounded-full">{decisionLog.length}</span>
          </div>
          <div className="flex items-center gap-3">
             <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button title="Export Log" onClick={(e) => { e.stopPropagation(); downloadRunSnapshot(state); }} className="p-1 hover:bg-[#3b82f6]/20 rounded text-[#64748b] hover:text-[#3b82f6] transition-colors"><Download className="w-3.5 h-3.5" /></button>
                <button title="Clear Log" onClick={(e) => { e.stopPropagation(); actions.clearLog(); }} className="p-1 hover:bg-red-500/20 rounded text-[#64748b] hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
             </div>
             {isLogExpanded ? <ChevronDown className="w-4 h-4 text-[#64748b]" /> : <ChevronUp className="w-4 h-4 text-[#64748b]" />}
          </div>
        </button>
        
        {isLogExpanded && (
          <div 
            ref={logScrollRef}
            className="flex-1 overflow-y-auto p-3 font-mono-display text-[10px] space-y-1.5 bg-[#020817] custom-scrollbar"
          >
            {decisionLog.map((entry, i) => (
              <div key={entry.id} className={`${logColorMap[entry.type]} flex gap-2 border-b border-[#1e293b]/30 pb-1`}>
                <span className="text-[#64748b] shrink-0 font-bold">[{entry.timestamp}]</span>
                <span className="leading-relaxed">{entry.text}</span>
              </div>
            ))}
            {decisionLog.length === 0 && <div className="text-[#64748b] italic text-center py-4">No log entries yet.</div>}
          </div>
        )}
      </div>
    </div>
  );
}
