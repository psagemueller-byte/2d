'use client';

import { Zap, Shield, Globe, Layers, Eye, Download } from 'lucide-react';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';

const features = [
  {
    icon: Zap,
    title: 'Blitzschnelle KI',
    description: 'Ergebnisse in unter 30 Sekunden dank modernster Bildgenerations-KI.',
  },
  {
    icon: Layers,
    title: '8 Einrichtungsstile',
    description: 'Von Modern über Skandinavisch bis Japanisch — finde deinen perfekten Look.',
  },
  {
    icon: Eye,
    title: 'Fotorealistisch',
    description: 'Hochauflösende Renderings, die aussehen wie echte Innenarchitektur-Fotos.',
  },
  {
    icon: Shield,
    title: 'Sichere Zahlung',
    description: 'Bezahle sicher per Stripe. Keine versteckten Kosten, kein Abo.',
  },
  {
    icon: Globe,
    title: 'PDF & Bilder',
    description: 'Unterstützt PDF-Grundrisse sowie PNG und JPG-Dateien bis 10 MB.',
  },
  {
    icon: Download,
    title: 'HD-Download',
    description: 'Lade deine Designs in voller Auflösung herunter und nutze sie frei.',
  },
];

export default function Features() {
  return (
    <section className="py-24 bg-surface/50" id="features">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Alles was du brauchst
          </h2>
          <p className="mt-4 text-lg text-muted">
            Professionelle Raumvisualisierung — zugänglich für jeden
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
            >
              <Card hover className="h-full">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10 text-brand">
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm text-muted leading-relaxed">
                  {feature.description}
                </p>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
