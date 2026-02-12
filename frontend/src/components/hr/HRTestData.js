import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Alert,
  Skeleton,
  Grid,
  Chip,
  Button
} from '@mui/material';
import { Person as PersonIcon, Schedule as ScheduleIcon } from '@mui/icons-material';

const HRTestData = () => {
  const [testData, setTestData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadTestData();
  }, []);

  const loadTestData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:8000/api/hr/test-profile');
      const data = await response.json();
      
      if (data.success) {
        setTestData(data.data);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to load test data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card elevation={2}>
        <CardContent>
          <Skeleton variant="text" height={40} width="50%" />
          <Skeleton variant="rectangular" height={200} sx={{ mt: 2 }} />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        <Typography variant="h6" gutterBottom>
          Failed to Load Test Data
        </Typography>
        {error}
      </Alert>
    );
  }

  return (
    <Grid container spacing={3}>
      {/* Test Profile Card */}
      <Grid item xs={12} md={6}>
        <Card elevation={2}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <PersonIcon sx={{ mr: 1 }} />
              <Typography variant="h6">Test Profile Data</Typography>
            </Box>
            
            {testData ? (
              <Box>
                <Typography variant="h5" gutterBottom>
                  {testData.full_name}
                </Typography>
                <Box sx={{ mb: 1 }}>
                  <Chip 
                    label={testData.designation} 
                    color="primary" 
                    variant="outlined" 
                    size="small" 
                  />
                </Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  <strong>Department:</strong> {testData.department}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  <strong>Employee ID:</strong> {testData.employee_id}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  <strong>Email:</strong> {testData.email}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Join Date:</strong> {new Date(testData.join_date).toLocaleDateString()}
                </Typography>
              </Box>
            ) : (
              <Alert severity="info" variant="outlined" sx={{ borderRadius: 1.5 }}>
                No test data available
              </Alert>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Test Status Card */}
      <Grid item xs={12} md={6}>
        <Card elevation={2}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <ScheduleIcon sx={{ mr: 1 }} />
              <Typography variant="h6">Backend Status</Typography>
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <Chip 
                label="HR Service Connected" 
                color="success" 
                variant="outlined" 
                sx={{ mr: 1, mb: 1 }}
              />
              <Chip 
                label="Keka Data Available" 
                color="success" 
                variant="outlined" 
                sx={{ mr: 1, mb: 1 }}
              />
            </Box>
            
            <Typography variant="body2" color="text.secondary" gutterBottom>
              The HR backend service is working correctly and can retrieve employee data from the Keka integration.
            </Typography>
            
            <Typography variant="body2" color="text.secondary" gutterBottom>
              To access your personal HR data, please log in using the authentication system.
            </Typography>
            
            <Button 
              variant="outlined" 
              onClick={loadTestData}
              sx={{ mt: 2 }}
            >
              Refresh Test Data
            </Button>
          </CardContent>
        </Card>
      </Grid>

      {/* Instructions Card */}
      <Grid item xs={12}>
        <Card elevation={2}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              How to Access Your HR Data
            </Typography>
            
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                1. <strong>Log In:</strong> Use the login button in the top navigation to authenticate with your account
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                2. <strong>Access HR Data:</strong> Once logged in, you'll be able to view your personal profile, attendance, leave balances, and more
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                3. <strong>Real-time Updates:</strong> Your data is synchronized with Keka and updates automatically
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default HRTestData;
