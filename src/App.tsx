import { ReactFlowProvider } from '@xyflow/react'
import { AppLayout } from './components/layout/AppLayout'
import { ThemeProvider, ThemeToggle } from './components/layout/ThemeToggle'
import { StatusBar } from './components/layout/StatusBar'
import { PipelineCanvas } from './components/canvas/PipelineCanvas'
import { AgentPalette } from './components/palette/AgentPalette'
import { InspectorPanel } from './components/inspector/InspectorPanel'
import './styles/globals.css'

export default function App() {
  return (
    <ThemeProvider>
      <ReactFlowProvider>
        <AppLayout
          palette={
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-caption font-bold tracking-widest text-surface-accent dark:text-gray-300">AGENTS</h2>
                <ThemeToggle />
              </div>
              <AgentPalette />
            </div>
          }
          canvas={<PipelineCanvas />}
          inspector={
            <div className="flex flex-col h-full">
              <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-caption font-bold tracking-widest text-surface-accent dark:text-gray-300">INSPECTOR</h2>
              </div>
              <InspectorPanel selectedAgent={null} />
            </div>
          }
          statusBar={<StatusBar />}
        />
      </ReactFlowProvider>
    </ThemeProvider>
  )
}
