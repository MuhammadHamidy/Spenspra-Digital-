'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import Button from '@/components/Button';
import { schoolImportApi } from '@/lib/features/schoolImportApi';
import ImportTabs from '@/features/import/components/ImportTabs';
import TemplateGuideCard from '@/features/import/components/TemplateGuideCard';
import UploadDropzoneCard from '@/features/import/components/UploadDropzoneCard';
import ImportResultBanner from '@/features/import/components/ImportResultBanner';
import ValidationErrorsTable from '@/features/import/components/ValidationErrorsTable';

// Modal lazy loaded
const Modal = dynamic(() => import('@/components/Modal'), { ssr: false });

export default function BulkImportExcelPage() {
  const [activeTab, setActiveTab] = useState('students');
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);
  const [isRollbackModalOpen, setIsRollbackModalOpen] = useState(false);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setFile(null);
    setResult(null);
    setErrorMsg(null);
    setValidationErrors([]);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
      setErrorMsg(null);
      setValidationErrors([]);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      alert('Pilih file Excel (.xlsx) terlebih dahulu');
      return;
    }

    setIsUploading(true);
    setResult(null);
    setErrorMsg(null);
    setValidationErrors([]);

    const res =
      activeTab === 'students'
        ? await schoolImportApi.importStudents(file)
        : await schoolImportApi.importTeachers(file);

    setIsUploading(false);

    if (res.success && res.data && !res.data.failed) {
      setResult(res.data);

      // Simpan kredensial guru yang berhasil di-import ke memori lokal admin
      if (activeTab === 'teachers' && Array.isArray(res.data?.credentials)) {
        try {
          const stored = JSON.parse(localStorage.getItem('spenspra_staff_passwords') || '{}');
          res.data.credentials.forEach((c) => {
            if (c.password) {
              if (c.id) stored[c.id] = c.password;
              if (c.username) stored[c.username] = c.password;
              if (c.nip) stored[c.nip] = c.password;
            }
          });
          localStorage.setItem('spenspra_staff_passwords', JSON.stringify(stored));
        } catch (storageErr) {
          console.warn('Gagal menyimpan kredensial ke cache lokal:', storageErr);
        }
      }
    } else {
      const error = res.error || {};
      const details = error.details || res.data?.errors || [];
      setErrorMsg(error.message || res.message || 'Gagal memproses file Excel.');
      setValidationErrors(Array.isArray(details) ? details : []);
    }
  };

  const handleDownloadTemplate = (type) => {
    window.open(schoolImportApi.getTemplateUrl(type), '_blank');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* 1. Header */}
      <div className="border-b border-slate-200 pb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Import Data Siswa dan Guru
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Unggah berkas Excel untuk menambahkan data ratusan siswa dan guru sekaligus secara otomatis ke sistem.
          </p>
        </div>

        {result && (
          <Button
            variant="danger"
            size="sm"
            onClick={() => setIsRollbackModalOpen(true)}
          >
            Batalkan Impor Terakhir
          </Button>
        )}
      </div>

      {/* 2. Tab Selection */}
      <ImportTabs activeTab={activeTab} onTabChange={handleTabChange} />

      {/* 3. 2-Step Card Workflow */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <TemplateGuideCard
          activeTab={activeTab}
          onDownloadTemplate={handleDownloadTemplate}
        />
        <UploadDropzoneCard
          activeTab={activeTab}
          file={file}
          onFileChange={handleFileChange}
          isUploading={isUploading}
          onUpload={handleUpload}
        />
      </div>

      {/* 4. Notifikasi Hasil Impor */}
      <ImportResultBanner activeTab={activeTab} result={result} />

      {/* 5. Tabel Error Validasi Jika Gagal */}
      <ValidationErrorsTable errorMsg={errorMsg} validationErrors={validationErrors} />

      {/* 6. Modal Konfirmasi Pembatalan (Lazy Loaded) */}
      {isRollbackModalOpen && (
        <Modal
          isOpen={isRollbackModalOpen}
          onClose={() => setIsRollbackModalOpen(false)}
          title="Konfirmasi Pembatalan Impor"
          footer={
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsRollbackModalOpen(false)}
              >
                Tutup
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  setResult(null);
                  setFile(null);
                  setIsRollbackModalOpen(false);
                }}
              >
                Ya, Batalkan Data Ini
              </Button>
            </div>
          }
        >
          <p className="text-xs text-slate-600 leading-relaxed">
            Apakah Anda yakin ingin membatalkan impor terakhir? Tindakan ini akan menghapus data yang baru saja dimasukkan ke dalam sistem.
          </p>
        </Modal>
      )}
    </div>
  );
}
