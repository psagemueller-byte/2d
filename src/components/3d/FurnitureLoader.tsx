'use client';

import type { PlacedFurniture } from '@/types/scene3d';

interface FurnitureLoaderProps {
  furniture: PlacedFurniture[];
}

/**
 * Renders furniture as colored placeholder boxes.
 * Uses the furniture footprint dimensions and category-based heights/colors.
 * When real .glb models are added, re-enable GLTF loading with an error boundary.
 */
function FurniturePlaceholder({ placed }: { placed: PlacedFurniture }) {
  const [w, d] = placed.item.footprint;
  // Height estimate based on category
  const categoryHeights: Record<string, number> = {
    seating: 0.85,
    table: 0.45,
    'dining-table': 0.75,
    storage: 1.2,
    bed: 0.55,
    desk: 0.75,
    decor: 0.5,
    appliance: 0.9,
  };
  const h = categoryHeights[placed.item.category] || 0.6;

  // Category-based colors for visual distinction
  const categoryColors: Record<string, string> = {
    seating: '#7a9ab5',
    table: '#8a7a6a',
    'dining-table': '#8a7a6a',
    storage: '#6a8a7a',
    bed: '#9a8a7a',
    desk: '#7a8a9a',
    decor: '#6a9a6a',
    appliance: '#9a9a9a',
  };
  const color = categoryColors[placed.item.category] || '#888888';

  return (
    <mesh
      position={[placed.position[0], placed.position[1] + h / 2, placed.position[2]]}
      rotation={[0, placed.rotation, 0]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[w, h, d]} />
      <meshStandardMaterial color={color} roughness={0.7} />
    </mesh>
  );
}

export default function FurnitureLoader({ furniture }: FurnitureLoaderProps) {
  if (furniture.length === 0) return null;

  return (
    <group>
      {furniture.map((placed, i) => (
        <FurniturePlaceholder key={`furniture-${i}`} placed={placed} />
      ))}
    </group>
  );
}
