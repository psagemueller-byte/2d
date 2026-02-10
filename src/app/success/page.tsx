'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useCreateStore } from '@/store/useCreateStore';
import { compressImageDataUrl } from '@/lib/image-utils';
import ResultDisplay from '@/components/create/ResultDisplay';
import { Suspense } from 'react';
import type { RoomResult, GeneratedView, ViewType } from '@/types';

const POLL_INTERVAL = 4000; // Poll every 4 seconds

const VIEW_LABELS: Record<string, string> = {
  perspective: 'Perspektivansicht',
  side: 'Frontalansicht',
  topdown: 'Draufsicht',
};

interface PollResult {
  roomId: string;
  roomName: string;
  viewType: string;
  viewLabel: string;
  imageData: string;
}

interface PollResponse {
  status: 'pending' | 'analyzing' | 'generating' | 'completed' | 'failed';
  totalViews: number;
  completedViews: number;
  results: PollResult[];
  error?: string;
  isProcessing: boolean;
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const hasStarted = useRef(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const {
    previewUrl,
    detectedRooms,
    generationStatus,
    roomResults,
    setGenerationStatus,
    addRoomResult,
    setCompleted,
    setError,
    setStripeSessionId,
    setCurrentStep,
  } = useCreateStore();

  const selectedRooms = detectedRooms.filter((r) => r.selected && r.selectedStyle);

  const [totalViews, setTotalViews] = useState(0);
  const [completedViews, setCompletedViews] = useState(0);
  const [serverStatus, setServerStatus] = useState<string>('pending');
  const processedResultsRef = useRef(0);

  // Build room results from poll results
  const processResults = useCallback(
    (results: PollResult[]) => {
      // Only process new results
      if (results.length <= processedResultsRef.current) return;

      // Group by room
      const roomMap = new Map<string, { roomId: string; roomName: string; views: GeneratedView[] }>();

      for (const r of results) {
        if (!roomMap.has(r.roomId)) {
          roomMap.set(r.roomId, { roomId: r.roomId, roomName: r.roomName, views: [] });
        }
        roomMap.get(r.roomId)!.views.push({
          type: r.viewType as ViewType,
          label: `${r.roomName} — ${VIEW_LABELS[r.viewType] || r.viewType}`,
          imageUrl: r.imageData,
          roomId: r.roomId,
        });
      }

      // Only add newly completed rooms
      // We need to find rooms that have all 3 views and haven't been added yet
      const existingRoomIds = new Set(roomResults.map((rr) => rr.roomId));

      for (const [roomId, data] of roomMap) {
        // Check if this room has more views than what we've already added
        const existingRoom = roomResults.find((rr) => rr.roomId === roomId);
        if (!existingRoom && data.views.length > 0) {
          addRoomResult({
            roomId: data.roomId,
            roomName: data.roomName,
            views: data.views,
          });
        } else if (existingRoom && data.views.length > existingRoom.views.length) {
          // Room has more views now — we need to replace it
          // Since we can't update, we'll track this differently
        }
      }

      processedResultsRef.current = results.length;
    },
    [roomResults, addRoomResult]
  );

  // Poll for status
  const poll = useCallback(async () => {
    if (!sessionId) return;

    try {
      const res = await fetch(`/api/generation-status?session_id=${sessionId}`);
      if (!res.ok) return;

      const data: PollResponse = await res.json();
      setServerStatus(data.status);
      setTotalViews(data.totalViews);
      setCompletedViews(data.completedViews);

      if (data.status === 'analyzing') {
        setGenerationStatus('analyzing');
      } else if (data.status === 'generating') {
        // Map to view step based on completed count
        const viewStep = (data.completedViews % 3) as 0 | 1 | 2;
        const steps = ['generating_view1', 'generating_view2', 'generating_view3'] as const;
        setGenerationStatus(steps[viewStep]);
      }

      // Process new results
      if (data.results && data.results.length > 0) {
        processResults(data.results);
      }

      // Job complete
      if (data.status === 'completed') {
        // Final process of all results
        if (data.results) {
          processResults(data.results);
        }
        setCompleted();
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      }

      // Job failed
      if (data.status === 'failed' && data.error) {
        setError(data.error);
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      }
    } catch {
      // Network error (phone asleep etc.) — just retry next interval
    }
  }, [sessionId, setGenerationStatus, setCompleted, setError, processResults]);

  // Kickoff generation
  useEffect(() => {
    if (!sessionId || hasStarted.current) return;
    if (!previewUrl) return;
    if (selectedRooms.length === 0) return;

    hasStarted.current = true;
    setStripeSessionId(sessionId);
    setCurrentStep(4);
    setGenerationStatus('analyzing');

    const kickoff = async () => {
      try {
        // Compress image
        let compressedImage: string;
        try {
          compressedImage = await compressImageDataUrl(previewUrl);
        } catch {
          compressedImage = previewUrl;
        }

        // Send single kickoff request
        const res = await fetch('/api/generate-all', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            imageData: compressedImage,
            rooms: selectedRooms.map((r) => ({
              id: r.id,
              name: r.name,
              type: r.type,
              style: r.selectedStyle,
              description: r.description,
            })),
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Generierung konnte nicht gestartet werden');
        }

        // Start polling
        pollRef.current = setInterval(poll, POLL_INTERVAL);
        // Also poll immediately after kickoff response
        poll();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten';
        setError(msg);
      }
    };

    kickoff();

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
      }
    };
  }, [sessionId, previewUrl, selectedRooms, setStripeSessionId, setCurrentStep, setGenerationStatus, setError, poll]);

  // Also handle visibility change (phone wakes up)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && sessionId && generationStatus !== 'completed' && generationStatus !== 'failed') {
        // Phone woke up — poll immediately
        poll();
        // Restart polling interval if it was cleared
        if (!pollRef.current) {
          pollRef.current = setInterval(poll, POLL_INTERVAL);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [sessionId, generationStatus, poll]);

  // Missing data
  if (!previewUrl || selectedRooms.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <h1 className="text-2xl font-bold">Sitzung abgelaufen</h1>
        <p className="mt-4 text-muted">
          Die Sitzungsdaten konnten nicht gefunden werden. Bitte starte den Prozess erneut.
        </p>
        <a
          href="/create"
          className="mt-6 inline-block rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          Zurück zum Design-Tool
        </a>
      </div>
    );
  }

  const isGenerating =
    generationStatus === 'analyzing' ||
    generationStatus === 'generating_view1' ||
    generationStatus === 'generating_view2' ||
    generationStatus === 'generating_view3';

  const progressPercent =
    serverStatus === 'analyzing'
      ? 5
      : totalViews > 0
      ? Math.min(95, 10 + (completedViews / totalViews) * 85)
      : generationStatus === 'completed'
      ? 100
      : 10;

  // Current room being generated
  const currentRoomIdx = Math.floor(completedViews / 3);
  const currentRoom = selectedRooms[currentRoomIdx];
  const currentViewIdx = completedViews % 3;
  const viewNames = ['Perspektivansicht', 'Frontalansicht', 'Draufsicht'];

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {generationStatus === 'completed'
            ? 'Deine Designs sind fertig!'
            : generationStatus === 'failed'
            ? 'Fehler bei der Generierung'
            : 'Deine Designs werden erstellt...'}
        </h1>
        {isGenerating && (
          <p className="mt-3 text-muted">
            {selectedRooms.length} {selectedRooms.length === 1 ? 'Raum' : 'Räume'} mit je 3 Ansichten — du kannst den Bildschirm ruhig ausschalten, die Generierung läuft weiter.
          </p>
        )}
      </div>

      <div className="mt-12">
        {/* Progress bar + Status */}
        {isGenerating && (
          <div className="mx-auto max-w-md space-y-4 py-8">
            <div className="h-2 overflow-hidden rounded-full bg-surface">
              <div
                className="h-full rounded-full bg-brand transition-all duration-1000 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="flex flex-col items-center gap-2">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand border-t-transparent" />
              <p className="text-base font-medium">
                {serverStatus === 'analyzing'
                  ? 'Grundriss wird analysiert...'
                  : currentRoom
                  ? `${currentRoom.name}: ${viewNames[currentViewIdx] || 'Generierung'} (${currentRoomIdx + 1}/${selectedRooms.length})`
                  : 'Wird generiert...'}
              </p>
              <p className="text-xs text-muted">
                {completedViews}/{totalViews} Ansichten fertig
              </p>
            </div>

            {/* Show already generated room results */}
            {roomResults.length > 0 && (
              <div className="mt-8 space-y-6">
                <p className="text-sm font-medium text-center text-muted">Bereits fertig:</p>
                {roomResults.map((roomResult) => (
                  <div key={roomResult.roomId} className="space-y-2">
                    <p className="text-sm font-semibold text-brand">{roomResult.roomName}</p>
                    <div className="grid gap-3 sm:grid-cols-3">
                      {roomResult.views.map((view) => (
                        <div key={`${view.roomId}_${view.type}`} className="overflow-hidden rounded-xl border border-brand/30">
                          <img src={view.imageUrl} alt={view.label} className="w-full object-contain" />
                          <p className="p-2 text-center text-xs font-medium text-brand">
                            {VIEW_LABELS[view.type] || view.type}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Final Result */}
        {generationStatus === 'completed' && <ResultDisplay />}

        {/* Error */}
        {generationStatus === 'failed' && (
          <div className="mx-auto max-w-lg">
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center">
              <p className="text-red-400">{useCreateStore.getState().errorMessage || 'Generierung fehlgeschlagen'}</p>
              <a
                href="/create"
                className="mt-4 inline-block rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white hover:bg-brand-dark"
              >
                Erneut versuchen
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-24">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-brand border-t-transparent" />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
