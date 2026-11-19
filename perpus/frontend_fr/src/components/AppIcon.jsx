'use client';

import React, { useState } from 'react';

// Maps requested icon names to corresponding directory, filename prefix, and available colors inside /public/icon/
const ICON_REGISTRY = {
  dashboard: { folder: 'dashboard', prefix: '', colors: ['black', 'blue', 'green', 'grey', 'red', 'white'] },
  presence: { folder: 'presence', prefix: '', colors: ['black', 'blue', 'green', 'grey', 'red', 'white'] },
  attendance: { folder: 'presence', prefix: '', colors: ['black', 'blue', 'green', 'grey', 'red', 'white'] },
  scan: { folder: 'presence', prefix: '', colors: ['black', 'blue', 'green', 'grey', 'red', 'white'] },
  camera: { folder: 'presence', prefix: '', colors: ['black', 'blue', 'green', 'grey', 'red', 'white'] },
  schedule: { folder: 'schedule', prefix: '', colors: ['black', 'blue', 'green', 'grey', 'red', 'white', 'yellow'] },
  sessions: { folder: 'schedule', prefix: '', colors: ['black', 'blue', 'green', 'grey', 'red', 'white', 'yellow'] },
  calendar: { folder: 'schedule', prefix: '', colors: ['black', 'blue', 'green', 'grey', 'red', 'white', 'yellow'] },
  rekap: { folder: 'survey', prefix: '', colors: ['black', 'blue', 'green', 'grey', 'red', 'white', 'yellow'] },
  survey: { folder: 'survey', prefix: '', colors: ['black', 'blue', 'green', 'grey', 'red', 'white', 'yellow'] },
  edit: { folder: 'edit', prefix: '', colors: ['black', 'blue', 'green', 'grey', 'red', 'white', 'yellow'] },
  pencil: { folder: 'edit', prefix: '', colors: ['black', 'blue', 'green', 'grey', 'red', 'white', 'yellow'] },
  profile: { folder: 'profile', prefix: 'secondary-', colors: ['black', 'blue', 'green', 'grey', 'red', 'white'] },
  user: { folder: 'profile', prefix: 'secondary-', colors: ['black', 'blue', 'green', 'grey', 'red', 'white'] },
  course: { folder: 'course', prefix: 'outline-', colors: ['black', 'blue', 'green', 'grey', 'red', 'white'] },
  courses: { folder: 'course', prefix: 'outline-', colors: ['black', 'blue', 'green', 'grey', 'red', 'white'] },
  book: { folder: 'course', prefix: 'outline-', colors: ['black', 'blue', 'green', 'grey', 'red', 'white'] },
  books: { folder: 'course', prefix: 'outline-', colors: ['black', 'blue', 'green', 'grey', 'red', 'white'] },
  catalog: { folder: 'course', prefix: 'outline-', colors: ['black', 'blue', 'green', 'grey', 'red', 'white'] },
  'document-book': { folder: 'document-book', prefix: '', colors: ['black', 'blue', 'green', 'grey', 'red', 'white', 'yellow'] },
  student: { folder: 'student-profile', prefix: '', colors: ['black', 'blue', 'green', 'grey', 'red', 'white'] },
  students: { folder: 'student-profile', prefix: '', colors: ['black', 'blue', 'green', 'grey', 'red', 'white'] },
  member: { folder: 'student-profile', prefix: '', colors: ['black', 'blue', 'green', 'grey', 'red', 'white'] },
  members: { folder: 'student-profile', prefix: '', colors: ['black', 'blue', 'green', 'grey', 'red', 'white'] },
  'student-profile': { folder: 'student-profile', prefix: '', colors: ['black', 'blue', 'green', 'grey', 'red', 'white'] },
  circulation: { folder: 'schedule', prefix: '', colors: ['black', 'blue', 'green', 'grey', 'red', 'white', 'yellow'] },
  loans: { folder: 'schedule', prefix: '', colors: ['black', 'blue', 'green', 'grey', 'red', 'white', 'yellow'] },
  borrow: { folder: 'schedule', prefix: '', colors: ['black', 'blue', 'green', 'grey', 'red', 'white', 'yellow'] },
  return: { folder: 'edit', prefix: '', colors: ['black', 'blue', 'green', 'grey', 'red', 'white', 'yellow'] },
  kiosk: { folder: 'presence', prefix: '', colors: ['black', 'blue', 'green', 'grey', 'red', 'white'] },
  barcode: { folder: 'registration', prefix: '', colors: ['black', 'blue', 'green', 'grey', 'red', 'white', 'yellow'] },
  print: { folder: 'survey', prefix: '', colors: ['black', 'blue', 'green', 'grey', 'red', 'white', 'yellow'] },
  import: { folder: 'edit', prefix: '', colors: ['black', 'blue', 'green', 'grey', 'red', 'white', 'yellow'] },
  insights: { folder: 'survey', prefix: '', colors: ['black', 'blue', 'green', 'grey', 'red', 'white', 'yellow'] },
  resume: { folder: 'edit', prefix: '', colors: ['black', 'blue', 'green', 'grey', 'red', 'white', 'yellow'] },
  logout: { folder: 'logout', prefix: '', colors: ['black', 'blue', 'green', 'grey', 'red', 'white', 'yellow'] },
  home: { folder: 'home', prefix: '', colors: ['black', 'blue', 'green', 'grey', 'red', 'white'] },
  admin: { folder: 'admin', prefix: '', colors: ['black', 'blue', 'green', 'grey', 'red', 'white'] },
  register: { folder: 'registration', prefix: '', colors: ['black', 'blue', 'green', 'grey', 'red', 'white', 'yellow'] },
  registration: { folder: 'registration', prefix: '', colors: ['black', 'blue', 'green', 'grey', 'red', 'white', 'yellow'] },
  search: { folder: 'search', prefix: '', colors: ['black', 'blue', 'green', 'grey', 'red', 'white', 'yellow'] },
  setting: { folder: 'setting', prefix: '', colors: ['black', 'blue', 'green', 'grey', 'red', 'white', 'yellow'] },
  timer: { folder: 'timer', prefix: 'outline-', colors: ['black', 'grey', 'red', 'white'] },
  clock: { folder: 'timer', prefix: 'outline-', colors: ['black', 'grey', 'red', 'white'] },
  notification: { folder: 'notification', prefix: '', colors: ['black', 'blue', 'green', 'grey', 'red', 'white', 'yellow'] },
  medal: { folder: 'medal', prefix: '', colors: ['black', 'blue', 'green', 'grey', 'red', 'white', 'yellow'] },
  trophy: { folder: 'medal', prefix: '', colors: ['black', 'blue', 'green', 'grey', 'red', 'white', 'yellow'] },
  award: { folder: 'medal', prefix: '', colors: ['black', 'blue', 'green', 'grey', 'red', 'white', 'yellow'] },
  tick: { folder: 'tick', prefix: '', colors: ['black', 'blue', 'green', 'grey', 'red', 'white', 'yellow'] },
  check: { folder: 'tick', prefix: '', colors: ['black', 'blue', 'green', 'grey', 'red', 'white', 'yellow'] },
  'close-cancel': { folder: 'close-cancel', prefix: '', colors: ['black', 'blue', 'green', 'grey', 'red', 'white', 'yellow'] },
  close: { folder: 'close-cancel', prefix: '', colors: ['black', 'blue', 'green', 'grey', 'red', 'white', 'yellow'] },
  cancel: { folder: 'close-cancel', prefix: '', colors: ['black', 'blue', 'green', 'grey', 'red', 'white', 'yellow'] },
  delete: { folder: 'delete', prefix: '', colors: ['black', 'blue', 'green', 'grey', 'red', 'white', 'yellow'] },
  trash: { folder: 'delete', prefix: '', colors: ['black', 'blue', 'green', 'grey', 'red', 'white', 'yellow'] },
  remove: { folder: 'delete', prefix: '', colors: ['black', 'blue', 'green', 'grey', 'red', 'white', 'yellow'] },
  'circle-add': { folder: 'circle-add', prefix: '', colors: ['black', 'grey', 'red'] },
  add: { folder: 'circle-add', prefix: '', colors: ['black', 'grey', 'red'] },
  plus: { folder: 'circle-add', prefix: '', colors: ['black', 'grey', 'red'] },
  caution: { folder: 'caution', prefix: 'outline-', colors: ['black', 'blue', 'grey', 'red', 'white'] },
  warning: { folder: 'caution', prefix: 'outline-', colors: ['black', 'blue', 'grey', 'red', 'white'] },
  star: { folder: 'star', prefix: 'outline-', colors: ['black', 'grey', 'red', 'white'] },
  sync: { folder: 'sync', prefix: 'outline-', colors: ['black', 'grey', 'red', 'white'] },
  refresh: { folder: 'sync', prefix: 'outline-', colors: ['black', 'grey', 'red', 'white'] },
  dice: { folder: 'sync', prefix: 'outline-', colors: ['black', 'grey', 'red', 'white'] },
  file: { folder: 'file', prefix: 'outline-', colors: ['black', 'grey', 'red', 'white'] },
  document: { folder: 'file', prefix: 'outline-', colors: ['black', 'grey', 'red', 'white'] },
  link: { folder: 'link', prefix: '', colors: ['black', 'blue', 'green', 'grey', 'red', 'white', 'yellow'] },
  copy: { folder: 'copy', prefix: '', colors: ['black', 'blue', 'green', 'grey', 'red', 'white', 'yellow'] },
  graduation: { folder: 'graduation', prefix: '', colors: ['black', 'blue', 'green', 'grey', 'red', 'white', 'yellow'] },
  building: { folder: 'building', prefix: '', colors: ['black', 'blue', 'green', 'grey', 'red', 'white', 'yellow'] },
  more: { folder: 'more', prefix: '', colors: ['black', 'blue', 'green', 'grey', 'red', 'white', 'yellow'] },
  'arrow-left': { folder: 'arrow-left', prefix: '', colors: ['black', 'blue', 'green', 'grey', 'red', 'white', 'yellow'] },
  'arrow-back': { folder: 'arrow-left', prefix: '', colors: ['black', 'blue', 'green', 'grey', 'red', 'white', 'yellow'] },
  'arrow-right': { folder: 'arrow-right', prefix: '', colors: ['black', 'blue', 'green', 'grey', 'red', 'white', 'yellow'] },
};

const VALID_SIZES = [12, 16, 20, 24, 32];
const VALID_COLORS = ['black', 'blue', 'green', 'grey', 'red', 'white', 'yellow'];

const COLOR_HEX_MAP = {
  white: '#FFFFFF',
  black: '#0F172A',
  grey: '#64748B',
  gray: '#64748B',
  blue: '#2563EB',
  purple: '#4B3B78',
  indigo: '#4F46E5',
  green: '#059669',
  emerald: '#059669',
  red: '#E11D48',
  rose: '#E11D48',
  yellow: '#D97706',
  amber: '#D97706',
  orange: '#EA580C',
};

function getClosestSize(size) {
  if (!size || size <= 14) return 12;
  if (size <= 18) return 16;
  if (size <= 22) return 20;
  if (size <= 28) return 24;
  return 32;
}

function normalizeColor(color) {
  if (!color) return 'blue';
  const c = String(color).toLowerCase();
  if (c === 'gray' || c === 'slate') return 'grey';
  if (c === 'purple' || c === 'indigo') return 'blue';
  if (c === 'emerald') return 'green';
  if (c === 'amber' || c === 'orange') return 'yellow';
  if (c === 'rose') return 'red';
  if (VALID_COLORS.includes(c)) return c;
  return 'blue';
}

function getStrokeColor(color) {
  if (!color) return '#2563EB';
  const c = String(color).toLowerCase();
  return COLOR_HEX_MAP[c] || '#2563EB';
}

function renderInlineVectorIcon(name, strokeColor, size, className, style) {
  const n = String(name || '').toLowerCase();
  const commonProps = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: strokeColor,
    strokeWidth: 2.1,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    className: `inline-block flex-shrink-0 select-none ${className}`,
    style: { width: size, height: size, verticalAlign: 'middle', ...style },
  };

  if (n === 'circle-add' || n === 'add' || n === 'plus') {
    return (
      <svg {...commonProps}>
        <circle cx="12" cy="12" r="9" />
        <line x1="12" y1="8" x2="12" y2="16" />
        <line x1="8" y1="12" x2="16" y2="12" />
      </svg>
    );
  }
  if (n === 'timer' || n === 'clock') {
    return (
      <svg {...commonProps}>
        <circle cx="12" cy="12" r="9" />
        <polyline points="12 7 12 12 15.5 14" />
      </svg>
    );
  }
  if (n === 'schedule' || n === 'calendar' || n === 'sessions' || n === 'circulation' || n === 'loans' || n === 'borrow') {
    return (
      <svg {...commonProps}>
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    );
  }
  if (n === 'caution' || n === 'warning') {
    return (
      <svg {...commonProps}>
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    );
  }
  if (n === 'tick' || n === 'check' || n === 'circle-tick') {
    return (
      <svg {...commonProps}>
        <polyline points="20 6 9 17 4 12" />
      </svg>
    );
  }
  if (n === 'close-cancel' || n === 'close' || n === 'cancel') {
    return (
      <svg {...commonProps}>
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    );
  }
  if (n === 'edit' || n === 'pencil' || n === 'return' || n === 'import' || n === 'resume') {
    return (
      <svg {...commonProps}>
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    );
  }
  if (n === 'delete' || n === 'trash' || n === 'remove') {
    return (
      <svg {...commonProps}>
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      </svg>
    );
  }
  if (n === 'play' || n === 'open') {
    return (
      <svg {...commonProps}>
        <polygon points="6 4 20 12 6 20 6 4" fill={strokeColor} />
      </svg>
    );
  }
  if (n === 'sync' || n === 'refresh' || n === 'dice') {
    return (
      <svg {...commonProps}>
        <polyline points="23 4 23 10 17 10" />
        <polyline points="1 20 1 14 7 14" />
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
      </svg>
    );
  }
  if (n === 'medal' || n === 'trophy' || n === 'award') {
    return (
      <svg {...commonProps}>
        <circle cx="12" cy="8" r="6" />
        <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
      </svg>
    );
  }
  if (n === 'star') {
    return (
      <svg {...commonProps}>
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    );
  }
  if (n === 'lock') {
    return (
      <svg {...commonProps}>
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    );
  }
  if (n === 'unlock') {
    return (
      <svg {...commonProps}>
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 9.9-1" />
      </svg>
    );
  }
  if (n === 'search') {
    return (
      <svg {...commonProps}>
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    );
  }
  if (n === 'arrow-left' || n === 'arrow-back') {
    return (
      <svg {...commonProps}>
        <line x1="19" y1="12" x2="5" y2="12" />
        <polyline points="12 19 5 12 12 5" />
      </svg>
    );
  }
  if (n === 'arrow-right') {
    return (
      <svg {...commonProps}>
        <line x1="5" y1="12" x2="19" y2="12" />
        <polyline points="12 5 19 12 12 19" />
      </svg>
    );
  }
  if (n === 'student' || n === 'students' || n === 'profile' || n === 'user' || n === 'member' || n === 'members' || n === 'student-profile') {
    return (
      <svg {...commonProps}>
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    );
  }
  if (n === 'book' || n === 'books' || n === 'course' || n === 'courses' || n === 'catalog' || n === 'document-book') {
    return (
      <svg {...commonProps}>
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    );
  }
  if (n === 'logout') {
    return (
      <svg {...commonProps}>
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </svg>
    );
  }

  // Default document/survey/card icon
  return (
    <svg {...commonProps}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}

export default function AppIcon({
  name,
  color = 'white',
  size = 20,
  className = '',
  style = {},
  alt = '',
}) {
  const [hasError, setHasError] = useState(false);

  const config = ICON_REGISTRY[name];
  const selectedColor = normalizeColor(color);
  const selectedSize = getClosestSize(size);
  const strokeColor = getStrokeColor(color);

  const hasStaticColor = config && Array.isArray(config.colors) && config.colors.includes(selectedColor);

  if (!config || !hasStaticColor || hasError) {
    return renderInlineVectorIcon(name, strokeColor, size, className, style);
  }

  const iconSrc = `/icon/${config.folder}/${config.prefix}${selectedColor}-${selectedSize}.svg`;

  return (
    <img
      src={iconSrc}
      alt={alt || name || 'icon'}
      width={size}
      height={size}
      onError={() => setHasError(true)}
      className={`inline-block flex-shrink-0 select-none ${className}`}
      style={{
        width: size,
        height: size,
        objectFit: 'contain',
        verticalAlign: 'middle',
        ...style,
      }}
    />
  );
}
