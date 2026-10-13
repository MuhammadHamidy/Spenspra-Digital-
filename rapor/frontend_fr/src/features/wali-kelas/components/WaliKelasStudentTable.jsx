import React, { useState, useEffect } from 'react';
import Pagination from '@/components/Pagination';
import StatusBadge from '@/components/StatusBadge';
import { getOrderedRaporSubjects } from '@/lib/raporSubjectConfig';

export const getDynamicSubjectColumns = () => {
  const subjects = getOrderedRaporSubjects().filter((s) => !s.isMulokHeader);
  return subjects.map((s) => ({
    code: s.code,
    name: s.code,
    fullName: s.name,
  }));
};

export const SUBJECT_COLUMNS = [
  { code: 'PAI', name: 'PAI' },
  { code: 'PP', name: 'Pancasila' },
  { code: 'BI', name: 'B. Indo' },
  { code: 'MAT', name: 'MTK' },
  { code: 'IPA', name: 'IPA' },
  { code: 'IPS', name: 'IPS' },
  { code: 'BIG', name: 'B. Inggris' },
  { code: 'PJOK', name: 'PJOK' },
  { code: 'INF', name: 'Informatika' },
  { code: 'SBP', name: 'Seni Budaya' },
  { code: 'BJ', name: 'B. Jawa' },
  { code: 'BTQ', name: 'BTQ' },
];

export default function WaliKelasStudentTable({
  isLoading,
  selectedClass,
  searchQuery,
  setSearchQuery,
  paginatedStudents = [],
  filteredStudentsCount = 0,
  currentPage = 1,
  pageSize = 10,
  setCurrentPage,
  setPageSize,
  onSelectStudentForReport,
  kkm = 75,
}) {
  const [columns, setColumns] = useState(() => getDynamicSubjectColumns());

  useEffect(() => {
    const handleUpdate = () => {
      setColumns(getDynamicSubjectColumns());
    };
    handleUpdate();
    window.addEventListener('rapor-subject-order-changed', handleUpdate);
    return () => window.removeEventListener('rapor-subject-order-changed', handleUpdate);
  }, []);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Rekap Nilai Siswa Semua Mata Pelajaran</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            10 Mapel Inti & 2 Muatan Lokal. Geser horizontal untuk melihat seluruh mata pelajaran.
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <input
            type="text"
            placeholder="Cari nama atau NISN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-[#1E4DBD] outline-hidden"
          />
          <svg className="w-4 h-4 text-slate-400 absolute left-2.5 top-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      <div className="overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-blue-200">
        <table className="min-w-[1450px] w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold text-[10px] tracking-wider">
            <tr>
              <th className="py-3 px-3 text-center w-10">No</th>
              <th className="py-3 px-3 min-w-[95px]">NISN</th>
              <th className="py-3 px-3 min-w-[190px]">Nama Lengkap</th>
              {columns.map((col) => (
                <th key={col.code} className="py-3 px-2 text-center min-w-[70px]" title={col.fullName || col.name}>
                  {col.name}
                </th>
              ))}
              <th className="py-3 px-3 text-center bg-[#EFF4FE] text-[#193D9B] min-w-[65px]">Rata2</th>
              <th className="py-3 px-3 text-center min-w-[100px]">Status Nilai</th>
              <th className="py-3 px-3 text-center min-w-[110px]">Kehadiran (S/I/A)</th>
              <th className="py-3 px-3 text-center min-w-[55px]">Rank</th>
              <th className="py-3 px-3 text-center min-w-[110px] print:hidden">Aksi Rapor Siswa</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {isLoading ? (
              <tr>
                <td colSpan={8 + columns.length} className="py-12 text-center text-slate-400">
                  <span className="inline-block animate-spin mr-2">◷</span>
                  Memuat data nilai seluruh mata pelajaran dari e-Rapor...
                </td>
              </tr>
            ) : filteredStudentsCount === 0 ? (
              <tr>
                <td colSpan={8 + columns.length} className="py-12 text-center text-slate-400">
                  Tidak ada data siswa untuk kelas {selectedClass}.
                </td>
              </tr>
            ) : (
              paginatedStudents.map((s, idx) => {
                const itemIndex = (currentPage - 1) * pageSize + idx + 1;
                const scoreCount = Object.keys(s.scores || {}).length;
                return (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-2 text-center font-semibold text-slate-500">{itemIndex}</td>
                    <td className="py-2.5 px-2 font-mono text-[11px] text-slate-600">{s.nisn}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">{s.name}</td>
                    {columns.map((col) => {
                      const score = s.scores[col.code];
                      const hasScore = typeof score === 'number';
                      const isPassing = hasScore && score >= kkm;
                      return (
                        <td
                          key={col.code}
                          className={`py-2.5 px-1 text-center font-semibold ${
                            !hasScore
                              ? 'text-slate-300 italic'
                              : isPassing
                              ? 'text-slate-800'
                              : 'text-[#DC2626] font-bold bg-[#FEE2E2]/30'
                          }`}
                        >
                          {hasScore ? score : '-'}
                        </td>
                      );
                    })}
                    <td className="py-2.5 px-2 text-center font-extrabold bg-[#EFF4FE]/50 text-[#193D9B]">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-bold ${
                        s.avgScore >= 85
                          ? 'bg-[#DCFCE7] text-[#15803D]'
                          : s.avgScore >= kkm
                          ? 'bg-[#EFF4FE] text-[#1E4DBD]'
                          : 'bg-[#FEE2E2] text-[#DC2626]'
                      }`}>
                        {s.avgScore}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <StatusBadge
                        status={scoreCount >= 12 ? 'LENGKAP' : 'BELUM_LENGKAP'}
                        label={scoreCount >= 12 ? 'Lengkap' : `${scoreCount}/12 Mapel`}
                      />
                    </td>
                    <td className="py-2.5 px-2 text-center text-[10px] font-mono text-slate-600">
                      <span title="Sakit">S:{s.attendance?.sakit ?? 0}</span> |{' '}
                      <span title="Izin">I:{s.attendance?.izin ?? 0}</span> |{' '}
                      <span title="Alfa" className={s.attendance?.alfa > 0 ? 'text-[#DC2626] font-bold' : ''}>A:{s.attendance?.alfa ?? 0}</span>
                    </td>
                    <td className="py-2.5 px-2 text-center font-bold text-slate-700">
                      {s.rank === 1 ? '🥇 1' : s.rank === 2 ? '🥈 2' : s.rank === 3 ? '🥉 3' : s.rank}
                    </td>
                    <td className="py-2.5 px-3 text-center print:hidden">
                      <button
                        type="button"
                        onClick={() => onSelectStudentForReport(s)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#193D9B] hover:bg-[#1E4DBD] text-white text-[11px] font-bold shadow-xs transition cursor-pointer"
                        title="Lihat & cetak Rapor Sisipan PDF resmi untuk siswa ini"
                      >
                        <span>📄</span> Cetak Rapor (PDF)
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Paginasi Siswa Wali Kelas */}
      <Pagination
        currentPage={currentPage}
        totalItems={filteredStudentsCount}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={(newSize) => {
          setPageSize(newSize);
          setCurrentPage(1);
        }}
        pageSizeOptions={[10, 20, 32]}
        itemLabel="siswa"
      />
    </section>
  );
}
