import { NextResponse } from 'next/server';

function getSsoLoginUrl(request, reason = '') {
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

  // Simpan halaman tujuan agar setelah login di SSO langsung kembali ke halaman ini
  redirectUrl.searchParams.set('redirect', request.url);

  if (reason) {
    redirectUrl.searchParams.set('reason', reason);
  }
  return redirectUrl;
}

export function middleware(request) {
  const { pathname } = request.nextUrl;

  const authToken = request.cookies.get('access_token')?.value || request.cookies.get('perpusdig_auth_token')?.value;
  const authUser = request.cookies.get('perpusdig_auth_user')?.value;
  const isAuthenticated = Boolean(authToken || authUser);

  let userRole = '';
  if (authToken) {
    try {
      const parts = authToken.split('.');
      if (parts.length === 3) {
        const payloadJson = Buffer.from(parts[1], 'base64url').toString('utf8');
        const payload = JSON.parse(payloadJson);
        userRole = (payload.role || payload.role_name || payload.roleName || '').toUpperCase();
      }
    } catch {}
  }

  // Sesuai desain.md: Hanya Beranda ('/') yang terbuka publik untuk mode tamu
  const isPublicPath =
    pathname === '/' ||
    pathname.startsWith('/sso/callback');

  // Rute /login kini dialihkan langsung ke SSO terpusat
  if (pathname === '/login') {
    if (isAuthenticated) {
      if (userRole === 'SISWA') {
        return NextResponse.redirect(new URL('/', request.url));
      }
      return NextResponse.redirect(new URL('/pustakawan', request.url));
    }
    return NextResponse.redirect(getSsoLoginUrl(request));
  }

  // Lindungi halaman administrasi pustakawan agar siswa diarahkan ke beranda siswa
  const isLibrarianAdminPath =
    pathname.startsWith('/pustakawan') ||
    pathname.startsWith('/pustakwan') ||
    pathname.startsWith('/circulation') ||
    pathname.startsWith('/members') ||
    pathname.startsWith('/faces') ||
    pathname.startsWith('/books') ||
    pathname.startsWith('/visitors') ||
    pathname.startsWith('/loans') ||
    pathname.startsWith('/reading-insights');

  if (userRole === 'SISWA' && isLibrarianAdminPath) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Jika belum login dan mengakses area administrasi pustakawan -> alihkan langsung ke SSO
  if (!isAuthenticated && !isPublicPath) {
    return NextResponse.redirect(getSsoLoginUrl(request, 'auth_required'));
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
     * - sso/callback
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * - static assets (.svg, .png, .jpg, .jpeg, .gif, .webp, .ico)
     */
    '/((?!api|_next/static|_next/image|sso/callback|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
