import { NextRequest, NextResponse } from 'next/server';
import { analyzeFloorPlan } from '@/lib/openai';

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageData } = body;

    if (!imageData) {
      return NextResponse.json({ error: 'Kein Bild übergeben' }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API Key nicht konfiguriert' }, { status: 500 });
    }

    // Strip data URL prefix if present
    const base64 = imageData.includes(',') ? imageData.split(',')[1] : imageData;

    const analysis = await analyzeFloorPlan(base64);

    return NextResponse.json({ analysis });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    console.error('Analyze error:', message);
    return NextResponse.json(
      { error: `Analyse fehlgeschlagen: ${message}` },
      { status: 500 }
    );
  }
}
