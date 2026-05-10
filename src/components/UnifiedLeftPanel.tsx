import { useState } from 'react';
import { Settings2, UserPlus, Truck, RotateCcw, SkipBack, SkipForward, Zap, Construction, Flame, Brain, Cpu, Activity, Play, Sparkles, Pause, FastForward, FileText, Presentation, Github, Linkedin, ExternalLink } from 'lucide-react';
import type { SimulationActions, SimulationState, SeverityLevel } from '../types';
import LeftPanel from './LeftPanel';

interface UnifiedLeftPanelProps {
  state: SimulationState;
  actions: SimulationActions;
}

const severityOptions: Array<{ value: SeverityLevel; label: string; color: string }> = [
  { value: 'critical', label: 'Critical', color: 'bg-red-500' },
  { value: 'moderate', label: 'Moderate', color: 'bg-amber-500' },
  { value: 'minor', label: 'Minor', color: 'bg-green-500' },
];

const btnSidebar =
  'h-8 flex-1 min-w-0 rounded-lg text-[10px] font-semibold transition-colors flex items-center justify-center gap-1 cursor-pointer px-1';

const inputClass =
  'w-full h-8 px-2 rounded-lg bg-[#0a0f1e] border border-[#334155] text-[12px] text-[#f1f5f9] text-center tabular-nums focus:outline-none focus:border-[#3b82f6]';

export default function UnifiedLeftPanel({ state, actions }: UnifiedLeftPanelProps) {
  const [activeTab, setActiveTab] = useState<'tools' | 'victim' | 'resources'>('tools');
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

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Simulation Controls (Always Visible) */}
      <div className="shrink-0 border-b border-[#1e293b]/80 bg-[#0c1322] px-2.5 py-2">
        {/* Simulation Playback Controls */}
        <div className="space-y-3 pb-3 border-b border-[#1e293b]/60">
          <div className="text-[9px] font-bold text-[#64748b] uppercase tracking-wider">Simulation Steps</div>
          <div className="flex gap-2">
            <button
              onClick={actions.resetSimulation}
              className="flex-1 h-10 rounded-lg bg-[#020817] border border-[#1e293b] flex items-center justify-center gap-2 text-[#64748b] hover:text-[#f1f5f9] hover:border-[#475569] transition-all text-[11px] font-bold"
              title="Reset Simulation"
            >
              <RotateCcw className="w-4 h-4" /> RESET
            </button>
            <button onClick={actions.stepBackward} className="flex-[1.5] h-10 rounded-lg bg-[#020817] border border-[#1e293b] flex items-center justify-center gap-1.5 text-[11px] font-bold text-[#94a3b8] hover:text-[#f1f5f9] transition-colors">
              <SkipBack className="w-4 h-4" /> STEP BACK
            </button>
            <button onClick={actions.stepForward} className="flex-[1.5] h-10 rounded-lg bg-[#3b82f6]/10 border border-[#3b82f6]/30 flex items-center justify-center gap-1.5 text-[11px] font-bold text-[#3b82f6] hover:bg-[#3b82f6]/20 transition-colors">
              STEP FWD <SkipForward className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Header */}
      <div className="flex border-b border-[#1e293b]/80 bg-[#0f172a]">
        <button
          onClick={() => setActiveTab('tools')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-bold uppercase tracking-wider transition-all border-b-2 ${
            activeTab === 'tools'
              ? 'text-[#38bdf8] border-[#38bdf8] bg-[#38bdf8]/5'
              : 'text-[#64748b] border-transparent hover:text-[#94a3b8]'
          }`}
        >
          <Settings2 className="w-3.5 h-3.5" />
          Tools
        </button>
        <button
          onClick={() => setActiveTab('victim')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-bold uppercase tracking-wider transition-all border-b-2 ${
            activeTab === 'victim'
              ? 'text-[#38bdf8] border-[#38bdf8] bg-[#38bdf8]/5'
              : 'text-[#64748b] border-transparent hover:text-[#94a3b8]'
          }`}
        >
          <UserPlus className="w-3.5 h-3.5" />
          Victim
        </button>
        <button
          onClick={() => setActiveTab('resources')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-bold uppercase tracking-wider transition-all border-b-2 ${
            activeTab === 'resources'
              ? 'text-[#38bdf8] border-[#38bdf8] bg-[#38bdf8]/5'
              : 'text-[#64748b] border-transparent hover:text-[#94a3b8]'
          }`}
        >
          <Truck className="w-3.5 h-3.5" />
          Resources
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {activeTab === 'tools' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-left-2 duration-200">
             <div className="space-y-3">
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
                  />
                </div>
              </div>

              <div className="pt-2 space-y-2">
                <div className="text-[9px] font-bold text-[#64748b] uppercase tracking-wider border-b border-[#1e293b] pb-1">Environment Events</div>
                <button
                  type="button"
                  className="w-full h-8 flex items-center justify-center gap-2 rounded bg-[#7f1d1d]/80 border border-red-500/30 text-red-100 text-[10px] font-bold hover:bg-[#991b1b] transition-colors cursor-pointer"
                  onClick={() => {
                    const r = parseInt(vRow, 10);
                    const c = parseInt(vCol, 10);
                    if (!Number.isNaN(r) && !Number.isNaN(c)) actions.triggerAfterShock(r, c);
                  }}
                >
                  <Zap className="w-3 h-3" /> Aftershock
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className="h-8 flex items-center justify-center gap-2 rounded bg-[#020817] border border-orange-500/30 text-orange-300 text-[10px] font-bold hover:bg-orange-500/10 transition-colors cursor-pointer"
                    onClick={() => {
                      const r = parseInt(vRow, 10);
                      const c = parseInt(vCol, 10);
                      if (!Number.isNaN(r) && !Number.isNaN(c)) actions.blockRoadAt(r, c);
                    }}
                  >
                    <Construction className="w-3 h-3" /> Block
                  </button>
                  <button
                    type="button"
                    className="h-8 flex items-center justify-center gap-2 rounded bg-gradient-to-br from-orange-600 to-red-600 text-white text-[10px] font-bold hover:from-orange-500 hover:to-red-500 transition-colors cursor-pointer"
                    onClick={() => {
                      const r = parseInt(vRow, 10);
                      const c = parseInt(vCol, 10);
                      if (!Number.isNaN(r) && !Number.isNaN(c)) actions.spreadFireFrom(r, c);
                    }}
                  >
                    <Flame className="w-3 h-3" /> Fire
                  </button>
                </div>
              </div>

              {/* AI Settings Section */}
              <div className="pt-2 space-y-3 border-t border-[#1e293b]/60">
                <div className="text-[9px] font-bold text-[#64748b] uppercase tracking-wider">AI Configuration</div>
                
                <div className="space-y-2">
                  <label className="block text-[8px] font-bold text-[#94a3b8] uppercase tracking-tighter">Search Algorithm</label>
                  <div className="grid grid-cols-2 gap-1">
                    {['Astar', 'BFS', 'DFS', 'Greedy'].map(algo => (
                      <button
                        key={algo}
                        onClick={() => actions.setSearchAlgorithm(algo as any)}
                        className={`py-1 rounded text-[9px] font-medium border ${state.searchAlgorithm === algo ? 'bg-[#3b82f6]/20 border-[#3b82f6] text-[#3b82f6]' : 'bg-[#020817] border-[#334155] text-[#64748b] hover:border-[#475569]'}`}
                      >
                        {algo === 'Astar' ? 'A*' : algo}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[8px] font-bold text-[#94a3b8] uppercase tracking-tighter">Objective Priority</label>
                  <div className="grid grid-cols-1 gap-1">
                    {['MinimizeRisk', 'MinimizeTime', 'Balanced'].map(obj => (
                      <button
                        key={obj}
                        onClick={() => actions.setObjectivePriority(obj as any)}
                        className={`py-1 px-2 rounded text-[9px] font-medium border text-left flex items-center gap-2 ${state.objectivePriority === obj ? 'bg-purple-500/20 border-purple-500 text-purple-300' : 'bg-[#020817] border-[#334155] text-[#64748b] hover:border-[#475569]'}`}
                      >
                        <div className={`w-1.5 h-1.5 rounded-full ${state.objectivePriority === obj ? 'bg-purple-500' : 'bg-[#334155]'}`} />
                        {obj === 'MinimizeRisk' ? 'Minimize Risk (Weighted A*)' : obj === 'MinimizeTime' ? 'Minimize Time (Greedy/BFS)' : 'Balanced (Hybrid)'}
                      </button>
                    ))}
                  </div>
                </div>                <div className="space-y-2">
                  <label className="block text-[8px] font-bold text-[#94a3b8] uppercase tracking-tighter">Local Search (Heuristic)</label>
                  <div className="grid grid-cols-2 gap-1">
                    {['HillClimbing', 'SimulatedAnnealing'].map(ls => (
                      <button
                        key={ls}
                        onClick={() => actions.setLocalSearch(ls as any)}
                        className={`py-1 rounded text-[9px] font-medium border ${state.localSearch === ls ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-[#020817] border-[#334155] text-[#64748b] hover:border-[#475569]'}`}
                      >
                        {ls === 'HillClimbing' ? 'Hill Climb' : 'Sim. Anneal'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[8px] font-bold text-[#94a3b8] uppercase tracking-tighter">ML Risk Estimator</label>
                  <div className="grid grid-cols-3 gap-1">
                    {['kNN', 'NaiveBayes', 'MLP'].map(model => (
                      <button
                        key={model}
                        onClick={() => actions.setMLModel(model as any)}
                        className={`py-1 rounded text-[9px] font-medium border ${state.mlModel === model ? 'bg-amber-500/20 border-amber-500 text-amber-400' : 'bg-[#020817] border-[#334155] text-[#64748b] hover:border-[#475569]'}`}
                      >
                        {model === 'NaiveBayes' ? 'NB' : model}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-indigo-500/5 border border-indigo-500/20">
                   <div className="flex items-center gap-2">
                      <Sparkles className={`w-3.5 h-3.5 ${state.fuzzyLogicEnabled ? 'text-indigo-400' : 'text-[#64748b]'}`} />
                      <span className={`text-[10px] font-bold ${state.fuzzyLogicEnabled ? 'text-indigo-400' : 'text-[#64748b]'}`}>Fuzzy Engine</span>
                   </div>
                   <button 
                    onClick={actions.toggleFuzzyLogic}
                    className={`w-8 h-4 rounded-full relative transition-colors ${state.fuzzyLogicEnabled ? 'bg-indigo-500' : 'bg-[#334155]'}`}
                   >
                     <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${state.fuzzyLogicEnabled ? 'left-4.5' : 'left-0.5'}`} />
                   </button>
                </div>

                <button
                  onClick={actions.applyAndReplan}
                  className="w-full h-10 mt-2 rounded-lg bg-gradient-to-r from-[#3b82f6] to-[#6366f1] text-white text-[11px] font-bold shadow-lg shadow-indigo-500/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4 fill-current" />
                  Apply & Replan
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'victim' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-left-2 duration-200">
             <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[8px] font-bold uppercase tracking-[0.1em] text-[#64748b] mb-1">Target Row</label>
                    <input
                      type="number"
                      min={0}
                      max={17}
                      value={vRow}
                      onChange={(e) => setVRow(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] font-bold uppercase tracking-[0.1em] text-[#64748b] mb-1">Target Col</label>
                    <input
                      type="number"
                      min={0}
                      max={17}
                      value={vCol}
                      onChange={(e) => setVCol(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[8px] font-bold uppercase tracking-[0.1em] text-[#64748b]">Severity</label>
                  <div className="grid grid-cols-3 gap-1">
                    {severityOptions.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setVSev(opt.value)}
                        className={`h-8 rounded-md text-[9px] font-bold transition-all cursor-pointer flex items-center justify-center ${
                          vSev === opt.value
                            ? `${opt.color} text-[#f8fafc] shadow-md shadow-black/20`
                            : 'bg-[#020817] border border-[#334155] text-[#94a3b8] hover:bg-[#1e293b]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                   <div className="flex items-center justify-between text-[8px] uppercase tracking-[0.08em] text-[#64748b]">
                    <span>Survival probability</span>
                    <span className="text-[#3b82f6] font-mono-display font-bold">{vSurv}%</span>
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

                <button
                  type="button"
                  onClick={submitAddVictim}
                  className="w-full h-10 rounded-lg text-[11px] font-bold bg-[#38bdf8] text-[#0f172a] hover:bg-[#7dd3fc] transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                >
                  <UserPlus className="w-4 h-4" />
                  Add Victim
                </button>
             </div>
          </div>
        )}

        {activeTab === 'resources' && (
          <div className="animate-in fade-in slide-in-from-left-2 duration-200">
            <LeftPanel state={state} actions={actions} variant="embedded" />
          </div>
        )}
      </div>
    </div>
  );
}
