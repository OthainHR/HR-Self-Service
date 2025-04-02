import React, { Component } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Box, CssBaseline, Container, CircularProgress } from '@mui/material';
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
import { AuthProvider, useAuth } from './contexts/AuthContext';

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

// Simple Error Boundary component
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error: error };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      console.error("ErrorBoundary rendering fallback UI due to error:", this.state.error);
      return <h1>Something went wrong rendering this section. Error: {this.state.error?.message || 'Unknown error'}</h1>;
    }

    return this.props.children;
  }
}

// Protected route component
const ProtectedRoute = ({ children }) => {
  // Get state from useAuth
  const { user, isLoading } = useAuth();
  const isAuthenticated = !!user; // Derive boolean from user object

  if (isLoading) {
    // Show a loading indicator while checking auth state
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Box>;
  }

  // Check the boolean state
  if (!isAuthenticated) {
    console.log('ProtectedRoute: Not authenticated, redirecting to login.');
    return <Navigate to="/login" replace />; // Use replace to avoid login page in history
  }

  // Render children if authenticated
  return children;
};

// Admin route component
const AdminRoute = ({ children }) => {
  const { user, isLoading } = useAuth();
  const [renderCount, setRenderCount] = React.useState(0); // Add render count state

  React.useEffect(() => { // Increment render count on mount/update
      setRenderCount(prev => prev + 1);
  }, [user, isLoading]);


  // ---- Add AdminRoute Debug Log ----
  console.log(`--- AdminRoute Render #${renderCount} ---`); // Log render count
  console.log(`AdminRoute #${renderCount}: isLoading=${isLoading}`);
  // Log only email for brevity, handle null case
  console.log(`AdminRoute #${renderCount}: user email=`, user ? user.email : user);
  // ---- End AdminRoute Debug Log ----

  if (isLoading) {
    console.log(`AdminRoute #${renderCount}: Rendering Loading Indicator...`);
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Box>;
  }

  const isAuthenticated = !!user;
  const isAdmin = user?.email === 'admin@example.com';
  console.log(`AdminRoute #${renderCount}: Post-loading check -> isAuthenticated=${isAuthenticated}, isAdmin=${isAdmin}`);

  if (!isAuthenticated) {
    console.log(`AdminRoute #${renderCount}: Not authenticated, redirecting to login.`);
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    console.warn(`AdminRoute #${renderCount}: User is not an admin. Redirecting to chat.`, user?.email);
    return <Navigate to="/chat" replace />;
  }

  console.log(`AdminRoute #${renderCount}: Checks passed. Preparing to render children.`); // Modified log
  // Wrap children in Error Boundary
  return (
    <ErrorBoundary>
      {children}
    </ErrorBoundary>
  );
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
