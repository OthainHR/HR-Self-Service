import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Alert,
  Skeleton,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Divider,
  Paper
} from '@mui/material';
import { Event as HolidayIcon, Today as TodayIcon } from '@mui/icons-material';
import { hrService } from '../../services/hrService';

const HRHolidays = () => {
  const [holidays, setHolidays] = useState([]);
  const [upcomingHolidays, setUpcomingHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    loadHolidays();

    const handleRefresh = () => loadHolidays();
    window.addEventListener('hrRefresh', handleRefresh);
    
    return () => window.removeEventListener('hrRefresh', handleRefresh);
  }, [selectedYear]);

  const loadHolidays = async () => {
    setLoading(true);
    setError(null);

    try {
      const [holidaysResult, upcomingResult] = await Promise.allSettled([
        hrService.getCompanyHolidays(selectedYear),
        hrService.getUpcomingHolidays()
      ]);

      if (holidaysResult.status === 'fulfilled' && holidaysResult.value.success) {
        setHolidays(holidaysResult.value.data);
      }

      if (upcomingResult.status === 'fulfilled' && upcomingResult.value.success) {
        setUpcomingHolidays(upcomingResult.value.data);
      }

      const hasError = [holidaysResult, upcomingResult].some(
        result => result.status === 'rejected' || !result.value?.success
      );
      
      if (hasError) {
        setError('Some holiday information could not be loaded');
      }
    } catch (err) {
      setError('Failed to load holiday information');
    } finally {
      setLoading(false);
    }
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 3 }, (_, i) => currentYear + i);

  const getHolidayTypeColor = (type) => {
    switch (type?.toLowerCase()) {
      case 'national':
        return 'error';
      case 'regional':
        return 'warning';
      case 'company':
        return 'primary';
      default:
        return 'default';
    }
  };

  const isHolidayPast = (date) => {
    return new Date(date) < new Date();
  };

  const isHolidayToday = (date) => {
    const today = new Date();
    const holidayDate = new Date(date);
    return today.toDateString() === holidayDate.toDateString();
  };

  if (loading) {
    return (
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card elevation={2}>
            <CardContent>
              <Skeleton variant="text" height={40} width="50%" />
              <Skeleton variant="rectangular" height={56} sx={{ mt: 2, mb: 2 }} />
              {[1, 2, 3, 4, 5].map((item) => (
                <Box key={item} sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Skeleton variant="rectangular" width={60} height={60} sx={{ mr: 2 }} />
                  <Box sx={{ flexGrow: 1 }}>
                    <Skeleton variant="text" height={25} width="70%" />
                    <Skeleton variant="text" height={20} width="50%" />
                  </Box>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card elevation={2}>
            <CardContent>
              <Skeleton variant="text" height={40} width="70%" />
              <Skeleton variant="rectangular" height={200} sx={{ mt: 2 }} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  }

  return (
    <Grid container spacing={3}>
      {/* All Holidays */}
      <Grid item xs={12} md={8}>
        <Card elevation={2}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <HolidayIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Company Holidays</Typography>
              </Box>
              
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Year</InputLabel>
                <Select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  label="Year"
                >
                  {years.map((year) => (
                    <MenuItem key={year} value={year}>
                      {year}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {holidays.length > 0 ? (
              <List>
                {holidays.map((holiday, index) => (
                  <Box key={index}>
                    <ListItem 
                      sx={{ 
                        px: 0, 
                        opacity: isHolidayPast(holiday.date) ? 0.6 : 1,
                        bgcolor: isHolidayToday(holiday.date) ? 'primary.light' : 'transparent',
                        borderRadius: 1,
                        mb: 1
                      }}
                    >
                      <ListItemIcon>
                        <Paper
                          elevation={isHolidayToday(holiday.date) ? 3 : 1}
                          sx={{
                            width: 50,
                            height: 50,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: isHolidayToday(holiday.date) ? 'primary.main' : 'background.paper',
                            color: isHolidayToday(holiday.date) ? 'white' : 'text.primary'
                          }}
                        >
                          <Typography variant="caption" sx={{ fontSize: '0.7rem', lineHeight: 1 }}>
                            {new Date(holiday.date).toLocaleDateString('en', { month: 'short' })}
                          </Typography>
                          <Typography variant="h6" sx={{ fontSize: '1rem', lineHeight: 1, fontWeight: 'bold' }}>
                            {new Date(holiday.date).getDate()}
                          </Typography>
                        </Paper>
                      </ListItemIcon>
                      
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="subtitle1" fontWeight="medium">
                              {holiday.name}
                            </Typography>
                            {isHolidayToday(holiday.date) && (
                              <Chip label="Today" size="small" color="primary" />
                            )}
                          </Box>
                        }
                        secondary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                            <Typography variant="body2" color="text.secondary">
                              {new Date(holiday.date).toLocaleDateString('en', { 
                                weekday: 'long',
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric'
                              })}
                            </Typography>
                            <Chip
                              label={holiday.type}
                              size="small"
                              color={getHolidayTypeColor(holiday.type)}
                              variant="outlined"
                            />
                            {holiday.is_optional && (
                              <Chip
                                label="Optional"
                                size="small"
                                color="warning"
                                variant="outlined"
                              />
                            )}
                          </Box>
                        }
                      />
                    </ListItem>
                    {index < holidays.length - 1 && <Divider />}
                  </Box>
                ))}
              </List>
            ) : (
              <Alert severity="info" variant="outlined">
                No holidays found for {selectedYear}
              </Alert>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Upcoming Holidays Sidebar */}
      <Grid item xs={12} md={4}>
        <Card elevation={2}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <TodayIcon sx={{ mr: 1 }} />
              <Typography variant="h6">Upcoming Holidays</Typography>
            </Box>

            {upcomingHolidays.length > 0 ? (
              <List dense>
                {upcomingHolidays.slice(0, 5).map((holiday, index) => (
                  <Box key={index}>
                    <ListItem sx={{ px: 0 }}>
                      <ListItemIcon>
                        <Paper
                          elevation={1}
                          sx={{
                            width: 40,
                            height: 40,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: getHolidayTypeColor(holiday.type) + '.light'
                          }}
                        >
                          <Typography variant="caption" sx={{ fontSize: '0.6rem', lineHeight: 1 }}>
                            {new Date(holiday.date).toLocaleDateString('en', { month: 'short' })}
                          </Typography>
                          <Typography variant="body2" sx={{ fontSize: '0.9rem', lineHeight: 1, fontWeight: 'bold' }}>
                            {new Date(holiday.date).getDate()}
                          </Typography>
                        </Paper>
                      </ListItemIcon>
                      
                      <ListItemText
                        primary={holiday.name}
                        secondary={
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            <Typography variant="caption" color="text.secondary">
                              {new Date(holiday.date).toLocaleDateString('en', { 
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              <Chip
                                label={holiday.type}
                                size="small"
                                color={getHolidayTypeColor(holiday.type)}
                                variant="outlined"
                                sx={{ fontSize: '0.6rem', height: 16 }}
                              />
                              {holiday.is_optional && (
                                <Chip
                                  label="Optional"
                                  size="small"
                                  color="warning"
                                  variant="outlined"
                                  sx={{ fontSize: '0.6rem', height: 16 }}
                                />
                              )}
                            </Box>
                          </Box>
                        }
                      />
                    </ListItem>
                    {index < Math.min(upcomingHolidays.length, 5) - 1 && <Divider />}
                  </Box>
                ))}
              </List>
            ) : (
              <Alert severity="info" variant="outlined">
                No upcoming holidays found
              </Alert>
            )}

            {/* Holiday Statistics */}
            <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: 'divider' }}>
              <Typography variant="subtitle2" gutterBottom color="text.secondary">
                Holiday Statistics for {selectedYear}
              </Typography>
              
              <Grid container spacing={1}>
                <Grid item xs={6}>
                  <Paper elevation={0} sx={{ p: 1, bgcolor: 'error.light', textAlign: 'center' }}>
                    <Typography variant="h6" color="error.main">
                      {holidays.filter(h => h.type === 'national').length}
                    </Typography>
                    <Typography variant="caption" color="error.dark">
                      National
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6}>
                  <Paper elevation={0} sx={{ p: 1, bgcolor: 'warning.light', textAlign: 'center' }}>
                    <Typography variant="h6" color="warning.main">
                      {holidays.filter(h => h.type === 'regional').length}
                    </Typography>
                    <Typography variant="caption" color="warning.dark">
                      Regional
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6}>
                  <Paper elevation={0} sx={{ p: 1, bgcolor: 'primary.light', textAlign: 'center' }}>
                    <Typography variant="h6" color="primary.main">
                      {holidays.filter(h => h.type === 'company').length}
                    </Typography>
                    <Typography variant="caption" color="primary.dark">
                      Company
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6}>
                  <Paper elevation={0} sx={{ p: 1, bgcolor: 'info.light', textAlign: 'center' }}>
                    <Typography variant="h6" color="info.main">
                      {holidays.filter(h => h.is_optional).length}
                    </Typography>
                    <Typography variant="caption" color="info.dark">
                      Optional
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default HRHolidays;
