'use client';

import React from 'react';

export default function ImportTabs({ activeTab, onTabChange }) {
  return (
    <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl max-w-sm border border-slate-200">
      <button
        type="button"
        onClick={() => onTabChange('students')}
        className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center ${
          activeTab === 'students'
            ? 'bg-white text-blue-700 shadow-xs'
            : 'text-slate-600 hover:text-slate-900'
        }`}
      >
        Import Data Siswa
      </button>
      <button
        type="button"
        onClick={() => onTabChange('teachers')}
        className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center ${
          activeTab === 'teachers'
            ? 'bg-white text-blue-700 shadow-xs'
            : 'text-slate-600 hover:text-slate-900'
        }`}
      >
        Import Data Guru
      </button>
    </div>
  );
}
