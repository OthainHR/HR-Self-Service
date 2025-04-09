import React, { lazy, Suspense, Component, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import {
  Box,
  CssBaseline,
  Container,
  CircularProgress,
  ThemeProvider,
  createTheme
} from '@mui/material';
import { ListItem, ListItemIcon, ListItemText } from '@mui/material';
import { Link } from 'react-router-dom';
import { LibraryBooks as LibraryBooksIcon } from '@mui/icons-material';

// Components
import NavBar from './components/NavBar';

// Context
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DarkModeProvider, useDarkMode } from './contexts/DarkModeContext';

// --- LAZY LOAD PAGES --- 
const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const Chat = lazy(() => import('./pages/Chat'));
const Knowledge = lazy(() => import('./pages/Knowledge'));
const Register = lazy(() => import('./pages/Register')); 

// --- THEME DEFINITION --- 
const createAppTheme = (mode) => createTheme({
  palette: {
    mode,
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
      default: mode === 'dark' ? '#121212' : '#f8f9fa',
      paper: mode === 'dark' ? '#1e1e1e' : '#ffffff',
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
    divider: mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
    text: {
      primary: mode === 'dark' ? '#ffffff' : 'rgba(0,0,0,0.87)',
      secondary: mode === 'dark' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
    }
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

// --- UTILITY COMPONENTS --- 

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

// Loading Indicator Component (Example)
const LoadingIndicator = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
    <CircularProgress />
  </Box>
);

// --- CORE APP STRUCTURE --- 

// Main app content with theme provider
const AppContent = () => {
  const { isDarkMode } = useDarkMode();
  
  // Create the theme based on dark mode state
  const theme = useMemo(() => 
    createAppTheme(isDarkMode ? 'dark' : 'light'),
    [isDarkMode]
  );

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <CssBaseline />
        <NavBar />
        <Container component="main" sx={{ flexGrow: 1, p: 3, pt: 4 }}>
           {/* Routes are rendered here, Suspense handles loading */}
           <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} /> {/* Add Register route */}
            
            {/* Protected routes */}
            <Route 
              path="/"
              element={<ProtectedRoute><Home /></ProtectedRoute>}
            />
            <Route 
              path="/chat"
              element={<ProtectedRoute><Chat /></ProtectedRoute>}
            />

            {/* Admin routes */}
            <Route 
              path="/knowledge"
              element={<AdminRoute><Knowledge /></AdminRoute>}
            />

            {/* Redirect to homepage for any other route */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Container>
      </Box>
    </ThemeProvider>
  );
};

// Wrap app with providers and Suspense
const App = () => {
  return (
    <Router>
      <DarkModeProvider>
        <AuthProvider>
          <Suspense fallback={<LoadingIndicator />}>
            <AppContent /> 
          </Suspense>
        </AuthProvider>
      </DarkModeProvider>
    </Router>
  );
};

export default App;
