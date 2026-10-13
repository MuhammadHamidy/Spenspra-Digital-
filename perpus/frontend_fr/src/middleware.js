import { NextResponse } from 'next/server';

export function middleware(request) {
  const { pathname } = request.nextUrl;

  const authToken = request.cookies.get('perpusdig_auth_token')?.value;
  const authUser = request.cookies.get('perpusdig_auth_user')?.value;
  const isAuthenticated = Boolean(authToken || authUser);

  // If user is on /login and is authenticated -> redirect to /pustakawan
  if (pathname === '/login') {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL('/pustakawan', request.url));
    }
    return NextResponse.next();
  }

  // Public paths accessible without librarian login
  const isPublicPath =
    pathname === '/' ||
    pathname === '/perpus' ||
    pathname === '/kiosk';

  // If user is not authenticated and trying to access protected administrative pages -> redirect to /login
  if (!isAuthenticated && !isPublicPath) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Enforce audience claim untuk halaman terlindungi
  if (authToken && !isPublicPath) {
    try {
      const parts = authToken.split('.');
      if (parts.length === 3) {
        const payloadJson = Buffer.from(parts[1], 'base64url').toString('utf8');
        const payload = JSON.parse(payloadJson);

        if (payload.aud && Array.isArray(payload.aud)) {
          if (!payload.aud.includes('perpus')) {
            const host = request.headers.get('host') || '';
            const isSpenspraCom = host.includes('spenspra.com');
            const isSpenspraSch = host.includes('spenspra.sch.id');

            const defaultSsoUrl = isSpenspraCom
              ? 'https://sso.spenspra.com/login'
              : isSpenspraSch
              ? 'https://sso.spenspra.sch.id/login'
              : 'http://sso.localhost/login';

            const ssoLoginUrl = process.env.NEXT_PUBLIC_SSO_LOGIN_URL || defaultSsoUrl;
            const redirectUrl = new URL(ssoLoginUrl, request.url);
            redirectUrl.searchParams.set('reason', 'unauthorized_app');
            return NextResponse.redirect(redirectUrl);
          }
        }
      }
    } catch (e) {
      // Abaikan parsing error, API backend akan memverifikasi tanda tangan kriptografis
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * - static assets (.svg, .png, .jpg, .jpeg, .gif, .webp, .ico)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
