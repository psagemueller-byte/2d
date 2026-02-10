'use client';

import { ROOM_TYPES } from '@/lib/constants';
import { useCreateStore } from '@/store/useCreateStore';
import { Sofa, Bed, CookingPot, Bath, Monitor, type LucideIcon } from 'lucide-react';
import type { RoomTypeId } from '@/types';

const roomIcons: Record<RoomTypeId, LucideIcon> = {
  'living-room': Sofa,
  bedroom: Bed,
  kitchen: CookingPot,
  bathroom: Bath,
  office: Monitor,
};

export default function RoomTypeSelector() {
  const { selectedRoomType, setSelectedRoomType } = useCreateStore();

  return (
    <div>
      <h3 className="text-lg font-semibold">Raumtyp wählen</h3>
      <p className="mt-1 text-sm text-muted">Welcher Raum soll visualisiert werden?</p>

      <div className="mt-4 flex flex-wrap gap-3">
        {ROOM_TYPES.map((room) => {
          const Icon = roomIcons[room.id];
          const isSelected = selectedRoomType === room.id;

          return (
            <button
              key={room.id}
              onClick={() => setSelectedRoomType(room.id)}
              className={`flex items-center gap-2 rounded-xl border-2 px-4 py-3 transition-all duration-200 ${
                isSelected
                  ? 'border-brand bg-brand/10 shadow-lg shadow-brand/10'
                  : 'border-border hover:border-brand/30 hover:bg-surface'
              }`}
            >
              <Icon
                className={`h-4 w-4 ${isSelected ? 'text-brand' : 'text-muted'}`}
              />
              <span className="text-sm font-medium">{room.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
