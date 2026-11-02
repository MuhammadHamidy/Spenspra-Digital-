/**
 * Utility untuk membaca Tahun Ajaran, Semester aktif, dan Standar KKM Sekolah dari pengaturan Super Admin.
 * Tersinkronisasi lintas domain (SSO <-> e-Rapor) melalui cookie dan localStorage.
 */
import { httpClient } from '@/lib/common/httpClient';

export function getSchoolAcademicPeriod() {
  let year = null;
  let semester = null;
  let kkm = null;

  if (typeof document !== 'undefined') {
    const matchYear = document.cookie.match(/spenspra_academic_year=([^;]+)/);
    const matchSem = document.cookie.match(/spenspra_academic_semester=([^;]+)/);
    const matchKkm = document.cookie.match(/spenspra_school_kkm=([^;]+)/);

    if (matchYear) year = decodeURIComponent(matchYear[1]);
    if (matchSem) semester = decodeURIComponent(matchSem[1]);
    if (matchKkm) {
      const parsedKkm = Number(decodeURIComponent(matchKkm[1]));
      if (!isNaN(parsedKkm) && parsedKkm > 0) kkm = parsedKkm;
    }
  }

  if (typeof localStorage !== 'undefined') {
    try {
      if (!kkm) {
        const storedKkm = localStorage.getItem('spenspra_school_kkm');
        if (storedKkm) {
          const parsedKkm = Number(storedKkm);
          if (!isNaN(parsedKkm) && parsedKkm > 0) kkm = parsedKkm;
        }
      }

      const stored = localStorage.getItem('spenspra_academic_period');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.year && !year) year = parsed.year;
        if (parsed?.semester && !semester) semester = parsed.semester;
        if (parsed?.kkm && !kkm) {
          const parsedKkm = Number(parsed.kkm);
          if (!isNaN(parsedKkm) && parsedKkm > 0) kkm = parsedKkm;
        }
      }
    } catch (e) {}
  }

  return {
    year: year || '2026/2027',
    semester: (semester || 'GANJIL').toUpperCase(),
    kkm: kkm || 75,
  };
}

export function getSchoolKKM() {
  return getSchoolAcademicPeriod().kkm;
}

export async function syncSchoolAcademicPeriod() {
  const fallback = getSchoolAcademicPeriod();

  try {
    const response = await httpClient.get('/academic-period');
    const serverPeriod = response?.data;
    if (!serverPeriod?.year || !serverPeriod?.semester) {
      return fallback;
    }

    const period = {
      ...fallback,
      ...serverPeriod,
      semester: String(serverPeriod.semester).toUpperCase(),
      kkm: Number(serverPeriod.kkm) > 0 ? Number(serverPeriod.kkm) : fallback.kkm,
    };

    if (typeof window !== 'undefined') {
      localStorage.setItem('spenspra_academic_period', JSON.stringify(period));
      localStorage.setItem('spenspra_school_kkm', String(period.kkm));

      document.cookie = `spenspra_academic_year=${encodeURIComponent(period.year)}; path=/; max-age=31536000; SameSite=Lax`;
      document.cookie = `spenspra_academic_semester=${encodeURIComponent(period.semester)}; path=/; max-age=31536000; SameSite=Lax`;
      document.cookie = `spenspra_school_kkm=${encodeURIComponent(period.kkm)}; path=/; max-age=31536000; SameSite=Lax`;
    }

    return period;
  } catch (error) {
    console.warn('Gagal menyinkronkan periode akademik:', error);
    return fallback;
  }
}
