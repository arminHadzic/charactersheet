import type { Content, Part } from '@google/generative-ai'
import { callGeminiWithTools } from '../services/geminiService'
import { TOOL_DECLARATIONS } from './tools'
import { SYSTEM_PROMPT } from './systemPrompt'
import {
  handleAnalyzeCharacter,
  handlePlanSheetComponents,
  handleGenerateComponent,
  handleComposeSheet,
  handleRegenerateComponent,
  type ToolContext,
} from './toolHandlers'
import type { CharacterProfile, SheetComponent, SheetPlan } from './types'

export interface OrchestratorCallbacks {
  onChatMessage: (role: 'agent', text: string) => void
  onStatusUpdate: (detail: string) => void
  onPlanUpdate: (plan: SheetPlan) => void
  onComponentUpdate: (id: string, update: Partial<SheetComponent>) => void
  onCompose: (characterName: string) => void
  onError: (msg: string) => void
  getComponents: () => SheetComponent[]
}

const MAX_ITERATIONS = 30

export class AgentOrchestrator {
  private history: Content[] = []
  private apiKey: string
  private callbacks: OrchestratorCallbacks

  constructor(apiKey: string, callbacks: OrchestratorCallbacks) {
    this.apiKey = apiKey
    this.callbacks = callbacks
  }

  async runTurn(userMessage: string): Promise<void> {
    // Append user message to history
    this.history.push({ role: 'user', parts: [{ text: userMessage }] })

    let iterations = 0

    while (iterations < MAX_ITERATIONS) {
      iterations++

      let result: { text: string | null; functionCalls: Array<{ name: string; args: Record<string, unknown> }> }

      try {
        result = await callGeminiWithTools(this.history, SYSTEM_PROMPT, TOOL_DECLARATIONS)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        this.callbacks.onError(`Gemini API error: ${msg}`)
        return
      }

      // If there are function calls, execute them
      if (result.functionCalls.length > 0) {
        // Add assistant message with function calls to history
        const assistantParts: Part[] = result.functionCalls.map((fc) => ({
          functionCall: { name: fc.name, args: fc.args },
        }))
        this.history.push({ role: 'model', parts: assistantParts })

        // Execute all function calls and collect results
        const toolResultParts: Part[] = []

        for (const fc of result.functionCalls) {
          let toolResult: unknown
          try {
            toolResult = await this.executeTool(fc.name, fc.args)
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err)
            this.callbacks.onError(`Tool "${fc.name}" failed: ${msg}`)
            return
          }
          toolResultParts.push({
            functionResponse: {
              name: fc.name,
              response: { result: toolResult },
            },
          })
        }

        // Add tool results to history
        this.history.push({ role: 'user', parts: toolResultParts })
        continue
      }

      // No function calls — this is the final text response
      if (result.text) {
        this.history.push({ role: 'model', parts: [{ text: result.text }] })
        this.callbacks.onChatMessage('agent', result.text)
        this.callbacks.onStatusUpdate('')
      }

      return
    }

    this.callbacks.onError('Agent reached maximum iterations without completing.')
  }

  private async executeTool(
    name: string,
    args: Record<string, unknown>,
  ): Promise<unknown> {
    const ctx: ToolContext = {
      apiKey: this.apiKey,
      sheetPlan: null,
      onPlanUpdate: this.callbacks.onPlanUpdate,
      onComponentUpdate: this.callbacks.onComponentUpdate,
      onStatusUpdate: this.callbacks.onStatusUpdate,
      getComponents: this.callbacks.getComponents,
    }

    switch (name) {
      case 'analyze_character':
        return handleAnalyzeCharacter(args as { image_url: string; focus_areas?: string[] }, ctx)

      case 'plan_sheet_components':
        return handlePlanSheetComponents(
          args as { character_profile: CharacterProfile; user_preferences: string; sheet_style?: 'minimal' | 'standard' | 'comprehensive' },
          ctx,
        )

      case 'generate_component':
        return handleGenerateComponent(
          args as { component_id: string; component_type: import('./types').ComponentType; generation_prompt: string; style_consistency_notes?: string },
          ctx,
        )

      case 'compose_sheet': {
        const composeArgs = args as { character_name: string; layout?: 'grid' | 'hierarchical' }
        const composeResult = await handleComposeSheet(composeArgs, ctx)
        this.callbacks.onCompose(composeArgs.character_name)
        return composeResult
      }

      case 'regenerate_component': {
        const regenResult = await handleRegenerateComponent(
          args as { component_id: string; updated_prompt: string; reason?: string },
          ctx,
        )
        // After regeneration, trigger recompose
        this.callbacks.onCompose('Character')
        return regenResult
      }

      default:
        return { error: `Unknown tool: ${name}` }
    }
  }
}
