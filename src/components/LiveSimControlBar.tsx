import { Play, Pause, RotateCcw, Gauge } from 'lucide-react';
import type { SimSpeed, SimulationActions, SimulationState } from '../types';

const speedOptions: SimSpeed[] = ['Slow', 'Normal', 'Fast'];

interface LiveSimControlBarProps {
  state: SimulationState;
  actions: SimulationActions;
}

export default function LiveSimControlBar({ state, actions }: LiveSimControlBarProps) {
  return (
    <div className="shrink-0 bg-[#0f172a] border-b border-[#1e293b] px-2 py-2">
      <div className="w-full grid grid-cols-2 gap-2">
        <div className="flex items-center gap-1 card-glass px-1.5 py-1.5 w-full">
          <button
            type="button"
            onClick={actions.startSimulation}
            className="h-7 md:h-8 flex-1 rounded-lg text-[11px] font-semibold bg-[#22c55e] text-[#f8fafc] hover:bg-[#16a34a] transition-colors flex items-center justify-center gap-1 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" /> Start
          </button>
          <button
            type="button"
            onClick={actions.pauseSimulation}
            className="h-7 md:h-8 flex-1 rounded-lg text-[11px] font-semibold bg-[#f59e0b] text-[#0f172a] hover:bg-[#d97706] transition-colors flex items-center justify-center gap-1 cursor-pointer"
          >
            <Pause className="w-3.5 h-3.5" /> Pause
          </button>
          <button
            type="button"
            onClick={actions.resetSimulation}
            className="h-7 md:h-8 flex-1 rounded-lg text-[11px] font-semibold border border-[#334155] text-[#cbd5e1] hover:bg-[#1e293b] transition-colors flex items-center justify-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
        </div>

        <div className="flex items-center gap-1.5 card-glass px-1.5 py-1.5 w-full">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] text-[#60a5fa] font-semibold">
            <Gauge className="w-3.5 h-3.5" /> Speed
          </div>
          <div className="flex items-center gap-1 flex-1">
            {speedOptions.map((sp) => (
              <button
                key={sp}
                type="button"
                onClick={() => actions.setSpeed(sp)}
                className={`h-7 flex-1 rounded-md text-[10px] font-medium transition-colors cursor-pointer ${
                  state.speed === sp
                    ? 'bg-[#3b82f6] text-[#f8fafc] glow-blue'
                    : 'border border-[#334155] text-[#94a3b8] hover:bg-[#1e293b]'
                }`}
              >
                {sp}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
