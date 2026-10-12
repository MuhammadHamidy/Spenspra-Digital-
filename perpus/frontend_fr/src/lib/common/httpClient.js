import { API_BASE_URL } from './config';
import { tokenStorage } from './tokenStorage';

export async function httpRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const token = tokenStorage.getToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 401) {
        tokenStorage.clear();
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
          window.location.href = 'http://sso.localhost/login?reason=expired';
        }
      }
      const errorMsg = data?.error?.message || data?.message || `HTTP Error ${response.status}`;
      throw new Error(errorMsg);
    }

    return data;
  } catch (err) {
    const msg = (err && typeof err === 'object' && err.message) ? err.message : (typeof err === 'string' ? err : 'Koneksi ke server backend terputus.');
    console.warn(`[HTTP Client Warning] Request to ${url} failed:`, msg);
    throw new Error(msg);
  }
}

export const httpClient = {
  get: (endpoint, options) => httpRequest(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options) => httpRequest(endpoint, { ...options, method: 'POST', body: JSON.stringify(body) }),
  put: (endpoint, body, options) => httpRequest(endpoint, { ...options, method: 'PUT', body: JSON.stringify(body) }),
  delete: (endpoint, options) => httpRequest(endpoint, { ...options, method: 'DELETE' }),
};
