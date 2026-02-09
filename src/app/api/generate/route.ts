import { NextRequest, NextResponse } from 'next/server';
import { generateRoomVisualization, buildMultiViewPrompt } from '@/lib/openai';
import { ROOM_STYLES, ROOM_TYPES } from '@/lib/constants';
import type { ViewType } from '@/types';

export const maxDuration = 60;

const isDemoMode = !process.env.STRIPE_SECRET_KEY;

// Track used session IDs per view to prevent double-generation
const usedSessionViews = new Set<string>();

const VALID_VIEWS: ViewType[] = ['perspective', 'side', 'topdown'];

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API Key nicht konfiguriert' }, { status: 500 });
    }

    const body = await request.json();
    const { sessionId, imageData, style, roomType, analysis, viewType } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'Keine Session-ID' }, { status: 400 });
    }

    if (!viewType || !VALID_VIEWS.includes(viewType)) {
      return NextResponse.json({ error: 'Ungültiger View-Typ' }, { status: 400 });
    }

    // Check if this specific view for this session was already generated
    const sessionViewKey = `${sessionId}_${viewType}`;
    if (usedSessionViews.has(sessionViewKey)) {
      return NextResponse.json(
        { error: 'Diese Ansicht wurde bereits generiert' },
        { status: 400 }
      );
    }

    // Verify payment: skip in demo mode
    if (!isDemoMode && !sessionId.startsWith('demo_')) {
      const { getStripeServer } = await import('@/lib/stripe');
      const session = await getStripeServer().checkout.sessions.retrieve(sessionId);

      if (session.payment_status !== 'paid') {
        return NextResponse.json({ error: 'Zahlung nicht abgeschlossen' }, { status: 402 });
      }
    }

    // Mark this view as used
    usedSessionViews.add(sessionViewKey);

    // Validate inputs
    const styleData = ROOM_STYLES.find((s) => s.id === style);
    const roomData = ROOM_TYPES.find((r) => r.id === roomType);

    if (!styleData || !roomData) {
      usedSessionViews.delete(sessionViewKey);
      return NextResponse.json({ error: 'Ungültiger Stil oder Raumtyp' }, { status: 400 });
    }

    if (!imageData) {
      usedSessionViews.delete(sessionViewKey);
      return NextResponse.json({ error: 'Kein Bild übergeben' }, { status: 400 });
    }

    // Strip data URL prefix if present
    const base64 = imageData.includes(',') ? imageData.split(',')[1] : imageData;

    // Build the view-specific prompt
    const prompt = buildMultiViewPrompt(
      viewType as ViewType,
      styleData.name,
      styleData.promptModifier,
      roomData.name,
      analysis || 'A standard room floor plan layout.'
    );

    // Generate the image
    const resultBase64 = await generateRoomVisualization(base64, prompt);

    if (!resultBase64) {
      usedSessionViews.delete(sessionViewKey);
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
