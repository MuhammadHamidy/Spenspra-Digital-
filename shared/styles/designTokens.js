/**
 * DESIGN TOKENS TERPUSAT SPENSPRA
 * Sesuai dengan DESIGN fix.md
 */

export const colors = {
  primary: {
    50: '#FAF9FD',
    100: '#EDEAF5',
    300: '#B9B0D2',
    500: '#4B3B78',
    700: '#3D2E66',
    800: '#30264F',
    1000: '#171329',
  },
  secondary: {
    50: '#F8FCFE',
    100: '#E4F1F8',
    300: '#A8CBDD',
    500: '#4F8FBB',
    700: '#397394',
    800: '#2E607C',
    1000: '#183A4B',
  },
  accent: {
    50: '#FFFDF5',
    100: '#FFF6D6',
    300: '#F9DD82',
    500: '#F2C94C',
    700: '#D8A91F',
    800: '#A97E0D',
    1000: '#5C4305',
  },
  success: {
    50: '#F7FCF9',
    300: '#A9D8BC',
    500: '#2E7D5B',
    800: '#1C5038',
  },
  danger: {
    50: '#FFF9F8',
    300: '#F1B4AC',
    500: '#C0392B',
    800: '#7D261E',
  },
  neutral: {
    50: '#FFFFFF',
    100: '#F8F9FC',
    300: '#E5E7EB',
    500: '#98A2B3',
    700: '#667085',
    800: '#344054',
    1000: '#172033',
  },
};

export const typography = {
  fontFamily: '"Poppins", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontSize: {
    display: ['32px', { lineHeight: '1.25', fontWeight: '700' }],
    h1: ['28px', { lineHeight: '1.3', fontWeight: '700' }],
    h2: ['24px', { lineHeight: '1.3', fontWeight: '700' }],
    h3: ['20px', { lineHeight: '1.4', fontWeight: '700' }],
    bodyLarge: ['16px', { lineHeight: '1.5', fontWeight: '600' }],
    body: ['16px', { lineHeight: '1.5', fontWeight: '400' }],
    small: ['12px', { lineHeight: '1.5', fontWeight: '400' }],
    caption: ['10px', { lineHeight: '1.4', fontWeight: '400' }],
  },
};

export const borderRadius = {
  sm: '6px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  full: '999px',
};

export const shadows = {
  sm: '0 1px 2px rgba(23, 32, 51, 0.08)',
  md: '0 4px 12px rgba(23, 32, 51, 0.08)',
  lg: '0 12px 24px rgba(23, 32, 51, 0.12)',
};
