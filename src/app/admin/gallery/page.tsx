'use client';

import { useEffect, useState, useCallback } from 'react';
import { Check, X, Trash2, Loader2, Eye, Clock, Ban, type LucideIcon } from 'lucide-react';
import type { GalleryEntry } from '@/types/gallery';

type Tab = 'pending' | 'approved' | 'rejected';

export default function AdminGalleryPage() {
  const [entries, setEntries] = useState<GalleryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('pending');
  const [error, setError] = useState('');

  const fetchEntries = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/gallery');
      if (!res.ok) throw new Error('Fetch failed');
      const data = await res.json();
      setEntries(data.entries || []);
    } catch {
      setError('Galerie konnte nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const handleAction = async (entryId: string, action: 'approve' | 'reject' | 'delete') => {
    setActionLoading(entryId);
    setError('');

    try {
      const res = await fetch('/api/admin/gallery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, entryId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Aktion fehlgeschlagen');
      }

      // Refresh list
      await fetchEntries();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Aktion fehlgeschlagen');
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = entries.filter((e) => e.status === activeTab);

  const tabConfig: { id: Tab; label: string; icon: LucideIcon; count: number }[] = [
    { id: 'pending', label: 'Ausstehend', icon: Clock, count: entries.filter((e) => e.status === 'pending').length },
    { id: 'approved', label: 'Freigegeben', icon: Check, count: entries.filter((e) => e.status === 'approved').length },
    { id: 'rejected', label: 'Abgelehnt', icon: Ban, count: entries.filter((e) => e.status === 'rejected').length },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-brand" />
          <span className="text-muted">Galerie wird geladen...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Galerie-Verwaltung</h1>
        <p className="mt-2 text-muted">
          {entries.length} Einträge insgesamt — {entries.filter((e) => e.status === 'pending').length} ausstehend
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="mb-8 flex gap-2 border-b border-border">
        {tabConfig.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all -mb-px ${
                activeTab === tab.id
                  ? 'border-brand text-brand'
                  : 'border-transparent text-muted hover:text-foreground hover:border-border'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
              {tab.count > 0 && (
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    activeTab === tab.id
                      ? 'bg-brand/10 text-brand'
                      : 'bg-surface text-muted'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="py-12 text-center text-muted">
          <p>Keine {activeTab === 'pending' ? 'ausstehenden' : activeTab === 'approved' ? 'freigegebenen' : 'abgelehnten'} Einträge.</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((entry) => (
            <div
              key={entry.id}
              className="overflow-hidden rounded-2xl border border-border bg-surface"
            >
              {/* Image */}
              <div className="aspect-[4/3] relative bg-background">
                <img
                  src={entry.imageUrl}
                  alt={`${entry.roomStyle} ${entry.roomType}`}
                  className="h-full w-full object-cover"
                />
                {/* Status badge */}
                <div className="absolute top-3 right-3">
                  <span
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold shadow-lg backdrop-blur-sm ${
                      entry.status === 'pending'
                        ? 'bg-yellow-500/90 text-white'
                        : entry.status === 'approved'
                        ? 'bg-green-500/90 text-white'
                        : 'bg-red-500/90 text-white'
                    }`}
                  >
                    {entry.status === 'pending'
                      ? 'Ausstehend'
                      : entry.status === 'approved'
                      ? 'Freigegeben'
                      : 'Abgelehnt'}
                  </span>
                </div>
              </div>

              {/* Info */}
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{entry.roomStyle}</p>
                    <p className="text-sm text-muted">{entry.roomType}</p>
                  </div>
                  <span className="text-sm text-muted">von {entry.userName}</span>
                </div>

                <p className="text-xs text-muted">
                  {new Date(entry.createdAt).toLocaleDateString('de-DE', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  {entry.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleAction(entry.id, 'approve')}
                        disabled={actionLoading === entry.id}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-50"
                      >
                        {actionLoading === entry.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Check className="h-3.5 w-3.5" />
                        )}
                        Freigeben
                      </button>
                      <button
                        onClick={() => handleAction(entry.id, 'reject')}
                        disabled={actionLoading === entry.id}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                      >
                        <X className="h-3.5 w-3.5" />
                        Ablehnen
                      </button>
                    </>
                  )}

                  {entry.status === 'approved' && (
                    <>
                      <button
                        onClick={() => handleAction(entry.id, 'reject')}
                        disabled={actionLoading === entry.id}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted transition-colors hover:text-foreground disabled:opacity-50"
                      >
                        <X className="h-3.5 w-3.5" />
                        Zurückziehen
                      </button>
                      <a
                        href={entry.imageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted transition-colors hover:text-foreground"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Öffnen
                      </a>
                    </>
                  )}

                  {entry.status === 'rejected' && (
                    <button
                      onClick={() => handleAction(entry.id, 'approve')}
                      disabled={actionLoading === entry.id}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted transition-colors hover:text-foreground disabled:opacity-50"
                    >
                      {actionLoading === entry.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )}
                      Doch freigeben
                    </button>
                  )}

                  {/* Delete button for all states */}
                  <button
                    onClick={() => {
                      if (confirm('Eintrag und Bild endgültig löschen?')) {
                        handleAction(entry.id, 'delete');
                      }
                    }}
                    disabled={actionLoading === entry.id}
                    className="flex items-center justify-center rounded-lg border border-border px-3 py-2 text-xs text-muted transition-colors hover:border-red-500/30 hover:text-red-400 disabled:opacity-50"
                    title="Endgültig löschen"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
