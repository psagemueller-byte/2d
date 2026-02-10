import type { Room3DData, CameraPreset } from '@/types/scene3d';

/**
 * Calculates camera positions for 3 standard views based on room dimensions.
 * Returns consistent camera angles that showcase the room well.
 */
export function getCameraPositions(room: Room3DData): CameraPreset[] {
  const { width, depth, height } = room.dimensions;

  return [
    {
      type: 'perspective',
      // Corner position at eye level, looking diagonally across room
      position: [width * 0.05, 1.6, depth * 0.95],
      lookAt: [width * 0.6, 1.0, depth * 0.3],
      fov: 60,
    },
    {
      type: 'side',
      // Center of the "south" wall (z=0 side), looking towards north wall
      position: [width * 0.5, 1.6, -0.3],
      lookAt: [width * 0.5, 1.2, depth * 0.5],
      fov: 55,
    },
    {
      type: 'topdown',
      // Bird's eye view from above center
      position: [width * 0.5, height + Math.max(width, depth) * 0.8, depth * 0.5],
      lookAt: [width * 0.5, 0, depth * 0.5],
      fov: 50,
    },
  ];
}

/**
 * Gets a single camera preset by view type.
 */
export function getCameraPreset(room: Room3DData, viewType: 'perspective' | 'side' | 'topdown'): CameraPreset {
  const presets = getCameraPositions(room);
  return presets.find((p) => p.type === viewType) || presets[0];
}
