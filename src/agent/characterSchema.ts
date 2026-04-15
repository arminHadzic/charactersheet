/**
 * Rigid character schema — the Pydantic-equivalent extracted by the vision node.
 *
 * Every field is a named, independently-injectable constraint so the prompt
 * builder can anchor each dimension of the character separately and prevent
 * Imagen from drifting into its default aesthetic.
 */

export interface ArtStyle {
  /** Studio/artist name or descriptive label, e.g. "Jhonen Vasquez Nickelodeon cartoon" */
  overall_style_name: string
  /** Outline weight, uniformity, corner treatment, e.g. "very thick uniform black outlines (~4px), hard right-angle corners, no taper" */
  outline_style: string
  /** How shading is applied, e.g. "flat 2D cel-shading, zero gradients, solid flat fills, pure black drop-shadows only" */
  shading_style: string
  /** How colours are rendered, e.g. "fully saturated pure flat colours, hard colour boundaries, no blending or anti-aliasing between areas" */
  color_rendering: string
  /** Dominant shape language, e.g. "angular boxy geometry, rectangular forms throughout, sharp angles, minimal organic curves" */
  shape_vocabulary: string
}

export interface FaceFeatures {
  /** Skull/head geometry, e.g. "large rectangular boxy skull, wider at top, flat crown, sharp angular jaw" */
  head_shape: string
  /** Eye size, shape, colour, iris/pupil detail, e.g. "very large circular magenta-pink irises, small solid black pupils, no white sclera, thick black outlines" */
  eye_description: string
  /** Nose form, e.g. "tiny rounded pink bump protruding from centre of face, almost vestigial" */
  nose_description: string
  /** Mouth typical shape, e.g. "small rectangular angular mouth, usually showing small blocky white teeth, thin black outline" */
  mouth_description: string
  /** Anything on top of / above the head, e.g. "two thin black antennae rising from crown, slightly curved at tips" */
  head_top_features: string
}

export interface BodyFeatures {
  /** All proportion exaggerations, e.g. "head is ~40% of total height, torso is very small and compact, limbs are extremely thin stick-like" */
  proportions: string
  /** Torso shape and surface pattern, e.g. "small compact rectangular torso with alternating hot-pink and dark-pink horizontal stripes" */
  torso_description: string
  /** Arms and hands, e.g. "extremely thin stick-like arms, small hands with 3 pointed claw-like fingers, wearing black gloves" */
  arm_description: string
  /** Legs and footwear, e.g. "very short thin legs, large chunky black platform boots with thick flat soles" */
  leg_description: string
}

export interface CharacterColors {
  /** Skin/fur/scale colour with approximate hex, e.g. "bright lime green, ~#6DBB4A" */
  skin_color: string
  /** Top 4-6 colours as "hex usage", e.g. "#6DBB4A lime green skin", "#E84BA0 hot pink costume" */
  dominant_colors: string[]
}

export interface CharacterSchema {
  character_name: string
  summary: string

  art_style: ArtStyle
  face: FaceFeatures
  body: BodyFeatures
  colors: CharacterColors

  /** Each accessory with exact shape, colour, and placement, e.g. "smooth rounded grey backpack with two flat hot-pink circular spots" */
  accessories: string[]

  /** 4-6 features that are non-negotiable identity anchors — if any are wrong the character is unrecognisable */
  must_preserve: string[]

  color_palette: Array<{ hex: string; label: string; area?: string }>
}
