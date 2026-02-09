'use client';

import { Upload, SlidersHorizontal, CreditCard, ImageDown } from 'lucide-react';
import { motion } from 'framer-motion';

const steps = [
  {
    icon: Upload,
    title: 'Grundriss hochladen',
    description: 'Lade deinen Grundriss als PDF, PNG oder JPG hoch. Drag & Drop oder Datei auswählen.',
  },
  {
    icon: SlidersHorizontal,
    title: 'Stil & Raum wählen',
    description: 'Wähle aus 8 Einrichtungsstilen und 5 Raumtypen für dein perfektes Design.',
  },
  {
    icon: CreditCard,
    title: 'Einmalig bezahlen',
    description: 'Kein Abo nötig. Bezahle nur $2.99 pro generiertem Bild, sicher via Stripe.',
  },
  {
    icon: ImageDown,
    title: 'Ergebnis erhalten',
    description: 'Erhalte dein fotorealistisches Raumdesign in Sekunden und lade es als HD-Bild herunter.',
  },
];

export default function HowItWorks() {
  return (
    <section className="py-24" id="how-it-works">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            So einfach geht&apos;s
          </h2>
          <p className="mt-4 text-lg text-muted">
            In vier Schritten vom Grundriss zum Traumzimmer
          </p>
        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="relative flex flex-col items-center text-center"
            >
              {/* Step number */}
              <div className="absolute -top-3 -left-1 text-6xl font-bold text-brand/10">
                {i + 1}
              </div>

              <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                <step.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm text-muted leading-relaxed">{step.description}</p>

              {/* Connector line */}
              {i < steps.length - 1 && (
                <div className="absolute top-7 left-[calc(50%+2rem)] hidden h-px w-[calc(100%-4rem)] bg-gradient-to-r from-brand/20 to-transparent lg:block" />
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
