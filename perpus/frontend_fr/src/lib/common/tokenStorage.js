const TOKEN_KEY = 'perpusdig_auth_token';
const USER_KEY = 'perpusdig_auth_user';
const INSTITUTION_KEY = 'perpusdig_institution_id';
const SESSION_ACTIVE_KEY = 'spenspra_session_active';
const LAST_ACTIVITY_KEY = 'spenspra_last_activity';

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
  const parentDomain = getParentDomain();

  if (parentDomain) {
    document.cookie = `${name}=${encoded}; path=/; domain=${parentDomain}; SameSite=Lax${secureFlag}`;
  } else {
    document.cookie = `${name}=${encoded}; path=/; SameSite=Lax${secureFlag}`;
  }
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

function purgeBloatedCookies() {
  if (typeof window === 'undefined') return;
  try {
    removeCookie(USER_KEY);
  } catch (e) {}
}

purgeBloatedCookies();

function parseJwtUser(token) {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const parsed = JSON.parse(jsonPayload);
    if (!parsed || (!parsed.sub && !parsed.id && !parsed.username)) return null;

    const rawRole = parsed.role_name || parsed.role || parsed.roleId || '';
    let roleName = String(rawRole).toUpperCase();
    if (!roleName) {
      if ((parsed.username || '').toLowerCase().startsWith('siswa_')) {
        roleName = 'SISWA';
      } else {
        roleName = 'SISWA';
      }
    }
    const fullName = parsed.full_name || parsed.fullName || parsed.name || parsed.username || '';
    const className = parsed.class_name || parsed.className || parsed.kelas || (roleName === 'SISWA' ? 'Peserta Didik' : 'Civitas Spenspra');
    const photo = parsed.photo || parsed.photoUrl || parsed.avatar || null;

    return {
      id: parsed.id || parsed.sub,
      username: parsed.username || '',
      fullName: fullName,
      full_name: fullName,
      nama: fullName,
      role: roleName,
      roleName: roleName,
      role_name: roleName,
      peran: roleName,
      kelas_atau_jabatan: className,
      className: className,
      kelas: className,
      foto: photo,
      photoUrl: photo,
      roleId: parsed.role_id || parsed.roleId || '',
      nimNip: parsed.nim_nip || parsed.nimNip || '',
      nim_nip: parsed.nim_nip || parsed.nimNip || '',
    };
  } catch {
    return null;
  }
}

export const tokenStorage = {
  getToken: () => {
    if (typeof window === 'undefined') return null;
    purgeBloatedCookies();

    let token = null;
    try {
      token = sessionStorage.getItem(TOKEN_KEY);
    } catch (e) {}

    if (!token) {
      try {
        token = localStorage.getItem(TOKEN_KEY);
        if (token) {
          sessionStorage.setItem(TOKEN_KEY, token);
        }
      } catch (e) {}
    }

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

    if (data) {
      try {
        const parsed = JSON.parse(data);
        if (parsed && (parsed.id || parsed.username || parsed.fullName || parsed.full_name)) {
          return parsed;
        }
      } catch {
        // Fallback
      }
    }

    // Fallback otomatis: Dekode dari JWT token SSO yang dibagikan via cookie
    const token = tokenStorage.getToken();
    if (token) {
      const userFromJwt = parseJwtUser(token);
      if (userFromJwt) {
        try {
          const userStr = JSON.stringify(userFromJwt);
          sessionStorage.setItem(USER_KEY, userStr);
          localStorage.setItem(USER_KEY, userStr);
        } catch (e) {}
        return userFromJwt;
      }
    }

    return null;
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
      removeCookie(USER_KEY);
    }
  },

  getInstitutionId: () => {
    if (typeof window === 'undefined') return 'smpn1prambon';
    try {
      return sessionStorage.getItem(INSTITUTION_KEY) || localStorage.getItem(INSTITUTION_KEY) || getCookie(INSTITUTION_KEY) || 'smpn1prambon';
    } catch {
      return 'smpn1prambon';
    }
  },

  setInstitutionId: (institutionId) => {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(INSTITUTION_KEY, institutionId);
        localStorage.setItem(INSTITUTION_KEY, institutionId);
      } catch (e) {}
      setSessionCookie(INSTITUTION_KEY, institutionId);
    }
  },

  clear: () => {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem(TOKEN_KEY);
        sessionStorage.removeItem(USER_KEY);
        sessionStorage.removeItem(INSTITUTION_KEY);
        sessionStorage.removeItem(SESSION_ACTIVE_KEY);
        sessionStorage.removeItem(LAST_ACTIVITY_KEY);
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        localStorage.removeItem(INSTITUTION_KEY);
        localStorage.removeItem(SESSION_ACTIVE_KEY);
        localStorage.removeItem(LAST_ACTIVITY_KEY);
      } catch (e) {}
      removeCookie(TOKEN_KEY);
      removeCookie(USER_KEY);
      removeCookie(INSTITUTION_KEY);
      removeCookie('perpusdig_auth_token');
      removeCookie('perpusdig_auth_user');
      removeCookie('perpusdig_institution_id');
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
