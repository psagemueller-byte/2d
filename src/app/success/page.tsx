'use client';

import { useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useCreateStore } from '@/store/useCreateStore';
import { compressImageDataUrl } from '@/lib/image-utils';
import ResultDisplay from '@/components/create/ResultDisplay';
import { Suspense } from 'react';

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const hasStarted = useRef(false);

  const {
    previewUrl,
    selectedStyle,
    selectedRoomType,
    generationStatus,
    errorMessage,
    setGenerationStatus,
    setResultImageUrl,
    setError,
    setStripeSessionId,
    setCurrentStep,
  } = useCreateStore();

  useEffect(() => {
    if (!sessionId || hasStarted.current) return;
    if (!previewUrl || !selectedStyle || !selectedRoomType) return;

    hasStarted.current = true;
    setStripeSessionId(sessionId);
    setCurrentStep(4);

    const generate = async () => {
      try {
        // Compress image before sending to API (Vercel has 4.5MB body limit)
        setGenerationStatus('analyzing');
        let compressedImage: string;
        try {
          compressedImage = await compressImageDataUrl(previewUrl);
        } catch {
          compressedImage = previewUrl;
        }

        // Step 1: Analyze floor plan
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
          const errData = await analyzeRes.json().catch(() => ({}));
          console.warn('Analyze failed:', analyzeRes.status, errData.error);
          // Continue without analysis — generation can still work
        }

        // Step 2: Generate visualization
        setGenerationStatus('generating');
        const generateRes = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            imageData: compressedImage,
            style: selectedStyle,
            roomType: selectedRoomType,
            analysis,
          }),
        });

        if (!generateRes.ok) {
          const errorData = await generateRes.json().catch(() => ({}));
          throw new Error(errorData.error || `Server-Fehler (${generateRes.status})`);
        }

        const { imageData } = await generateRes.json();
        setResultImageUrl(imageData);
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
    selectedStyle,
    selectedRoomType,
    setGenerationStatus,
    setResultImageUrl,
    setError,
    setStripeSessionId,
    setCurrentStep,
  ]);

  // Missing data — redirect happened without session storage
  if (!previewUrl || !selectedStyle || !selectedRoomType) {
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

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {generationStatus === 'completed'
            ? 'Dein Design ist fertig!'
            : generationStatus === 'failed'
            ? 'Fehler bei der Generierung'
            : 'Dein Design wird erstellt...'}
        </h1>
        {generationStatus !== 'completed' && generationStatus !== 'failed' && (
          <p className="mt-3 text-muted">
            Die KI arbeitet an deinem Raumdesign.
          </p>
        )}
      </div>

      <div className="mt-12">
        {/* Loading */}
        {(generationStatus === 'analyzing' || generationStatus === 'generating') && (
          <div className="flex flex-col items-center gap-4 py-12">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-brand border-t-transparent" />
            <p className="text-lg font-medium">
              {generationStatus === 'analyzing'
                ? 'Grundriss wird analysiert...'
                : 'Raumdesign wird generiert...'}
            </p>
            <p className="text-sm text-muted">Das dauert normalerweise 15-30 Sekunden</p>
          </div>
        )}

        {/* Result */}
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
