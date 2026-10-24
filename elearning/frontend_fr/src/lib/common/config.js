export function getApiBaseUrl() {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host.includes('spenspra.com')) return 'https://belajar.spenspra.com/api';
    if (host.includes('spenspra.sch.id')) return 'https://belajar.spenspra.sch.id/api';
    if (!host.includes('localhost') && host !== '127.0.0.1') {
      return `${window.location.origin}/api`;
    }
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';
}

export const API_BASE_URL = typeof window !== 'undefined' ? getApiBaseUrl() : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api');

export const USER_ROLES = {
  ADMIN: 'ADMIN',
  DOSEN: 'DOSEN',
  MAHASISWA: 'MAHASISWA',
};

export const ATTENDANCE_STATUS = {
  HADIR: 'HADIR',
  IZIN: 'IZIN',
  SAKIT: 'SAKIT',
  ALPA: 'ALPA',
};

export const ATTENDANCE_METHOD = {
  FACE_RECOGNITION: 'FACE_RECOGNITION',
  MANUAL: 'MANUAL',
  QR_CODE: 'QR_CODE',
};

export const SESSION_STATUS = {
  UPCOMING: 'UPCOMING',
  OPEN: 'OPEN',
  CLOSED: 'CLOSED',
};
