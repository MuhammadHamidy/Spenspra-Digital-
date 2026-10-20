'use client';

import React from 'react';

export default function Card({
  title,
  subtitle,
  icon,
  action,
  children,
  className = '',
  interactive = false,
}) {
  return (
    <div
      className={`bg-[var(--color-neutral-50,#FFFFFF)] border border-[var(--color-neutral-300,#E5E7EB)] rounded-[12px] shadow-[var(--shadow-md,0_4px_12px_rgba(23,32,51,0.08))] overflow-hidden transition-all duration-150 ${
        interactive ? 'hover:border-[var(--color-primary-300,#B9B0D2)] hover:shadow-[var(--shadow-lg,0_12px_24px_rgba(23,32,51,0.12))]' : ''
      } ${className}`}
    >
      {(title || icon || action) && (
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[var(--color-neutral-300,#E5E7EB)]">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="p-2 rounded-[8px] bg-[var(--color-primary-100,#EDEAF5)] text-[var(--color-primary-700,#3D2E66)] shrink-0">
                {icon}
              </div>
            )}
            <div>
              {title && (
                <h3 className="text-[18px] sm:text-[20px] font-bold text-[var(--color-neutral-1000,#172033)] leading-tight">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-xs sm:text-sm text-[var(--color-neutral-700,#667085)] mt-0.5">{subtitle}</p>
              )}
            </div>
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="p-4 sm:p-5">{children}</div>
    </div>
  );
}
