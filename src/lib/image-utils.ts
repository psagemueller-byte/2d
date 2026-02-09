const MAX_DIMENSION = 2048;

/**
 * Resize an image to fit within MAX_DIMENSION while maintaining aspect ratio.
 * Returns a base64 data URL (without the data:image prefix).
 */
export function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;

      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/png');
      // Return base64 without the data:image/png;base64, prefix
      resolve(dataUrl.split(',')[1]);
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Convert a data URL to just the base64 portion.
 */
export function dataUrlToBase64(dataUrl: string): string {
  return dataUrl.split(',')[1] || dataUrl;
}

/**
 * Convert base64 to a data URL with the given mime type.
 */
export function base64ToDataUrl(base64: string, mimeType = 'image/png'): string {
  return `data:${mimeType};base64,${base64}`;
}
