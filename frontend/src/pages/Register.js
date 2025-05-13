import React, { useState } from 'react';
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
  useTheme // Import useTheme
} from '@mui/material';
import Avatar from '@mui/material/Avatar';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'; // Or maybe PersonAddAlt1Icon?
import { useDarkMode } from '../contexts/DarkModeContext';

const Register = () => {
  const { signup, isLoading, error: authError } = useAuth(); // Use signup
  const navigate = useNavigate();
  const { isDarkMode } = useDarkMode();
  const theme = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    setSuccessMessage('');

    if (!email || !password || !confirmPassword) {
      setLocalError('Please fill in all fields.');
      return;
    }
    if (password !== confirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }

    // Client-side validation is good, but context handles domain check primarily
    const allowedDomains = ['@othainsoft.com', '@jerseytechpartners.com', '@markenzoworldwide.com'];
    const emailDomain = email.substring(email.lastIndexOf('@'));
    if (!allowedDomains.includes(emailDomain.toLowerCase())) {
        setLocalError("Sign up failed: Only @othainsoft.com, @jerseytechpartners.com, and @markenzoworldwide.com emails are allowed.");
        return;
    }

    try {
      await signup({ email, password });
      // User is logged out by AuthContext immediately after signup.
      setSuccessMessage('Signup successful! Please proceed to the login page.');
      // Remove any automatic navigation
      // // Optionally redirect after a delay
      // // setTimeout(() => navigate('/login'), 5000);
    } catch (err) {
      // Error is set in AuthContext, but we can use localError if needed
      // setLocalError(err.message || 'Sign up failed. Please try again.');
      // Check if the error message already contains the domain restriction message
      if (err && typeof err.message === 'string' && err.message.includes('emails are allowed')) {
        setLocalError(err.message); // Use the specific message from AuthContext
      } else {
        setLocalError('An unexpected error occurred during sign up.'); // Generic message
      }
    }
  };

  return (
    <Container component="main" maxWidth="xs" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 64px)' }}>
      <Paper elevation={6} sx={{ padding: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', borderRadius: 2 }}>
        <Avatar sx={{ m: 1, bgcolor: 'transparent' }}>
        <img 
            src={isDarkMode ? '/othainlogopreview.png' : '/OthainOcolor.png'}
            alt="Othain Logo"
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        </Avatar>
        <Typography component="h1" variant="h5">
          Sign Up
        </Typography>
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 3, width: '100%' }}>
          {/* Display localError first if it exists */}
          {localError && (
            <Alert severity="error" sx={{ mb: 2, width: '100%' }}>
              {localError}
            </Alert>
          )}
          {/* Display authError only if no specific localError is set */}
          {authError && !localError && (
            <Alert severity="error" sx={{ mb: 2, width: '100%' }}>
              {typeof authError === 'string' ? authError : 'An unexpected error occurred during sign up.'}
            </Alert>
          )}
          {successMessage && (
             <Alert severity="success" sx={{ mb: 2, width: '100%' }}>
                {successMessage}
             </Alert>
          )}
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email Address (@othainsoft.com / @jerseytechpartners.com / @markenzoworldwide.com)"
            name="email"
            autoComplete="email"
            autoFocus
            color={isDarkMode ? 'secondary' : 'primary'}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading || !!successMessage} // Disable if loading or successful
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Password"
            type="password"
            id="password"
            autoComplete="new-password"
            value={password}
            color={isDarkMode ? 'secondary' : 'primary'}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading || !!successMessage} // Disable if loading or successful
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="confirmPassword"
            label="Confirm Password"
            type="password"
            color={isDarkMode ? 'secondary' : 'primary'}
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={isLoading || !!successMessage} // Disable if loading or successful
          />
          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            disabled={isLoading || !!successMessage}
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
            {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Sign Up'}
          </Button>
          <Box textAlign="center">
            <Link component={RouterLink} to="/login" variant="body2" sx={{ color: isDarkMode ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 120, 141, 0.8)' }}>
              {"Already have an account? Sign In"}
            </Link>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default Register;