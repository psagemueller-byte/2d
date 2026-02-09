import Link from 'next/link';
import { Sparkles } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-8 md:flex-row md:justify-between">
          {/* Logo & Description */}
          <div className="flex flex-col items-center gap-3 md:items-start">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white">
                <Sparkles className="h-4 w-4" />
              </div>
              <span className="text-lg font-bold tracking-tight">
                Room<span className="text-brand">Vision</span>
              </span>
            </Link>
            <p className="text-sm text-muted">
              Grundrisse in fotorealistische Raumdesigns verwandeln.
            </p>
          </div>

          {/* Links */}
          <div className="flex gap-8 text-sm">
            <Link href="/create" className="text-muted transition-colors hover:text-foreground">
              Gestalten
            </Link>
            <Link href="/pricing" className="text-muted transition-colors hover:text-foreground">
              Preise
            </Link>
          </div>
        </div>

        <div className="mt-8 border-t border-border pt-8 text-center text-xs text-muted">
          &copy; {new Date().getFullYear()} RoomVision. Alle Rechte vorbehalten.
        </div>
      </div>
    </footer>
  );
}
