import { useEffect, useState } from 'react'
import { useSessionStore } from '../store/sessionStore'
import { submitToLangGraph } from '../services/backendService'
import { composeModelSheet } from '../canvas/sheetComposer'
import { fetchImageAsBase64 } from '../services/imagenService'
import type { SheetPlan, SheetComponent, ComponentType } from '../agent/types'
import ApiKeyGate from '../components/ApiKeyGate'
import CharacterInput from '../components/CharacterInput'
import AgentStatusBar from '../components/AgentStatusBar'
import ModelSheetViewer from '../components/ModelSheetViewer'

export default function App() {
  return (
    <ApiKeyGate>
      <MainApp />
    </ApiKeyGate>
  )
}

function MainApp() {
  const store = useSessionStore()
  const [referenceImageDataUrl, setReferenceImageDataUrl] = useState<string | null>(null)

  // React to compositionTrigger
  useEffect(() => {
    if (store.compositionTrigger === 0) return
    const components = store.getComponents()
    const doneComponents = components.filter((c) => c.status === 'done' && c.imageData)
    if (doneComponents.length === 0) return

    composeModelSheet(doneComponents, store.characterName || 'Character')
      .then((dataUrl) => store.setComposedSheet(dataUrl))
      .catch((err) => {
        store.setAgentStatus('error', String(err))
      })
  }, [store.compositionTrigger, store])

  const isProcessing = store.agentStatus === 'analyzing' || store.agentStatus === 'generating' || store.agentStatus === 'composing'

  const handleGenerate = async (url: string, preferences: string) => {
    store.reset()
    store.setCharacterUrl(url)
    setReferenceImageDataUrl(null)
    store.setAgentStatus('analyzing', 'Extracting stylistic constraints and dispatching to backend pipeline...')

    try {
      const b64 = await fetchImageAsBase64(url)
      if (b64) {
        setReferenceImageDataUrl(`data:image/png;base64,${b64}`)
      }
    } catch (e) {
      console.warn("Could not fetch preview image", e)
    }

    try {
      // Direct call to local python backend
      const response = await submitToLangGraph(store.apiKey, url, preferences)
      
      const mappedComponents: SheetComponent[] = response.components.map(c => ({
        id: c.id,
        type: c.type as ComponentType,
        label: c.type.replace(/_/g, ' ').toUpperCase(),
        generationPrompt: '',
        status: 'done',
        imageData: c.imageData
      }))

      const plan: SheetPlan = {
        characterName: 'Character', // Could be extracted dynamically if we wanted to
        components: mappedComponents,
        layoutPreference: 'hierarchical',
      }
      
      store.setAgentStatus('composing', 'Combining component assets...')
      store.setSheetPlan(plan)
      store.setCharacterName('Character')
      store.triggerCompose('Character')
      
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      store.setAgentStatus('error', msg)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white">Character Model Sheet Generator</h1>
          <p className="text-xs text-gray-400">Powered by FastAPI, LangGraph, and Imagen 4</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              localStorage.removeItem('gemini_api_key')
              window.location.reload()
            }}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            Change API Key
          </button>
        </div>
      </header>

      {/* URL Input */}
      <div className="border-b border-gray-800 px-6 py-4">
        <CharacterInput onGenerate={handleGenerate} disabled={isProcessing} />
      </div>

      {/* Status Bar */}
      {store.agentStatus !== 'idle' && (
        <div className="px-6 py-2 border-b border-gray-800">
          <AgentStatusBar />
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left sidebar: Reference Image Display */}
        <div className="w-80 flex-shrink-0 border-r border-gray-800 flex flex-col p-4 bg-gray-900 overflow-y-auto">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4 border-b border-gray-800 pb-2">Reference Image</h2>
          {referenceImageDataUrl ? (
            <img src={referenceImageDataUrl} alt="Reference" className="w-full rounded-md shadow-md border border-gray-700" />
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-600 text-xs italic text-center p-4">
               {isProcessing ? "Loading reference image..." : "No reference image active. Paste a URL and click Generate."}
            </div>
          )}
        </div>

        {/* Main panel: model sheet */}
        <div className="flex-1 p-6 flex flex-col min-h-0 overflow-auto items-center justify-center bg-gray-900/50">
          <ModelSheetViewer />
        </div>
      </div>
    </div>
  )
}
