'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ── Types ──

export type LoadingPhase =
  | 'detecting'
  | 'analyzing'
  | 'rendering_3d'
  | 'beautifying'
  | 'generating';

interface LoadingExperienceProps {
  progress: number;
  phase: LoadingPhase;
  currentItem?: string;
  completedCount?: number;
  totalCount?: number;
  compact?: boolean;
}

// ── Phase config ──

interface PhaseConfig {
  label: string;
  description: string;
  icon: string;
}

const PHASES: Record<LoadingPhase, PhaseConfig> = {
  detecting: {
    label: 'Erkennung',
    description: 'KI scannt deinen Grundriss...',
    icon: '🔍',
  },
  analyzing: {
    label: 'Analyse',
    description: 'Raumstruktur wird analysiert...',
    icon: '📐',
  },
  rendering_3d: {
    label: '3D-Aufbau',
    description: '3D-Szene wird aufgebaut...',
    icon: '🧊',
  },
  beautifying: {
    label: 'Veredelung',
    description: 'Fotorealistische Aufbereitung...',
    icon: '✨',
  },
  generating: {
    label: 'Generierung',
    description: 'Ansichten werden erstellt...',
    icon: '🎨',
  },
};

const PHASE_ORDER: LoadingPhase[] = [
  'detecting',
  'analyzing',
  'rendering_3d',
  'beautifying',
  'generating',
];

const TIPS = [
  'Jede Wand wird einzeln analysiert und vermessen.',
  'Die KI erkennt Türen, Fenster und Einbauten automatisch.',
  'Möbel werden nach Raumtyp und Stil passend platziert.',
  '3 verschiedene Perspektiven zeigen deinen Raum von allen Seiten.',
  'Die KI verwandelt einfache Modelle in fotorealistische Bilder.',
  'Jedes Detail wird aufbereitet — Holzmaserung, Stofftextur, Licht.',
  'Materialien, Schatten und Reflexionen werden simuliert.',
  'Noch einen Moment — dein Traumzimmer wird gleich fertig!',
];

// ── Animated Progress Ring ──

function ProgressRing({ progress, phase }: { progress: number; phase: LoadingPhase }) {
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center">
      {/* Glow effect */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 152,
          height: 152,
          background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
        }}
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.5, 0.8, 0.5],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      <svg width="140" height="140" viewBox="0 0 140 140" className="relative -rotate-90">
        {/* Background track */}
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke="currentColor"
          className="text-border"
          strokeWidth="4"
          strokeLinecap="round"
        />

        {/* Animated orbit particle */}
        <motion.circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke="url(#orbitGradient)"
          strokeWidth="2"
          strokeDasharray={`8 ${circumference - 8}`}
          strokeLinecap="round"
          animate={{ rotate: 360 }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
          style={{ transformOrigin: '70px 70px' }}
        />

        {/* Progress arc */}
        <motion.circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke="url(#progressGradient)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />

        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="50%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#4f46e5" />
          </linearGradient>
          <linearGradient id="orbitGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0" />
            <stop offset="50%" stopColor="#818cf8" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>

      {/* Center content */}
      <div className="absolute flex flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.span
            key={Math.round(progress)}
            className="text-2xl font-bold tracking-tight tabular-nums"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.3 }}
          >
            {Math.round(progress)}%
          </motion.span>
        </AnimatePresence>
        <span className="text-[10px] uppercase tracking-[0.15em] text-muted mt-0.5">
          {PHASES[phase].label}
        </span>
      </div>
    </div>
  );
}

// ── Phase Steps ──

function PhaseSteps({ currentPhase }: { currentPhase: LoadingPhase }) {
  const currentIndex = PHASE_ORDER.indexOf(currentPhase);
  // Only show relevant phases (skip detecting if not in detecting, etc.)
  const visiblePhases = PHASE_ORDER.filter((_, i) => i >= Math.max(0, currentIndex - 1) && i <= currentIndex + 2);

  return (
    <div className="flex items-center justify-center gap-1.5 sm:gap-2">
      {visiblePhases.map((phase, i) => {
        const phaseIndex = PHASE_ORDER.indexOf(phase);
        const isActive = phase === currentPhase;
        const isDone = phaseIndex < currentIndex;

        return (
          <motion.div
            key={phase}
            className="flex items-center gap-1.5 sm:gap-2"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            {i > 0 && (
              <div className={`hidden sm:block h-px w-6 ${isDone ? 'bg-brand' : 'bg-border'}`} />
            )}
            <motion.div
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-brand/15 text-brand border border-brand/30'
                  : isDone
                  ? 'bg-brand/5 text-brand/60'
                  : 'text-muted/50'
              }`}
              animate={isActive ? { scale: [1, 1.03, 1] } : {}}
              transition={isActive ? { duration: 2, repeat: Infinity, ease: 'easeInOut' } : {}}
            >
              {isDone ? (
                <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <span className="text-xs">{PHASES[phase].icon}</span>
              )}
              <span className="hidden sm:inline">{PHASES[phase].label}</span>
            </motion.div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ── Rotating Tips ──

function RotatingTips() {
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % TIPS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-10 flex items-center justify-center overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.p
          key={tipIndex}
          className="text-xs text-muted text-center max-w-sm leading-relaxed"
          initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -12, filter: 'blur(4px)' }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          {TIPS[tipIndex]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

// ── Skeleton Preview Cards ──

function SkeletonPreviews() {
  const labels = ['Perspektive', 'Frontal', 'Draufsicht'];

  return (
    <div className="grid grid-cols-3 gap-3 w-full max-w-lg mx-auto">
      {labels.map((label, i) => (
        <motion.div
          key={label}
          className="relative overflow-hidden rounded-xl border border-border/50"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 + i * 0.12, duration: 0.5, ease: 'easeOut' }}
        >
          {/* Shimmer body */}
          <div className="relative aspect-[3/2] bg-surface overflow-hidden">
            <div className="loading-shimmer absolute inset-0" />
            {/* Faint grid overlay */}
            <svg className="absolute inset-0 w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id={`grid-${i}`} width="16" height="16" patternUnits="userSpaceOnUse">
                  <path d="M 16 0 L 0 0 0 16" fill="none" stroke="currentColor" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill={`url(#grid-${i})`} />
            </svg>
          </div>
          {/* Label bar */}
          <div className="px-2 py-1.5 text-center">
            <span className="text-[10px] font-medium text-muted/60 uppercase tracking-wider">{label}</span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ── Animated Blueprint Lines (background decoration) ──

function BlueprintBackground() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-[0.03]">
      {/* Horizontal measuring lines */}
      <motion.div
        className="absolute top-1/4 left-0 right-0 h-px bg-brand"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 2, ease: 'easeOut' }}
        style={{ transformOrigin: 'left' }}
      />
      <motion.div
        className="absolute top-3/4 left-0 right-0 h-px bg-brand"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 2, delay: 0.3, ease: 'easeOut' }}
        style={{ transformOrigin: 'right' }}
      />
      {/* Vertical lines */}
      <motion.div
        className="absolute top-0 bottom-0 left-1/4 w-px bg-brand"
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ duration: 2, delay: 0.5, ease: 'easeOut' }}
        style={{ transformOrigin: 'top' }}
      />
      <motion.div
        className="absolute top-0 bottom-0 right-1/4 w-px bg-brand"
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ duration: 2, delay: 0.7, ease: 'easeOut' }}
        style={{ transformOrigin: 'bottom' }}
      />
      {/* Corner marks */}
      {[
        { top: '24%', left: '24%' },
        { top: '24%', right: '24%' },
        { bottom: '24%', left: '24%' },
        { bottom: '24%', right: '24%' },
      ].map((pos, i) => (
        <motion.div
          key={i}
          className="absolute w-3 h-3"
          style={pos as React.CSSProperties}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.2 + i * 0.15, duration: 0.4 }}
        >
          <div className="absolute top-0 left-0 w-full h-px bg-brand" />
          <div className="absolute top-0 left-0 w-px h-full bg-brand" />
        </motion.div>
      ))}
    </div>
  );
}

// ── Main Component ──

export default function LoadingExperience({
  progress,
  phase,
  currentItem,
  completedCount,
  totalCount,
  compact = false,
}: LoadingExperienceProps) {
  const phaseConfig = PHASES[phase];

  // Dynamic status text
  const statusText = useMemo(() => {
    if (currentItem) {
      if (totalCount && completedCount !== undefined) {
        return `${currentItem} — ${completedCount}/${totalCount}`;
      }
      return currentItem;
    }
    return phaseConfig.description;
  }, [currentItem, totalCount, completedCount, phaseConfig.description]);

  if (compact) {
    return (
      <motion.div
        className="flex flex-col items-center gap-5 py-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        <ProgressRing progress={progress} phase={phase} />
        <div className="text-center space-y-1">
          <AnimatePresence mode="wait">
            <motion.p
              key={statusText}
              className="text-sm font-medium"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.3 }}
            >
              {statusText}
            </motion.p>
          </AnimatePresence>
          <p className="text-xs text-muted">GPT-4o analysiert deinen Grundriss</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="relative mx-auto max-w-xl py-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      <BlueprintBackground />

      <div className="relative flex flex-col items-center gap-6">
        {/* Progress Ring */}
        <ProgressRing progress={progress} phase={phase} />

        {/* Status Text */}
        <div className="text-center space-y-1.5">
          <AnimatePresence mode="wait">
            <motion.p
              key={statusText}
              className="text-base font-medium"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.35 }}
            >
              {statusText}
            </motion.p>
          </AnimatePresence>

          {totalCount !== undefined && completedCount !== undefined && totalCount > 0 && (
            <p className="text-xs text-muted tabular-nums">
              {completedCount} von {totalCount} Ansichten fertig
            </p>
          )}
        </div>

        {/* Phase Steps */}
        <PhaseSteps currentPhase={phase} />

        {/* Skeleton Preview Cards */}
        <div className="w-full mt-2">
          <SkeletonPreviews />
        </div>

        {/* Rotating Tips */}
        <div className="mt-2">
          <RotatingTips />
        </div>
      </div>
    </motion.div>
  );
}
