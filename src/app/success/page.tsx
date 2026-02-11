'use client';

import { useEffect, useRef, useState, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useCreateStore } from '@/store/useCreateStore';
import { compressImageDataUrl } from '@/lib/image-utils';
import ResultDisplay from '@/components/create/ResultDisplay';
import LoadingExperience from '@/components/ui/LoadingExperience';
import type { LoadingPhase } from '@/components/ui/LoadingExperience';
import type { GeneratedView, ViewType } from '@/types';

const VIEW_LABELS: Record<string, string> = {
  perspective: 'Perspektivansicht',
  side: 'Frontalansicht',
  topdown: 'Draufsicht',
};

interface TaskInfo {
  index: number;
  roomId: string;
  roomName: string;
  roomDescription: string;
  roomType: string;
  style: string;
  viewType: string;
  viewLabel: string;
}

interface KickoffResponse {
  status: string;
  analysis: string;
  imageBase64: string;
  totalViews: number;
  tasks: TaskInfo[];
  error?: string;
}

interface GenerateViewResponse {
  viewGenerated?: {
    roomId: string;
    roomName: string;
    viewType: string;
    viewLabel: string;
    imageData: string | null;
  };
  error?: string;
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const hasStarted = useRef(false);

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

  const selectedRooms = useMemo(
    () => detectedRooms.filter((r) => r.selected && r.selectedStyle),
    [detectedRooms]
  );

  const [totalViews, setTotalViews] = useState(0);
  const [completedViews, setCompletedViews] = useState(0);
  const [currentGeneratingView, setCurrentGeneratingView] = useState<string>('');

  // Track completed views per room to build room results
  const roomViewsRef = useRef<Map<string, { roomId: string; roomName: string; views: GeneratedView[] }>>(
    new Map()
  );
  const addedRoomsRef = useRef<Set<string>>(new Set());

  // Process a single generated view into room results.
  // Uses refs to avoid stale closure issues inside the async pipeline loop.
  const processGeneratedView = useCallback(
    (view: { roomId: string; roomName: string; viewType: string; viewLabel: string; imageData: string }) => {
      const existing = roomViewsRef.current.get(view.roomId) || {
        roomId: view.roomId,
        roomName: view.roomName,
        views: [],
      };

      existing.views.push({
        type: view.viewType as ViewType,
        label: `${view.roomName} — ${VIEW_LABELS[view.viewType] || view.viewType}`,
        imageUrl: view.imageData,
        roomId: view.roomId,
      });

      roomViewsRef.current.set(view.roomId, existing);

      // When all 3 views for a room are done, add as room result
      if (existing.views.length === 3 && !addedRoomsRef.current.has(view.roomId)) {
        addedRoomsRef.current.add(view.roomId);
        addRoomResult({
          roomId: existing.roomId,
          roomName: existing.roomName,
          views: existing.views,
        });
      }
    },
    [addRoomResult]
  );

  // ── Main generation pipeline ──
  // Client drives generation by calling /api/generate-view for each task.
  // Each call is self-contained (sends all data), no in-memory store dependency.
  useEffect(() => {
    if (!sessionId || hasStarted.current) return;
    if (!previewUrl) return;
    if (selectedRooms.length === 0) return;

    hasStarted.current = true;
    setStripeSessionId(sessionId);
    setCurrentStep(4);
    setGenerationStatus('analyzing');

    const runPipeline = async () => {
      try {
        // Step 1: Kickoff — analyze floor plan, get task list (~3-5s)
        let compressedImage: string;
        try {
          compressedImage = await compressImageDataUrl(previewUrl);
        } catch {
          compressedImage = previewUrl;
        }

        const kickoffRes = await fetch('/api/generate-all', {
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

        if (!kickoffRes.ok) {
          const contentType = kickoffRes.headers.get('content-type') || '';
          if (kickoffRes.status === 504 || kickoffRes.status === 502 || !contentType.includes('application/json')) {
            throw new Error('Die Analyse hat zu lange gedauert. Bitte versuche es erneut.');
          }
          const data = await kickoffRes.json().catch(() => ({}));
          throw new Error((data as Record<string, string>).error || 'Generierung konnte nicht gestartet werden');
        }

        const kickoffData: KickoffResponse = await kickoffRes.json();
        const { analysis, imageBase64, tasks } = kickoffData;
        setTotalViews(tasks.length);
        setGenerationStatus('beautifying');

        // Step 2: Generate each view sequentially.
        // Each call sends ALL data needed (self-contained, no server-side state).
        // Uses maxDuration=300 (Fluid Compute) → up to 5 min per view.
        let completed = 0;
        let successCount = 0;

        for (const task of tasks) {
          setCurrentGeneratingView(
            `${task.roomName} — ${VIEW_LABELS[task.viewType] || task.viewType}`
          );

          try {
            const viewRes = await fetch('/api/generate-view', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                imageBase64,
                analysis,
                roomId: task.roomId,
                roomName: task.roomName,
                roomDescription: task.roomDescription,
                roomType: task.roomType,
                style: task.style,
                viewType: task.viewType,
                viewLabel: task.viewLabel,
              }),
            });

            if (!viewRes.ok) {
              const contentType = viewRes.headers.get('content-type') || '';
              if (viewRes.status === 504 || viewRes.status === 502 || !contentType.includes('application/json')) {
                console.warn(`View ${task.index} timed out, skipping...`);
                completed++;
                setCompletedViews(completed);
                continue;
              }
              const errData = await viewRes.json().catch(() => ({}));
              console.warn(`View ${task.index} failed:`, (errData as Record<string, string>).error);
              completed++;
              setCompletedViews(completed);
              continue;
            }

            const viewData: GenerateViewResponse = await viewRes.json();

            if (viewData.viewGenerated?.imageData) {
              processGeneratedView({
                roomId: viewData.viewGenerated.roomId,
                roomName: viewData.viewGenerated.roomName,
                viewType: viewData.viewGenerated.viewType,
                viewLabel: viewData.viewGenerated.viewLabel,
                imageData: viewData.viewGenerated.imageData,
              });
              successCount++;
            }

            completed++;
            setCompletedViews(completed);

          } catch (err) {
            console.warn(`View ${task.index} error:`, err);
            completed++;
            setCompletedViews(completed);
          }
        }

        // Step 3: All done
        if (successCount > 0) {
          setCompleted();
        } else {
          setError(
            'Leider konnten keine Bilder generiert werden. ' +
            'Bitte versuche es erneut oder wähle weniger Räume.'
          );
        }

      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten';
        setError(msg);
      }
    };

    runPipeline();
  }, [sessionId, previewUrl, selectedRooms, setStripeSessionId, setCurrentStep, setGenerationStatus, setError, setCompleted, processGeneratedView]);

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
    generationStatus === 'beautifying' ||
    generationStatus === 'generating_view1' ||
    generationStatus === 'generating_view2' ||
    generationStatus === 'generating_view3';

  const progressPercent =
    generationStatus === 'analyzing'
      ? 5
      : totalViews > 0
      ? Math.min(95, 5 + (completedViews / totalViews) * 90)
      : generationStatus === 'completed'
      ? 100
      : 10;

  const currentRoomIdx = Math.floor(completedViews / 3);
  const currentRoom = selectedRooms[currentRoomIdx];

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
            {selectedRooms.length} {selectedRooms.length === 1 ? 'Raum' : 'Räume'} mit je 3 Ansichten
            {' — Bitte lass dieses Fenster geöffnet.'}
          </p>
        )}
      </div>

      <div className="mt-12">
        {/* Progress + Status */}
        {isGenerating && (
          <div>
            <LoadingExperience
              progress={progressPercent}
              phase={
                generationStatus === 'analyzing'
                  ? 'analyzing'
                  : 'beautifying' as LoadingPhase
              }
              currentItem={currentGeneratingView || currentRoom?.name}
              completedCount={completedViews}
              totalCount={totalViews}
            />

            {/* Show already generated room results */}
            {roomResults.length > 0 && (
              <div className="mx-auto max-w-lg mt-4 space-y-6">
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
