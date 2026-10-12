'use client';

import React, { useState } from 'react';
import Modal from '@/components/Modal';
import { gradeApi } from '@/lib/gradeApi';

export default function BackupRestorePage() {
  // Backup state
  const [isExporting, setIsExporting] = useState(false);
  const [backupSuccess, setBackupSuccess] = useState(null);
  const [backupError, setBackupError] = useState(null);

  // Restore state
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePayload, setFilePayload] = useState(null);
  const [parseError, setParseError] = useState(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreSuccess, setRestoreSuccess] = useState(null);
  const [restoreError, setRestoreError] = useState(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  // Handle Export Backup
  const handleExportBackup = async () => {
    setIsExporting(true);
    setBackupSuccess(null);
    setBackupError(null);

    try {
      const res = await gradeApi.exportBackup();
      if (!res.success || !res.data) {
        throw new Error(res.message || 'Gagal mengekspor data backup dari server.');
      }

      const backupData = res.data;
      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);

      const now = new Date();
      const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
        now.getDate()
      ).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(
        now.getMinutes()
      ).padStart(2, '0')}`;
      const fileName = `backup_rapor_spenspra_${timestamp}.json`;

      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setBackupSuccess({
        fileName,
        timestamp: new Date().toLocaleString('id-ID'),
        gradesCount: backupData.grades?.length || 0,
        locksCount: backupData.grade_locks?.length || 0,
        logsCount: backupData.grade_change_logs?.length || 0,
        endorsementsCount: backupData.report_endorsements?.length || 0,
      });
    } catch (err) {
      console.error('Backup error:', err);
      setBackupError(err.message || 'Terjadi kesalahan saat mengekspor backup.');
    } finally {
      setIsExporting(false);
    }
  };

  // Handle File Selection for Restore
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    setParseError(null);
    setRestoreSuccess(null);
    setRestoreError(null);
    setSelectedFile(file || null);
    setFilePayload(null);

    if (!file) return;

    if (!file.name.endsWith('.json')) {
      setParseError('Format file harus berupa file JSON (.json) yang sah.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const parsed = JSON.parse(text);

        // Validasi struktur dasar
        if (
          !parsed ||
          (!Array.isArray(parsed.grades) &&
            !Array.isArray(parsed.grade_locks) &&
            !Array.isArray(parsed.grade_change_logs) &&
            !Array.isArray(parsed.report_endorsements))
        ) {
          throw new Error('Format file tidak sesuai dengan skema cadangan e-Rapor Spenspra.');
        }

        setFilePayload(parsed);
      } catch (err) {
        setParseError(`File tidak dapat dibaca atau korup: ${err.message}`);
        setFilePayload(null);
      }
    };
    reader.readAsText(file);
  };

  // Handle Execute Restore
  const handleExecuteRestore = async () => {
    if (!filePayload) return;

    setIsRestoring(true);
    setRestoreError(null);
    setRestoreSuccess(null);

    try {
      const res = await gradeApi.restoreBackup(filePayload);
      if (!res.success) {
        throw new Error(res.message || 'Server menolak pemulihan data.');
      }

      setRestoreSuccess(res.data || { message: 'Data berhasil dipulihkan.' });
      setIsConfirmModalOpen(false);
      setSelectedFile(null);
      setFilePayload(null);
    } catch (err) {
      console.error('Restore error:', err);
      setRestoreError(err.message || 'Gagal memulihkan basis data.');
      setIsConfirmModalOpen(false);
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 border-l-4 border-l-[#193D9B] rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-[#193D9B] border border-blue-200 uppercase tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-[#193D9B]"></span>
              Administrator & Tim IT
            </span>
            <span className="text-slate-500 text-xs font-medium">• SMP Negeri 1 Prambon</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Backup & Restore Basis Data e-Rapor</h1>
          <p className="text-slate-500 text-xs mt-1 max-w-2xl leading-relaxed">
            Pencadangan snapshot lengkap nilai siswa, status penguncian, audit trail perubahan, dan
            pengesahan tanda tangan kepala sekolah untuk keamanan serta pemulihan sistem.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-2 bg-slate-50 rounded-lg border border-slate-200 text-center">
            <div className="text-[10px] text-slate-500 font-medium">Integritas Data</div>
            <div className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5 justify-center mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Sistem Aktif
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Backup Card vs Restore Card */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CARD 1: EXPORT / BACKUP */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Unduh Snapshot Backup</h2>
              <p className="text-xs text-slate-500">Buat cadangan data e-Rapor instan dalam file JSON</p>
            </div>
          </div>

          <div className="p-6 space-y-5 flex-1 flex flex-col justify-between">
            <div className="space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Snapshot ini merangkum seluruh entitas esensial e-Rapor yang dapat disimpan secara offline
                atau dipindahkan ke server cadangan:
              </p>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 flex items-start gap-2.5">
                  <span className="text-blue-600 font-bold">✓</span>
                  <div>
                    <span className="font-semibold text-slate-800 block">Nilai Siswa (Grades)</span>
                    <span className="text-[11px] text-slate-500">Nilai PTS, PAS, Harian & Kategori</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 flex items-start gap-2.5">
                  <span className="text-blue-600 font-bold">✓</span>
                  <div>
                    <span className="font-semibold text-slate-800 block">Kunci Nilai (Locks)</span>
                    <span className="text-[11px] text-slate-500">Status finalisasi per mapel & kelas</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 flex items-start gap-2.5">
                  <span className="text-blue-600 font-bold">✓</span>
                  <div>
                    <span className="font-semibold text-slate-800 block">Log Audit Perubahan</span>
                    <span className="text-[11px] text-slate-500">Rekam jejak nilai lama, baru & alasan</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 flex items-start gap-2.5">
                  <span className="text-blue-600 font-bold">✓</span>
                  <div>
                    <span className="font-semibold text-slate-800 block">Pengesahan Kepala Sekolah</span>
                    <span className="text-[11px] text-slate-500">Tanda tangan digital & persetujuan</span>
                  </div>
                </div>
              </div>

              {backupSuccess && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs space-y-1.5 animate-fadeIn">
                  <div className="font-bold flex items-center gap-1.5 text-emerald-700">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    Snapshot Berhasil Dibuat & Diunduh!
                  </div>
                  <div className="text-[11px] text-emerald-600">
                    File: <code className="font-mono bg-white px-1 py-0.5 rounded border border-emerald-200">{backupSuccess.fileName}</code>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[11px] pt-1 border-t border-emerald-200/60 text-emerald-700 font-medium">
                    <span>• {backupSuccess.gradesCount} Catatan Nilai</span>
                    <span>• {backupSuccess.locksCount} Kunci Nilai</span>
                    <span>• {backupSuccess.logsCount} Log Perubahan</span>
                    <span>• {backupSuccess.endorsementsCount} Pengesahan Kepsek</span>
                  </div>
                </div>
              )}

              {backupError && (
                <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                  <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{backupError}</span>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={handleExportBackup}
                disabled={isExporting}
                className="w-full py-2.5 px-4 rounded-lg bg-[#193D9B] hover:bg-[#153280] text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isExporting ? (
                  <>
                    <svg className="w-4 h-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                    </svg>
                    <span>Mengekstrak Snapshot Data...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span>Buat & Unduh Snapshot Sekarang (.json)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* CARD 2: IMPORT / RESTORE */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Pulihkan Data (Restore)</h2>
              <p className="text-xs text-slate-500">Impor dan sinkronisasi kembali file snapshot JSON</p>
            </div>
          </div>

          <div className="p-6 space-y-5 flex-1 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-lg text-amber-800 text-xs flex items-start gap-2.5">
                <svg className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="space-y-1">
                  <span className="font-bold block text-amber-900">Perhatian Sebelum Memulihkan:</span>
                  <span className="text-[11px] leading-relaxed block text-amber-800">
                    Proses restore akan memperbarui atau memasukkan kembali record dari snapshot. Gunakan
                    hanya file resmi yang dihasilkan oleh modul backup e-Rapor Spenspra.
                  </span>
                </div>
              </div>

              {/* Upload Dropzone */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Pilih File Snapshot Cadangan (.json)
                </label>
                <div className="relative border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-4 transition-colors text-center bg-slate-50 hover:bg-blue-50/30">
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center justify-center space-y-1">
                    <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-xs font-medium text-slate-700">
                      {selectedFile ? selectedFile.name : 'Klik atau seret file JSON ke sini'}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : 'Maksimal ukuran file 15 MB'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Parsed Payload Preview */}
              {filePayload && (
                <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-lg text-xs space-y-2">
                  <div className="flex items-center justify-between text-blue-900 font-bold">
                    <span>Validasi Snapshot Berhasil:</span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-blue-200 text-blue-800">
                      Versi {filePayload.version || '1.0'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-blue-800">
                    <div className="p-1.5 bg-white/70 rounded border border-blue-100">
                      Nilai Siswa: <b>{filePayload.grades?.length || 0} entri</b>
                    </div>
                    <div className="p-1.5 bg-white/70 rounded border border-blue-100">
                      Kunci Nilai: <b>{filePayload.grade_locks?.length || 0} entri</b>
                    </div>
                    <div className="p-1.5 bg-white/70 rounded border border-blue-100">
                      Log Perubahan: <b>{filePayload.grade_change_logs?.length || 0} entri</b>
                    </div>
                    <div className="p-1.5 bg-white/70 rounded border border-blue-100">
                      Pengesahan: <b>{filePayload.report_endorsements?.length || 0} entri</b>
                    </div>
                  </div>
                  {filePayload.exported_at && (
                    <div className="text-[10px] text-blue-600">
                      Waktu Pembuatan Snapshot: {new Date(filePayload.exported_at).toLocaleString('id-ID')}
                    </div>
                  )}
                </div>
              )}

              {parseError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{parseError}</span>
                </div>
              )}

              {restoreSuccess && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs space-y-1 animate-fadeIn">
                  <div className="font-bold flex items-center gap-1 text-emerald-700">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    Pemulihan Data Selesai Berhasil!
                  </div>
                  <div className="text-[11px] text-emerald-600">
                    {restoreSuccess.message || 'Basis data telah disinkronkan kembali dengan snapshot cadangan.'}
                  </div>
                </div>
              )}

              {restoreError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{restoreError}</span>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(true)}
                disabled={!filePayload || isRestoring}
                className="w-full py-2.5 px-4 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Mulai Proses Pemulihan (Restore)</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Konfirmasi Keamanan Restore */}
      <Modal
        isOpen={isConfirmModalOpen}
        onClose={() => !isRestoring && setIsConfirmModalOpen(false)}
        title="Konfirmasi Pemulihan Data e-Rapor"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-xs">
            <svg className="w-5 h-5 shrink-0 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="leading-relaxed">
              Tindakan ini akan menimpa dan memutakhirkan entitas rapor yang ada dengan data dari file snapshot. Pastikan Anda telah melakukan backup data terbaru sebelumnya.
            </p>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1 text-slate-700">
            <div className="font-semibold text-slate-900 mb-1">Rincian Data yang Akan Dipulihkan:</div>
            <div>• Nilai Siswa: <b>{filePayload?.grades?.length || 0} data</b></div>
            <div>• Kunci Nilai: <b>{filePayload?.grade_locks?.length || 0} data</b></div>
            <div>• Log Perubahan: <b>{filePayload?.grade_change_logs?.length || 0} data</b></div>
            <div>• Pengesahan Rapor: <b>{filePayload?.report_endorsements?.length || 0} data</b></div>
          </div>

          <p className="text-xs text-slate-600">
            Ketik tombol <b>"Lanjutkan Pemulihan"</b> di bawah untuk mengonfirmasi operasi ini.
          </p>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              disabled={isRestoring}
              onClick={() => setIsConfirmModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium cursor-pointer transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={isRestoring}
              onClick={handleExecuteRestore}
              className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              {isRestoring ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                  </svg>
                  <span>Memulihkan Data...</span>
                </>
              ) : (
                <span>Lanjutkan Pemulihan</span>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
