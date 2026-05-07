

interface Props {
  url: string
  onUrlChange: (val: string) => void
  preferences: string
  onPreferencesChange: (val: string) => void
  onGenerate: () => void
  disabled: boolean
}

export default function CharacterInput({ url, onUrlChange, preferences, onPreferencesChange, onGenerate, disabled }: Props) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim()) return
    onGenerate()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex gap-3">
        <input
          type="text"
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
          placeholder="Paste one or more character image URLs (separated by space)..."
          disabled={disabled}
          className="flex-1 px-4 py-2.5 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm disabled:opacity-50"
        />
      </div>
      <div className="flex gap-3">
        <textarea
          value={preferences}
          onChange={(e) => onPreferencesChange(e.target.value)}
          placeholder="Optional: Enter extra preferences or constraints (e.g. 'Must have a large cowboy hat')"
          disabled={disabled}
          className="flex-1 h-12 px-4 py-2.5 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm disabled:opacity-50 resize-y"
        />
        <button
          type="submit"
          disabled={disabled || !url.trim()}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors text-sm whitespace-nowrap"
        >
          Generate Sheet
        </button>
      </div>
    </form>
  )
}
