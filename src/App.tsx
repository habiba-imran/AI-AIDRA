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

function App() {
  const { state, actions } = useSimulation();
  const [activeTab, setActiveTab] = useState<TabId>('live-sim');

  return (
    <div className="h-screen flex flex-col bg-[#020817] dot-pattern overflow-hidden">
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        elapsedSeconds={state.elapsedSeconds}
        toastCount={state.toasts.length}
      />

      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 min-h-0 overflow-hidden animate-fade-in flex flex-col" key={activeTab}>
          {activeTab === 'live-sim' && (
            <div className="flex flex-1 min-h-0 min-w-0 gap-2 px-2 pb-2 pt-1">
              <aside className="sticky top-0 z-20 flex h-full min-h-0 w-[clamp(220px,19vw,280px)] shrink-0 flex-col overflow-hidden rounded-xl border border-[#1e293b]/80 bg-[#0f172a] shadow-[0_0_0_1px_rgba(15,23,42,0.4)]">
                <LiveSimControlBar actions={actions} />
                <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
                  <LeftPanel state={state} actions={actions} variant="embedded" />
                </div>
              </aside>
              <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                <div className="flex flex-1 min-h-0 min-w-0 flex-row items-stretch gap-1 pr-0 pb-0 pt-0">
                  <div className="flex flex-1 min-w-0 min-h-0 items-stretch justify-center">
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
                  <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden rounded-r-xl border border-[#1e293b] bg-[#0a0f1e]">
                    <BottomBar
                      layout="side"
                      fuzzyLogicEnabled={state.fuzzyLogicEnabled}
                      fuzzySnapshot={state.fuzzySnapshot}
                      mlModel={state.mlModel}
                      mlEvalSnapshot={state.mlEvalSnapshot}
                      kpis={state.kpis}
                      liveSimAiSettings={{
                        searchAlgorithm: state.searchAlgorithm,
                        localSearch: state.localSearch,
                        mlModel: state.mlModel,
                        objectivePriority: state.objectivePriority,
                        fuzzyLogicEnabled: state.fuzzyLogicEnabled,
                        actions: {
                          setSearchAlgorithm: actions.setSearchAlgorithm,
                          setLocalSearch: actions.setLocalSearch,
                          setMLModel: actions.setMLModel,
                          setObjectivePriority: actions.setObjectivePriority,
                          toggleFuzzyLogic: actions.toggleFuzzyLogic,
                        },
                      }}
                      onLiveSimReplan={actions.applyAndReplan}
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
              localSearchResult={state.localSearchResult}
              localSearchAlgorithm={state.localSearch}
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
              kitsRemaining={state.kitsRemaining}
              kitsBudget={state.kitsBudget}
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
