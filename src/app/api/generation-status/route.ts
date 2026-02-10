import { NextRequest, NextResponse } from 'next/server';
import { getJob, updateJob, addResult } from '@/lib/generation-store';
import { generateRoomVisualization, buildMultiViewPrompt } from '@/lib/openai';
import { ROOM_STYLES, ROOM_TYPES } from '@/lib/constants';
import type { ViewType } from '@/types';

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('session_id');

  if (!sessionId) {
    return NextResponse.json({ error: 'Keine Session-ID' }, { status: 400 });
  }

  const job = getJob(sessionId);

  if (!job) {
    return NextResponse.json({ error: 'Job nicht gefunden' }, { status: 404 });
  }

  // If job is not processing and has remaining tasks, trigger next view generation
  if (
    !job.isProcessing &&
    job.status === 'generating' &&
    job.results.length < job.tasks.length
  ) {
    // Mark as processing to prevent double-trigger from parallel polls
    updateJob(sessionId, { isProcessing: true });

    const nextTask = job.tasks[job.results.length];

    try {
      const styleData = ROOM_STYLES.find((s) => s.id === nextTask.style);
      const roomData = ROOM_TYPES.find((r) => r.id === nextTask.roomType);

      if (styleData && roomData) {
        const prompt = buildMultiViewPrompt(
          nextTask.viewType as ViewType,
          styleData.name,
          styleData.promptModifier,
          roomData.name,
          job.analysis,
          nextTask.roomName,
          nextTask.roomDescription
        );

        const resultBase64 = await generateRoomVisualization(job.imageData, prompt);

        if (resultBase64) {
          addResult(sessionId, {
            roomId: nextTask.roomId,
            roomName: nextTask.roomName,
            viewType: nextTask.viewType,
            viewLabel: nextTask.viewLabel,
            imageData: `data:image/png;base64,${resultBase64}`,
          });
        }
      }

      // Check if all tasks are done
      const updatedJob = getJob(sessionId);
      if (updatedJob && updatedJob.results.length >= updatedJob.tasks.length) {
        updateJob(sessionId, { status: 'completed', isProcessing: false });
      } else {
        updateJob(sessionId, { isProcessing: false });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Generierung fehlgeschlagen';
      console.error(`Generation-status error (task ${job.results.length}):`, msg);
      // Don't fail the whole job — skip this view and continue
      updateJob(sessionId, { isProcessing: false });
    }
  }

  // Return current state
  const currentJob = getJob(sessionId)!;
  return NextResponse.json({
    status: currentJob.status,
    totalViews: currentJob.tasks.length,
    completedViews: currentJob.results.length,
    results: currentJob.results,
    error: currentJob.error,
    isProcessing: currentJob.isProcessing,
  });
}
