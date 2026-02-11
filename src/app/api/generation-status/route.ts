import { NextRequest, NextResponse } from 'next/server';
import { getJob } from '@/lib/generation-store';

export const maxDuration = 60;

/**
 * GET /api/generation-status
 *
 * Pure read-only status endpoint. Returns job state + completed results.
 * Does NOT trigger any image generation — that's handled by /api/generate-view.
 */
export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('session_id');

  if (!sessionId) {
    return NextResponse.json({ error: 'Keine Session-ID' }, { status: 400 });
  }

  const job = getJob(sessionId);

  if (!job) {
    return NextResponse.json({ error: 'Job nicht gefunden' }, { status: 404 });
  }

  return NextResponse.json({
    status: job.status,
    totalViews: job.tasks.length,
    completedViews: job.results.length,
    results: job.results,
    error: job.error,
    isProcessing: job.isProcessing,
  });
}
