import { NextRequest, NextResponse } from 'next/server';

/**
 * Simple password protection for the entire app during beta/testing.
 *
 * Set these environment variables on Vercel:
 *   BETA_PASSWORD=dein-geheimes-passwort
 *
 * To disable protection (go public), simply remove the BETA_PASSWORD env var.
 *
 * Uses HTTP Basic Auth — browser shows a native login popup.
 * Username can be anything, only the password matters.
 */

export function middleware(request: NextRequest) {
  const password = process.env.BETA_PASSWORD;

  // No password set = app is public (production mode)
  if (!password) {
    return NextResponse.next();
  }

  // Check for Authorization header
  const authHeader = request.headers.get('authorization');

  if (authHeader) {
    // Parse Basic Auth: "Basic base64(user:password)"
    const base64 = authHeader.split(' ')[1];
    if (base64) {
      try {
        const decoded = atob(base64);
        const providedPassword = decoded.split(':')[1];

        if (providedPassword === password) {
          return NextResponse.next();
        }
      } catch {
        // Invalid base64, fall through to auth challenge
      }
    }
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
