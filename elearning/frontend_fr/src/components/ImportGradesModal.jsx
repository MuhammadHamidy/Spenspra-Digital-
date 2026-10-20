'use client';

import React, { useState, useMemo } from 'react';

/**
 * Parser file teks / CSV / TSV / Excel XML
 */
function parseDelimitedText(text) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  // Deteksi separator baris pertama: Tab (\t), Semicolon (;), atau Comma (,)
  const firstLine = lines[0];
  let separator = '\t';
  if (firstLine.includes('\t')) {
    separator = '\t';
  } else if (firstLine.includes(';')) {
    separator = ';';
  } else if (firstLine.includes(',')) {
    separator = ',';
  }

  const rows = [];
  for (let i = 0; i < lines.length; i++) {
    // Lewati baris header jika ada kata "NISN" atau "NAMA" atau "NILAI"
    const lower = lines[i].toLowerCase();
    if (i === 0 && (lower.includes('nisn') || lower.includes('nama') || lower.includes('nilai'))) {
      continue;
    }

    const parts = lines[i].split(separator).map((p) => p.replace(/^["']|["']$/g, '').trim());
    if (parts.length >= 2) {
      rows.push(parts);
    }
  }

  return rows;
}

export default function ImportGradesModal({
  isOpen,
  onClose,
  currentRows = [],
  className = '',
  subjectName = '',
  subjectCode = '',
  onApplyGrades,
}) {
  const [activeTab, setActiveTab] = useState('PASTE'); // 'PASTE' | 'FILE'
  const [pastedText, setPastedText] = useState('');
  const [fileName, setFileName] = useState('');
  const [parsedPreview, setParsedPreview] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  // Analisis teks masukan dan lakukan pencocokan terhadap siswa yang ada
  const handleProcessInput = (rawText) => {
    setErrorMessage('');
    const rawRows = parseDelimitedText(rawText);

    if (rawRows.length === 0) {
      setErrorMessage('Tidak ada data nilai yang terdeteksi dari teks atau berkas.');
      setParsedPreview([]);
      return;
    }

    // Buat lookup map dari currentRows berdasarkan NISN dan Nama
    const nisnMap = new Map();
    const nameMap = new Map();

    currentRows.forEach((r) => {
      if (r.nisn) nisnMap.set(String(r.nisn).trim(), r);
      if (r.name) nameMap.set(r.name.toLowerCase().trim(), r);
    });

    const results = [];

    rawRows.forEach((cols) => {
      // Coba tebak kolom:
      // Pola 1: [No, NISN, Nama, Nilai, ...]
      // Pola 2: [NISN, Nama, Nilai]
      // Pola 3: [Nama, Nilai]
      // Pola 4: [NISN, Nilai]

      let foundStudent = null;
      let matchedBy = '';
      let scoreVal = null;
      let descVal = '';

      // Cari kolom angka yang cocok dengan nilai (0-100)
      for (let c = cols.length - 1; c >= 0; c--) {
        const cleanCol = cols[c].replace(',', '.');
        const num = parseFloat(cleanCol);
        if (!isNaN(num) && num >= 0 && num <= 100 && scoreVal === null) {
          scoreVal = num;
          // Cek apakah ada deskripsi setelah kolom nilai
          if (c + 1 < cols.length && cols[c + 1]) {
            descVal = cols[c + 1];
          }
          break;
        }
      }

      // Cari siswa berdasarkan NISN di tiap kolom
      for (const col of cols) {
        const cleanCol = String(col).trim();
        if (nisnMap.has(cleanCol)) {
          foundStudent = nisnMap.get(cleanCol);
          matchedBy = 'NISN';
          break;
        }
      }

      // Jika belum ketemu via NISN, cari via Nama
      if (!foundStudent) {
        for (const col of cols) {
          const lowerCol = String(col).toLowerCase().trim();
          if (nameMap.has(lowerCol)) {
            foundStudent = nameMap.get(lowerCol);
            matchedBy = 'NAMA';
            break;
          }
          // Cek partial match (nama depan / substring)
          for (const [k, s] of nameMap.entries()) {
            if (lowerCol.length >= 4 && (k.includes(lowerCol) || lowerCol.includes(k))) {
              foundStudent = s;
              matchedBy = 'NAMA (Kemiripan)';
              break;
            }
          }
          if (foundStudent) break;
        }
      }

      results.push({
        rawCols: cols,
        student: foundStudent,
        matchedBy,
        score: scoreVal,
        description: descVal,
        status: foundStudent && scoreVal !== null ? 'MATCHED' : foundStudent ? 'NO_SCORE' : 'NOT_FOUND',
      });
    });

    setParsedPreview(results);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        // Jika format SpreadsheetML XML (.xls)
        if (content.includes('<?xml') && content.includes('Workbook')) {
          try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(content, 'text/xml');
            const rowNodes = xmlDoc.getElementsByTagName('Row');
            const textLines = [];

            for (let i = 0; i < rowNodes.length; i++) {
              const cellNodes = rowNodes[i].getElementsByTagName('Cell');
              const cellValues = [];
              for (let j = 0; j < cellNodes.length; j++) {
                const dataNode = cellNodes[j].getElementsByTagName('Data')[0];
                cellValues.push(dataNode ? dataNode.textContent.trim() : '');
              }
              if (cellValues.some(Boolean)) {
                textLines.push(cellValues.join('\t'));
              }
            }
            handleProcessInput(textLines.join('\n'));
            return;
          } catch (err) {
            console.warn('Gagal parse XML Excel:', err);
          }
        }

        // Default: parse sebagai CSV / TSV text
        handleProcessInput(content);
      }
    };

    reader.readAsText(file);
  };

  const matchedCount = parsedPreview.filter((p) => p.status === 'MATCHED').length;
  const notFoundCount = parsedPreview.filter((p) => p.status === 'NOT_FOUND').length;
  const noScoreCount = parsedPreview.filter((p) => p.status === 'NO_SCORE').length;

  const handleApply = () => {
    if (matchedCount === 0) {
      alert('Tidak ada data siswa yang cocok untuk diterapkan.');
      return;
    }

    const updates = parsedPreview
      .filter((p) => p.status === 'MATCHED')
      .map((p) => ({
        studentId: p.student.id,
        nisn: p.student.nisn,
        score: p.score,
        description: p.description,
      }));

    onApplyGrades(updates);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-emerald-800 to-teal-800 text-white border-b border-emerald-900">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/20 uppercase tracking-wider">
                Import Nilai Offline
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/30">
                Kelas {className} • {subjectName} ({subjectCode})
              </span>
            </div>
            <h2 className="text-lg font-bold text-white mt-1">
              Impor Nilai dari File Excel atau Salin-Tempel (Copy-Paste)
            </h2>
            <p className="text-xs text-emerald-100">
              Impor nilai yang telah diolah di Microsoft Excel secara offline langsung ke formulir penilaian e-Rapor.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-3">
          <button
            type="button"
            onClick={() => setActiveTab('PASTE')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'PASTE'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>📋 Salin-Tempel dari Excel (Copy-Paste)</span>
            <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-emerald-100 text-emerald-800 font-bold">
              Praktis
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('FILE')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'FILE'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>📁 Unggah Berkas (.xls, .csv, .txt)</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-slate-50">
          {activeTab === 'PASTE' ? (
            <div className="space-y-3">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-900 flex items-start gap-2.5">
                <span className="text-base">💡</span>
                <div>
                  <p className="font-bold">Cara Salin-Tempel dari Excel:</p>
                  <p className="text-[11px] text-emerald-800 mt-0.5">
                    1. Buka spreadsheet Excel Anda. Blok kolom <strong>NISN</strong>, <strong>Nama Siswa</strong>, dan <strong>Nilai</strong>.<br />
                    2. Tekan <strong>Ctrl + C</strong> (Copy) pada Excel.<br />
                    3. Klik kotak teks di bawah lalu tekan <strong>Ctrl + V</strong> (Paste), kemudian klik tombol <strong>"Analisis Nilai"</strong>.
                  </p>
                </div>
              </div>

              <textarea
                rows={6}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Contoh format yang dipaste dari Excel:&#10;0081234567	Ahmad Fajar	85&#10;0087654321	Budi Santoso	90&#10;0089988776	Citra Lestari	78"
                className="w-full p-3 font-mono text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              />

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => handleProcessInput(pastedText)}
                  disabled={!pastedText.trim()}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <span>Analisis Data Nilai</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center bg-white hover:border-emerald-500 transition">
                <input
                  type="file"
                  id="excelFileInput"
                  accept=".xls,.csv,.txt,.xml"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <label
                  htmlFor="excelFileInput"
                  className="cursor-pointer flex flex-col items-center justify-center space-y-2"
                >
                  <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl">
                    📁
                  </div>
                  <span className="text-xs font-bold text-slate-800">
                    Klik untuk memilih berkas Excel atau CSV
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Format didukung: Berkas Ekspor Template Spenspra (.xls), .csv, atau .txt
                  </span>
                  {fileName && (
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      📄 {fileName}
                    </span>
                  )}
                </label>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {errorMessage}
            </div>
          )}

          {/* Hasil Analisis Preview */}
          {parsedPreview.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-3 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700">Ringkasan Impor:</span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    🟢 {matchedCount} Siswa Cocok
                  </span>
                  {noScoreCount > 0 && (
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                      🟡 {noScoreCount} Nilai Kosong
                    </span>
                  )}
                  {notFoundCount > 0 && (
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-100 text-rose-800 border border-rose-200">
                      🔴 {notFoundCount} Tidak Dikenal
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-slate-500">
                  Total {parsedPreview.length} baris diproses
                </span>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="max-h-60 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold sticky top-0">
                      <tr>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Siswa di Sistem</th>
                        <th className="py-2.5 px-3">NISN</th>
                        <th className="py-2.5 px-3 text-right">Nilai Terbaca</th>
                        <th className="py-2.5 px-3">Kecocokan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsedPreview.map((item, idx) => (
                        <tr
                          key={idx}
                          className={
                            item.status === 'MATCHED'
                              ? 'hover:bg-emerald-50/30'
                              : 'bg-rose-50/20 hover:bg-rose-50/40'
                          }
                        >
                          <td className="py-2 px-3">
                            {item.status === 'MATCHED' ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                Cocok
                              </span>
                            ) : item.status === 'NO_SCORE' ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800">
                                Nilai Kosong
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800">
                                Tidak Ditemukan
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 font-semibold text-slate-900">
                            {item.student ? item.student.name : item.rawCols[1] || item.rawCols[0] || '-'}
                          </td>
                          <td className="py-2 px-3 font-mono text-[11px] text-slate-600">
                            {item.student ? item.student.nisn : item.rawCols[0] || '-'}
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-slate-900 font-mono">
                            {item.score !== null ? item.score : '-'}
                          </td>
                          <td className="py-2 px-3 text-[11px] text-slate-500">
                            {item.matchedBy || 'Baris diabaikan'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-600">
            {matchedCount > 0 ? (
              <span>Siap menerapkan nilai untuk <strong>{matchedCount}</strong> siswa ke formulir.</span>
            ) : (
              <span>Pilih berkas atau paste data dari spreadsheet Excel terlebih dahulu.</span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={matchedCount === 0}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              <span>Terapkan ke Formulir Nilai</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
