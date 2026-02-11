import { NextRequest, NextResponse } from 'next/server';
import { generateRoomVisualization, buildMultiViewPrompt } from '@/lib/openai';
import { ROOM_STYLES, ROOM_TYPES } from '@/lib/constants';
import type { ViewType } from '@/types';

// Fluid Compute: 300s on all Vercel plans including Hobby.
export const maxDuration = 300;

/**
 * POST /api/generate-view
 *
 * Generates a SINGLE room visualization view.
 * Fully self-contained — all needed data comes in the request body.
 * No dependency on in-memory store (avoids Vercel multi-instance problem).
 *
 * Request body:
 *   imageBase64: string   — floor plan image (base64, no data URL prefix)
 *   analysis: string      — floor plan analysis text from generate-all
 *   roomName: string      — name of the room to generate
 *   roomDescription: string — description of the room
 *   roomType: string      — room type ID (e.g., "living-room")
 *   style: string         — style ID (e.g., "modern")
 *   viewType: string      — "perspective" | "side" | "topdown"
 *
 * Returns:
 *   viewGenerated: { roomId, roomName, viewType, viewLabel, imageData }
 */
export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API Key nicht konfiguriert' }, { status: 500 });
    }

    const body = await request.json();
    const {
      imageBase64,
      analysis,
      roomId,
      roomName,
      roomDescription,
      roomType,
      style,
      viewType,
      viewLabel,
    } = body;

    if (!imageBase64 || !roomType || !style || !viewType) {
      return NextResponse.json(
        { error: 'Fehlende Pflichtfelder (imageBase64, roomType, style, viewType)' },
        { status: 400 }
      );
    }

    const styleData = ROOM_STYLES.find((s) => s.id === style);
    const roomData = ROOM_TYPES.find((r) => r.id === roomType);

    if (!styleData || !roomData) {
      return NextResponse.json({ error: 'Stil oder Raumtyp nicht gefunden' }, { status: 400 });
    }

    // Build prompt and generate
    const prompt = buildMultiViewPrompt(
      viewType as ViewType,
      styleData.name,
      styleData.promptModifier,
      roomData.name,
      analysis || '',
      roomName || '',
      roomDescription || ''
    );

    const resultBase64 = await generateRoomVisualization(imageBase64, prompt);

    return NextResponse.json({
      viewGenerated: {
        roomId: roomId || '',
        roomName: roomName || '',
        viewType,
        viewLabel: viewLabel || viewType,
        imageData: resultBase64 ? `data:image/png;base64,${resultBase64}` : null,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Generierung fehlgeschlagen';
    console.error(`Generate-view error:`, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
