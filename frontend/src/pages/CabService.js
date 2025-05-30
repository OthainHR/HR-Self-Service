import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  Button,
  Grid,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  CircularProgress,
  Fade,
  Slide,
  TextField,
  Checkbox,
  FormControlLabel,
  Autocomplete,
  Switch // Added Switch
} from '@mui/material';
import {
  DirectionsCar as CarIcon,
  Schedule as ScheduleIcon,
  LocationOn as LocationIcon,
  Business as BusinessIcon,
  Refresh as RefreshIcon,
  History as HistoryIcon,
  Add as AddIcon,
  CheckCircle as CheckCircleIcon,
  Email as EmailIcon,
  CalendarToday as CalendarIcon,
  FilterList as FilterIcon,
  LocalTaxi as LocalTaxiIcon,
  Replay as ReplayIcon,
  LocationOff as LocationOffIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useDarkMode } from '../contexts/DarkModeContext';
import { motion } from 'framer-motion';
import { useTheme } from '@mui/material/styles';
import { supabase } from '../services/supabase';
import * as XLSX from 'xlsx';

const CabService = () => {
  const { user } = useAuth();
  const { isDarkMode } = useDarkMode();
  const theme = useTheme();
  const isAdmin = user?.email === 'admin@example.com' || user?.email === 'hr@othainsoft.com';
  const isHrAdmin = user?.email === 'hr@othainsoft.com'; // Specific HR Admin for whitelist

  // Helper function to capitalize first letter
  const capitalizeFirstLetter = (str) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  // Form state
  const [formData, setFormData] = useState({
    pickupTime: '',
    department: '',
    pickupLocation: '',
    dropoffLocation: ''
  });

  // UI state
  const [loading, setLoading] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [lastBooking, setLastBooking] = useState(null);
  const [isUserWhitelisted, setIsUserWhitelisted] = useState(false);
  const [loadingWhitelistStatus, setLoadingWhitelistStatus] = useState(true);
  
  // Admin date filtering state
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]); // Today's date
  const [allBookings, setAllBookings] = useState([]); // Store all bookings for filtering
  const [selectedPickupTime, setSelectedPickupTime] = useState(''); // Filter by pickup time
  const [selectedPickupLocation, setSelectedPickupLocation] = useState(''); // Filter by pickup location

  // Whitelist management state (for HR admin)
  const [whitelistedEmails, setWhitelistedEmails] = useState([]);
  const [allSystemUsers, setAllSystemUsers] = useState([]);
  const [selectedUserToWhitelist, setSelectedUserToWhitelist] = useState(null);
  const [loadingWhitelistManagement, setLoadingWhitelistManagement] = useState(false);

  // Global cab service visibility (controlled by HR Admin)
  const [cabServiceGlobalVisibility, setCabServiceGlobalVisibility] = useState(true);
  const [loadingCabServiceGlobalVisibility, setLoadingCabServiceGlobalVisibility] = useState(true);


  // Dropdown options
  const pickupTimes = ['9pm', '11:30pm', '2:30am'];
  const departments = ['GBT', 'Presidio', 'Othain'];
  const pickupLocations = ['Building # 9', 'Building # 16'];
  const dropoffLocations = [
    'Chilakalaguda', 'Pragathi Nagar', 'JNTU', 'KPHB', 'Gurram Gudda',
    'Badangpet', 'Madhapur', 'Siddique Nagar', 'Shaikpet', 'Kataydhan',
    'Amberpet', 'Alwal', 'Bahadurpura', 'Towlichoki', 'BHEL', 'Ligampally',
    'Uppal Stadium', 'Medipally', 'Ameerpet', 'Chengicherla', 'Moulali',
    'Safil Guda', 'Qutubullapur', 'Balnagar', 'Kompally', 'Shapur', 'Uppal',
    'Boduppal', 'Sangareddy X Road', 'Dilsukhnagar', 'Krishnanagar',
    'Balkmpet', 'Kondapur', 'Siddiq Nagar', 'Bandlaguda', 'Financial District',
    'Borabanda', 'Tirumalgiri', 'Hafezpet', 'Moula Ali', 'Safilguda',
    'New Bhoiguda', 'Sitafalmandi', 'Kothapet', 'Nagol', 'BN Reddy Colony',
    'Hastinapur', 'Rajendra Nagar', 'Atthapur', 'Lingampalli', 'Sangareddy',
    'Vasanth Nagar', 'Gajularamaram', 'Parvathapur', 'Ram Nagar',
    'Himayath Nagar', 'Rampally'
  ];

  // Check if user is whitelisted or HR admin
  useEffect(() => {
    const checkWhitelistStatus = async () => {
      if (!user) {
        setLoadingWhitelistStatus(false);
        return;
      }
      if (isHrAdmin) {
        setIsUserWhitelisted(true); // HR admin is always allowed
        setLoadingWhitelistStatus(false);
        return;
      }
      try {
        setLoadingWhitelistStatus(true);
        const { data, error } = await supabase
          .from('cab_booking_whitelist')
          .select('email')
          .eq('email', user.email)
          .maybeSingle(); // Use maybeSingle as it might return null if not found

        if (error) {
          console.error('Error checking whitelist status:', error);
          setIsUserWhitelisted(false); // Default to not whitelisted on error
        } else {
          setIsUserWhitelisted(!!data); // True if data is not null (email found)
        }
      } catch (err) {
        console.error('Exception checking whitelist status:', err);
        setIsUserWhitelisted(false);
      } finally {
        setLoadingWhitelistStatus(false);
      }
    };

    checkWhitelistStatus();
  }, [user, isHrAdmin]);

  // Fetch global cab service visibility setting
  useEffect(() => {
    const fetchCabServiceVisibility = async () => {
      setLoadingCabServiceGlobalVisibility(true);
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('is_enabled')
          .eq('key', 'cab_service_visibility')
          .single();

        if (error) {
          console.error('Error fetching cab service visibility:', error);
          // Default to true if not found or error, so service isn't accidentally disabled
          setCabServiceGlobalVisibility(true); 
        } else {
          setCabServiceGlobalVisibility(data ? data.is_enabled : true);
        }
      } catch (err) {
        console.error('Exception fetching cab service visibility:', err);
        setCabServiceGlobalVisibility(true); // Default to true on exception
      } finally {
        setLoadingCabServiceGlobalVisibility(false);
      }
    };

    fetchCabServiceVisibility();
  }, []);


  // Initial data loading for bookings
  useEffect(() => {
    if (isAdmin && !isHrAdmin) { // General admin but not HR admin
      loadAdminReport();
    } else if (isHrAdmin) { // HR admin loads all reports and can manage whitelist
      loadAdminReport();
      // Load whitelist management data if HR Admin
      // We'll add fetchWhitelistedEmails and fetchAllSystemUsers here later
    } else if (user) { // Regular user
      loadBookings();
    }
  }, [user, isAdmin, isHrAdmin]);

  // Load user's booking history
  const loadBookings = async () => {
    setLoadingBookings(true);
    try {
      const { data, error } = await supabase
        .from('cab_bookings')
        .select('*, needs_escort')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBookings(data || []);
      
      // Set last booking for quick rebook
      if (data && data.length > 0) {
        setLastBooking(data[0]);
      }
    } catch (error) {
      console.error('Error loading bookings:', error);
      setSnackbar({
        open: true,
        message: 'Failed to load booking history',
        severity: 'error'
      });
    } finally {
      setLoadingBookings(false);
    }
  };

  // Load admin report data
  const loadAdminReport = async () => {
    if (!isAdmin) return;
    
    setLoadingBookings(true);
    try {
      const { data, error } = await supabase
        .from('v_cab_bookings_report')
        .select('*, needs_escort')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAllBookings(data || []);
      // Filter bookings for selected date
      filterBookings(data || [], selectedDate, selectedPickupTime, selectedPickupLocation);
    } catch (error) {
      console.error('Error loading admin report:', error);
      setSnackbar({
        open: true,
        message: 'Failed to load admin report',
        severity: 'error'
      });
    } finally {
      setLoadingBookings(false);
    }
  };

  // Filter bookings by selected date
  const filterBookingsByDate = (allBookingsData, date) => {
    const filteredBookings = allBookingsData.filter(booking => 
      booking.booking_date === date
    );
    setBookings(filteredBookings);
  };

  // Enhanced filtering function for multiple criteria
  const filterBookings = (allBookingsData, date, pickupTime, pickupLocation) => {
    let filteredBookings = allBookingsData.filter(booking => {
      // Date filter
      const dateMatch = booking.booking_date === date;
      
      // Pickup time filter
      const timeMatch = !pickupTime || booking.pickup_time === pickupTime;
      
      // Pickup location filter
      const locationMatch = !pickupLocation || booking.pickup_location === pickupLocation;
      
      return dateMatch && timeMatch && locationMatch;
    });
    
    setBookings(filteredBookings);
  };

  // Handle date change for admin filtering
  const handleDateChange = (newDate) => {
    setSelectedDate(newDate);
    filterBookings(allBookings, newDate, selectedPickupTime, selectedPickupLocation);
  };

  // Handle pickup time filter change
  const handlePickupTimeFilter = (pickupTime) => {
    setSelectedPickupTime(pickupTime);
    filterBookings(allBookings, selectedDate, pickupTime, selectedPickupLocation);
  };

  // Handle pickup location filter change
  const handlePickupLocationFilter = (pickupLocation) => {
    setSelectedPickupLocation(pickupLocation);
    filterBookings(allBookings, selectedDate, selectedPickupTime, pickupLocation);
  };

  // Clear all filters
  const clearAllFilters = () => {
    setSelectedPickupTime('');
    setSelectedPickupLocation('');
    filterBookings(allBookings, selectedDate, '', '');
  };

  // Handle form input changes
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle form submission
  const handleBookCab = async () => {
    // Validate form
    if (!formData.pickupTime || !formData.department || !formData.pickupLocation || !formData.dropoffLocation) {
      setSnackbar({
        open: true,
        message: 'Please fill in all required fields',
        severity: 'error'
      });
      return;
    }

    setLoading(true);
    try {
      const bookingData = {
        user_id: user.id,
        user_email: user.email,
        pickup_time: formData.pickupTime,
        department: formData.department,
        pickup_location: formData.pickupLocation,
        dropoff_location: formData.dropoffLocation,
        booking_date: new Date().toISOString().split('T')[0] // Today's date
      };

      const { data, error } = await supabase
        .from('cab_bookings')
        .insert([bookingData])
        .select()
        .single();

      if (error) throw error;

      setSnackbar({
        open: true,
        message: 'Cab booked successfully! Confirmation email sent.',
        severity: 'success'
      });

      // Reset form
      setFormData({
        pickupTime: '',
        department: '',
        pickupLocation: '',
        dropoffLocation: ''
      });

      // Refresh bookings
      loadBookings();
      setShowBookingDialog(false);

    } catch (error) {
      console.error('Error booking cab:', error);
      setSnackbar({
        open: true,
        message: 'Failed to book cab. Please try again.',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle rebook with last booking data
  const handleRebook = () => {
    if (lastBooking) {
      setFormData({
        pickupTime: lastBooking.pickup_time,
        department: lastBooking.department,
        pickupLocation: lastBooking.pickup_location,
        dropoffLocation: lastBooking.dropoff_location
      });
      setShowBookingDialog(true);
    }
  };

  // Export to Excel (for admin)
  const exportToExcel = () => {
    if (!isAdmin || bookings.length === 0) return;

    // Prepare data for Excel
    const excelData = bookings.map(booking => ({
      'Date': new Date(booking.booking_date).toLocaleDateString(),
      'First Name': capitalizeFirstLetter(booking.first_name) || '',
      'Last Name': capitalizeFirstLetter(booking.last_name) || '',
      'Email': booking.user_email || '',
      'Pickup Time': booking.pickup_time,
      'Pickup Location': booking.pickup_location,
      'Drop-off Location': booking.dropoff_location,
      'Department': booking.department,
      'Needs Escort': booking.needs_escort ? 'Yes' : 'No',
      'Booking Time': new Date(booking.created_at).toLocaleString()
    }));

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Set column widths for better formatting
    const columnWidths = [
      { wch: 12 }, // Date
      { wch: 15 }, // First Name
      { wch: 15 }, // Last Name
      { wch: 25 }, // Email
      { wch: 12 }, // Pickup Time
      { wch: 18 }, // Pickup Location
      { wch: 20 }, // Drop-off Location
      { wch: 12 }, // Department
      { wch: 12 }, // Needs Escort
      { wch: 20 }  // Booking Time
    ];
    worksheet['!cols'] = columnWidths;

    // Add header styling
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      if (!worksheet[cellAddress]) continue;
      worksheet[cellAddress].s = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "4CAF50" } },
        alignment: { horizontal: "center" }
      };
    }

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Cab Bookings');

    // Generate filename with filters
    const filterSuffix = [
      selectedPickupTime && `time-${selectedPickupTime.replace(':', '')}`,
      selectedPickupLocation && `location-${selectedPickupLocation.replace(/[^a-zA-Z0-9]/g, '')}`
    ].filter(Boolean).join('_');
    
    const filename = filterSuffix 
      ? `cab_bookings_${selectedDate}_${filterSuffix}_${bookings.length}_entries.xlsx`
      : `cab_bookings_${selectedDate}_${bookings.length}_entries.xlsx`;

    // Write and download the file
    XLSX.writeFile(workbook, filename);

    // Enhanced success message with filter info
    const filterInfo = [
      `Date: ${new Date(selectedDate).toLocaleDateString()}`,
      selectedPickupTime && `Time: ${selectedPickupTime}`,
      selectedPickupLocation && `Location: ${selectedPickupLocation}`
    ].filter(Boolean).join(', ');

    setSnackbar({
      open: true,
      message: `Exported ${bookings.length} cab bookings to Excel (${filterInfo})`,
      severity: 'success'
    });
  };

  // Handle escort status update (admin only)
  const handleEscortUpdate = async (bookingId, newNeedsEscortStatus) => {
    if (!isAdmin) return;
    
    

    try {
      const { data, error, count } = await supabase
        .from('cab_bookings')
        .update({ needs_escort: newNeedsEscortStatus })
        .eq('id', bookingId)
        .select(); // Attempt to select the updated row to confirm

      

      if (error) {
        console.error('Error updating escort status (Supabase error):', error);
        throw error; // Re-throw to be caught by the catch block
      }

      if (count === 0 || !data || data.length === 0) {
        console.warn('Update successful according to Supabase, but no rows were affected. Booking ID:', bookingId);
        // This might happen if the RLS policy prevents the update but doesn't return an error object.
        setSnackbar({
          open: true,
          message: 'Update sent, but status may not have changed in DB. Check permissions.',
          severity: 'warning'
        });
        // Optionally, revert local state if the DB didn't change, or reload data
        // For now, we proceed with local update but warn the user.
      }

      // Update local state optimistically or based on returned data
      // If data is returned and not empty, we can use it, otherwise stick to newNeedsEscortStatus
      const updatedBooking = data && data.length > 0 ? data[0] : null;
      const confirmedNeedsEscort = updatedBooking ? updatedBooking.needs_escort : newNeedsEscortStatus;

      setBookings(prevBookings => 
        prevBookings.map(booking => 
          booking.id === bookingId 
            ? { ...booking, needs_escort: confirmedNeedsEscort }
            : booking
        )
      );

      setAllBookings(prevAllBookings => 
        prevAllBookings.map(booking => 
          booking.id === bookingId 
            ? { ...booking, needs_escort: confirmedNeedsEscort }
            : booking
        )
      );

      if (count > 0 && data && data.length > 0) {
        setSnackbar({
          open: true,
          message: `Escort status updated to ${confirmedNeedsEscort ? 'Yes' : 'No'}`,
          severity: 'success'
        });
      }

    } catch (error) {
      // This will catch errors from the try block, including re-thrown Supabase errors
      console.error('Failed to update escort status (catch block):', error);
      setSnackbar({
        open: true,
        message: 'Failed to update escort status. Check console for details.',
        severity: 'error'
      });
    }
  };

  // Whitelist management functions (for HR admin)
  const fetchWhitelistedEmails = async () => {
    if (!isHrAdmin) return;
    setLoadingWhitelistManagement(true);
    try {
      const { data, error } = await supabase
        .from('cab_booking_whitelist')
        .select('email, created_at, added_by')
        .order('email', { ascending: true });
      if (error) throw error;
      setWhitelistedEmails(data || []);
    } catch (err) {
      console.error('Error fetching whitelisted emails:', err);
      setSnackbar({ open: true, message: 'Failed to load whitelist', severity: 'error' });
    } finally {
      setLoadingWhitelistManagement(false);
    }
  };

  const fetchAllSystemUsers = async () => {
    if (!isHrAdmin) return;
    setLoadingWhitelistManagement(true);
    try {
      // Call the Supabase Edge function
      const { data, error } = await supabase.rpc('get_all_system_user_emails');
      
      if (error) {
        console.error('Error fetching system users:', error);
        throw error;
      }
      setAllSystemUsers(data.map(u => ({ email: u.user_email })) || []); // Ensure data is in expected format for Autocomplete
    } catch (err) {
      console.error('Error fetching all system users:', err);
      setSnackbar({ open: true, message: 'Failed to load system users for whitelist', severity: 'error' });
    } finally {
      setLoadingWhitelistManagement(false);
    }
  };

  const handleAddEmailToWhitelist = async (emailToAdd) => {
    if (!isHrAdmin || !emailToAdd) return;
    setLoadingWhitelistManagement(true);
    try {
      // Check if already whitelisted to prevent duplicate error
      const existing = whitelistedEmails.find(e => e.email === emailToAdd);
      if (existing) {
        setSnackbar({ open: true, message: `${emailToAdd} is already whitelisted.`, severity: 'info' });
        return;
      }

      const { error } = await supabase
        .from('cab_booking_whitelist')
        .insert({ email: emailToAdd }); 
      if (error) throw error;
      setSnackbar({ open: true, message: `${emailToAdd} added to whitelist.`, severity: 'success' });
      fetchWhitelistedEmails(); // Refresh list
      setSelectedUserToWhitelist(null); // Reset selection
    } catch (err) {
      console.error('Error adding to whitelist:', err);
      setSnackbar({ open: true, message: `Failed to add ${emailToAdd} to whitelist.`, severity: 'error' });
    } finally {
      setLoadingWhitelistManagement(false);
    }
  };

  const handleRemoveEmailFromWhitelist = async (emailToRemove) => {
    if (!isHrAdmin) return;
    setLoadingWhitelistManagement(true);
    try {
      const { error } = await supabase
        .from('cab_booking_whitelist')
        .delete()
        .eq('email', emailToRemove);
      if (error) throw error;
      setSnackbar({ open: true, message: `${emailToRemove} removed from whitelist.`, severity: 'success' });
      fetchWhitelistedEmails(); // Refresh list
    } catch (err) {
      console.error('Error removing from whitelist:', err);
      setSnackbar({ open: true, message: `Failed to remove ${emailToRemove}.`, severity: 'error' });
    } finally {
      setLoadingWhitelistManagement(false);
    }
  };

  // Export whitelist to Excel
  const exportWhitelistToExcel = () => {
    if (whitelistedEmails.length === 0) return;
    const excelData = whitelistedEmails.map(item => {
      const email = item.email;
      const prefix = email.split('@')[0];
      const parts = prefix.split('.');
      const first = capitalizeFirstLetter(parts[0] || '');
      const last = capitalizeFirstLetter(parts[1] || '');
      return { 'First Name': first, 'Last Name': last, 'Email': email };
    });
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    // Set column widths
    worksheet['!cols'] = [
      { wch: 15 }, // First Name
      { wch: 15 }, // Last Name
      { wch: 25 }  // Email
    ];
    // Header styling
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = XLSX.utils.encode_cell({ r: 0, c });
      if (!worksheet[cell]) continue;
      worksheet[cell].s = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '4CAF50' } },
        alignment: { horizontal: 'center' }
      };
    }
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Whitelist');
    XLSX.writeFile(workbook, `cab_booking_whitelist_${whitelistedEmails.length}_entries.xlsx`);
    setSnackbar({ open: true, message: `Exported ${whitelistedEmails.length} users to Excel`, severity: 'success' });
  };

  // Load whitelist management data if HR Admin
  useEffect(() => {
    if (isHrAdmin) {
      fetchWhitelistedEmails();
      fetchAllSystemUsers();
    }
  }, [isHrAdmin]);

  const sectionVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.2,
        duration: 0.6,
        ease: "easeOut"
      }
    })
  };

  // HR Admin: Toggle global cab service visibility
  const handleToggleCabServiceVisibility = async (event) => {
    if (!isHrAdmin) return;
    const newVisibility = event.target.checked;
    setLoadingCabServiceGlobalVisibility(true);
    try {
      const { error } = await supabase
        .from('app_settings')
        .update({ is_enabled: newVisibility, updated_at: new Date().toISOString(), updated_by: user.id })
        .eq('key', 'cab_service_visibility');

      if (error) {
        throw error;
      }
      setCabServiceGlobalVisibility(newVisibility);
      setSnackbar({
        open: true,
        message: `Cab Service visibility ${newVisibility ? 'enabled' : 'disabled'} for all users.`,
        severity: 'success',
      });
    } catch (err) {
      console.error('Error updating cab service visibility:', err);
      setSnackbar({
        open: true,
        message: 'Failed to update cab service visibility.',
        severity: 'error',
      });
      // Revert optimistic update on error
      setCabServiceGlobalVisibility(!newVisibility);
    } finally {
      setLoadingCabServiceGlobalVisibility(false);
    }
  };

  const canUserAccessCabService = cabServiceGlobalVisibility && (isUserWhitelisted || isHrAdmin);


  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: isDarkMode 
          ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)'
          : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Background decoration */}
      <Box sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: isDarkMode 
          ? 'radial-gradient(circle at 20% 80%, rgba(59, 130, 246, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(139, 92, 246, 0.1) 0%, transparent 50%)'
          : 'radial-gradient(circle at 20% 80%, rgba(99, 102, 241, 0.08) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(139, 92, 246, 0.08) 0%, transparent 50%)',
        zIndex: -1
      }} />

      <Container maxWidth="xl" sx={{ pt: 4, pb: 4, position: 'relative', zIndex: 1 }}>
        {/* Header Section */}
        <motion.div
          custom={0}
          initial="hidden"
          animate="visible"
          variants={sectionVariants}
        >
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography
              variant="h3"
              component="h1"
              sx={{
                fontWeight: 700,
                background: isDarkMode
                  ? 'linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%)'
                  : 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
                mb: 2
              }}
            >
              🚗 Othain Cab Service
            </Typography>
            <Typography
              variant="h6"
              sx={{
                color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
                maxWidth: 600,
                mx: 'auto'
              }}
            >
              Book your cab for convenient transportation to and from the office
            </Typography>
          </Box>
        </motion.div>

        {/* Eligibility Notification Alert */}
        {!loadingWhitelistStatus && !isUserWhitelisted && !isHrAdmin && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            style={{ marginBottom: theme.spacing(3) }} // Add some space below the alert
          >
            <Alert 
              severity="info" 
              variant="filled"
              icon={<LocationOffIcon fontSize="inherit" />} // Using a relevant icon
              sx={{
                borderRadius: 2,
                boxShadow: theme.shadows[3],
                '& .MuiAlert-icon': {
                  alignItems: 'center' // Center icon vertically if needed
                }
              }}
            >
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                You are currently not opted-in for Othain transport services. To gain access, please raise a ticket or reach out to <strong style={{ color: theme.palette.info.contrastText }}>hr@othainsoft.com</strong>.
              </Typography>
            </Alert>
          </motion.div>
        )}

        {/* Global Cab Service Disabled Alert (for all users except HR Admin if disabled) */}
        {!loadingCabServiceGlobalVisibility && !cabServiceGlobalVisibility && !isHrAdmin && (
           <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            style={{ marginBottom: theme.spacing(3) }}
          >
            <Alert 
              severity="warning" 
              variant="filled"
              icon={<LocationOffIcon fontSize="inherit" />}
            >
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                Othain Cab Service is temporarily unavailable. Please check back later or contact HR for more information.
              </Typography>
            </Alert>
          </motion.div>
        )}


        {/* Action Cards */}
        <motion.div
          custom={1}
          initial="hidden"
          animate="visible"
          variants={sectionVariants}
        >
          {loadingWhitelistStatus || loadingCabServiceGlobalVisibility ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
              <CircularProgress />
              <Typography sx={{ ml: 2 }}>Checking booking eligibility...</Typography>
            </Box>
          ) : (
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={6}>
              <Card
                sx={{
                  background: isDarkMode
                    ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
                    : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                  border: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'}`,
                  borderRadius: 3,
                  overflow: 'hidden',
                  position: 'relative',
                    cursor: canUserAccessCabService ? 'pointer' : 'not-allowed',
                    opacity: canUserAccessCabService ? 1 : 0.5,
                  transition: 'all 0.3s ease',
                    '&:hover': canUserAccessCabService ? {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)'
                    } : {}
                }}
                  onClick={() => canUserAccessCabService && setShowBookingDialog(true)}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Box
                      sx={{
                        background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                          borderRadius: '50%',
                          width: 56,
                          height: 56,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        mr: 2
                      }}
                    >
                        <LocalTaxiIcon sx={{ color: 'white', fontSize: 28 }} />
                    </Box>
                    <Typography variant="h5" sx={{ fontWeight: 600 }}>
                      Book New Cab
                    </Typography>
                  </Box>
                  <Typography
                    variant="body1"
                    sx={{
                      color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
                      mb: 2
                    }}
                  >
                      {(canUserAccessCabService)
                        ? 'Schedule a new cab booking with your preferred pickup time and destination'
                        : !cabServiceGlobalVisibility
                          ? 'Cab service is temporarily unavailable.'
                          : 'Cab booking is currently not enabled for your account. Please contact HR for assistance.'
                      }
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<CarIcon />}
                      disabled={!canUserAccessCabService}
                    sx={{
                      background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)'
                      }
                    }}
                  >
                    Book Now
                  </Button>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card
                sx={{
                  background: isDarkMode
                    ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
                    : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                  border: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'}`,
                  borderRadius: 3,
                  overflow: 'hidden',
                  position: 'relative',
                    cursor: lastBooking && canUserAccessCabService ? 'pointer' : 'not-allowed',
                    opacity: lastBooking && canUserAccessCabService ? 1 : 0.5,
                  transition: 'all 0.3s ease',
                    '&:hover': lastBooking && canUserAccessCabService ? {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)'
                  } : {}
                }}
                  onClick={() => lastBooking && canUserAccessCabService && handleRebook()}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Box
                      sx={{
                        background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                          borderRadius: '50%',
                          width: 56,
                          height: 56,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        mr: 2
                      }}
                    >
                        <ReplayIcon sx={{ color: 'white', fontSize: 28 }} />
                    </Box>
                    <Typography variant="h5" sx={{ fontWeight: 600 }}>
                      Rebook Last Cab
                    </Typography>
                  </Box>
                  <Typography
                    variant="body1"
                    sx={{
                      color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
                      mb: 2
                    }}
                  >
                      {!canUserAccessCabService
                        ? !cabServiceGlobalVisibility
                          ? 'Rebooking is currently unavailable as cab service is temporarily disabled.'
                          : 'Rebooking is currently not enabled for your account.'
                        : lastBooking 
                      ? `Quickly rebook your last trip: ${lastBooking.pickup_time} to ${lastBooking.dropoff_location}`
                      : 'No previous bookings found'
                    }
                  </Typography>
                  <Button
                    variant="contained"
                      startIcon={<ReplayIcon />}
                      disabled={!lastBooking || !canUserAccessCabService}
                    sx={{
                      background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #047857 0%, #059669 100%)'
                      }
                    }}
                  >
                    Rebook
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          )}
        </motion.div>

        {/* Booking History / Admin Report */}
        <motion.div
          custom={2}
          initial="hidden"
          animate="visible"
          variants={sectionVariants}
        >
          <Paper
            sx={{
              p: 3,
              background: isDarkMode
                ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
                : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
              border: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'}`,
              borderRadius: 3
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h5" sx={{ fontWeight: 600 }}>
                {isAdmin ? '📊 Cab Bookings Management' : '📋 Your Booking History'}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}> {/* Added alignItems */}
                {isHrAdmin && (
                  <Tooltip title={cabServiceGlobalVisibility ? "Disable Cab Service for All Users" : "Enable Cab Service for All Users"}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={cabServiceGlobalVisibility}
                          onChange={handleToggleCabServiceVisibility}
                          disabled={loadingCabServiceGlobalVisibility}
                          color="primary"
                        />
                      }
                      labelPlacement="start"
                      label={
                        loadingCabServiceGlobalVisibility ? (
                          <CircularProgress size={20} sx={{mr: 1}} />
                        ) : cabServiceGlobalVisibility ? (
                           "Service Enabled"
                        ) : (
                           "Service Disabled"
                        )
                      }
                      sx={{mr: 2, '& .MuiFormControlLabel-label': {fontWeight: 500}}}
                    />
                  </Tooltip>
                )}
                {isAdmin && (
                  <Button
                    variant="outlined"
                    startIcon={<EmailIcon />}
                    onClick={exportToExcel}
                    disabled={bookings.length === 0}
                    sx={{
                      background: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.9)',
                      '&:hover': {
                        background: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                      }
                    }}
                  >
                    Export Excel ({bookings.length})
                  </Button>
                )}
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={isAdmin ? loadAdminReport : loadBookings}
                  disabled={loadingBookings}
                  sx={{
                    background: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.9)',
                    '&:hover': {
                      background: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                    }
                  }}
                >
                  Refresh
                </Button>
              </Box>
            </Box>

            {/* Admin Date Filter */}
            {isAdmin && (
              <Box sx={{ mb: 3 }}>
                <Card
                  sx={{
                    background: isDarkMode
                      ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
                      : 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
                    border: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'}`,
                    borderRadius: 2,
                    p: 3
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                    <Box
                      sx={{
                        background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                        borderRadius: '50%',
                        p: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <FilterIcon sx={{ color: 'white', fontSize: 20 }} />
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Advanced Filters
                    </Typography>
                  </Box>

                  <Grid container spacing={3} alignItems="center">
                    {/* Date Filter */}
                    <Grid item xs={12} sm={6} md={3}>
                      <Box>
                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                          <CalendarIcon sx={{ mr: 1, fontSize: 16, verticalAlign: 'middle' }} />
                          Date
                        </Typography>
                        <TextField
                          type="date"
                          value={selectedDate}
                          onChange={(e) => handleDateChange(e.target.value)}
                          fullWidth
                          size="small"
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              borderRadius: 2,
                              background: isDarkMode 
                                ? 'rgba(255, 255, 255, 0.05)'
                                : 'rgba(255, 255, 255, 0.9)',
                            }
                          }}
                        />
                      </Box>
                    </Grid>

                    {/* Pickup Time Filter */}
                    <Grid item xs={12} sm={6} md={3}>
                      <Box>
                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                          <ScheduleIcon sx={{ mr: 1, fontSize: 16, verticalAlign: 'middle' }} />
                          Pickup Time
                        </Typography>
                        <FormControl fullWidth size="small">
                          <Select
                            value={selectedPickupTime}
                            onChange={(e) => handlePickupTimeFilter(e.target.value)}
                            displayEmpty
                            sx={{
                              borderRadius: 2,
                              background: isDarkMode 
                                ? 'rgba(255, 255, 255, 0.05)'
                                : 'rgba(255, 255, 255, 0.9)',
                            }}
                          >
                            <MenuItem value="">All Times</MenuItem>
                            {pickupTimes.map((time) => (
                              <MenuItem key={time} value={time}>
                                {time}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Box>
                    </Grid>

                    {/* Pickup Location Filter */}
                    <Grid item xs={12} sm={6} md={3}>
                      <Box>
                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                          <LocationIcon sx={{ mr: 1, fontSize: 16, verticalAlign: 'middle' }} />
                          Pickup Location
                        </Typography>
                        <FormControl fullWidth size="small">
                          <Select
                            value={selectedPickupLocation}
                            onChange={(e) => handlePickupLocationFilter(e.target.value)}
                            displayEmpty
                            sx={{
                              borderRadius: 2,
                              background: isDarkMode 
                                ? 'rgba(255, 255, 255, 0.05)'
                                : 'rgba(255, 255, 255, 0.9)',
                            }}
                          >
                            <MenuItem value="">All Locations</MenuItem>
                            {pickupLocations.map((location) => (
                              <MenuItem key={location} value={location}>
                                {location}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Box>
                    </Grid>

                    {/* Filter Results & Actions */}
                    <Grid item xs={12} sm={6} md={3}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Chip
                          icon={<FilterIcon />}
                          label={`${bookings.length} bookings found`}
                          color="primary"
                          variant="outlined"
                          sx={{
                            background: isDarkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)',
                            borderColor: '#3b82f6'
                          }}
                        />
                        
                        {(selectedPickupTime || selectedPickupLocation) && (
                          <Button
                            size="small"
                            onClick={clearAllFilters}
                            sx={{
                              fontSize: '0.75rem',
                              textTransform: 'none',
                              color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)'
                            }}
                          >
                            Clear Filters
                          </Button>
                        )}
                        
                        {selectedDate === new Date().toISOString().split('T')[0] && (
                          <Chip
                            label="Today"
                            color="success"
                            size="small"
                            sx={{
                              background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                              color: 'white',
                              fontWeight: 600
                            }}
                          />
                        )}
                      </Box>
                    </Grid>
                  </Grid>
                </Card>
              </Box>
            )}

            {loadingBookings ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : bookings.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <CarIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  {isAdmin 
                    ? `No cab bookings found for ${new Date(selectedDate).toLocaleDateString()}`
                    : 'No bookings yet'
                  }
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {isAdmin 
                    ? 'Try selecting a different date or check if employees have made bookings for this date'
                    : 'Book your first cab to see it here'
                  }
                </Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      {isAdmin && (
                        <>
                          <TableCell>Employee</TableCell>
                          <TableCell>Email</TableCell>
                        </>
                      )}
                      <TableCell>Pickup Time</TableCell>
                      <TableCell>Department</TableCell>
                      <TableCell>Pickup Location</TableCell>
                      <TableCell>Drop-off Location</TableCell>
                      <TableCell>Booking Date</TableCell>
                      <TableCell>Status</TableCell>
                      {isAdmin && (
                        <TableCell>Needs Escort</TableCell>
                      )}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {bookings.map((booking) => (
                      <TableRow key={booking.id}>
                        {isAdmin && (
                          <>
                            <TableCell>
                              {booking.first_name && booking.last_name 
                                ? `${capitalizeFirstLetter(booking.first_name)} ${capitalizeFirstLetter(booking.last_name)}`
                                : 'N/A'
                              }
                            </TableCell>
                            <TableCell>{booking.user_email}</TableCell>
                          </>
                        )}
                        <TableCell>
                          <Chip
                            icon={<ScheduleIcon />}
                            label={booking.pickup_time}
                            color="primary"
                            variant="outlined"
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            icon={<BusinessIcon />}
                            label={booking.department}
                            color="secondary"
                            variant="outlined"
                            size="small"
                            sx={{
                              color: isDarkMode ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.8)',
                              borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)',
                              '& .MuiChip-icon': {
                                color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)'
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            icon={<LocationIcon />}
                            label={booking.pickup_location}
                            variant="outlined"
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{booking.dropoff_location}</TableCell>
                        <TableCell>
                          {new Date(booking.booking_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Chip
                            icon={<CheckCircleIcon />}
                            label="Confirmed"
                            color="success"
                            size="small"
                          />
                        </TableCell>
                        {isAdmin && (
                          <TableCell>
                            <FormControlLabel
                              control={
                                <Checkbox
                                  checked={booking.needs_escort || false}
                                  onChange={(e) => handleEscortUpdate(booking.id, e.target.checked)}
                                  color="primary"
                                  size="small"
                                />
                              }
                              label={booking.needs_escort ? "Yes" : "No"}
                              sx={{
                                '& .MuiFormControlLabel-label': {
                                  fontSize: '0.875rem',
                                  fontWeight: booking.needs_escort ? 600 : 400,
                                  color: booking.needs_escort 
                                    ? '#059669' 
                                    : isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)'
                                }
                              }}
                            />
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </motion.div>

        {/* Whitelist Management Section (HR Admin Only) */}
        {isHrAdmin && (
          <motion.div
            custom={3} // Adjust delay based on previous sections
            initial="hidden"
            animate="visible"
            variants={sectionVariants}
          >
            <Paper sx={{
              mt: 4, 
              p: 3,
              background: isDarkMode
                ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
                : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
              border: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'}`,
              borderRadius: 3
            }}>
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
                🔑 Cab Booking Whitelist Management
              </Typography>

              {/* Export Whitelist Button */}
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={exportWhitelistToExcel}
                  disabled={whitelistedEmails.length === 0}
                >
                  Export Whitelist ({whitelistedEmails.length})
                </Button>
              </Box>

              {/* Add to Whitelist Form */}
              <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
                <Autocomplete
                  sx={{ flexGrow: 1 }}
                  options={allSystemUsers.filter(u => !whitelistedEmails.some(w => w.email === u.email))}
                  getOptionLabel={(option) => option.email || ''}
                  value={selectedUserToWhitelist}
                  onChange={(event, newValue) => {
                    setSelectedUserToWhitelist(newValue);
                  }}
                  isOptionEqualToValue={(option, value) => option.email === value.email}
                  renderInput={(params) => 
                    <TextField 
                      {...params} 
                      label="Select User to Add to Whitelist" 
                      variant="outlined"
                      sx={{ 
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                          background: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'
                        }
                      }}
                    />
                  }
                  renderOption={(props, option) => (
                    <Box component="li" {...props}>
                      {option.email}
                    </Box>
                  )}
                />
                <Button 
                  variant="contained" 
                  onClick={() => selectedUserToWhitelist && handleAddEmailToWhitelist(selectedUserToWhitelist.email)}
                  disabled={!selectedUserToWhitelist || loadingWhitelistManagement}
                  sx={{
                    height: 56, // Match Autocomplete height
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                     '&:hover': {
                        background: 'linear-gradient(135deg, #059669 0%, #047857 100%)'
                      }
                  }}
                >
                  {loadingWhitelistManagement && selectedUserToWhitelist ? <CircularProgress size={24} color="inherit"/> : 'Add to Whitelist'}
                </Button>
              </Box>

              {/* Whitelisted Emails Table */}
              {loadingWhitelistManagement && whitelistedEmails.length === 0 ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}><CircularProgress /></Box>
              ) : whitelistedEmails.length === 0 ? (
                <Typography sx={{ textAlign: 'center', p:2, color: 'text.secondary' }}>No users currently in the whitelist.</Typography>
              ) : (
                <TableContainer component={Paper} sx={{ 
                  background: isDarkMode ? 'rgba(255,255,255,0.03)': 'rgba(0,0,0,0.01)',
                  borderRadius: 2 
                }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>Email</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Added By</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Date Added</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {whitelistedEmails.map((item) => (
                        <TableRow key={item.email}>
                          <TableCell>{item.email}</TableCell>
                          <TableCell>{item.added_by || 'N/A'}</TableCell>
                          <TableCell>{new Date(item.created_at).toLocaleDateString()}</TableCell>
                          <TableCell align="right">
                            <Button 
                              variant="outlined" 
                              color="error" 
                              size="small"
                              onClick={() => handleRemoveEmailFromWhitelist(item.email)}
                              disabled={loadingWhitelistManagement}
                            >
                              Remove
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Paper>
          </motion.div>
        )}

      </Container>

      {/* Booking Dialog */}
      <Dialog
        open={showBookingDialog}
        onClose={() => setShowBookingDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <CarIcon sx={{ mr: 1, color: '#dc2626' }} />
            Book a Cab
          </Box>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={4} sx={{ mt: 1 }}>
            {/* Pickup Time - Button Selector */}
            <Grid item xs={12}>
              <Box sx={{ mb: 3 }}>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    mb: 3, 
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    color: isDarkMode ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.8)'
                  }}
                >
                  <Box
                    sx={{
                      background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                      borderRadius: '50%',
                      width: 56,
                      height: 56,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mr: 2
                    }}
                  >
                    <ScheduleIcon sx={{ color: 'white', fontSize: 20 }} />
                  </Box>
                  Pickup Time*
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  {pickupTimes.map((time) => (
                    <Button
                      key={time}
                      variant={formData.pickupTime === time ? 'contained' : 'outlined'}
                      onClick={() => handleInputChange('pickupTime', time)}
                      startIcon={<ScheduleIcon sx={{ fontSize: 18 }} />}
                      sx={{
                        minWidth: 140,
                        height: 56,
                        borderRadius: 3,
                        fontSize: '1rem',
                        fontWeight: 600,
                        textTransform: 'none',
                        position: 'relative',
                        overflow: 'hidden',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        background: formData.pickupTime === time 
                          ? 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)'
                          : isDarkMode 
                            ? 'rgba(255, 255, 255, 0.05)'
                            : 'rgba(255, 255, 255, 0.9)',
                        borderColor: formData.pickupTime === time 
                          ? 'transparent'
                          : isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.12)',
                        borderWidth: 2,
                        color: formData.pickupTime === time 
                          ? 'white'
                          : isDarkMode ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.8)',
                        boxShadow: formData.pickupTime === time 
                          ? '0 8px 32px rgba(59, 130, 246, 0.3)'
                          : isDarkMode 
                            ? '0 4px 20px rgba(0, 0, 0, 0.3)'
                            : '0 4px 20px rgba(0, 0, 0, 0.08)',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          background: formData.pickupTime === time 
                            ? 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)'
                            : isDarkMode 
                              ? 'rgba(255, 255, 255, 0.1)'
                              : 'rgba(59, 130, 246, 0.05)',
                          borderColor: formData.pickupTime === time 
                            ? 'transparent'
                            : '#3b82f6',
                          boxShadow: formData.pickupTime === time 
                            ? '0 12px 40px rgba(59, 130, 246, 0.4)'
                            : '0 8px 32px rgba(59, 130, 246, 0.15)',
                        },
                        '&:active': {
                          transform: 'translateY(0px)',
                        }
                      }}
                    >
                      {time}
                    </Button>
                  ))}
                </Box>
              </Box>
            </Grid>

            {/* Department - Button Selector */}
            <Grid item xs={12}>
              <Box sx={{ mb: 3 }}>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    mb: 3, 
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    color: isDarkMode ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.8)'
                  }}
                >
                  <Box
                    sx={{
                      background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                      borderRadius: '50%',
                      p: 1,
                      mr: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <BusinessIcon sx={{ color: 'white', fontSize: 20 }} />
                  </Box>
                  Department*
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  {departments.map((dept) => (
                    <Button
                      key={dept}
                      variant={formData.department === dept ? 'contained' : 'outlined'}
                      onClick={() => handleInputChange('department', dept)}
                      startIcon={<BusinessIcon sx={{ fontSize: 18 }} />}
                      sx={{
                        minWidth: 140,
                        height: 56,
                        borderRadius: 3,
                        fontSize: '1rem',
                        fontWeight: 600,
                        textTransform: 'none',
                        position: 'relative',
                        overflow: 'hidden',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        background: formData.department === dept 
                          ? 'linear-gradient(135deg, #059669 0%, #10b981 100%) !important'
                          : isDarkMode 
                            ? 'rgba(255, 255, 255, 0.05)'
                            : 'rgba(255, 255, 255, 0.9)',
                        borderColor: formData.department === dept 
                          ? 'transparent'
                          : isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.12)',
                        borderWidth: 2,
                        color: formData.department === dept 
                          ? 'white !important'
                          : isDarkMode ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.8)',
                        boxShadow: formData.department === dept 
                          ? '0 8px 32px rgba(5, 150, 105, 0.3)'
                          : isDarkMode 
                            ? '0 4px 20px rgba(0, 0, 0, 0.3)'
                            : '0 4px 20px rgba(0, 0, 0, 0.08)',
                        '& .MuiButton-startIcon': {
                          color: formData.department === dept ? 'white !important' : 'inherit'
                        },
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          background: formData.department === dept 
                            ? 'linear-gradient(135deg, #047857 0%, #059669 100%) !important'
                            : isDarkMode 
                              ? 'rgba(255, 255, 255, 0.1)'
                              : 'rgba(5, 150, 105, 0.05)',
                          borderColor: formData.department === dept 
                            ? 'transparent'
                            : '#059669',
                          boxShadow: formData.department === dept 
                            ? '0 12px 40px rgba(5, 150, 105, 0.4)'
                            : '0 8px 32px rgba(5, 150, 105, 0.15)',
                          color: formData.department === dept 
                            ? 'white !important'
                            : isDarkMode ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.8)',
                        },
                        '&:active': {
                          transform: 'translateY(0px)',
                        }
                      }}
                    >
                      {dept}
                    </Button>
                  ))}
                </Box>
              </Box>
            </Grid>

            {/* Pickup Location - Button Selector */}
            <Grid item xs={12}>
              <Box sx={{ mb: 3 }}>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    mb: 3, 
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    color: isDarkMode ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.8)'
                  }}
                >
                  <Box
                    sx={{
                      background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
                      borderRadius: '50%',
                      p: 1,
                      mr: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <LocationIcon sx={{ color: 'white', fontSize: 20 }} />
                  </Box>
                  Pickup Location*
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  {pickupLocations.map((location) => (
                    <Button
                      key={location}
                      variant={formData.pickupLocation === location ? 'contained' : 'outlined'}
                      onClick={() => handleInputChange('pickupLocation', location)}
                      startIcon={<LocationIcon sx={{ fontSize: 18 }} />}
                      sx={{
                        minWidth: 160,
                        height: 56,
                        borderRadius: 3,
                        fontSize: '1rem',
                        fontWeight: 600,
                        textTransform: 'none',
                        position: 'relative',
                        overflow: 'hidden',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        background: formData.pickupLocation === location 
                          ? 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)'
                          : isDarkMode 
                            ? 'rgba(255, 255, 255, 0.05)'
                            : 'rgba(255, 255, 255, 0.9)',
                        borderColor: formData.pickupLocation === location 
                          ? 'transparent'
                          : isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.12)',
                        borderWidth: 2,
                        color: formData.pickupLocation === location 
                          ? 'white'
                          : isDarkMode ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.8)',
                        boxShadow: formData.pickupLocation === location 
                          ? '0 8px 32px rgba(220, 38, 38, 0.3)'
                          : isDarkMode 
                            ? '0 4px 20px rgba(0, 0, 0, 0.3)'
                            : '0 4px 20px rgba(0, 0, 0, 0.08)',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          background: formData.pickupLocation === location 
                            ? 'linear-gradient(135deg, #b91c1c 0%, #dc2626 100%)'
                            : isDarkMode 
                              ? 'rgba(255, 255, 255, 0.1)'
                              : 'rgba(220, 38, 38, 0.05)',
                          borderColor: formData.pickupLocation === location 
                            ? 'transparent'
                            : '#dc2626',
                          boxShadow: formData.pickupLocation === location 
                            ? '0 12px 40px rgba(220, 38, 38, 0.4)'
                            : '0 8px 32px rgba(220, 38, 38, 0.15)',
                        },
                        '&:active': {
                          transform: 'translateY(0px)',
                        }
                      }}
                    >
                      {location}
                    </Button>
                  ))}
                </Box>
              </Box>
            </Grid>

            {/* Drop-off Location - Enhanced Dropdown */}
            <Grid item xs={12}>
              <Box sx={{ mb: 2 }}>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    mb: 3, 
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    color: isDarkMode ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.8)'
                  }}
                >
                  <Box
                    sx={{
                      background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
                      borderRadius: '50%',
                      p: 1,
                      mr: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <LocationIcon sx={{ color: 'white', fontSize: 20 }} />
                  </Box>
                  Drop-off Location*
                </Typography>
                <FormControl 
                  fullWidth
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 3,
                      height: 56,
                      background: isDarkMode 
                        ? 'rgba(255, 255, 255, 0.05)'
                        : 'rgba(255, 255, 255, 0.9)',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        boxShadow: isDarkMode 
                          ? '0 4px 20px rgba(0, 0, 0, 0.3)'
                          : '0 4px 20px rgba(0, 0, 0, 0.08)',
                      },
                      '&.Mui-focused': {
                        boxShadow: '0 8px 32px rgba(245, 158, 11, 0.15)',
                      }
                    },
                    '& .MuiInputLabel-root': {
                      fontWeight: 500,
                    }
                  }}
                >
                  <InputLabel>Drop-off Location*</InputLabel>
                  <Select
                    value={formData.dropoffLocation}
                    onChange={(e) => handleInputChange('dropoffLocation', e.target.value)}
                    label="Drop-off Location *"
                  >
                    {dropoffLocations.map((location) => (
                      <MenuItem key={location} value={location}>
                        {location}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setShowBookingDialog(false)} color="error">
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleBookCab}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <CarIcon />}
            sx={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)'
              }
            }}
          >
            {loading ? 'Booking...' : 'Book Cab'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CabService; 