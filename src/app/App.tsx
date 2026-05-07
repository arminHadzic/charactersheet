import { useEffect, useState, useRef } from 'react'
import { useSessionStore } from '../store/sessionStore'
import { submitToLangGraph, submitServerless } from '../services/backendService'
import { composeModelSheet } from '../canvas/sheetComposer'
import { fetchImageAsBase64 } from '../services/imagenService'
import type { SheetPlan, SheetComponent, ComponentType } from '../agent/types'
import CharacterInput from '../components/CharacterInput'
import AgentStatusBar from '../components/AgentStatusBar'
import ModelSheetViewer from '../components/ModelSheetViewer'
import ApiKeyModal from '../components/ApiKeyModal'
import AboutModal from '../components/AboutModal'

type DemoState = 'idle' | 'typing_url' | 'generating_base' | 'showing_base' | 'typing_prompt' | 'generating_cowboy' | 'complete'

export default function App() {
  const store = useSessionStore()
  const [referenceImagesData, setReferenceImagesData] = useState<string[]>([])
  
  // Modals state
  const [showApiKeyModal, setShowApiKeyModal] = useState(false)
  const [showAboutModal, setShowAboutModal] = useState(false)
  
  // Local input state
  const [url, setUrl] = useState('')
  const [preferences, setPreferences] = useState('')
  const [apiKeyError, setApiKeyError] = useState<string | null>(null)
  
  // Demo animation state
  const [demoState, setDemoState] = useState<DemoState>('idle')
  const hasRunDemo = useRef(false)

  // Demo Animation sequence on mount
  useEffect(() => {
    if (hasRunDemo.current) return
    hasRunDemo.current = true

    let isCancelled = false
    
    const runDemo = async () => {
      // 1. Type URL
      setDemoState('typing_url')
      const targetUrl = 'https://raw.githubusercontent.com/arminHadzic/arminHadzic.github.io/refs/heads/master/assets/images/penguin.png'
      for (let i = 0; i <= targetUrl.length; i++) {
        if (isCancelled) return
        setUrl(targetUrl.substring(0, i))
        await new Promise(r => setTimeout(r, 10)) 
      }
      
      await new Promise(r => setTimeout(r, 400))
      
      // 2. Generate Base
      setDemoState('generating_base')
      store.setAgentStatus('analyzing', 'Extracting stylistic constraints and dispatching to backend pipeline...')
      
      const b64 = await fetchImageAsBase64(targetUrl)
      if (b64 && !isCancelled) {
        setReferenceImagesData([`data:image/png;base64,${b64}`])
      }
      
      await new Promise(r => setTimeout(r, 1200))
      
      // 3. Show Base
      if (isCancelled) return
      store.setAgentStatus('idle', '')
      setDemoState('showing_base')
      store.setComposedSheet('https://raw.githubusercontent.com/arminHadzic/arminHadzic.github.io/refs/heads/master/assets/images/penguin_character_sheet.png')
      
      await new Promise(r => setTimeout(r, 1500))
      
      // 4. Type Prompt
      setDemoState('typing_prompt')
      const targetPrompt = 'Have the character wear a cowboy hat.'
      for (let i = 0; i <= targetPrompt.length; i++) {
        if (isCancelled) return
        setPreferences(targetPrompt.substring(0, i))
        await new Promise(r => setTimeout(r, 30))
      }
      
      await new Promise(r => setTimeout(r, 400))
      
      // 5. Generate Cowboy
      setDemoState('generating_cowboy')
      store.setAgentStatus('generating', 'Synthesizing new components with constraints...')
      
      await new Promise(r => setTimeout(r, 1200))
      
      // 6. Show Cowboy
      if (isCancelled) return
      store.setAgentStatus('idle', '')
      store.setComposedSheet('https://raw.githubusercontent.com/arminHadzic/arminHadzic.github.io/refs/heads/master/assets/images/penguin_character_sheet_hat.png')
      
      await new Promise(r => setTimeout(r, 2000))
      
      // 7. Erase Cowboy
      for (let i = targetPrompt.length; i >= 0; i--) {
        if (isCancelled) return
        setPreferences(targetPrompt.substring(0, i))
        await new Promise(r => setTimeout(r, 20))
      }
      
      await new Promise(r => setTimeout(r, 200))
      store.setComposedSheet('https://raw.githubusercontent.com/arminHadzic/arminHadzic.github.io/refs/heads/master/assets/images/penguin_character_sheet.png')
      setDemoState('complete')
    }
    
    runDemo()
    
    return () => { isCancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // React to LangGraph composition trigger
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

  const isProcessing = store.agentStatus === 'analyzing' || store.agentStatus === 'generating' || store.agentStatus === 'composing' || demoState !== 'complete'

  const executeGeneration = async (serverless: boolean) => {
    store.reset()
    store.setCharacterUrl(url)
    setReferenceImagesData([])
    store.setAgentStatus('analyzing', serverless ? 'Generating directly with Gemini API...' : 'Extracting constraints and dispatching to LangGraph pipeline...')

    const urlArray = url.trim().split(/\s+/)
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
      let mappedComponents: SheetComponent[]
      
      if (serverless) {
        const response = await submitServerless(store.apiKey, b64s, preferences)
        mappedComponents = response.components.map(c => ({
          id: c.id,
          type: c.type as ComponentType,
          label: c.type.replace(/_/g, ' ').toUpperCase(),
          generationPrompt: '',
          status: 'done',
          imageData: c.imageData
        }))
      } else {
        const response = await submitToLangGraph(store.apiKey, b64s, preferences)
        mappedComponents = response.components.map(c => ({
          id: c.id,
          type: c.type as ComponentType,
          label: c.type.replace(/_/g, ' ').toUpperCase(),
          generationPrompt: '',
          status: 'done',
          imageData: c.imageData
        }))
      }

      if (serverless && mappedComponents.length > 0) {
        store.setAgentStatus('idle', '')
        if (mappedComponents[0].imageData) {
          store.setComposedSheet(mappedComponents[0].imageData)
        }
      } else {
        const plan: SheetPlan = {
          characterName: 'Character',
          components: mappedComponents,
          layoutPreference: 'hierarchical',
        }
        
        store.setAgentStatus('composing', 'Combining component assets...')
        store.setSheetPlan(plan)
        store.setCharacterName('Character')
        store.triggerCompose('Character')
      }
      
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      store.setAgentStatus('error', msg)
    }
  }

  const handleGenerateClick = () => {
    if (!store.apiKey) {
      setApiKeyError('Please click "Setup API Key" above and provide your Google AI Studio API key to get started.')
    } else {
      setApiKeyError(null)
      executeGeneration(store.isServerlessMode)
    }
  }

  const handleApiKeyModalContinue = (serverless: boolean) => {
    store.setServerlessMode(serverless)
    // Removed automatic execution per request
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
            onClick={() => setShowAboutModal(true)}
            className="text-xs px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-full border border-white/10 transition-colors shadow-sm cursor-pointer"
          >
            About
          </button>
          <button
            onClick={() => { setShowApiKeyModal(true); setApiKeyError(null) }}
            className={`text-xs px-4 py-2 rounded-full border transition-all duration-700 shadow-sm cursor-pointer ${
              (demoState === 'complete' && !store.apiKey) || apiKeyError
                ? 'bg-blue-600/20 text-blue-100 border-blue-400/50 shadow-[0_0_15px_rgba(96,165,250,0.4)] animate-pulse' 
                : 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/10'
            }`}
          >
            {store.apiKey ? 'Change Key / Settings' : 'Setup API Key'}
          </button>
        </div>
      </header>

      {/* URL Input */}
      <div className="border-b border-white/10 px-6 py-5 bg-white/5 backdrop-blur-sm z-10 shadow-sm relative">
        <CharacterInput 
          url={url}
          onUrlChange={setUrl}
          preferences={preferences}
          onPreferencesChange={setPreferences}
          onGenerate={handleGenerateClick} 
          disabled={isProcessing} 
        />
        {apiKeyError && (
          <div className="absolute bottom-1 left-6 right-6 text-center text-red-400 text-xs font-medium animate-bounce">
            {apiKeyError}
          </div>
        )}
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

      {showApiKeyModal && (
        <ApiKeyModal 
          onClose={() => setShowApiKeyModal(false)} 
          onContinue={handleApiKeyModalContinue} 
        />
      )}

      {showAboutModal && (
        <AboutModal 
          onClose={() => setShowAboutModal(false)} 
        />
      )}
    </div>
  )
}
