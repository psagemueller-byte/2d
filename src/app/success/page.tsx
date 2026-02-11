'use client';

import { useEffect, useRef, useState, useCallback, useMemo, lazy, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useCreateStore } from '@/store/useCreateStore';
import { compressImageDataUrl } from '@/lib/image-utils';
import ResultDisplay from '@/components/create/ResultDisplay';
import LoadingExperience from '@/components/ui/LoadingExperience';
import type { LoadingPhase } from '@/components/ui/LoadingExperience';
import { getFurnitureForRoom } from '@/lib/furniture-registry';
import { placeFurniture } from '@/lib/furniture-placer';
import type { RoomResult, GeneratedView, ViewType } from '@/types';
import type { RenderedView, PlacedFurniture } from '@/types/scene3d';

// Lazy load the heavy 3D scene component
const RoomScene = lazy(() => import('@/components/3d/RoomScene'));

const POLL_INTERVAL = 4000;

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

  const selectedRooms = useMemo(
    () => detectedRooms.filter((r) => r.selected && r.selectedStyle),
    [detectedRooms]
  );

  const [totalViews, setTotalViews] = useState(0);
  const [completedViews, setCompletedViews] = useState(0);
  const [serverStatus, setServerStatus] = useState<string>('pending');
  const processedResultsRef = useRef(0);

  // 3D rendering state
  const [renderingRoom, setRenderingRoom] = useState<string | null>(null);
  const [renderedViews, setRenderedViews] = useState<RenderedView[]>([]);
  const [allRoomsRendered, setAllRoomsRendered] = useState(false);
  const [currentRoomForRender, setCurrentRoomForRender] = useState(0);

  // 3D pipeline disabled — WebGL context crashes on many devices/browsers.
  // Using legacy server pipeline instead (sends floor plan to OpenAI directly).
  const has3DGeometry = false;

  // Build room results from poll results
  const processResults = useCallback(
    (results: PollResult[]) => {
      if (results.length <= processedResultsRef.current) return;

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

      for (const [roomId, data] of roomMap) {
        const existingRoom = roomResults.find((rr) => rr.roomId === roomId);
        if (!existingRoom && data.views.length > 0) {
          addRoomResult({
            roomId: data.roomId,
            roomName: data.roomName,
            views: data.views,
          });
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
        setGenerationStatus('beautifying');
      }

      if (data.results && data.results.length > 0) {
        processResults(data.results);
      }

      if (data.status === 'completed') {
        if (data.results) processResults(data.results);
        setCompleted();
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      }

      if (data.status === 'failed' && data.error) {
        setError(data.error);
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      }
    } catch {
      // Network error — retry next interval
    }
  }, [sessionId, setGenerationStatus, setCompleted, setError, processResults]);

  // Handle 3D render complete for a room
  const handleRoomRenderComplete = useCallback(
    (views: RenderedView[]) => {
      setRenderedViews((prev) => [...prev, ...views]);

      // Move to next room
      const nextIdx = currentRoomForRender + 1;
      if (nextIdx < selectedRooms.length) {
        setCurrentRoomForRender(nextIdx);
        setRenderingRoom(selectedRooms[nextIdx].id);
      } else {
        // All rooms rendered
        setAllRoomsRendered(true);
        setRenderingRoom(null);
      }
    },
    [currentRoomForRender, selectedRooms]
  );

  // ── Kickoff: 3D pipeline or legacy ──
  useEffect(() => {
    if (!sessionId || hasStarted.current) return;
    if (!previewUrl) return;
    if (selectedRooms.length === 0) return;

    hasStarted.current = true;
    setStripeSessionId(sessionId);
    setCurrentStep(4);

    if (has3DGeometry) {
      // 3D Pipeline: Start rendering in browser
      setGenerationStatus('rendering_3d');
      setRenderingRoom(selectedRooms[0].id);
      setCurrentRoomForRender(0);
    } else {
      // Legacy Pipeline: Send to server
      setGenerationStatus('analyzing');

      const kickoff = async () => {
        try {
          let compressedImage: string;
          try {
            compressedImage = await compressImageDataUrl(previewUrl);
          } catch {
            compressedImage = previewUrl;
          }

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
            const contentType = res.headers.get('content-type') || '';
            if (res.status === 504 || res.status === 502 || !contentType.includes('application/json')) {
              throw new Error('Der Server hat zu lange gebraucht. Bitte versuche es erneut.');
            }
            const data = await res.json().catch(() => ({}));
            throw new Error((data as Record<string, string>).error || 'Generierung konnte nicht gestartet werden');
          }

          pollRef.current = setInterval(poll, POLL_INTERVAL);
          poll();
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten';
          setError(msg);
        }
      };

      kickoff();
    }

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [sessionId, previewUrl, selectedRooms, has3DGeometry, setStripeSessionId, setCurrentStep, setGenerationStatus, setError, poll]);

  // ── After 3D renders are complete, send to server for beautification ──
  const hasSentBeautification = useRef(false);
  useEffect(() => {
    if (!allRoomsRendered || !sessionId) return;
    if (renderedViews.length === 0) return;
    if (hasSentBeautification.current) return;

    hasSentBeautification.current = true;
    setGenerationStatus('beautifying');

    const sendForBeautification = async () => {
      try {
        const res = await fetch('/api/generate-all', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            rooms: selectedRooms.map((r) => ({
              id: r.id,
              name: r.name,
              type: r.type,
              style: r.selectedStyle,
              description: r.description,
            })),
            renderedViews: renderedViews.map((rv) => ({
              roomId: rv.roomId,
              viewType: rv.viewType,
              imageData: rv.dataUrl,
            })),
          }),
        });

        if (!res.ok) {
          const contentType = res.headers.get('content-type') || '';
          if (res.status === 504 || res.status === 502 || !contentType.includes('application/json')) {
            throw new Error('Der Server hat zu lange gebraucht. Bitte versuche es erneut.');
          }
          const data = await res.json().catch(() => ({}));
          throw new Error((data as Record<string, string>).error || 'Beautification konnte nicht gestartet werden');
        }

        // Start polling for beautification results
        pollRef.current = setInterval(poll, POLL_INTERVAL);
        poll();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten';
        setError(msg);
      }
    };

    sendForBeautification();
  }, [allRoomsRendered, renderedViews, sessionId, selectedRooms, setGenerationStatus, setError, poll]);

  // Visibility change handler
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (
        document.visibilityState === 'visible' &&
        sessionId &&
        generationStatus !== 'completed' &&
        generationStatus !== 'failed' &&
        generationStatus !== 'rendering_3d'
      ) {
        poll();
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
    generationStatus === 'rendering_3d' ||
    generationStatus === 'beautifying' ||
    generationStatus === 'generating_view1' ||
    generationStatus === 'generating_view2' ||
    generationStatus === 'generating_view3';

  const is3DRendering = generationStatus === 'rendering_3d';

  const progressPercent = is3DRendering
    ? Math.min(30, (renderedViews.length / Math.max(1, selectedRooms.length * 3)) * 30)
    : serverStatus === 'analyzing'
    ? 5
    : totalViews > 0
    ? Math.min(95, 30 + (completedViews / totalViews) * 65)
    : generationStatus === 'completed'
    ? 100
    : 10;

  const currentRoomIdx = Math.floor(completedViews / 3);
  const currentRoom = selectedRooms[currentRoomIdx];
  const currentViewIdx = completedViews % 3;
  const viewNames = ['Perspektivansicht', 'Frontalansicht', 'Draufsicht'];

  // Get the room currently being 3D rendered
  const room3DRendering = renderingRoom
    ? selectedRooms.find((r) => r.id === renderingRoom)
    : null;

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
            {!is3DRendering && ' — du kannst den Bildschirm ruhig ausschalten, die Generierung läuft weiter.'}
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
                is3DRendering
                  ? 'rendering_3d'
                  : generationStatus === 'beautifying'
                  ? 'beautifying'
                  : serverStatus === 'analyzing'
                  ? 'analyzing'
                  : 'generating' as LoadingPhase
              }
              currentItem={currentRoom?.name}
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

        {/* 3D Scene (offscreen rendering) */}
        {is3DRendering && room3DRendering && room3DRendering.geometry && room3DRendering.selectedStyle && (
          <Suspense fallback={null}>
            <RoomScene
              geometry={room3DRendering.geometry}
              furniture={placeFurniture(
                room3DRendering.geometry,
                getFurnitureForRoom(room3DRendering.type, room3DRendering.selectedStyle)
              )}
              style={room3DRendering.selectedStyle}
              onRenderComplete={handleRoomRenderComplete}
              autoCapture
            />
          </Suspense>
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
