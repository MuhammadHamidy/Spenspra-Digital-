'use client';

import React from 'react';

export default function Input({
  label,
  id,
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  helperText,
  required = false,
  disabled = false,
  startIcon,
  endIcon,
  className = '',
  ...props
}) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs sm:text-sm font-semibold text-[var(--color-neutral-800,#344054)] select-none"
        >
          {label} {required && <span className="text-[var(--color-danger-500,#C0392B)]">*</span>}
        </label>
      )}

      <div className="relative flex items-center">
        {startIcon && (
          <span className="absolute left-3 text-[var(--color-neutral-500,#98A2B3)] pointer-events-none flex items-center">
            {startIcon}
          </span>
        )}

        <input
          id={inputId}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={`w-full px-3.5 py-2.5 text-sm font-medium bg-white border-2 rounded-xl transition-all duration-150 outline-none shadow-2xs
            placeholder:text-slate-400
            disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 disabled:cursor-not-allowed
            ${
              error
                ? 'border-rose-400 text-rose-900 focus:border-rose-600 focus:ring-4 focus:ring-rose-500/10'
                : 'border-slate-200 text-slate-900 hover:border-slate-300 focus:border-[#4B3B78] focus:ring-4 focus:ring-[#4B3B78]/10'
            }
            ${startIcon ? 'pl-9' : ''}
            ${endIcon ? 'pr-9' : ''}
            ${className}`}
          {...props}
        />

        {endIcon && (
          <span className="absolute right-3 text-[var(--color-neutral-500,#98A2B3)] flex items-center">
            {endIcon}
          </span>
        )}
      </div>

      {(error || helperText) && (
        <p
          className={`text-xs ${
            error
              ? 'text-[var(--color-danger-500,#C0392B)] font-medium'
              : 'text-[var(--color-neutral-700,#667085)]'
          }`}
        >
          {error || helperText}
        </p>
      )}
    </div>
  );
}
