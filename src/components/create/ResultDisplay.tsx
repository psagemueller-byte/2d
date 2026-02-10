'use client';

import { useState } from 'react';
import { Download, RotateCcw, Eye, Layers, ArrowDown, Home, Share2, Check, Loader2, type LucideIcon } from 'lucide-react';
import { useCreateStore } from '@/store/useCreateStore';
import { ROOM_STYLES, ROOM_TYPES } from '@/lib/constants';
import Button from '@/components/ui/Button';

const viewIcons: Record<string, LucideIcon> = {
  perspective: Eye,
  side: Layers,
  topdown: ArrowDown,
};

const viewLabels: Record<string, string> = {
  perspective: 'Perspektivansicht',
  side: 'Frontalansicht',
  topdown: 'Draufsicht',
};

export default function ResultDisplay() {
  const { roomResults, previewUrl, reset, detectedRooms } = useCreateStore();
  const [activeRoomIdx, setActiveRoomIdx] = useState(0);
  const [activeViewIdx, setActiveViewIdx] = useState(0);

  // Gallery sharing state
  const [showShareForm, setShowShareForm] = useState(false);
  const [shareName, setShareName] = useState('');
  const [shareConsent, setShareConsent] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [shareError, setShareError] = useState('');

  if (roomResults.length === 0) return null;

  const activeRoom = roomResults[activeRoomIdx];
  const activeView = activeRoom?.views?.[activeViewIdx];

  // Get style and room type names for active room
  const activeDetectedRoom = detectedRooms.find((r) => r.id === activeRoom?.roomId);
  const styleName = ROOM_STYLES.find((s) => s.id === activeDetectedRoom?.selectedStyle)?.name || '';
  const roomTypeName = ROOM_TYPES.find((r) => r.id === activeDetectedRoom?.type)?.name || activeRoom?.roomName || '';

  const handleDownload = (imageUrl: string, label: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `roomvision-${label.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadAll = () => {
    let delay = 0;
    for (const room of roomResults) {
      for (const view of room.views) {
        setTimeout(() => {
          handleDownload(view.imageUrl, `${room.roomName}-${view.type}`);
        }, delay);
        delay += 500;
      }
    }
  };

  const handleShareSubmit = async () => {
    if (!shareConsent || !activeView) return;
    setShareLoading(true);
    setShareError('');

    try {
      const res = await fetch('/api/gallery/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageData: activeView.imageUrl,
          userName: shareName.trim() || 'Anonym',
          roomStyle: styleName,
          roomType: roomTypeName,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Upload fehlgeschlagen');
      }

      setShareSuccess(true);
      setShowShareForm(false);
    } catch (err) {
      setShareError(err instanceof Error ? err.message : 'Upload fehlgeschlagen');
    } finally {
      setShareLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Original floor plan */}
      {previewUrl && (
        <div>
          <p className="mb-2 text-sm font-medium text-muted">Grundriss (Original)</p>
          <div className="overflow-hidden rounded-2xl border border-border max-w-sm">
            <img
              src={previewUrl}
              alt="Original Grundriss"
              className="w-full object-contain max-h-[250px]"
            />
          </div>
        </div>
      )}

      {/* Room Tabs (top level) — only show if multiple rooms */}
      {roomResults.length > 1 && (
        <div>
          <p className="mb-2 text-sm font-medium text-muted">Raum auswählen:</p>
          <div className="flex flex-wrap gap-2">
            {roomResults.map((room, i) => (
              <button
                key={room.roomId}
                onClick={() => {
                  setActiveRoomIdx(i);
                  setActiveViewIdx(0);
                }}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                  activeRoomIdx === i
                    ? 'bg-brand text-white shadow-lg shadow-brand/20'
                    : 'bg-surface border border-border text-muted hover:text-foreground hover:border-brand/30'
                }`}
              >
                <Home className="h-4 w-4" />
                {room.roomName}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* View tabs (second level) */}
      {activeRoom && (
        <div>
          <div className="flex gap-2 border-b border-border pb-0">
            {activeRoom.views.map((view, i) => {
              const Icon = viewIcons[view.type] || Eye;
              const label = viewLabels[view.type] || view.type;

              return (
                <button
                  key={view.type}
                  onClick={() => setActiveViewIdx(i)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all -mb-px ${
                    activeViewIdx === i
                      ? 'border-brand text-brand'
                      : 'border-transparent text-muted hover:text-foreground hover:border-border'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              );
            })}
          </div>

          {/* Active view */}
          {activeView && (
            <div className="mt-4">
              <div className="overflow-hidden rounded-2xl border border-brand/30 shadow-lg shadow-brand/5">
                <img
                  src={activeView.imageUrl}
                  alt={activeView.label}
                  className="w-full object-contain max-h-[600px]"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* All views grid for active room */}
      {activeRoom && activeRoom.views.length > 1 && (
        <div>
          <p className="mb-3 text-sm font-medium text-muted">
            Alle Ansichten{roomResults.length > 1 ? ` — ${activeRoom.roomName}` : ''}
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            {activeRoom.views.map((view, i) => {
              const label = viewLabels[view.type] || view.type;

              return (
                <button
                  key={view.type}
                  onClick={() => setActiveViewIdx(i)}
                  className={`overflow-hidden rounded-xl border-2 transition-all ${
                    activeViewIdx === i
                      ? 'border-brand shadow-lg shadow-brand/10'
                      : 'border-border hover:border-brand/30'
                  }`}
                >
                  <img
                    src={view.imageUrl}
                    alt={label}
                    className="w-full object-contain aspect-[3/2]"
                  />
                  <p className="p-2 text-center text-xs font-medium">{label}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-3 sm:flex-row">
        {activeView && (
          <Button
            size="lg"
            onClick={() =>
              handleDownload(
                activeView.imageUrl,
                `${activeRoom.roomName}-${activeView.type}`
              )
            }
            className="flex-1"
          >
            <Download className="h-4 w-4" />
            Aktuelle Ansicht herunterladen
          </Button>
        )}
        <Button
          size="lg"
          variant="secondary"
          onClick={handleDownloadAll}
          className="flex-1"
        >
          <Download className="h-4 w-4" />
          Alle Bilder herunterladen ({roomResults.reduce((sum, r) => sum + r.views.length, 0)})
        </Button>
        <Button size="lg" variant="ghost" onClick={reset}>
          <RotateCcw className="h-4 w-4" />
          Neues Design
        </Button>
      </div>

      {/* Gallery Share Section */}
      <div className="rounded-xl border border-border bg-surface/50 p-6">
        {shareSuccess ? (
          <div className="flex items-center gap-3 text-brand">
            <Check className="h-5 w-5" />
            <div>
              <p className="font-medium">Vielen Dank!</p>
              <p className="text-sm text-muted">
                Dein Bild wird nach Freigabe in der Galerie auf unserer Startseite angezeigt.
              </p>
            </div>
          </div>
        ) : showShareForm ? (
          <div className="space-y-4">
            <div>
              <p className="font-medium">Bild zur Galerie hinzufügen</p>
              <p className="mt-1 text-sm text-muted">
                Zeige dein Design anderen Nutzern auf unserer Startseite.
              </p>
            </div>

            <input
              type="text"
              placeholder="Dein Name (optional)"
              value={shareName}
              onChange={(e) => setShareName(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm placeholder:text-muted focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              maxLength={50}
            />

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={shareConsent}
                onChange={(e) => setShareConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-border accent-brand"
              />
              <span className="text-sm text-muted">
                Ich stimme zu, dass mein generiertes Bild in der öffentlichen Galerie auf der
                Startseite angezeigt wird.
              </span>
            </label>

            {shareError && (
              <p className="text-sm text-red-400">{shareError}</p>
            )}

            <div className="flex gap-3">
              <Button
                size="md"
                disabled={!shareConsent || shareLoading}
                onClick={handleShareSubmit}
              >
                {shareLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Wird hochgeladen...
                  </>
                ) : (
                  <>
                    <Share2 className="h-4 w-4" />
                    Absenden
                  </>
                )}
              </Button>
              <Button
                size="md"
                variant="ghost"
                onClick={() => setShowShareForm(false)}
              >
                Abbrechen
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Gefällt dir dein Design?</p>
              <p className="text-sm text-muted">
                Teile es in unserer Galerie und inspiriere andere Nutzer.
              </p>
            </div>
            <Button
              size="md"
              variant="secondary"
              onClick={() => setShowShareForm(true)}
            >
              <Share2 className="h-4 w-4" />
              Zur Galerie
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
