import { useEffect, useState, useCallback } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { AppLayout } from "./components/layout/AppLayout";
import { ThemeProvider, ThemeToggle } from "./components/layout/ThemeToggle";
import { StatusBar } from "./components/layout/StatusBar";
import { PipelineCanvas } from "./components/canvas/PipelineCanvas";
import { AgentPalette } from "./components/palette/AgentPalette";
import { InspectorWrapper } from "./components/inspector/InspectorWrapper";
import { SignupPortal } from "./components/auth/SignupPortal";
import { useExecutionEvents } from "./hooks/useExecutionEvents";
import { useAgentRegistryStore } from "./stores/agentRegistryStore";
import { DEMO_AGENTS } from "./data/demo-agents";
import "./styles/globals.css";

export default function App() {
  useExecutionEvents();

  const [authenticated, setAuthenticated] = useState(() =>
    Boolean(localStorage.getItem("anvilbus-auth")),
  );

  const handleAuthenticated = useCallback(() => setAuthenticated(true), []);

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
        <AppLayout
          palette={
            <div className="flex items-center gap-2">
              <div className="flex-none flex items-center gap-2 px-3">
                <h2 className="text-caption font-bold tracking-widest text-surface-accent dark:text-gray-300">
                  AGENTS
                </h2>
                <ThemeToggle />
              </div>
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
      </ReactFlowProvider>
    </ThemeProvider>
  );
}
