import type { Room3DData, FurnitureItem, PlacedFurniture } from '@/types/scene3d';

const DOOR_CLEARANCE = 1.0; // meters of free space in front of doors
const WALL_GAP = 0.05;      // gap between furniture and wall
const ITEM_GAP = 0.15;      // gap between adjacent items

interface WallSegment {
  wallIndex: number;
  start: [number, number];
  end: [number, number];
  length: number;
  angle: number;          // angle of the wall
  normal: [number, number]; // inward-facing normal
  freeZones: { startT: number; endT: number }[]; // available parametric zones [0,1]
}

/**
 * Automatically places furniture in a room based on placement rules.
 * Uses a simple wall-affinity algorithm with collision detection.
 */
export function placeFurniture(
  room: Room3DData,
  items: FurnitureItem[]
): PlacedFurniture[] {
  const placed: PlacedFurniture[] = [];
  const { walls, doors, windows, dimensions } = room;

  // ── Step 1: Analyze walls ──
  const wallSegments: WallSegment[] = walls.map((wall, idx) => {
    const dx = wall.end[0] - wall.start[0];
    const dz = wall.end[1] - wall.start[1];
    const length = Math.sqrt(dx * dx + dz * dz);
    const angle = Math.atan2(dz, dx);

    // Compute inward-facing normal (perpendicular pointing into room center)
    const cx = dimensions.width / 2;
    const cz = dimensions.depth / 2;
    const mx = (wall.start[0] + wall.end[0]) / 2;
    const mz = (wall.start[1] + wall.end[1]) / 2;

    // Normal perpendicular to wall direction
    let nx = -dz / length;
    let nz = dx / length;

    // Ensure normal points toward room center
    const toCenter = [(cx - mx), (cz - mz)];
    if (nx * toCenter[0] + nz * toCenter[1] < 0) {
      nx = -nx;
      nz = -nz;
    }

    // Calculate free zones (exclude areas near doors/windows)
    const blockedZones: { startT: number; endT: number }[] = [];

    // Block door zones
    doors.forEach((door) => {
      if (door.wallIndex !== idx) return;
      const t = length > 0
        ? ((door.position[0] - wall.start[0]) * dx + (door.position[1] - wall.start[1]) * dz) / (length * length)
        : 0.5;
      const halfW = (door.width + DOOR_CLEARANCE) / 2 / length;
      blockedZones.push({ startT: Math.max(0, t - halfW), endT: Math.min(1, t + halfW) });
    });

    // Block window zones (smaller clearance)
    windows.forEach((win) => {
      if (win.wallIndex !== idx) return;
      const t = length > 0
        ? ((win.position[0] - wall.start[0]) * dx + (win.position[1] - wall.start[1]) * dz) / (length * length)
        : 0.5;
      const halfW = (win.width + 0.3) / 2 / length;
      blockedZones.push({ startT: Math.max(0, t - halfW), endT: Math.min(1, t + halfW) });
    });

    // Sort and merge blocked zones
    blockedZones.sort((a, b) => a.startT - b.startT);
    const merged: { startT: number; endT: number }[] = [];
    for (const z of blockedZones) {
      if (merged.length > 0 && z.startT <= merged[merged.length - 1].endT) {
        merged[merged.length - 1].endT = Math.max(merged[merged.length - 1].endT, z.endT);
      } else {
        merged.push({ ...z });
      }
    }

    // Free zones are the inverse of blocked zones
    const freeZones: { startT: number; endT: number }[] = [];
    let cursor = 0;
    for (const blocked of merged) {
      if (blocked.startT > cursor + 0.01) {
        freeZones.push({ startT: cursor, endT: blocked.startT });
      }
      cursor = blocked.endT;
    }
    if (cursor < 0.99) {
      freeZones.push({ startT: cursor, endT: 1.0 });
    }

    return {
      wallIndex: idx,
      start: wall.start,
      end: wall.end,
      length,
      angle,
      normal: [nx, nz] as [number, number],
      freeZones,
    };
  });

  // Sort walls by length (prefer longest walls for main furniture)
  const sortedWalls = [...wallSegments].sort((a, b) => b.length - a.length);

  // Track occupied floor areas for collision detection
  const occupied: { x: number; z: number; w: number; d: number; angle: number }[] = [];

  function collides(x: number, z: number, w: number, d: number): boolean {
    // Simple AABB collision (ignoring rotation for simplicity)
    for (const occ of occupied) {
      const overlapX = Math.abs(x - occ.x) < (w + occ.w) / 2 + ITEM_GAP;
      const overlapZ = Math.abs(z - occ.z) < (d + occ.d) / 2 + ITEM_GAP;
      if (overlapX && overlapZ) return true;
    }
    return false;
  }

  // ── Step 2: Place each item ──

  // Separate items by placement rule
  const wallItems = items.filter((i) => i.placementRule === 'against-wall');
  const centerItems = items.filter((i) => i.placementRule === 'center');
  const cornerItems = items.filter((i) => i.placementRule === 'corner');
  const windowItems = items.filter((i) => i.placementRule === 'near-window');

  // Place against-wall items first (largest to smallest)
  wallItems.sort((a, b) => (b.footprint[0] * b.footprint[1]) - (a.footprint[0] * a.footprint[1]));

  for (const item of wallItems) {
    let didPlace = false;

    for (const wall of sortedWalls) {
      if (didPlace) break;

      const itemLengthOnWall = item.footprint[0];
      const itemDepth = item.footprint[1];
      const neededT = itemLengthOnWall / wall.length;

      for (const zone of wall.freeZones) {
        if (zone.endT - zone.startT < neededT + 0.02) continue;

        // Place at center of free zone
        const t = (zone.startT + zone.endT) / 2;
        const dx = wall.end[0] - wall.start[0];
        const dz = wall.end[1] - wall.start[1];

        const x = wall.start[0] + dx * t + wall.normal[0] * (itemDepth / 2 + WALL_GAP);
        const z = wall.start[1] + dz * t + wall.normal[1] * (itemDepth / 2 + WALL_GAP);

        if (collides(x, z, item.footprint[0], item.footprint[1])) continue;

        // Rotation: face into the room (align with wall normal)
        const rotation = Math.atan2(wall.normal[0], wall.normal[1]);

        placed.push({
          item,
          position: [x, 0, z],
          rotation,
        });

        occupied.push({ x, z, w: item.footprint[0], d: item.footprint[1], angle: rotation });

        // Shrink free zone
        const usedT = neededT / 2 + 0.05;
        zone.startT = t + usedT;
        didPlace = true;
        break;
      }
    }
  }

  // Place near-window items
  const windowWalls = wallSegments.filter((w) =>
    windows.some((win) => win.wallIndex === w.wallIndex)
  );

  for (const item of windowItems) {
    let didPlace = false;

    for (const wall of windowWalls.length > 0 ? windowWalls : sortedWalls) {
      if (didPlace) break;

      // Place near center of wall
      const t = 0.5;
      const dx = wall.end[0] - wall.start[0];
      const dz = wall.end[1] - wall.start[1];
      const x = wall.start[0] + dx * t + wall.normal[0] * (item.footprint[1] / 2 + WALL_GAP + 0.3);
      const z = wall.start[1] + dz * t + wall.normal[1] * (item.footprint[1] / 2 + WALL_GAP + 0.3);

      if (!collides(x, z, item.footprint[0], item.footprint[1])) {
        const rotation = Math.atan2(wall.normal[0], wall.normal[1]);
        placed.push({
          item,
          position: [x, 0, z],
          rotation,
        });
        occupied.push({ x, z, w: item.footprint[0], d: item.footprint[1], angle: rotation });
        didPlace = true;
      }
    }
  }

  // Place center items
  for (const item of centerItems) {
    const cx = dimensions.width / 2;
    const cz = dimensions.depth / 2;

    // Try center first, then offset
    const offsets = [
      [0, 0],
      [0.5, 0],
      [-0.5, 0],
      [0, 0.5],
      [0, -0.5],
      [0.8, 0.3],
      [-0.8, -0.3],
    ];

    for (const [ox, oz] of offsets) {
      const x = cx + ox;
      const z = cz + oz;

      if (!collides(x, z, item.footprint[0], item.footprint[1])) {
        placed.push({
          item,
          position: [x, 0, z],
          rotation: 0,
        });
        occupied.push({ x, z, w: item.footprint[0], d: item.footprint[1], angle: 0 });
        break;
      }
    }
  }

  // Place corner items
  const corners: [number, number][] = [
    [WALL_GAP + 0.3, WALL_GAP + 0.3],
    [dimensions.width - WALL_GAP - 0.3, WALL_GAP + 0.3],
    [dimensions.width - WALL_GAP - 0.3, dimensions.depth - WALL_GAP - 0.3],
    [WALL_GAP + 0.3, dimensions.depth - WALL_GAP - 0.3],
  ];

  let cornerIdx = 0;
  for (const item of cornerItems) {
    // Try each corner
    for (let tries = 0; tries < corners.length; tries++) {
      const ci = (cornerIdx + tries) % corners.length;
      const [x, z] = corners[ci];

      if (!collides(x, z, item.footprint[0], item.footprint[1])) {
        placed.push({
          item,
          position: [x, 0, z],
          rotation: 0,
        });
        occupied.push({ x, z, w: item.footprint[0], d: item.footprint[1], angle: 0 });
        cornerIdx = ci + 1;
        break;
      }
    }
  }

  return placed;
}
