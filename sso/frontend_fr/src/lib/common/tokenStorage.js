const TOKEN_KEY = 'perpusdig_auth_token';
const USER_KEY = 'perpusdig_auth_user';
const SESSION_ACTIVE_KEY = 'spenspra_session_active';
const LAST_ACTIVITY_KEY = 'spenspra_last_activity';

/**
 * Mendapatkan domain induk (.spenspra.com) untuk cross-subdomain cookie.
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

/**
 * Menyimpan cookie sesi hanya untuk token otentikasi.
 * Catatan penting: data profil (USER_KEY) TIDAK disimpan di cookie untuk mencegah error 431.
 */
function setSessionCookie(name, value) {
  if (typeof window === 'undefined') return;
  const encoded = encodeURIComponent(value);
  const isHttps = window.location.protocol === 'https:';
  const secureFlag = isHttps ? '; Secure' : '';
  const parentDomain = getParentDomain();

  if (parentDomain) {
    document.cookie = `${name}=${encoded}; path=/; domain=${parentDomain}; SameSite=Lax${secureFlag}`;
  } else {
    document.cookie = `${name}=${encoded}; path=/; SameSite=Lax${secureFlag}`;
  }
}

/**
 * Menghapus cookie di semua variasi domain agar benar-benar bersih saat logout.
 */
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

/**
 * Bersihkan cookie USER_KEY lama yang menyebabkan error 431 Request Header Fields Too Large.
 */
function purgeBloatedCookies() {
  if (typeof window === 'undefined') return;
  try {
    removeCookie(USER_KEY);
  } catch (e) {}
}

// Jalankan pembersihan saat modul pertama kali di-load
purgeBloatedCookies();

export const tokenStorage = {
  getToken: () => {
    if (typeof window === 'undefined') return null;
    purgeBloatedCookies();

    // 1. Coba dari sessionStorage
    let token = null;
    try {
      token = sessionStorage.getItem(TOKEN_KEY);
    } catch (e) {}

    // 2. Fallback ke localStorage
    if (!token) {
      try {
        token = localStorage.getItem(TOKEN_KEY);
        if (token) {
          sessionStorage.setItem(TOKEN_KEY, token);
        }
      } catch (e) {}
    }

    // 3. Fallback ke cookie cross-subdomain
    if (!token) {
      token = getCookie(TOKEN_KEY);
      if (token) {
        try {
          sessionStorage.setItem(TOKEN_KEY, token);
          localStorage.setItem(TOKEN_KEY, token);
        } catch (e) {}
      }
    }

    return token;
  },

  setToken: (token) => {
    if (typeof window !== 'undefined') {
      purgeBloatedCookies();
      try {
        sessionStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(TOKEN_KEY, token);
        sessionStorage.setItem(SESSION_ACTIVE_KEY, '1');
        sessionStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
      } catch (e) {}
      setSessionCookie(TOKEN_KEY, token);
    }
  },

  getUser: () => {
    if (typeof window === 'undefined') return null;
    purgeBloatedCookies();

    let data = null;
    try {
      data = sessionStorage.getItem(USER_KEY);
    } catch (e) {}

    if (!data) {
      try {
        data = localStorage.getItem(USER_KEY);
        if (data) {
          sessionStorage.setItem(USER_KEY, data);
        }
      } catch (e) {}
    }

    if (!data) return null;

    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  },

  setUser: (user) => {
    if (typeof window !== 'undefined') {
      purgeBloatedCookies();
      const userStr = JSON.stringify(user);
      try {
        sessionStorage.setItem(USER_KEY, userStr);
        localStorage.setItem(USER_KEY, userStr);
        sessionStorage.setItem(SESSION_ACTIVE_KEY, '1');
        sessionStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
      } catch (e) {}
      // PENTING: JANGAN simpan profil user ke document.cookie (mencegah error 431)
      removeCookie(USER_KEY);
    }
  },

  clear: () => {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem(TOKEN_KEY);
        sessionStorage.removeItem(USER_KEY);
        sessionStorage.removeItem(SESSION_ACTIVE_KEY);
        sessionStorage.removeItem(LAST_ACTIVITY_KEY);
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        localStorage.removeItem(SESSION_ACTIVE_KEY);
        localStorage.removeItem(LAST_ACTIVITY_KEY);
      } catch (e) {}
      removeCookie(TOKEN_KEY);
      removeCookie(USER_KEY);
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
      purgeBloatedCookies();
      let token = null;
      try {
        token = sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
      } catch (e) {}

      if (token && !getCookie(TOKEN_KEY)) {
        setSessionCookie(TOKEN_KEY, token);
      }
    }
  },
};
