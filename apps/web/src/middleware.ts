import { NextResponse, type NextRequest } from 'next/server';

const ACCESS_COOKIE = 'bogcha_at';
const REFRESH_COOKIE = 'bogcha_rt';
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

const PUBLIC_PATHS = ['/login'];

/** JWT `exp` ni tekshirish (imzo API tomonida tekshiriladi). */
function secondsUntilExpiry(token: string): number {
  try {
    const payload = token.split('.')[1];
    if (!payload) return -1;
    const decoded = JSON.parse(
      Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'),
    ) as { exp?: number };
    if (!decoded.exp) return -1;
    return decoded.exp - Math.floor(Date.now() / 1000);
  } catch {
    return -1;
  }
}

function clearAuthCookies(response: NextResponse) {
  const secure = process.env.NODE_ENV === 'production';
  for (const name of [ACCESS_COOKIE, REFRESH_COOKIE]) {
    response.cookies.set(name, '', {
      httpOnly: true,
      sameSite: 'lax',
      secure,
      path: '/',
      maxAge: 0,
    });
  }
  return response;
}

async function refreshSession(refreshToken: string) {
  try {
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
      cache: 'no-store',
    });
    if (!response.ok) return null;
    return (await response.json()) as {
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
    };
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((path) => pathname.startsWith(path));
  const isApi = pathname.startsWith('/api/');

  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;

  const accessValid = Boolean(accessToken) && secondsUntilExpiry(accessToken!) > 30;
  const sessionExpired = request.nextUrl.searchParams.get('reason') === 'expired';

  if (isPublic) {
    // API 401 → /login?reason=expired. Cookie o'chirilmasa accessValid
    // true bo'lib qoladi va / ↔ /login loop chiqadi.
    if (sessionExpired) {
      return clearAuthCookies(NextResponse.next());
    }

    // Allaqachon tizimda bo'lsa login sahifasi kerak emas.
    if (accessValid) return NextResponse.redirect(new URL('/', request.url));
    return NextResponse.next();
  }

  if (accessValid) return NextResponse.next();

  // Access token muddati tugagan — refresh token bilan yangilanadi (TZ §40).
  if (refreshToken) {
    const session = await refreshSession(refreshToken);
    if (session) {
      const response = NextResponse.next();
      const secure = process.env.NODE_ENV === 'production';
      response.cookies.set(ACCESS_COOKIE, session.accessToken, {
        httpOnly: true,
        sameSite: 'lax',
        secure,
        path: '/',
        maxAge: Math.max(60, session.expiresIn),
      });
      response.cookies.set(REFRESH_COOKIE, session.refreshToken, {
        httpOnly: true,
        sameSite: 'lax',
        secure,
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
      });
      return response;
    }
  }

  // BFF/API so'rovlariga HTML login redirect qilmaymiz — 401 qaytadi.
  if (isApi) {
    return clearAuthCookies(NextResponse.json({ message: 'Unauthorized' }, { status: 401 }));
  }

  const loginUrl = new URL('/login', request.url);
  if (pathname !== '/') loginUrl.searchParams.set('next', pathname + search);
  return clearAuthCookies(NextResponse.redirect(loginUrl));
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.png$).*)'],
};
