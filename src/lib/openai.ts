import OpenAI from 'openai';
import type { ViewType, RoomTypeId } from '@/types';
import type { Room3DData, Wall3D, Door3D, Window3D } from '@/types/scene3d';

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

// ── Fast Room Detection (fits Vercel Hobby 10s timeout) ──

interface FastRoomRaw {
  name: string;
  type: string;
  description: string;
  estimatedWidth: number;
  estimatedDepth: number;
  doorCount: number;
  windowCount: number;
  doorWalls: string[];
  windowWalls: string[];
}

/**
 * Fast room detection using detail:'low' to fit within Vercel Hobby 10s timeout.
 * Returns rooms with basic dimensions + door/window info for client-side geometry.
 */
export async function detectRoomsFast(
  imageBase64: string
): Promise<{ id: string; name: string; type: RoomTypeId; description: string; geometry: Room3DData }[]> {
  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `You are an expert architect analyzing floor plans. Identify ALL rooms and estimate their dimensions.

For EACH room provide:
- "name": German room name (e.g., "Wohnzimmer", "Küche", "Schlafzimmer", "Bad", "Balkon")
- "type": English type (one of: "living room", "bedroom", "kitchen", "bathroom", "office", "dining room", "hallway", "storage", "laundry", "balcony")
- "description": Brief English description
- "estimatedWidth": width in meters (x-axis)
- "estimatedDepth": depth in meters (z-axis)
- "doorCount": number of doors
- "windowCount": number of windows
- "doorWalls": which walls have doors (array of "south", "east", "north", "west")
- "windowWalls": which walls have windows (array of "south", "east", "north", "west")

Use compass: north=top, south=bottom, west=left, east=right.
If dimensions are labeled, use them. Otherwise estimate from typical room sizes.

Return JSON: { "rooms": [ { "name": "...", "type": "...", ... } ] }`,
      },
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${imageBase64}`,
              detail: 'low',
            },
          },
          {
            type: 'text',
            text: 'Identify ALL rooms in this floor plan with estimated dimensions. Return as JSON.',
          },
        ],
      },
    ],
    max_tokens: 1500,
  });

  const content = response.choices[0].message.content || '{}';
  const parsed = JSON.parse(content) as { rooms?: FastRoomRaw[] };
  const rooms = parsed.rooms || [];

  return rooms.map((room, index) => {
    const roomId = `room_${index + 1}`;
    const width = room.estimatedWidth || 4;
    const depth = room.estimatedDepth || 3;
    return {
      id: roomId,
      name: room.name || `Raum ${index + 1}`,
      type: mapRoomType(room.type || 'living room'),
      description: room.description || '',
      geometry: buildDefaultGeometry(
        roomId, width, depth,
        room.doorCount || 1,
        room.windowCount || 1,
        room.doorWalls || ['south'],
        room.windowWalls || ['north'],
      ),
    };
  });
}

const WALL_INDEX_MAP: Record<string, number> = { south: 0, east: 1, north: 2, west: 3 };

/**
 * Build rectangular Room3DData from basic dimensions and compass-direction door/window info.
 */
function buildDefaultGeometry(
  roomId: string,
  width: number,
  depth: number,
  doorCount: number,
  windowCount: number,
  doorWalls: string[],
  windowWalls: string[],
): Room3DData {
  const h = 2.6;
  // 4 walls: south(0), east(1), north(2), west(3)
  const walls: Wall3D[] = [
    { start: [0, 0], end: [width, 0], height: h },
    { start: [width, 0], end: [width, depth], height: h },
    { start: [width, depth], end: [0, depth], height: h },
    { start: [0, depth], end: [0, 0], height: h },
  ];

  const floorPoints: [number, number][] = walls.map((w) => w.start);

  // Place doors
  const doors: Door3D[] = [];
  for (let i = 0; i < doorCount; i++) {
    const wallName = doorWalls[i % doorWalls.length] || 'south';
    const wallIdx = WALL_INDEX_MAP[wallName.toLowerCase()] ?? 0;
    const wall = walls[wallIdx];
    // Spread multiple doors on same wall evenly
    const doorsOnThisWall = doorWalls.filter((w) => w.toLowerCase() === wallName.toLowerCase()).length;
    const pos = doorsOnThisWall > 1 ? (i + 1) / (doorsOnThisWall + 1) : 0.5;
    const wx = wall.start[0] + (wall.end[0] - wall.start[0]) * pos;
    const wz = wall.start[1] + (wall.end[1] - wall.start[1]) * pos;
    doors.push({ position: [wx, wz], width: 0.9, height: 2.1, wallIndex: wallIdx });
  }

  // Place windows
  const windows: Window3D[] = [];
  for (let i = 0; i < windowCount; i++) {
    const wallName = windowWalls[i % windowWalls.length] || 'north';
    const wallIdx = WALL_INDEX_MAP[wallName.toLowerCase()] ?? 2;
    const wall = walls[wallIdx];
    const windowsOnThisWall = windowWalls.filter((w) => w.toLowerCase() === wallName.toLowerCase()).length;
    const pos = windowsOnThisWall > 1 ? (i + 1) / (windowsOnThisWall + 1) : 0.5;
    const wx = wall.start[0] + (wall.end[0] - wall.start[0]) * pos;
    const wz = wall.start[1] + (wall.end[1] - wall.start[1]) * pos;
    windows.push({ position: [wx, wz], width: 1.2, height: 1.2, wallIndex: wallIdx, sillHeight: 0.9 });
  }

  return { roomId, walls, floor: { points: floorPoints }, doors, windows, dimensions: { width, depth, height: h } };
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

// ── 3D Geometry Detection ──

interface DetectedRoomWithGeometryRaw {
  name: string;
  type: string;
  description: string;
  geometry: {
    width: number;
    depth: number;
    height: number;
    walls: { start: [number, number]; end: [number, number] }[];
    doors: { wallIndex: number; positionAlongWall: number; width: number }[];
    windows: { wallIndex: number; positionAlongWall: number; width: number; height: number; sillHeight: number }[];
  };
}

/**
 * Detects rooms AND extracts structured 3D geometry for Three.js rendering.
 * Returns room info + wall coordinates, door/window positions in meters.
 */
export async function detectRoomsWithGeometry(
  imageBase64: string
): Promise<{ id: string; name: string; type: RoomTypeId; description: string; geometry: Room3DData }[]> {
  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `You are an expert architect analyzing floor plans. Extract ALL rooms with precise 3D geometry data for constructing a 3D model.

For EACH room, provide:
- "name": German room name (e.g., "Wohnzimmer", "Küche", "Schlafzimmer")
- "type": English room type (one of: "living room", "bedroom", "kitchen", "bathroom", "office", "dining room", "hallway", "storage", "laundry", "balcony")
- "description": Brief English description of the room
- "geometry": Precise measurements for 3D reconstruction:

GEOMETRY FORMAT:
- "width": room width in meters (x-axis)
- "depth": room depth in meters (z-axis)
- "height": ceiling height in meters (default 2.6 if not visible)
- "walls": Array of wall segments. Each wall has:
  - "start": [x, z] coordinates in meters (origin = bottom-left corner of room)
  - "end": [x, z] coordinates in meters
  For a simple rectangular room of 5m × 4m, walls would be:
  [
    {"start": [0, 0], "end": [5, 0]},       // south wall
    {"start": [5, 0], "end": [5, 4]},       // east wall
    {"start": [5, 4], "end": [0, 4]},       // north wall
    {"start": [0, 4], "end": [0, 0]}        // west wall
  ]
  For L-shaped rooms, add more wall segments to trace the actual shape.

- "doors": Array of doors. Each has:
  - "wallIndex": which wall (0-based index into walls array)
  - "positionAlongWall": 0.0 to 1.0, where on the wall (0 = start, 0.5 = center, 1 = end)
  - "width": door width in meters (standard: 0.9)

- "windows": Array of windows. Each has:
  - "wallIndex": which wall (0-based index)
  - "positionAlongWall": 0.0 to 1.0
  - "width": window width in meters (standard: 1.2)
  - "height": window height in meters (standard: 1.2)
  - "sillHeight": distance from floor to bottom of window (standard: 0.9)

IMPORTANT RULES:
- Estimate dimensions from the floor plan proportions and any visible scale/dimensions
- If dimensions are unclear, estimate based on typical room sizes (e.g., bedroom ~12sqm, living room ~20sqm)
- Walls MUST form a closed polygon (last wall end = first wall start)
- Place doors and windows on the correct walls based on the floor plan
- Use meters as the unit
- Standard door width: 0.9m, standard window width: 1.2m
- Standard ceiling height: 2.6m

Return JSON:
{
  "rooms": [
    {
      "name": "Wohnzimmer",
      "type": "living room",
      "description": "Rectangular room with two windows on the south wall",
      "geometry": {
        "width": 5.0,
        "depth": 4.0,
        "height": 2.6,
        "walls": [...],
        "doors": [...],
        "windows": [...]
      }
    }
  ]
}`,
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
            text: 'Analyze this floor plan. Identify ALL rooms and extract precise 3D geometry data (wall coordinates, doors, windows) for each room. Return as JSON.',
          },
        ],
      },
    ],
    max_tokens: 4000,
  });

  const content = response.choices[0].message.content || '{}';
  const parsed = JSON.parse(content) as { rooms?: DetectedRoomWithGeometryRaw[] };
  const rooms = parsed.rooms || [];

  return rooms.map((room, index) => {
    const g = room.geometry;
    const roomId = `room_${index + 1}`;

    // Build walls with height
    const walls: Wall3D[] = (g.walls || []).map((w) => ({
      start: w.start,
      end: w.end,
      height: g.height || 2.6,
    }));

    // If no walls provided, create default rectangle
    if (walls.length === 0) {
      const w = g.width || 4;
      const d = g.depth || 3;
      const h = g.height || 2.6;
      walls.push(
        { start: [0, 0], end: [w, 0], height: h },
        { start: [w, 0], end: [w, d], height: h },
        { start: [w, d], end: [0, d], height: h },
        { start: [0, d], end: [0, 0], height: h },
      );
    }

    // Build floor polygon from wall vertices
    const floorPoints: [number, number][] = walls.map((w) => w.start);

    // Convert doors
    const doors: Door3D[] = (g.doors || []).map((d) => {
      const wall = walls[d.wallIndex] || walls[0];
      const wx = wall.start[0] + (wall.end[0] - wall.start[0]) * d.positionAlongWall;
      const wz = wall.start[1] + (wall.end[1] - wall.start[1]) * d.positionAlongWall;
      return {
        position: [wx, wz] as [number, number],
        width: d.width || 0.9,
        height: 2.1,
        wallIndex: d.wallIndex,
      };
    });

    // Convert windows
    const windows: Window3D[] = (g.windows || []).map((w) => {
      const wall = walls[w.wallIndex] || walls[0];
      const wx = wall.start[0] + (wall.end[0] - wall.start[0]) * w.positionAlongWall;
      const wz = wall.start[1] + (wall.end[1] - wall.start[1]) * w.positionAlongWall;
      return {
        position: [wx, wz] as [number, number],
        width: w.width || 1.2,
        height: w.height || 1.2,
        wallIndex: w.wallIndex,
        sillHeight: w.sillHeight || 0.9,
      };
    });

    return {
      id: roomId,
      name: room.name || `Raum ${index + 1}`,
      type: mapRoomType(room.type || 'living room'),
      description: room.description || '',
      geometry: {
        roomId,
        walls,
        floor: { points: floorPoints },
        doors,
        windows,
        dimensions: {
          width: g.width || 4,
          depth: g.depth || 3,
          height: g.height || 2.6,
        },
      },
    };
  });
}

// ── Beautification (3D render → photorealistic) ──

export async function beautifyRenderedImage(
  renderedImageBase64: string,
  styleName: string,
  stylePromptModifier: string,
  viewType: ViewType,
  roomTypeName: string
): Promise<string> {
  const imageBuffer = Buffer.from(renderedImageBase64, 'base64');
  const imageFile = new File([imageBuffer], 'render.png', { type: 'image/png' });

  const viewDescriptions: Record<ViewType, string> = {
    perspective: 'a wide-angle corner perspective at eye level',
    side: 'a straight-on frontal elevation view',
    topdown: 'a bird\'s-eye top-down view from above',
  };

  const prompt = `Transform this 3D room render into a stunning photorealistic interior design photograph.

CRITICAL RULES:
- Keep ALL furniture in their EXACT positions as shown — do NOT move, add, or remove ANY objects
- Keep ALL walls, doors, and windows in their EXACT positions
- Keep the room proportions and camera angle EXACTLY as shown
- This is ${viewDescriptions[viewType]} of a ${roomTypeName}

STYLE TO APPLY: ${stylePromptModifier}

ENHANCEMENT INSTRUCTIONS:
- Replace the simple 3D materials with photorealistic textures (real wood grain, fabric weave, stone texture, metal finishes)
- Add natural lighting from the windows with realistic light rays, soft shadows, and ambient occlusion
- Add subtle atmospheric effects (warm ambient light, gentle reflections on floors)
- Make materials look real: matte/glossy surfaces, textile patterns, wood knots
- Add small lifestyle details: a coffee cup, a book, a plant — but DO NOT move any furniture
- The final image should look like a professional interior design magazine photograph
- No watermarks, text, labels, or annotations

Generate this photorealistic version NOW.`;

  const response = await getOpenAI().images.edit({
    model: 'gpt-image-1.5',
    image: imageFile,
    prompt,
    size: '1536x1024',
    quality: 'high',
  });

  return response.data?.[0]?.b64_json || '';
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
