import { useState } from 'react'
import { useSessionStore } from '../store/sessionStore'
import { initGemini } from '../services/geminiService'

interface ApiKeyModalProps {
  onClose: () => void
  onContinue: (serverless: boolean) => void
}

export default function ApiKeyModal({ onClose, onContinue }: ApiKeyModalProps) {
  const { apiKey, setApiKey } = useSessionStore()
  const [inputKey, setInputKey] = useState(apiKey || '')
  const [error, setError] = useState('')

  const handleValidation = (key: string) => {
    const trimmed = key.trim()
    if (!trimmed.startsWith('AIza')) {
      setError('That doesn\'t look like a valid Google AI Studio key. Keys start with "AIza".')
      return false
    }
    setApiKey(trimmed)
    initGemini(trimmed)
    return true
  }

  const [successMode, setSuccessMode] = useState<'server' | 'serverless' | null>(null)

  const handleServerRun = async () => {
    if (!handleValidation(inputKey)) return;
    
    try {
      const res = await fetch('http://127.0.0.1:8000/docs', { method: 'HEAD' }).catch(() => null);
      if (!res || !res.ok) {
        setError('Local server not detected. Please ensure the Python backend is running.')
        return;
      }
    } catch (e) {
      setError('Local server not detected. Please ensure the Python backend is running.')
      return;
    }
    
    setSuccessMode('server')
    onContinue(false)
  }

  const handleServerlessRun = () => {
    if (handleValidation(inputKey)) {
      setSuccessMode('serverless')
      onContinue(true)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 max-w-lg w-full shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white bg-gray-800 rounded-full p-2 w-8 h-8 flex items-center justify-center">
          ✕
        </button>
        <div className="mb-6 text-center">
          <div className="text-4xl mb-3">🔑</div>
          <h2 className="text-xl font-bold text-white mb-2">API Key Required</h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            Enter your Google AI Studio API key to generate your own model sheets. Your key is stored locally in your browser.
          </p>
        </div>

        <div className="space-y-4 mb-6">
          <div>
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
        </div>

        <div className="space-y-3">
          <div className="p-4 bg-blue-900/20 border border-blue-800/50 rounded-lg">
            <h3 className="text-blue-300 font-semibold mb-1 text-sm">Full LangGraph Workflow (Recommended)</h3>
            <p className="text-gray-400 text-xs mb-3">Requires running the local FastAPI server from the <a href="https://github.com/arminHadzic/charactersheet" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">server repository</a>.</p>
            <button
              onClick={handleServerRun}
              disabled={!inputKey.trim()}
              className={`w-full py-2 px-4 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors ${
                successMode === 'server' ? 'bg-green-600 hover:bg-green-500' : 'bg-blue-600 hover:bg-blue-500'
              }`}
            >
              {successMode === 'server' ? '✓ Configured' : 'Run with Local Server'}
            </button>
          </div>

          <div className="p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
            <h3 className="text-gray-300 font-semibold mb-1 text-sm">Serverless Mode (Limited)</h3>
            <p className="text-gray-400 text-xs mb-3">Bypasses the LangGraph agent and calls Gemini directly. Generates a single composite image without multiple steps.</p>
            <button
              onClick={handleServerlessRun}
              disabled={!inputKey.trim()}
              className={`w-full py-2 px-4 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors ${
                successMode === 'serverless' ? 'bg-green-600 hover:bg-green-500' : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              {successMode === 'serverless' ? '✓ Configured' : 'Run Serverless'}
            </button>
          </div>
        </div>

        <p className="mt-5 text-center text-xs text-gray-500">
          Get a free key at <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">aistudio.google.com</a>
        </p>
      </div>
    </div>
  )
}
