import type { ViewType, RoomTypeId, RoomStyleId } from './index';

// ── Room 3D Geometry (from GPT-4o analysis) ──

export interface Wall3D {
  start: [number, number]; // [x, z] in meters, origin bottom-left
  end: [number, number];
  height: number;          // default 2.6m
}

export interface Door3D {
  position: [number, number]; // [x, z] center of door along wall
  width: number;              // meters
  height: number;             // meters (default 2.1)
  wallIndex: number;          // which wall this door belongs to
}

export interface Window3D {
  position: [number, number]; // [x, z] center of window along wall
  width: number;              // meters
  height: number;             // meters
  wallIndex: number;          // which wall this window belongs to
  sillHeight: number;         // height from floor to bottom of window (default 0.9m)
}

export interface Room3DData {
  roomId: string;
  walls: Wall3D[];
  floor: { points: [number, number][] }; // polygon vertices for floor shape
  doors: Door3D[];
  windows: Window3D[];
  dimensions: {
    width: number;   // bounding box x
    depth: number;   // bounding box z
    height: number;  // ceiling height
  };
}

// ── Furniture ──

export type FurniturePlacement = 'against-wall' | 'center' | 'corner' | 'near-window';

export interface FurnitureItem {
  id: string;
  name: string;                // e.g. "sofa-modern"
  category: string;            // e.g. "seating", "table", "storage", "bed", "decor"
  modelPath: string;           // e.g. "/assets/furniture/modern/sofa.glb"
  scale: [number, number, number];
  placementRule: FurniturePlacement;
  footprint: [number, number]; // [width, depth] in meters
}

export interface PlacedFurniture {
  item: FurnitureItem;
  position: [number, number, number]; // [x, y, z] world position
  rotation: number;                    // y-axis rotation in radians
}

// ── Camera ──

export interface CameraPreset {
  type: ViewType;
  position: [number, number, number];
  lookAt: [number, number, number];
  fov: number;
}

// ── Rendered View (before beautification) ──

export interface RenderedView {
  roomId: string;
  viewType: ViewType;
  dataUrl: string; // base64 PNG from canvas
}

// ── Furniture Recipe (which categories a room type needs) ──

export interface FurnitureRecipe {
  roomType: RoomTypeId;
  categories: string[]; // e.g. ["seating", "table", "storage", "decor"]
}
