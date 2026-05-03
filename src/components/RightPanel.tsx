import { X } from 'lucide-react';
import { victims, decisionLog, kpis } from '../data/placeholder';

function SectionLabel({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-2 mt-1">
      <div className="text-[10px] font-semibold tracking-[0.15em] text-[#3b82f6] uppercase">
        {children}
      </div>
      {action}
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const config: Record<string, { bg: string; text: string; glow: string; dot: string }> = {
    Critical: { bg: 'bg-red-500/20', text: 'text-red-400', glow: 'badge-glow-red', dot: '🔴' },
    Moderate: { bg: 'bg-amber-500/20', text: 'text-amber-400', glow: 'badge-glow-amber', dot: '🟡' },
    Minor: { bg: 'bg-green-500/20', text: 'text-green-400', glow: 'badge-glow-green', dot: '🟢' },
  };
  const c = config[severity] || config.Minor;
  return (
    <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${c.bg} ${c.text} ${c.glow} whitespace-nowrap`}>
      {c.dot} {severity}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string }> = {
    'En Route': { bg: 'bg-blue-500/20', text: 'text-blue-400' },
    'Waiting': { bg: 'bg-amber-500/20', text: 'text-amber-400' },
    'Active': { bg: 'bg-green-500/20', text: 'text-green-400' },
  };
  const c = config[status] || config.Waiting;
  return (
    <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${c.bg} ${c.text} whitespace-nowrap`}>
      {status}
    </span>
  );
}

function SurvivalBar({ pct }: { pct: number }) {
  const color = pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-10 h-1.5 bg-[#1e293b] rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[9px] text-[#94a3b8]">{pct}%</span>
    </div>
  );
}

function KPICard({ kpi }: { kpi: typeof kpis[0] }) {
  const colorMap = {
    green: { border: 'border-green-500/30', glow: 'glow-green', value: 'text-green-400' },
    amber: { border: 'border-amber-500/30', glow: 'glow-amber', value: 'text-amber-400' },
    red: { border: 'border-red-500/30', glow: 'glow-red', value: 'text-red-400' },
  };
  const c = colorMap[kpi.color];
  return (
    <div className={`card-glass p-2.5 ${c.border} ${c.glow} flex flex-col items-center text-center`}>
      <div className="flex items-center gap-1 mb-1">
        <span className="text-[11px]">{kpi.icon}</span>
      </div>
      <div className={`text-[15px] font-bold ${c.value}`}>{kpi.value}</div>
      <div className="text-[9px] text-[#94a3b8] mt-0.5 leading-tight">{kpi.label}</div>
    </div>
  );
}

const logColorMap = {
  normal: 'text-[#4ade80]',
  replan: 'text-[#f59e0b]',
  event: 'text-[#ef4444]',
  success: 'text-[#4ade80]',
};

export default function RightPanel() {
  return (
    <div className="w-[300px] shrink-0 bg-[#0f172a] border-l border-[#1e293b] overflow-y-auto p-4 space-y-4">
      {/* Victim Status Table */}
      <div>
        <SectionLabel>Victim Status</SectionLabel>
        <table className="w-full text-[10px]">
          <thead>
            <tr className="text-[#64748b] text-[9px] uppercase tracking-wider">
              <th className="text-left py-1 font-medium">ID</th>
              <th className="text-left py-1 font-medium">Sev</th>
              <th className="text-left py-1 font-medium">Status</th>
              <th className="text-left py-1 font-medium">Asgn</th>
              <th className="text-left py-1 font-medium">Surv</th>
              <th className="text-left py-1 font-medium">ETA</th>
            </tr>
          </thead>
          <tbody>
            {victims.map((v, i) => (
              <tr
                key={v.id}
                className={`border-t border-[#1e293b] ${i % 2 === 0 ? 'bg-[#0f172a]' : 'bg-[#0a0f1e]'}`}
              >
                <td className="py-1 font-semibold text-[#f1f5f9]">{v.id}</td>
                <td className="py-1"><SeverityBadge severity={v.severity} /></td>
                <td className="py-1"><StatusBadge status={v.status} /></td>
                <td className="py-1 text-[#94a3b8]">{v.assigned}</td>
                <td className="py-1"><SurvivalBar pct={v.survivalPct} /></td>
                <td className="py-1 text-[#94a3b8] font-mono-display">{v.eta}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Priority Reasoning */}
      <div className="card-glass p-3 border-glow-left-purple">
        <SectionLabel>Priority Reasoning</SectionLabel>
        <div className="text-[10px] text-[#cbd5e1] leading-relaxed space-y-1.5">
          <p>
            <span className="text-red-400 font-semibold">V1</span> selected first — <span className="text-red-400">CRITICAL</span> severity
          </p>
          <p className="text-[#94a3b8]">
            Survival drops below 50% threshold in ~6 min without intervention. <span className="text-amber-400">V2</span> queued next.
          </p>
          <div className="border-t border-[#1e293b] pt-1.5 mt-1.5">
            <p className="text-[#94a3b8]">
              Objective active: <span className="text-[#f1f5f9]">Victim Prioritization</span>
            </p>
            <p className="text-[#94a3b8]">
              Trade-off: <span className="text-amber-400">V4 (Moderate)</span> delayed by ~8 min
            </p>
          </div>
        </div>
      </div>

      {/* Decision Log */}
      <div>
        <SectionLabel action={
          <button className="text-[9px] text-[#64748b] hover:text-[#f1f5f9] transition-colors flex items-center gap-1 cursor-pointer">
            <X className="w-3 h-3" /> Clear
          </button>
        }>
          Decision Log
        </SectionLabel>
        <div className="bg-[#020817] rounded-lg border border-[#1e293b] p-3 h-[180px] overflow-y-auto font-mono-display text-[10px] space-y-1 leading-relaxed">
          {decisionLog.map((entry, i) => (
            <div key={i} className={`${logColorMap[entry.type]} ${i === 7 ? 'border-l-2 border-[#3b82f6] pl-2 bg-[#1e293b]/30' : ''}`}>
              <span className="text-[#64748b]">[{entry.time}]</span> {entry.text}
            </div>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div>
        <SectionLabel>Performance KPIs</SectionLabel>
        <div className="grid grid-cols-3 gap-2">
          {kpis.map((kpi) => (
            <KPICard key={kpi.label} kpi={kpi} />
          ))}
        </div>
      </div>
    </div>
  );
}
