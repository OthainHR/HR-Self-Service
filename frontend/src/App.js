import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Box, CssBaseline, Container } from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { ListItem, ListItemIcon, ListItemText } from '@mui/material';
import { Link } from 'react-router-dom';
import { LibraryBooks as LibraryBooksIcon } from '@mui/icons-material';

// Components
import NavBar from './components/NavBar';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Chat from './pages/Chat';
import Knowledge from './pages/Knowledge';


// Context
import { AuthProvider, useAuth } from './context/AuthContext';

// Create theme
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#4361ee', // Modern blue
      light: '#738eef',
      dark: '#2f44b0',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#f72585', // Vibrant pink
      light: '#fa5ba0',
      dark: '#c31970',
      contrastText: '#ffffff',
    },
    background: {
      default: '#f8f9fa',
      paper: '#ffffff',
    },
    info: {
      main: '#4cc9f0', // Light blue
    },
    success: {
      main: '#4cd97b', // Green
    },
    warning: {
      main: '#febc2c', // Yellow
    },
    error: {
      main: '#f72585', // Pink/red
    },
    divider: 'rgba(0,0,0,0.08)',
  },
  typography: {
    fontFamily: '"Lexend", sans-serif',
    h1: {
      fontWeight: 700,
    },
    h2: {
      fontWeight: 700,
    },
    h3: {
      fontWeight: 600,
    },
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 500,
    },
    button: {
      fontWeight: 600,
      textTransform: 'none',
    },
    body1: {
      fontFamily: '"Lexend", sans-serif',
    },
    body2: {
      fontFamily: '"Lexend", sans-serif',
    },
    subtitle1: {
      fontFamily: '"Lexend", sans-serif',
    },
    subtitle2: {
      fontFamily: '"Lexend", sans-serif',
    },
    caption: {
      fontFamily: '"Lexend", sans-serif',
    },
    overline: {
      fontFamily: '"Lexend", sans-serif',
    },
  },
  shape: {
    borderRadius: 12,
  },
  shadows: [
    'none',
    '0px 2px 4px rgba(0,0,0,0.05)',
    '0px 4px 8px rgba(0,0,0,0.08)',
    '0px 6px 12px rgba(0,0,0,0.1)',
    '0px 8px 16px rgba(0,0,0,0.12)',
    // Rest of the shadows array
    ...Array(20).fill('0px 10px 20px rgba(0,0,0,0.15)'),
  ],
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '10px 16px',
          boxShadow: '0px 2px 4px rgba(0,0,0,0.05)',
        },
        contained: {
          boxShadow: '0px 4px 8px rgba(0,0,0,0.08)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: '0px 4px 10px rgba(0,0,0,0.05)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0px 4px 10px rgba(0,0,0,0.05)',
        },
      },
    },
  },
});

// Protected route component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated()) {
    return <Navigate to="/login" />;
  }

  return children;
};

// Admin route component
const AdminRoute = ({ children }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated()) {
    return <Navigate to="/login" />;
  }

  if (!isAdmin()) {
    return <Navigate to="/" />;
  }

  return children;
};

// Main app component
const AppContent = () => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <CssBaseline />
      <NavBar />
      <Container component="main" sx={{ flexGrow: 1, p: 3, pt: 4 }}>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          

          {/* Protected routes */}
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/chat" 
            element={
              <ProtectedRoute>
                <Chat />
              </ProtectedRoute>
            } 
          />

          {/* Admin routes */}
          <Route 
            path="/knowledge" 
            element={
              <AdminRoute>
                <Knowledge />
              </AdminRoute>
            } 
          />

          {/* Redirect to homepage for any other route */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Container>
    </Box>
  );
};

// Wrap app with providers
const App = () => {
  return (
    <ThemeProvider theme={theme}>
      <Router>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
};

export default App;
