import { NextResponse } from 'next/server';

export function middleware(request) {
  const { pathname } = request.nextUrl;
  if (pathname === '/login') {
    return NextResponse.next();
  }

  const token = request.cookies.get('perpusdig_auth_token')?.value;
  if (!token) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    const proto = request.headers.get('x-forwarded-proto');
    if (proto) {
      url.protocol = `${proto}:`;
    }
    return NextResponse.redirect(url);
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
