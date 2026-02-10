import type { ViewType } from '@/types';
import type { RenderedView } from '@/types/scene3d';

/**
 * Captures the Three.js canvas at the specified resolution and returns base64 PNG.
 * Called from the RoomScene component after setting each camera position.
 */
export function captureCanvas(
  canvas: HTMLCanvasElement,
  roomId: string,
  viewType: ViewType,
  targetWidth = 1536,
  targetHeight = 1024
): RenderedView {
  // Create offscreen canvas at target resolution
  const offscreen = document.createElement('canvas');
  offscreen.width = targetWidth;
  offscreen.height = targetHeight;

  const ctx = offscreen.getContext('2d');
  if (!ctx) {
    throw new Error('Could not get 2d context for canvas capture');
  }

  // Draw the WebGL canvas scaled to target dimensions
  ctx.drawImage(canvas, 0, 0, targetWidth, targetHeight);

  const dataUrl = offscreen.toDataURL('image/png');

  return {
    roomId,
    viewType,
    dataUrl,
  };
}

/**
 * Extracts base64 data (without data URL prefix) from a data URL.
 */
export function dataUrlToBase64(dataUrl: string): string {
  return dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
}
