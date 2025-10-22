import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Alert,
  Skeleton,
  Grid,
  Paper,
  Chip
} from '@mui/material';
import { Schedule as AttendanceIcon } from '@mui/icons-material';
import { hrService } from '../../services/hrService';

const HRAttendance = () => {
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadAttendance();

    const handleRefresh = () => loadAttendance();
    window.addEventListener('hrRefresh', handleRefresh);
    
    return () => window.removeEventListener('hrRefresh', handleRefresh);
  }, []);

  const loadAttendance = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await hrService.getCurrentMonthAttendance();
      
      if (result.success) {
        setAttendance(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'present':
        return 'success';
      case 'absent':
        return 'error';
      case 'half_day':
        return 'warning';
      case 'work_from_home':
        return 'info';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Card elevation={2}>
        <CardContent>
          <Skeleton variant="text" height={40} width="50%" />
          <Grid container spacing={2} sx={{ mt: 2 }}>
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <Grid item xs={12} sm={6} md={4} key={item}>
                <Skeleton variant="rectangular" height={100} />
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        <Typography variant="h6" gutterBottom>
          Failed to Load Attendance
        </Typography>
        {error.includes('Keka account not connected') ? 
          'Please log in to access your attendance data. If you continue to see this error, contact HR support.' : 
          error
        }
      </Alert>
    );
  }

  return (
    <Card elevation={2}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <AttendanceIcon sx={{ mr: 1 }} />
          <Typography variant="h6">Attendance Records - Current Month</Typography>
        </Box>

        {attendance.length > 0 ? (
          <Grid container spacing={2}>
            {attendance.map((record, index) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
                <Paper 
                  elevation={1} 
                  sx={{ 
                    p: 2, 
                    textAlign: 'center',
                    border: 1,
                    borderColor: 'grey.200'
                  }}
                >
                  <Typography variant="h6" gutterBottom>
                    {new Date(record.date).getDate()}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                    {new Date(record.date).toLocaleDateString('en', { month: 'short', weekday: 'short' })}
                  </Typography>
                  <Chip
                    label={record.status.replace('_', ' ').toUpperCase()}
                    size="small"
                    color={getStatusColor(record.status)}
                    sx={{ mb: 1 }}
                  />
                  {record.total_hours && (
                    <Typography variant="body2" color="text.secondary">
                      {record.total_hours} hours
                    </Typography>
                  )}
                </Paper>
              </Grid>
            ))}
          </Grid>
        ) : (
          <Alert severity="info" variant="outlined" sx={{ borderRadius: 1.5 }}>
            No attendance records found for this month
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default HRAttendance;
