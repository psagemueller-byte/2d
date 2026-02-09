'use client';

import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { useCreateStore } from '@/store/useCreateStore';
import Button from '@/components/ui/Button';

export default function GenerateButton() {
  const { previewUrl, selectedStyle, selectedRoomType, setError, setCurrentStep } =
    useCreateStore();
  const [loading, setLoading] = useState(false);

  const isReady = previewUrl && selectedStyle && selectedRoomType;

  const handleGenerate = async () => {
    if (!isReady) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          style: selectedStyle,
          roomType: selectedRoomType,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Checkout fehlgeschlagen');
      }

      const { url } = await res.json();
      setCurrentStep(3);
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <Button
        size="lg"
        className="w-full"
        disabled={!isReady || loading}
        onClick={handleGenerate}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Wird vorbereitet...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            Design generieren
          </>
        )}
      </Button>

      {!isReady && (
        <p className="text-center text-xs text-muted">
          {!previewUrl
            ? 'Bitte lade zuerst einen Grundriss hoch'
            : !selectedStyle
            ? 'Bitte wähle einen Einrichtungsstil'
            : 'Bitte wähle einen Raumtyp'}
        </p>
      )}
    </div>
  );
}
