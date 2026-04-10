export type ComponentType =
  | 'front_view'
  | 'side_view'
  | 'back_view'
  | 'three_quarter_view'
  | 'expression_sheet'
  | 'action_pose'
  | 'lip_sync_chart'
  | 'color_palette'
  | 'size_comparison'
  | 'costume_detail'

export interface ColorSwatch {
  hex: string
  label: string
}

export interface CharacterProfile {
  artStyle: string
  colorPalette: ColorSwatch[]
  attributes: string[]
  specialFeatures: string[]
  consistencyNotes: string
}

export interface SheetComponent {
  id: string
  type: ComponentType
  label: string
  generationPrompt: string
  status: 'pending' | 'generating' | 'done' | 'error'
  imageData?: string // base64 data URL
}

export interface SheetPlan {
  characterName: string
  components: SheetComponent[]
  layoutPreference: 'grid' | 'hierarchical'
}

export interface ChatMessage {
  role: 'user' | 'agent'
  content: string
  timestamp: number
}

export type AgentStatus =
  | 'idle'
  | 'analyzing'
  | 'planning'
  | 'generating'
  | 'composing'
  | 'done'
  | 'error'

export interface AgentStatusEvent {
  status: AgentStatus
  detail?: string
}
