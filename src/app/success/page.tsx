'use client';

import { useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useCreateStore } from '@/store/useCreateStore';
import { compressImageDataUrl } from '@/lib/image-utils';
import ResultDisplay from '@/components/create/ResultDisplay';
import { Suspense } from 'react';
import type { ViewType, GeneratedView, GenerationStep, DetectedRoom, RoomResult } from '@/types';

const VIEWS: { type: ViewType; label: string; step: GenerationStep }[] = [
  { type: 'perspective', label: 'Perspektivansicht', step: 'generating_view1' },
  { type: 'side', label: 'Frontalansicht', step: 'generating_view2' },
  { type: 'topdown', label: 'Draufsicht', step: 'generating_view3' },
];

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const hasStarted = useRef(false);

  const {
    previewUrl,
    detectedRooms,
    generationStatus,
    resultViews,
    roomResults,
    errorMessage,
    setGenerationStatus,
    addResultView,
    addRoomResult,
    setCompleted,
    setError,
    setStripeSessionId,
    setCurrentStep,
  } = useCreateStore();

  const selectedRooms = detectedRooms.filter((r) => r.selected && r.selectedStyle);

  useEffect(() => {
    if (!sessionId || hasStarted.current) return;
    if (!previewUrl) return;
    if (selectedRooms.length === 0) return;

    hasStarted.current = true;
    setStripeSessionId(sessionId);
    setCurrentStep(4);

    const generate = async () => {
      try {
        // Compress image before sending
        setGenerationStatus('analyzing');
        let compressedImage: string;
        try {
          compressedImage = await compressImageDataUrl(previewUrl);
        } catch {
          compressedImage = previewUrl;
        }

        // Step 1: Analyze floor plan (get detailed structural description)
        const analyzeRes = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageData: compressedImage }),
        });

        let analysis = '';
        if (analyzeRes.ok) {
          const analyzeData = await analyzeRes.json();
          analysis = analyzeData.analysis;
        } else {
          console.warn('Analyze failed, continuing without analysis');
        }

        // Step 2: Generate views for each selected room
        for (let roomIdx = 0; roomIdx < selectedRooms.length; roomIdx++) {
          const room = selectedRooms[roomIdx];
          const roomViews: GeneratedView[] = [];

          for (const view of VIEWS) {
            setGenerationStatus(view.step);

            const generateRes = await fetch('/api/generate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sessionId,
                imageData: compressedImage,
                style: room.selectedStyle,
                roomType: room.type,
                analysis,
                viewType: view.type,
                roomId: room.id,
                roomName: room.name,
                roomDescription: room.description,
              }),
            });

            if (!generateRes.ok) {
              const errorData = await generateRes.json().catch(() => ({}));
              console.error(`Room ${room.name} View ${view.type} failed:`, errorData.error);
              continue;
            }

            const { imageData } = await generateRes.json();
            const generatedView: GeneratedView = {
              type: view.type,
              label: `${room.name} — ${view.label}`,
              imageUrl: imageData,
              roomId: room.id,
            };

            roomViews.push(generatedView);
            addResultView(generatedView);
          }

          // Add room result
          if (roomViews.length > 0) {
            addRoomResult({
              roomId: room.id,
              roomName: room.name,
              views: roomViews,
            });
          }
        }

        setCompleted();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten';
        console.error('Generation failed:', msg);
        setError(msg);
      }
    };

    generate();
  }, [
    sessionId,
    previewUrl,
    selectedRooms,
    setGenerationStatus,
    addResultView,
    addRoomResult,
    setCompleted,
    setError,
    setStripeSessionId,
    setCurrentStep,
  ]);

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

  // Calculate progress based on rooms and views
  const totalViews = selectedRooms.length * 3;
  const completedViews = resultViews.length;
  const progressPercent =
    generationStatus === 'analyzing'
      ? 5
      : totalViews > 0
      ? Math.min(95, 10 + (completedViews / totalViews) * 85)
      : generationStatus === 'completed'
      ? 100
      : 10;

  // Find which room is currently being generated
  const currentRoomIdx = Math.floor(completedViews / 3);
  const currentRoom = selectedRooms[currentRoomIdx];
  const currentViewIdx = completedViews % 3;

  const statusLabels: Record<string, string> = {
    analyzing: 'Grundriss wird analysiert...',
    generating_view1: currentRoom
      ? `${currentRoom.name}: Perspektivansicht (${currentRoomIdx + 1}/${selectedRooms.length})`
      : 'Perspektivansicht wird generiert...',
    generating_view2: currentRoom
      ? `${currentRoom.name}: Frontalansicht (${currentRoomIdx + 1}/${selectedRooms.length})`
      : 'Frontalansicht wird generiert...',
    generating_view3: currentRoom
      ? `${currentRoom.name}: Draufsicht (${currentRoomIdx + 1}/${selectedRooms.length})`
      : 'Draufsicht wird generiert...',
  };

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
            {selectedRooms.length} {selectedRooms.length === 1 ? 'Raum' : 'Räume'} mit je 3 Ansichten — bitte hab etwas Geduld.
          </p>
        )}
      </div>

      <div className="mt-12">
        {/* Progress bar + Status */}
        {isGenerating && (
          <div className="mx-auto max-w-md space-y-4 py-8">
            {/* Progress bar */}
            <div className="h-2 overflow-hidden rounded-full bg-surface">
              <div
                className="h-full rounded-full bg-brand transition-all duration-1000 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="flex flex-col items-center gap-2">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand border-t-transparent" />
              <p className="text-base font-medium">
                {statusLabels[generationStatus] || 'Wird generiert...'}
              </p>
              <p className="text-xs text-muted">
                {completedViews}/{totalViews} Ansichten fertig
              </p>
            </div>

            {/* Show already generated views while others are loading */}
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
                            {VIEWS.find((v) => v.type === view.type)?.label || view.type}
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
        {generationStatus === 'failed' && errorMessage && (
          <div className="mx-auto max-w-lg">
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center">
              <p className="text-red-400">{errorMessage}</p>
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
