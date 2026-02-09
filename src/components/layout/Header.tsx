'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, X, Sun, Moon, Sparkles } from 'lucide-react';
import { useTheme } from './ThemeProvider';

export default function Header() {
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border backdrop-blur-xl bg-background/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-white transition-transform group-hover:scale-105">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight">
              Room<span className="text-brand">Vision</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden items-center gap-1 md:flex">
            <Link
              href="/#features"
              className="rounded-lg px-4 py-2 text-sm font-medium text-muted transition-colors hover:text-foreground hover:bg-surface"
            >
              Features
            </Link>
            <Link
              href="/#gallery"
              className="rounded-lg px-4 py-2 text-sm font-medium text-muted transition-colors hover:text-foreground hover:bg-surface"
            >
              Galerie
            </Link>
            <Link
              href="/pricing"
              className="rounded-lg px-4 py-2 text-sm font-medium text-muted transition-colors hover:text-foreground hover:bg-surface"
            >
              Preise
            </Link>
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:text-foreground hover:bg-surface"
              aria-label="Theme wechseln"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            <Link
              href="/create"
              className="hidden rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-brand-dark hover:shadow-lg hover:shadow-brand/25 md:block"
            >
              Jetzt gestalten
            </Link>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:text-foreground hover:bg-surface md:hidden"
              aria-label="Menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileOpen && (
          <nav className="border-t border-border py-4 md:hidden">
            <div className="flex flex-col gap-1">
              <Link
                href="/#features"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-muted transition-colors hover:text-foreground hover:bg-surface"
              >
                Features
              </Link>
              <Link
                href="/#gallery"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-muted transition-colors hover:text-foreground hover:bg-surface"
              >
                Galerie
              </Link>
              <Link
                href="/pricing"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-muted transition-colors hover:text-foreground hover:bg-surface"
              >
                Preise
              </Link>
              <Link
                href="/create"
                onClick={() => setMobileOpen(false)}
                className="mt-2 rounded-lg bg-brand px-4 py-2 text-center text-sm font-semibold text-white transition-all hover:bg-brand-dark"
              >
                Jetzt gestalten
              </Link>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
