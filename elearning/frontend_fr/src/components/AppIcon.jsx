'use client';

import React, { useState } from 'react';

// Maps requested icon names to corresponding directory & prefix inside /public/icon/
const ICON_REGISTRY = {
  dashboard: { folder: 'dashboard', prefix: '' },
  presence: { folder: 'presence', prefix: '' },
  attendance: { folder: 'presence', prefix: '' },
  scan: { folder: 'presence', prefix: '' },
  camera: { folder: 'presence', prefix: '' },
  image: { folder: 'presence', prefix: '' },
  schedule: { folder: 'schedule', prefix: '' },
  calendar: { folder: 'schedule', prefix: '' },
  sessions: { folder: 'schedule', prefix: '' },
  rekap: { folder: 'survey', prefix: '' },
  survey: { folder: 'survey', prefix: '' },
  edit: { folder: 'edit', prefix: '' },
  pencil: { folder: 'edit', prefix: '' },
  delete: { folder: 'delete', prefix: '' },
  trash: { folder: 'delete', prefix: '' },
  remove: { folder: 'delete', prefix: '' },
  profile: { folder: 'profile', prefix: 'secondary-' },
  user: { folder: 'profile', prefix: 'secondary-' },
  course: { folder: 'course', prefix: 'outline-' },
  courses: { folder: 'course', prefix: 'outline-' },
  book: { folder: 'course', prefix: 'outline-' },
  books: { folder: 'course', prefix: 'outline-' },
  catalog: { folder: 'course', prefix: 'outline-' },
  student: { folder: 'student-profile', prefix: '' },
  students: { folder: 'student-profile', prefix: '' },
  member: { folder: 'student-profile', prefix: '' },
  members: { folder: 'student-profile', prefix: '' },
  'student-profile': { folder: 'student-profile', prefix: '' },
  circulation: { folder: 'schedule', prefix: '' },
  loans: { folder: 'schedule', prefix: '' },
  borrow: { folder: 'schedule', prefix: '' },
  return: { folder: 'edit', prefix: '' },
  kiosk: { folder: 'presence', prefix: '' },
  barcode: { folder: 'registration', prefix: '' },
  print: { folder: 'survey', prefix: '' },
  import: { folder: 'edit', prefix: '' },
  insights: { folder: 'survey', prefix: '' },
  resume: { folder: 'edit', prefix: '' },
  logout: { folder: 'logout', prefix: '' },
  home: { folder: 'home', prefix: '' },
  admin: { folder: 'admin', prefix: '' },
  register: { folder: 'registration', prefix: '' },
  registration: { folder: 'registration', prefix: '' },
  search: { folder: 'search', prefix: '' },
  setting: { folder: 'setting', prefix: '' },
  timer: { folder: 'timer', prefix: '' },
  clock: { folder: 'timer', prefix: '' },
  notification: { folder: 'notification', prefix: '' },
  lock: { folder: 'lock', prefix: '' },
  unlock: { folder: 'unlock', prefix: '' },
  link: { folder: 'link', prefix: '' },
  copy: { folder: 'copy', prefix: '' },
  file: { folder: 'file', prefix: '' },
  document: { folder: 'file', prefix: '' },
  'document-book': { folder: 'document-book', prefix: '' },
  medal: { folder: 'medal', prefix: '' },
  star: { folder: 'star', prefix: 'outline-' },
  trophy: { folder: 'medal', prefix: '' },
  award: { folder: 'medal', prefix: '' },
  sync: { folder: 'sync', prefix: '' },
  refresh: { folder: 'sync', prefix: '' },
  dice: { folder: 'sync', prefix: '' },
  'arrow-left': { folder: 'arrow-left', prefix: '' },
  'arrow-right': { folder: 'arrow-right', prefix: '' },
  'arrow-back': { folder: 'arrow-back', prefix: '' },
  tick: { folder: 'tick', prefix: '' },
  check: { folder: 'tick', prefix: '' },
  'circle-tick': { folder: 'circle-tick', prefix: '' },
  'circle-add': { folder: 'circle-add', prefix: '' },
  add: { folder: 'circle-add', prefix: '' },
  plus: { folder: 'circle-add', prefix: '' },
  'close-cancel': { folder: 'close-cancel', prefix: '' },
  close: { folder: 'close-cancel', prefix: '' },
  cancel: { folder: 'close-cancel', prefix: '' },
  caution: { folder: 'caution', prefix: '' },
  warning: { folder: 'caution', prefix: '' },
  checkbox: { folder: 'checkbox', prefix: 'outline-' },
  'radio-button-active': { folder: 'radio-button-active', prefix: '' },
  'radio-button-inactive': { folder: 'radio-button-active', prefix: '' },
  radio: { folder: 'radio-button-active', prefix: '' },
  more: { folder: 'more', prefix: '' },
  play: { folder: 'open', prefix: '' },
  open: { folder: 'open', prefix: '' },
  graduation: { folder: 'graduation', prefix: '' },
  building: { folder: 'building', prefix: '' },
};

const VALID_SIZES = [12, 16, 20, 24, 32];
const VALID_COLORS = ['black', 'blue', 'green', 'grey', 'red', 'white', 'yellow'];

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
  if (c === 'gray') return 'grey';
  if (c === 'emerald') return 'green';
  if (c === 'indigo' || c === 'purple' || c === 'violet') return 'blue';
  if (c === 'amber' || c === 'gold') return 'yellow';
  if (VALID_COLORS.includes(c)) return c;
  return 'blue';
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

  const config = ICON_REGISTRY[name] || { folder: name || 'dashboard', prefix: '' };
  const selectedColor = normalizeColor(color);
  const selectedSize = getClosestSize(size);
  const iconSrc = `/icon/${config.folder}/${config.prefix}${selectedColor}-${selectedSize}.svg`;

  if (hasError) {
    // Graceful fallback to colored dot
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
            backgroundColor: color === 'white' ? '#FFFFFF' : '#1A3D63',
          }}
        />
      </span>
    );
  }

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
