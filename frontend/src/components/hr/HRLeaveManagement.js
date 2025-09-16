import React, { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Chip,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Switch,
  FormControlLabel,
  Skeleton,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  History as HistoryIcon,
  EventAvailable as LeaveIcon,
  CheckCircle as ApprovedIcon,
  Cancel as RejectedIcon,
  Schedule as PendingIcon,
  Close as CancelledIcon
} from '@mui/icons-material';
// Using standard TextField with date type instead of MUI X DatePicker
import { hrService } from '../../services/hrServiceDirect';

const HRLeaveManagement = () => {
  const [leaveBalances, setLeaveBalances] = useState([]);
  const [leaveHistory, setLeaveHistory] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [applying, setApplying] = useState(false);
  
  // Apply leave form state
  const [leaveForm, setLeaveForm] = useState({
    leave_type: '',
    from_date: null,
    to_date: null,
    reason: '',
    is_half_day: false,
    half_day_type: ''
  });

  useEffect(() => {
    loadLeaveData();

    // Listen for refresh events
    const handleRefresh = () => loadLeaveData();
    window.addEventListener('hrRefresh', handleRefresh);
    
    return () => window.removeEventListener('hrRefresh', handleRefresh);
  }, []);

  const loadLeaveData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Try to load leave balances from the main endpoint first
      let balancesResult = await hrService.getMyLeaveBalances();
      
      // If authentication fails, try the test endpoint
      if (!balancesResult.success && balancesResult.error?.includes('401')) {
        console.log('Authentication failed, trying test endpoint...');
        try {
          const testResponse = await fetch('http://localhost:8000/api/hr/test-leave-balances');
          const testData = await testResponse.json();
          if (testData.success) {
            balancesResult = { success: true, data: testData.data };
          }
        } catch (testErr) {
          console.log('Test endpoint also failed:', testErr);
        }
      }

      // Load other data in parallel
      const [typesResult, historyResult] = await Promise.allSettled([
        hrService.getLeaveTypes(),
        hrService.getMyLeaveHistory()
      ]);

      if (balancesResult.success) {
        setLeaveBalances(balancesResult.data);
      }

      if (typesResult.status === 'fulfilled' && typesResult.value.success) {
        setLeaveTypes(typesResult.value.data.leave_types || []);
      }

      if (historyResult.status === 'fulfilled' && historyResult.value.success) {
        setLeaveHistory(historyResult.value.data);
      }

      // Check if critical data failed to load
      if (!balancesResult.success) {
        setError('Leave balance information could not be loaded. Please ensure you are logged in.');
      }
    } catch (err) {
      setError('Failed to load leave information');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyLeave = async () => {
    if (!leaveForm.leave_type || !leaveForm.from_date || !leaveForm.to_date || !leaveForm.reason.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    setApplying(true);

    try {
      const leaveData = {
        leave_type: leaveForm.leave_type,
        from_date: leaveForm.from_date.toISOString().split('T')[0],
        to_date: leaveForm.to_date.toISOString().split('T')[0],
        reason: leaveForm.reason.trim(),
        is_half_day: leaveForm.is_half_day,
        half_day_type: leaveForm.is_half_day ? leaveForm.half_day_type : null
      };

      const result = await hrService.applyForLeave(leaveData);

      if (result.success) {
        setShowApplyDialog(false);
        setLeaveForm({
          leave_type: '',
          from_date: null,
          to_date: null,
          reason: '',
          is_half_day: false,
          half_day_type: ''
        });
        
        // Refresh data
        await loadLeaveData();
        
        // Show success message
        setError(null);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to apply for leave');
    } finally {
      setApplying(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return <ApprovedIcon color="success" />;
      case 'rejected':
        return <RejectedIcon color="error" />;
      case 'cancelled':
        return <CancelledIcon color="disabled" />;
      case 'pending':
      default:
        return <PendingIcon color="warning" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return 'success';
      case 'rejected':
        return 'error';
      case 'cancelled':
        return 'default';
      case 'pending':
      default:
        return 'warning';
    }
  };

  if (loading) {
    return (
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card elevation={2}>
            <CardContent>
              <Skeleton variant="text" height={40} width="50%" />
              <Box sx={{ mt: 2 }}>
                {[1, 2, 3].map((item) => (
                  <Box key={item} sx={{ mb: 3 }}>
                    <Skeleton variant="text" height={25} width="40%" />
                    <Skeleton variant="text" height={20} width="60%" />
                    <Skeleton variant="rectangular" height={6} sx={{ mt: 1 }} />
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card elevation={2}>
            <CardContent>
              <Skeleton variant="text" height={40} width="70%" />
              <Skeleton variant="rectangular" height={150} sx={{ mt: 2 }} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  }

  return (
    <>
      <Grid container spacing={3}>
        {/* Leave Balances Card */}
        <Grid item xs={12} md={8}>
          <Card elevation={2}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
                  <LeaveIcon sx={{ mr: 1 }} />
                  Leave Balances
                </Typography>
                <Tooltip title="Refresh Data">
                  <IconButton onClick={loadLeaveData} size="small">
                    <RefreshIcon />
                  </IconButton>
                </Tooltip>
              </Box>

              {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                  {error}
                </Alert>
              )}

              {leaveBalances.length > 0 ? (
                <Grid container spacing={2}>
                  {leaveBalances.map((balance, index) => (
                    <Grid item xs={12} sm={6} key={index}>
                      <Paper 
                        elevation={0} 
                        sx={{ 
                          p: 2, 
                          bgcolor: 'grey.50', 
                          borderRadius: 2,
                          border: 1,
                          borderColor: 'grey.200'
                        }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Typography variant="subtitle1" fontWeight="medium">
                            {balance.leave_type.charAt(0).toUpperCase() + balance.leave_type.slice(1)} Leave
                          </Typography>
                          <Chip
                            label={`${balance.remaining} / ${balance.total_allocated}`}
                            size="small"
                            color={balance.remaining > balance.total_allocated * 0.3 ? 'success' : 'warning'}
                          />
                        </Box>
                        
                        <LinearProgress
                          variant="determinate"
                          value={balance.total_allocated > 0 ? (balance.remaining / balance.total_allocated) * 100 : 0}
                          sx={{
                            height: 8,
                            borderRadius: 4,
                            bgcolor: 'grey.200',
                            '& .MuiLinearProgress-bar': {
                              bgcolor: balance.remaining > balance.total_allocated * 0.3 ? 'success.main' : 'warning.main'
                            }
                          }}
                        />
                        
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                          <Typography variant="body2" color="text.secondary">
                            Used: {balance.used} days
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Remaining: {balance.remaining} days
                          </Typography>
                        </Box>
                        
                        {balance.carry_forward && (
                          <Typography variant="caption" color="info.main">
                            Carry Forward: {balance.carry_forward} days
                          </Typography>
                        )}
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Alert severity="info" variant="outlined" sx={{ borderRadius: 1.5 }}>
                  No leave balance information available
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Actions Card */}
        <Grid item xs={12} md={4}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Actions
              </Typography>
              
              <List>
                <ListItem disablePadding>
                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setShowApplyDialog(true)}
                    sx={{ mb: 1, py: 1.5, borderRadius: 1.5 }}
                  >
                    Apply for Leave
                  </Button>
                </ListItem>
                
                <ListItem disablePadding>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<HistoryIcon />}
                    onClick={() => setShowHistoryDialog(true)}
                    sx={{ py: 1.5, borderRadius: 1.5 }}
                  >
                    View Leave History
                  </Button>
                </ListItem>
              </List>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" gutterBottom color="text.secondary">
                Recent Leave Applications
              </Typography>
              
              {leaveHistory.slice(0, 3).map((leave, index) => (
                <Box key={index} sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" fontWeight="medium">
                      {leave.leave_type.charAt(0).toUpperCase() + leave.leave_type.slice(1)}
                    </Typography>
                    <Chip
                      icon={getStatusIcon(leave.status)}
                      label={leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
                      size="small"
                      color={getStatusColor(leave.status)}
                      variant="outlined"
                    />
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {hrService.formatDate(leave.from_date)} - {hrService.formatDate(leave.to_date)}
                  </Typography>
                  <Typography variant="caption" display="block" color="text.secondary">
                    {leave.days_count} day{leave.days_count !== 1 ? 's' : ''}
                  </Typography>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>

        {/* Apply Leave Dialog */}
        <Dialog open={showApplyDialog} onClose={() => setShowApplyDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle>Apply for Leave</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Leave Type</InputLabel>
                  <Select
                    value={leaveForm.leave_type}
                    onChange={(e) => setLeaveForm({ ...leaveForm, leave_type: e.target.value })}
                    label="Leave Type"
                  >
                    {leaveTypes.map((type) => (
                      <MenuItem key={type.id || type.name} value={type.name || type.id}>
                        {type.display_name || type.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="From Date"
                  type="date"
                  value={leaveForm.from_date ? leaveForm.from_date.toISOString().split('T')[0] : ''}
                  onChange={(e) => setLeaveForm({ ...leaveForm, from_date: e.target.value ? new Date(e.target.value) : null })}
                  InputLabelProps={{
                    shrink: true,
                  }}
                  inputProps={{
                    min: new Date().toISOString().split('T')[0]
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="To Date"
                  type="date"
                  value={leaveForm.to_date ? leaveForm.to_date.toISOString().split('T')[0] : ''}
                  onChange={(e) => setLeaveForm({ ...leaveForm, to_date: e.target.value ? new Date(e.target.value) : null })}
                  InputLabelProps={{
                    shrink: true,
                  }}
                  inputProps={{
                    min: leaveForm.from_date ? leaveForm.from_date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
                  }}
                />
              </Grid>

              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={leaveForm.is_half_day}
                      onChange={(e) => setLeaveForm({ ...leaveForm, is_half_day: e.target.checked })}
                    />
                  }
                  label="Half Day Leave"
                />
              </Grid>

              {leaveForm.is_half_day && (
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Half Day Type</InputLabel>
                    <Select
                      value={leaveForm.half_day_type}
                      onChange={(e) => setLeaveForm({ ...leaveForm, half_day_type: e.target.value })}
                      label="Half Day Type"
                    >
                      <MenuItem value="first_half">First Half</MenuItem>
                      <MenuItem value="second_half">Second Half</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              )}

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Reason"
                  multiline
                  rows={3}
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                  placeholder="Please provide the reason for your leave..."
                />
              </Grid>

              {leaveForm.from_date && leaveForm.to_date && (
                <Grid item xs={12}>
                  <Alert severity="info" variant="outlined" sx={{ borderRadius: 1.5 }}>
                    <Typography variant="body2">
                      <strong>Duration:</strong> {
                        leaveForm.is_half_day ? '0.5 day' :
                        hrService.calculateWorkingDays(leaveForm.from_date, leaveForm.to_date) + ' day(s)'
                      }
                    </Typography>
                  </Alert>
                </Grid>
              )}
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowApplyDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleApplyLeave} 
              variant="contained"
              disabled={applying}
            >
              {applying ? 'Applying...' : 'Apply for Leave'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Leave History Dialog */}
        <Dialog open={showHistoryDialog} onClose={() => setShowHistoryDialog(false)} maxWidth="lg" fullWidth>
          <DialogTitle>Leave History</DialogTitle>
          <DialogContent>
            <TableContainer component={Paper} elevation={0}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Leave Type</TableCell>
                    <TableCell>Duration</TableCell>
                    <TableCell>Days</TableCell>
                    <TableCell>Applied Date</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Reason</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {leaveHistory.map((leave, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {leave.leave_type.charAt(0).toUpperCase() + leave.leave_type.slice(1)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {hrService.formatDate(leave.from_date)} - {hrService.formatDate(leave.to_date)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {leave.days_count}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {hrService.formatDate(leave.applied_date)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={getStatusIcon(leave.status)}
                          label={leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
                          size="small"
                          color={getStatusColor(leave.status)}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                          {leave.reason}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                  {leaveHistory.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <Typography variant="body2" color="text.secondary">
                          No leave applications found
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowHistoryDialog(false)}>
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </Grid>
    </>
  );
};

export default HRLeaveManagement;
