/**
 * Theme and style constants for UI components
 * Centralized theme configuration for consistent styling across the application
 */
export const THEME = {
  colors: {
    primary: '#646cff',
    primaryHover: '#7c84ff',
    secondary: '#a5acff',
    success: '#4CAF50',
    warning: '#FFC107',
    error: '#ff3e3e',
    background: {
      main: '#242424',
      darker: '#2a2a2a',
      control: '#333',
      card: '#333',
      light: 'rgba(255, 255, 255, 0.03)',
    },
    border: '#444',
    text: {
      primary: 'rgba(255, 255, 255, 0.87)',
      secondary: '#888',
      accent: '#646cff',
    },
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    xxl: '3rem',
  },
  borderRadius: {
    sm: '3px',
    md: '4px',
    lg: '8px',
    xl: '12px',
  },
  fontSizes: {
    small: '0.8em',
    normal: '1rem',
    medium: '1.2em',
    large: '1.4em',
    xlarge: '1.8em',
    xxlarge: '2.5em',
  },
  shadows: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.1)',
    md: '0 2px 4px rgba(0, 0, 0, 0.1)',
    lg: '0 4px 8px rgba(0, 0, 0, 0.1)',
    xl: '0 8px 16px rgba(0, 0, 0, 0.1)',
  },
  transitions: {
    fast: '0.2s ease',
    medium: '0.3s ease',
    slow: '0.5s ease',
  },
  breakpoints: {
    xs: '480px',
    sm: '768px',
    md: '992px',
    lg: '1200px',
  },
  layout: {
    maxWidth: '1200px',
    containerPadding: '2rem',
    sectionSpacing: '3rem',
  },
};
