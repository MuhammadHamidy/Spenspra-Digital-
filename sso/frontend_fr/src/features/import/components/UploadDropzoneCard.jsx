'use client';

import React from 'react';

export default function UploadDropzoneCard({
  activeTab,
  file,
  onFileChange,
  isUploading,
  onUpload,
}) {
  return (
    <div className="md:col-span-2 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
      <div className="flex items-center gap-2.5">
        <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">
          2
        </span>
        <h3 className="text-sm font-bold text-slate-900">
          Unggah Berkas {activeTab === 'students' ? 'Siswa' : 'Guru'} (.xlsx)
        </h3>
      </div>

      <form onSubmit={onUpload} className="space-y-4">
        <label className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/30 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all group block">
          <span className="mb-2 text-xs font-semibold text-slate-700">Berkas Excel {activeTab === 'students' ? 'Siswa' : 'Guru'}</span>
          <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          {file ? (
            <div className="text-center">
              <p className="text-xs font-bold text-blue-700">{file.name}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {(file.size / 1024).toFixed(1)} KB • Klik untuk mengganti berkas
              </p>
            </div>
          ) : (
            <div className="text-center space-y-1">
              <p className="text-xs font-medium text-slate-700">
                Pilih atau seret berkas <span className="text-blue-600 font-semibold">.xlsx</span> ke sini
              </p>
              <p className="text-[11px] text-slate-400">Ukuran maksimal file: 10MB</p>
            </div>
          )}
          <input
            type="file"
            accept=".xlsx"
            onChange={onFileChange}
            className="hidden"
          />
        </label>

        <button
          type="submit"
          disabled={!file || isUploading}
          className={`w-full py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all ${
            !file || isUploading
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer active:scale-[0.99]'
          }`}
        >
          {isUploading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Memvalidasi & Mengimpor Data...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <span>Proses & Simpan ke Basis Data</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
