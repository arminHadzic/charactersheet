import { create } from 'zustand'
import type { ChatMessage, SheetComponent, SheetPlan, AgentStatus } from '../agent/types'

interface SessionState {
  // API key
  apiKey: string
  setApiKey: (key: string) => void

  // Character input
  characterUrl: string
  setCharacterUrl: (url: string) => void

  // Chat
  messages: ChatMessage[]
  addMessage: (role: 'user' | 'agent', content: string) => void

  // Agent status
  agentStatus: AgentStatus
  agentStatusDetail: string
  setAgentStatus: (status: AgentStatus, detail?: string) => void

  // Sheet plan and components
  sheetPlan: SheetPlan | null
  setSheetPlan: (plan: SheetPlan) => void
  updateComponent: (id: string, update: Partial<SheetComponent>) => void
  getComponents: () => SheetComponent[]

  // Composed sheet
  composedSheetUrl: string | null
  characterName: string
  setComposedSheet: (url: string) => void
  setCharacterName: (name: string) => void

  // Whether composition is needed
  compositionTrigger: number
  triggerCompose: (characterName: string) => void

  // Reset
  reset: () => void
}

export const useSessionStore = create<SessionState>((set, get) => ({
  apiKey: localStorage.getItem('gemini_api_key') ?? '',
  setApiKey: (key) => {
    localStorage.setItem('gemini_api_key', key)
    set({ apiKey: key })
  },

  characterUrl: '',
  setCharacterUrl: (url) => set({ characterUrl: url }),

  messages: [],
  addMessage: (role, content) =>
    set((s) => ({
      messages: [...s.messages, { role, content, timestamp: Date.now() }],
    })),

  agentStatus: 'idle',
  agentStatusDetail: '',
  setAgentStatus: (status, detail = '') => set({ agentStatus: status, agentStatusDetail: detail }),

  sheetPlan: null,
  setSheetPlan: (plan) => set({ sheetPlan: plan }),
  updateComponent: (id, update) =>
    set((s) => {
      if (!s.sheetPlan) return {}
      return {
        sheetPlan: {
          ...s.sheetPlan,
          components: s.sheetPlan.components.map((c) =>
            c.id === id ? { ...c, ...update } : c,
          ),
        },
      }
    }),
  getComponents: () => get().sheetPlan?.components ?? [],

  composedSheetUrl: null,
  characterName: 'Character',
  setComposedSheet: (url) => set({ composedSheetUrl: url, agentStatus: 'done', agentStatusDetail: '' }),
  setCharacterName: (name) => set({ characterName: name }),

  compositionTrigger: 0,
  triggerCompose: (characterName) =>
    set((s) => ({
      compositionTrigger: s.compositionTrigger + 1,
      characterName,
    })),

  reset: () =>
    set({
      characterUrl: '',
      messages: [],
      agentStatus: 'idle',
      agentStatusDetail: '',
      sheetPlan: null,
      composedSheetUrl: null,
      characterName: 'Character',
      compositionTrigger: 0,
    }),
}))
