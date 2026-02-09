'use client';

import Link from 'next/link';
import { Check, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import Button from '@/components/ui/Button';

const included = [
  'Fotorealistische KI-Visualisierung',
  'Wahl aus 8 Einrichtungsstilen',
  '5 Raumtypen verfügbar',
  'HD-Download (1536 x 1024 px)',
  'PDF, PNG & JPG Upload',
  'Kein Abo — zahle nur wenn du willst',
];

export default function Pricing() {
  return (
    <section className="py-24 bg-surface/50" id="pricing">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Einfache Preise
          </h2>
          <p className="mt-4 text-lg text-muted">
            Keine versteckten Kosten. Bezahle nur pro generiertem Bild.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mx-auto mt-16 max-w-md"
        >
          <div className="relative overflow-hidden rounded-3xl border border-brand/30 bg-surface p-8 shadow-xl shadow-brand/5">
            {/* Glow */}
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 h-48 w-48 rounded-full bg-brand/20 blur-[80px]" />

            <div className="relative">
              <span className="text-sm font-medium text-brand">Pay per Render</span>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-5xl font-bold">$2.99</span>
                <span className="text-muted">/ Bild</span>
              </div>

              <ul className="mt-8 space-y-3">
                {included.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <Link href="/create" className="mt-8 block">
                <Button size="lg" className="w-full group">
                  Jetzt Design erstellen
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
