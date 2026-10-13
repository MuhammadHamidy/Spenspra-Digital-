/**
 * Mengembalikan URL aplikasi (rapor, perpus, sso) secara dinamis
 * berdasarkan hostname browser saat ini agar fleksibel di localhost maupun produksi spenspra.com.
 *
 * @param {string} envVal URL dari environment variable jika ada
 * @param {'sso'|'rapor'|'perpus'} appSubdomain Subdomain target
 * @returns {string}
 */
export function getDynamicAppUrl(envVal, appSubdomain) {
  if (typeof window !== 'undefined') {
    const { hostname, protocol, port } = window.location;
    if (hostname.includes('spenspra.com')) {
      return `${protocol}//${appSubdomain}.spenspra.com`;
    }
    if (hostname.includes('spenspra.sch.id')) {
      return `${protocol}//${appSubdomain}.spenspra.sch.id`;
    }
    if (hostname.includes('localhost') || hostname === '127.0.0.1') {
      const portSuffix = port ? `:${port}` : '';
      return `${protocol}//${appSubdomain}.localhost${portSuffix}`;
    }
    const parts = hostname.split('.');
    if (parts.length >= 2) {
      if (['sso', 'rapor', 'perpus'].includes(parts[0])) {
        parts[0] = appSubdomain;
      } else {
        parts.unshift(appSubdomain);
      }
      return `${protocol}//${parts.join('.')}`;
    }
  }
  return envVal || `https://${appSubdomain}.spenspra.com`;
}
