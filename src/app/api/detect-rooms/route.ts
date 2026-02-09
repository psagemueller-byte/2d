import { NextRequest, NextResponse } from 'next/server';
import { detectRoomsInFloorPlan } from '@/lib/openai';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API Key nicht konfiguriert' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { imageData } = body;

    if (!imageData) {
      return NextResponse.json({ error: 'Kein Bild übergeben' }, { status: 400 });
    }

    // Strip data URL prefix if present
    const base64 = imageData.includes(',') ? imageData.split(',')[1] : imageData;

    const rooms = await detectRoomsInFloorPlan(base64);

    if (!rooms || rooms.length === 0) {
      return NextResponse.json(
        { error: 'Keine Räume im Grundriss erkannt. Bitte versuche es mit einem anderen Bild.' },
        { status: 400 }
      );
    }

    return NextResponse.json({ rooms });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    console.error('Detect rooms error:', message);
    return NextResponse.json(
      { error: `Raumerkennung fehlgeschlagen: ${message}` },
      { status: 500 }
    );
  }
}
