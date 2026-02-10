'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import type { Room3DData } from '@/types/scene3d';

interface RoomGeometryProps {
  geometry: Room3DData;
  showCeiling?: boolean;
  wallColor?: string;
  floorColor?: string;
  ceilingColor?: string;
}

const WALL_THICKNESS = 0.15; // meters

/**
 * Builds the room shell: floor, walls (with door/window cutouts), and optional ceiling.
 * Uses simple Three.js geometry (no CSG for now — doors/windows are approximated with gaps).
 */
export default function RoomGeometry({
  geometry,
  showCeiling = false,
  wallColor = '#f5f0eb',
  floorColor = '#c4a882',
  ceilingColor = '#ffffff',
}: RoomGeometryProps) {
  const { walls, doors, windows, dimensions } = geometry;

  // ── Floor ──
  const floorShape = useMemo(() => {
    const shape = new THREE.Shape();
    const pts = geometry.floor.points;
    if (pts.length < 3) {
      // Fallback rectangle
      shape.moveTo(0, 0);
      shape.lineTo(dimensions.width, 0);
      shape.lineTo(dimensions.width, dimensions.depth);
      shape.lineTo(0, dimensions.depth);
      shape.closePath();
    } else {
      shape.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) {
        shape.lineTo(pts[i][0], pts[i][1]);
      }
      shape.closePath();
    }
    return shape;
  }, [geometry.floor.points, dimensions]);

  // ── Wall Segments ──
  // For each wall, we build a box. If a door/window intersects, we split the wall into segments.
  const wallMeshes = useMemo(() => {
    const meshes: {
      position: [number, number, number];
      size: [number, number, number];
      rotationY: number;
    }[] = [];

    walls.forEach((wall, wallIdx) => {
      const dx = wall.end[0] - wall.start[0];
      const dz = wall.end[1] - wall.start[1];
      const wallLength = Math.sqrt(dx * dx + dz * dz);
      const angle = Math.atan2(dz, dx);
      const height = wall.height || dimensions.height;

      // Collect cutouts (doors and windows) on this wall
      const cutouts: { start: number; end: number; bottomY: number; topY: number }[] = [];

      // Doors on this wall
      doors.forEach((door) => {
        if (door.wallIndex !== wallIdx) return;
        // Calculate position along wall in meters
        const doorCenterX = wall.start[0] + dx * 0;
        const doorCenterZ = wall.start[1] + dz * 0;
        // Use the door position to find the parametric t along the wall
        const t = wallLength > 0
          ? ((door.position[0] - wall.start[0]) * dx + (door.position[1] - wall.start[1]) * dz) / (wallLength * wallLength)
          : 0.5;
        const posAlongWall = t * wallLength;
        const halfW = door.width / 2;
        cutouts.push({
          start: Math.max(0, posAlongWall - halfW),
          end: Math.min(wallLength, posAlongWall + halfW),
          bottomY: 0,
          topY: door.height || 2.1,
        });
      });

      // Windows on this wall
      windows.forEach((win) => {
        if (win.wallIndex !== wallIdx) return;
        const t = wallLength > 0
          ? ((win.position[0] - wall.start[0]) * dx + (win.position[1] - wall.start[1]) * dz) / (wallLength * wallLength)
          : 0.5;
        const posAlongWall = t * wallLength;
        const halfW = win.width / 2;
        cutouts.push({
          start: Math.max(0, posAlongWall - halfW),
          end: Math.min(wallLength, posAlongWall + halfW),
          bottomY: win.sillHeight,
          topY: win.sillHeight + win.height,
        });
      });

      if (cutouts.length === 0) {
        // Simple full wall
        const cx = (wall.start[0] + wall.end[0]) / 2;
        const cz = (wall.start[1] + wall.end[1]) / 2;
        meshes.push({
          position: [cx, height / 2, cz],
          size: [wallLength, height, WALL_THICKNESS],
          rotationY: angle,
        });
      } else {
        // Sort cutouts by start position
        cutouts.sort((a, b) => a.start - b.start);

        // Build wall segments around cutouts
        let cursor = 0;

        for (const cutout of cutouts) {
          // Segment before cutout (full height)
          if (cutout.start > cursor + 0.01) {
            const segLen = cutout.start - cursor;
            const segCenter = cursor + segLen / 2;
            const t = segCenter / wallLength;
            const sx = wall.start[0] + dx * t;
            const sz = wall.start[1] + dz * t;
            meshes.push({
              position: [sx, height / 2, sz],
              size: [segLen, height, WALL_THICKNESS],
              rotationY: angle,
            });
          }

          // Above cutout (lintel)
          if (cutout.topY < height - 0.01) {
            const segLen = cutout.end - cutout.start;
            const segCenter = (cutout.start + cutout.end) / 2;
            const t = segCenter / wallLength;
            const sx = wall.start[0] + dx * t;
            const sz = wall.start[1] + dz * t;
            const lintelH = height - cutout.topY;
            meshes.push({
              position: [sx, cutout.topY + lintelH / 2, sz],
              size: [segLen, lintelH, WALL_THICKNESS],
              rotationY: angle,
            });
          }

          // Below cutout (for windows — wall below sill)
          if (cutout.bottomY > 0.01) {
            const segLen = cutout.end - cutout.start;
            const segCenter = (cutout.start + cutout.end) / 2;
            const t = segCenter / wallLength;
            const sx = wall.start[0] + dx * t;
            const sz = wall.start[1] + dz * t;
            meshes.push({
              position: [sx, cutout.bottomY / 2, sz],
              size: [segLen, cutout.bottomY, WALL_THICKNESS],
              rotationY: angle,
            });
          }

          cursor = cutout.end;
        }

        // Segment after last cutout
        if (cursor < wallLength - 0.01) {
          const segLen = wallLength - cursor;
          const segCenter = cursor + segLen / 2;
          const t = segCenter / wallLength;
          const sx = wall.start[0] + dx * t;
          const sz = wall.start[1] + dz * t;
          meshes.push({
            position: [sx, height / 2, sz],
            size: [segLen, height, WALL_THICKNESS],
            rotationY: angle,
          });
        }
      }
    });

    return meshes;
  }, [walls, doors, windows, dimensions.height]);

  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <shapeGeometry args={[floorShape]} />
        <meshStandardMaterial color={floorColor} side={THREE.DoubleSide} roughness={0.8} />
      </mesh>

      {/* Ceiling */}
      {showCeiling && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, dimensions.height, 0]} receiveShadow>
          <shapeGeometry args={[floorShape]} />
          <meshStandardMaterial color={ceilingColor} side={THREE.DoubleSide} roughness={0.9} />
        </mesh>
      )}

      {/* Walls */}
      {wallMeshes.map((seg, i) => (
        <mesh
          key={`wall-${i}`}
          position={seg.position}
          rotation={[0, seg.rotationY, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={seg.size} />
          <meshStandardMaterial color={wallColor} roughness={0.85} />
        </mesh>
      ))}

      {/* Window glass panes (semi-transparent) */}
      {windows.map((win, i) => {
        const wall = walls[win.wallIndex];
        if (!wall) return null;
        const dx = wall.end[0] - wall.start[0];
        const dz = wall.end[1] - wall.start[1];
        const wallLength = Math.sqrt(dx * dx + dz * dz);
        const angle = Math.atan2(dz, dx);
        const t = wallLength > 0
          ? ((win.position[0] - wall.start[0]) * dx + (win.position[1] - wall.start[1]) * dz) / (wallLength * wallLength)
          : 0.5;
        const wx = wall.start[0] + dx * t;
        const wz = wall.start[1] + dz * t;
        const cy = win.sillHeight + win.height / 2;

        return (
          <mesh
            key={`window-${i}`}
            position={[wx, cy, wz]}
            rotation={[0, angle, 0]}
          >
            <boxGeometry args={[win.width, win.height, 0.02]} />
            <meshPhysicalMaterial
              color="#a8d8ea"
              transparent
              opacity={0.3}
              roughness={0.05}
              transmission={0.6}
            />
          </mesh>
        );
      })}
    </group>
  );
}
