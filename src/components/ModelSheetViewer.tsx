import { useState, useEffect } from 'react'
import { useSessionStore } from '../store/sessionStore'

export default function ModelSheetViewer() {
  const { composedSheetUrl, characterName, agentStatus } = useSessionStore()
  const [displayUrl, setDisplayUrl] = useState(composedSheetUrl)
  const [isTransitioning, setIsTransitioning] = useState(false)

  useEffect(() => {
    if (composedSheetUrl !== displayUrl) {
      setIsTransitioning(true)
      const timer = setTimeout(() => {
        setDisplayUrl(composedSheetUrl)
        setIsTransitioning(false)
      }, 400) // smooth fade duration
      return () => clearTimeout(timer)
    }
  }, [composedSheetUrl, displayUrl])

  const handleDownload = () => {
    if (!composedSheetUrl) return
    const a = document.createElement('a')
    a.href = composedSheetUrl
    a.download = `${characterName.replace(/\s+/g, '_').toLowerCase()}_model_sheet.png`
    a.click()
  }

  const isGenerating = agentStatus !== 'idle' && agentStatus !== 'done' && agentStatus !== 'error'

  if (!composedSheetUrl && !isGenerating && !displayUrl) {
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

  if (!composedSheetUrl && isGenerating && !displayUrl) {
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
    <div className="flex-1 flex flex-col gap-3 min-h-0 w-full">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-gray-300 min-w-0 truncate">
          {characterName} — Model Sheet
        </h2>
        {/* Desktop: inline download button in the header */}
        <button
          onClick={handleDownload}
          className="hidden sm:flex items-center gap-2 px-4 py-2 bg-green-700 hover:bg-green-600 text-white font-semibold rounded-lg transition-colors text-sm flex-shrink-0"
        >
          <span>↓</span> Download PNG
        </button>
      </div>

      <div className="flex-1 bg-gray-900 rounded-xl border border-gray-700 overflow-auto min-h-0 p-2 relative">
        {displayUrl && (
          <img
            src={displayUrl}
            alt={`${characterName} model sheet`}
            className={`w-full h-auto rounded-lg transition-opacity duration-500 ease-in-out ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}
          />
        )}
      </div>

      {/* Mobile: full-width download button below the sheet */}
      <button
        onClick={handleDownload}
        className="sm:hidden flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-green-700 hover:bg-green-600 text-white font-semibold rounded-lg transition-colors text-sm"
      >
        <span>↓</span> Download PNG
      </button>
    </div>
  )
}
