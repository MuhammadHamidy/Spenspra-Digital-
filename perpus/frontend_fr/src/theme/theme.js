import { createTheme } from '@mui/material/styles';

// Theme diselaraskan dengan Spenspra Design System (shared/styles/design-tokens.css)
export const theme = createTheme({
  palette: {
    primary: {
      main: '#4B3B78', // Primary-500 Purple (Brand Utama)
      dark: '#30264F', // Primary-800
      light: '#B9B0D2', // Primary-300
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#4F8FBB', // Secondary-500 Blue
      light: '#A8CBDD', // Secondary-300
      dark: '#2E607C', // Secondary-800
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#F8F9FC', // Neutral-100
      paper: '#FFFFFF',   // Neutral-50
    },
    text: {
      primary: '#172033',   // Neutral-1000
      secondary: '#667085', // Neutral-700
      disabled: '#98A2B3',  // Neutral-500
    },
    success: {
      main: '#2E7D5B', // Success-500
      light: '#A9D8BC', // Success-300
      dark: '#1C5038', // Success-800
      contrastText: '#FFFFFF',
    },
    error: {
      main: '#C0392B', // Danger-500
      light: '#F1B4AC', // Danger-300
      dark: '#7D261E', // Danger-800
      contrastText: '#FFFFFF',
    },
    warning: {
      main: '#F2C94C', // Accent-500 Yellow
      light: '#F9DD82', // Accent-300
      dark: '#A97E0D', // Accent-800
      contrastText: '#172033',
    },
    info: {
      main: '#4F8FBB',
      light: '#E4F1F8',
      dark: '#183A4B',
      contrastText: '#FFFFFF',
    },
    divider: '#E5E7EB', // Neutral-300
  },
  typography: {
    fontFamily: ['"Poppins"', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'].join(','),
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
    h1: { fontSize: '28px', fontWeight: 700, color: '#172033' },
    h2: { fontSize: '24px', fontWeight: 700, color: '#172033' },
    h3: { fontSize: '20px', fontWeight: 700, color: '#172033' },
    h4: { fontSize: '18px', fontWeight: 700, color: '#172033' },
    body1: { fontSize: '14px', color: '#172033' },
    body2: { fontSize: '12px', color: '#667085' },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '10px',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 2px 4px rgba(75, 59, 120, 0.15)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: '16px',
          boxShadow: '0 1px 3px rgba(23, 32, 51, 0.05)',
          border: '1px solid #E5E7EB',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        rounded: {
          borderRadius: '16px',
        },
      },
    },
  },
});

export default theme;
