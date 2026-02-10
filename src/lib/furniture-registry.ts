import type { RoomTypeId, RoomStyleId } from '@/types';
import type { FurnitureItem, FurniturePlacement } from '@/types/scene3d';

/**
 * Furniture recipes: which categories each room type needs.
 */
export const FURNITURE_RECIPES: Record<RoomTypeId, string[]> = {
  'living-room': ['sofa', 'coffee-table', 'tv-stand', 'side-table', 'plant'],
  bedroom: ['bed', 'nightstand', 'wardrobe', 'dresser', 'plant'],
  kitchen: ['dining-table', 'chair', 'counter', 'appliance', 'shelf'],
  bathroom: ['vanity', 'toilet', 'plant'],
  office: ['desk', 'office-chair', 'bookshelf', 'plant'],
};

/**
 * Placement rules per furniture category.
 */
const PLACEMENT_RULES: Record<string, FurniturePlacement> = {
  sofa: 'against-wall',
  'coffee-table': 'center',
  'tv-stand': 'against-wall',
  'side-table': 'corner',
  plant: 'corner',
  bed: 'against-wall',
  nightstand: 'against-wall',
  wardrobe: 'against-wall',
  dresser: 'against-wall',
  'dining-table': 'center',
  chair: 'center',
  counter: 'against-wall',
  appliance: 'against-wall',
  shelf: 'against-wall',
  vanity: 'against-wall',
  toilet: 'against-wall',
  desk: 'near-window',
  'office-chair': 'center',
  bookshelf: 'against-wall',
};

/**
 * Default furniture dimensions (footprint in meters [width, depth]).
 * Used when no GLTF model is available (placeholder boxes).
 */
const FURNITURE_DEFAULTS: Record<string, { footprint: [number, number]; category: string }> = {
  sofa: { footprint: [2.0, 0.9], category: 'seating' },
  'coffee-table': { footprint: [1.1, 0.6], category: 'table' },
  'tv-stand': { footprint: [1.6, 0.4], category: 'storage' },
  'side-table': { footprint: [0.5, 0.5], category: 'table' },
  plant: { footprint: [0.4, 0.4], category: 'decor' },
  bed: { footprint: [1.6, 2.1], category: 'bed' },
  nightstand: { footprint: [0.5, 0.4], category: 'table' },
  wardrobe: { footprint: [1.8, 0.6], category: 'storage' },
  dresser: { footprint: [1.2, 0.5], category: 'storage' },
  'dining-table': { footprint: [1.4, 0.8], category: 'dining-table' },
  chair: { footprint: [0.45, 0.45], category: 'seating' },
  counter: { footprint: [2.0, 0.6], category: 'storage' },
  appliance: { footprint: [0.6, 0.6], category: 'appliance' },
  shelf: { footprint: [1.0, 0.35], category: 'storage' },
  vanity: { footprint: [0.9, 0.5], category: 'storage' },
  toilet: { footprint: [0.4, 0.65], category: 'appliance' },
  desk: { footprint: [1.4, 0.7], category: 'desk' },
  'office-chair': { footprint: [0.6, 0.6], category: 'seating' },
  bookshelf: { footprint: [1.2, 0.35], category: 'storage' },
};

/**
 * Returns furniture items for a given room type and style.
 * For MVP, uses placeholder dimensions — GLTF model paths point to assets
 * that can be added later. Until then, FurnitureLoader renders colored boxes.
 */
export function getFurnitureForRoom(
  roomType: RoomTypeId,
  style: RoomStyleId
): FurnitureItem[] {
  const categories = FURNITURE_RECIPES[roomType] || FURNITURE_RECIPES['living-room'];

  return categories.map((category) => {
    const defaults = FURNITURE_DEFAULTS[category] || {
      footprint: [0.5, 0.5] as [number, number],
      category: 'decor',
    };

    return {
      id: `${category}-${style}`,
      name: `${category}-${style}`,
      category: defaults.category,
      // Model path — will use placeholder boxes until actual GLB files are added
      modelPath: `/assets/furniture/${style}/${category}.glb`,
      scale: [1, 1, 1] as [number, number, number],
      placementRule: PLACEMENT_RULES[category] || 'center',
      footprint: defaults.footprint,
    };
  });
}
