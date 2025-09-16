import React, { useState, useEffect } from 'react';
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
  Divider,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stack,
  Tooltip,
  IconButton,
  CircularProgress
} from '@mui/material';
import {
  Person as PersonIcon,
  EventAvailable as LeaveIcon,
  Schedule as AttendanceIcon,
  Event as HolidayIcon,
  TrendingUp as TrendingUpIcon,
  Business as BusinessIcon,
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon,
  Info as InfoIcon,
  Work as WorkIcon,
  AccessTime as AccessTimeIcon,
  AttachMoney as AttachMoneyIcon,
  CalendarToday as CalendarTodayIcon,
  Group as GroupIcon,
  SupervisorAccount as SupervisorAccountIcon
} from '@mui/icons-material';
import { hrService } from '../../services/hrServiceDirect';

const HRDashboard = ({ data }) => {
  const { profile, leaveBalances, recentAttendance, upcomingHolidays } = data || {};
  const [rawEmployeeData, setRawEmployeeData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadRawEmployeeData();
  }, []);

  const loadRawEmployeeData = async () => {
    try {
      const result = await hrService.getRawEmployeeData();
      if (result.success) {
        setRawEmployeeData(result.data);
      }
    } catch (err) {
      console.log('Raw employee data not available');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadRawEmployeeData();
      // Trigger parent refresh
      window.dispatchEvent(new CustomEvent('hrRefresh'));
    } finally {
      setRefreshing(false);
    }
  };

  // Calculate attendance summary for current month
  const getAttendanceSummary = () => {
    if (!recentAttendance || recentAttendance.length === 0) return null;
    
    const total = recentAttendance.length;
    const present = recentAttendance.filter(record => 
      record.status === 'present' || record.status === 'work_from_home'
    ).length;
    const absent = recentAttendance.filter(record => record.status === 'absent').length;
    const halfDays = recentAttendance.filter(record => record.status === 'half_day').length;
    const late = recentAttendance.filter(record => record.status === 'late').length;
    
    const presentPercentage = total > 0 ? (present / total) * 100 : 0;
    
    // Calculate total hours worked
    const totalHours = recentAttendance.reduce((sum, record) => {
      return sum + (record.total_hours || 0);
    }, 0);
    
    // Calculate average hours per day
    const avgHoursPerDay = total > 0 ? totalHours / total : 0;
    
    return {
      total,
      present,
      absent,
      halfDays,
      late,
      presentPercentage,
      totalHours,
      avgHoursPerDay
    };
  };

  const attendanceSummary = getAttendanceSummary();

  // Calculate leave summary
  const getLeaveSummary = () => {
    if (!leaveBalances || leaveBalances.length === 0) return null;
    
    const totalAllocated = leaveBalances.reduce((sum, balance) => sum + balance.total_allocated, 0);
    const totalUsed = leaveBalances.reduce((sum, balance) => sum + balance.used, 0);
    const totalRemaining = leaveBalances.reduce((sum, balance) => sum + balance.remaining, 0);
    const utilizationRate = totalAllocated > 0 ? (totalUsed / totalAllocated) * 100 : 0;
    
    return {
      totalAllocated,
      totalUsed,
      totalRemaining,
      utilizationRate,
      leaveTypes: leaveBalances.length
    };
  };

  const leaveSummary = getLeaveSummary();

  // Calculate work anniversary
  const getWorkAnniversary = () => {
    if (!profile?.join_date) return null;
    
    const joinDate = new Date(profile.join_date);
    const today = new Date();
    const yearsWorked = Math.floor((today - joinDate) / (1000 * 60 * 60 * 24 * 365.25));
    
    // Calculate next anniversary
    const nextAnniversary = new Date(joinDate);
    nextAnniversary.setFullYear(today.getFullYear());
    if (nextAnniversary < today) {
      nextAnniversary.setFullYear(today.getFullYear() + 1);
    }
    
    const daysToAnniversary = Math.ceil((nextAnniversary - today) / (1000 * 60 * 60 * 24));
    
    return {
      yearsWorked,
      nextAnniversary: nextAnniversary.toISOString().split('T')[0],
      daysToAnniversary
    };
  };

  const workAnniversary = getWorkAnniversary();

  return (
    <Grid container spacing={3}>
      {/* Header with Refresh Button */}
      <Grid item xs={12}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4" fontWeight="bold">
            HR Dashboard
          </Typography>
          <Tooltip title="Refresh Data">
            <IconButton onClick={handleRefresh} disabled={refreshing}>
              {refreshing ? <CircularProgress size={24} /> : <RefreshIcon />}
            </IconButton>
          </Tooltip>
        </Box>
      </Grid>

      {/* Profile Summary Card */}
      <Grid item xs={12} md={6}>
        <Card elevation={2}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <PersonIcon sx={{ mr: 1, color: 'black' }} />
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
                
                {/* Work Anniversary Info */}
                {workAnniversary && (
                  <Box sx={{ mt: 2, p: 2, bgcolor: 'primary.light', borderRadius: 1 }}>
                    <Typography variant="body2" color="white" gutterBottom>
                      <strong>Work Anniversary</strong>
                    </Typography>
                    <Typography variant="h6" color="white">
                      {workAnniversary.yearsWorked} years completed
                    </Typography>
                    <Typography variant="caption" color="white">
                      Next anniversary in {workAnniversary.daysToAnniversary} days
                    </Typography>
                  </Box>
                )}
              </Box>
            ) : (
              <Alert severity="info" variant="outlined" sx={{ borderRadius: 1.5 }}>
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
              <LeaveIcon sx={{ mr: 1, color: 'black' }} />
              <Typography variant="h6">Leave Balances</Typography>
            </Box>
            
            {leaveBalances && leaveBalances.length > 0 ? (
              <Box>
                {/* Leave Summary */}
                {leaveSummary && (
                  <Box sx={{ mb: 3, p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
                    <Typography variant="body2" color="white" gutterBottom>
                      <strong>Leave Summary</strong>
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="h6" color="white">
                          {leaveSummary.totalRemaining}
                        </Typography>
                        <Typography variant="caption" color="white">
                          Days Remaining
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="h6" color="white">
                          {leaveSummary.utilizationRate.toFixed(1)}%
                        </Typography>
                        <Typography variant="caption" color="white">
                          Utilization Rate
                        </Typography>
                      </Grid>
                    </Grid>
                  </Box>
                )}

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
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">
                        Used: {balance.used} days
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {balance.carry_forward ? `Carry Forward: ${balance.carry_forward}` : ''}
                      </Typography>
                    </Box>
                  </Box>
                ))}
                {leaveBalances.length > 3 && (
                  <Typography variant="body2" color="primary" sx={{ textAlign: 'center', mt: 1 }}>
                    +{leaveBalances.length - 3} more leave types
                  </Typography>
                )}
              </Box>
            ) : (
              <Alert severity="info" variant="outlined" sx={{ borderRadius: 1.5 }}>
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
              <AttendanceIcon sx={{ mr: 1, color: 'black' }} />
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
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', mb: 2 }}>
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
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" color="info.main">
                      {attendanceSummary.late}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Late
                    </Typography>
                  </Box>
                </Box>

                {/* Hours Summary */}
                <Box sx={{ p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
                  <Typography variant="body2" color="info.dark" gutterBottom>
                    <strong>Hours Summary</strong>
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="h6" color="info.main">
                        {attendanceSummary.totalHours.toFixed(1)}h
                      </Typography>
                      <Typography variant="caption" color="info.dark">
                        Total Hours
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="h6" color="info.main">
                        {attendanceSummary.avgHoursPerDay.toFixed(1)}h
                      </Typography>
                      <Typography variant="caption" color="info.dark">
                        Avg per Day
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
              </Box>
            ) : (
              <Alert severity="info" variant="outlined" sx={{ borderRadius: 1.5 }}>
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
              <HolidayIcon sx={{ mr: 1, color: 'black' }} />
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
              <Alert severity="info" variant="outlined" sx={{ borderRadius: 1.5 }}>
                No upcoming holidays found
              </Alert>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Additional Employee Information */}
      {rawEmployeeData && (
        <Grid item xs={12}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <InfoIcon sx={{ mr: 1 }} />
                Additional Employee Information
              </Typography>
              
              <Grid container spacing={3}>
                {/* Employment Details */}
                <Grid item xs={12} md={6}>
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center' }}>
                        <WorkIcon sx={{ mr: 1 }} />
                        Employment Details
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <TableContainer>
                        <Table size="small">
                          <TableBody>
                            <TableRow>
                              <TableCell><strong>Employee Number</strong></TableCell>
                              <TableCell>{rawEmployeeData.employee_number || 'Not assigned'}</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell><strong>Attendance Number</strong></TableCell>
                              <TableCell>{rawEmployeeData.attendance_number || 'Not assigned'}</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell><strong>Time Type</strong></TableCell>
                              <TableCell>
                                {rawEmployeeData.time_type === 1 ? 'Full Time' : 
                                 rawEmployeeData.time_type === 2 ? 'Part Time' : 
                                 rawEmployeeData.time_type === 3 ? 'Contract' : 'Not specified'}
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell><strong>Worker Type</strong></TableCell>
                              <TableCell>
                                {rawEmployeeData.worker_type === 1 ? 'Employee' : 
                                 rawEmployeeData.worker_type === 2 ? 'Contractor' : 
                                 rawEmployeeData.worker_type === 3 ? 'Consultant' : 'Not specified'}
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell><strong>Probation End Date</strong></TableCell>
                              <TableCell>
                                {rawEmployeeData.probation_end_date ? 
                                  new Date(rawEmployeeData.probation_end_date).toLocaleDateString() : 
                                  'Not applicable'
                                }
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </AccordionDetails>
                  </Accordion>
                </Grid>

                {/* Management Structure */}
                <Grid item xs={12} md={6}>
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center' }}>
                        <SupervisorAccountIcon sx={{ mr: 1 }} />
                        Management Structure
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <TableContainer>
                        <Table size="small">
                          <TableBody>
                            <TableRow>
                              <TableCell><strong>Reports To</strong></TableCell>
                              <TableCell>
                                {rawEmployeeData.reports_to_first_name && rawEmployeeData.reports_to_last_name 
                                  ? `${rawEmployeeData.reports_to_first_name} ${rawEmployeeData.reports_to_last_name}`
                                  : 'Not assigned'
                                }
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell><strong>L2 Manager</strong></TableCell>
                              <TableCell>
                                {rawEmployeeData.l2_manager_first_name && rawEmployeeData.l2_manager_last_name 
                                  ? `${rawEmployeeData.l2_manager_first_name} ${rawEmployeeData.l2_manager_last_name}`
                                  : 'Not assigned'
                                }
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell><strong>Dotted Line Manager</strong></TableCell>
                              <TableCell>
                                {rawEmployeeData.dotted_line_manager_first_name && rawEmployeeData.dotted_line_manager_last_name 
                                  ? `${rawEmployeeData.dotted_line_manager_first_name} ${rawEmployeeData.dotted_line_manager_last_name}`
                                  : 'Not assigned'
                                }
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </AccordionDetails>
                  </Accordion>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* Quick Actions Card */}
      <Grid item xs={12} sx={{ borderRadius: 2.5 }}>
        <Card elevation={2} sx={{ borderRadius: 2.5 }}>
          <CardContent sx={{ borderRadius: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, borderRadius: 2.5 }}>
              <TrendingUpIcon sx={{ mr: 1, color: 'black' }} />
              <Typography variant="h6">Quick Insights</Typography>
            </Box>
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'primary.light', borderRadius: 2 }}>
                  <Typography variant="h4" color="white" gutterBottom>
                    {leaveBalances?.reduce((total, balance) => total + balance.remaining, 0) || 0}
                  </Typography>
                  <Typography variant="body2" color="primary.dark">
                    Total Leave Days Left
                  </Typography>
                </Box>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.light', borderRadius: 2 }}>
                  <Typography variant="h4" color="white" gutterBottom>
                    {attendanceSummary?.present || 0}
                  </Typography>
                  <Typography variant="body2" color="success.dark">
                    Days Present This Month
                  </Typography>
                </Box>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'info.light', borderRadius: 2 }}>
                  <Typography variant="h4" color="white" gutterBottom>
                    {upcomingHolidays?.length || 0}
                  </Typography>
                  <Typography variant="body2" color="info.dark">
                    Upcoming Holidays
                  </Typography>
                </Box>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'warning.light', borderRadius: 2 }}>
                  <Typography variant="h4" color="white" gutterBottom>
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
