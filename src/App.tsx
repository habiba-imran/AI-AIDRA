import { useState } from 'react';
import Sidebar from './components/Sidebar';
import UnifiedLeftPanel from './components/UnifiedLeftPanel';
import CenterPanel from './components/CenterPanel';
import RightPanel from './components/RightPanel';
import NotificationToasts from './components/NotificationToasts';
import MlStudio from './components/MlStudio';
import Analytics from './components/Analytics';
import { type TabId } from './data/placeholder';
import { useSimulation } from './engine/simulationEngine';

function App() {
  const { state, actions } = useSimulation();
  const [activeTab, setActiveTab] = useState<TabId>('live-sim');

  return (
    <div className="h-screen flex bg-[#020817] dot-pattern overflow-hidden">
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        elapsedSeconds={state.elapsedSeconds}
      />

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex-1 min-h-0 overflow-hidden animate-fade-in flex flex-col" key={activeTab}>
          {activeTab === 'live-sim' && (
            <div className="flex flex-1 min-h-0 min-w-0 flex-col lg:flex-row gap-0 overflow-y-auto lg:overflow-hidden">
              <aside className="shrink-0 z-20 flex h-auto lg:h-full w-full lg:w-[240px] xl:w-[280px] flex-col overflow-hidden border-r border-[#1e293b]/80 bg-[#0f172a] shadow-xl">
                <UnifiedLeftPanel state={state} actions={actions} />
              </aside>
              <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                <div className="flex flex-1 min-h-0 min-w-0 flex-col md:flex-row items-stretch gap-0">
                  <div className="flex-[1.8] min-w-0 min-h-[400px] md:min-h-0 items-stretch justify-center flex bg-[#020817]">
                    <CenterPanel
                      grid={state.grid}
                      victims={state.victims}
                      ambulances={state.ambulances}
                      rescueTeam={state.rescueTeam}
                      objectivePriority={state.objectivePriority}
                      searchAlgorithm={state.searchAlgorithm}
                      actions={actions}
                      routeAmb1={state.currentRouteAmb1}
                      routeAmb2={state.currentRouteAmb2}
                      routeTeam={state.currentRouteTeam}
                    />
                  </div>
                  <div className="flex-[1.2] min-h-0 min-w-0 flex overflow-hidden">
                    <RightPanel state={state} actions={actions} />
                  </div>
                </div>
              </div>
            </div>
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
