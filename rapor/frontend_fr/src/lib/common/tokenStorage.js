const TOKEN_KEY = 'perpusdig_auth_token';
const USER_KEY = 'perpusdig_auth_user';
const INSTITUTION_KEY = 'rapor_institution_id';
const SESSION_ACTIVE_KEY = 'spenspra_session_active';
const LAST_ACTIVITY_KEY = 'spenspra_last_activity';

/**
 * Menyimpan cookie sesi (Session Cookie tanpa atribut expires).
 * Cookie ini hanya hidup selama sesi browser berjalan.
 */
function getParentDomain() {
  if (typeof window === 'undefined' || !window.location.hostname) return '';
  const hostname = window.location.hostname;
  if (hostname.includes('localhost') || /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
    return '';
  }
  const hostParts = hostname.split('.');
  if (hostParts.length >= 3) {
    const secondLast = hostParts[hostParts.length - 2].toLowerCase();
    const multiPartTlds = ['sch', 'co', 'ac', 'go', 'or', 'my', 'biz', 'web', 'mil', 'net', 'edu', 'gov', 'org', 'com'];
    if (multiPartTlds.includes(secondLast)) {
      return '.' + hostParts.slice(-3).join('.');
    }
  }
  if (hostParts.length >= 2) {
    return '.' + hostParts.slice(-2).join('.');
  }
  return '';
}

function setSessionCookie(name, value) {
  if (typeof window === 'undefined') return;
  const encoded = encodeURIComponent(value);
  const isHttps = window.location.protocol === 'https:';
  const secureFlag = isHttps ? '; Secure' : '';

  document.cookie = `${name}=${encoded}; path=/; domain=localhost; SameSite=Lax${secureFlag}`;
  document.cookie = `${name}=${encoded}; path=/; domain=.localhost; SameSite=Lax${secureFlag}`;

  const parentDomain = getParentDomain();
  if (parentDomain) {
    document.cookie = `${name}=${encoded}; path=/; domain=${parentDomain}; SameSite=Lax${secureFlag}`;
  }
  document.cookie = `${name}=${encoded}; path=/; SameSite=Lax${secureFlag}`;
}

function removeCookie(name) {
  if (typeof window === 'undefined') return;
  const isHttps = window.location.protocol === 'https:';
  const secureFlag = isHttps ? '; Secure' : '';
  const expired = `expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; path=/; SameSite=Lax${secureFlag}`;
  document.cookie = `${name}=; ${expired}`;
  document.cookie = `${name}=; ${expired}; domain=localhost`;
  document.cookie = `${name}=; ${expired}; domain=.localhost`;
  if (window.location && window.location.hostname) {
    document.cookie = `${name}=; ${expired}; domain=${window.location.hostname}`;
    document.cookie = `${name}=; ${expired}; domain=.${window.location.hostname}`;
    const parentDomain = getParentDomain();
    if (parentDomain) {
      document.cookie = `${name}=; ${expired}; domain=${parentDomain}`;
    }
  }
}

function getCookie(name) {
  if (typeof window === 'undefined') return null;
  const nameEQ = name + '=';
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i].trim();
    if (c.indexOf(nameEQ) === 0) {
      return decodeURIComponent(c.substring(nameEQ.length, c.length));
    }
  }
  return null;
}

function purgeLegacyLocalStorage() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem('perpusdig_explicit_logout');
    localStorage.removeItem(SESSION_ACTIVE_KEY);
  } catch (e) {}
}

export const tokenStorage = {
  getToken: () => {
    if (typeof window === 'undefined') return null;
    purgeLegacyLocalStorage();

    // 1. Ambil dari sessionStorage (terikat kuat pada tab/jendela aktif)
    let token = null;
    try {
      token = sessionStorage.getItem(TOKEN_KEY);
    } catch (e) {}

    // 2. Jika tab/jendela baru dibuka tanpa sesi sessionStorage aktif:
    // Berarti pengguna telah keluar/menutup web sebelumnya.
    if (!token) {
      const isCallback = window.location.pathname.includes('/sso/callback');
      if (!isCallback) {
        // Reset cookie sisa agar tidak terjadi penumpukan akses atau error sesi usang
        tokenStorage.clear();
        return null;
      }
    }
    return token;
  },

  setToken: (token) => {
    if (typeof window !== 'undefined') {
      purgeLegacyLocalStorage();
      try {
        sessionStorage.setItem(TOKEN_KEY, token);
        sessionStorage.setItem(SESSION_ACTIVE_KEY, '1');
        sessionStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
      } catch (e) {}
      setSessionCookie(TOKEN_KEY, token);
    }
  },

  getUser: () => {
    if (typeof window === 'undefined') return null;
    purgeLegacyLocalStorage();

    let data = null;
    try {
      data = sessionStorage.getItem(USER_KEY);
    } catch (e) {}

    if (!data) {
      const isCallback = window.location.pathname.includes('/sso/callback');
      if (!isCallback) {
        return null;
      }
    }

    try {
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  setUser: (user) => {
    if (typeof window !== 'undefined') {
      purgeLegacyLocalStorage();
      const userStr = JSON.stringify(user);
      try {
        sessionStorage.setItem(USER_KEY, userStr);
        sessionStorage.setItem(SESSION_ACTIVE_KEY, '1');
        sessionStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
      } catch (e) {}
      setSessionCookie(USER_KEY, userStr);
    }
  },

  getInstitutionId: () => {
    if (typeof window === 'undefined') return null;
    try {
      return sessionStorage.getItem(INSTITUTION_KEY) || getCookie(INSTITUTION_KEY);
    } catch {
      return getCookie(INSTITUTION_KEY);
    }
  },

  setInstitutionId: (institutionId) => {
    if (typeof window === 'undefined') return;
    try {
      sessionStorage.setItem(INSTITUTION_KEY, institutionId);
    } catch {}
    setSessionCookie(INSTITUTION_KEY, institutionId);
  },

  clear: () => {
    if (typeof window !== 'undefined') {
      purgeLegacyLocalStorage();
      try {
        sessionStorage.removeItem(TOKEN_KEY);
        sessionStorage.removeItem(USER_KEY);
        sessionStorage.removeItem(INSTITUTION_KEY);
        sessionStorage.removeItem(SESSION_ACTIVE_KEY);
        sessionStorage.removeItem(LAST_ACTIVITY_KEY);
        sessionStorage.clear();
      } catch (e) {}
      removeCookie(TOKEN_KEY);
      removeCookie(USER_KEY);
      removeCookie(INSTITUTION_KEY);
      removeCookie('perpusdig_auth_token');
      removeCookie('perpusdig_auth_user');
      removeCookie('rapor_institution_id');
    }
  },

  recordActivity: () => {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
      } catch (e) {}
    }
  },

  getLastActivity: () => {
    if (typeof window === 'undefined') return 0;
    try {
      return parseInt(sessionStorage.getItem(LAST_ACTIVITY_KEY) || '0', 10);
    } catch {
      return 0;
    }
  },

  syncCookies: () => {
    if (typeof window !== 'undefined') {
      purgeLegacyLocalStorage();
      let token = null;
      let user = null;
      try {
        token = sessionStorage.getItem(TOKEN_KEY);
        user = sessionStorage.getItem(USER_KEY);
      } catch (e) {}

      if (token && !getCookie(TOKEN_KEY)) {
        setSessionCookie(TOKEN_KEY, token);
      }
      if (user && !getCookie(USER_KEY)) {
        setSessionCookie(USER_KEY, user);
      }
    }
  },
};
