import { NextRequest, NextResponse } from 'next/server';
import { getJob, addResult, updateJob } from '@/lib/generation-store';
import { generateRoomVisualization, buildMultiViewPrompt, beautifyRenderedImage } from '@/lib/openai';
import { ROOM_STYLES, ROOM_TYPES } from '@/lib/constants';
import type { ViewType } from '@/types';

// Use Node.js runtime but with maxDuration = 300 (Fluid Compute).
// Vercel Hobby supports up to 300s with Fluid Compute enabled.
// Fallback: even without Fluid Compute, Node.js runtime will try maxDuration.
export const maxDuration = 300;

/**
 * POST /api/generate-view
 *
 * Generates a SINGLE view for a generation job.
 * Called by the client for each view sequentially.
 * This endpoint takes 20-60s (OpenAI gpt-image-1.5), so it needs
 * a longer timeout than the default 10s on Vercel Hobby.
 *
 * With Fluid Compute (available on all Vercel plans), this can run
 * for up to 300 seconds.
 */
export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API Key nicht konfiguriert' }, { status: 500 });
    }

    const body = await request.json();
    const { sessionId, taskIndex } = body;

    if (!sessionId || taskIndex === undefined || taskIndex === null) {
      return NextResponse.json({ error: 'sessionId und taskIndex erforderlich' }, { status: 400 });
    }

    const job = getJob(sessionId);
    if (!job) {
      return NextResponse.json({ error: 'Job nicht gefunden' }, { status: 404 });
    }

    const task = job.tasks[taskIndex];
    if (!task) {
      return NextResponse.json({ error: `Task ${taskIndex} nicht gefunden` }, { status: 404 });
    }

    // Check if this task was already completed
    if (taskIndex < job.results.length) {
      return NextResponse.json({
        status: 'already_completed',
        completedViews: job.results.length,
        totalViews: job.tasks.length,
      });
    }

    const styleData = ROOM_STYLES.find((s) => s.id === task.style);
    const roomData = ROOM_TYPES.find((r) => r.id === task.roomType);

    if (!styleData || !roomData) {
      return NextResponse.json({ error: 'Stil oder Raumtyp nicht gefunden' }, { status: 400 });
    }

    let resultBase64 = '';

    if (task.taskType === 'beautify' && task.renderedImageData) {
      // ── 3D Pipeline: Beautify the pre-rendered 3D image ──
      const renderBase64 = task.renderedImageData.includes(',')
        ? task.renderedImageData.split(',')[1]
        : task.renderedImageData;

      resultBase64 = await beautifyRenderedImage(
        renderBase64,
        styleData.name,
        styleData.promptModifier,
        task.viewType as ViewType,
        roomData.name
      );
    } else {
      // ── Legacy Pipeline: Generate from floor plan ──
      const prompt = buildMultiViewPrompt(
        task.viewType as ViewType,
        styleData.name,
        styleData.promptModifier,
        roomData.name,
        job.analysis,
        task.roomName,
        task.roomDescription
      );

      resultBase64 = await generateRoomVisualization(job.imageData, prompt);
    }

    if (resultBase64) {
      addResult(sessionId, {
        roomId: task.roomId,
        roomName: task.roomName,
        viewType: task.viewType,
        viewLabel: task.viewLabel,
        imageData: `data:image/png;base64,${resultBase64}`,
      });
    }

    // Check if all tasks are done
    const updatedJob = getJob(sessionId);
    if (updatedJob && updatedJob.results.length >= updatedJob.tasks.length) {
      updateJob(sessionId, { status: 'completed' });
    }

    return NextResponse.json({
      status: updatedJob?.status || 'generating',
      completedViews: updatedJob?.results.length || 0,
      totalViews: updatedJob?.tasks.length || 0,
      viewGenerated: {
        roomId: task.roomId,
        roomName: task.roomName,
        viewType: task.viewType,
        viewLabel: task.viewLabel,
        imageData: resultBase64 ? `data:image/png;base64,${resultBase64}` : null,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Generierung fehlgeschlagen';
    console.error(`Generate-view error:`, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
