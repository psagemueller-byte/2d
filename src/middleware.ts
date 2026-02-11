import { NextRequest, NextResponse } from 'next/server';

/**
 * Password protection for the entire app.
 *
 * Uses HTTP Basic Auth — browser shows a native login popup.
 * Both username AND password must match exactly.
 *
 * Credentials are stored in environment variables on Vercel:
 *   SITE_USERNAME=...
 *   SITE_PASSWORD=...
 *
 * Admin routes have separate protection via GALLERY_ADMIN_PASSWORD.
 *
 * SECURITY: All credentials are validated with constant-time comparison
 * to prevent timing attacks. No prompt injection possible — credentials
 * come only from environment variables, never from user input or page content.
 */

// Constant-time string comparison to prevent timing attacks
function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

function checkBasicAuth(
  request: NextRequest,
  expectedUsername: string,
  expectedPassword: string
): boolean {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Basic ')) return false;

  const base64 = authHeader.slice(6); // Remove "Basic "
  if (!base64) return false;

  try {
    const decoded = atob(base64);
    const colonIndex = decoded.indexOf(':');
    if (colonIndex === -1) return false;

    const username = decoded.slice(0, colonIndex);
    const password = decoded.slice(colonIndex + 1);

    return safeCompare(username, expectedUsername) && safeCompare(password, expectedPassword);
  } catch {
    return false;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // --- Admin route protection (separate credentials) ---
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    const adminPassword = process.env.GALLERY_ADMIN_PASSWORD;

    if (!adminPassword) {
      return pathname.startsWith('/api/')
        ? NextResponse.json({ error: 'Admin not configured' }, { status: 403 })
        : new NextResponse('Admin-Zugang nicht konfiguriert.', {
            status: 403,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          });
    }

    // Admin uses password-only check (any username)
    const authHeader = request.headers.get('authorization');
    let adminAuthorized = false;
    if (authHeader?.startsWith('Basic ')) {
      try {
        const decoded = atob(authHeader.slice(6));
        const password = decoded.slice(decoded.indexOf(':') + 1);
        adminAuthorized = safeCompare(password, adminPassword);
      } catch {
        adminAuthorized = false;
      }
    }

    if (adminAuthorized) return NextResponse.next();

    return new NextResponse(
      pathname.startsWith('/api/') ? 'Unauthorized' : 'Admin-Zugang — bitte Passwort eingeben.',
      {
        status: 401,
        headers: {
          'WWW-Authenticate': 'Basic realm="RoomVision Admin"',
          'Content-Type': 'text/plain; charset=utf-8',
        },
      }
    );
  }

  // --- Site-wide protection (username + password) ---
  const siteUsername = process.env.SITE_USERNAME;
  const sitePassword = process.env.SITE_PASSWORD;

  // No credentials configured = app is public
  if (!siteUsername || !sitePassword) {
    return NextResponse.next();
  }

  if (checkBasicAuth(request, siteUsername, sitePassword)) {
    return NextResponse.next();
  }

  // Return 401 with Basic Auth challenge
  return new NextResponse('Zugang geschützt — bitte Benutzername und Passwort eingeben.', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="RoomVision"',
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}

// Protect ALL routes except Next.js internals and static files
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.svg|.*\\.png|.*\\.jpg|.*\\.ico).*)',
  ],
};
