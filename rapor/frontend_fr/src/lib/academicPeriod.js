/**
 * Utility untuk membaca Tahun Ajaran & Semester aktif dari pengaturan Super Admin.
 * Tersinkronisasi lintas domain (SSO <-> e-Rapor) melalui cookie dan localStorage.
 */
export function getSchoolAcademicPeriod() {
  let year = null;
  let semester = null;

  if (typeof document !== 'undefined') {
    const matchYear = document.cookie.match(/spenspra_academic_year=([^;]+)/);
    const matchSem = document.cookie.match(/spenspra_academic_semester=([^;]+)/);

    if (matchYear) year = decodeURIComponent(matchYear[1]);
    if (matchSem) semester = decodeURIComponent(matchSem[1]);
  }

  if ((!year || !semester) && typeof localStorage !== 'undefined') {
    try {
      const stored = localStorage.getItem('spenspra_academic_period');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.year) year = parsed.year;
        if (parsed?.semester) semester = parsed.semester;
      }
    } catch (e) {}
  }

  return {
    year: year || '2025/2026',
    semester: (semester || 'GENAP').toUpperCase(),
  };
}
