import { useEffect, useState, useCallback } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { AppLayout } from "./components/layout/AppLayout";
import { ThemeProvider } from "./components/layout/ThemeToggle";
import { TopNav } from "./components/layout/TopNav";
import { StatusBar } from "./components/layout/StatusBar";
import { PipelineCanvas } from "./components/canvas/PipelineCanvas";
import { AgentPalette } from "./components/palette/AgentPalette";
import { InspectorWrapper } from "./components/inspector/InspectorWrapper";
import { ExecutionToolbar } from "./components/execution/ExecutionToolbar";
import { SignupPortal } from "./components/auth/SignupPortal";
import { ApiKeysPage } from "./components/settings/ApiKeysPage";
import { NetworkGraph3D } from "./components/network/NetworkGraph3D";
import { TerminalView } from "./components/terminal/TerminalView";
import { ConnectorChat } from "./components/chat/ConnectorChat";
import { LogViewerPage } from "./components/logs/LogViewerPage";
import { FirstLaunchCheck } from "./components/setup/FirstLaunchCheck";
import { HelpPage } from "./components/help/HelpPage";
import { useExecutionEvents } from "./hooks/useExecutionEvents";
import { useAgentRegistryStore } from "./stores/agentRegistryStore";
import { DEMO_AGENTS } from "./data/demo-agents";
import "./styles/globals.css";

export default function App() {
  useExecutionEvents();

  const [setupDone, setSetupDone] = useState(() =>
    Boolean(localStorage.getItem("mcp-setup-done")),
  );
  const [authenticated, setAuthenticated] = useState(() =>
    Boolean(localStorage.getItem("mcp-auth")),
  );
  const [currentPage, setCurrentPage] = useState("canvas");
  const [inspectorOpen, setInspectorOpen] = useState(true);

  const handleSetupComplete = useCallback(() => {
    localStorage.setItem("mcp-setup-done", "true");
    setSetupDone(true);
  }, []);

  const handleAuthenticated = useCallback(() => setAuthenticated(true), []);

  const handleSignOut = useCallback(() => {
    localStorage.removeItem("mcp-auth");
    localStorage.removeItem("mcp-setup-done");
    setAuthenticated(false);
    setSetupDone(false);
  }, []);

  const handleSignIn = useCallback(() => {
    setAuthenticated(false); // Show signup portal
  }, []);

  // Load demo agents on mount
  useEffect(() => {
    useAgentRegistryStore.getState().registerAgents(DEMO_AGENTS);
  }, []);

  // First launch: dependency check
  if (!setupDone) {
    return <FirstLaunchCheck onComplete={handleSetupComplete} />;
  }

  if (!authenticated) {
    return <SignupPortal onAuthenticated={handleAuthenticated} />;
  }

  return (
    <ThemeProvider>
      <ReactFlowProvider>
        <div className="h-screen w-screen flex flex-col overflow-hidden bg-[#0F1117]">
          {/* Top nav — MultiClawProtocol branding + page tabs + auth */}
          <TopNav
            currentPage={currentPage}
            onNavigate={setCurrentPage}
            isAuthenticated={authenticated}
            onSignIn={handleSignIn}
            onSignOut={handleSignOut}
          />

          {/* Page content */}
          {currentPage === "canvas" && (
            <AppLayout
              palette={
                <div className="flex items-center gap-2">
                  {/* Execution controls — bottom left, same-size buttons */}
                  <div className="flex-none px-3">
                    <ExecutionToolbar />
                  </div>
                  <div className="w-px h-6 bg-gray-700/50 flex-none" />
                  <AgentPalette />
                </div>
              }
              canvas={<PipelineCanvas />}
              inspector={
                <div className="flex flex-col h-full">
                  <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-caption font-bold tracking-widest text-surface-accent dark:text-gray-300">
                      INSPECTOR
                    </h2>
                    <button
                      onClick={() => setInspectorOpen(!inspectorOpen)}
                      className="text-caption text-gray-500 hover:text-gray-300 transition-colors"
                      title={inspectorOpen ? "Collapse" : "Expand"}
                    >
                      {inspectorOpen ? "▸" : "◂"}
                    </button>
                  </div>
                  {inspectorOpen && <InspectorWrapper />}
                </div>
              }
              inspectorCollapsed={!inspectorOpen}
              statusBar={<StatusBar />}
            />
          )}

          {currentPage === "network" && (
            <div className="flex-1">
              <NetworkGraph3D />
            </div>
          )}

          {currentPage === "settings" && <ApiKeysPage />}

          {currentPage === "logs" && (
            <div className="flex-1">
              <LogViewerPage />
            </div>
          )}

          {currentPage === "terminal" && (
            <div className="flex-1 flex min-h-0">
              <div className="w-1/2 flex-none h-full border-r border-gray-700/50">
                <TerminalView />
              </div>
              <div className="w-1/2 flex-none h-full">
                <ConnectorChat />
              </div>
            </div>
          )}

          {currentPage === "help" && (
            <div className="flex-1">
              <HelpPage />
            </div>
          )}
        </div>
      </ReactFlowProvider>
    </ThemeProvider>
  );
}
