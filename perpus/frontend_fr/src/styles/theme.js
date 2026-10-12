// Design System Color Palette & Theme Tokens
export const themeColors = {
  primary: {
    DEFAULT: '#4F46E5', // Indigo 600
    hover: '#4338CA',   // Indigo 700
    light: '#EEF2FF',   // Indigo 50
    dark: '#312E81',    // Indigo 900
    text: '#ffffff',
  },
  secondary: {
    DEFAULT: '#0EA5E9', // Sky 500
    hover: '#0284C7',
    light: '#F0F9FF',
  },
  success: {
    DEFAULT: '#10B981', // Emerald 500
    bg: '#ECFDF5',
    text: '#065F46',
    border: '#A7F3D0',
  },
  warning: {
    DEFAULT: '#F59E0B', // Amber 500
    bg: '#FFFBEB',
    text: '#92400E',
    border: '#FDE68A',
  },
  danger: {
    DEFAULT: '#EF4444', // Red 500
    bg: '#FEF2F2',
    text: '#991B1B',
    border: '#FECACA',
  },
  neutral: {
    bgLight: '#F8FAFC',    // Slate 50
    cardLight: '#FFFFFF',  // Pure White
    textMainLight: '#0F172A', // Slate 900 (High contrast)
    textSubLight: '#475569',  // Slate 600
    borderLight: '#E2E8F0',   // Slate 200

    bgDark: '#0B0F19',     // Rich Deep Slate
    cardDark: '#131C2E',   // Card Surface
    textMainDark: '#F8FAFC',  // Slate 50 (High contrast)
    textSubDark: '#94A3B8',   // Slate 400
    borderDark: '#1E293B',    // Slate 800
  },
};

export function PaletteColorSample() {
  return (
    <div className="flex gap-2 items-center text-xs font-semibold">
      <span className="w-3 h-3 rounded-full bg-indigo-600 inline-block"></span>
      <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span>
      <span className="w-3 h-3 rounded-full bg-amber-500 inline-block"></span>
      <span className="w-3 h-3 rounded-full bg-rose-500 inline-block"></span>
    </div>
  );
}
