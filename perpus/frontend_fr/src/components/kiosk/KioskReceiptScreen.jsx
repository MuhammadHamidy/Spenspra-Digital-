'use client';

import React from 'react';
import AppIcon from '@/components/AppIcon';

export default function PerpusReceiptScreen({
  lastTransaction,
  countdown,
  handleFullResetToAttendance,
}) {
  return (
    <div className="w-full max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center py-4">
      {/* Left Column: 3D Book Checkmark Illustration & Gratitude */}
      <div className="lg:col-span-6 flex flex-col items-center text-center space-y-4">
        {/* Book Illustration with Floating Checkmark */}
        <div className="relative w-44 h-44 sm:w-52 sm:h-52 rounded-3xl bg-gradient-to-br from-blue-50 to-indigo-50/70 border border-blue-100 flex items-center justify-center shadow-lg my-2">
          <div className="w-24 h-24 rounded-2xl bg-white shadow-md border border-slate-100 flex items-center justify-center">
            <AppIcon name="course" color="blue" size={44} />
          </div>
          <div className="absolute -bottom-2 -right-2 w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg border-2 border-white animate-bounce">
            <AppIcon name="tick" color="white" size={22} />
          </div>
        </div>

        {/* Green Pill Badge */}
        <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-black tracking-wider uppercase">
          TRANSAKSI BERHASIL
        </div>

        {/* Heading & Gratitude Text */}
        <h2 className="text-3xl sm:text-4xl font-black text-[#0A1931] tracking-tight">
          Terima Kasih!
        </h2>
        <p className="text-sm text-slate-500 max-w-sm leading-relaxed">
          Proses {lastTransaction.type === 'PINJAM' ? 'peminjaman' : 'pengembalian'} buku Anda telah berhasil dicatat ke dalam sistem perpustakaan.
        </p>
      </div>

      {/* Right Column: Ringkasan Transaksi Card */}
      <div className="lg:col-span-6 bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm space-y-5">
        {/* Card Header with Checkmark Circle */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="font-black text-sm text-[#0084FF] uppercase tracking-wider">
            RINGKASAN TRANSAKSI
          </h3>
          <div className="w-6 h-6 rounded-full bg-[#0084FF]/10 text-[#0084FF] flex items-center justify-center">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        {/* 2x2 Grid Info Boxes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Box 1: Nama Siswa */}
          <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-600 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">NAMA SISWA</p>
              <p className="text-sm font-black text-[#0A1931] truncate mt-0.5">
                {lastTransaction.studentName}
              </p>
            </div>
          </div>

          {/* Box 2: Judul Buku */}
          <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-600 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">JUDUL BUKU</p>
              <p className="text-sm font-black text-[#0A1931] line-clamp-2 mt-0.5 leading-snug">
                {lastTransaction.bookTitle}
              </p>
            </div>
          </div>

          {/* Box 3: Tanggal Pinjam */}
          <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-600 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">TANGGAL PINJAM</p>
              <p className="text-sm font-black text-[#0A1931] mt-0.5">
                {lastTransaction.borrowDate}
              </p>
            </div>
          </div>

          {/* Box 4: Tenggat Pengembalian */}
          <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#0084FF] text-white flex items-center justify-center flex-shrink-0 shadow-xs">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">TENGGAT PENGEMBALIAN</p>
              <p className="text-sm font-black text-[#0084FF] mt-0.5">
                {lastTransaction.dueDate}
              </p>
            </div>
          </div>
        </div>

        {/* Transaction ID Monospace Bar */}
        <div className="bg-slate-100/90 rounded-xl py-2.5 px-4 text-center">
          <span className="text-xs font-mono font-bold text-slate-500 tracking-wider">
            ID TRANSAKSI: {lastTransaction.transactionId}
          </span>
        </div>

        {/* Action Button: SELESAI & KEMBALI KE AWAL */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={handleFullResetToAttendance}
            className="w-full py-3.5 px-5 rounded-2xl bg-[#0084FF] hover:bg-[#0070DE] text-white font-black text-sm sm:text-base shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2 group cursor-pointer"
          >
            <span>SELESAI &amp; KEMBALI KE AWAL</span>
            <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>

          {/* Guidance Note */}
          <p className="text-center text-[11px] font-semibold text-slate-400">
            Tekan tombol di atas jika sudah selesai
          </p>
        </div>
      </div>
    </div>
  );
}
