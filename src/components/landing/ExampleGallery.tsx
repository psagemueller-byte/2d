'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import type { GalleryEntry } from '@/types/gallery';

// Fallback placeholders (used when gallery is empty or to fill up to 6 cards)
const placeholders = [
  {
    style: 'Modern',
    description: 'Klare Linien und elegante Neutraltöne',
    gradient: 'from-slate-700 to-slate-900',
  },
  {
    style: 'Skandinavisch',
    description: 'Helle Hölzer und gemütliche Atmosphäre',
    gradient: 'from-amber-100 to-orange-200',
    dark: true,
  },
  {
    style: 'Industrial',
    description: 'Backsteine und Metall im Loft-Look',
    gradient: 'from-stone-600 to-stone-800',
  },
  {
    style: 'Japanisch',
    description: 'Zen-Ästhetik und natürliche Harmonie',
    gradient: 'from-emerald-800 to-teal-900',
  },
  {
    style: 'Bohemian',
    description: 'Bunt, eklektisch und weltoffen',
    gradient: 'from-purple-700 to-pink-600',
  },
  {
    style: 'Mediterran',
    description: 'Warme Farben und rustikaler Charme',
    gradient: 'from-orange-600 to-amber-700',
  },
];

interface ExampleGalleryProps {
  galleryImages?: GalleryEntry[];
}

export default function ExampleGallery({ galleryImages = [] }: ExampleGalleryProps) {
  const hasRealImages = galleryImages.length > 0;

  // Fill remaining slots with placeholders to always show 6 cards
  const remainingPlaceholders = placeholders.slice(galleryImages.length);

  return (
    <section className="py-24" id="gallery">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {hasRealImages ? 'Von unseren Nutzern erstellt' : 'Stil-Galerie'}
          </h2>
          <p className="mt-4 text-lg text-muted">
            {hasRealImages
              ? 'Echte Raumvisualisierungen unserer Community'
              : 'Entdecke die verschiedenen Einrichtungsstile'}
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* Real gallery images */}
          {galleryImages.slice(0, 6).map((entry, i) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="group relative overflow-hidden rounded-2xl border border-border"
            >
              <div className="aspect-[4/3] relative">
                <Image
                  src={entry.imageUrl}
                  alt={`${entry.roomStyle} ${entry.roomType}`}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
              </div>

              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

              {/* Info */}
              <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-white">
                      {entry.roomStyle}
                    </h3>
                    <p className="text-sm text-white/70">{entry.roomType}</p>
                  </div>
                  <span className="rounded-lg bg-white/20 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm">
                    von {entry.userName}
                  </span>
                </div>
              </div>

              {/* Style badge (always visible) */}
              <div className="absolute top-3 left-3">
                <span className="rounded-lg bg-brand/90 px-2.5 py-1 text-xs font-semibold text-white shadow-lg backdrop-blur-sm">
                  {entry.roomStyle}
                </span>
              </div>
            </motion.div>
          ))}

          {/* Fallback placeholder cards */}
          {remainingPlaceholders.map((example, i) => (
            <motion.div
              key={`placeholder-${example.style}`}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.4, delay: (galleryImages.length + i) * 0.08 }}
              className="group relative overflow-hidden rounded-2xl border border-border"
            >
              <div
                className={`aspect-[4/3] bg-gradient-to-br ${example.gradient} flex items-center justify-center`}
              >
                <div className="flex flex-col items-center gap-2 text-center px-6">
                  <span
                    className={`text-4xl font-bold ${
                      example.dark ? 'text-stone-800' : 'text-white/90'
                    }`}
                  >
                    {example.style}
                  </span>
                  <span
                    className={`text-sm ${
                      example.dark ? 'text-stone-600' : 'text-white/60'
                    }`}
                  >
                    Beispiel-Visualisierung
                  </span>
                </div>
              </div>

              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

              {/* Info */}
              <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                <h3 className="text-base font-semibold text-white">
                  {example.style}
                </h3>
                <p className="text-sm text-white/70">{example.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
