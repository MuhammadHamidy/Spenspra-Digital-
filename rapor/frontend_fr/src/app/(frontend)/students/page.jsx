'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Button from '@/components/Button';
import Modal from '@/components/Modal';
import { accountApiAdapter } from '@/lib/features/auth/infrastructure/accountApiAdapter';
import Pagination from '@/components/Pagination';

export default function StudentsDirectoryPage() {
  const [students, setStudents] = useState([]);
  const [selectedClass, setSelectedClass] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selectedStudentForModal, setSelectedStudentForModal] = useState(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    let cancelled = false;

    accountApiAdapter.getStudents().then((accounts) => {
      if (cancelled || !Array.isArray(accounts) || accounts.length === 0) return;

      const importedStudents = accounts
        .filter((account) => account.role_name === 'SISWA' || account.roleName === 'SISWA' || account.role_id === 'role-siswa')
        .map((account) => ({
          id: account.id,
          name: account.full_name || account.fullName || account.name || '-',
          nisn: account.nisn || account.nim_nip || '',
          className: account.class_name || account.className || '-',
          gender: account.gender === 'P' ? 'Perempuan' : 'Laki-laki',
          email: account.email || '-',
          phone: account.phone || '-',
          status: 'ACTIVE',
        }));

      if (importedStudents.length > 0) setStudents(importedStudents);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const classOptions = useMemo(
    () => ['ALL', ...new Set(students.map((student) => student.className).filter(Boolean))],
    [students]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedClass, search]);

  const filtered = useMemo(() => {
    return students.filter((s) => {
      const matchClass = selectedClass === 'ALL' || s.className === selectedClass;
      const matchSearch =
        !search ||
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.nisn.includes(search);
      return matchClass && matchSearch;
    });
  }, [students, selectedClass, search]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 pb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Direktori Data Pokok Siswa
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftar peserta didik resmi SMP Negeri 1 Prambon terhubung dengan master identitas SSO.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
            <span className="w-2 h-2 rounded-full bg-blue-600" />
            Total: {students.length} Siswa Terdaftar
          </span>
        </div>
      </div>

      {/* Filter Controls Toolbar */}
      <div className="bg-white border border-slate-200/90 p-4 rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-slate-500 mr-1">Rombel:</span>
          {classOptions.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setSelectedClass(c)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                selectedClass === c
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {c === 'ALL' ? 'Semua Rombel' : `Kelas ${c}`}
            </button>
          ))}
        </div>

        <div className="w-full sm:w-72">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Cari nama siswa atau NISN..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Tabel Data Siswa */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">No</th>
                <th className="py-3.5 px-4">Nama Siswa</th>
                <th className="py-3.5 px-4">NISN</th>
                <th className="py-3.5 px-4">Rombel Kelas</th>
                <th className="py-3.5 px-4">Jenis Kelamin</th>
                <th className="py-3.5 px-4">Status Akun</th>
                <th className="py-3.5 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {paginated.map((student, idx) => {
                const itemNo = (currentPage - 1) * pageSize + idx + 1;
                return (
                  <tr key={student.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 text-slate-400 font-mono">{itemNo}</td>
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900">{student.name}</p>
                      <p className="text-[11px] text-slate-400">{student.email}</p>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-800">
                      {student.nisn || '-'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-block px-2.5 py-0.5 rounded-md font-bold text-[11px] bg-blue-50 text-blue-700 border border-blue-200">
                        {student.className}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {student.gender}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        ● Aktif (SSO)
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => setSelectedStudentForModal(student)}
                        className="px-3 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-[11px] transition-all cursor-pointer"
                      >
                        Detail
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                    Tidak ada data siswa yang sesuai dengan kriteria filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Paginasi Siswa */}
          <Pagination
            currentPage={currentPage}
            totalItems={filtered.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
            pageSizeOptions={[10, 20, 50]}
            itemLabel="siswa"
          />
        </div>
      </div>

      {/* Modal Detail Profil Siswa */}
      <Modal
        isOpen={Boolean(selectedStudentForModal)}
        onClose={() => setSelectedStudentForModal(null)}
        title="Detail Data Peserta Didik"
        footerActions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setSelectedStudentForModal(null)}
          >
            Tutup
          </Button>
        }
      >
        {selectedStudentForModal && (
          <div className="space-y-4 text-xs">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm">
                {selectedStudentForModal.name.charAt(0)}
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">{selectedStudentForModal.name}</h3>
                <p className="text-slate-500">Kelas {selectedStudentForModal.className} • SMP Negeri 1 Prambon</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
              <div>
                <span className="text-slate-400 block text-[11px]">NISN</span>
                <span className="font-mono font-bold text-slate-900">{selectedStudentForModal.nisn || '-'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Rombel</span>
                <span className="font-bold text-blue-700">{selectedStudentForModal.className}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Jenis Kelamin</span>
                <span className="font-semibold text-slate-800">{selectedStudentForModal.gender}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Status</span>
                <span className="font-bold text-emerald-700">Aktif Terdaftar</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Email Sekolah</span>
                <span className="text-slate-700 truncate block">{selectedStudentForModal.email}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">No. Telepon</span>
                <span className="text-slate-700">{selectedStudentForModal.phone}</span>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
