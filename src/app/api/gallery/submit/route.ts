import { NextRequest, NextResponse } from 'next/server';
import { put, list } from '@vercel/blob';
import type { GalleryManifest, GalleryEntry } from '@/types/gallery';

export const maxDuration = 30;

// Simple rate limiting
const recentUploads = new Map<string, number>();
const RATE_LIMIT_MS = 60_000; // 1 upload per IP per minute

const MANIFEST_PATH = 'gallery/manifest.json';

async function getManifest(): Promise<GalleryManifest> {
  try {
    const { blobs } = await list({ prefix: 'gallery/manifest' });
    if (blobs.length > 0) {
      const res = await fetch(blobs[0].url, { cache: 'no-store' });
      if (res.ok) {
        return (await res.json()) as GalleryManifest;
      }
    }
  } catch (err) {
    console.warn('Failed to read manifest:', err);
  }
  return { entries: [], updatedAt: new Date().toISOString() };
}

async function saveManifest(manifest: GalleryManifest): Promise<void> {
  await put(MANIFEST_PATH, JSON.stringify(manifest), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
  });
}

export async function POST(request: NextRequest) {
  try {
    // Check if Blob is configured
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json(
        { error: 'Galerie ist nicht konfiguriert' },
        { status: 500 }
      );
    }

    // Rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    const lastUpload = recentUploads.get(ip) || 0;
    if (Date.now() - lastUpload < RATE_LIMIT_MS) {
      return NextResponse.json(
        { error: 'Bitte warte einen Moment bevor du ein weiteres Bild hochlädst.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { imageData, userName, roomStyle, roomType } = body;

    if (!imageData) {
      return NextResponse.json({ error: 'Kein Bild übergeben' }, { status: 400 });
    }

    // Strip data URL prefix
    const base64 = imageData.includes(',') ? imageData.split(',')[1] : imageData;
    const imageBuffer = Buffer.from(base64, 'base64');

    // Generate unique ID
    const id = crypto.randomUUID();

    // Upload image to Vercel Blob
    const blob = await put(`gallery/${id}.png`, imageBuffer, {
      access: 'public',
      contentType: 'image/png',
    });

    // Create gallery entry
    const entry: GalleryEntry = {
      id,
      imageUrl: blob.url,
      userName: (userName || '').trim() || 'Anonym',
      roomStyle: roomStyle || 'Unbekannt',
      roomType: roomType || 'Raum',
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    // Update manifest
    const manifest = await getManifest();
    manifest.entries.push(entry);
    manifest.updatedAt = new Date().toISOString();
    await saveManifest(manifest);

    // Mark rate limit
    recentUploads.set(ip, Date.now());

    // Cleanup old rate limit entries
    for (const [key, time] of recentUploads.entries()) {
      if (Date.now() - time > RATE_LIMIT_MS * 5) {
        recentUploads.delete(key);
      }
    }

    return NextResponse.json({ success: true, id });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    console.error('Gallery submit error:', message);
    return NextResponse.json(
      { error: `Upload fehlgeschlagen: ${message}` },
      { status: 500 }
    );
  }
}
