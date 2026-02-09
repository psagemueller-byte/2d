'use client';

import { Download, RotateCcw } from 'lucide-react';
import { useCreateStore } from '@/store/useCreateStore';
import Button from '@/components/ui/Button';

export default function ResultDisplay() {
  const { resultImageUrl, previewUrl, reset } = useCreateStore();

  if (!resultImageUrl) return null;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = resultImageUrl;
    link.download = `roomvision-design-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        {/* Original */}
        {previewUrl && (
          <div>
            <p className="mb-2 text-sm font-medium text-muted">Grundriss (Original)</p>
            <div className="overflow-hidden rounded-2xl border border-border">
              <img
                src={previewUrl}
                alt="Original Grundriss"
                className="w-full object-contain max-h-[400px]"
              />
            </div>
          </div>
        )}

        {/* Generated */}
        <div>
          <p className="mb-2 text-sm font-medium text-brand">KI-Visualisierung</p>
          <div className="overflow-hidden rounded-2xl border border-brand/30 shadow-lg shadow-brand/5">
            <img
              src={resultImageUrl}
              alt="Generiertes Raumdesign"
              className="w-full object-contain max-h-[400px]"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button size="lg" onClick={handleDownload} className="flex-1">
          <Download className="h-4 w-4" />
          HD-Bild herunterladen
        </Button>
        <Button size="lg" variant="secondary" onClick={reset} className="flex-1">
          <RotateCcw className="h-4 w-4" />
          Neues Design erstellen
        </Button>
      </div>
    </div>
  );
}
