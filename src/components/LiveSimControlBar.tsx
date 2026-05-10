import { useState, useEffect } from 'react';
import { RotateCcw, SkipBack, SkipForward, UserPlus, Zap, Construction, Flame, Settings2 } from 'lucide-react';
import type { SeverityLevel, SimulationActions, SimulationState } from '../types';

const severityOptions: Array<{ value: SeverityLevel; label: string; color: string }> = [
  { value: 'critical', label: 'Critical', color: 'bg-red-500' },
  { value: 'moderate', label: 'Moderate', color: 'bg-amber-500' },
  { value: 'minor', label: 'Minor', color: 'bg-green-500' },
];

interface LiveSimControlBarProps {
  actions: SimulationActions;
  state: SimulationState;
}

const btnSidebar =
  'h-8 flex-1 min-w-0 rounded-lg text-[10px] font-semibold transition-colors flex items-center justify-center gap-1 cursor-pointer px-1';

export default function LiveSimControlBar({ actions, state }: LiveSimControlBarProps) {
  const [vRow, setVRow] = useState('5');
  const [vCol, setVCol] = useState('5');
  const [vSev, setVSev] = useState<SeverityLevel>('moderate');
  const [vSurv, setVSurv] = useState(80);

  useEffect(() => {
    if (state.selectedCell) {
      setVRow(String(state.selectedCell.row));
      setVCol(String(state.selectedCell.col));
    }
  }, [state.selectedCell]);

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
            className={`${btnSidebar} bg-[#1e293b] text-[#f8fafc] border border-[#334155] hover:bg-[#2d3748]`}
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

        <div className="rounded-lg border border-[#1e293b]/80 bg-[#0f172a]/90 px-2.5 py-2.5 space-y-3 shadow-inner">
          <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-[#38bdf8]">
            <Settings2 className="w-3.5 h-3.5 shrink-0" aria-hidden />
            Simulator toolset
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[8px] font-bold uppercase tracking-[0.1em] text-[#64748b] mb-1">Row</label>
              <input
                type="number"
                min={0}
                max={17}
                value={vRow}
                onChange={(e) => setVRow(e.target.value)}
                className={inputClass}
                aria-label="Target row"
              />
            </div>
            <div>
              <label className="block text-[8px] font-bold uppercase tracking-[0.1em] text-[#64748b] mb-1">Col</label>
              <input
                type="number"
                min={0}
                max={17}
                value={vCol}
                onChange={(e) => setVCol(e.target.value)}
                className={inputClass}
                aria-label="Target column"
              />
            </div>
          </div>

          <div className="space-y-2 pt-1 border-t border-[#1e293b]/60">
            <div className="flex items-center gap-1.5 text-[8px] font-semibold uppercase tracking-[0.08em] text-[#94a3b8]">
              <UserPlus className="w-2.5 h-2.5" /> Victim config
            </div>
            
            <div className="grid grid-cols-3 gap-1">
              {severityOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setVSev(opt.value)}
                  className={`h-7 rounded-md text-[9px] font-semibold transition-all cursor-pointer flex items-center justify-center gap-0.5 ${
                    vSev === opt.value
                      ? `${opt.color} text-[#f8fafc] shadow-md shadow-black/20`
                      : 'bg-[#020817] border border-[#334155] text-[#94a3b8] hover:bg-[#1e293b]'
                  }`}
                >
                  {opt.value === 'critical' ? 'Crit.' : opt.value === 'moderate' ? 'Mod.' : 'Min.'}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between text-[8px] uppercase tracking-[0.08em] text-[#64748b] mt-1">
              <span>Survival probability</span>
              <span className="text-[#3b82f6] font-mono-display">{vSurv}%</span>
            </div>
            <input
              type="range"
              min={1}
              max={100}
              value={vSurv}
              onChange={(e) => setVSurv(parseInt(e.target.value, 10))}
              className="w-full accent-[#3b82f6] h-1.5 cursor-pointer bg-[#020817] rounded-full"
            />
          </div>

          <div className="grid grid-cols-1 gap-1.5 pt-1">
            <button
              type="button"
              onClick={submitAddVictim}
              className="w-full h-8 rounded-lg text-[10px] font-bold bg-[#38bdf8] text-[#0f172a] hover:bg-[#7dd3fc] transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Add Victim
            </button>

            <div className="grid grid-cols-3 gap-1">
              <button
                type="button"
                className="h-8 flex items-center justify-center gap-1 rounded bg-[#7f1d1d]/80 border border-red-500/30 text-red-100 text-[9px] font-semibold hover:bg-[#991b1b] transition-colors cursor-pointer px-1"
                onClick={() => {
                  const r = parseInt(vRow, 10);
                  const c = parseInt(vCol, 10);
                  if (!Number.isNaN(r) && !Number.isNaN(c)) actions.triggerAfterShock(r, c);
                }}
              >
                <Zap className="w-2.5 h-2.5" /> Shock
              </button>
              <button
                type="button"
                className="h-8 flex items-center justify-center gap-1 rounded bg-[#020817] border border-orange-500/30 text-orange-300 text-[9px] font-semibold hover:bg-orange-500/10 transition-colors cursor-pointer px-1"
                onClick={() => {
                  const r = parseInt(vRow, 10);
                  const c = parseInt(vCol, 10);
                  if (!Number.isNaN(r) && !Number.isNaN(c)) actions.blockRoadAt(r, c);
                }}
              >
                <Construction className="w-2.5 h-2.5" /> Block
              </button>
              <button
                type="button"
                className="h-8 flex items-center justify-center gap-1 rounded bg-gradient-to-br from-orange-600 to-red-600 text-white text-[9px] font-semibold hover:from-orange-500 hover:to-red-500 transition-colors cursor-pointer px-1 shadow-sm"
                onClick={() => {
                  const r = parseInt(vRow, 10);
                  const c = parseInt(vCol, 10);
                  if (!Number.isNaN(r) && !Number.isNaN(c)) actions.spreadFireFrom(r, c);
                }}
              >
                <Flame className="w-2.5 h-2.5" /> Fire
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
