import OpenAI from 'openai';

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
        content: `You are an expert interior designer and architect. Analyze this floor plan
and describe the room layout in detail. Include: room dimensions and proportions,
wall positions, window and door locations, any built-in features (closets, counters),
the overall shape of the space, and suggested furniture placement areas.
Be specific and visual in your description. Answer in English.`,
      },
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: {
              url: `data:image/png;base64,${imageBase64}`,
              detail: 'high',
            },
          },
          {
            type: 'text',
            text: 'Please analyze this floor plan in detail.',
          },
        ],
      },
    ],
    max_tokens: 1000,
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

export function buildGenerationPrompt(
  styleName: string,
  stylePromptModifier: string,
  roomTypeName: string,
  analysis: string
): string {
  return `Transform this floor plan into a photorealistic interior visualization.

Room type: ${roomTypeName}
Style: ${stylePromptModifier}

Floor plan analysis: ${analysis}

Create a photorealistic, high-quality interior design visualization showing
this room fully furnished and decorated in the ${styleName} style. Include
realistic lighting, materials, textures, and proportions. The perspective
should be a wide-angle interior photograph taken from a natural viewing position.
The image should look like a professional interior design magazine photo.`;
}
