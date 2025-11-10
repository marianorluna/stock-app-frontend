import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#6b9a92'
    },
    background: {
      default: '#f8fafc'
    }
  },
  typography: {
    fontFamily: 'Inter, Roboto, sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 600
    }
  },
  shape: {
    borderRadius: 10
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8
        }
      }
    }
  }
});

export default theme;

