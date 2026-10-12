import { createTheme } from '@mui/material/styles';

// Theme diselaraskan dengan DESIGN fix.md
export const theme = createTheme({
  palette: {
    primary: {
      main: '#4B3B78', // Primary-500 Purple
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
      main: '#F2C94C', // Accent-500
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
    body1: { fontSize: '16px', fontWeight: 400, color: '#172033' },
    body2: { fontSize: '14px', fontWeight: 400, color: '#667085' },
    caption: { fontSize: '10px', fontWeight: 400, color: '#667085' },
  },
  shape: {
    borderRadius: 8, // Radius MD
  },
  components: {
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 16px',
          fontWeight: 600,
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: '1px solid #E2E8F0',
          boxShadow: 'none',
          backgroundImage: 'none',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          boxShadow: 'none',
        },
        rounded: {
          borderRadius: 12,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 16,
          border: '1px solid #E2E8F0',
          boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12)',
        },
      },
    },
  },
});

export default theme;
