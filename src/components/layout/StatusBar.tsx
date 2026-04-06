import { useEffect, useState } from 'react'

export function StatusBar() {
  const [time, setTime] = useState(new Date().toLocaleTimeString())

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex items-center justify-between px-4 h-8 text-caption text-gray-500 dark:text-gray-400 bg-surface-secondary dark:bg-dark-surface-secondary">
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-status-success inline-block" />
          Ollama: connected
        </span>
        <span>18 agents</span>
      </div>
      <span>{time}</span>
    </div>
  )
}
