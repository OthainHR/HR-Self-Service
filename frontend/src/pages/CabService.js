import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Download as DownloadIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
  WbSunny as MorningIcon, // Added MorningIcon
  NightsStay as EveningIcon // Added EveningIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useDarkMode } from '../contexts/DarkModeContext';
import { motion } from 'framer-motion';
import { useTheme } from '@mui/material/styles';
import { supabase } from '../services/supabase';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Geolocation } from '@capacitor/geolocation'; // Geolocation for auto drop-off

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

  // Helper to format YYYY-MM-DD without timezone issues
  const formatIsoDate = (iso) => {
    const parts = iso.split('-');
    if (parts.length === 3) {
      return `${parseInt(parts[1], 10)}/${parseInt(parts[2], 10)}/${parts[0]}`;
    }
    return iso;
  };

  // Add helper to extract a display name from an email address
  const formatNameFromEmail = (email) => {
    if (!email) return '';
    const local = email.split('@')[0];
    const parts = local.split('.');
    if (parts.length >= 2) {
      return `${capitalizeFirstLetter(parts[0])} ${capitalizeFirstLetter(parts[1])}`;
    }
    return capitalizeFirstLetter(parts[0]);
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
  // State for users who haven't booked a cab today (admin metric)
  const [unbookedUsers, setUnbookedUsers] = useState([]);
  const [selectedUserToWhitelist, setSelectedUserToWhitelist] = useState(null);
  const [loadingWhitelistManagement, setLoadingWhitelistManagement] = useState(false);

  // State for reminder buttons (HR admin)
  const [loadingMorningReminder, setLoadingMorningReminder] = useState(false);
  const [loadingEveningReminder, setLoadingEveningReminder] = useState(false);

    // Use ref to track permission state to prevent race conditions
  const permissionStateRef = useRef('unknown');
  const watchIdRef = useRef(null);

  // Global cab service visibility (controlled by HR Admin)
  const [cabServiceGlobalVisibility, setCabServiceGlobalVisibility] = useState(true);
  const [loadingCabServiceGlobalVisibility, setLoadingCabServiceGlobalVisibility] = useState(true);

  // User's specific cab configuration from whitelist
  const [userCabConfig, setUserCabConfig] = useState({
    allowedPickup: null,
    preferredDropoff: null, // This will be treated as allowedDropoff if set
    isConfigured: false,
    allowedPickupTime: null, 
  });

  // State for editing a whitelist entry
  const [showEditWhitelistEntryDialog, setShowEditWhitelistEntryDialog] = useState(false);
  const [editingWhitelistEntry, setEditingWhitelistEntry] = useState(null);
  const [newWhitelistedUserDetails, setNewWhitelistedUserDetails] = useState({
    pick_up_location: '',
    drop_off_location: '',
    pickup_time: '', 
  });

  // Auto drop-off feature (Capacitor background geofence) – coming soon
  const [autoDropoffEnabled, setAutoDropoffEnabled] = useState(() => localStorage.getItem('autoDropoff') === 'true');

  const setSnackbarWithLogging = React.useCallback((newState) => {
    // console.log('[CabService - setSnackbarWithLogging] Called with:', newState); // Optional: keep for debugging
    // console.trace('[CabService - setSnackbarWithLogging] Trace for this call:'); // Optional: keep for debugging
    try {
      setSnackbar(newState); // Call setSnackbar directly
    } catch (e) {
      // console.error('[CabService - setSnackbarWithLogging] !!! ERROR DURING setSnackbar() CALL !!!:', e); // Optional: keep for debugging
    }
  }, [setSnackbar]); // Add setSnackbar as a dependency

  // Dropdown options
  const pickupTimes = ['9pm', '11:30pm', '2:30am'];
  const departments = ['GBT', 'Presidio', 'Othain'];
  // const pickupLocations = ['Building # 9', 'Building # 16']; // deprecated, replaced by dynamic list
  // const dropoffLocations = [ /* many locations */ ]; // deprecated, now dynamic

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
          .select('email, pick_up_location, drop_off_location, pickup_time') // Fetch new fields
          .eq('email', user.email)
          .maybeSingle(); // Use maybeSingle as it might return null if not found

        if (error) {
          console.error('Error checking whitelist status:', error);
          setIsUserWhitelisted(false); // Default to not whitelisted on error
          setUserCabConfig({ allowedPickup: null, preferredDropoff: null, isConfigured: false, allowedPickupTime: null });
        } else {
          setIsUserWhitelisted(!!data); // True if data is not null (email found)
          if (data) {
            setUserCabConfig({
              allowedPickup: data.pick_up_location,
              preferredDropoff: data.drop_off_location,
              isConfigured: true,
              allowedPickupTime: data.pickup_time, // Store whitelisted pickup time
            });
          } else {
            setUserCabConfig({ allowedPickup: null, preferredDropoff: null, isConfigured: false, allowedPickupTime: null });
          }
        }
      } catch (err) {
        console.error('Exception checking whitelist status:', err);
        setIsUserWhitelisted(false);
        setUserCabConfig({ allowedPickup: null, preferredDropoff: null, isConfigured: false, allowedPickupTime: null });
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
      // Attempt to fetch from the new consolidated view first
      let { data, error } = await supabase
        .from('v_booking_with_coords')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // If the view errors out (e.g. permissions) OR returns zero rows while we know a fresh booking was just inserted,
      // fall back to the raw table so users still see their bookings.
      if (error || !data || data.length === 0) {
        if (error) {
          console.warn('[CabService] v_booking_with_coords error, falling back to cab_bookings:', error);
        }
        const fallback = await supabase
        .from('cab_bookings')
          .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
        if (!fallback.error) {
          data = fallback.data;
        } else {
          // Preserve original error if both fail – will be thrown below
          error = error || fallback.error;
        }
      }

      if (error) throw error;
      setBookings(data || []);
      
      // Update last booking reference
      if (data && data.length > 0) {
        setLastBooking(data[0]);
      }
    } catch (error) {
      console.error('Error loading bookings:', error);
      setSnackbarWithLogging({
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

    // Ensure user is authenticated before querying report view
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      setSnackbarWithLogging({ open: true, message: 'Please log in to view admin report.', severity: 'error' });
      setLoadingBookings(false);
      return;
    }

    try {
      // Primary – view with joined coordinates
      let { data, error } = await supabase
        .from('v_booking_with_coords')
        .select('*')
        .order('created_at', { ascending: false });

      // Fallback to legacy view/table on error/empty
      if (error || !data || data.length === 0) {
        if (error) {
          console.warn('[CabService] v_booking_with_coords error (admin), falling back to v_cab_bookings_report:', error);
        }
        const fallback = await supabase
        .from('v_cab_bookings_report')
          .select('*')
        .order('created_at', { ascending: false });
        if (!fallback.error) {
          data = fallback.data;
        } else {
          error = error || fallback.error;
        }
      }

      if (error) throw error;
      setAllBookings(data || []);
      filterBookings(data || [], selectedDate, selectedPickupTime, selectedPickupLocation);
    } catch (error) {
      console.error('Error loading admin report:', error);
      setSnackbarWithLogging({
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
      // console.warn('[CabService - handleBookCab] Form validation failed. Missing fields.');
      setSnackbarWithLogging({
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
        pickup_location_id: locationIdByName[formData.pickupLocation],
        dropoff_location_id: locationIdByName[formData.dropoffLocation],
        booking_date: new Date().toISOString().split('T')[0],
        needs_escort: false,
        dropped_off: false,
      };

      const { error: insertError } = await supabase // Renamed to insertError
        .from('cab_bookings')
        .insert([bookingData])
        // The 'error' object from the insert itself is the primary indicator of success/failure.
        ;

      // If Supabase client returns any error object, treat it as an error.
      // Only throw if it has a .message property (more like a true error)
      if (insertError && insertError.message) {
        console.error('Supabase insert operation returned an error object WITH A MESSAGE:', insertError);
        throw insertError; // Re-throw to be caught by the catch block below
      } else if (insertError) {
        console.warn('[CabService - handleBookCab] Supabase insertError was truthy but had no .message. Treating as non-critical:', insertError);
        // For now, let this proceed to the success path. Depending on the content of insertError,
        // you might want to handle this differently or still throw it.
      }

      // If insertError is null, we proceed as success
      setSnackbarWithLogging({
        open: true,
        message: 'Cab booked successfully! Confirmation email sent.', // Restored original success message
        severity: 'success'
      });

      loadBookings(); // Restored loadBookings() call
      
      // Defer closing dialog and resetting form slightly to see if it changes behavior
      // setTimeout(() => { // Removing setTimeout as the main issue seems resolved
      setShowBookingDialog(false);
      // console.log('[CabService - handleBookCab] (setTimeout) setShowBookingDialog(false) called.');
      // Reset form - this was missing from the success path after the previous reset was removed
      setFormData({
        pickupTime: '',
        department: '',
        pickupLocation: '',
        dropoffLocation: ''
      });
      // console.log('[CabService - handleBookCab] (setTimeout) Form reset.');
      // }, 0);

    } catch (error) { // This is the outer catch block
      // Restore original catch block logging and snackbar message setting
      console.error('Error booking cab:', error);
      let detailedErrorMessage = 'Failed to book cab. Please try again.';
      if (error && typeof error === 'object') {
        // console.error('Supabase error details:', JSON.stringify(error, null, 2)); // Can be kept for debugging if needed
        if (error.message) {
          detailedErrorMessage = `Failed to book cab: ${error.message}`;
        }
        if (error.details) {
          detailedErrorMessage += ` (Details: ${error.details})`;
        }
        if (error.hint) {
          detailedErrorMessage += ` (Hint: ${error.hint})`;
        }
      }
      setSnackbarWithLogging({
        open: true,
        message: detailedErrorMessage, // Restored dynamic error message
        severity: 'error'
      });
    } finally {
      setLoading(false);
      // console.log('[CabService - handleBookCab] setLoading(false) in finally block.');
    }
  };

  // Handle rebook with last booking data
  const handleRebook = () => {
    
    if (lastBooking) {
      let rebookFormData = {
        pickupTime: lastBooking.pickup_time,
        department: lastBooking.department,
        pickupLocation: lastBooking.pickup_location,
        dropoffLocation: lastBooking.dropoff_location
      };

      // Override with whitelisted values if they exist for non-HR user
      if (!isHrAdmin && userCabConfig.isConfigured) {
        if (userCabConfig.allowedPickupTime) {
          rebookFormData.pickupTime = userCabConfig.allowedPickupTime;
        }
        if (userCabConfig.allowedPickup) {
          rebookFormData.pickupLocation = userCabConfig.allowedPickup;
        }
        if (userCabConfig.preferredDropoff) {
          rebookFormData.dropoffLocation = userCabConfig.preferredDropoff;
        }
      }
      setFormData(rebookFormData);
      setShowBookingDialog(true);
    }
  };

  // Export to Excel (for admin)
  const exportToExcel = async () => {
    if (!isAdmin || bookings.length === 0) return;

    // Prepare data for Excel
    const excelData = bookings.map(booking => [
      new Date(booking.booking_date).toLocaleDateString(),
      booking.first_name
        ? capitalizeFirstLetter(booking.first_name)
        : formatNameFromEmail(booking.user_email).split(' ')[0],
      booking.last_name
        ? capitalizeFirstLetter(booking.last_name)
        : (formatNameFromEmail(booking.user_email).split(' ')[1] || ''),
      booking.user_email || '',
      booking.pickup_time,
      booking.pickup_location,
      booking.dropoff_location,
      booking.department,
      booking.needs_escort ? 'Yes' : 'No',
      new Date(booking.created_at).toLocaleString()
    ]);

    // Create workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Cab Bookings');

    // Add headers
    const headers = [
      'Date', 'First Name', 'Last Name', 'Email', 'Pickup Time',
      'Pickup Location', 'Drop-off Location', 'Department', 'Needs Escort', 'Booking Time'
    ];
    worksheet.addRow(headers);

    // Add data rows
    excelData.forEach(row => worksheet.addRow(row));

    // Set column widths
    worksheet.columns = [
      { width: 12 }, // Date
      { width: 15 }, // First Name
      { width: 15 }, // Last Name
      { width: 25 }, // Email
      { width: 12 }, // Pickup Time
      { width: 18 }, // Pickup Location
      { width: 20 }, // Drop-off Location
      { width: 12 }, // Department
      { width: 12 }, // Needs Escort
      { width: 20 }  // Booking Time
    ];

    // Style the header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '4CAF50' }
    };
    headerRow.alignment = { horizontal: 'center' };

    // Generate filename with filters
    const filterSuffix = [
      selectedPickupTime && `time-${selectedPickupTime.replace(':', '')}`,
      selectedPickupLocation && `location-${selectedPickupLocation.replace(/[^a-zA-Z0-9]/g, '')}`
    ].filter(Boolean).join('_');
    
    const filename = filterSuffix 
      ? `cab_bookings_${selectedDate}_${filterSuffix}_${bookings.length}_entries.xlsx`
      : `cab_bookings_${selectedDate}_${bookings.length}_entries.xlsx`;

    // Write and download the file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, filename);

    // Enhanced success message with filter info
    const filterInfo = [
      `Date: ${new Date(selectedDate).toLocaleDateString()}`,
      selectedPickupTime && `Time: ${selectedPickupTime}`,
      selectedPickupLocation && `Location: ${selectedPickupLocation}`
    ].filter(Boolean).join(', ');

    setSnackbarWithLogging({
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
        setSnackbarWithLogging({
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
        setSnackbarWithLogging({
          open: true,
          message: `Escort status updated to ${confirmedNeedsEscort ? 'Yes' : 'No'}`,
          severity: 'success'
        });
      }

    } catch (error) {
      // This will catch errors from the try block, including re-thrown Supabase errors
      console.error('Failed to update escort status (catch block):', error);
      setSnackbarWithLogging({
        open: true,
        message: 'Failed to update escort status. Check console for details.',
        severity: 'error'
      });
    }
  };

  // Handle dropped off status update (for user's own bookings)
  const handleDroppedOffUpdate = async (bookingId, newDroppedOffStatus) => {
    try {
      const { data, error, count } = await supabase
        .from('cab_bookings')
        .update({ dropped_off: newDroppedOffStatus })
        .eq('id', bookingId)
        .eq('user_id', user.id) // Ensure user can only update their own bookings
        .select();

      if (error) {
        console.error('Error updating dropped off status:', error);
        throw error;
      }

      if (count === 0 || !data || data.length === 0) {
        console.warn('No rows were affected when updating dropped off status. Booking ID:', bookingId);
        setSnackbarWithLogging({
          open: true,
          message: 'Unable to update status. You can only update your own bookings.',
          severity: 'warning'
        });
        return;
      }

      // Update local state
      const updatedBooking = data[0];
      const confirmedDroppedOff = updatedBooking.dropped_off;

      setBookings(prevBookings => 
        prevBookings.map(booking => 
          booking.id === bookingId 
            ? { ...booking, dropped_off: confirmedDroppedOff }
            : booking
        )
      );

      setAllBookings(prevAllBookings => 
        prevAllBookings.map(booking => 
          booking.id === bookingId 
            ? { ...booking, dropped_off: confirmedDroppedOff }
            : booking
        )
      );

      setSnackbarWithLogging({
        open: true,
        message: `Drop-off status updated to ${confirmedDroppedOff ? 'Completed' : 'Pending'}`,
        severity: 'success'
      });

    } catch (error) {
      console.error('Failed to update dropped off status:', error);
      setSnackbarWithLogging({
        open: true,
        message: 'Failed to update drop-off status. Please try again.',
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
        .select('email, created_at, added_by, pick_up_location, drop_off_location, pickup_time')
        .order('email', { ascending: true });
      if (error) throw error;
      setWhitelistedEmails(data || []);
    } catch (err) {
      console.error('Error fetching whitelisted emails:', err);
      setSnackbarWithLogging({ open: true, message: 'Failed to load whitelist', severity: 'error' });
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
      setSnackbarWithLogging({ open: true, message: 'Failed to load system users for whitelist', severity: 'error' });
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
        setSnackbarWithLogging({ open: true, message: `${emailToAdd} is already whitelisted.`, severity: 'info' });
        return;
      }

      const { error } = await supabase
        .from('cab_booking_whitelist')
        .insert({ 
          email: emailToAdd, 
          added_by: user.email,
          pick_up_location: newWhitelistedUserDetails.pick_up_location || null,
          drop_off_location: newWhitelistedUserDetails.drop_off_location || null,
          pickup_time: newWhitelistedUserDetails.pickup_time || null, // Add pickup_time
          drop_off_location_id: locationIdByName[newWhitelistedUserDetails.drop_off_location] || null,
        }); 
      if (error) throw error;
      setSnackbarWithLogging({ open: true, message: `${emailToAdd} added to whitelist.`, severity: 'success' });
      fetchWhitelistedEmails(); // Refresh list
      setSelectedUserToWhitelist(null); // Reset selection
      setNewWhitelistedUserDetails({ pick_up_location: '', drop_off_location: '', pickup_time: '' }); // Reset details
    } catch (err) {
      console.error('Error adding to whitelist:', err);
      setSnackbarWithLogging({ open: true, message: `Failed to add ${emailToAdd} to whitelist.`, severity: 'error' });
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
      setSnackbarWithLogging({ open: true, message: `${emailToRemove} removed from whitelist.`, severity: 'success' });
      fetchWhitelistedEmails(); // Refresh list
    } catch (err) {
      console.error('Error removing from whitelist:', err);
      setSnackbarWithLogging({ open: true, message: `Failed to remove ${emailToRemove}.`, severity: 'error' });
    } finally {
      setLoadingWhitelistManagement(false);
    }
  };

  // Export whitelist to Excel
  const exportWhitelistToExcel = async () => {
    if (whitelistedEmails.length === 0) return;
    const excelData = whitelistedEmails.map(item => {
      const email = item.email;
      const prefix = email.split('@')[0];
      const parts = prefix.split('.');
      const first = capitalizeFirstLetter(parts[0] || '');
      const last = capitalizeFirstLetter(parts[1] || '');
      return [
        first, 
        last, 
        email,
        item.pick_up_location || 'N/A',
        item.drop_off_location || 'N/A',
        item.pickup_time || 'N/A', // Added pickup time
      ];
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Whitelist');

    // Add headers
    const headers = [
      'First Name', 'Last Name', 'Email', 'Default Pickup Location',
      'Default Drop-off Location', 'Default Pickup Time'
    ];
    worksheet.addRow(headers);

    // Add data rows
    excelData.forEach(row => worksheet.addRow(row));

    // Set column widths
    worksheet.columns = [
      { width: 15 }, // First Name
      { width: 15 }, // Last Name
      { width: 25 }, // Email
      { width: 20 }, // Default Pickup Location
      { width: 20 }, // Default Drop-off Location
      { width: 15 }  // Default Pickup Time
    ];

    // Style the header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '4CAF50' }
    };
    headerRow.alignment = { horizontal: 'center' };

    // Write and download the file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `cab_booking_whitelist_${whitelistedEmails.length}_entries.xlsx`);

    setSnackbarWithLogging({ open: true, message: `Exported ${whitelistedEmails.length} users to Excel`, severity: 'success' });
  };

  // Load whitelist management data if HR Admin
  useEffect(() => {
    if (isAdmin) {
      // Fetch all system users for admin dashboard
      fetchAllSystemUsers();
    }
    if (isHrAdmin) {
      // Fetch whitelist data for HR admins
      fetchWhitelistedEmails();
    }
  }, [isAdmin, isHrAdmin]);

  // Compute unbooked users for selected date (admin only)
  useEffect(() => {
    if (!isAdmin) return;
    const bookedEmails = allBookings
      .filter(b => b.booking_date === selectedDate)
      .map(b => b.user_email);
    const bookedSet = new Set(bookedEmails);
    const unbooked = whitelistedEmails.filter(w => !bookedSet.has(w.email));
    setUnbookedUsers(unbooked);
  }, [isAdmin, allBookings, whitelistedEmails, selectedDate]);

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
      setSnackbarWithLogging({
        open: true,
        message: `Cab Service visibility ${newVisibility ? 'enabled' : 'disabled'} for all users.`,
        severity: 'success',
      });
    } catch (err) {
      console.error('Error updating cab service visibility:', err);
      setSnackbarWithLogging({
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

  // Helper to check if current IST time is before 6:30pm
  const isBeforeCabCutoff = () => {
    const now = new Date();
    // Convert to IST (UTC+5:30)
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const ist = new Date(utc + (5.5 * 60 * 60 * 1000));
    const hours = ist.getHours();
    const minutes = ist.getMinutes();
    // 18:30 is the cutoff
    return hours < 18 || (hours === 18 && minutes < 30);
  };

  const canUserAccessCabService = cabServiceGlobalVisibility && (isUserWhitelisted || isHrAdmin) && isBeforeCabCutoff();


  // Effect to pre-fill form data based on userCabConfig when booking dialog opens
  useEffect(() => {
    if (showBookingDialog && userCabConfig.isConfigured && !isHrAdmin) {
      let newFormData = {};
      if (userCabConfig.allowedPickup) {
        newFormData.pickupLocation = userCabConfig.allowedPickup;
      }
      if (userCabConfig.allowedPickupTime) { 
        newFormData.pickupTime = userCabConfig.allowedPickupTime;
      }
      // Pre-fill dropoff if not already set by user in current session or from rebook
      if (userCabConfig.preferredDropoff && !formData.dropoffLocation) { // Treat preferredDropoff as allowedDropoff
        newFormData.dropoffLocation = userCabConfig.preferredDropoff;
      }
      if (Object.keys(newFormData).length > 0) {
        setFormData(prev => ({ ...prev, ...newFormData }));
      }
    }
    // If dialog closes, reset part of form potentially affected by userCabConfig if not rebooking.
    // This part might need refinement based on how rebook interacts.
    // For now, let's assume rebook directly sets formData, overriding this.
  }, [showBookingDialog, userCabConfig, isHrAdmin]);


  const handleOpenEditWhitelistDialog = (entry) => {
    setEditingWhitelistEntry({
      email: entry.email,
      pick_up_location: entry.pick_up_location || '',
      drop_off_location: entry.drop_off_location || '',
      pickup_time: entry.pickup_time || '', // Added pickup_time
    });
    setShowEditWhitelistEntryDialog(true);
  };

  const handleSaveWhitelistEntryUpdate = async () => {
    if (!editingWhitelistEntry || !editingWhitelistEntry.email) return;
    setLoadingWhitelistManagement(true);
    try {
      const { error } = await supabase
        .from('cab_booking_whitelist')
        .update({
          pick_up_location: editingWhitelistEntry.pick_up_location || null,
          drop_off_location: editingWhitelistEntry.drop_off_location || null,
          pickup_time: editingWhitelistEntry.pickup_time || null
        })
        .eq('email', editingWhitelistEntry.email);
      
      if (error) throw error;
      setSnackbarWithLogging({ open: true, message: `Whitelist entry for ${editingWhitelistEntry.email} updated.`, severity: 'success' });
      fetchWhitelistedEmails();
      setShowEditWhitelistEntryDialog(false);
      setEditingWhitelistEntry(null);
    } catch (err) {
      console.error('Error updating whitelist entry:', err);
      setSnackbarWithLogging({ open: true, message: `Failed to update whitelist entry for ${editingWhitelistEntry.email}.`, severity: 'error' });
    } finally {
      setLoadingWhitelistManagement(false);
    }
  };

  // Sorting state for bookings table
  const [sortBy, setSortBy] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');

  // Handle table sorting for admin bookings table
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDirection('asc');
    }
  };

  // Compute sorted bookings based on sortBy and sortDirection
  const sortedBookings = React.useMemo(() => {
    if (!sortBy) return bookings;
    return [...bookings].sort((a, b) => {
      const aVal = a[sortBy] ?? '';
      const bVal = b[sortBy] ?? '';
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        const cmp = aVal.localeCompare(bVal);
        return sortDirection === 'asc' ? cmp : -cmp;
      }
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [bookings, sortBy, sortDirection]);

  // Handle sending reminders (HR Admin)
  const handleSendReminder = async (reminderType) => {
    if (!isHrAdmin) return;

    if (reminderType === 'morning') {
      setLoadingMorningReminder(true);
    } else if (reminderType === 'evening') {
      setLoadingEveningReminder(true);
    }

    try {
      const functionName = `send-cab-booking-reminders?reminder=${reminderType}`;
      const { data, error } = await supabase.functions.invoke(functionName, {
        method: 'GET',
      });

      if (error) {
        throw error; // Throw to be caught by the catch block
      }

      if (data && data.success) {
        let successMessage = `Successfully sent ${reminderType} reminders.`;
        if (data.message) { // For weekend message
            successMessage = data.message;
        } else if (typeof data.sent !== 'undefined') {
            successMessage = `Successfully sent ${reminderType} reminders to ${data.sent} user(s).`;
        }
        setSnackbarWithLogging({
          open: true,
          message: successMessage,
          severity: 'success',
        });
      } else {
        // This case might occur if data.success is false or data is not as expected
        throw new Error(data?.error || 'Failed to send reminders. Unknown response from server.');
      }
    } catch (err) {
      console.error(`Error sending ${reminderType} reminders:`, err);
      setSnackbarWithLogging({
        open: true,
        message: `Failed to send ${reminderType} reminders: ${err.message || 'Please check console for details.'}`,
        severity: 'error',
      });
    } finally {
      if (reminderType === 'morning') {
        setLoadingMorningReminder(false);
      } else if (reminderType === 'evening') {
        setLoadingEveningReminder(false);
      }
    }
  };

  // Add after handleRebook
  // Handle cancel booking
  const handleCancelBooking = async (bookingId) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('cab_bookings')
        .delete()
        .eq('id', bookingId);
      if (error) throw error;
      setSnackbarWithLogging({
        open: true,
        message: 'Booking cancelled successfully.',
        severity: 'success',
      });
      loadBookings();
    } catch (error) {
      setSnackbarWithLogging({
        open: true,
        message: 'Failed to cancel booking. Please try again.',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  // Bookings ref for future automatic updates
  const bookingsRef = useRef([]);
  useEffect(() => { bookingsRef.current = bookings; }, [bookings]);

  // Geolocation watcher – auto marks drop-off when inside configured radius
  useEffect(() => {
    if (!autoDropoffEnabled) {
        // Clean up existing watcher if auto-dropoff is disabled
        if (watchIdRef.current) {
            Geolocation.clearWatch({ id: watchIdRef.current });
            watchIdRef.current = null;
        }
        return;
    }

    // If we already have a watcher running, don't start another
    if (watchIdRef.current) {
        return;
    }

    const startLocationWatcher = async () => {
        try {
            console.log('[CabService] Starting location watcher...');
            watchIdRef.current = await Geolocation.watchPosition(
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 3000
                },
                (position) => {
                    const { latitude, longitude } = position.coords;
                    console.log('[CabService] Current location:', latitude, longitude);
                    
                    // Check if user is within drop-off radius
                    const currentBookings = bookingsRef.current;
                    console.log('[CabService] Total bookings in ref:', currentBookings.length);
                    
                    // Debug: Show all bookings and their dates
                    currentBookings.forEach((booking, index) => {
                        console.log(`[CabService] All Booking ${index + 1}:`, {
                            id: booking.id,
                            booking_date: booking.booking_date,
                            booking_date_type: typeof booking.booking_date,
                            dropped_off: booking.dropped_off
                        });
                    });
                    
                    const today = new Date().toDateString();
                    console.log('[CabService] Today date string:', today);
                    
                    const todayBookings = currentBookings.filter(booking => {
                        const bookingDate = new Date(booking.booking_date).toDateString();
                        console.log(`[CabService] Comparing booking date "${bookingDate}" with today "${today}"`);
                        const isToday = bookingDate === today;
                        const isNotDroppedOff = !booking.dropped_off;
                        console.log(`[CabService] Booking ${booking.id}: isToday=${isToday}, isNotDroppedOff=${isNotDroppedOff}`);
                        return isToday && isNotDroppedOff;
                    });
                    
                    console.log('[CabService] Today\'s active bookings:', todayBookings.length);
                    
                    if (todayBookings.length === 0) {
                        console.log('[CabService] No active bookings for today');
                        return;
                    }

                    todayBookings.forEach((booking, index) => {
                        console.log(`[CabService] Booking ${index + 1}:`, {
                            id: booking.id,
                            dropoff_location: booking.dropoff_location,
                            dropoff_lat: booking.dropoff_lat,
                            dropoff_lng: booking.dropoff_lng,
                            dropoff_radius: booking.dropoff_radius,
                            booking_date: booking.booking_date,
                            dropped_off: booking.dropped_off
                        });
                        
                        if (booking.dropoff_lat && booking.dropoff_lng && booking.dropoff_radius) {
                            const distance = haversineDist(
                                latitude, longitude,
                                booking.dropoff_lat, booking.dropoff_lng
                            );
                            
                            console.log(`[CabService] Distance to ${booking.dropoff_location}: ${distance.toFixed(1)}m (radius: ${booking.dropoff_radius}m)`);
                            
                            if (distance <= booking.dropoff_radius) {
                                console.log('[CabService] Within drop-off radius! Marking as dropped off...');
                                handleDroppedOffUpdate(booking.id, true);
                            }
                        } else {
                            console.warn(`[CabService] Missing geo data for booking ${booking.id}:`, {
                                dropoff_lat: booking.dropoff_lat,
                                dropoff_lng: booking.dropoff_lng,
                                dropoff_radius: booking.dropoff_radius
                            });
                        }
                    });
                },
                (error) => {
                    console.error('[CabService] Location watch error:', error);
                }
            );
        } catch (error) {
            console.error('[CabService] Failed to start location watcher:', error);
        }
    };

    // Initialize geolocation after function definition
    (async () => {
        try {
            // Check if we already have permission
            if (permissionStateRef.current === 'granted') {
                startLocationWatcher();
                return;
            }

            // Only request permission if we haven't already
            if (permissionStateRef.current === 'unknown') {
                console.log('[CabService] Checking location permission...');
                const perm = await Geolocation.checkPermissions();
                permissionStateRef.current = perm.location;
                
                if (perm.location === 'prompt') {
                    console.log('[CabService] Requesting location permission...');
                    const result = await Geolocation.requestPermissions();
                    permissionStateRef.current = result.location;
                    console.log('[CabService] Permission result:', result.location);
                }
            }

            if (permissionStateRef.current === 'granted') {
                startLocationWatcher();
            } else {
                console.warn('[CabService] Location permission not granted:', permissionStateRef.current);
            }
        } catch (error) {
            console.error('[CabService] Geolocation init error', error);
        }
    })();

    // Cleanup function
    return () => {
        if (watchIdRef.current) {
            Geolocation.clearWatch({ id: watchIdRef.current });
            watchIdRef.current = null;
        }
    };
}, [autoDropoffEnabled]); // Only depend on autoDropoffEnabled

  const handleAutoDropoffToggle = (event) => {
    const isEnabled = event.target.checked;
    localStorage.setItem('autoDropoff', isEnabled);
    setAutoDropoffEnabled(isEnabled);
  };

  const [locations, setLocations] = useState({ pickup: [], dropoff: [] });

  // Derived arrays from locations
  const pickupLocations = useMemo(() => locations.pickup.map(l => l.name), [locations]);
  const dropoffLocations = useMemo(() => locations.dropoff.map(l => l.name), [locations]);

  const locationIdByName = useMemo(() => {
    const map = {};
    [...locations.pickup, ...locations.dropoff].forEach(l => {
      map[l.name] = l.id;
    });
    return map;
  }, [locations]);

  useEffect(() => {
    // Fetch master location list once on mount
    (async () => {
      const { data, error } = await supabase
        .from('cab_locations')
        .select('id, role, name, radius_m, lat, lng')
        .order('name');
      if (!error && data) {
        setLocations({
          pickup: data.filter(l => l.role === 'pickup'),
          dropoff: data.filter(l => l.role === 'dropoff'),
        });
      } else {
        console.error('Failed to load location master', error);
      }
    })();
  }, []);

  // Helper to calculate distance (Haversine) between two lat/lng points – returns metres
  const haversineDist = (lat1, lon1, lat2, lon2) => {
    const toRad = (deg) => (deg * Math.PI) / 180;
    const R = 6371000; // metres
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

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

        {/* Future feature placeholder */}
        <Box sx={{ textAlign: 'center', mt: 2, mb: 3 }}>
          <FormControlLabel
            control={
              <Switch
                checked={autoDropoffEnabled}
                onChange={handleAutoDropoffToggle}
                color="primary"
              />
            }
            label="Enable Hands-free Auto Drop-off"
          />
        </Box>

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

        {/* Mobile-Friendly Quick Actions for Drop-off Status - TOP PRIORITY */}
        {!isAdmin && isUserWhitelisted && !loadingWhitelistStatus && !loadingBookings && bookings.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            style={{ marginBottom: theme.spacing(3) }}
          >
            <Paper sx={{ 
              p: 3,
              background: isDarkMode
                ? 'linear-gradient(135deg, #134e4a 0%, #065f46 100%)'
                : 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
              border: `2px solid ${isDarkMode ? '#059669' : '#10b981'}`,
              borderRadius: 3,
              boxShadow: isDarkMode 
                ? '0 8px 32px rgba(5, 150, 105, 0.2)' 
                : '0 8px 32px rgba(16, 185, 129, 0.15)'
            }}>
              <Typography variant="h5" sx={{ 
                mb: 2, 
                fontWeight: 700,
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                📍 Mark Drop-off Status
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {bookings
                  .filter(booking => booking.booking_date === new Date().toISOString().split('T')[0])
                  .map((booking) => (
                    <Card key={`priority-${booking.id}`} sx={{ 
                      p: 3, 
                      background: isDarkMode 
                        ? 'rgba(255, 255, 255, 0.08)' 
                        : 'rgba(255, 255, 255, 0.9)',
                      border: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)'}`,
                      borderRadius: 2,
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: isDarkMode 
                          ? '0 8px 25px rgba(0, 0, 0, 0.3)' 
                          : '0 8px 25px rgba(0, 0, 0, 0.1)'
                      }
                    }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                        <Box sx={{ flex: '1 1 200px' }}>
                          <Typography variant="h6" sx={{ 
                            fontWeight: 600,
                            color: isDarkMode ? '#ffffff' : '#1f2937',
                            mb: 0.5
                          }}>
                            🚗 {booking.pickup_time} → {booking.dropoff_location}
                          </Typography>
                          <Typography variant="body2" sx={{ 
                            color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5
                          }}>
                            📍 From: {booking.pickup_location}
                          </Typography>
                        </Box>
                        <Box sx={{ 
                          display: 'flex', 
                          alignItems: 'center',
                          background: booking.dropped_off 
                            ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)'
                            : isDarkMode 
                              ? 'rgba(255, 255, 255, 0.1)'
                              : 'rgba(0, 0, 0, 0.05)',
                          borderRadius: 2,
                          p: 1.5,
                          minWidth: 200
                        }}>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={booking.dropped_off || false}
                                onChange={(e) => handleDroppedOffUpdate(booking.id, e.target.checked)}
                                color="success"
                                size="large"
                                sx={{
                                  '& .MuiSvgIcon-root': {
                                    fontSize: 28
                                  }
                                }}
                              />
                            }
                            label={
                              <Typography sx={{
                                fontSize: '1rem',
                                fontWeight: 600,
                                color: booking.dropped_off 
                                  ? '#ffffff'
                                  : isDarkMode ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.8)'
                              }}>
                                {booking.dropped_off ? "✅ Completed!" : "📍 Mark as Dropped Off"}
                              </Typography>
                            }
                            labelPlacement="end"
                          />
                        </Box>
                      </Box>
                    </Card>
                  ))}
              </Box>
            </Paper>
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
                  minHeight: 340, // Ensures both cards have the same height
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
                    Please book your cab before 6:30pm IST or you will not be able to book a cab.
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
                      mb: 2
                    }}
                  >
                    {(canUserAccessCabService)
                      ? 'Schedule a new cab booking with your preferred pickup time and destination'
                      : !cabServiceGlobalVisibility
                        ? 'Cab service is temporarily unavailable.'
                        : 'Cab booking is currently disabled as it is past 6:30pm IST. Contact HR for assistance.'
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
                  minHeight: 340, // Ensures both cards have the same height
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
                          : 'Rebooking is currently disabled as it is past 6:30pm IST. Contact HR for assistance.'
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
                    ? `No cab bookings found for ${formatIsoDate(selectedDate)}`
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
                      {!isAdmin && isUserWhitelisted && (
                        <TableCell sx={{ fontWeight: 'bold', color: '#059669' }}>Dropped Off</TableCell>
                      )}
                      {isAdmin && (
                        <>
                          <TableCell>Employee</TableCell>
                          <TableCell>Email</TableCell>
                        </>
                      )}
                      <TableCell>Pickup Time</TableCell>
                      <TableCell>Department</TableCell>
                      <TableCell>Pickup Location</TableCell>
                      <TableCell
                        onClick={() => handleSort('dropoff_location')}
                        sx={{ cursor: 'pointer', userSelect: 'none' }}
                      >
                        Drop-off Location
                        {sortBy === 'dropoff_location' && (
                          sortDirection === 'asc'
                            ? <ArrowUpwardIcon fontSize="small" sx={{ ml: 0.5 }} />
                            : <ArrowDownwardIcon fontSize="small" sx={{ ml: 0.5 }} />
                        )}
                      </TableCell>
                      <TableCell>Booking Date</TableCell>
                      <TableCell>Status</TableCell>
                      {isAdmin && (
                        <TableCell>Needs Escort</TableCell>
                      )}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sortedBookings.map((booking) => (
                      <TableRow key={booking.id}>
                        {!isAdmin && isUserWhitelisted && (
                          <TableCell>
                            <FormControlLabel
                              control={
                                <Checkbox
                                  checked={booking.dropped_off || false}
                                  onChange={(e) => handleDroppedOffUpdate(booking.id, e.target.checked)}
                                  color="success"
                                  size="small"
                                />
                              }
                              label={booking.dropped_off ? "Completed" : "Pending"}
                              sx={{
                                '& .MuiFormControlLabel-label': {
                                  fontSize: '0.875rem',
                                  fontWeight: booking.dropped_off ? 600 : 400,
                                  color: booking.dropped_off 
                                    ? '#059669' 
                                    : isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)'
                                }
                              }}
                            />
                          </TableCell>
                        )}
                        {isAdmin && (
                          <>
                            <TableCell>
                              {booking.first_name && booking.last_name 
                                ? `${capitalizeFirstLetter(booking.first_name)} ${capitalizeFirstLetter(booking.last_name)}`
                                : (booking.user_email ? formatNameFromEmail(booking.user_email) : 'N/A')}
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
                          {(() => {
                            // Display date as YYYY-MM-DD to avoid timezone interpretation issues with new Date()
                            // The booking_date is already stored in 'YYYY-MM-DD' format
                            if (booking.booking_date) {
                              const parts = booking.booking_date.split('-');
                              if (parts.length === 3) {
                                return `${parseInt(parts[1], 10)}/${parseInt(parts[2], 10)}/${parts[0]}`;
                              }
                            }
                            return 'Invalid Date'; // Fallback for unexpected format
                          })()}
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
                        {!isAdmin && booking.booking_date === new Date().toISOString().split('T')[0] && (
                          <TableCell>
                            <Button
                              variant="outlined"
                              color="error"
                              size="small"
                              onClick={() => handleCancelBooking(booking.id)}
                              disabled={loading}
                            >
                              Cancel
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
            {isAdmin && !loadingBookings && whitelistedEmails.length > 0 && (
              <Box sx={{ mt: 4 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                  Members without bookings on {formatIsoDate(selectedDate)} ({unbookedUsers.length})
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {unbookedUsers.map(u => (
                    <Chip
                      key={u.email}
                      label={`${u.email} | ${u.pickup_time || 'N/A'} | ${u.pick_up_location || 'N/A'} | ${u.drop_off_location || 'N/A'}`}
                      variant="outlined"
                    />
                  ))}
                </Box>
              </Box>
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

              {/* Action Buttons: Export Whitelist and Send Reminders */}
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mb: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={<MorningIcon />}
                  onClick={() => handleSendReminder('morning')}
                  disabled={loadingMorningReminder || loadingEveningReminder}
                  sx={{ 
                    borderColor: isDarkMode ? '#facc15' : '#eab308',
                    color: isDarkMode ? '#facc15' : '#eab308',
                    '&:hover': {
                      borderColor: isDarkMode ? '#fde047' : '#f59e0b',
                      backgroundColor: isDarkMode ? 'rgba(250, 204, 21, 0.1)' : 'rgba(245, 158, 11, 0.05)',
                    }
                  }}
                >
                  {loadingMorningReminder ? <CircularProgress size={24} color="inherit" /> : 'Send Morning Reminders'}
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<EveningIcon />}
                  onClick={() => handleSendReminder('evening')}
                  disabled={loadingMorningReminder || loadingEveningReminder}
                  sx={{
                    borderColor: isDarkMode ? '#818cf8' : '#6366f1',
                    color: isDarkMode ? '#818cf8' : '#6366f1',
                    '&:hover': {
                      borderColor: isDarkMode ? '#a78bfa' : '#818cf8',
                      backgroundColor: isDarkMode ? 'rgba(129, 140, 248, 0.1)' : 'rgba(99, 102, 241, 0.05)',
                    }
                  }}
                >
                  {loadingEveningReminder ? <CircularProgress size={24} color="inherit" /> : 'Send Evening Reminders'}
                </Button>
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
              <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'flex-start' }}>
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

              {/* New Fields for Pickup/Dropoff for adding user */}
              {selectedUserToWhitelist && (
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth variant="outlined">
                      <InputLabel>Default Pickup Location (Optional)</InputLabel>
                      <Select
                        value={newWhitelistedUserDetails.pick_up_location}
                        onChange={(e) => setNewWhitelistedUserDetails(prev => ({...prev, pick_up_location: e.target.value}))}
                        label="Default Pickup Location (Optional)"
                      >
                        <MenuItem value=""><em>None</em></MenuItem>
                        {pickupLocations.map((loc) => (
                          <MenuItem key={loc} value={loc}>{loc}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth variant="outlined">
                      <InputLabel>Default Drop-off Location (Optional)</InputLabel>
                      <Select
                        value={newWhitelistedUserDetails.drop_off_location}
                        onChange={(e) => setNewWhitelistedUserDetails(prev => ({...prev, drop_off_location: e.target.value}))}
                        label="Default Drop-off Location (Optional)"
                      >
                        <MenuItem value=""><em>None</em></MenuItem>
                        {dropoffLocations.map((loc) => (
                          <MenuItem key={loc} value={loc}>{loc}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}> {/* Added Pickup Time for new user */}
                    <FormControl fullWidth variant="outlined">
                      <InputLabel>Default Pickup Time (Optional)</InputLabel>
                      <Select
                        value={newWhitelistedUserDetails.pickup_time}
                        onChange={(e) => setNewWhitelistedUserDetails(prev => ({...prev, pickup_time: e.target.value}))}
                        label="Default Pickup Time (Optional)"
                      >
                        <MenuItem value=""><em>None</em></MenuItem>
                        {pickupTimes.map((time) => (
                          <MenuItem key={time} value={time}>{time}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              )}


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
                        <TableCell sx={{ fontWeight: 'bold' }}>Pickup Location</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Drop-off Location</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Pickup Time</TableCell> {/* Added Pickup Time header */}
                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {whitelistedEmails.map((item) => (
                        <TableRow key={item.email}>
                          <TableCell>{item.email}</TableCell>
                          <TableCell>{item.added_by || 'N/A'}</TableCell>
                          <TableCell>{new Date(item.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>{item.pick_up_location || 'Not set'}</TableCell>
                          <TableCell>{item.drop_off_location || 'Not set'}</TableCell>
                          <TableCell>{item.pickup_time || 'Not set'}</TableCell> {/* Display pickup_time */}
                          <TableCell align="right">
                            <IconButton onClick={() => handleOpenEditWhitelistDialog(item)} size="small" sx={{mr:1}}>
                               <FilterIcon /> {/* Using FilterIcon as a placeholder for Edit Icon */}
                            </IconButton>
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
                  {(!isHrAdmin && userCabConfig.isConfigured && userCabConfig.allowedPickupTime) ? (
                    // Case 1: Whitelisted user with a specific pickup time
                    pickupTimes.map((time) => (
                    <Button
                      key={time}
                      variant={formData.pickupTime === time ? 'contained' : 'outlined'}
                      onClick={() => handleInputChange('pickupTime', time)}
                        disabled={time !== userCabConfig.allowedPickupTime} // Disable if not the allowed time
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
                    ))
                  ) : (!isHrAdmin && userCabConfig.isConfigured && !userCabConfig.allowedPickupTime) ? (
                    // Case 2: Whitelisted user, but no specific pickup time assigned by HR
                    pickupTimes.map((time) => (
                      <Button
                        key={time}
                        variant='outlined'
                        disabled // All buttons disabled
                        startIcon={<ScheduleIcon sx={{ fontSize: 18 }} />}
                        sx={{
                          minWidth: 140,
                          height: 56,
                          borderRadius: 3,
                          fontSize: '1rem',
                          fontWeight: 600,
                          textTransform: 'none'
                        }}
                      >
                        {time}
                      </Button>
                    ))
                  ) : (
                    // Case 3: HR Admin or non-whitelisted/non-configured user (all options available)
                    pickupTimes.map((time) => (
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
                    ))
                  )}
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
                  {(!isHrAdmin && userCabConfig.isConfigured && userCabConfig.allowedPickup) ? (
                    // Case 1: Whitelisted user with a specific pickup location
                    pickupLocations.map((location) => (
                    <Button
                      key={location}
                      variant={formData.pickupLocation === location ? 'contained' : 'outlined'}
                      onClick={() => handleInputChange('pickupLocation', location)}
                        disabled={location !== userCabConfig.allowedPickup} // Disable if not the allowed location
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
                    ))
                  ) : (!isHrAdmin && userCabConfig.isConfigured && !userCabConfig.allowedPickup) ? (
                     // Case 2: Whitelisted user, but no specific pickup location assigned by HR
                    pickupLocations.map((location) => (
                      <Button
                        key={location}
                        variant='outlined'
                        disabled // All buttons disabled
                        startIcon={<LocationIcon sx={{ fontSize: 18 }} />}
                        sx={{
                          minWidth: 160,
                          height: 56,
                          borderRadius: 3,
                          fontSize: '1rem',
                          fontWeight: 600,
                          textTransform: 'none'
                        }}
                      >
                        {location}
                      </Button>
                    ))
                  ) : (
                    // Case 3: HR Admin or non-whitelisted/non-configured user (all options available)
                    pickupLocations.map((location) => (
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
                    ))
                  )}
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
                  disabled={!isHrAdmin && userCabConfig.isConfigured && !userCabConfig.preferredDropoff} // Disable completely if whitelisted and no dropoff is set by HR
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
                    readOnly={!isHrAdmin && userCabConfig.isConfigured && !!userCabConfig.preferredDropoff} // If a specific dropoff is set, it's readonly
                  >
                    {(!isHrAdmin && userCabConfig.isConfigured && userCabConfig.preferredDropoff) ? (
                      // Case 1: Whitelisted user with a specific dropoff location
                      <MenuItem value={userCabConfig.preferredDropoff} key={userCabConfig.preferredDropoff}>
                        {userCabConfig.preferredDropoff} (Assigned)
                      </MenuItem>
                    ) : (!isHrAdmin && userCabConfig.isConfigured && !userCabConfig.preferredDropoff) ? (
                      // Case 2: Whitelisted user, but no specific dropoff assigned by HR (no options available)
                      <MenuItem value="" disabled>
                        Drop-off Location not assigned by HR. Contact HR.
                      </MenuItem>
                    ) : (
                       // Case 3: HR Admin or non-whitelisted/non-configured user (all options available)
                       dropoffLocations.map((location) => (
                      <MenuItem key={location} value={location}>
                        {location}
                      </MenuItem>
                      ))
                    )}
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
            disabled={loading 
              || (!isHrAdmin && userCabConfig.isConfigured && (
                  (!!userCabConfig.allowedPickupTime && !formData.pickupTime) || 
                  (!!userCabConfig.allowedPickup && !formData.pickupLocation) || 
                  (!!userCabConfig.preferredDropoff && !formData.dropoffLocation)
              )) // Ensure fixed values are set if whitelisted
            }
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
        onClose={() => setSnackbarWithLogging({ ...snackbar, open: false })} // Use logging version
      >
        <Alert
          onClose={() => setSnackbarWithLogging({ ...snackbar, open: false })} // Use logging version
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Edit Whitelist Entry Dialog */}
      {editingWhitelistEntry && (
        <Dialog open={showEditWhitelistEntryDialog} onClose={() => { setShowEditWhitelistEntryDialog(false); setEditingWhitelistEntry(null); }} maxWidth="sm" fullWidth>
          <DialogTitle>Edit Whitelist for {editingWhitelistEntry.email}</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{mt: 1}}>
              <Grid item xs={12}>
                <FormControl fullWidth variant="outlined">
                  <InputLabel>Default Pickup Location</InputLabel>
                  <Select
                    value={editingWhitelistEntry.pick_up_location || ''}
                    onChange={(e) => setEditingWhitelistEntry(prev => ({ ...prev, pick_up_location: e.target.value }))}
                    label="Default Pickup Location"
                  >
                    <MenuItem value=""><em>None / Not Set</em></MenuItem>
                    {pickupLocations.map((loc) => (
                      <MenuItem key={loc} value={loc}>{loc}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth variant="outlined">
                  <InputLabel>Default Drop-off Location</InputLabel>
                  <Select
                    value={editingWhitelistEntry.drop_off_location || ''}
                    onChange={(e) => setEditingWhitelistEntry(prev => ({ ...prev, drop_off_location: e.target.value }))}
                    label="Default Drop-off Location"
                  >
                    <MenuItem value=""><em>None / Not Set</em></MenuItem>
                    {dropoffLocations.map((loc) => (
                      <MenuItem key={loc} value={loc}>{loc}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}> {/* Added Pickup Time to Edit Dialog */}
                <FormControl fullWidth variant="outlined">
                  <InputLabel>Default Pickup Time</InputLabel>
                  <Select
                    value={editingWhitelistEntry.pickup_time || ''}
                    onChange={(e) => setEditingWhitelistEntry(prev => ({ ...prev, pickup_time: e.target.value }))}
                    label="Default Pickup Time"
                  >
                    <MenuItem value=""><em>None / Not Set</em></MenuItem>
                    {pickupTimes.map((time) => (
                      <MenuItem key={time} value={time}>{time}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => { setShowEditWhitelistEntryDialog(false); setEditingWhitelistEntry(null); }} color="inherit">
              Cancel
            </Button>
            <Button onClick={handleSaveWhitelistEntryUpdate} variant="contained" disabled={loadingWhitelistManagement}>
              {loadingWhitelistManagement ? <CircularProgress size={24} /> : 'Save Changes'}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
};

export default CabService; 