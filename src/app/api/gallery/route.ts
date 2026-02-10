import { NextResponse } from 'next/server';
import { list } from '@vercel/blob';
import type { GalleryManifest } from '@/types/gallery';

export async function GET() {
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json({ entries: [] });
    }

    const { blobs } = await list({ prefix: 'gallery/manifest' });
    if (blobs.length === 0) {
      return NextResponse.json({ entries: [] });
    }

    const res = await fetch(blobs[0].url, { cache: 'no-store' });
    if (!res.ok) {
      return NextResponse.json({ entries: [] });
    }

    const manifest: GalleryManifest = await res.json();
    const approved = manifest.entries.filter((e) => e.status === 'approved');

    return NextResponse.json(
      { entries: approved },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );
  } catch (error) {
    console.error('Gallery fetch error:', error);
    return NextResponse.json({ entries: [] });
  }
}
