'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState('alur');

  const sections = [
    { id: 'alur', title: '1. Alur Sistem SSO', icon: '🔄' },
    { id: 'guru', title: '2. Panduan Guru & GTK', icon: '👨‍🏫' },
    { id: 'siswa', title: '3. Siswa & Kartu Barcode', icon: '💳' },
    { id: 'admin', title: '4. Panduan Super Admin', icon: '⚙️' },
    { id: 'kepsek', title: '5. Panduan Kepala Sekolah', icon: '🎓' },
    { id: 'faq', title: '6. Kendala & Tanya Jawab', icon: '❓' },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* ──────────────────────────────────────────────────────── */}
      {/* HEADER UTAMA */}
      {/* ──────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-xs font-bold text-blue-700">
              <span>📖</span>
              <span>Buku Panduan Pengguna (User Manual)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Panduan Operasional & Alur Sistem SSO
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
              Petunjuk komprehensif cara pakai ekosistem Single Sign-On (SSO) SMP Negeri 1 Prambon, 
              mencakup autentikasi akun terpadu, integrasi e-Rapor, perpustakaan digital, serta kartu barcode civitas sekolah.
            </p>
          </div>

          <div className="flex sm:flex-col items-center justify-center gap-2 shrink-0 bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <Image
              src="/image/new_logo_prambon.png"
              alt="Logo SMPN 1 Prambon"
              width={56}
              height={56}
              className="h-14 w-auto object-contain"
              priority
            />
            <div className="text-center">
              <span className="block text-[11px] font-black text-slate-800">SMPN 1 PRAMBON</span>
              <span className="block text-[9px] font-semibold text-slate-400">Digital Ecosystem</span>
            </div>
          </div>
        </div>

        {/* TAB NAVIGASI CEPAT */}
        <div className="mt-8 flex flex-wrap gap-2 border-t border-slate-100 pt-5">
          {sections.map((sec) => (
            <button
              key={sec.id}
              type="button"
              onClick={() => setActiveSection(sec.id)}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition cursor-pointer ${
                activeSection === sec.id
                  ? 'bg-[#193D9B] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
              }`}
            >
              <span>{sec.icon}</span>
              <span>{sec.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────── */}
      {/* SECTION 1: ALUR SISTEM TERPADU SSO */}
      {/* ──────────────────────────────────────────────────────── */}
      {activeSection === 'alur' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <span>🔄</span> Alur Kerja Ekosistem Single Sign-On (SSO)
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Prinsip kerja autentikasi terpusat: 1 akun dan 1 kali login untuk semua aplikasi sekolah.
              </p>
            </div>

            {/* FLOW STEPS VISUAL */}
            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 space-y-2 relative">
                <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                  1
                </div>
                <h3 className="font-bold text-slate-900 text-sm">Masuk Portal SSO</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Pengguna (Guru / Admin / Siswa) membuka portal utama SSO dan memasukkan Username serta Password akun.
                </p>
              </div>

              <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 space-y-2 relative">
                <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                  2
                </div>
                <h3 className="font-bold text-slate-900 text-sm">Validasi & Token Sesi</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Server SSO memvalidasi kredensial dan menerbitkan cookie sesi terenkripsi yang berlaku di semua subdomain sekolah.
                </p>
              </div>

              <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 space-y-2 relative">
                <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                  3
                </div>
                <h3 className="font-bold text-slate-900 text-sm">Akses Multi-Aplikasi</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Pengguna bebas membuka aplikasi e-Rapor, Perpustakaan, atau Absensi tanpa perlu memasukkan password lagi.
                </p>
              </div>

              <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4 space-y-2 relative">
                <div className="w-7 h-7 rounded-lg bg-amber-600 text-white flex items-center justify-center font-bold text-xs">
                  4
                </div>
                <h3 className="font-bold text-slate-900 text-sm">Sinkronisasi Data</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Perubahan profil, kata sandi, atau rombel di Data Master otomatis tersinkron ke semua subsistem terkait.
                </p>
              </div>
            </div>

            {/* DIAGRAM LAYANAN */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 space-y-4">
              <h3 className="text-sm font-bold text-slate-900">
                Peta Aplikasi dalam Ekosistem Spenspra:
              </h3>
              <div className="grid gap-3 sm:grid-cols-3 text-xs">
                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1.5 shadow-2xs">
                  <span className="font-bold text-blue-700 flex items-center gap-1.5">
                    <span>🔐</span> Portal Utama SSO
                  </span>
                  <p className="text-slate-600">Pusat autentikasi, manajemen data civitas, dan kartu identitas barcode.</p>
                  <span className="inline-block font-mono text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                    Port :3000 / sso.domain
                  </span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1.5 shadow-2xs">
                  <span className="font-bold text-emerald-700 flex items-center gap-1.5">
                    <span>📊</span> Sistem e-Rapor
                  </span>
                  <p className="text-slate-600">Pengelolaan nilai rapor, capaian kompetensi, rombel, dan cetak lembar rapor.</p>
                  <span className="inline-block font-mono text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                    Port :3001 / rapor.domain
                  </span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1.5 shadow-2xs">
                  <span className="font-bold text-purple-700 flex items-center gap-1.5">
                    <span>📚</span> Perpustakaan Digital
                  </span>
                  <p className="text-slate-600">Katalog buku, transaksi sirkulasi peminjaman, dan scan barcode kartu siswa.</p>
                  <span className="inline-block font-mono text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                    Port :3002 / perpus.domain
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────── */}
      {/* SECTION 2: PANDUAN GURU & GTK */}
      {/* ──────────────────────────────────────────────────────── */}
      {activeSection === 'guru' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <span>👨‍🏫</span> Panduan Penggunaan untuk Guru & Tenaga Kependidikan
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Langkah-langkah login, mengelola akun, dan mengakses portal e-Rapor.
              </p>
            </div>

            <div className="space-y-5 text-xs text-slate-700">
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-2">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>1.</span> Cara Mendapatkan Akun Login
                </h3>
                <p className="leading-relaxed">
                  Data master guru secara otomatis menjadi akun login SSO Anda. Kredensial akun terdiri dari:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-600">
                  <li><strong>Username:</strong> Nomor Induk Pegawai (NIP) Anda. Jika tidak memiliki NIP, username dibuat dari nama Anda (contoh: <code className="bg-slate-200 px-1 rounded text-blue-700 font-mono">etik_masrufah</code>).</li>
                  <li><strong>Password:</strong> Ditentukan langsung oleh Admin Sekolah atau default sesuai NIP/Username Anda.</li>
                  <li>Admin dapat mengirimkan kredensial resmi melalui WhatsApp atau Email Anda.</li>
                </ul>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-2">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>2.</span> Masuk ke Sistem (Login)
                </h3>
                <ol className="list-decimal pl-5 space-y-1 text-slate-600">
                  <li>Buka halaman login SSO SMPN 1 Prambon.</li>
                  <li>Ketikkan Username dan Password Anda pada form yang tersedia.</li>
                  <li>Gunakan tombol icon mata (👁️) jika ingin memastikan ketikan kata sandi sudah benar.</li>
                  <li>Klik tombol <strong>Masuk Portal</strong>.</li>
                </ol>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-2">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>3.</span> Mengakses e-Rapor
                </h3>
                <p className="leading-relaxed">
                  Setelah berhasil login di SSO, Anda dapat langsung mengklik menu atau kartu <strong>e-Rapor SMPN 1 Prambon</strong>. Sistem akan langsung mengenali identitas Anda tanpa memerlukan login ulang.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-2">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>4.</span> Mengubah Password & Profil Mandiri
                </h3>
                <p className="leading-relaxed">
                  Untuk keamanan akun, Anda disarankan mengubah kata sandi berkala:
                </p>
                <ol className="list-decimal pl-5 space-y-1 text-slate-600">
                  <li>Klik menu <strong>Profil Pengguna</strong> di sidebar kiri atau avatar di pojok kanan atas.</li>
                  <li>Pada tab <strong>Ubah Kata Sandi</strong>, masukkan kata sandi baru yang mudah Anda ingat.</li>
                  <li>Klik <strong>Simpan Perubahan</strong>. Kata sandi baru akan langsung aktif di seluruh aplikasi.</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────── */}
      {/* SECTION 3: PANDUAN SISWA & BARCODE */}
      {/* ──────────────────────────────────────────────────────── */}
      {activeSection === 'siswa' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <span>💳</span> Panduan Identitas Siswa & Kartu Barcode Terpadu
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Pemanfaatan kartu barcode siswa untuk presensi dan layanan perpustakaan digital sekolah.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 text-xs">
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-5 space-y-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <span>🏷️</span> Format Barcode Token Sekolah
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  Setiap siswa SMPN 1 Prambon memiliki Barcode Token unik berformat:
                </p>
                <div className="bg-white p-3 rounded-lg border border-slate-300 font-mono text-center font-bold text-blue-700">
                  PRAMBON-[HASH-IDENTITAS-32-CHAR]
                </div>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  Token ini diterbitkan otomatis saat siswa terdaftar di data master dan tidak akan tertukar antar siswa.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-5 space-y-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <span>⚡</span> Fungsi & Pemanfaatan Barcode
                </h3>
                <ul className="list-disc pl-4 space-y-1.5 text-slate-600">
                  <li><strong>Presensi Harian / Kelas:</strong> Cukup dekatkan kartu ke scanner barcode USB atau kamera scanner.</li>
                  <li><strong>Peminjaman Buku Perpustakaan:</strong> Petugas perpustakaan men-scan barcode siswa untuk mencatat peminjaman tanpa mengetik manual.</li>
                  <li><strong>Login Kiosk Siswa:</strong> Akses mandiri informasi akademik dan riwayat bacaan.</li>
                </ul>
              </div>
            </div>

            <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-5 space-y-2 text-xs">
              <h3 className="font-bold text-blue-900 text-sm">🖨️ Cara Cetak Kartu Barcode Siswa (Untuk Admin):</h3>
              <p className="text-blue-800 leading-relaxed">
                Buka menu <strong>Kartu QR / Barcode</strong> di sidebar. Anda dapat mencetak kartu siswa per kelas atau seluruh sekolah. Tersedia opsi ukuran kertas cetak standar seperti <strong>A4</strong> dan <strong>F4</strong> dengan format tata letak rapi, logo resmi sekolah, dan barcode beresolusi tinggi.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────── */}
      {/* SECTION 4: PANDUAN SUPER ADMINISTRATOR */}
      {/* ──────────────────────────────────────────────────────── */}
      {activeSection === 'admin' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <span>⚙️</span> Panduan Operasional Super Administrator
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Pengelolaan penuh data master, akun guru, kata sandi, dan periode akademik.
              </p>
            </div>

            <div className="space-y-4 text-xs text-slate-700">
              {/* Item 1 */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2 shadow-2xs">
                <h3 className="text-sm font-bold text-slate-900 text-blue-800 flex items-center gap-2">
                  <span>1.</span> Manajemen Data Master Guru & Akun Login Terpadu
                </h3>
                <p className="leading-relaxed text-slate-600">
                  Data guru di Data Master secara langsung menjadi akun login SSO:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-600">
                  <li><strong>Melihat Kata Sandi:</strong> Pada tabel guru, klik tombol mata (👁️) di kolom <em>Akun Login SSO</em> untuk melihat password guru secara langsung.</li>
                  <li><strong>Mengatur Kata Sandi:</strong> Klik tombol <strong>🔑 Atur Sandi</strong> pada baris guru untuk mengganti kata sandi secara instan tanpa perlu masuk ke database.</li>
                  <li><strong>Membagikan Akun:</strong> Klik tombol <strong>✉️ Kirim Akun</strong> untuk mengirimkan detail username & password kepada guru via WhatsApp, Email, atau menyalin teks format siap kirim.</li>
                  <li><strong>Guru Tanpa NIP:</strong> Guru tanpa NIP tetap dapat dibuatkan akun dengan aman; sistem akan otomatis menghasilkan username dari nama guru.</li>
                </ul>
              </div>

              {/* Item 2 */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2 shadow-2xs">
                <h3 className="text-sm font-bold text-slate-900 text-blue-800 flex items-center gap-2">
                  <span>2.</span> Pengaturan Periode Akademik (T.A & Semester)
                </h3>
                <p className="leading-relaxed text-slate-600">
                  Pada tab <strong>T.A & Semester</strong> di Data Master:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-600">
                  <li>Admin dapat mengganti status periode aktif antara <strong>Semester Ganjil</strong> atau <strong>Semester Genap</strong>.</li>
                  <li>Dapat mengatur Standar KKM Sekolah (misal: 75) dan rentang tanggal mulai/selesai semester.</li>
                  <li>Penggantian periode di SSO otomatis memperbarui acuan nilai e-Rapor dan absensi di seluruh sistem secara real-time.</li>
                </ul>
              </div>

              {/* Item 3 */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2 shadow-2xs">
                <h3 className="text-sm font-bold text-slate-900 text-blue-800 flex items-center gap-2">
                  <span>3.</span> Import Data Massal dari Excel
                </h3>
                <p className="leading-relaxed text-slate-600">
                  Gunakan menu <strong>Import Excel</strong> di sidebar untuk mengunggah ratusan data siswa atau guru sekaligus melalui file template <code className="bg-slate-100 px-1 rounded font-mono">.xlsx</code>. Sistem akan otomatis memvalidasi kolom dan menyinkronkan token barcode.
                </p>
              </div>

              {/* Item 4 */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2 shadow-2xs">
                <h3 className="text-sm font-bold text-slate-900 text-blue-800 flex items-center gap-2">
                  <span>4.</span> Pemantauan Jejak Audit (Audit Log)
                </h3>
                <p className="leading-relaxed text-slate-600">
                  Setiap aktivitas krusial seperti login pengguna, perubahan kata sandi, pergantian semester, dan modifikasi data tercatat rapi di menu <strong>Audit Log</strong> untuk transparansi dan audit keamanan IT sekolah.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────── */}
      {/* SECTION 5: PANDUAN KEPALA SEKOLAH (SUPERVISI EKSEKUTIF) */}
      {/* ──────────────────────────────────────────────────────── */}
      {activeSection === 'kepsek' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <span>🎓</span> Panduan Fitur & Supervisi Kepala Sekolah
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Wewenang dan alur penggunaan sistem bagi Kepala Sekolah SMP Negeri 1 Prambon.
              </p>
            </div>

            <div className="space-y-4 text-xs text-slate-700">
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-2">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>1.</span> Peran & Wewenang Kepala Sekolah dalam Sistem
                </h3>
                <p className="leading-relaxed text-slate-600">
                  Kepala Sekolah memegang peran <strong>Supervisi Eksekutif</strong> (Executive Oversight). 
                  Kepala Sekolah tidak dibebani input data teknis harian, melainkan fokus pada:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-600">
                  <li>Pengawasan capaian mutu akademik seluruh rombongan belajar (Kelas VII, VIII, IX).</li>
                  <li>Monitoring ketepatan waktu penginputan nilai rapor oleh seluruh guru mapel dan wali kelas.</li>
                  <li>Pengesahan rapor secara resmi dengan <strong>Tanda Tangan Digital</strong> sebelum cetak massal.</li>
                  <li>Evaluasi sirkulasi literasi perpustakaan dan kehadiran siswa.</li>
                </ul>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-2">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>2.</span> Alur Pengesahan Rapor (Tanda Tangan Digital Resmi)
                </h3>
                <ol className="list-decimal pl-5 space-y-1 text-slate-600">
                  <li>Masuk ke Portal SSO menggunakan akun Kepala Sekolah, lalu klik <strong>e-Rapor Spenspra</strong>.</li>
                  <li>Pilih menu <strong>Supervisi & Pengesahan Rapor</strong> di sidebar e-Rapor.</li>
                  <li>Periksa rekapitulasi nilai seluruh kelas apakah sudah berstatus 100% lengkap.</li>
                  <li>Klik tombol <strong>Bubuhi Tanda Tangan Digital</strong>, masukkan catatan/pesan pimpinan, dan konfirmasi.</li>
                  <li>Sistem secara otomatis menyematkan tanda tangan dan NIP Kepala Sekolah ke seluruh lembar rapor siswa dalam format 3 kolom pengesahan resmi.</li>
                </ol>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-2">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>3.</span> Monitoring Nilai Guru Secara Real-Time
                </h3>
                <p className="leading-relaxed text-slate-600">
                  Melalui dashboard monitoring e-Rapor, Kepala Sekolah dapat melihat matriks progres penginputan nilai per mata pelajaran. 
                  Jika terdapat guru yang belum menyelesaikan penilaian menjelang batas waktu, sistem menyediakan ringkasan nama guru dan kelas yang bersangkutan untuk tindak lanjut cepat.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────── */}
      {/* SECTION 6: KENDALA & FAQ */}
      {/* ──────────────────────────────────────────────────────── */}
      {activeSection === 'faq' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <span>❓</span> Solusi Kendala & Pertanyaan Umum (FAQ)
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Panduan penanganan cepat bila terjadi kendala saat menggunakan sistem SSO.
              </p>
            </div>

            <div className="space-y-4 text-xs">
              <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 space-y-1.5">
                <h4 className="font-bold text-slate-900 text-sm">
                  Q: Guru lupa kata sandi login, bagaimana cara mengatasinya?
                </h4>
                <p className="text-slate-600 leading-relaxed">
                  <strong>Jawab:</strong> Hubungi Super Admin sekolah. Admin dapat membuka menu <strong>Data Master &gt; Guru & GTK</strong>, mencari nama guru yang bersangkutan, lalu mengklik tombol <strong>🔑 Atur Sandi</strong> untuk melihat sandi lama atau memasukkan kata sandi baru.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 space-y-1.5">
                <h4 className="font-bold text-slate-900 text-sm">
                  Q: Saat membuka e-Rapor atau Perpustakaan, mengapa diminta login kembali?
                </h4>
                <p className="text-slate-600 leading-relaxed">
                  <strong>Jawab:</strong> Hal ini biasanya terjadi jika cookie sesi kedaluwarsa atau peramban (browser) memblokir third-party cookies. Solusinya: buka portal utama SSO terlebih dahulu, pastikan Anda dalam status login, lalu klik tautan aplikasi tujuan.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 space-y-1.5">
                <h4 className="font-bold text-slate-900 text-sm">
                  Q: Scanner barcode tidak merespons saat memindai kartu siswa?
                </h4>
                <p className="text-slate-600 leading-relaxed">
                  <strong>Jawab:</strong> Pastikan kabel scanner USB terhubung dengan baik atau lensa kamera bersih. Pastikan pula kartu barcode dicetak dengan jelas (tidak buram/terpotong). Jika token rusak, admin dapat mencetak ulang kartu dari menu <em>Kartu QR / Barcode</em>.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 space-y-1.5">
                <h4 className="font-bold text-slate-900 text-sm">
                  Q: Bagaimana jika seorang guru belum memiliki NIP resmi?
                </h4>
                <p className="text-slate-600 leading-relaxed">
                  <strong>Jawab:</strong> Field NIP bersifat opsional. Admin dapat mengosongkan NIP saat menambah atau mengedit guru. Sistem secara otomatis membuatkan username unik dari nama guru (misal: <em>ahmad_subandi</em>).
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER BANTUAN */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-blue-900 to-[#193D9B] p-6 text-white shadow-sm">
        <div>
          <h3 className="font-bold text-sm">Butuh bantuan teknis lebih lanjut?</h3>
          <p className="text-xs text-blue-200 mt-0.5">
            Tim IT SMP Negeri 1 Prambon siap membantu pengelolaan ekosistem digital sekolah.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/master-data"
            className="rounded-xl bg-white px-4 py-2 text-xs font-bold text-blue-900 hover:bg-blue-50 transition shadow-xs"
          >
            Buka Data Master
          </Link>
          <Link
            href="/"
            className="rounded-xl bg-blue-800/80 hover:bg-blue-800 px-4 py-2 text-xs font-semibold text-white transition border border-blue-700/50"
          >
            Kembali ke Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
