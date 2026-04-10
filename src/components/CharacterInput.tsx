import { useState } from 'react'
import { useSessionStore } from '../store/sessionStore'

interface Props {
  onGenerate: (url: string) => void
  disabled: boolean
}

export default function CharacterInput({ onGenerate, disabled }: Props) {
  const { characterUrl, setCharacterUrl } = useSessionStore()
  const [localUrl, setLocalUrl] = useState(characterUrl)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = localUrl.trim()
    if (!trimmed) return
    setCharacterUrl(trimmed)
    onGenerate(trimmed)
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-3">
      <input
        type="url"
        value={localUrl}
        onChange={(e) => setLocalUrl(e.target.value)}
        placeholder="Paste a character image URL..."
        disabled={disabled}
        className="flex-1 px-4 py-2.5 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={disabled || !localUrl.trim()}
        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors text-sm whitespace-nowrap"
      >
        Generate Sheet
      </button>
    </form>
  )
}
