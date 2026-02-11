import { NextRequest, NextResponse } from 'next/server';
import { ROOM_STYLES, ROOM_TYPES } from '@/lib/constants';
import { analyzeFloorPlan } from '@/lib/openai';
import type { ViewType } from '@/types';

export const maxDuration = 60;

const isDemoMode = !process.env.STRIPE_SECRET_KEY;

const VIEWS: { type: ViewType; label: string }[] = [
  { type: 'perspective', label: 'Perspektivansicht' },
  { type: 'side', label: 'Frontalansicht' },
  { type: 'topdown', label: 'Draufsicht' },
];

/**
 * POST /api/generate-all
 *
 * Analyzes the floor plan and returns a task list for the client.
 * Does NOT generate any images — the client calls /api/generate-view
 * for each view with all needed data (self-contained, no in-memory store).
 *
 * This avoids the Vercel serverless instance problem where generate-view
 * would land on a different container and lose the in-memory job data.
 */
export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API Key nicht konfiguriert' }, { status: 500 });
    }

    const body = await request.json();
    const { sessionId, imageData, rooms } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'Keine Session-ID' }, { status: 400 });
    }

    if (!rooms || !Array.isArray(rooms) || rooms.length === 0) {
      return NextResponse.json({ error: 'Keine Räume übergeben' }, { status: 400 });
    }

    // Verify payment in production
    if (!isDemoMode && !sessionId.startsWith('demo_')) {
      const { getStripeServer } = await import('@/lib/stripe');
      const session = await getStripeServer().checkout.sessions.retrieve(sessionId);
      if (session.payment_status !== 'paid') {
        return NextResponse.json({ error: 'Zahlung nicht abgeschlossen' }, { status: 402 });
      }
    }

    if (!imageData) {
      return NextResponse.json({ error: 'Kein Bild übergeben' }, { status: 400 });
    }

    const base64 = imageData.includes(',') ? imageData.split(',')[1] : imageData;

    // Step 1: Analyze floor plan (fast, ~3-5s with detail:'low')
    let analysis = '';
    try {
      analysis = await analyzeFloorPlan(base64);
    } catch (err) {
      console.warn('Analysis failed, continuing without:', err);
    }

    // Build task list — client will send each task to /api/generate-view
    const tasks = [];
    let taskIndex = 0;
    for (const room of rooms) {
      for (const view of VIEWS) {
        tasks.push({
          index: taskIndex++,
          roomId: room.id,
          roomName: room.name,
          roomDescription: room.description || '',
          roomType: room.type,
          style: room.style,
          viewType: view.type,
          viewLabel: view.label,
        });
      }
    }

    // Return analysis + task list. Client stores this and sends per-view.
    return NextResponse.json({
      status: 'generating',
      analysis,
      imageBase64: base64,
      totalViews: tasks.length,
      tasks,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    console.error('Generate-all error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
