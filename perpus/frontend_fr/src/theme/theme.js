import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    primary: {
      main: '#1A3D63', // Ocean Blue
      dark: '#0A1931', // Dark Navy
      light: '#4A7FA7', // Slate Blue
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#4A7FA7', // Slate Blue
      light: '#B3CFE5', // Powder Blue
      dark: '#1A3D63',
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#F6FAFD',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#0A1931',
      secondary: '#4A7FA7',
    },
    success: {
      main: '#059669', // Emerald
      light: '#34D399',
      dark: '#047857',
      contrastText: '#FFFFFF',
    },
    error: {
      main: '#E11D48', // Rose
      light: '#FB7185',
      dark: '#BE123C',
      contrastText: '#FFFFFF',
    },
    warning: {
      main: '#D97706', // Amber
      light: '#FBBF24',
      dark: '#B45309',
      contrastText: '#FFFFFF',
    },
    info: {
      main: '#2563EB',
      light: '#60A5FA',
      dark: '#1D4ED8',
      contrastText: '#FFFFFF',
    },
    divider: '#B3CFE5',
  },
  typography: {
    fontFamily: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'].join(','),
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
    h1: { fontWeight: 800, color: '#0A1931' },
    h2: { fontWeight: 800, color: '#0A1931' },
    h3: { fontWeight: 700, color: '#0A1931' },
    h4: { fontWeight: 700, color: '#0A1931' },
    h5: { fontWeight: 700, color: '#0A1931' },
    h6: { fontWeight: 600, color: '#0A1931' },
  },
  shape: {
    borderRadius: 14,
  },
  components: {
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 12,
          padding: '8px 18px',
          fontWeight: 700,
          transition: 'all 0.15s ease-in-out',
          '&:active': {
            transform: 'scale(0.98)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          border: '1px solid #B3CFE5',
          boxShadow: '0 4px 20px -2px rgba(26, 61, 99, 0.08)',
          backgroundImage: 'none',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        rounded: {
          borderRadius: 16,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 24,
          border: '1px solid #B3CFE5',
          boxShadow: '0 20px 40px -10px rgba(10, 25, 49, 0.25)',
        },
      },
    },
  },
});

export default theme;
