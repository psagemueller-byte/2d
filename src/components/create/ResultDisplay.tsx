'use client';

import { useState } from 'react';
import { Download, RotateCcw, Eye, Layers, ArrowDown } from 'lucide-react';
import { useCreateStore } from '@/store/useCreateStore';
import Button from '@/components/ui/Button';

const viewIcons = {
  perspective: Eye,
  side: Layers,
  topdown: ArrowDown,
};

export default function ResultDisplay() {
  const { resultViews, previewUrl, reset } = useCreateStore();
  const [activeTab, setActiveTab] = useState(0);

  if (resultViews.length === 0) return null;

  const activeView = resultViews[activeTab];

  const handleDownload = (imageUrl: string, label: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `roomvision-${label.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadAll = () => {
    resultViews.forEach((view, i) => {
      setTimeout(() => {
        handleDownload(view.imageUrl, view.label);
      }, i * 500);
    });
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

      {/* View tabs */}
      <div>
        <div className="flex gap-2 border-b border-border pb-0">
          {resultViews.map((view, i) => {
            const Icon = viewIcons[view.type] || Eye;
            return (
              <button
                key={view.type}
                onClick={() => setActiveTab(i)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all -mb-px ${
                  activeTab === i
                    ? 'border-brand text-brand'
                    : 'border-transparent text-muted hover:text-foreground hover:border-border'
                }`}
              >
                <Icon className="h-4 w-4" />
                {view.label}
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

      {/* All views grid */}
      {resultViews.length > 1 && (
        <div>
          <p className="mb-3 text-sm font-medium text-muted">Alle Ansichten</p>
          <div className="grid gap-4 sm:grid-cols-3">
            {resultViews.map((view, i) => (
              <button
                key={view.type}
                onClick={() => setActiveTab(i)}
                className={`overflow-hidden rounded-xl border-2 transition-all ${
                  activeTab === i
                    ? 'border-brand shadow-lg shadow-brand/10'
                    : 'border-border hover:border-brand/30'
                }`}
              >
                <img
                  src={view.imageUrl}
                  alt={view.label}
                  className="w-full object-contain aspect-[3/2]"
                />
                <p className="p-2 text-center text-xs font-medium">{view.label}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-3 sm:flex-row">
        {activeView && (
          <Button
            size="lg"
            onClick={() => handleDownload(activeView.imageUrl, activeView.label)}
            className="flex-1"
          >
            <Download className="h-4 w-4" />
            Aktuelle Ansicht herunterladen
          </Button>
        )}
        {resultViews.length > 1 && (
          <Button
            size="lg"
            variant="secondary"
            onClick={handleDownloadAll}
            className="flex-1"
          >
            <Download className="h-4 w-4" />
            Alle {resultViews.length} Ansichten herunterladen
          </Button>
        )}
        <Button size="lg" variant="ghost" onClick={reset}>
          <RotateCcw className="h-4 w-4" />
          Neues Design
        </Button>
      </div>
    </div>
  );
}
