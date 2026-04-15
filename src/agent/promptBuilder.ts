/**
 * Deterministic prompt builder — takes the extracted CharacterSchema and
 * assembles a generation prompt for each view type.
 *
 * This is pure TypeScript: no AI calls, no randomness.  Every schema field
 * maps to a named constraint block in the final prompt so Imagen cannot
 * silently drop any dimension of the character.
 */

import type { CharacterSchema } from './characterSchema'
import type { ComponentType } from './types'

export interface BuiltComponentPlan {
  id: string
  type: ComponentType
  label: string
  prompt: string
}

// ---------------------------------------------------------------------------
// View instructions — explicit about what VARIATION is required for each view.
// These are the only free-text strings in the builder; everything else comes
// from the schema.
// ---------------------------------------------------------------------------

const VIEW_INSTRUCTIONS: Record<string, string> = {
  front_view:
    'VIEW: Full body, character facing DIRECTLY toward the viewer. Neutral relaxed stance, arms loose at sides, feet slightly apart. Character fills ~85% of image height. Single isolated character, single pose only.',

  three_quarter_view:
    'VIEW: Full body at a 45-degree three-quarter angle — body is visibly rotated so roughly 3/4 of the front is visible and one shoulder is clearly closer to the viewer than the other. This is NOT a front-facing pose. Neutral standing. Character fills ~85% of image height.',

  expression_sheet:
    'VIEW: Six distinct head-and-shoulders close-up portraits in a 2x3 grid. Each portrait MUST show a dramatically different, exaggerated facial expression — no two expressions should look similar. Grid layout: (1) HAPPY — eyes curved up with delight, wide open smile; (2) SAD — mouth sharply downturned, heavy drooping eyes, dejected look; (3) ANGRY — brow deeply furrowed inward, teeth bared in a snarl, eyes narrowed to slits; (4) SURPRISED — eyes maximally wide, mouth in a large O shape, shock visible; (5) SCARED — pupils tiny with fear, eyes wide open, sweat drops; (6) DETERMINED — eyes half-closed in intense focus, jaw firmly set, mouth closed tight. Label each portrait with its expression name. No neutral faces. No repeated expressions.',

  action_pose:
    'VIEW: Full body in a bold DYNAMIC ACTION POSE — the character is NOT standing neutrally. Show personality through physical movement: an aggressive forward lean with raised fist, a dramatic threatening crouch, a triumphant pointing gesture, mid-jump, or similarly high-energy pose. The silhouette must read as active and expressive. Character fills ~85% of image height. One character, one pose only.',

  back_view:
    'VIEW: Full body with the character facing COMPLETELY AWAY from the viewer — 180 degrees from the front view. ONLY the back of the head, back of the body, and backs of the feet are visible. Absolutely zero face, zero eyes, zero frontal features shown. Reveal how the hair/head-top features look from behind, the back of the costume, and the backs of the shoes. Neutral standing pose. Character fills ~85% of image height.',

  side_view:
    'VIEW: Full body in strict 90-degree side profile — only one edge silhouette of the character is visible. Neutral standing pose. Character fills ~85% of image height.',
}

const DEFAULT_COMPONENTS: Array<{ id: string; type: ComponentType; label: string }> = [
  { id: 'front_view', type: 'front_view', label: 'Front View' },
  { id: 'three_quarter_view', type: 'three_quarter_view', label: '3/4 View' },
  { id: 'expression_sheet', type: 'expression_sheet', label: 'Expressions' },
  { id: 'action_pose', type: 'action_pose', label: 'Signature Pose' },
  { id: 'back_view', type: 'back_view', label: 'Back View' },
]

// ---------------------------------------------------------------------------
// Prompt assembly
// ---------------------------------------------------------------------------

export function buildComponentPromptsFromSchema(schema: CharacterSchema): BuiltComponentPlan[] {
  // --- Block 1: art-style constraints (applies to every component) ---
  const styleBlock =
    `${schema.art_style.overall_style_name} illustration. ` +
    `STYLE — enforce strictly: ` +
    `Outlines: ${schema.art_style.outline_style}. ` +
    `Shading: ${schema.art_style.shading_style}. ` +
    `Colours: ${schema.art_style.color_rendering}. ` +
    `Shapes: ${schema.art_style.shape_vocabulary}.`

  // --- Block 2: character anatomy (named fields, not a prose paragraph) ---
  const anatomyBlock =
    `CHARACTER ANATOMY — replicate precisely: ` +
    `Head shape: ${schema.face.head_shape}. ` +
    `Eyes: ${schema.face.eye_description}. ` +
    `Nose: ${schema.face.nose_description}. ` +
    `Mouth: ${schema.face.mouth_description}. ` +
    `Head-top features: ${schema.face.head_top_features}. ` +
    `Proportions: ${schema.body.proportions}. ` +
    `Torso: ${schema.body.torso_description}. ` +
    `Arms/hands: ${schema.body.arm_description}. ` +
    `Legs/feet: ${schema.body.leg_description}. ` +
    `Skin colour: ${schema.colors.skin_color}.`

  // --- Block 3: costume & accessories ---
  const accessoryBlock =
    schema.accessories.length > 0
      ? `ACCESSORIES — include exactly: ${schema.accessories.join('; ')}.`
      : ''

  // --- Block 4: identity anchors that must not drift ---
  const anchorBlock = `DO NOT DEVIATE FROM THESE: ${schema.must_preserve.join('; ')}.`

  // --- Block 5: background ---
  const bgBlock = `Pure white #FFFFFF background. Absolutely no grey, coloured, or gradient background. No floor shadows. No scenery.`

  return DEFAULT_COMPONENTS.map(({ id, type, label }) => {
    const viewInstruction = VIEW_INSTRUCTIONS[type] ?? ''

    const prompt = [styleBlock, anatomyBlock, accessoryBlock, anchorBlock, viewInstruction, bgBlock]
      .filter(Boolean)
      .join(' ')

    return { id, type, label, prompt }
  })
}
