'use client';

import Link from 'next/link';
import { ArrowRight, Upload, Palette, ImageDown } from 'lucide-react';
import { motion } from 'framer-motion';
import Button from '@/components/ui/Button';

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[600px] w-[800px] rounded-full bg-brand/10 blur-[120px]" />
        <div className="absolute top-40 right-0 h-[400px] w-[400px] rounded-full bg-purple-500/10 blur-[100px]" />
      </div>

      <div className="mx-auto max-w-7xl px-4 pt-24 pb-20 sm:px-6 sm:pt-32 sm:pb-28 lg:px-8">
        <div className="flex flex-col items-center text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/20 bg-brand/10 px-4 py-1.5 text-xs font-medium text-brand-light">
              <Palette className="h-3.5 w-3.5" />
              KI-gestützte Raumvisualisierung
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-6 max-w-4xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl md:text-6xl lg:text-7xl"
          >
            Verwandle deinen{' '}
            <span className="bg-gradient-to-r from-brand to-purple-400 bg-clip-text text-transparent">
              Grundriss
            </span>{' '}
            in ein Traumzimmer
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-6 max-w-2xl text-lg text-muted sm:text-xl"
          >
            Lade deinen Grundriss hoch, wähle einen Einrichtungsstil und erhalte
            in Sekunden eine fotorealistische Raumvisualisierung per KI.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-10 flex flex-col gap-4 sm:flex-row"
          >
            <Link href="/create">
              <Button size="lg" className="group">
                Jetzt gestalten
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <Link href="/#gallery">
              <Button variant="secondary" size="lg">
                Beispiele ansehen
              </Button>
            </Link>
          </motion.div>

          {/* Mini stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-16 flex items-center gap-8 text-sm text-muted sm:gap-12"
          >
            <div className="flex flex-col items-center gap-1">
              <Upload className="h-5 w-5 text-brand" />
              <span>PDF & Bilder</span>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="flex flex-col items-center gap-1">
              <Palette className="h-5 w-5 text-brand" />
              <span>8 Stile</span>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="flex flex-col items-center gap-1">
              <ImageDown className="h-5 w-5 text-brand" />
              <span>HD Download</span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
