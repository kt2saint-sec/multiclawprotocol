interface PaletteSearchProps {
  value: string
  onChange: (v: string) => void
}

export function PaletteSearch({ value, onChange }: PaletteSearchProps) {
  return (
    <input
      type="text"
      placeholder="Search agents..."
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-1.5 text-body-sm bg-surface-primary dark:bg-dark-surface-primary
        border border-gray-200 dark:border-gray-700 rounded-md
        placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-agent-ops"
    />
  )
}
