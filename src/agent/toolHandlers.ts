import { analyzeImageWithVision } from '../services/geminiService'
import { generateImage } from '../services/imagenService'
import type { CharacterProfile, SheetComponent, SheetPlan, ComponentType } from './types'

export interface ToolContext {
  apiKey: string
  sheetPlan: SheetPlan | null
  onPlanUpdate: (plan: SheetPlan) => void
  onComponentUpdate: (id: string, update: Partial<SheetComponent>) => void
  onStatusUpdate: (detail: string) => void
  getComponents: () => SheetComponent[]
}

export async function handleAnalyzeCharacter(
  args: { image_url: string; focus_areas?: string[] },
  ctx: ToolContext,
): Promise<CharacterProfile> {
  ctx.onStatusUpdate('Analyzing character image...')

  const focusAreas = args.focus_areas?.join(', ') ?? 'overall style, colors, and attributes'
  const prompt = `Analyze this character image carefully. Focus on: ${focusAreas}.

Return a JSON object with these exact fields:
{
  "artStyle": "description of art style (e.g., anime, western cartoon, pixel art)",
  "colorPalette": [{"hex": "#RRGGBB", "label": "color name/usage"}], // 4-8 key colors
  "attributes": ["list of character attributes and personality traits"],
  "specialFeatures": ["unique visual features important to preserve"],
  "consistencyNotes": "key visual rules to maintain across all drawings"
}

Respond with ONLY valid JSON, no markdown code blocks.`

  const raw = await analyzeImageWithVision(ctx.apiKey, args.image_url, prompt)

  // Strip markdown code blocks if present
  const cleaned = raw.replace(/```(?:json)?\n?/g, '').trim()
  const profile: CharacterProfile = JSON.parse(cleaned)
  return profile
}

export async function handlePlanSheetComponents(
  args: {
    character_profile: CharacterProfile
    user_preferences: string
    sheet_style?: 'minimal' | 'standard' | 'comprehensive'
  },
  ctx: ToolContext,
): Promise<SheetPlan> {
  ctx.onStatusUpdate('Planning model sheet components...')

  const style = args.sheet_style ?? 'standard'
  const counts = { minimal: 4, standard: 6, comprehensive: 8 }
  const targetCount = counts[style]

  // Build a plan based on the character profile
  const components: SheetComponent[] = []

  // Always include a front view
  components.push({
    id: 'front_view',
    type: 'front_view',
    label: 'Front View',
    generationPrompt: buildComponentPrompt('front_view', args.character_profile, args.user_preferences),
    status: 'pending',
  })

  // Three-quarter view for most characters
  components.push({
    id: 'three_quarter_view',
    type: 'three_quarter_view',
    label: '3/4 View',
    generationPrompt: buildComponentPrompt('three_quarter_view', args.character_profile, args.user_preferences),
    status: 'pending',
  })

  // Expression sheet
  components.push({
    id: 'expression_sheet',
    type: 'expression_sheet',
    label: 'Expressions',
    generationPrompt: buildComponentPrompt('expression_sheet', args.character_profile, args.user_preferences),
    status: 'pending',
  })

  // Action pose
  if (targetCount >= 4) {
    components.push({
      id: 'action_pose',
      type: 'action_pose',
      label: 'Signature Pose',
      generationPrompt: buildComponentPrompt('action_pose', args.character_profile, args.user_preferences),
      status: 'pending',
    })
  }

  // Color palette for colorful characters
  if (targetCount >= 5 && args.character_profile.colorPalette.length > 0) {
    components.push({
      id: 'color_palette',
      type: 'color_palette',
      label: 'Color Reference',
      generationPrompt: buildComponentPrompt('color_palette', args.character_profile, args.user_preferences),
      status: 'pending',
    })
  }

  // Back view for comprehensive
  if (targetCount >= 6) {
    components.push({
      id: 'back_view',
      type: 'back_view',
      label: 'Back View',
      generationPrompt: buildComponentPrompt('back_view', args.character_profile, args.user_preferences),
      status: 'pending',
    })
  }

  // Side view for comprehensive
  if (targetCount >= 7) {
    components.push({
      id: 'side_view',
      type: 'side_view',
      label: 'Side View',
      generationPrompt: buildComponentPrompt('side_view', args.character_profile, args.user_preferences),
      status: 'pending',
    })
  }

  // Costume detail for comprehensive
  if (targetCount >= 8) {
    components.push({
      id: 'costume_detail',
      type: 'costume_detail',
      label: 'Costume Details',
      generationPrompt: buildComponentPrompt('costume_detail', args.character_profile, args.user_preferences),
      status: 'pending',
    })
  }

  const plan: SheetPlan = {
    characterName: 'Character',
    components,
    layoutPreference: 'hierarchical',
  }

  ctx.onPlanUpdate(plan)
  return plan
}

export async function handleGenerateComponent(
  args: {
    component_id: string
    component_type: ComponentType
    generation_prompt: string
    style_consistency_notes?: string
  },
  ctx: ToolContext,
): Promise<{ component_id: string; status: string }> {
  ctx.onStatusUpdate(`Generating ${args.component_type.replace(/_/g, ' ')}...`)
  ctx.onComponentUpdate(args.component_id, { status: 'generating' })

  try {
    const imageData = await generateImage(ctx.apiKey, args.generation_prompt)
    ctx.onComponentUpdate(args.component_id, { status: 'done', imageData })
    return { component_id: args.component_id, status: 'done' }
  } catch (err) {
    ctx.onComponentUpdate(args.component_id, { status: 'error' })
    throw err
  }
}

export async function handleComposeSheet(
  args: { character_name: string; layout?: 'grid' | 'hierarchical' },
  ctx: ToolContext,
): Promise<Record<string, string>> {
  ctx.onStatusUpdate('Composing final model sheet...')
  // Composition is handled by the canvas module, triggered by the store
  // Return success — the UI will trigger composition once it sees all components done
  return { status: 'composing', character_name: args.character_name }
}

export async function handleRegenerateComponent(
  args: { component_id: string; updated_prompt: string; reason?: string },
  ctx: ToolContext,
): Promise<{ component_id: string; status: string }> {
  ctx.onStatusUpdate(`Refining ${args.component_id.replace(/_/g, ' ')}...`)
  ctx.onComponentUpdate(args.component_id, { status: 'generating' })

  try {
    const imageData = await generateImage(ctx.apiKey, args.updated_prompt)
    ctx.onComponentUpdate(args.component_id, { status: 'done', imageData })
    return { component_id: args.component_id, status: 'done' }
  } catch (err) {
    ctx.onComponentUpdate(args.component_id, { status: 'error' })
    throw err
  }
}

// --- Prompt builder ---

const STYLE_PREFIXES: Record<ComponentType, string> = {
  front_view: 'Animation model sheet — full body front view (facing viewer), neutral standing pose, clean line art, white background.',
  side_view: 'Animation model sheet — full body side profile view, neutral standing pose, clean line art, white background.',
  back_view: 'Animation model sheet — full body back view, neutral standing pose, clean line art, white background.',
  three_quarter_view: 'Animation model sheet — full body 3/4 angle view, slight turn to the right, neutral pose, clean line art, white background.',
  expression_sheet: 'Animation model sheet — expression reference sheet, 6 facial close-ups in a 2x3 grid: happy, sad, angry, surprised, scared, determined. Same character, consistent style. White background.',
  action_pose: 'Animation model sheet — full body dynamic signature action pose that reveals the character\'s personality. Clean line art, white background.',
  lip_sync_chart: 'Animation model sheet — lip sync / mouth chart reference, 8-10 mouth shapes for phonemes (A/I/O/U/E/M/B/F/TH/etc.) arranged in a grid. Clean line art, white background.',
  color_palette: 'Animation model sheet — color reference chart. Character shown in flat color with color swatch annotations pointing to different areas. White background.',
  size_comparison: 'Animation model sheet — size comparison chart showing the character next to a common object for scale reference. Clean line art, white background.',
  costume_detail: 'Animation model sheet — costume and accessory detail sheet, showing close-up views of clothing, props, and accessories. White background.',
}

function buildComponentPrompt(
  type: ComponentType,
  profile: CharacterProfile,
  userPreferences: string,
): string {
  const prefix = STYLE_PREFIXES[type]
  const styleDesc = `Art style: ${profile.artStyle}. `
  const attrDesc = profile.attributes.length
    ? `Character attributes: ${profile.attributes.slice(0, 4).join(', ')}. `
    : ''
  const consistency = profile.consistencyNotes
    ? `Consistency rules: ${profile.consistencyNotes}. `
    : ''
  const prefs = userPreferences ? `User notes: ${userPreferences}. ` : ''

  return `${prefix} ${styleDesc}${attrDesc}${consistency}${prefs}Professional animation studio quality. No background scenery.`
}
