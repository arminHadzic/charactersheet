import { useEffect, useRef, useState } from 'react'
import { useSessionStore } from '../store/sessionStore'
import { AgentOrchestrator } from '../agent/orchestrator'
import { analyzeAndPlanSheet } from '../services/geminiService'
import { generateImage, fetchImageAsBase64 } from '../services/imagenService'
import { composeModelSheet } from '../canvas/sheetComposer'
import { generateColorPaletteImage } from '../canvas/colorPaletteCanvas'
import type { SheetPlan, SheetComponent, ComponentType } from '../agent/types'
import ApiKeyGate from '../components/ApiKeyGate'
import CharacterInput from '../components/CharacterInput'
import AgentStatusBar from '../components/AgentStatusBar'
import ComponentGrid from '../components/ComponentGrid'
import ChatPanel from '../components/ChatPanel'
import ModelSheetViewer from '../components/ModelSheetViewer'

const IMAGEN_DEMO_PROMPT =
  'Invader Zim, cartoon alien character with green skin, magenta eyes, and black uniform with pink stripes, ' +
  'full body front view standing upright, white background, animation model sheet style, clean linework'

export default function App() {
  return (
    <ApiKeyGate>
      <MainApp />
    </ApiKeyGate>
  )
}

function MainApp() {
  const store = useSessionStore()
  const orchestratorRef = useRef<AgentOrchestrator | null>(null)
  const [demoStatus, setDemoStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [demoImageUrl, setDemoImageUrl] = useState<string | null>(null)
  const [demoError, setDemoError] = useState<string | null>(null)

  const handleImagenDemo = async () => {
    if (!store.apiKey) return
    setDemoStatus('loading')
    setDemoImageUrl(null)
    setDemoError(null)
    try {
      const dataUrl = await generateImage(store.apiKey, IMAGEN_DEMO_PROMPT)
      setDemoImageUrl(dataUrl)
      setDemoStatus('done')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setDemoError(msg)
      setDemoStatus('error')
    }
  }

  // Initialize orchestrator when API key is available
  useEffect(() => {
    if (!store.apiKey) return

    orchestratorRef.current = new AgentOrchestrator(store.apiKey, {
      onChatMessage: (role, text) => store.addMessage(role, text),
      onStatusUpdate: (detail) => {
        if (detail.toLowerCase().includes('analyzing')) {
          store.setAgentStatus('analyzing', detail)
        } else if (detail.toLowerCase().includes('planning')) {
          store.setAgentStatus('planning', detail)
        } else if (detail.toLowerCase().includes('generating') || detail.toLowerCase().includes('refining')) {
          store.setAgentStatus('generating', detail)
        } else if (detail.toLowerCase().includes('composing')) {
          store.setAgentStatus('composing', detail)
        } else if (!detail) {
          // Keep current status, just clear detail
        }
      },
      onPlanUpdate: (plan) => store.setSheetPlan(plan),
      onComponentUpdate: (id, update) => store.updateComponent(id, update),
      onCompose: (characterName) => {
        store.setCharacterName(characterName)
        store.triggerCompose(characterName)
      },
      onError: (msg) => {
        store.setAgentStatus('error', msg)
        store.addMessage('agent', `Error: ${msg}`)
      },
      getComponents: () => store.getComponents(),
    })
  }, [store.apiKey])

  // React to compositionTrigger
  useEffect(() => {
    if (store.compositionTrigger === 0) return
    const components = store.getComponents()
    const doneComponents = components.filter((c) => c.status === 'done' && c.imageData)
    if (doneComponents.length === 0) return

    composeModelSheet(doneComponents, store.characterName)
      .then((dataUrl) => store.setComposedSheet(dataUrl))
      .catch(console.error)
  }, [store.compositionTrigger])

  const isProcessing = store.agentStatus !== 'idle' && store.agentStatus !== 'done' && store.agentStatus !== 'error'

  const handleGenerate = async (url: string) => {
    store.reset()
    store.setCharacterUrl(url)
    store.setAgentStatus('analyzing', 'Reading character image...')

    // Step 1: single Gemini call — analyze image + get all component prompts
    let analysis: Awaited<ReturnType<typeof analyzeAndPlanSheet>>
    try {
      analysis = await analyzeAndPlanSheet(store.apiKey, url)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      store.setAgentStatus('error', msg)
      store.addMessage('agent', `Error: ${msg}`)
      return
    }

    store.addMessage('agent', analysis.summary)
    store.setCharacterName(analysis.characterName)

    // Step 2: build color palette component immediately from extracted colors (no Imagen needed)
    const colorPaletteComponent: SheetComponent = {
      id: 'color_palette',
      type: 'color_palette' as ComponentType,
      label: 'Color Palette',
      generationPrompt: '',
      status: 'done',
      imageData: generateColorPaletteImage(analysis.colorPalette, analysis.characterName),
    }

    // Register all components — Imagen ones as pending, color palette already done
    const plan: SheetPlan = {
      characterName: analysis.characterName,
      components: [
        ...analysis.components.map((c) => ({
          id: c.id,
          type: c.type as ComponentType,
          label: c.label,
          generationPrompt: c.prompt,
          status: 'pending' as const,
        })),
        colorPaletteComponent,
      ],
      layoutPreference: 'grid',
    }
    store.setSheetPlan(plan)

    // Step 3: try to fetch reference image as base64 for Imagen subject conditioning
    const referenceBase64 = await fetchImageAsBase64(url)
    if (referenceBase64) {
      store.addMessage('agent', 'Reference image loaded — passing to Imagen for character consistency.')
    } else {
      store.addMessage('agent', 'Note: reference image could not be fetched (likely a CORS restriction on this URL). Imagen will rely on the text description only — style fidelity may be reduced.')
    }

    // Step 4: generate all Imagen components in parallel
    const total = analysis.components.length
    let doneCount = 0
    store.setAgentStatus('generating', `Generating components: 0/${total}`)

    await Promise.allSettled(
      analysis.components.map(async (c) => {
        store.updateComponent(c.id, { status: 'generating' })
        try {
          const imageData = await generateImage(store.apiKey, c.prompt, referenceBase64)
          store.updateComponent(c.id, { status: 'done', imageData })
          doneCount++
          store.setAgentStatus('generating', `Generating components: ${doneCount}/${total}`)
        } catch (err) {
          store.updateComponent(c.id, { status: 'error' })
        }
      }),
    )

    // Step 5: compose
    store.triggerCompose(analysis.characterName)
  }

  const handleSendMessage = async (message: string) => {
    if (!orchestratorRef.current) return
    store.addMessage('user', message)
    store.setAgentStatus('generating')
    try {
      await orchestratorRef.current.runTurn(message)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      store.setAgentStatus('error', msg)
      store.addMessage('agent', `Error: ${msg}`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white">Character Model Sheet Generator</h1>
          <p className="text-xs text-gray-400">AI-powered animation reference tool</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleImagenDemo}
            disabled={demoStatus === 'loading'}
            className="text-xs bg-indigo-700 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded transition-colors"
          >
            {demoStatus === 'loading' ? 'Running Imagen demo...' : 'Imagen Demo Test'}
          </button>
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

      {/* Imagen Demo Result */}
      {demoStatus !== 'idle' && (
        <div className="border-b border-gray-800 px-6 py-4 bg-gray-900">
          <p className="text-xs font-semibold text-indigo-400 mb-2">Imagen Demo (no Gemini involved)</p>
          {demoStatus === 'loading' && (
            <p className="text-xs text-gray-400">Sending request to Imagen 3...</p>
          )}
          {demoStatus === 'error' && (
            <p className="text-xs text-red-400">Error: {demoError}</p>
          )}
          {demoStatus === 'done' && demoImageUrl && (
            <img src={demoImageUrl} alt="Imagen demo output" className="max-h-64 rounded border border-gray-700" />
          )}
        </div>
      )}

      {/* Status Bar */}
      {store.agentStatus !== 'idle' && (
        <div className="px-6 py-2 border-b border-gray-800">
          <AgentStatusBar />
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left sidebar: chat + components */}
        <div className="w-80 flex-shrink-0 border-r border-gray-800 flex flex-col p-4 gap-4 overflow-hidden">
          <div className="flex-1 min-h-0 flex flex-col">
            <ChatPanel onSendMessage={handleSendMessage} disabled={isProcessing} />
          </div>
          <ComponentGrid />
        </div>

        {/* Main panel: model sheet */}
        <div className="flex-1 p-6 flex flex-col min-h-0 overflow-auto">
          <ModelSheetViewer />
        </div>
      </div>
    </div>
  )
}
