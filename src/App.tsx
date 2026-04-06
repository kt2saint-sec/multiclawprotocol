import { AppLayout } from './components/layout/AppLayout'
import { ThemeProvider, ThemeToggle } from './components/layout/ThemeToggle'
import { StatusBar } from './components/layout/StatusBar'
import './styles/globals.css'

export default function App() {
  return (
    <ThemeProvider>
      <AppLayout
        palette={
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold tracking-widest text-surface-accent dark:text-gray-300">AGENTS</h2>
              <ThemeToggle />
            </div>
            <p className="text-caption text-gray-500">Drag agents onto the canvas</p>
          </div>
        }
        canvas={
          <div className="flex items-center justify-center h-full text-gray-400">
            Pipeline Canvas
          </div>
        }
        inspector={
          <div className="p-4">
            <h2 className="text-sm font-bold tracking-widest text-surface-accent dark:text-gray-300">INSPECTOR</h2>
            <p className="text-caption text-gray-500 mt-2">Select a node to inspect</p>
          </div>
        }
        statusBar={<StatusBar />}
      />
    </ThemeProvider>
  )
}
