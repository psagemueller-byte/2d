import OpenAI from 'openai';
import type { ViewType, RoomTypeId } from '@/types';

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

interface DetectedRoomRaw {
  name: string;
  type: string;
  description: string;
}

const ROOM_TYPE_MAP: Record<string, RoomTypeId> = {
  'living room': 'living-room',
  'living': 'living-room',
  'wohnzimmer': 'living-room',
  'lounge': 'living-room',
  'family room': 'living-room',
  'bedroom': 'bedroom',
  'schlafzimmer': 'bedroom',
  'master bedroom': 'bedroom',
  'guest bedroom': 'bedroom',
  'kids room': 'bedroom',
  'kinderzimmer': 'bedroom',
  'nursery': 'bedroom',
  'kitchen': 'kitchen',
  'küche': 'kitchen',
  'kitchenette': 'kitchen',
  'bathroom': 'bathroom',
  'badezimmer': 'bathroom',
  'bath': 'bathroom',
  'toilet': 'bathroom',
  'wc': 'bathroom',
  'powder room': 'bathroom',
  'ensuite': 'bathroom',
  'office': 'office',
  'büro': 'office',
  'study': 'office',
  'home office': 'office',
  'arbeitszimmer': 'office',
  'workspace': 'office',
  'dining room': 'living-room',
  'esszimmer': 'living-room',
  'hallway': 'living-room',
  'flur': 'living-room',
  'corridor': 'living-room',
  'entrance': 'living-room',
  'laundry': 'bathroom',
  'storage': 'office',
  'balcony': 'living-room',
  'balkon': 'living-room',
};

function mapRoomType(rawType: string): RoomTypeId {
  const lower = rawType.toLowerCase().trim();
  if (ROOM_TYPE_MAP[lower]) return ROOM_TYPE_MAP[lower];
  // Fuzzy match: check if any key is contained in the raw type
  for (const [key, value] of Object.entries(ROOM_TYPE_MAP)) {
    if (lower.includes(key) || key.includes(lower)) return value;
  }
  return 'living-room'; // Default fallback
}

export async function detectRoomsInFloorPlan(
  imageBase64: string
): Promise<{ id: string; name: string; type: RoomTypeId; description: string }[]> {
  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `You are an expert architect analyzing floor plans. Your task is to identify ALL separate rooms in the floor plan image.

For EACH room you find, provide:
- "name": A clear German name for the room (e.g., "Wohnzimmer", "Küche", "Schlafzimmer", "Badezimmer", "Büro", "Flur", "Balkon")
- "type": The English room type (one of: "living room", "bedroom", "kitchen", "bathroom", "office", "dining room", "hallway", "storage", "laundry", "balcony")
- "description": A detailed description in English of this specific room including:
  - Approximate dimensions/proportions
  - Position of doors (which walls, how many)
  - Position of windows (which walls, how many)
  - Any built-in features (kitchen counters, bathroom fixtures, closets)
  - Shape of the room
  - Notable features

Return ONLY a JSON object with this format:
{
  "rooms": [
    { "name": "Wohnzimmer", "type": "living room", "description": "Rectangular room approximately 5m x 4m..." },
    { "name": "Küche", "type": "kitchen", "description": "L-shaped room approximately 3m x 4m..." }
  ]
}

Be thorough — identify EVERY distinct room, even small ones like WC, storage, or hallways. If the floor plan shows labels, use those names. If not, infer from the room features and layout.`,
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
            text: 'Identify ALL rooms in this floor plan. Return the result as JSON.',
          },
        ],
      },
    ],
    max_tokens: 2000,
  });

  const content = response.choices[0].message.content || '{}';
  const parsed = JSON.parse(content) as { rooms?: DetectedRoomRaw[] };
  const rooms = parsed.rooms || [];

  return rooms.map((room, index) => ({
    id: `room_${index + 1}`,
    name: room.name || `Raum ${index + 1}`,
    type: mapRoomType(room.type || 'living room'),
    description: room.description || '',
  }));
}

export async function generateRoomVisualization(
  imageBase64: string,
  prompt: string
): Promise<string> {
  const imageBuffer = Buffer.from(imageBase64, 'base64');
  const imageFile = new File([imageBuffer], 'floorplan.png', { type: 'image/png' });

  const response = await getOpenAI().images.edit({
    model: 'gpt-image-1.5',
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
  analysis: string,
  roomName?: string,
  roomDescription?: string
): string {
  const roomFocusInstruction = roomName
    ? `\n\nIMPORTANT — ROOM FOCUS: This floor plan shows multiple rooms. You MUST focus ONLY on the room called "${roomName}" (${roomTypeName}). Ignore all other rooms in the floor plan. Generate the visualization ONLY for this specific room.\n\nRoom details: ${roomDescription || 'See analysis below.'}\n`
    : '';

  return `CRITICAL INSTRUCTIONS — FOLLOW EXACTLY:

1. FLOOR PLAN FIDELITY: The attached image is a floor plan. You MUST preserve the EXACT room layout:
   - Same room shape and proportions
   - Walls, doors, and windows in their EXACT positions
   - Do NOT add, remove, or move any structural elements
   - Do NOT change the room dimensions
${roomFocusInstruction}
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
