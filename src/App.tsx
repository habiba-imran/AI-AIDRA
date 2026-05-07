import { useState } from 'react';
import Navbar from './components/Navbar';
import LeftPanel from './components/LeftPanel';
import CenterPanel from './components/CenterPanel';
import RightPanel from './components/RightPanel';
import BottomBar from './components/BottomBar';
import LiveSimControlBar from './components/LiveSimControlBar';
import NotificationToasts from './components/NotificationToasts';
import SearchTrace from './components/SearchTrace';
import CspSolver from './components/CspSolver';
import MlStudio from './components/MlStudio';
import Analytics from './components/Analytics';
import { type TabId } from './data/placeholder';
import { useSimulation } from './engine/simulationEngine';
import { useTimer } from './engine/useTimer';

function App() {
  const { state, actions } = useSimulation();
  useTimer(state.running, state.paused, state.speed, actions.onTick);
  const [activeTab, setActiveTab] = useState<TabId>('live-sim');

  return (
    <div className="h-screen flex flex-col bg-[#020817] dot-pattern overflow-hidden">
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        elapsedSeconds={state.elapsedSeconds}
        running={state.running}
        toastCount={state.toasts.length}
      />

      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 min-h-0 overflow-hidden animate-fade-in flex flex-col" key={activeTab}>
          {activeTab === 'live-sim' && (
            <div className="flex-1 flex min-h-0 min-w-0">
              <LeftPanel state={state} actions={actions} />
              <div className="flex-1 min-w-0 min-h-0 flex flex-col">
                <LiveSimControlBar state={state} actions={actions} />
                <div className="flex-1 min-h-0 min-w-0 flex flex-row items-stretch gap-1 pl-1 pr-0 pb-1">
                  <div className="shrink-0 min-w-0 min-h-0 flex items-start justify-start">
                    <CenterPanel
                      grid={state.grid}
                      victims={state.victims}
                      ambulances={state.ambulances}
                      rescueTeam={state.rescueTeam}
                      objectivePriority={state.objectivePriority}
                      searchAlgorithm={state.searchAlgorithm}
                      routeAmb1={state.currentRouteAmb1}
                      routeAmb2={state.currentRouteAmb2}
                      routeTeam={state.currentRouteTeam}
                    />
                  </div>
                  <div className="flex flex-1 min-w-0 min-h-0 rounded-r-xl overflow-hidden border border-[#1e293b] bg-[#0a0f1e]">
                    <BottomBar
                      layout="side"
                      fuzzyLogicEnabled={state.fuzzyLogicEnabled}
                      fuzzySnapshot={state.fuzzySnapshot}
                      mlModel={state.mlModel}
                      mlEvalSnapshot={state.mlEvalSnapshot}
                      kpis={state.kpis}
                    />
                    <RightPanel state={state} actions={actions} />
                  </div>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'search-trace' && (
            <SearchTrace
              searchResult={state.searchResults}
              allAlgoComparisons={state.allAlgoComparisons}
              grid={state.grid}
              victims={state.victims}
              objectivePriority={state.objectivePriority}
              onRunSearch={actions.runSearchForAlgorithm}
              fuzzyRiskStep={
                state.fuzzyLogicEnabled && state.fuzzySnapshot
                  ? state.fuzzySnapshot.riskStepMultiplier
                  : 1
              }
              fuzzyHeuristicWeight={
                state.fuzzyLogicEnabled && state.fuzzySnapshot
                  ? state.fuzzySnapshot.heuristicRiskWeight
                  : 1
              }
            />
          )}
          {activeTab === 'csp-solver' && (
            <CspSolver
              cspSolution={state.cspSolution}
              victims={state.victims}
              onRunCsp={actions.runCsp}
            />
          )}

          {activeTab === 'ml-studio' && (
            <MlStudio
              mlEvalSnapshot={state.mlEvalSnapshot}
              mlModel={state.mlModel}
              victims={state.victims}
              victimMlEstimates={state.victimMlEstimates}
              onRunMlEvaluation={actions.runMlEvaluation}
              onSelectMlModel={actions.setMLModel}
            />
          )}
          {activeTab === 'analytics' && <Analytics state={state} />}
        </div>

      </div>

      <NotificationToasts
        toasts={state.toasts}
        onDismissToast={actions.dismissToast}
      />
    </div>
  );
}

export default App;
