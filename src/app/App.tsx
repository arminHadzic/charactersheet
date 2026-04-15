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
  const [referenceImagesData, setReferenceImagesData] = useState<string[]>([])

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

  const handleGenerate = async (urlsString: string, preferences: string) => {
    store.reset()
    store.setCharacterUrl(urlsString)
    setReferenceImagesData([])
    store.setAgentStatus('analyzing', 'Extracting stylistic constraints and dispatching to backend pipeline...')

    const urlArray = urlsString.trim().split(/\s+/)
    const b64s: string[] = []

    for (const u of urlArray) {
      if (!u) continue
      try {
        const b64 = await fetchImageAsBase64(u)
        if (b64) {
          b64s.push(b64)
          setReferenceImagesData(prev => [...prev, `data:image/png;base64,${b64}`])
        }
      } catch (e) {
        console.warn("Could not fetch preview image", e)
      }
    }

    try {
      // Direct call to local python backend
      const response = await submitToLangGraph(store.apiKey, b64s, preferences)
      
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-gray-900 to-slate-900 text-white flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-md px-6 py-4 flex items-center justify-between shadow-sm z-10">
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Character Model Sheet Generator</h1>
          <p className="text-xs text-gray-400 mt-1">Powered by FastAPI, LangGraph, and Gemini 3.1 Flash Image</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              localStorage.removeItem('gemini_api_key')
              window.location.reload()
            }}
            className="text-xs px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-full border border-white/10 transition-colors shadow-sm cursor-pointer"
          >
            Switch API Key
          </button>
        </div>
      </header>

      {/* URL Input */}
      <div className="border-b border-white/10 px-6 py-5 bg-white/5 backdrop-blur-sm z-10 shadow-sm relative">
        <CharacterInput onGenerate={handleGenerate} disabled={isProcessing} />
      </div>

      {/* Status Bar */}
      {store.agentStatus !== 'idle' && (
        <div className="px-6 py-3 border-b border-white/10 bg-indigo-900/30 backdrop-blur-md">
          <AgentStatusBar />
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* Left sidebar: Reference Image Display */}
        <div className="w-80 flex-shrink-0 border-r border-white/10 flex flex-col p-5 bg-black/30 backdrop-blur-2xl overflow-y-auto shadow-2xl relative z-10 filter drop-shadow-lg">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 border-b border-white/10 pb-3 flex items-center justify-between">
            <span>References</span>
            {referenceImagesData.length > 0 && (
              <span className="bg-blue-600/30 text-blue-300 py-0.5 px-2 rounded-full font-mono text-[10px]">{referenceImagesData.length}</span>
            )}
          </h2>
          {referenceImagesData.length > 0 ? (
            <div className="flex flex-col gap-4">
              {referenceImagesData.map((src, idx) => (
                <div key={idx} className="p-2 bg-white/5 border border-white/10 rounded-xl shadow-lg relative group">
                  <span className="absolute -top-2 -left-2 bg-blue-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-md z-10">{idx+1}</span>
                  <img src={src} alt={`Ref ${idx}`} className="w-full rounded-lg shadow-inner bg-white" />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-500 text-sm p-6 text-center border-2 border-dashed border-white/10 rounded-2xl bg-white/5 my-4">
               {isProcessing ? "Fetching image data..." : "Add URLs above to build a multi-angle context."}
            </div>
          )}
        </div>

        {/* Main panel: model sheet */}
        <div className="flex-1 p-8 flex flex-col min-h-0 overflow-auto items-center justify-center bg-transparent">
          <ModelSheetViewer />
        </div>
      </div>
    </div>
  )
}
