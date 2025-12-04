import { createTheme } from '@mui/material/styles';

export const getTheme = (mode) => createTheme({
  palette: {
    mode,
    primary: {
      main: mode === 'dark' ? '#4A90E2' : '#1976d2',
      light: mode === 'dark' ? '#6BA3E8' : '#42a5f5',
      dark: mode === 'dark' ? '#3A7BC8' : '#1565c0',
    },
    secondary: {
      main: mode === 'dark' ? '#FF6B6B' : '#f44336',
      light: mode === 'dark' ? '#FF8787' : '#ef5350',
      dark: mode === 'dark' ? '#E85555' : '#d32f2f',
    },
    success: {
      main: mode === 'dark' ? '#4CAF50' : '#2e7d32',
    },
    background: {
      default: mode === 'dark' ? '#121212' : '#f5f5f5',
      paper: mode === 'dark' ? '#1E1E1E' : '#ffffff',
    },
    text: {
      primary: mode === 'dark' ? '#FFFFFF' : '#000000',
      secondary: mode === 'dark' ? '#B0B0B0' : '#666666',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
      letterSpacing: '-0.01em',
    },
    h3: {
      fontSize: '1.5rem',
      fontWeight: 600,
    },
    h4: {
      fontSize: '1.25rem',
      fontWeight: 600,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 24,
          padding: '10px 24px',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          },
          '&:focus-visible': {
            outline: `3px solid ${mode === 'dark' ? '#4A90E2' : '#1976d2'}`,
            outlineOffset: 2,
          },
        },
        contained: {
          '&:hover': {
            boxShadow: '0 6px 16px rgba(0,0,0,0.2)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: mode === 'dark' 
            ? '0 2px 12px rgba(0,0,0,0.4)' 
            : '0 2px 12px rgba(0,0,0,0.08)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            '&:focus-within': {
              boxShadow: `0 0 0 3px ${mode === 'dark' ? 'rgba(74, 144, 226, 0.3)' : 'rgba(25, 118, 210, 0.2)'}`,
            },
          },
        },
      },
    },
    MuiRadio: {
      styleOverrides: {
        root: {
          '&:focus-visible': {
            outline: `3px solid ${mode === 'dark' ? '#4A90E2' : '#1976d2'}`,
            outlineOffset: 2,
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          '&:focus-visible': {
            outline: `3px solid ${mode === 'dark' ? '#4A90E2' : '#1976d2'}`,
            outlineOffset: 2,
          },
        },
      },
    },
    MuiLink: {
      styleOverrides: {
        root: {
          '&:focus-visible': {
            outline: `3px solid ${mode === 'dark' ? '#4A90E2' : '#1976d2'}`,
            outlineOffset: 2,
            borderRadius: 4,
          },
        },
      },
    },
  },
});

export default getTheme;
