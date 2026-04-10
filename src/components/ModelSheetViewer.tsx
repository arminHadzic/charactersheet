import { useSessionStore } from '../store/sessionStore'

export default function ModelSheetViewer() {
  const { composedSheetUrl, characterName, agentStatus } = useSessionStore()

  const handleDownload = () => {
    if (!composedSheetUrl) return
    const a = document.createElement('a')
    a.href = composedSheetUrl
    a.download = `${characterName.replace(/\s+/g, '_').toLowerCase()}_model_sheet.png`
    a.click()
  }

  const isGenerating = agentStatus !== 'idle' && agentStatus !== 'done' && agentStatus !== 'error'

  if (!composedSheetUrl && !isGenerating) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-900 rounded-xl border border-gray-700 min-h-[400px]">
        <div className="text-center text-gray-500">
          <div className="text-6xl mb-4">📋</div>
          <p className="text-lg font-medium text-gray-400">Your model sheet will appear here</p>
          <p className="text-sm mt-1">Paste a character URL and click Generate Sheet to begin</p>
        </div>
      </div>
    )
  }

  if (!composedSheetUrl && isGenerating) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-900 rounded-xl border border-gray-700 min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Generating your model sheet...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col gap-3 min-h-0">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-300">
          {characterName} — Model Sheet
        </h2>
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 px-4 py-2 bg-green-700 hover:bg-green-600 text-white font-semibold rounded-lg transition-colors text-sm"
        >
          <span>↓</span> Download PNG
        </button>
      </div>

      <div className="flex-1 bg-gray-900 rounded-xl border border-gray-700 overflow-auto min-h-0 p-2">
        {composedSheetUrl && (
          <img
            src={composedSheetUrl}
            alt={`${characterName} model sheet`}
            className="w-full h-auto rounded-lg"
          />
        )}
      </div>
    </div>
  )
}
