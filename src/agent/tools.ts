import { SchemaType, type FunctionDeclaration } from '@google/generative-ai'

export const TOOL_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: 'analyze_character',
    description:
      'Analyze a character image URL using vision to extract art style, color palette, physical attributes, personality cues, and consistency notes for generation.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        image_url: {
          type: SchemaType.STRING,
          description: 'The URL of the character image to analyze.',
        },
        focus_areas: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
          description: 'Specific visual aspects to examine closely.',
        },
      },
      required: ['image_url'],
    },
  },
  {
    name: 'plan_sheet_components',
    description:
      'Decide which model sheet components to include based on the character profile and user preferences. Returns an ordered list with tailored generation prompts for each component.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        character_profile: {
          type: SchemaType.OBJECT,
          description: 'The CharacterProfile returned by analyze_character.',
          properties: {},
        },
        user_preferences: {
          type: SchemaType.STRING,
          description: 'Any special requests or preferences from the user.',
        },
        sheet_style: {
          type: SchemaType.STRING,
          format: 'enum',
          enum: ['minimal', 'standard', 'comprehensive'],
          description: 'How many components to include.',
        },
      },
      required: ['character_profile', 'user_preferences'],
    },
  },
  {
    name: 'generate_component',
    description:
      'Generate a single model sheet component image using Imagen 3. Call this once per component, sequentially.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        component_id: {
          type: SchemaType.STRING,
          description: 'The unique ID of the component from the sheet plan.',
        },
        component_type: {
          type: SchemaType.STRING,
          format: 'enum',
          enum: [
            'front_view',
            'side_view',
            'back_view',
            'three_quarter_view',
            'expression_sheet',
            'action_pose',
            'lip_sync_chart',
            'color_palette',
            'size_comparison',
            'costume_detail',
          ],
          description: 'The type of component to generate.',
        },
        generation_prompt: {
          type: SchemaType.STRING,
          description:
            'Detailed Imagen 3 prompt for generating this component, incorporating style consistency.',
        },
        style_consistency_notes: {
          type: SchemaType.STRING,
          description: 'Key visual attributes to enforce consistency with other components.',
        },
      },
      required: ['component_id', 'component_type', 'generation_prompt'],
    },
  },
  {
    name: 'compose_sheet',
    description:
      'Assemble all generated component images into a final model sheet using canvas layout. Call this after all components are generated.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        character_name: {
          type: SchemaType.STRING,
          description: 'The name of the character for the sheet title.',
        },
        layout: {
          type: SchemaType.STRING,
          format: 'enum',
          enum: ['grid', 'hierarchical'],
          description:
            'Layout style: grid places components evenly; hierarchical puts turnaround views prominently at top.',
        },
      },
      required: ['character_name'],
    },
  },
  {
    name: 'regenerate_component',
    description:
      "Regenerate a specific component with updated instructions. Use for chat-driven refinements. Only regenerates the targeted component, then triggers recomposition.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        component_id: {
          type: SchemaType.STRING,
          description: 'The ID of the component to regenerate.',
        },
        updated_prompt: {
          type: SchemaType.STRING,
          description: "The revised Imagen 3 prompt reflecting the user's requested changes.",
        },
        reason: {
          type: SchemaType.STRING,
          description: 'Brief explanation of what is being changed and why.',
        },
      },
      required: ['component_id', 'updated_prompt'],
    },
  },
]
