import { NextRequest, NextResponse } from 'next/server';

/**
 * Password protection for:
 * 1. Entire app during beta/testing (BETA_PASSWORD)
 * 2. Admin routes (/admin/*) with separate password (GALLERY_ADMIN_PASSWORD)
 *
 * Set these environment variables on Vercel:
 *   BETA_PASSWORD=dein-geheimes-passwort
 *   GALLERY_ADMIN_PASSWORD=admin-passwort
 *
 * To disable beta protection (go public), remove the BETA_PASSWORD env var.
 * Admin protection stays active as long as GALLERY_ADMIN_PASSWORD is set.
 *
 * Uses HTTP Basic Auth — browser shows a native login popup.
 * Username can be anything, only the password matters.
 */

function checkBasicAuth(request: NextRequest, password: string): boolean {
  const authHeader = request.headers.get('authorization');

  if (!authHeader) return false;

  const base64 = authHeader.split(' ')[1];
  if (!base64) return false;

  try {
    const decoded = atob(base64);
    const providedPassword = decoded.split(':')[1];
    return providedPassword === password;
  } catch {
    return false;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // --- Admin route protection ---
  if (pathname.startsWith('/admin')) {
    const adminPassword = process.env.GALLERY_ADMIN_PASSWORD;

    // No admin password set = admin routes are inaccessible
    if (!adminPassword) {
      return new NextResponse('Admin-Zugang nicht konfiguriert.', {
        status: 403,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    if (checkBasicAuth(request, adminPassword)) {
      return NextResponse.next();
    }

    return new NextResponse('Admin-Zugang — bitte Passwort eingeben.', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="RoomVision Admin"',
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  }

  // --- Admin API protection ---
  if (pathname.startsWith('/api/admin')) {
    const adminPassword = process.env.GALLERY_ADMIN_PASSWORD;

    if (!adminPassword) {
      return NextResponse.json({ error: 'Admin not configured' }, { status: 403 });
    }

    if (checkBasicAuth(request, adminPassword)) {
      return NextResponse.next();
    }

    return new NextResponse('Unauthorized', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="RoomVision Admin API"',
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  }

  // --- Beta protection for the rest of the app ---
  const betaPassword = process.env.BETA_PASSWORD;

  // No beta password set = app is public (production mode)
  if (!betaPassword) {
    return NextResponse.next();
  }

  if (checkBasicAuth(request, betaPassword)) {
    return NextResponse.next();
  }

  // Return 401 with Basic Auth challenge
  return new NextResponse('Zugang geschützt — bitte Passwort eingeben.', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="RoomVision Beta"',
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}

// Protect ALL routes except Next.js internals and static files
export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public files (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.svg|.*\\.png|.*\\.jpg|.*\\.ico).*)',
  ],
};
