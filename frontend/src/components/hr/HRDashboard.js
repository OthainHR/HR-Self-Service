import React from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  Chip,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider
} from '@mui/material';
import {
  Person as PersonIcon,
  EventAvailable as LeaveIcon,
  Schedule as AttendanceIcon,
  Event as HolidayIcon,
  TrendingUp as TrendingUpIcon,
  Business as BusinessIcon
} from '@mui/icons-material';

const HRDashboard = ({ data }) => {
  const { profile, leaveBalances, recentAttendance, upcomingHolidays } = data || {};

  // Calculate attendance summary for current month
  const getAttendanceSummary = () => {
    if (!recentAttendance || recentAttendance.length === 0) return null;
    
    const total = recentAttendance.length;
    const present = recentAttendance.filter(record => 
      record.status === 'present' || record.status === 'work_from_home'
    ).length;
    const absent = recentAttendance.filter(record => record.status === 'absent').length;
    const halfDays = recentAttendance.filter(record => record.status === 'half_day').length;
    
    const presentPercentage = total > 0 ? (present / total) * 100 : 0;
    
    return {
      total,
      present,
      absent,
      halfDays,
      presentPercentage
    };
  };

  const attendanceSummary = getAttendanceSummary();

  return (
    <Grid container spacing={3}>
      {/* Profile Summary Card */}
      <Grid item xs={12} md={6}>
        <Card elevation={2}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <PersonIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">Profile Summary</Typography>
            </Box>
            
            {profile ? (
              <Box>
                <Typography variant="h5" gutterBottom>
                  {profile.full_name}
                </Typography>
                <Box sx={{ mb: 1 }}>
                  <Chip 
                    icon={<BusinessIcon />} 
                    label={profile.designation} 
                    color="primary" 
                    variant="outlined" 
                    size="small" 
                  />
                </Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  <strong>Department:</strong> {profile.department}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  <strong>Employee ID:</strong> {profile.employee_id}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Join Date:</strong> {new Date(profile.join_date).toLocaleDateString()}
                </Typography>
              </Box>
            ) : (
              <Alert severity="info" variant="outlined">
                Profile information not available
              </Alert>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Leave Balances Card */}
      <Grid item xs={12} md={6}>
        <Card elevation={2}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <LeaveIcon sx={{ mr: 1, color: 'success.main' }} />
              <Typography variant="h6">Leave Balances</Typography>
            </Box>
            
            {leaveBalances && leaveBalances.length > 0 ? (
              <Box>
                {leaveBalances.slice(0, 3).map((balance, index) => (
                  <Box key={index} sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="body2" fontWeight="medium">
                        {balance.leave_type.charAt(0).toUpperCase() + balance.leave_type.slice(1)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {balance.remaining} / {balance.total_allocated} days
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={balance.total_allocated > 0 ? (balance.remaining / balance.total_allocated) * 100 : 0}
                      sx={{
                        height: 6,
                        borderRadius: 3,
                        bgcolor: 'grey.200',
                        '& .MuiLinearProgress-bar': {
                          bgcolor: balance.remaining > balance.total_allocated * 0.3 ? 'success.main' : 'warning.main'
                        }
                      }}
                    />
                  </Box>
                ))}
                {leaveBalances.length > 3 && (
                  <Typography variant="body2" color="primary" sx={{ textAlign: 'center', mt: 1 }}>
                    +{leaveBalances.length - 3} more leave types
                  </Typography>
                )}
              </Box>
            ) : (
              <Alert severity="info" variant="outlined">
                Leave balance information not available
              </Alert>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Attendance Summary Card */}
      <Grid item xs={12} md={6}>
        <Card elevation={2}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <AttendanceIcon sx={{ mr: 1, color: 'info.main' }} />
              <Typography variant="h6">This Month's Attendance</Typography>
            </Box>
            
            {attendanceSummary ? (
              <Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="h4" color="primary.main" gutterBottom>
                    {attendanceSummary.presentPercentage.toFixed(1)}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Attendance Rate
                  </Typography>
                </Box>
                
                <LinearProgress
                  variant="determinate"
                  value={attendanceSummary.presentPercentage}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    mb: 2,
                    bgcolor: 'grey.200',
                    '& .MuiLinearProgress-bar': {
                      bgcolor: attendanceSummary.presentPercentage >= 90 ? 'success.main' : 
                              attendanceSummary.presentPercentage >= 75 ? 'warning.main' : 'error.main'
                    }
                  }}
                />
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" color="success.main">
                      {attendanceSummary.present}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Present
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" color="warning.main">
                      {attendanceSummary.halfDays}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Half Days
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" color="error.main">
                      {attendanceSummary.absent}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Absent
                    </Typography>
                  </Box>
                </Box>
              </Box>
            ) : (
              <Alert severity="info" variant="outlined">
                Attendance data not available
              </Alert>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Upcoming Holidays Card */}
      <Grid item xs={12} md={6}>
        <Card elevation={2}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <HolidayIcon sx={{ mr: 1, color: 'secondary.main' }} />
              <Typography variant="h6">Upcoming Holidays</Typography>
            </Box>
            
            {upcomingHolidays && upcomingHolidays.length > 0 ? (
              <List dense>
                {upcomingHolidays.slice(0, 4).map((holiday, index) => (
                  <Box key={index}>
                    <ListItem sx={{ px: 0 }}>
                      <ListItemIcon>
                        <Box
                          sx={{
                            width: 40,
                            height: 40,
                            borderRadius: 1,
                            bgcolor: holiday.is_optional ? 'warning.light' : 'success.light',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <Typography variant="caption" sx={{ fontSize: '0.7rem', lineHeight: 1 }}>
                            {new Date(holiday.date).toLocaleDateString('en', { month: 'short' })}
                          </Typography>
                          <Typography variant="h6" sx={{ fontSize: '1rem', lineHeight: 1, fontWeight: 'bold' }}>
                            {new Date(holiday.date).getDate()}
                          </Typography>
                        </Box>
                      </ListItemIcon>
                      <ListItemText
                        primary={holiday.name}
                        secondary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                            <Chip
                              label={holiday.type}
                              size="small"
                              variant="outlined"
                              sx={{ fontSize: '0.7rem', height: 20 }}
                            />
                            {holiday.is_optional && (
                              <Chip
                                label="Optional"
                                size="small"
                                color="warning"
                                variant="outlined"
                                sx={{ fontSize: '0.7rem', height: 20 }}
                              />
                            )}
                          </Box>
                        }
                      />
                    </ListItem>
                    {index < Math.min(upcomingHolidays.length, 4) - 1 && <Divider />}
                  </Box>
                ))}
                {upcomingHolidays.length > 4 && (
                  <Typography variant="body2" color="primary" sx={{ textAlign: 'center', mt: 1 }}>
                    +{upcomingHolidays.length - 4} more holidays
                  </Typography>
                )}
              </List>
            ) : (
              <Alert severity="info" variant="outlined">
                No upcoming holidays found
              </Alert>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Quick Actions Card */}
      <Grid item xs={12}>
        <Card elevation={2}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <TrendingUpIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">Quick Insights</Typography>
            </Box>
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'primary.light', borderRadius: 1 }}>
                  <Typography variant="h4" color="primary.main" gutterBottom>
                    {leaveBalances?.reduce((total, balance) => total + balance.remaining, 0) || 0}
                  </Typography>
                  <Typography variant="body2" color="primary.dark">
                    Total Leave Days Left
                  </Typography>
                </Box>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
                  <Typography variant="h4" color="success.main" gutterBottom>
                    {attendanceSummary?.present || 0}
                  </Typography>
                  <Typography variant="body2" color="success.dark">
                    Days Present This Month
                  </Typography>
                </Box>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
                  <Typography variant="h4" color="info.main" gutterBottom>
                    {upcomingHolidays?.length || 0}
                  </Typography>
                  <Typography variant="body2" color="info.dark">
                    Upcoming Holidays
                  </Typography>
                </Box>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'warning.light', borderRadius: 1 }}>
                  <Typography variant="h4" color="warning.main" gutterBottom>
                    {profile ? Math.floor((new Date() - new Date(profile.join_date)) / (1000 * 60 * 60 * 24 * 365.25)) : 0}
                  </Typography>
                  <Typography variant="body2" color="warning.dark">
                    Years at Company
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default HRDashboard;
