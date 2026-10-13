/**
 * Utility untuk membaca Tahun Ajaran, Semester aktif, dan Standar KKM Sekolah dari pengaturan Super Admin.
 * Tersinkronisasi lintas domain (SSO <-> e-Rapor) melalui cookie dan localStorage.
 */
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
    year: year || '2025/2026',
    semester: (semester || 'GENAP').toUpperCase(),
    kkm: kkm || 75,
  };
}

export function getSchoolKKM() {
  return getSchoolAcademicPeriod().kkm;
}
