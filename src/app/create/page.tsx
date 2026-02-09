'use client';

import { useCreateStore } from '@/store/useCreateStore';
import StepIndicator from '@/components/create/StepIndicator';
import FileUpload from '@/components/create/FileUpload';
import StyleSelector from '@/components/create/StyleSelector';
import RoomTypeSelector from '@/components/create/RoomTypeSelector';
import GenerateButton from '@/components/create/GenerateButton';
import ResultDisplay from '@/components/create/ResultDisplay';

export default function CreatePage() {
  const { currentStep, generationStatus, errorMessage } = useCreateStore();

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

        {/* Step 2: Configuration (visible after upload) */}
        {currentStep >= 2 && (
          <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <StyleSelector />
            <RoomTypeSelector />
            <GenerateButton />
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
          <div className="flex flex-col items-center gap-4 py-12">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-brand border-t-transparent" />
            <p className="text-muted">Designs werden generiert...</p>
            <p className="text-xs text-muted">3 Ansichten — das dauert ca. 1-2 Minuten</p>
          </div>
        )}
      </div>
    </div>
  );
}
