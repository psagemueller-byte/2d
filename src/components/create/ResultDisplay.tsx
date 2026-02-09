'use client';

import { useState } from 'react';
import { Download, RotateCcw, Eye, Layers, ArrowDown, Home } from 'lucide-react';
import { useCreateStore } from '@/store/useCreateStore';
import Button from '@/components/ui/Button';

const viewIcons: Record<string, React.ElementType> = {
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
  const { roomResults, previewUrl, reset } = useCreateStore();
  const [activeRoomIdx, setActiveRoomIdx] = useState(0);
  const [activeViewIdx, setActiveViewIdx] = useState(0);

  if (roomResults.length === 0) return null;

  const activeRoom = roomResults[activeRoomIdx];
  const activeView = activeRoom?.views?.[activeViewIdx];

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
    </div>
  );
}
