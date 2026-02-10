'use client';

import { Suspense } from 'react';
import { useGLTF } from '@react-three/drei';
import type { PlacedFurniture } from '@/types/scene3d';

interface FurnitureLoaderProps {
  furniture: PlacedFurniture[];
}

/**
 * Loads and places GLTF furniture models in the scene.
 * Each piece is positioned and rotated according to the placement algorithm.
 */
function FurnitureModel({ placed }: { placed: PlacedFurniture }) {
  const { scene } = useGLTF(placed.item.modelPath);

  return (
    <primitive
      object={scene.clone()}
      position={placed.position}
      rotation={[0, placed.rotation, 0]}
      scale={placed.item.scale}
      castShadow
      receiveShadow
    />
  );
}

/**
 * Fallback box placeholder when GLTF model is not available.
 * Uses the furniture footprint dimensions to show where the item would be.
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
      {furniture.map((placed, i) => {
        // Check if the model file actually exists (starts with /assets/)
        const hasModel = placed.item.modelPath.startsWith('/assets/') &&
          placed.item.modelPath.endsWith('.glb');

        if (hasModel) {
          return (
            <Suspense
              key={`furniture-${i}`}
              fallback={<FurniturePlaceholder placed={placed} />}
            >
              <FurnitureModel placed={placed} />
            </Suspense>
          );
        }

        // Use placeholder if no model available
        return <FurniturePlaceholder key={`furniture-${i}`} placed={placed} />;
      })}
    </group>
  );
}
