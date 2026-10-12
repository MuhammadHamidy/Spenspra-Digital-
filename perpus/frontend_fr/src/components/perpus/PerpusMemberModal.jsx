'use client';

import React from 'react';

export default function PerpusMemberModal({
  showMemberModal,
  setShowMemberModal,
  registeredMembers,
  handleSelectRegisteredMember,
}) {
  if (!showMemberModal) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0084FF] flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-extrabold text-base text-[#0A1931]">Pilih Anggota Terdaftar</h3>
              <p className="text-xs text-slate-500">Pilih salah satu akun anggota di database perpustakaan</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowMemberModal(false)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="divide-y divide-slate-100 my-4 max-h-[340px] overflow-y-auto pr-1">
          {registeredMembers.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs font-semibold">
              Memuat data anggota dari server...
            </div>
          ) : (
            registeredMembers.map((m) => (
              <button
                key={m.id || m.member_code}
                type="button"
                onClick={() => handleSelectRegisteredMember(m)}
                className="w-full py-3 px-3 flex items-center justify-between gap-3 text-left hover:bg-blue-50/60 rounded-2xl transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs uppercase group-hover:border-blue-300 group-hover:bg-white transition-colors">
                    {m.full_name?.slice(0, 2) || 'MB'}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-[#0A1931] group-hover:text-[#0084FF] transition-colors">
                      {m.full_name}
                    </h4>
                    <p className="text-[11px] font-mono text-slate-500">
                      NISN: {m.identity_number || m.member_code} • Kelas: {m.class_name || m.address || 'Siswa'}
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-blue-100/70 text-[#0066CC] group-hover:bg-[#0084FF] group-hover:text-white transition-all">
                  Pilih
                </span>
              </button>
            ))
          )}
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={() => setShowMemberModal(false)}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
