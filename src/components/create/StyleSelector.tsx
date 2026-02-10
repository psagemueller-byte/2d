'use client';

import { ROOM_STYLES } from '@/lib/constants';
import { useCreateStore } from '@/store/useCreateStore';
import type { RoomStyleId } from '@/types';
import {
  Minus,
  TreePine,
  Factory,
  Circle,
  Flower2,
  Crown,
  Fan,
  Sun,
  type LucideIcon,
} from 'lucide-react';

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

export default function StyleSelector() {
  const { selectedStyle, setSelectedStyle } = useCreateStore();

  return (
    <div>
      <h3 className="text-lg font-semibold">Einrichtungsstil wählen</h3>
      <p className="mt-1 text-sm text-muted">Wähle den Stil für dein Raumdesign</p>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {ROOM_STYLES.map((style) => {
          const Icon = styleIcons[style.id];
          const isSelected = selectedStyle === style.id;

          return (
            <button
              key={style.id}
              onClick={() => setSelectedStyle(style.id)}
              className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all duration-200 ${
                isSelected
                  ? 'border-brand bg-brand/10 shadow-lg shadow-brand/10'
                  : 'border-border hover:border-brand/30 hover:bg-surface'
              }`}
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                  isSelected ? 'bg-brand text-white' : 'bg-surface text-muted'
                }`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium">{style.name}</span>
              <span className="text-[11px] text-muted leading-tight text-center">
                {style.description}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
