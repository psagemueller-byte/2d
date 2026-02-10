'use client';

import type { RoomStyleId } from '@/types';

interface StyleLightingProps {
  style: RoomStyleId;
  roomWidth: number;
  roomDepth: number;
  roomHeight: number;
}

/**
 * Sets up style-appropriate lighting for the 3D scene.
 * Different interior design styles call for different light temperatures and intensities.
 */
export default function StyleLighting({
  style,
  roomWidth,
  roomDepth,
  roomHeight,
}: StyleLightingProps) {
  const cx = roomWidth / 2;
  const cz = roomDepth / 2;

  // Style-specific light configurations
  const configs: Record<RoomStyleId, {
    ambientColor: string;
    ambientIntensity: number;
    mainColor: string;
    mainIntensity: number;
    fillColor: string;
    fillIntensity: number;
  }> = {
    modern: {
      ambientColor: '#ffffff',
      ambientIntensity: 0.5,
      mainColor: '#fff5e0',
      mainIntensity: 1.2,
      fillColor: '#e0e8ff',
      fillIntensity: 0.4,
    },
    scandinavian: {
      ambientColor: '#fff8f0',
      ambientIntensity: 0.6,
      mainColor: '#fffbe0',
      mainIntensity: 1.0,
      fillColor: '#fff0e0',
      fillIntensity: 0.5,
    },
    industrial: {
      ambientColor: '#e0d8d0',
      ambientIntensity: 0.3,
      mainColor: '#ffcc80',
      mainIntensity: 1.4,
      fillColor: '#d0c8c0',
      fillIntensity: 0.3,
    },
    minimalist: {
      ambientColor: '#ffffff',
      ambientIntensity: 0.7,
      mainColor: '#ffffff',
      mainIntensity: 0.8,
      fillColor: '#f0f0f0',
      fillIntensity: 0.5,
    },
    bohemian: {
      ambientColor: '#ffe8d0',
      ambientIntensity: 0.5,
      mainColor: '#ffd080',
      mainIntensity: 1.1,
      fillColor: '#e0d0c0',
      fillIntensity: 0.4,
    },
    classic: {
      ambientColor: '#fff0e0',
      ambientIntensity: 0.4,
      mainColor: '#ffdd99',
      mainIntensity: 1.3,
      fillColor: '#e8d8c8',
      fillIntensity: 0.4,
    },
    japanese: {
      ambientColor: '#f8f0e8',
      ambientIntensity: 0.6,
      mainColor: '#ffe8c0',
      mainIntensity: 0.9,
      fillColor: '#e8e0d8',
      fillIntensity: 0.5,
    },
    mediterranean: {
      ambientColor: '#fff8e0',
      ambientIntensity: 0.5,
      mainColor: '#ffe080',
      mainIntensity: 1.4,
      fillColor: '#f0e0c0',
      fillIntensity: 0.4,
    },
  };

  const cfg = configs[style] || configs.modern;

  return (
    <>
      {/* Ambient light — base illumination */}
      <ambientLight color={cfg.ambientColor} intensity={cfg.ambientIntensity} />

      {/* Main directional light — simulates window light */}
      <directionalLight
        color={cfg.mainColor}
        intensity={cfg.mainIntensity}
        position={[cx + roomWidth * 0.3, roomHeight * 1.5, cz - roomDepth * 0.3]}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={0.1}
        shadow-camera-far={roomWidth * 3}
        shadow-camera-left={-roomWidth}
        shadow-camera-right={roomWidth}
        shadow-camera-top={roomDepth}
        shadow-camera-bottom={-roomDepth}
      />

      {/* Fill light — opposite side, softer */}
      <directionalLight
        color={cfg.fillColor}
        intensity={cfg.fillIntensity}
        position={[cx - roomWidth * 0.5, roomHeight, cz + roomDepth * 0.5]}
      />

      {/* Ceiling bounce light — soft overhead */}
      <pointLight
        color="#ffffff"
        intensity={0.3}
        position={[cx, roomHeight - 0.1, cz]}
        distance={roomWidth * 2}
        decay={2}
      />
    </>
  );
}
