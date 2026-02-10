'use client';

import { useRef, useCallback, useEffect, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import type { Room3DData, PlacedFurniture, CameraPreset, RenderedView } from '@/types/scene3d';
import type { RoomStyleId, ViewType } from '@/types';
import RoomGeometry from './RoomGeometry';
import FurnitureLoader from './FurnitureLoader';
import StyleLighting from './StyleLighting';
import { getCameraPositions } from './CameraPresets';

interface RoomSceneProps {
  geometry: Room3DData;
  furniture: PlacedFurniture[];
  style: RoomStyleId;
  onRenderComplete: (views: RenderedView[]) => void;
  autoCapture?: boolean; // Auto-capture all 3 views when ready
  width?: number;
  height?: number;
}

/**
 * Inner component that has access to Three.js context (useThree).
 * Handles the actual view capturing.
 */
function SceneCapture({
  geometry,
  cameras,
  onCapture,
  autoCapture,
}: {
  geometry: Room3DData;
  cameras: CameraPreset[];
  onCapture: (views: RenderedView[]) => void;
  autoCapture: boolean;
}) {
  const { gl, scene } = useThree();
  const hasCaptured = useRef(false);
  const frameCount = useRef(0);

  useEffect(() => {
    if (!autoCapture || hasCaptured.current) return;

    // Wait a few frames for scene to fully render (models loaded, shadows calculated)
    const WAIT_FRAMES = 10;

    const checkAndCapture = () => {
      frameCount.current++;
      if (frameCount.current < WAIT_FRAMES) {
        requestAnimationFrame(checkAndCapture);
        return;
      }

      hasCaptured.current = true;

      const views: RenderedView[] = [];
      const camera = new THREE.PerspectiveCamera();

      for (const preset of cameras) {
        camera.fov = preset.fov;
        camera.aspect = gl.domElement.width / gl.domElement.height;
        camera.near = 0.1;
        camera.far = 100;
        camera.position.set(...preset.position);
        camera.lookAt(new THREE.Vector3(...preset.lookAt));
        camera.updateProjectionMatrix();

        // Render this view
        gl.render(scene, camera);

        // Capture to data URL
        const dataUrl = gl.domElement.toDataURL('image/png');
        views.push({
          roomId: geometry.roomId,
          viewType: preset.type,
          dataUrl,
        });
      }

      onCapture(views);
    };

    requestAnimationFrame(checkAndCapture);
  }, [autoCapture, cameras, geometry.roomId, gl, scene, onCapture]);

  return null;
}

/**
 * Main 3D room scene component.
 * Renders room geometry + furniture and captures views as PNGs.
 */
export default function RoomScene({
  geometry,
  furniture,
  style,
  onRenderComplete,
  autoCapture = true,
  width = 1536,
  height = 1024,
}: RoomSceneProps) {
  const cameras = getCameraPositions(geometry);
  const [isReady, setIsReady] = useState(false);

  // Style-specific colors
  const styleColors: Record<RoomStyleId, { wall: string; floor: string }> = {
    modern: { wall: '#f5f0eb', floor: '#c4a882' },
    scandinavian: { wall: '#faf8f5', floor: '#d4b896' },
    industrial: { wall: '#b8a99a', floor: '#8a7a6a' },
    minimalist: { wall: '#ffffff', floor: '#e8e0d8' },
    bohemian: { wall: '#f0e8d8', floor: '#b89a6a' },
    classic: { wall: '#f0ebe0', floor: '#9a7a5a' },
    japanese: { wall: '#f5efe8', floor: '#c8b090' },
    mediterranean: { wall: '#f8efe0', floor: '#c4946a' },
  };

  const colors = styleColors[style] || styleColors.modern;

  const handleCapture = useCallback((views: RenderedView[]) => {
    onRenderComplete(views);
  }, [onRenderComplete]);

  // Mark ready after a short delay to ensure all assets are loaded
  useEffect(() => {
    const timer = setTimeout(() => setIsReady(true), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div style={{ width, height, position: 'absolute', left: '-9999px', top: '-9999px' }}>
      <Canvas
        gl={{
          preserveDrawingBuffer: true, // Required for toDataURL()
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.0,
        }}
        shadows
        style={{ width, height }}
        camera={{ fov: 60, near: 0.1, far: 100 }}
      >
        {/* Default camera (perspective) for initial render */}
        <PerspectiveCamera
          makeDefault
          fov={cameras[0].fov}
          position={cameras[0].position}
          near={0.1}
          far={100}
        />

        {/* Lighting */}
        <StyleLighting
          style={style}
          roomWidth={geometry.dimensions.width}
          roomDepth={geometry.dimensions.depth}
          roomHeight={geometry.dimensions.height}
        />

        {/* Room Shell */}
        <RoomGeometry
          geometry={geometry}
          wallColor={colors.wall}
          floorColor={colors.floor}
        />

        {/* Furniture */}
        <FurnitureLoader furniture={furniture} />

        {/* View Capture */}
        {isReady && autoCapture && (
          <SceneCapture
            geometry={geometry}
            cameras={cameras}
            onCapture={handleCapture}
            autoCapture
          />
        )}
      </Canvas>
    </div>
  );
}
