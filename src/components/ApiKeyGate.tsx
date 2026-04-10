import { useState } from 'react'
import { useSessionStore } from '../store/sessionStore'
import { initGemini } from '../services/geminiService'

export default function ApiKeyGate({ children }: { children: React.ReactNode }) {
  const { apiKey, setApiKey } = useSessionStore()
  const [inputKey, setInputKey] = useState('')
  const [error, setError] = useState('')

  if (apiKey) {
    initGemini(apiKey)
    return <>{children}</>
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = inputKey.trim()
    if (!trimmed.startsWith('AIza')) {
      setError('That doesn\'t look like a valid Google AI Studio key. Keys start with "AIza".')
      return
    }
    setApiKey(trimmed)
    initGemini(trimmed)
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-10 max-w-lg w-full shadow-2xl">
        <div className="mb-8 text-center">
          <div className="text-5xl mb-4">🎨</div>
          <h1 className="text-2xl font-bold text-white mb-2">Character Model Sheet Generator</h1>
          <p className="text-gray-400 text-sm leading-relaxed">
            Enter your Google AI Studio API key to get started. Your key is stored locally in your
            browser and never sent anywhere except Google's API.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Google AI Studio API Key
            </label>
            <input
              type="password"
              value={inputKey}
              onChange={(e) => { setInputKey(e.target.value); setError('') }}
              placeholder="AIzaSy..."
              className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 font-mono text-sm"
              autoFocus
            />
            {error && <p className="mt-2 text-red-400 text-sm">{error}</p>}
          </div>

          <button
            type="submit"
            disabled={!inputKey.trim()}
            className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
          >
            Continue
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-gray-500">
          Get a free key at{' '}
          <span className="text-blue-400">aistudio.google.com</span>
        </p>
      </div>
    </div>
  )
}
