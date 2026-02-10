'use client';

import { useState } from 'react';
import {
  Check,
  CheckSquare,
  Square,
  Minus,
  TreePine,
  Factory,
  Circle,
  Flower2,
  Crown,
  Fan,
  Sun,
  Sofa,
  Bed,
  CookingPot,
  Bath,
  Monitor,
  Sparkles,
  Loader2,
  ChevronDown,
  ChevronUp,
  type LucideIcon,
} from 'lucide-react';
import { useCreateStore } from '@/store/useCreateStore';
import { ROOM_STYLES, PRICE_PER_RENDER } from '@/lib/constants';
import Button from '@/components/ui/Button';
import type { RoomStyleId, RoomTypeId } from '@/types';

const styleIcons: Record<RoomStyleId, LucideIcon> = {
  modern: Minus,
  scandinavian: TreePine,
  industrial: Factory,
  minimalist: Circle,
  bohemian: Flower2,
  classic: Crown,
  japanese: Fan,
  mediterranean: Sun,
};

const roomTypeIcons: Record<RoomTypeId, LucideIcon> = {
  'living-room': Sofa,
  bedroom: Bed,
  kitchen: CookingPot,
  bathroom: Bath,
  office: Monitor,
};

const roomTypeLabels: Record<RoomTypeId, string> = {
  'living-room': 'Wohnzimmer',
  bedroom: 'Schlafzimmer',
  kitchen: 'Küche',
  bathroom: 'Badezimmer',
  office: 'Büro',
};

export default function RoomDetection() {
  const {
    detectedRooms,
    toggleRoomSelection,
    selectAllRooms,
    deselectAllRooms,
    setRoomStyle,
    setAllRoomsStyle,
    setError,
    setCurrentStep,
  } = useCreateStore();

  const [loading, setLoading] = useState(false);
  const [expandedRoom, setExpandedRoom] = useState<string | null>(null);
  const [globalStyle, setGlobalStyle] = useState<RoomStyleId | null>(null);

  const selectedRooms = detectedRooms.filter((r) => r.selected);
  const selectedCount = selectedRooms.length;
  const totalPrice = ((selectedCount * PRICE_PER_RENDER) / 100).toFixed(2);
  const allHaveStyle = selectedRooms.every((r) => r.selectedStyle);

  const handleGlobalStyleChange = (style: RoomStyleId) => {
    setGlobalStyle(style);
    setAllRoomsStyle(style);
  };

  const handleGenerate = async () => {
    if (selectedCount === 0) return;
    if (!allHaveStyle) {
      setError('Bitte wähle für jeden ausgewählten Raum einen Stil.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rooms: selectedRooms.map((r) => ({
            id: r.id,
            name: r.name,
            type: r.type,
            style: r.selectedStyle,
            description: r.description,
          })),
          quantity: selectedCount,
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
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold">Erkannte Räume</h3>
        <p className="mt-1 text-sm text-muted">
          {detectedRooms.length} Räume erkannt. Wähle die Räume aus, die du visualisieren möchtest.
        </p>
      </div>

      {/* Select All / Deselect */}
      <div className="flex gap-3">
        <button
          onClick={selectAllRooms}
          className="text-sm text-brand hover:text-brand-dark font-medium"
        >
          Alle auswählen
        </button>
        <span className="text-muted">|</span>
        <button
          onClick={deselectAllRooms}
          className="text-sm text-muted hover:text-foreground font-medium"
        >
          Alle abwählen
        </button>
      </div>

      {/* Room Cards */}
      <div className="space-y-3">
        {detectedRooms.map((room) => {
          const RoomIcon = roomTypeIcons[room.type] || Sofa;
          const isExpanded = expandedRoom === room.id;
          const StyleIcon = room.selectedStyle
            ? styleIcons[room.selectedStyle]
            : null;

          return (
            <div
              key={room.id}
              className={`rounded-xl border-2 transition-all duration-200 ${
                room.selected
                  ? 'border-brand/50 bg-brand/5'
                  : 'border-border bg-surface/50 opacity-60'
              }`}
            >
              {/* Room Header */}
              <div className="flex items-center gap-3 p-4">
                {/* Checkbox */}
                <button
                  onClick={() => toggleRoomSelection(room.id)}
                  className="flex-shrink-0"
                >
                  {room.selected ? (
                    <CheckSquare className="h-5 w-5 text-brand" />
                  ) : (
                    <Square className="h-5 w-5 text-muted" />
                  )}
                </button>

                {/* Room Icon */}
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg flex-shrink-0 ${
                    room.selected ? 'bg-brand/20 text-brand' : 'bg-surface text-muted'
                  }`}
                >
                  <RoomIcon className="h-5 w-5" />
                </div>

                {/* Room Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{room.name}</p>
                  <p className="text-xs text-muted">{roomTypeLabels[room.type]}</p>
                </div>

                {/* Style badge */}
                {room.selected && room.selectedStyle && StyleIcon && (
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-brand/10 text-brand text-xs font-medium">
                    <StyleIcon className="h-3.5 w-3.5" />
                    {ROOM_STYLES.find((s) => s.id === room.selectedStyle)?.name}
                  </div>
                )}

                {/* Expand button */}
                {room.selected && (
                  <button
                    onClick={() => setExpandedRoom(isExpanded ? null : room.id)}
                    className="flex-shrink-0 p-1 text-muted hover:text-foreground"
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                )}
              </div>

              {/* Expanded: Style Selection */}
              {room.selected && isExpanded && (
                <div className="border-t border-border/50 p-4 animate-in fade-in slide-in-from-top-2 duration-200">
                  <p className="text-sm font-medium mb-3">Stil für {room.name} wählen:</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {ROOM_STYLES.map((style) => {
                      const Icon = styleIcons[style.id];
                      const isSelected = room.selectedStyle === style.id;

                      return (
                        <button
                          key={style.id}
                          onClick={() => setRoomStyle(room.id, style.id)}
                          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-all ${
                            isSelected
                              ? 'border-brand bg-brand/10 text-brand font-medium'
                              : 'border-border hover:border-brand/30 text-muted hover:text-foreground'
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                          {style.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Global Style Shortcut */}
      {selectedCount > 1 && (
        <div className="rounded-xl border border-border bg-surface/50 p-4">
          <p className="text-sm font-medium mb-3">
            Gleichen Stil für alle {selectedCount} Räume:
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {ROOM_STYLES.map((style) => {
              const Icon = styleIcons[style.id];
              const isSelected = globalStyle === style.id;

              return (
                <button
                  key={style.id}
                  onClick={() => handleGlobalStyleChange(style.id)}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-all ${
                    isSelected
                      ? 'border-brand bg-brand/10 text-brand font-medium'
                      : 'border-border hover:border-brand/30 text-muted hover:text-foreground'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                  {style.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Price Summary + Generate Button */}
      <div className="space-y-4 rounded-xl border border-brand/30 bg-brand/5 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-lg">
              {selectedCount} {selectedCount === 1 ? 'Raum' : 'Räume'} ausgewählt
            </p>
            <p className="text-sm text-muted">
              Jeweils 3 Ansichten (Perspektive, Frontal, Draufsicht)
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-brand">${totalPrice}</p>
            <p className="text-xs text-muted">
              {selectedCount} × ${ (PRICE_PER_RENDER / 100).toFixed(2) }
            </p>
          </div>
        </div>

        <Button
          size="lg"
          className="w-full"
          disabled={selectedCount === 0 || !allHaveStyle || loading}
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
              {selectedCount === 0
                ? 'Wähle mindestens einen Raum'
                : !allHaveStyle
                ? 'Wähle für jeden Raum einen Stil'
                : `${selectedCount} ${selectedCount === 1 ? 'Raum' : 'Räume'} generieren`}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
