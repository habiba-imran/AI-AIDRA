import { useState } from 'react';
import { RotateCcw, SkipBack, SkipForward, UserPlus } from 'lucide-react';
import type { SeverityLevel, SimulationActions } from '../types';

const severityOptions: Array<{ value: SeverityLevel; label: string; color: string }> = [
  { value: 'critical', label: 'Critical', color: 'bg-red-500' },
  { value: 'moderate', label: 'Moderate', color: 'bg-amber-500' },
  { value: 'minor', label: 'Minor', color: 'bg-green-500' },
];

interface LiveSimControlBarProps {
  actions: SimulationActions;
}

const btnSidebar =
  'h-8 flex-1 min-w-0 rounded-lg text-[10px] font-semibold transition-colors flex items-center justify-center gap-1 cursor-pointer px-1';

export default function LiveSimControlBar({ actions }: LiveSimControlBarProps) {
  const [vRow, setVRow] = useState('5');
  const [vCol, setVCol] = useState('5');
  const [vSev, setVSev] = useState<SeverityLevel>('moderate');
  const [vSurv, setVSurv] = useState(80);

  const submitAddVictim = () => {
    const r = parseInt(vRow, 10);
    const c = parseInt(vCol, 10);
    if (Number.isNaN(r) || Number.isNaN(c)) return;
    actions.addVictim({ row: r, col: c, severity: vSev, survivalPct: vSurv });
  };

  const inputClass =
    'w-full h-8 px-2 rounded-lg bg-[#0a0f1e] border border-[#334155] text-[12px] text-[#f1f5f9] text-center tabular-nums focus:outline-none focus:border-[#3b82f6]';

  return (
    <div className="shrink-0 border-b border-[#1e293b]/80 bg-[#0c1322] px-2.5 py-2">
      <div className="flex flex-col gap-2.5">
        <div className="grid grid-cols-3 gap-1.5" role="toolbar" aria-label="Simulation steps">
          <button
            type="button"
            onClick={actions.resetSimulation}
            className={`${btnSidebar} border border-[#334155] text-[#cbd5e1] hover:bg-[#1e293b]`}
          >
            <RotateCcw className="w-3 h-3 shrink-0" />
            Reset
          </button>
          <button
            type="button"
            onClick={actions.stepBackward}
            className={`${btnSidebar} bg-[#3b82f6] text-[#f8fafc] hover:bg-[#2563eb]`}
          >
            <SkipBack className="w-3 h-3 shrink-0" />
            Back
          </button>
          <button
            type="button"
            onClick={actions.stepForward}
            className={`${btnSidebar} bg-[#3b82f6] text-[#f8fafc] hover:bg-[#2563eb]`}
          >
            <SkipForward className="w-3 h-3 shrink-0" />
            Fwd
          </button>
        </div>

        <div className="rounded-lg border border-[#1e293b]/80 bg-[#0f172a]/90 px-2 py-2 space-y-2">
          <div className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#a78bfa]">
            <UserPlus className="w-3 h-3 shrink-0" aria-hidden />
            Inject victim
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[8px] uppercase tracking-[0.08em] text-[#64748b] mb-0.5">Row</label>
              <input
                type="number"
                min={0}
                max={17}
                value={vRow}
                onChange={(e) => setVRow(e.target.value)}
                className={inputClass}
                aria-label="Victim row"
              />
            </div>
            <div>
              <label className="block text-[8px] uppercase tracking-[0.08em] text-[#64748b] mb-0.5">Col</label>
              <input
                type="number"
                min={0}
                max={17}
                value={vCol}
                onChange={(e) => setVCol(e.target.value)}
                className={inputClass}
                aria-label="Victim column"
              />
            </div>
          </div>

          <div>
            <span className="block text-[8px] uppercase tracking-[0.08em] text-[#64748b] mb-1">Severity</span>
            <div className="grid grid-cols-3 gap-1">
              {severityOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setVSev(opt.value)}
                  title={opt.label}
                  className={`h-7 rounded-md text-[9px] font-medium transition-colors cursor-pointer flex items-center justify-center gap-0.5 px-0.5 ${
                    vSev === opt.value
                      ? `${opt.color} text-[#f8fafc]`
                      : 'border border-[#334155] text-[#94a3b8] hover:bg-[#1e293b]'
                  }`}
                >
                  <span className={`w-1 h-1 rounded-full shrink-0 ${opt.color}`} />
                  <span className="truncate leading-tight text-center">
                    {opt.value === 'critical' ? 'Crit.' : opt.value === 'moderate' ? 'Mod.' : 'Minor'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[8px] uppercase tracking-[0.08em] text-[#64748b] mb-1">
              Survival {vSurv}%
            </label>
            <input
              type="range"
              min={1}
              max={100}
              value={vSurv}
              onChange={(e) => setVSurv(parseInt(e.target.value, 10))}
              className="w-full accent-[#3b82f6] cursor-pointer"
              aria-label="Starting survival percent"
            />
          </div>

          <button
            type="button"
            onClick={submitAddVictim}
            title="ID, status, and assignment are set by the engine after CSP."
            className="w-full h-8 rounded-lg text-[11px] font-semibold bg-[#a78bfa] text-[#0f172a] hover:bg-[#8b5cf6] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5 shrink-0" />
            Add victim
          </button>
        </div>
      </div>
    </div>
  );
}
