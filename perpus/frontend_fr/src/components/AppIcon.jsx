'use client';

import React from 'react';

const COLOR_MAP = {
  white: '#FFFFFF',
  blue: '#0076BE',
  green: '#10B981',
  red: '#EF4444',
  black: '#1E293B',
  grey: '#64748B',
  gray: '#64748B',
};

function renderVectorIcon(name, hexColor) {
  switch (name) {
    case 'sync':
    case 'refresh':
      return (
        <path
          d="M14.3334 4L14.7739 4.81292C15.0718 5.36252 15.2207 5.63732 15.1223 5.755C15.0238 5.87269 14.6994 5.77764 14.0507 5.58755C13.4021 5.39749 12.7136 5.29524 12 5.29524C8.134 5.29524 5 8.29706 5 12C5 13.2212 5.34088 14.3662 5.93647 15.3524M9.66666 20L9.22605 19.1871C8.92816 18.6375 8.77922 18.3626 8.87771 18.2449C8.9762 18.1273 9.30057 18.2223 9.94929 18.4124C10.5979 18.6025 11.2864 18.7047 12 18.7047C15.866 18.7047 19 15.7029 19 12C19 10.7788 18.6591 9.63379 18.0635 8.64761"
          stroke={hexColor}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );

    case 'human':
    case 'people':
    case 'profile':
    case 'user':
      return (
        <>
          <path
            d="M5.24 10.5c-.75.45-2.73 1.37-1.53 2.52.59.56 1.25.96 2.07.96h8.44c.82 0 1.48-.4 2.07-.96 1.2-1.15-.78-2.07-1.53-2.52-1.77-1.05-4.01-1.05-5.78 0z"
            stroke={hexColor}
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M12 5.5a3 3 0 11-6 0 3 3 0 016 0z"
            stroke={hexColor}
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </>
      );

    case 'course':
    case 'courses':
    case 'book':
    case 'books':
    case 'catalog':
    case 'document-book':
      return (
        <path
          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
          stroke={hexColor}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );

    case 'graduation':
      return (
        <>
          <path
            d="M12 14l9-5-9-5-9 5 9 5z"
            stroke={hexColor}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"
            stroke={hexColor}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      );

    case 'building':
    case 'school':
      return (
        <path
          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          stroke={hexColor}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );

    case 'tick':
    case 'check':
    case 'circle-tick':
      return (
        <path
          d="M5 13l4 4L19 7"
          stroke={hexColor}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );

    case 'caution':
    case 'warning':
      return (
        <path
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          stroke={hexColor}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );

    case 'close-cancel':
    case 'close':
      return (
        <path
          d="M6 18L18 6M6 6l12 12"
          stroke={hexColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );

    case 'upload':
      return (
        <path
          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
          stroke={hexColor}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );

    case 'download':
      return (
        <path
          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
          stroke={hexColor}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );

    case 'schedule':
    case 'timer':
    case 'sessions':
    case 'circulation':
    case 'loans':
    case 'borrow':
      return (
        <path
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          stroke={hexColor}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );

    case 'star':
      return (
        <path
          d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
          stroke={hexColor}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );

    case 'computer':
    case 'keyboard':
      return (
        <path
          d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          stroke={hexColor}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );

    case 'admin':
    case 'teacher':
    case 'guru':
      return (
        <path
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          stroke={hexColor}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );

    case 'student':
    case 'students':
    case 'member':
    case 'members':
    case 'student-profile':
      return (
        <>
          <rect
            x="3"
            y="4"
            width="18"
            height="16"
            rx="2"
            stroke={hexColor}
            strokeWidth="1.8"
          />
          <circle cx="8" cy="10" r="2" stroke={hexColor} strokeWidth="1.5" />
          <path d="M6 16c0-1.5 1-2.5 2-2.5s2 1 2 2.5M13 9h5M13 13h3" stroke={hexColor} strokeWidth="1.5" strokeLinecap="round" />
        </>
      );

    case 'search':
      return (
        <path
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          stroke={hexColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );

    case 'qr_code':
      return (
        <path
          d="M4 4h4v4H4V4zm12 0h4v4h-4V4zM4 16h4v4H4v-4zm12 3h4m-4-3h1m-1 6h4"
          stroke={hexColor}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );

    case 'barcode':
      return (
        <path
          d="M3 4h2v16H3V4zm5 0h1v16H8V4zm4 0h3v16h-3V4zm6 0h1v16h-1V4zm3 0h1v16h-1V4z"
          fill={hexColor}
        />
      );

    default:
      return null;
  }
}

export default function AppIcon({
  name,
  color = 'white',
  size = 20,
  className = '',
  style = {},
  alt = '',
}) {
  const normColor = String(color || 'blue').toLowerCase();
  const hexColor = COLOR_MAP[normColor] || (color.startsWith('#') ? color : '#0076BE');

  const vector = renderVectorIcon(name, hexColor);
  if (vector) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`inline-block flex-shrink-0 select-none ${className}`}
        style={{
          width: size,
          height: size,
          verticalAlign: 'middle',
          ...style,
        }}
        aria-label={alt || name || 'icon'}
      >
        {vector}
      </svg>
    );
  }

  // Graceful circular dot if unrecognized
  return (
    <span
      className={`inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size, ...style }}
    >
      <span
        style={{
          width: size * 0.5,
          height: size * 0.5,
          borderRadius: '50%',
          backgroundColor: hexColor,
        }}
      />
    </span>
  );
}

