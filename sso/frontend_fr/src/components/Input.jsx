'use client';

import React from 'react';

/**
 * Input — Sesuai standar DESIGN fix.md
 * - Radius: 6px (SM)
 * - Border: 1px neutral-300 (#E5E7EB)
 * - Background: neutral-50 (#FFFFFF)
 * - Typography: Body (16px/14px)
 * - Focus: border primary-500 (#4B3B78), ring primary-100 (#EDEAF5)
 * - Error: border danger-500 (#C0392B), text danger-800 (#7D261E)
 */
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
          className={`w-full px-3.5 py-2 text-sm sm:text-base font-normal bg-[var(--color-neutral-50,#FFFFFF)] border rounded-[6px] transition-all duration-150 outline-none
            placeholder:text-[var(--color-neutral-500,#98A2B3)]
            disabled:bg-[var(--color-neutral-100,#F8F9FC)] disabled:text-[var(--color-neutral-500,#98A2B3)] disabled:cursor-not-allowed
            ${
              error
                ? 'border-[var(--color-danger-500,#C0392B)] text-[var(--color-danger-800,#7D261E)] focus:ring-2 focus:ring-[var(--color-danger-300,#F1B4AC)]'
                : 'border-[var(--color-neutral-300,#E5E7EB)] text-[var(--color-neutral-1000,#172033)] focus:border-[var(--color-primary-500,#4B3B78)] focus:ring-2 focus:ring-[var(--color-primary-100,#EDEAF5)]'
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
