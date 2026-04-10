import { useSessionStore } from '../store/sessionStore'

const STATUS_LABELS: Record<string, string> = {
  idle: '',
  analyzing: 'Analyzing character...',
  planning: 'Planning model sheet...',
  generating: '',
  composing: 'Composing final sheet...',
  done: 'Model sheet ready!',
  error: 'Something went wrong.',
}

export default function AgentStatusBar() {
  const { agentStatus, agentStatusDetail } = useSessionStore()

  if (agentStatus === 'idle') return null

  const label = agentStatusDetail || STATUS_LABELS[agentStatus] || ''
  const isActive = agentStatus !== 'done' && agentStatus !== 'error'

  return (
    <div
      className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium ${
        agentStatus === 'done'
          ? 'bg-green-900/40 text-green-300 border border-green-700/40'
          : agentStatus === 'error'
          ? 'bg-red-900/40 text-red-300 border border-red-700/40'
          : 'bg-blue-900/40 text-blue-300 border border-blue-700/40'
      }`}
    >
      {isActive && (
        <span className="inline-block w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
      )}
      {agentStatus === 'done' && <span>✓</span>}
      {agentStatus === 'error' && <span>✕</span>}
      <span>{label}</span>
    </div>
  )
}
