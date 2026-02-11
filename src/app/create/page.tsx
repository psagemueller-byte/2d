'use client';

import { useEffect, useRef } from 'react';
import { useCreateStore } from '@/store/useCreateStore';
import { compressImageForDetection } from '@/lib/image-utils';
import StepIndicator from '@/components/create/StepIndicator';
import FileUpload from '@/components/create/FileUpload';
import RoomDetection from '@/components/create/RoomDetection';
import ResultDisplay from '@/components/create/ResultDisplay';
import LoadingExperience from '@/components/ui/LoadingExperience';

export default function CreatePage() {
  const {
    currentStep,
    previewUrl,
    generationStatus,
    errorMessage,
    detectedRooms,
    isDetecting,
    detectionError,
    setDetectedRooms,
    setIsDetecting,
    setDetectionError,
  } = useCreateStore();

  const hasDetected = useRef(false);

  // Auto-detect rooms when preview is uploaded
  useEffect(() => {
    if (!previewUrl || detectedRooms.length > 0 || hasDetected.current || isDetecting) return;

    hasDetected.current = true;

    const detectRooms = async () => {
      setIsDetecting(true);
      setDetectionError(null);

      try {
        // Compress image aggressively for fast detection
        let compressedImage: string;
        try {
          compressedImage = await compressImageForDetection(previewUrl);
        } catch {
          compressedImage = previewUrl;
        }

        const body = JSON.stringify({ imageData: compressedImage });

        // Try up to 2 attempts (retry once on timeout)
        let res: Response | null = null;
        for (let attempt = 0; attempt < 2; attempt++) {
          res = await fetch('/api/detect-rooms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body,
          });
          // Retry on 504 (Vercel timeout) or 502 (cold start)
          if ((res.status === 504 || res.status === 502) && attempt === 0) continue;
          break;
        }

        if (!res || !res.ok) {
          const contentType = res?.headers.get('content-type') || '';
          if (res && (res.status === 504 || res.status === 502 || !contentType.includes('application/json'))) {
            throw new Error('Die Raumerkennung hat zu lange gedauert. Bitte versuche es erneut.');
          }
          const data = res ? await res.json().catch(() => ({})) : {};
          throw new Error((data as Record<string, string>).error || 'Raumerkennung fehlgeschlagen');
        }

        const { rooms } = await res.json();

        // Validate room data before storing in state
        if (!Array.isArray(rooms) || rooms.length === 0) {
          throw new Error('Keine gültigen Räume erkannt');
        }

        const validRoomTypes = ['living-room', 'bedroom', 'kitchen', 'bathroom', 'office'];
        const validRooms = rooms
          .filter((r: Record<string, unknown>) => r && typeof r.id === 'string' && typeof r.name === 'string')
          .map((r: Record<string, unknown>) => ({
            ...r,
            type: validRoomTypes.includes(r.type as string) ? r.type : 'living-room',
          }));

        if (validRooms.length === 0) {
          throw new Error('Keine gültigen Räume im Ergebnis');
        }

        setDetectedRooms(validRooms as Parameters<typeof setDetectedRooms>[0]);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Raumerkennung fehlgeschlagen';
        setDetectionError(msg);
      } finally {
        setIsDetecting(false);
      }
    };

    detectRooms();
  }, [previewUrl, detectedRooms.length, isDetecting, setDetectedRooms, setIsDetecting, setDetectionError]);

  // Reset detection flag when preview changes
  useEffect(() => {
    if (!previewUrl) {
      hasDetected.current = false;
    }
  }, [previewUrl]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Design erstellen
        </h1>
        <p className="mt-3 text-muted">
          Lade deinen Grundriss hoch und erstelle dein Traumzimmer
        </p>
      </div>

      {/* Step Indicator */}
      <div className="mt-8">
        <StepIndicator />
      </div>

      {/* Main Content */}
      <div className="mt-12 space-y-10">
        {/* Step 1: Upload */}
        <section>
          <FileUpload />
        </section>

        {/* Room Detection Loading */}
        {isDetecting && (
          <section>
            <LoadingExperience
              progress={15}
              phase="detecting"
              compact
            />
          </section>
        )}

        {/* Room Detection Error */}
        {detectionError && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
            <p className="text-sm text-red-400">{detectionError}</p>
            <button
              onClick={() => {
                hasDetected.current = false;
                setDetectionError(null);
              }}
              className="mt-2 text-sm font-medium text-[var(--brand)] hover:underline"
            >
              Erneut versuchen
            </button>
          </div>
        )}

        {/* Step 2: Room Selection + Style (visible after detection) */}
        {currentStep >= 2 && detectedRooms.length > 0 && (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <RoomDetection />
          </section>
        )}

        {/* Step 4: Result */}
        {currentStep === 4 && generationStatus === 'completed' && (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <ResultDisplay />
          </section>
        )}

        {/* Error message */}
        {errorMessage && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
            {errorMessage}
          </div>
        )}

        {/* Loading state */}
        {(generationStatus === 'analyzing' ||
          generationStatus === 'generating_view1' ||
          generationStatus === 'generating_view2' ||
          generationStatus === 'generating_view3') && (
          <LoadingExperience
            progress={
              generationStatus === 'analyzing' ? 10
              : generationStatus === 'generating_view1' ? 35
              : generationStatus === 'generating_view2' ? 60
              : 85
            }
            phase={generationStatus === 'analyzing' ? 'analyzing' : 'generating'}
          />
        )}
      </div>
    </div>
  );
}
