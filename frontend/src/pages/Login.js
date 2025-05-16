import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Container,
  Paper,
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Link,
  useTheme
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useDarkMode } from '../contexts/DarkModeContext';
import Avatar from '@mui/material/Avatar';
import DisclaimerOverlay from '../components/DisclaimerOverlay';
import { recordDisclaimerAcknowledgement } from '../supabaseClient';

const Login = () => {
  const { login, isLoading, error: authError, user } = useAuth();
  const navigate = useNavigate();
  const { isDarkMode } = useDarkMode();
  const theme = useTheme();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const [isDisclaimerVisible, setIsDisclaimerVisible] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');

    if (!username || !password) {
      setLocalError('Please enter both email and password.');
      return;
    }

    try {
      await login({ email: username, password });
    } catch (err) {
      
    }
  };

  useEffect(() => {
    if (user) {
      const needsToShowDisclaimer = localStorage.getItem('pendingDisclaimer') === 'true';
      const alreadyAcknowledgedThisLogin = localStorage.getItem('disclaimerAcknowledgedThisLogin') === 'true';

      if (needsToShowDisclaimer && !alreadyAcknowledgedThisLogin) {
        setIsDisclaimerVisible(true);
      } else {
        navigate('/chat');
      }
    }
  }, [user, navigate]);

  const handleAcknowledgeDisclaimer = async () => {
    if (user && user.email) {
      try {
        const { error: recordError } = await recordDisclaimerAcknowledgement(user.email);
        if (recordError) {
          console.error('[Login.js] Failed to record disclaimer acknowledgement via RPC:', recordError.message);
          console.error('[Login.js] Full Supabase RPC error object:', recordError);
        }
      } catch (e) {
        console.error('[Login.js] Exception caught while calling recordDisclaimerAcknowledgement (RPC):', e);
      }
    } else {
      console.warn('[Login.js] User object or email missing; cannot record disclaimer acknowledgement.');
    }

    setIsDisclaimerVisible(false);
    localStorage.setItem('disclaimerAcknowledgedThisLogin', 'true');
    localStorage.removeItem('pendingDisclaimer');
    navigate('/chat');
  };

  if (isDisclaimerVisible) {
    return <DisclaimerOverlay open={isDisclaimerVisible} onClose={handleAcknowledgeDisclaimer} />;
  }

  return (
    <Container component="main" maxWidth="xs" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 64px)' }}>
      <Paper elevation={6} sx={{ padding: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', borderRadius: 2 }}>
        <Avatar sx={{ m: 1, bgcolor: 'transparent', width: 56, height: 56 }}>
          <img 
            src={isDarkMode ? '/othainlogopreview.png' : '/OthainOcolor.png'}
            alt="Othain Logo"
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        </Avatar>
        <Typography component="h1" variant="h5" sx={{ mt: 1 }}>
          Sign In
        </Typography>
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1, width: '100%' }}>
          {(localError || authError) && (
            <Alert severity="error" sx={{ mb: 2, width: '100%' }}>
              {localError || (authError && typeof authError === 'string' ? authError : 'Login failed. Please check your credentials.')}
            </Alert>
          )}
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email Address"
            name="email"
            autoComplete="email"
            color={isDarkMode ? 'secondary' : 'primary'}
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={isLoading}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Password"
            type="password"
            id="password"
            autoComplete="current-password"
            color={isDarkMode ? 'secondary' : 'primary'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
          />
          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            disabled={isLoading}
            sx={{
              mt: 3,
              mb: 2,
              py: 1.2,
              fontSize: '1.1rem',
              borderRadius: 30,
              backgroundColor: 'rgba(17, 179, 207, 0.8)',
              '&:hover': {
                backgroundColor: 'rgba(17, 179, 207, 1)',
              }
            }}
          >
            {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
          </Button>
          <Box textAlign="center">
            <Link component={RouterLink} to="/register" variant="body2" sx={{ color: isDarkMode ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 120, 141, 0.8)' }}>
              {"Don't have an account? Sign Up"}
            </Link>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default Login;
