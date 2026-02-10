import Hero from '@/components/landing/Hero';
import HowItWorks from '@/components/landing/HowItWorks';
import Features from '@/components/landing/Features';
import ExampleGallery from '@/components/landing/ExampleGallery';
import Pricing from '@/components/landing/Pricing';
import type { GalleryEntry, GalleryManifest } from '@/types/gallery';
import { list } from '@vercel/blob';

async function getGalleryImages(): Promise<GalleryEntry[]> {
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return [];
    }

    const { blobs } = await list({ prefix: 'gallery/manifest' });
    if (blobs.length === 0) {
      return [];
    }

    const res = await fetch(blobs[0].url, { next: { revalidate: 300 } });
    if (!res.ok) {
      return [];
    }

    const manifest: GalleryManifest = await res.json();
    return manifest.entries.filter((e) => e.status === 'approved');
  } catch (error) {
    console.error('Gallery fetch error:', error);
    return [];
  }
}

export default async function Home() {
  const galleryImages = await getGalleryImages();

  return (
    <>
      <Hero />
      <HowItWorks />
      <Features />
      <ExampleGallery galleryImages={galleryImages} />
      <Pricing />
    </>
  );
}
