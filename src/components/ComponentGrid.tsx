import { useSessionStore } from '../store/sessionStore'
import type { SheetComponent } from '../agent/types'

function ComponentCard({ component }: { component: SheetComponent }) {
  const statusColors = {
    pending: 'border-gray-700 bg-gray-800/50',
    generating: 'border-blue-600 bg-blue-900/20',
    done: 'border-green-700 bg-green-900/10',
    error: 'border-red-700 bg-red-900/20',
  }

  const statusIcons = {
    pending: <span className="text-gray-500 text-xs">Pending</span>,
    generating: (
      <span className="inline-block w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
    ),
    done: <span className="text-green-400 text-xs">✓</span>,
    error: <span className="text-red-400 text-xs">✕</span>,
  }

  return (
    <div
      className={`rounded-lg border overflow-hidden transition-all duration-300 ${statusColors[component.status]}`}
    >
      {component.imageData ? (
        <img
          src={component.imageData}
          alt={component.label}
          className="w-full aspect-square object-cover"
        />
      ) : (
        <div className="w-full aspect-square flex items-center justify-center">
          {statusIcons[component.status]}
        </div>
      )}
      <div className="px-2 py-1.5 flex items-center justify-between gap-2">
        <span className="text-xs text-gray-300 truncate font-medium">{component.label}</span>
        {component.status !== 'pending' && statusIcons[component.status]}
      </div>
    </div>
  )
}

export default function ComponentGrid() {
  const { sheetPlan } = useSessionStore()

  if (!sheetPlan) return null

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
        Components ({sheetPlan.components.filter((c) => c.status === 'done').length}/
        {sheetPlan.components.length})
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {sheetPlan.components.map((c) => (
          <ComponentCard key={c.id} component={c} />
        ))}
      </div>
    </div>
  )
}
