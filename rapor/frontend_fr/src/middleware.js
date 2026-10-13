import { NextResponse } from 'next/server';

export function middleware(request) {
  const pathname = request.nextUrl.pathname;
  if (pathname === '/sso/callback' || pathname === '/kiosk') {
    return NextResponse.next();
  }

  const host = request.headers.get('host') || '';
  const isSpenspraCom = host.includes('spenspra.com');
  const isSpenspraSch = host.includes('spenspra.sch.id');

  const defaultSsoUrl = isSpenspraCom
    ? 'https://sso.spenspra.com/login'
    : isSpenspraSch
    ? 'https://sso.spenspra.sch.id/login'
    : 'http://sso.localhost/login';

  const defaultRaporUrl = isSpenspraCom
    ? 'https://rapor.spenspra.com'
    : isSpenspraSch
    ? 'https://rapor.spenspra.sch.id'
    : 'http://rapor.localhost';

  const ssoLoginUrl = process.env.NEXT_PUBLIC_SSO_LOGIN_URL || defaultSsoUrl;
  const raporUrl = process.env.NEXT_PUBLIC_RAPOR_URL || defaultRaporUrl;

  const token = request.cookies.get('perpusdig_auth_token')?.value;
  if (!token) {
    const redirectUrl = new URL(ssoLoginUrl, request.url);
    // Gunakan redirect_uri agar SSO tahu ke mana harus kembali setelah login.
    redirectUrl.searchParams.set('redirect_uri', raporUrl);
    return NextResponse.redirect(redirectUrl);
  }

  // Enforce audience claim: pastikan akun berhak mengakses e-Rapor
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const payloadJson = Buffer.from(parts[1], 'base64url').toString('utf8');
      const payload = JSON.parse(payloadJson);

      if (payload.aud && Array.isArray(payload.aud)) {
        if (!payload.aud.includes('erapor')) {
          const redirectUrl = new URL(ssoLoginUrl, request.url);
          redirectUrl.searchParams.set('reason', 'unauthorized_app');
          return NextResponse.redirect(redirectUrl);
        }
      }
    }
  } catch (e) {
    // Abaikan jika decoding error, biarkan validasi signature API menangani
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
    '/((?!api|_next/static|_next/image|sso/callback|kiosk|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
