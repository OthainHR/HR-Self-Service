import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  Avatar,
  Chip,
  Divider,
  Alert,
  Skeleton,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Stack,
  Tooltip,
  IconButton
} from '@mui/material';
import {
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Business as BusinessIcon,
  CalendarToday as CalendarIcon,
  Badge as BadgeIcon,
  LocationOn as LocationIcon,
  Work as WorkIcon,
  School as SchoolIcon,
  Timeline as TimelineIcon,
  ExpandMore as ExpandMoreIcon,
  Info as InfoIcon,
  ContactPhone as ContactPhoneIcon,
  Home as HomeIcon,
  Bloodtype as BloodtypeIcon,
  Flag as FlagIcon,
  Group as GroupIcon,
  SupervisorAccount as SupervisorAccountIcon,
  AccessTime as AccessTimeIcon,
  AttachMoney as AttachMoneyIcon,
  Policy as PolicyIcon
} from '@mui/icons-material';
import { hrService } from '../../services/hrServiceDirect';

const HRProfile = () => {
  const [profile, setProfile] = useState(null);
  const [rawEmployeeData, setRawEmployeeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadProfile();

    // Listen for refresh events
    const handleRefresh = () => loadProfile();
    window.addEventListener('hrRefresh', handleRefresh);
    
    return () => window.removeEventListener('hrRefresh', handleRefresh);
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await hrService.getMyProfile();
      
      if (result.success) {
        setProfile(result.data);
        // Try to get raw employee data for additional information
        try {
          const rawResult = await hrService.getRawEmployeeData();
          if (rawResult.success) {
            setRawEmployeeData(rawResult.data);
          }
        } catch (err) {
          console.log('Raw employee data not available');
        }
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to load profile information');
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatAddress = (address) => {
    if (!address) return 'Not provided';
    if (typeof address === 'string') return address;
    
    // Handle object address format
    const parts = [];
    if (address.addressLine1) parts.push(address.addressLine1);
    if (address.addressLine2) parts.push(address.addressLine2);
    if (address.city) parts.push(address.city);
    if (address.state) parts.push(address.state);
    if (address.zip) parts.push(address.zip);
    if (address.countryCode) parts.push(address.countryCode);
    
    return parts.length > 0 ? parts.join(', ') : 'Not provided';
  };

  const getEmployeeStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'error';
      case 'probation':
        return 'warning';
      default:
        return 'default';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not provided';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatGender = (gender) => {
    const genderMap = { 1: 'Male', 2: 'Female', 3: 'Other' };
    return genderMap[gender] || 'Not specified';
  };

  const formatMaritalStatus = (status) => {
    const statusMap = { 1: 'Single', 2: 'Married', 3: 'Divorced', 4: 'Widowed' };
    return statusMap[status] || 'Not specified';
  };

  const formatBloodGroup = (group) => {
    const groupMap = { 1: 'A+', 2: 'A-', 3: 'B+', 4: 'B-', 5: 'AB+', 6: 'AB-', 7: 'O+', 8: 'O-' };
    return groupMap[group] || 'Not specified';
  };

  const formatEmploymentStatus = (status) => {
    const statusMap = { 1: 'Active', 2: 'Inactive', 3: 'On Leave', 4: 'Terminated' };
    return statusMap[status] || 'Unknown';
  };

  const formatTimeType = (type) => {
    const typeMap = { 1: 'Full Time', 2: 'Part Time', 3: 'Contract', 4: 'Intern' };
    return typeMap[type] || 'Not specified';
  };

  const formatWorkerType = (type) => {
    const typeMap = { 1: 'Employee', 2: 'Contractor', 3: 'Consultant', 4: 'Intern' };
    return typeMap[type] || 'Not specified';
  };

  const calculateExperience = (joiningDate, totalExperienceDays) => {
    if (totalExperienceDays) {
      const years = Math.floor(totalExperienceDays / 365);
      const months = Math.floor((totalExperienceDays % 365) / 30);
      return `${years} years ${months} months`;
    }
    
    if (joiningDate) {
      const joinDate = new Date(joiningDate);
      const now = new Date();
      const diffTime = Math.abs(now - joinDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const years = Math.floor(diffDays / 365);
      const months = Math.floor((diffDays % 365) / 30);
      return `${years} years ${months} months`;
    }
    
    return 'Not available';
  };

  if (loading) {
    return (
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card elevation={2}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Skeleton variant="circular" width={120} height={120} sx={{ mx: 'auto', mb: 2 }} />
              <Skeleton variant="text" height={40} width="80%" sx={{ mx: 'auto' }} />
              <Skeleton variant="text" height={30} width="60%" sx={{ mx: 'auto' }} />
              <Skeleton variant="rounded" height={30} width="40%" sx={{ mx: 'auto', mt: 2 }} />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={8}>
          <Card elevation={2}>
            <CardContent>
              <Skeleton variant="text" height={40} width="50%" />
              <Box sx={{ mt: 3 }}>
                {[1, 2, 3, 4, 5].map((item) => (
                  <Box key={item} sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Skeleton variant="circular" width={40} height={40} sx={{ mr: 2 }} />
                    <Box sx={{ flexGrow: 1 }}>
                      <Skeleton variant="text" height={25} width="70%" />
                      <Skeleton variant="text" height={20} width="50%" />
                    </Box>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  }

  if (error) {
    return (
      <Alert severity="error" action={null} sx={{ borderRadius: 1.5 }}>
        <Typography variant="h6" gutterBottom>
          Failed to Load Profile
        </Typography>
        {error.includes('Keka account not connected') ? 
          'Please log in to access your profile data. If you continue to see this error, contact HR support.' : 
          error
        }
      </Alert>
    );
  }

  if (!profile) {
    return (
      <Alert severity="info" sx={{ borderRadius: 1.5 }}>
        Profile information is not available.
      </Alert>
    );
  }

  return (
    <Grid container spacing={3}>
      {/* Profile Summary Card */}
      <Grid item xs={12} md={4}>
        <Card elevation={2}>
          <CardContent sx={{ textAlign: 'center' }}>
            <Avatar
              sx={{
                width: 120,
                height: 120,
                mx: 'auto',
                mb: 2,
                bgcolor: 'primary.main',
                fontSize: '2.5rem'
              }}
            >
              {getInitials(profile.full_name)}
            </Avatar>
            
            <Typography variant="h5" gutterBottom fontWeight="bold">
              {profile.full_name}
            </Typography>
            
            <Typography variant="body1" color="text.secondary" gutterBottom>
              {profile.designation}
            </Typography>
            
            <Chip
              label={profile.employee_status || 'Active'}
              color={getEmployeeStatusColor(profile.employee_status)}
              variant="contained"
              sx={{ mt: 1 }}
            />
            
            <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: 'divider' }}>
              <Typography variant="body2" color="text.secondary">
                Employee ID
              </Typography>
              <Typography variant="h6" color="primary">
                {profile.employee_id}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Detailed Information Card */}
      <Grid item xs={12} md={8}>
        <Card elevation={2}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <PersonIcon sx={{ mr: 1 }} />
              Personal Information
            </Typography>

            <List sx={{ mt: 2 }}>
              <ListItem sx={{ px: 0 }}>
                <ListItemIcon>
                  <EmailIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Email Address"
                  secondary={profile.email}
                />
              </ListItem>

              {profile.phone && (
                <ListItem sx={{ px: 0 }}>
                  <ListItemIcon>
                    <PhoneIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Phone Number"
                    secondary={profile.phone}
                  />
                </ListItem>
              )}

              <ListItem sx={{ px: 0 }}>
                <ListItemIcon>
                  <LocationIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Address"
                  secondary={formatAddress(profile.address)}
                />
              </ListItem>
            </List>

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <WorkIcon sx={{ mr: 1 }} />
              Work Information
            </Typography>

            <List sx={{ mt: 2 }}>
              <ListItem sx={{ px: 0 }}>
                <ListItemIcon>
                  <BadgeIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Designation"
                  secondary={profile.designation}
                />
              </ListItem>

              <ListItem sx={{ px: 0 }}>
                <ListItemIcon>
                  <BusinessIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Department"
                  secondary={profile.department}
                />
              </ListItem>

              {profile.manager && (
                <ListItem sx={{ px: 0 }}>
                  <ListItemIcon>
                    <PersonIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Reporting Manager"
                    secondary={profile.manager}
                  />
                </ListItem>
              )}

              <ListItem sx={{ px: 0 }}>
                <ListItemIcon>
                  <CalendarIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Date of Joining"
                  secondary={hrService.formatDate(profile.join_date)}
                />
              </ListItem>
            </List>
          </CardContent>
        </Card>
      </Grid>

      {/* Comprehensive Employee Information */}
      {rawEmployeeData && (
        <Grid item xs={12}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <InfoIcon sx={{ mr: 1 }} />
                Comprehensive Employee Information
              </Typography>

              <Grid container spacing={3}>
                {/* Personal Details */}
                <Grid item xs={12} md={6}>
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center' }}>
                        <PersonIcon sx={{ mr: 1 }} />
                        Personal Details
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <TableContainer>
                        <Table size="small">
                          <TableBody>
                            <TableRow>
                              <TableCell><strong>Full Name</strong></TableCell>
                              <TableCell>{rawEmployeeData.display_name || `${rawEmployeeData.first_name} ${rawEmployeeData.last_name}`}</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell><strong>Date of Birth</strong></TableCell>
                              <TableCell>{formatDate(rawEmployeeData.date_of_birth)}</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell><strong>Gender</strong></TableCell>
                              <TableCell>{formatGender(rawEmployeeData.gender)}</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell><strong>Marital Status</strong></TableCell>
                              <TableCell>{formatMaritalStatus(rawEmployeeData.marital_status)}</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell><strong>Blood Group</strong></TableCell>
                              <TableCell>{formatBloodGroup(rawEmployeeData.blood_group)}</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell><strong>Nationality</strong></TableCell>
                              <TableCell>{rawEmployeeData.nationality || 'Not specified'}</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell><strong>Personal Email</strong></TableCell>
                              <TableCell>{rawEmployeeData.personal_email || 'Not provided'}</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </AccordionDetails>
                  </Accordion>
                </Grid>

                {/* Contact Information */}
                <Grid item xs={12} md={6}>
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center' }}>
                        <ContactPhoneIcon sx={{ mr: 1 }} />
                        Contact Information
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <TableContainer>
                        <Table size="small">
                          <TableBody>
                            <TableRow>
                              <TableCell><strong>Work Phone</strong></TableCell>
                              <TableCell>{rawEmployeeData.work_phone || 'Not provided'}</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell><strong>Mobile Phone</strong></TableCell>
                              <TableCell>{rawEmployeeData.mobile_phone || 'Not provided'}</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell><strong>Home Phone</strong></TableCell>
                              <TableCell>{rawEmployeeData.home_phone || 'Not provided'}</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell><strong>Current Address</strong></TableCell>
                              <TableCell>{formatAddress(rawEmployeeData.current_address)}</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell><strong>Permanent Address</strong></TableCell>
                              <TableCell>{formatAddress(rawEmployeeData.permanent_address)}</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </AccordionDetails>
                  </Accordion>
                </Grid>

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
                              <TableCell>{formatTimeType(rawEmployeeData.time_type)}</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell><strong>Worker Type</strong></TableCell>
                              <TableCell>{formatWorkerType(rawEmployeeData.worker_type)}</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell><strong>Employment Status</strong></TableCell>
                              <TableCell>{formatEmploymentStatus(rawEmployeeData.employment_status)}</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell><strong>Probation End Date</strong></TableCell>
                              <TableCell>{formatDate(rawEmployeeData.probation_end_date)}</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell><strong>Total Experience</strong></TableCell>
                              <TableCell>{calculateExperience(rawEmployeeData.joining_date, rawEmployeeData.total_experience_in_days)}</TableCell>
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

                {/* Policies and Benefits */}
                <Grid item xs={12}>
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center' }}>
                        <PolicyIcon sx={{ mr: 1 }} />
                        Policies and Benefits
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                          <TableContainer>
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell><strong>Policy Type</strong></TableCell>
                                  <TableCell><strong>Details</strong></TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                <TableRow>
                                  <TableCell>Leave Plan</TableCell>
                                  <TableCell>{rawEmployeeData.leave_plan_title || 'Not assigned'}</TableCell>
                                </TableRow>
                                <TableRow>
                                  <TableCell>Band Info</TableCell>
                                  <TableCell>{rawEmployeeData.band_info_title || 'Not assigned'}</TableCell>
                                </TableRow>
                                <TableRow>
                                  <TableCell>Pay Grade</TableCell>
                                  <TableCell>{rawEmployeeData.pay_grade_title || 'Not assigned'}</TableCell>
                                </TableRow>
                                <TableRow>
                                  <TableCell>Shift Policy</TableCell>
                                  <TableCell>{rawEmployeeData.shift_policy_title || 'Not assigned'}</TableCell>
                                </TableRow>
                              </TableBody>
                            </Table>
                          </TableContainer>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <TableContainer>
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell><strong>Policy Type</strong></TableCell>
                                  <TableCell><strong>Details</strong></TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                <TableRow>
                                  <TableCell>Weekly Off Policy</TableCell>
                                  <TableCell>{rawEmployeeData.weekly_off_policy_title || 'Not assigned'}</TableCell>
                                </TableRow>
                                <TableRow>
                                  <TableCell>Capture Scheme</TableCell>
                                  <TableCell>{rawEmployeeData.capture_scheme_title || 'Not assigned'}</TableCell>
                                </TableRow>
                                <TableRow>
                                  <TableCell>Tracking Policy</TableCell>
                                  <TableCell>{rawEmployeeData.tracking_policy_title || 'Not assigned'}</TableCell>
                                </TableRow>
                                <TableRow>
                                  <TableCell>Expense Policy</TableCell>
                                  <TableCell>{rawEmployeeData.expense_policy_title || 'Not assigned'}</TableCell>
                                </TableRow>
                              </TableBody>
                            </Table>
                          </TableContainer>
                        </Grid>
                      </Grid>
                    </AccordionDetails>
                  </Accordion>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* Additional Information Card */}
      <Grid item xs={12}>
        <Card elevation={2}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Employment Summary
            </Typography>
            
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Paper 
                  elevation={0} 
                  sx={{ 
                    p: 2, 
                    bgcolor: 'primary.light', 
                    textAlign: 'center',
                    borderRadius: 2 
                  }}
                >
                  <Typography variant="h4" color="primary.main">
                    {profile.join_date ? 
                      Math.floor((new Date() - new Date(profile.join_date)) / (1000 * 60 * 60 * 24 * 365.25)) 
                      : 0
                    }
                  </Typography>
                  <Typography variant="body2" color="primary.dark">
                    Years at Company
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Paper 
                  elevation={0} 
                  sx={{ 
                    p: 2, 
                    bgcolor: 'success.light', 
                    textAlign: 'center',
                    borderRadius: 2 
                  }}
                >
                  <Typography variant="h4" color="success.main">
                    {profile.join_date ? 
                      Math.floor((new Date() - new Date(profile.join_date)) / (1000 * 60 * 60 * 24 * 30.44)) 
                      : 0
                    }
                  </Typography>
                  <Typography variant="body2" color="success.dark">
                    Months at Company
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Paper 
                  elevation={0} 
                  sx={{ 
                    p: 2, 
                    bgcolor: 'info.light', 
                    textAlign: 'center',
                    borderRadius: 2 
                  }}
                >
                  <Typography variant="h4" color="info.main">
                    {profile.employee_status === 'active' ? 'Active' : 'Inactive'}
                  </Typography>
                  <Typography variant="body2" color="info.dark">
                    Current Status
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Paper 
                  elevation={0} 
                  sx={{ 
                    p: 2, 
                    bgcolor: 'warning.light', 
                    textAlign: 'center',
                    borderRadius: 2 
                  }}
                >
                  <Typography variant="h4" color="warning.main">
                    {profile.employee_id.slice(-4)}
                  </Typography>
                  <Typography variant="body2" color="warning.dark">
                    Employee ID
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default HRProfile;
