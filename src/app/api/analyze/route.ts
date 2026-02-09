import { NextRequest, NextResponse } from 'next/server';
import { analyzeFloorPlan } from '@/lib/openai';

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const { imageData } = await request.json();

    if (!imageData) {
      return NextResponse.json({ error: 'Kein Bild übergeben' }, { status: 400 });
    }

    // Strip data URL prefix if present
    const base64 = imageData.includes(',') ? imageData.split(',')[1] : imageData;

    const analysis = await analyzeFloorPlan(base64);

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error('Analyze error:', error);
    return NextResponse.json(
      { error: 'Analyse fehlgeschlagen' },
      { status: 500 }
    );
  }
}
