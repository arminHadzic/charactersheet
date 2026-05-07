

interface AboutModalProps {
  onClose: () => void
}

export default function AboutModal({ onClose }: AboutModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 max-w-2xl w-full shadow-2xl overflow-y-auto max-h-[90vh] text-gray-300 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white bg-gray-800 rounded-full p-2 w-8 h-8 flex items-center justify-center">
          ✕
        </button>
        <h2 className="text-2xl font-bold text-white mb-4">About Character Model Sheet Generator</h2>
        <p className="mb-6">An AI-powered tool that creates professional animation model sheets from a single character image. Built as a demo of agentic AI workflows using Google Gemini.</p>
        
        <h3 className="text-xl font-semibold text-white mb-2">How it works</h3>
        <ol className="list-decimal pl-5 space-y-2 mb-6 text-sm">
          <li><strong>Paste a character image URL</strong> — any publicly accessible image of a character</li>
          <li><strong>The AI agent analyzes it</strong> — extracts art style, color palette, and character attributes</li>
          <li><strong>Components are generated</strong> — front view, expressions, action poses, color reference, and more</li>
          <li><strong>Download your model sheet</strong> — a composed PNG ready for animation reference</li>
        </ol>

        <h3 className="text-xl font-semibold text-white mb-2">What's a model sheet?</h3>
        <p className="mb-6 text-sm leading-relaxed">A model sheet is a reference document used in animation studios to ensure visual consistency across scenes and animators. It includes multiple drawings of a character showing their proportions, expressions, poses, and color palette from multiple angles.</p>

        <h3 className="text-xl font-semibold text-white mb-2">Tech stack</h3>
        <ul className="list-disc pl-5 space-y-2 mb-6 text-sm">
          <li><strong>Agent intelligence</strong> — Gemini 2.5 Flash with function calling drives the multi-step workflow</li>
          <li><strong>Image generation</strong> — Gemini 3.1 Flash Image Preview generates each component drawing mapping strict anatomical rules</li>
          <li><strong>Backend Orchestration</strong> — FastAPI + LangGraph manages the concurrent visual pipeline locally</li>
          <li><strong>Composition</strong> — HTML5 Canvas assembles the final sheet client-side</li>
          <li><strong>Interface</strong> — React + TypeScript, deployed as a static app</li>
        </ul>
      </div>
    </div>
  )
}
