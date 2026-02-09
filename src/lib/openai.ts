import OpenAI from 'openai';
import type { ViewType } from '@/types';

let _openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
}

export async function analyzeFloorPlan(imageBase64: string): Promise<string> {
  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are an expert architect and spatial analyst. Your job is to extract EXACT structural information from floor plans. Be extremely precise and quantitative.

You MUST describe:
1. EXACT room shape (rectangular, L-shaped, etc.) with proportions (e.g., "roughly 4m x 5m")
2. EXACT wall positions — which walls are on north/south/east/west
3. EXACT positions of ALL doors (which wall, where on that wall — left third, center, right third)
4. EXACT positions of ALL windows (which wall, how many, where on that wall)
5. Any built-in features (kitchen counters, closets, bathroom fixtures) with EXACT positions
6. Which direction each door opens
7. Any corridors, passages, or openings to other rooms

Use compass directions (north wall = top of floor plan, south = bottom, west = left, east = right).

Create a FURNITURE PLACEMENT PLAN that respects the room layout:
- Place furniture AWAY from doors and windows (do not block them)
- Leave clear walking paths (min 80cm)
- Position the main piece (sofa/bed/desk) as the focal point
- List EACH piece of furniture with its EXACT position relative to walls

Answer in English. Be structured and use bullet points.`,
      },
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${imageBase64}`,
              detail: 'high',
            },
          },
          {
            type: 'text',
            text: 'Analyze this floor plan with extreme precision. Extract every structural detail and create an exact furniture placement plan.',
          },
        ],
      },
    ],
    max_tokens: 1500,
  });

  return response.choices[0].message.content || '';
}

export async function generateRoomVisualization(
  imageBase64: string,
  prompt: string
): Promise<string> {
  const imageBuffer = Buffer.from(imageBase64, 'base64');
  const imageFile = new File([imageBuffer], 'floorplan.png', { type: 'image/png' });

  const response = await getOpenAI().images.edit({
    model: 'gpt-image-1',
    image: imageFile,
    prompt,
    size: '1536x1024',
    quality: 'high',
  });

  return response.data?.[0]?.b64_json || '';
}

const VIEW_PROMPTS: Record<ViewType, string> = {
  perspective: `Camera position: Wide-angle perspective view (24mm lens equivalent) from a corner of the room at eye level (160cm height), looking diagonally across the room. This is the MAIN hero shot showing the room's depth and character.`,

  side: `Camera position: Straight-on elevation view from the center of the longest wall, at eye level (160cm height), looking directly at the opposite wall. Like an architectural elevation rendering. Show the full width of the room from wall to wall.`,

  topdown: `Camera position: Bird's-eye view / top-down plan view looking straight down from the ceiling (3m height). Show the ENTIRE room layout from above with ALL furniture visible in their exact positions. Like a furnished floor plan rendering with realistic textures and materials instead of abstract symbols.`,
};

export function buildMultiViewPrompt(
  viewType: ViewType,
  styleName: string,
  stylePromptModifier: string,
  roomTypeName: string,
  analysis: string
): string {
  return `CRITICAL INSTRUCTIONS — FOLLOW EXACTLY:

1. FLOOR PLAN FIDELITY: The attached image is a floor plan. You MUST preserve the EXACT room layout:
   - Same room shape and proportions
   - Walls, doors, and windows in their EXACT positions
   - Do NOT add, remove, or move any structural elements
   - Do NOT change the room dimensions

2. FURNITURE PLACEMENT: Place furniture according to this analysis (furniture must be in these EXACT positions in ALL views):
${analysis}

3. CONSISTENCY RULE: Every piece of furniture must be in the IDENTICAL position regardless of camera angle. If a sofa is against the north wall, it MUST appear against the north wall in every view.

4. ROOM TYPE: ${roomTypeName}

5. STYLE: ${stylePromptModifier}

6. ${VIEW_PROMPTS[viewType]}

7. RENDERING QUALITY:
   - Photorealistic quality, like a professional interior design magazine photograph
   - Natural lighting from the windows described in the floor plan
   - Realistic material textures (wood grain, fabric weave, stone texture)
   - Subtle shadows and ambient occlusion
   - No watermarks, text, labels, or annotations on the image

Generate this single view NOW.`;
}
