import { NextRequest, NextResponse } from 'next/server';
import { generateRoomVisualization, buildGenerationPrompt } from '@/lib/openai';
import { ROOM_STYLES, ROOM_TYPES } from '@/lib/constants';

export const maxDuration = 60;

const isDemoMode = !process.env.STRIPE_SECRET_KEY;

// Track used session IDs to prevent double-generation
const usedSessions = new Set<string>();

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API Key nicht konfiguriert' }, { status: 500 });
    }

    const body = await request.json();
    const { sessionId, imageData, style, roomType, analysis } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'Keine Session-ID' }, { status: 400 });
    }

    // Check if session was already used
    if (usedSessions.has(sessionId)) {
      return NextResponse.json(
        { error: 'Diese Sitzung wurde bereits verwendet' },
        { status: 400 }
      );
    }

    // Verify payment: skip in demo mode, check Stripe in production
    if (!isDemoMode && !sessionId.startsWith('demo_')) {
      const { getStripeServer } = await import('@/lib/stripe');
      const session = await getStripeServer().checkout.sessions.retrieve(sessionId);

      if (session.payment_status !== 'paid') {
        return NextResponse.json({ error: 'Zahlung nicht abgeschlossen' }, { status: 402 });
      }
    }

    // Mark session as used
    usedSessions.add(sessionId);

    // Validate inputs
    const styleData = ROOM_STYLES.find((s) => s.id === style);
    const roomData = ROOM_TYPES.find((r) => r.id === roomType);

    if (!styleData || !roomData) {
      usedSessions.delete(sessionId);
      return NextResponse.json({ error: 'Ungültiger Stil oder Raumtyp' }, { status: 400 });
    }

    if (!imageData) {
      usedSessions.delete(sessionId);
      return NextResponse.json({ error: 'Kein Bild übergeben' }, { status: 400 });
    }

    // Strip data URL prefix if present
    const base64 = imageData.includes(',') ? imageData.split(',')[1] : imageData;

    // Build the prompt
    const prompt = buildGenerationPrompt(
      styleData.name,
      styleData.promptModifier,
      roomData.name,
      analysis || 'A room floor plan layout'
    );

    // Generate the image
    const resultBase64 = await generateRoomVisualization(base64, prompt);

    if (!resultBase64) {
      usedSessions.delete(sessionId);
      return NextResponse.json({ error: 'Bildgenerierung lieferte kein Ergebnis' }, { status: 500 });
    }

    return NextResponse.json({ imageData: `data:image/png;base64,${resultBase64}` });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    console.error('Generate error:', message);
    return NextResponse.json(
      { error: `Generierung fehlgeschlagen: ${message}` },
      { status: 500 }
    );
  }
}
