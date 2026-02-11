import { NextRequest, NextResponse } from 'next/server';
import { ROOM_STYLES, ROOM_TYPES } from '@/lib/constants';
import { createJob, getJob, updateJob } from '@/lib/generation-store';
import { analyzeFloorPlan } from '@/lib/openai';
import type { GenerationTask } from '@/lib/generation-store';
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
 * Creates a generation job and queues tasks.
 * Does NOT generate any images — the client drives generation
 * by calling /api/generate-view for each view (Edge Runtime, no 10s limit).
 *
 * For legacy pipeline: runs analyzeFloorPlan (fast, ~3-5s with detail:'low').
 * For 3D pipeline: just queues beautification tasks.
 */
export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API Key nicht konfiguriert' }, { status: 500 });
    }

    const body = await request.json();
    const { sessionId, imageData, rooms, renderedViews } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'Keine Session-ID' }, { status: 400 });
    }

    if (!rooms || !Array.isArray(rooms) || rooms.length === 0) {
      return NextResponse.json({ error: 'Keine Räume übergeben' }, { status: 400 });
    }

    // Check if job already exists
    const existingJob = getJob(sessionId);
    if (existingJob) {
      return NextResponse.json({
        status: existingJob.status,
        totalViews: existingJob.tasks.length,
        completedViews: existingJob.results.length,
        tasks: existingJob.tasks.map((t, i) => ({
          index: i,
          roomId: t.roomId,
          roomName: t.roomName,
          viewType: t.viewType,
          viewLabel: t.viewLabel,
          completed: i < existingJob.results.length,
        })),
      });
    }

    // Verify payment in production
    if (!isDemoMode && !sessionId.startsWith('demo_')) {
      const { getStripeServer } = await import('@/lib/stripe');
      const session = await getStripeServer().checkout.sessions.retrieve(sessionId);
      if (session.payment_status !== 'paid') {
        return NextResponse.json({ error: 'Zahlung nicht abgeschlossen' }, { status: 402 });
      }
    }

    // ── Determine pipeline mode ──
    const is3DPipeline = renderedViews && Array.isArray(renderedViews) && renderedViews.length > 0;

    if (is3DPipeline) {
      // ═══════════════════════════════════════════
      // 3D PIPELINE: Client sent pre-rendered views
      // ═══════════════════════════════════════════

      const tasks: GenerationTask[] = [];
      for (const rv of renderedViews as { roomId: string; viewType: string; imageData: string }[]) {
        const room = rooms.find((r: { id: string }) => r.id === rv.roomId);
        if (!room) continue;

        const viewLabel = VIEWS.find((v) => v.type === rv.viewType)?.label || rv.viewType;
        tasks.push({
          roomId: rv.roomId,
          roomName: room.name,
          roomDescription: room.description || '',
          roomType: room.type,
          style: room.style,
          viewType: rv.viewType,
          viewLabel,
          taskType: 'beautify',
          renderedImageData: rv.imageData,
        });
      }

      // Create job — no image generation here
      createJob(sessionId, '', tasks);
      updateJob(sessionId, { status: 'generating' });

    } else {
      // ═══════════════════════════════════════════
      // LEGACY PIPELINE: Generate from floor plan
      // ═══════════════════════════════════════════

      if (!imageData) {
        return NextResponse.json({ error: 'Kein Bild übergeben' }, { status: 400 });
      }

      const tasks: GenerationTask[] = [];
      for (const room of rooms) {
        for (const view of VIEWS) {
          tasks.push({
            roomId: room.id,
            roomName: room.name,
            roomDescription: room.description || '',
            roomType: room.type,
            style: room.style,
            viewType: view.type,
            viewLabel: view.label,
            taskType: 'generate',
          });
        }
      }

      const base64 = imageData.includes(',') ? imageData.split(',')[1] : imageData;
      createJob(sessionId, base64, tasks);
      updateJob(sessionId, { status: 'analyzing' });

      // Step 1: Analyze floor plan (fast, ~3-5s with detail:'low')
      let analysis = '';
      try {
        analysis = await analyzeFloorPlan(base64);
      } catch (err) {
        console.warn('Analysis failed, continuing without:', err);
      }
      updateJob(sessionId, { analysis, status: 'generating' });
    }

    // Return job info with task list for client to drive generation
    const job = getJob(sessionId)!;
    return NextResponse.json({
      status: job.status,
      totalViews: job.tasks.length,
      completedViews: job.results.length,
      tasks: job.tasks.map((t, i) => ({
        index: i,
        roomId: t.roomId,
        roomName: t.roomName,
        viewType: t.viewType,
        viewLabel: t.viewLabel,
        completed: false,
      })),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    console.error('Generate-all error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
