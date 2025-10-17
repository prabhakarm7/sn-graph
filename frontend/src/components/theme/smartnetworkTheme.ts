// theme/smartNetworkTheme.ts - Smart Network Intelligence theme configuration
import { createTheme, ThemeOptions } from '@mui/material/styles';

// Smart Network color palette - Professional & Elegant
const smartNetworkColors = {
  primary: '#8B6F47',      // Warm brown
  primaryLight: '#A68A5C',
  primaryDark: '#6B5437',
  background: '#F5F1E8',   // Cream beige
  surface: '#FFFFFF',      // Pure white
  border: '#D4C4A8',       // Soft brown border
  textPrimary: '#000000',
  textSecondary: '#4A4A4A',
  textTertiary: '#8B6F47',
  black: '#000000',
  success: '#2D5016',      // Dark green
  warning: '#CC5500',      // Burnt orange
  info: '#1C3A70',         // Navy
  divider: '#D4C4A8'
};

// Dark theme colors (modern tech aesthetic)
const darkColors = {
  primary: '#6366f1',
  secondary: '#8b5cf6',
  background: '#0f172a',
  surface: '#1e293b',
  border: '#334155',
  textPrimary: '#ffffff',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  success: '#10b981',
  warning: '#f59e0b',
  info: '#3b82f6'
};

// Light theme (Smart Network professional style)
export const smartNetworkLightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: smartNetworkColors.primary,
      light: smartNetworkColors.primaryLight,
      dark: smartNetworkColors.primaryDark,
      contrastText: '#FFFFFF'
    },
    secondary: {
      main: smartNetworkColors.black,
      light: smartNetworkColors.textSecondary,
      dark: smartNetworkColors.black,
      contrastText: '#FFFFFF'
    },
    background: {
      default: smartNetworkColors.background,
      paper: smartNetworkColors.surface
    },
    text: {
      primary: smartNetworkColors.textPrimary,
      secondary: smartNetworkColors.textSecondary
    },
    divider: smartNetworkColors.divider,
    success: {
      main: smartNetworkColors.success,
      light: '#4A7028',
      dark: '#1F3A10'
    },
    warning: {
      main: smartNetworkColors.warning,
      light: '#E67300',
      dark: '#994000'
    },
    info: {
      main: smartNetworkColors.info,
      light: '#2E5AA0',
      dark: '#122850'
    }
  },
  typography: {
    fontFamily: '"Inter", "Helvetica Neue", Arial, sans-serif',
    h1: {
      fontFamily: '"Playfair Display", Georgia, serif',
      fontWeight: 700,
      fontSize: '3.5rem',
      color: smartNetworkColors.textPrimary,
      letterSpacing: '-0.02em'
    },
    h2: {
      fontFamily: '"Playfair Display", Georgia, serif',
      fontWeight: 700,
      fontSize: '2.5rem',
      color: smartNetworkColors.textPrimary
    },
    h3: {
      fontFamily: '"Playfair Display", Georgia, serif',
      fontWeight: 700,
      fontSize: '2rem',
      color: smartNetworkColors.textPrimary
    },
    h4: {
      fontFamily: '"Playfair Display", Georgia, serif',
      fontWeight: 700,
      fontSize: '1.5rem',
      color: smartNetworkColors.textPrimary
    },
    h6: {
      fontFamily: '"Playfair Display", Georgia, serif',
      fontWeight: 700,
      fontSize: '1.1rem'
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
      color: smartNetworkColors.textSecondary
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.6,
      color: smartNetworkColors.textSecondary
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
      letterSpacing: '0.02em'
    }
  },
  shape: {
    borderRadius: 12
  },
  shadows: [
    'none',
    '0 2px 4px rgba(139, 111, 71, 0.08)',
    '0 2px 8px rgba(139, 111, 71, 0.08)',
    '0 4px 12px rgba(139, 111, 71, 0.12)',
    '0 4px 16px rgba(139, 111, 71, 0.12)',
    '0 8px 24px rgba(139, 111, 71, 0.15)',
    '0 8px 32px rgba(139, 111, 71, 0.15)',
    '0 12px 48px rgba(139, 111, 71, 0.18)',
    '0 16px 64px rgba(139, 111, 71, 0.20)',
    ...Array(16).fill('none')
  ] as any,
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '12px 32px',
          fontWeight: 600,
          fontSize: '0.95rem',
          transition: 'all 0.3s ease'
        },
        contained: {
          backgroundColor: smartNetworkColors.black,
          color: '#FFFFFF',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
          '&:hover': {
            backgroundColor: smartNetworkColors.primary,
            boxShadow: '0 4px 12px rgba(139, 111, 71, 0.25)',
            transform: 'translateY(-1px)'
          }
        },
        outlined: {
          borderColor: smartNetworkColors.primary,
          borderWidth: '2px',
          color: smartNetworkColors.primary,
          '&:hover': {
            borderColor: smartNetworkColors.primaryDark,
            borderWidth: '2px',
            backgroundColor: 'rgba(139, 111, 71, 0.08)'
          }
        },
        text: {
          color: smartNetworkColors.primary,
          '&:hover': {
            backgroundColor: 'rgba(139, 111, 71, 0.08)'
          }
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: smartNetworkColors.surface,
          border: `1px solid ${smartNetworkColors.border}`,
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(139, 111, 71, 0.08)',
          transition: 'all 0.3s ease',
          '&:hover': {
            boxShadow: '0 4px 16px rgba(139, 111, 71, 0.12)',
            transform: 'translateY(-2px)'
          }
        }
      }
    },
    MuiChip: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(139, 111, 71, 0.15)',
          color: smartNetworkColors.primary,
          border: `1px solid rgba(139, 111, 71, 0.3)`,
          fontWeight: 600,
          fontSize: '0.8rem'
        },
        outlined: {
          backgroundColor: 'transparent',
          borderColor: smartNetworkColors.primary,
          color: smartNetworkColors.primary
        }
      }
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            backgroundColor: smartNetworkColors.surface,
            '& fieldset': {
              borderColor: smartNetworkColors.border,
              borderWidth: '1px'
            },
            '&:hover fieldset': {
              borderColor: smartNetworkColors.primary
            },
            '&.Mui-focused fieldset': {
              borderColor: smartNetworkColors.primary,
              borderWidth: '2px'
            }
          },
          '& .MuiInputLabel-root': {
            color: smartNetworkColors.textSecondary,
            '&.Mui-focused': {
              color: smartNetworkColors.primary
            }
          }
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: smartNetworkColors.surface,
          backgroundImage: 'none'
        },
        elevation1: {
          boxShadow: '0 2px 8px rgba(139, 111, 71, 0.08)'
        },
        elevation2: {
          boxShadow: '0 4px 12px rgba(139, 111, 71, 0.12)'
        }
      }
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          color: smartNetworkColors.primary,
          '&:hover': {
            backgroundColor: 'rgba(139, 111, 71, 0.08)'
          }
        }
      }
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: smartNetworkColors.divider
        }
      }
    }
  }
});

// Dark theme (modern tech aesthetic)
export const smartNetworkDarkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: darkColors.primary,
      light: '#818cf8',
      dark: '#4f46e5'
    },
    secondary: {
      main: darkColors.secondary,
      light: '#a78bfa',
      dark: '#7c3aed'
    },
    background: {
      default: darkColors.background,
      paper: darkColors.surface
    },
    text: {
      primary: darkColors.textPrimary,
      secondary: darkColors.textSecondary
    },
    divider: darkColors.border,
    success: {
      main: darkColors.success
    },
    warning: {
      main: darkColors.warning
    },
    info: {
      main: darkColors.info
    }
  },
  typography: {
    fontFamily: '"Inter", "Helvetica Neue", Arial, sans-serif',
    h1: {
      fontWeight: 700,
      fontSize: '3.5rem',
      fontFamily: '"Playfair Display", Georgia, serif'
    },
    h2: {
      fontWeight: 700,
      fontSize: '2.5rem',
      fontFamily: '"Playfair Display", Georgia, serif'
    },
    h3: {
      fontFamily: '"Playfair Display", Georgia, serif',
      fontWeight: 700,
      fontSize: '2rem'
    },
    button: {
      textTransform: 'none',
      fontWeight: 600
    }
  },
  shape: {
    borderRadius: 12
  },
  components: {
    MuiButton: {
      styleOverrides: {
        contained: {
          backgroundColor: darkColors.primary,
          '&:hover': {
            backgroundColor: '#4f46e5'
          }
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: darkColors.surface,
          border: `1px solid ${darkColors.border}`
        }
      }
    }
  }
});

// Export theme getter function
export const getSmartNetworkTheme = (isDark: boolean) => isDark ? smartNetworkDarkTheme : smartNetworkLightTheme;