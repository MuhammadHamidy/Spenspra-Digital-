import { NextResponse } from 'next/server';

function getSsoLoginUrl(request, reason = '') {
  const host = request.headers.get('host') || '';
  const isSpenspraCom = host.includes('spenspra.com');
  const isSpenspraSch = host.includes('spenspra.sch.id');

  const defaultPerpusUrl = isSpenspraCom
    ? 'https://perpus.spenspra.com'
    : isSpenspraSch
    ? 'https://perpus.spenspra.sch.id'
    : 'http://perpus.localhost';

  const ssoLoginUrl = process.env.NEXT_PUBLIC_SSO_LOGIN_URL || defaultSsoUrl;
  const perpusUrl = process.env.NEXT_PUBLIC_PERPUS_URL || defaultPerpusUrl;
  const redirectUrl = new URL(ssoLoginUrl, request.url);

  // Simpan URL aplikasi agar SSO mengarahkan kembali setelah login berhasil
  redirectUrl.searchParams.set('redirect_uri', perpusUrl);

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

  // Hanya rute callback SSO dan Kiosk mandiri yang dapat diakses publik tanpa login personal
  const isPublicPath =
    pathname.startsWith('/sso/callback') ||
    pathname === '/kiosk';

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

  // Jika belum login dan mengakses area terproteksi (termasuk '/') -> alihkan langsung ke SSO login
  if (!isAuthenticated && !isPublicPath) {
    return NextResponse.redirect(getSsoLoginUrl(request, 'auth_required'));
  }

  // Jika sudah login di root ('/') dan role adalah pustakawan/admin -> alihkan ke dashboard pustakawan
  if (isAuthenticated && pathname === '/') {
    if (userRole === 'PUSTAKAWAN' || userRole === 'ADMIN_PERPUS' || userRole === 'SUPER_ADMIN') {
      return NextResponse.redirect(new URL('/pustakawan', request.url));
    }
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
