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
import { useExecutionEvents } from "./hooks/useExecutionEvents";
import { useAgentRegistryStore } from "./stores/agentRegistryStore";
import { DEMO_AGENTS } from "./data/demo-agents";
import "./styles/globals.css";

export default function App() {
  useExecutionEvents();

  const [authenticated, setAuthenticated] = useState(() =>
    Boolean(localStorage.getItem("anvilbus-auth")),
  );
  const [currentPage, setCurrentPage] = useState("canvas");

  const handleAuthenticated = useCallback(() => setAuthenticated(true), []);

  const handleSignOut = useCallback(() => {
    localStorage.removeItem("anvilbus-auth");
    setAuthenticated(false);
  }, []);

  const userEmail = (() => {
    try {
      const stored = localStorage.getItem("anvilbus-auth");
      return stored ? JSON.parse(stored).email : null;
    } catch {
      return null;
    }
  })();

  // Load demo agents on mount
  useEffect(() => {
    useAgentRegistryStore.getState().registerAgents(DEMO_AGENTS);
  }, []);

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
            userEmail={userEmail}
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
                  <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-caption font-bold tracking-widest text-surface-accent dark:text-gray-300">
                      INSPECTOR
                    </h2>
                  </div>
                  <InspectorWrapper />
                </div>
              }
              statusBar={<StatusBar />}
            />
          )}

          {currentPage === "network" && (
            <div className="flex-1">
              <NetworkGraph3D />
            </div>
          )}

          {currentPage === "settings" && <ApiKeysPage />}
        </div>
      </ReactFlowProvider>
    </ThemeProvider>
  );
}
