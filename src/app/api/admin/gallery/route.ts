import { NextRequest, NextResponse } from 'next/server';
import { list, put, del } from '@vercel/blob';
import type { GalleryManifest } from '@/types/gallery';

/**
 * Admin gallery management API.
 * Protected by middleware (GALLERY_ADMIN_PASSWORD via Basic Auth).
 *
 * GET  — Returns full manifest (all entries, including pending/rejected)
 * POST — Approve, reject, or delete an entry
 */

async function getManifest(): Promise<{ manifest: GalleryManifest; blobUrl: string | null }> {
  const { blobs } = await list({ prefix: 'gallery/manifest' });
  if (blobs.length === 0) {
    return { manifest: { entries: [], updatedAt: new Date().toISOString() }, blobUrl: null };
  }

  const res = await fetch(blobs[0].url, { cache: 'no-store' });
  if (!res.ok) {
    return { manifest: { entries: [], updatedAt: new Date().toISOString() }, blobUrl: blobs[0].url };
  }

  const manifest: GalleryManifest = await res.json();
  return { manifest, blobUrl: blobs[0].url };
}

async function saveManifest(manifest: GalleryManifest): Promise<void> {
  manifest.updatedAt = new Date().toISOString();

  await put('gallery/manifest.json', JSON.stringify(manifest, null, 2), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
  });
}

export async function GET() {
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json({ error: 'Blob storage not configured' }, { status: 500 });
    }

    const { manifest } = await getManifest();
    return NextResponse.json({ entries: manifest.entries });
  } catch (error) {
    console.error('Admin gallery GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch gallery' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json({ error: 'Blob storage not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { action, entryId } = body as { action: string; entryId: string };

    if (!action || !entryId) {
      return NextResponse.json({ error: 'Missing action or entryId' }, { status: 400 });
    }

    if (!['approve', 'reject', 'delete'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const { manifest } = await getManifest();
    const entryIndex = manifest.entries.findIndex((e) => e.id === entryId);

    if (entryIndex === -1) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    const entry = manifest.entries[entryIndex];

    if (action === 'approve') {
      manifest.entries[entryIndex] = { ...entry, status: 'approved' };
      await saveManifest(manifest);
      return NextResponse.json({ success: true, status: 'approved' });
    }

    if (action === 'reject') {
      manifest.entries[entryIndex] = { ...entry, status: 'rejected' };
      await saveManifest(manifest);
      return NextResponse.json({ success: true, status: 'rejected' });
    }

    if (action === 'delete') {
      // Delete image from Blob storage
      try {
        await del(entry.imageUrl);
      } catch (err) {
        console.error('Failed to delete blob image:', err);
        // Continue anyway — remove from manifest
      }

      // Remove from manifest
      manifest.entries.splice(entryIndex, 1);
      await saveManifest(manifest);
      return NextResponse.json({ success: true, status: 'deleted' });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Admin gallery POST error:', error);
    return NextResponse.json({ error: 'Failed to update gallery' }, { status: 500 });
  }
}
