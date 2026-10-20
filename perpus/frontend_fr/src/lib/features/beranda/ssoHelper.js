/**
 * Helper utilitas integrasi Single Sign-On (SSO) untuk Perpustakaan Spenspra
 */

export function getSsoBaseUrl() {
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_SSO_LOGIN_URL?.replace('/login', '') || 'http://sso.localhost';
  }
  const host = window.location.hostname;
  if (host.includes('spenspra.com')) return 'https://sso.spenspra.com';
  if (host.includes('spenspra.sch.id')) return 'https://sso.spenspra.sch.id';
  return process.env.NEXT_PUBLIC_SSO_URL || 'http://sso.localhost';
}

export function getSsoLoginUrl(action = '') {
  const baseUrl = getSsoBaseUrl();
  let returnUrl = '';
  if (typeof window !== 'undefined') {
    const url = new URL(window.location.href);
    if (action) {
      url.searchParams.set('action', action);
    }
    returnUrl = url.toString();
  }
  
  const loginUrl = new URL(`${baseUrl}/login`);
  if (returnUrl) {
    loginUrl.searchParams.set('redirect_uri', returnUrl);
  }
  return loginUrl.toString();
}

export function redirectToSsoLogin(action = '') {
  if (typeof window !== 'undefined') {
    window.location.href = getSsoLoginUrl(action);
  }
}

export function redirectToSsoLogout() {
  if (typeof window !== 'undefined') {
    const baseUrl = getSsoBaseUrl();
    const returnUrl = encodeURIComponent(window.location.origin);
    window.location.href = `${baseUrl}/login?logout=true&redirect_uri=${returnUrl}`;
  }
}
