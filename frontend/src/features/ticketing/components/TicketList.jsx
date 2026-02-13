import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/TicketList.css';
import { supabase } from '../../../services/supabase';
import {
  Table, TableBody, TableCell, TableHead, TableRow,
  FormControl, InputLabel, Select, MenuItem, Box, Typography,
  IconButton,
  useTheme, Card, Fade, Avatar, CircularProgress, Pagination
} from '@mui/material';
import {
  Warning as WarningIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  HourglassEmpty as HourglassIcon,
  Edit as EditIcon,
  Check as CheckIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTicketAlt,
  faFilter, faDownload, faSearch
} from '@fortawesome/free-solid-svg-icons';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import AdminCommentModal from './AdminCommentModal';
import { useAuth } from '../../../contexts/AuthContext';
import { generateTicketNumber } from '../../../utils/ticketUtils';


const TicketList = ({ tickets, statusOrder, handleUpdateTicketStatus, handleUpdateTicketAssignee, currentUserRole, onDataRefresh, ticketNumberMap }) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  // State for assignee editing
  const [editingAssignee, setEditingAssignee] = useState(null); // { ticketId: string, tempAssigneeId: string | null }

  // Responsive state
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  // Filtering state
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubCategory, setSelectedSubCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Date range selector state for export
  const [selectedDateRange, setSelectedDateRange] = useState('');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showCustomDateRange, setShowCustomDateRange] = useState(false);
  
  // Fetch assignees from Supabase ticket_assignees table
  const [assignOptions, setAssignOptions] = useState([]);
  const [isAssignOptionsLoading, setIsAssignOptionsLoading] = useState(true);
  useEffect(() => {
    const fetchAssignees = async () => {
      setIsAssignOptionsLoading(true);
  
      /* ——— 1. ensure user is authenticated ——— */
      const { data: { session }, error: sessionError } =
        await supabase.auth.getSession();
  
      if (sessionError || !session) {
        setAssignOptions([]);
        setIsAssignOptionsLoading(false);
        return;
      }
  
      /* ——— 2. fetch ALL rows from ticket_assignees (no role filter) ——— */
      const { data, error } = await supabase
        .from('ticket_assignees')
        .select('user_id, name');   // no need to select role
  
      /* ——— 3. populate state ——— */
      if (!error && data) {
        setAssignOptions(
          data.map(row => ({ id: row.user_id, name: row.name }))
        );
      } else {
        setAssignOptions([]);
      }
  
      setIsAssignOptionsLoading(false);
    };
  
    fetchAssignees();
  }, []);   // dependency array empty: runs once on mount
  
  
  // Handle responsive design
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 600);
      setIsTablet(window.innerWidth <= 768 && window.innerWidth > 600);
    };

    // Initial check
    handleResize();

    // Add event listener
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Format name from email helper
  const formatNameFromEmail = (email) => {
    if (!email) return 'User';
    // Special case: HR admin email
    if (email?.toLowerCase() === 'hr@othainsoft.com') return 'HR Admin';
    // Special case: IT admin email
    if (email?.toLowerCase() === 'it@othainsoft.com') return 'IT Admin';
    // Special case: Accounts admin email
    if (email?.toLowerCase() === 'accounts@othainsoft.com') return 'Accounts Admin';
    if (email?.toLowerCase() === 'operations@othainsoft.com') return 'Operations Admin';
    if (email?.toLowerCase() === 'ai@othainsoft.com') return 'AI Admin';
    const local = email.split('@')[0];
    const parts = local.split('.');
    const capitalize = s => s.charAt(0).toUpperCase() + s.slice(1);
    if (parts.length >= 2) {
      return `${capitalize(parts[0])} ${capitalize(parts[1])}`;
    }
    return capitalize(parts[0]);
  };
  
  // Enhanced helper to get modern colors for priority and status with gradients
  const getPriorityColor = (priority) => {
    switch(priority?.toLowerCase()) {
      case 'low': return { 
        bg: 'linear-gradient(135deg, #9333ea 0%, #a855f7 100%)', 
        shadow: 'rgba(147, 51, 234, 0.3)',
        text: 'white'
      };
      case 'medium': return { 
        bg: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)', 
        shadow: 'rgba(245, 158, 11, 0.3)',
        text: '#1f2937'
      };
      case 'high': return { 
        bg: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)', 
        shadow: 'rgba(234, 88, 12, 0.3)',
        text: 'white'
      };
      case 'urgent': return { 
        bg: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)', 
        shadow: 'rgba(220, 38, 38, 0.3)',
        text: 'white'
      };
      default: return { 
        bg: 'linear-gradient(135deg, #6b7280 0%, #9ca3af 100%)', 
        shadow: 'rgba(107, 114, 128, 0.3)',
        text: 'white'
      };
    }
  };

  const getStatusColor = (status) => {
    if (!status) return { 
      bg: 'linear-gradient(135deg, #6b7280 0%, #9ca3af 100%)', 
      shadow: 'rgba(107, 114, 128, 0.3)',
      text: 'white'
    };
    
    switch(status) {
      case 'WAITING FOR SUPPORT': return { 
        bg: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)', 
        shadow: 'rgba(37, 99, 235, 0.3)',
        text: 'white'
      };
      case 'WAITING FOR APPROVAL': return { 
        bg: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)', 
        shadow: 'rgba(37, 99, 235, 0.3)',
        text: 'white'
      };
      case 'IN_PROGRESS': return { 
        bg: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)', 
        shadow: 'rgba(234, 88, 12, 0.3)',
        text: 'white'
      };
      case 'RESOLVED': return { 
        bg: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', 
        shadow: 'rgba(5, 150, 105, 0.3)',
        text: 'white'
      };
      case 'CLOSED': return { 
        bg: 'linear-gradient(135deg, #6b7280 0%, #9ca3af 100%)', 
        shadow: 'rgba(107, 114, 128, 0.3)',
        text: 'white'
      };
      default: return { 
        bg: 'linear-gradient(135deg, #6b7280 0%, #9ca3af 100%)', 
        shadow: 'rgba(107, 114, 128, 0.3)',
        text: 'white'
      };
    }
  };

  // Get urgency level for due dates
  const getDueDateUrgency = (dueAt, status) => {
    if (!dueAt || status === 'RESOLVED' || status === 'CLOSED') return null;
    
    const due = new Date(dueAt);
    const now = new Date();
    const diffHours = (due - now) / (1000 * 60 * 60);
    
    if (diffHours < 0) return 'overdue';
    if (diffHours < 2) return 'urgent';
    if (diffHours < 24) return 'soon';
    return 'normal';
  };

  // Date range selector helper functions
  const getDateRangeOptions = () => {
    const now = new Date();
    const options = [
      { value: '', label: 'All Tickets' },
      { value: 'this_week', label: 'This Week' },
      { value: 'last_week', label: 'Last Week' },
      { value: 'this_month', label: 'This Month' },
      { value: 'last_month', label: 'Last Month' },
      { value: 'this_year', label: 'This Year' },
      { value: 'last_year', label: 'Last Year' },
      { value: 'last_30_days', label: 'Last 30 Days' },
      { value: 'last_90_days', label: 'Last 90 Days' },
      { value: 'custom', label: 'Custom Date Range' }
    ];
    
    // Add last 4 weeks
    for (let i = 1; i <= 4; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - (i * 7));
      
      const startOfWeek = new Date(date);
      startOfWeek.setDate(date.getDate() - date.getDay());
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      
      const weekLabel = `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
      options.push({ value: `week_${startOfWeek.toISOString().split('T')[0]}`, label: weekLabel });
    }
    
    return options;
  };

  const getTicketsForDateRange = (dateRange, tickets) => {
    if (!dateRange) return tickets;
    
    const now = new Date();
    let startDate, endDate;
    
    switch (dateRange) {
      case 'this_week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - now.getDay());
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 7);
        break;
      case 'last_week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - now.getDay() - 7);
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 7);
        break;
      case 'this_month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        break;
      case 'last_month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'this_year':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear() + 1, 0, 1);
        break;
      case 'last_year':
        startDate = new Date(now.getFullYear() - 1, 0, 1);
        endDate = new Date(now.getFullYear(), 0, 1);
        break;
      case 'last_30_days':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 30);
        endDate = new Date(now);
        endDate.setDate(now.getDate() + 1);
        break;
      case 'last_90_days':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 90);
        endDate = new Date(now);
        endDate.setDate(now.getDate() + 1);
        break;
      default:
        if (dateRange.startsWith('week_')) {
          const weekStart = dateRange.replace('week_', '');
          startDate = new Date(weekStart);
          endDate = new Date(startDate);
          endDate.setDate(startDate.getDate() + 7);
        } else if (dateRange === 'custom' && customStartDate && customEndDate) {
          startDate = new Date(customStartDate);
          endDate = new Date(customEndDate);
          endDate.setDate(endDate.getDate() + 1); // Include the end date
        } else {
          return tickets;
        }
    }
    
    return tickets.filter(ticket => {
      const ticketDate = new Date(ticket.created_at);
      return ticketDate >= startDate && ticketDate < endDate;
    });
  };

  // Unique categories from tickets
  const categories = useMemo(() => [...new Set(tickets.map(t => t.category_name).filter(Boolean))], [tickets]);
  
  // Unique subcategories based on selected category
  const subCategories = useMemo(() => {
    if (!selectedCategory) return [];
    return [...new Set(
      tickets.filter(t => t.category_name === selectedCategory)
             .map(t => t.sub_category_name)
             .filter(Boolean)
    )];
  }, [tickets, selectedCategory]);
  
  // Filtered tickets list
  const filteredTickets = useMemo(() => tickets.filter(t =>
    (!selectedCategory || t.category_name === selectedCategory) &&
    (!selectedSubCategory || t.sub_category_name === selectedSubCategory) &&
    (!selectedStatus || t.status === selectedStatus) &&
    (!searchTerm || 
      t.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.id?.toString().includes(searchTerm) ||
      t.requester_email?.toLowerCase().includes(searchTerm.toLowerCase()))
  ), [tickets, selectedCategory, selectedSubCategory, selectedStatus, searchTerm]);

  // Pagination state
  const [page, setPage] = useState(1);
  const rowsPerPage = 10;

  // Reset to first page if filters change or filteredTickets shrinks
  useEffect(() => {
    setPage(1);
  }, [selectedCategory, selectedSubCategory, selectedStatus, searchTerm, filteredTickets.length]);

  // Paginated tickets
  const paginatedTickets = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return filteredTickets.slice(start, start + rowsPerPage);
  }, [filteredTickets, page]);

  const handleExportToExcel = async () => {
    // Get tickets for selected date range (or all if no range selected)
    const ticketsToExport = getTicketsForDateRange(selectedDateRange, filteredTickets);
    
    const dataToExport = ticketsToExport.map(ticket => [
      ticketNumberMap[ticket.id] || generateTicketNumber(ticket.id, ticket.category_id, tickets),
      ticket.title,
      formatNameFromEmail(ticket.requester_email),
      formatNameFromEmail(ticket.assignee_email),
      ticket.status?.replace('_', ' '),
      ticket.category_name || 'N/A',
      ticket.sub_category_name || 'N/A',
      ticket.client || 'N/A',
      new Date(ticket.created_at).toLocaleString(),
      ticket.due_at ? new Date(ticket.due_at).toLocaleString() : 'N/A',
      ticket.updated_at ? new Date(ticket.updated_at).toLocaleString() : 'N/A',
      ticket.resolved_at ? new Date(ticket.resolved_at).toLocaleString() : 'N/A',
      ticket.priority || 'N/A',
      ticket.description || 'N/A'
    ]);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Filtered Tickets');

    // Add headers
    const headers = [
      'Ticket ID', 'Summary', 'Reporter', 'Assignee', 'Status',
      'Category', 'Sub-Category', 'Client', 'Created At', 'Due At',
      'Updated At', 'Resolved At', 'Priority', 'Description'
    ];
    worksheet.addRow(headers);

    // Add data rows
    dataToExport.forEach(row => worksheet.addRow(row));

    // Set column widths
    worksheet.columns = [
      { width: 12 }, // Ticket ID
      { width: 30 }, // Summary
      { width: 20 }, // Reporter
      { width: 20 }, // Assignee
      { width: 15 }, // Status
      { width: 15 }, // Category
      { width: 20 }, // Sub-Category
      { width: 15 }, // Client
      { width: 20 }, // Created At
      { width: 20 }, // Due At
      { width: 20 }, // Updated At
      { width: 20 }, // Resolved At
      { width: 12 }, // Priority
      { width: 40 }  // Description
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
    saveAs(blob, 'filtered_tickets.xlsx');
  };

  const handleRowClick = (ticketId, e) => {
    // Skip if user is clicking on the status dropdown
    if (e.target.closest('.MuiSelect-select')) {
      return;
    }
    navigate(`/ticket/${ticketId}`);
  };

  const isAdmin = ['admin', 'it_admin', 'hr_admin', 'payroll_admin', 'operations_admin', 'ai_admin'].includes(currentUserRole);

  // Dynamic assignee placeholder based on role
  const assigneeLabelMap = {
    it_admin: 'IT Admin',
    hr_admin: 'HR Admin',
    payroll_admin: 'Accounts Admin',
    operations_admin: 'Operations Admin',
    ai_admin: 'AI Admin'
  };
  const assigneeLabel = assigneeLabelMap[currentUserRole] || 'Assignee';

  const handleEditAssigneeClick = (ticketId, currentAssigneeId) => {
    setEditingAssignee({ ticketId, tempAssigneeId: currentAssigneeId });
  };

  const handleAssigneeChange = (newAssigneeId) => {
    if (editingAssignee) {
      setEditingAssignee(prev => ({ ...prev, tempAssigneeId: newAssigneeId }));
    }
  };

  const handleConfirmAssigneeChange = () => {
    if (editingAssignee) {
      const selectedAssignee = assignOptions.find(opt => opt.id === editingAssignee.tempAssigneeId);
      const assigneeName = selectedAssignee ? selectedAssignee.name : 'the selected user';
      if (window.confirm(`Are you sure you want to assign this ticket to ${assigneeName}?`)) {
        handleUpdateTicketAssignee(editingAssignee.ticketId, editingAssignee.tempAssigneeId);
      }
      setEditingAssignee(null);
    }
  };

  const handleCancelAssigneeChange = () => {
    setEditingAssignee(null);
  };

  // Priority change function - simplified
  const handlePriorityChange = async (ticketId, newPriority) => {
    
    try {
      // Find the current ticket
      const currentTicket = tickets.find(t => t.id === ticketId);
      if (!currentTicket) {
        console.error('Ticket not found:', ticketId);
        alert('Ticket not found');
        return;
      }

      // Skip if same priority
      if (currentTicket.priority === newPriority) {
        return;
      }

      // Calculate new due date based on priority
      let newDueDate = null;
      if (currentTicket.due_at) {
        // Adjust existing due date based on priority change

        // Base hours for each priority from now
        const priorityHours = {
          'Urgent': 4,
          'High': 24,
          'Medium': 72,
          'Low': 168
        };
        
        // Set new due date based on new priority
        const newDueTime = new Date();
        newDueTime.setHours(newDueTime.getHours() + priorityHours[newPriority]);
        newDueDate = newDueTime.toISOString();
      } else {
        // If no due date exists, create one based on priority
        const now = new Date();
        const hoursToAdd = {
          'Urgent': 4,
          'High': 24,
          'Medium': 72,
          'Low': 168
        }[newPriority] || 72;
        
        now.setHours(now.getHours() + hoursToAdd);
        newDueDate = now.toISOString();
      }

      // Update both priority and due date
      const { error } = await supabase
        .from('tickets')
        .update({
          priority: newPriority,
          due_at: newDueDate
        })
        .eq('id', ticketId)
        .select();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      // Show success message
      alert(`Priority updated to ${newPriority} and due date adjusted successfully!`);

      // Refresh the data without reloading the page
      if (onDataRefresh) {
        await onDataRefresh();
      }

    } catch (error) {
      console.error('Error changing priority and due date:', error);
      alert('Failed to change priority and due date: ' + error.message);
    }
  };

  // Add state for admin comment modal
  const [adminCommentModal, setAdminCommentModal] = useState({ open: false, ticketId: null, newStatus: '', loading: false });

  // Replace handleUpdateTicketStatus for admins:
  const handleAdminStatusChange = (ticketId, newStatus) => {
    if (["RESOLVED", "CLOSED"].includes(newStatus)) {
      setAdminCommentModal({ open: true, ticketId, newStatus, loading: false });
    } else {
      handleUpdateTicketStatus(ticketId, newStatus);
    }
  };

  // Modal submit handler
  const handleAdminCommentSubmit = async (comment) => {
    setAdminCommentModal(modal => ({ ...modal, loading: true }));
    const { ticketId, newStatus } = adminCommentModal;
    try {
      // Prepare update object
      const updateData = { 
        status: newStatus, 
        admin_comment: comment,
        updated_at: new Date().toISOString()
      };
      
      // Add resolved_at timestamp if status is RESOLVED
      if (newStatus === 'RESOLVED') {
        updateData.resolved_at = new Date().toISOString();
      }
      
      // Update status, admin_comment, and timestamps
      const { error } = await supabase
        .from('tickets')
        .update(updateData)
        .eq('id', ticketId);
      if (error) throw error;
      // Update local state
      handleUpdateTicketStatus(ticketId, newStatus);
      setAdminCommentModal({ open: false, ticketId: null, newStatus: '', loading: false });
    } catch (err) {
      setAdminCommentModal(modal => ({ ...modal, loading: false }));
      alert('Failed to update ticket: ' + (err.message || err));
    }
  };

  // After fetching tickets and getting user/role
  useAuth();
  

  let visibleTickets = tickets;



  if (!visibleTickets || visibleTickets.length === 0) {
    return (
      <Fade in={true} timeout={600}>
        <Card sx={{ 
          background: isDarkMode 
            ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(51, 65, 85, 0.8) 100%)'
            : 'linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(248, 250, 252, 0.8) 100%)',
          backdropFilter: 'blur(20px)',
          borderRadius: '24px',
          border: isDarkMode ? '1px solid rgba(55, 65, 81, 0.5)' : '1px solid rgba(226, 232, 240, 0.5)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.08)',
          p: 4,
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Background decoration */}
          <div style={{
            position: 'absolute',
            top: '-50%',
            right: '-20%',
            width: '300px',
            height: '300px',
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            borderRadius: '50%',
            opacity: 0.05,
            filter: 'blur(40px)'
          }} />
          
          <div style={{
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            borderRadius: '50%',
            width: '80px',
            height: '80px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem auto',
            boxShadow: '0 8px 25px rgba(99, 102, 241, 0.3)',
            position: 'relative',
            zIndex: 1
          }}>
            <FontAwesomeIcon icon={faTicketAlt} size="2x" style={{ color: 'white' }} />
          </div>
          
          <Typography variant="h5" sx={{ 
            fontWeight: 700, 
            color: isDarkMode ? '#f1f5f9' : '#1e293b',
            marginBottom: '0.5rem',
            position: 'relative',
            zIndex: 1
          }}>
            No Tickets Available
          </Typography>
          <Typography variant="body1" sx={{ 
            color: isDarkMode ? '#94a3b8' : '#64748b',
            position: 'relative',
            zIndex: 1
          }}>
            There are currently no tickets to display
          </Typography>
        </Card>
      </Fade>
    );
  }

  return (
    <>
      <Fade in={true} timeout={800}>
        <Card sx={{
          background: isDarkMode 
            ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(51, 65, 85, 0.95) 100%)'
            : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%)',
          backdropFilter: 'blur(20px)',
          borderRadius: '24px',
          border: isDarkMode ? '1px solid rgba(55, 65, 81, 0.5)' : '1px solid rgba(226, 232, 240, 0.5)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.08)',
          overflow: 'hidden',
          position: 'relative'
        }}>
          {/* Header Section */}
          <div style={{
            background: isDarkMode 
              ? 'linear-gradient(135deg, rgba(55, 65, 81, 0.8) 0%, rgba(75, 85, 99, 0.8) 100%)'
              : 'linear-gradient(135deg, rgba(241, 245, 249, 0.8) 0%, rgba(226, 232, 240, 0.8) 100%)',
            padding: '2rem',
            borderBottom: isDarkMode ? '1px solid rgba(55, 65, 81, 0.5)' : '1px solid rgba(226, 232, 240, 0.5)'
          }}>
            {/* Search and Filter Bar */}
            <Fade in={true} timeout={600}>
              <div style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : isTablet ? 'row' : 'row',
                justifyContent: 'space-between',
                alignItems: isMobile ? 'stretch' : isTablet ? 'center' : 'center',
                gap: '1.5rem',
                marginBottom: '1.5rem'
              }}>
                {/* Search Box */}
                <div style={{
                  background: isDarkMode 
                    ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(51, 65, 85, 0.8) 100%)'
                    : 'linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(248, 250, 252, 0.8) 100%)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: isMobile ? '12px' : '16px',
                  border: isDarkMode ? '1px solid rgba(55, 65, 81, 0.5)' : '1px solid rgba(226, 232, 240, 0.5)',
                  padding: isMobile ? '0.625rem 1rem' : '0.75rem 1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  minWidth: isMobile ? 'auto' : '300px',
                  width: isMobile ? '100%' : 'auto',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
                }}>
                  <FontAwesomeIcon 
                    icon={faSearch} 
                    style={{ 
                      color: isDarkMode ? '#9ca3af' : '#6b7280',
                      fontSize: isMobile ? '0.875rem' : '1rem'
                    }} 
                  />
                  <input
                    type="text"
                    placeholder={isMobile ? "Search..." : "Search tickets..."}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      flex: 1,
                      fontSize: isMobile ? '0.875rem' : '1rem',
                      color: isDarkMode ? '#f3f4f6' : '#1f2937',
                      '::placeholder': {
                        color: isDarkMode ? '#9ca3af' : '#6b7280'
                      }
                    }}
                  />
                </div>
                
                {/* Filter Controls */}
                <div style={{
                  display: 'flex',
                  gap: isMobile ? '0.75rem' : '1rem',
                  flexWrap: 'wrap',
                  alignItems: isMobile ? 'stretch' : 'center',
                  flexDirection: isMobile ? 'column' : 'row',
                  width: isMobile ? '100%' : 'auto'
                }}>
                  {!isMobile && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    color: isDarkMode ? '#94a3b8' : '#64748b',
                    fontSize: '0.875rem',
                    fontWeight: 600
                  }}>
                    <FontAwesomeIcon icon={faFilter} />
                    Filters:
                  </div>
                  )}
                  
                  {/* Modern Filter Dropdowns */}
                  <div style={{
                    display: 'flex',
                    gap: isMobile ? '0.5rem' : '1rem',
                    flexDirection: isMobile ? 'column' : 'row',
                    width: isMobile ? '100%' : 'auto'
                  }}>
                  {[
                    { 
                      label: 'Category', 
                      value: selectedCategory, 
                      onChange: (val) => { setSelectedCategory(val); setSelectedSubCategory(''); },
                      options: categories.map(cat => ({ value: cat, label: cat })),
                      minWidth: isMobile ? 'auto' : '120px'
                    },
                    { 
                      label: 'Subcategory', 
                      value: selectedSubCategory, 
                      onChange: setSelectedSubCategory,
                      options: subCategories.map(sub => ({ value: sub, label: sub })),
                      disabled: !selectedCategory,
                      minWidth: isMobile ? 'auto' : '160px'
                    },
                    { 
                      label: 'Status', 
                      value: selectedStatus, 
                      onChange: setSelectedStatus,
                      options: statusOrder.map(stat => ({ value: stat, label: stat.replace('_', ' ') })),
                      minWidth: isMobile ? 'auto' : '120px'
                    }
                  ].map((filter, index) => (
                    <div key={filter.label} style={{
                      background: isDarkMode 
                        ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(51, 65, 85, 0.8) 100%)'
                        : 'linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(248, 250, 252, 0.8) 100%)',
                      backdropFilter: 'blur(10px)',
                      borderRadius: '12px',
                      border: isDarkMode ? '1px solid rgba(55, 65, 81, 0.5)' : '1px solid rgba(226, 232, 240, 0.5)',
                      minWidth: filter.minWidth,
                      width: isMobile ? '100%' : 'auto',
                      opacity: filter.disabled ? 0.5 : 1,
                      pointerEvents: filter.disabled ? 'none' : 'auto'
                    }}>
                        <FormControl size={isMobile ? "small" : "small"} fullWidth>
                        <InputLabel 
                          sx={{ 
                            color: isDarkMode ? '#94a3b8' : '#64748b',
                              fontSize: isMobile ? '0.8rem' : '0.875rem',
                            fontWeight: 600
                          }}
                        >
                          {filter.label}
                        </InputLabel>
                        <Select
                          value={filter.value}
                          label={filter.label}
                          onChange={(e) => filter.onChange(e.target.value)}
                          sx={{
                            '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                            '& .MuiSelect-select': {
                              color: isDarkMode ? '#f3f4f6' : '#1f2937',
                                fontSize: isMobile ? '0.8rem' : '0.875rem',
                                fontWeight: 500,
                                padding: isMobile ? '8px 14px' : '10px 14px'
                            }
                          }}
                        >
                          <MenuItem value="">All</MenuItem>
                          {filter.options.map(option => (
                            <MenuItem key={option.value} value={option.value}>
                              {option.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </div>
                  ))}
                  </div>
                </div>
                              </div>
              </Fade>

            {/* Results Count and Actions */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}>
                <div style={{
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
                }}>
                  <FontAwesomeIcon icon={faTicketAlt} style={{ color: 'white', fontSize: '0.875rem' }} />
                </div>
                <Typography variant="body1" sx={{ 
                  color: isDarkMode ? '#f3f4f6' : '#1f2937',
                  fontWeight: 600
                }}>
                  Showing {filteredTickets.length} of {tickets.length} tickets
                </Typography>
              </div>
              
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                {isAdmin && filteredTickets.length > 0 && (
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexDirection: isMobile ? 'column' : 'row' }}>
                    {/* Date Range Selector */}
                    <div style={{
                      background: isDarkMode 
                        ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(51, 65, 85, 0.8) 100%)'
                        : 'linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(248, 250, 252, 0.8) 100%)',
                      backdropFilter: 'blur(10px)',
                      borderRadius: '12px',
                      border: isDarkMode ? '1px solid rgba(55, 65, 81, 0.5)' : '1px solid rgba(226, 232, 240, 0.5)',
                      minWidth: isMobile ? 'auto' : '200px',
                      width: isMobile ? '100%' : 'auto'
                    }}>
                      <FormControl size="small" fullWidth>
                        <InputLabel 
                          sx={{ 
                            color: isDarkMode ? '#94a3b8' : '#64748b',
                            fontSize: isMobile ? '0.8rem' : '0.875rem',
                            fontWeight: 600
                          }}
                        >
                          Export Date Range
                        </InputLabel>
                        <Select
                          value={selectedDateRange}
                          label="Export Date Range"
                          onChange={(e) => {
                            setSelectedDateRange(e.target.value);
                            if (e.target.value !== 'custom') {
                              setShowCustomDateRange(false);
                            } else {
                              setShowCustomDateRange(true);
                            }
                          }}
                          sx={{
                            '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                            '& .MuiSelect-select': {
                              color: isDarkMode ? '#f3f4f6' : '#1f2937',
                              fontSize: isMobile ? '0.8rem' : '0.875rem',
                              fontWeight: 500,
                              padding: isMobile ? '8px 14px' : '10px 14px'
                            }
                          }}
                        >
                          {getDateRangeOptions().map(option => (
                            <MenuItem key={option.value} value={option.value}>
                              {option.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </div>
                    
                    {/* Custom Date Range Inputs */}
                    {showCustomDateRange && (
                      <div style={{
                        display: 'flex',
                        gap: '0.5rem',
                        alignItems: 'center',
                        flexDirection: isMobile ? 'column' : 'row'
                      }}>
                        <input
                          type="date"
                          value={customStartDate}
                          onChange={(e) => setCustomStartDate(e.target.value)}
                          style={{
                            background: isDarkMode 
                              ? 'rgba(55, 65, 81, 0.8)' 
                              : 'rgba(255, 255, 255, 0.9)',
                            border: isDarkMode ? '1px solid rgba(75, 85, 99, 0.5)' : '1px solid rgba(226, 232, 240, 0.5)',
                            borderRadius: '8px',
                            padding: '8px 12px',
                            color: isDarkMode ? '#f3f4f6' : '#1f2937',
                            fontSize: '0.8rem',
                            outline: 'none'
                          }}
                          placeholder="Start Date"
                        />
                        <span style={{ color: isDarkMode ? '#94a3b8' : '#64748b', fontSize: '0.8rem' }}>
                          to
                        </span>
                        <input
                          type="date"
                          value={customEndDate}
                          onChange={(e) => setCustomEndDate(e.target.value)}
                          style={{
                            background: isDarkMode 
                              ? 'rgba(55, 65, 81, 0.8)' 
                              : 'rgba(255, 255, 255, 0.9)',
                            border: isDarkMode ? '1px solid rgba(75, 85, 99, 0.5)' : '1px solid rgba(226, 232, 240, 0.5)',
                            borderRadius: '8px',
                            padding: '8px 12px',
                            color: isDarkMode ? '#f3f4f6' : '#1f2937',
                            fontSize: '0.8rem',
                            outline: 'none'
                          }}
                          placeholder="End Date"
                        />
                      </div>
                    )}
                    
                    {/* Export Button */}
                    <button
                      onClick={handleExportToExcel}
                      style={{
                        background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                        border: 'none',
                        borderRadius: '12px',
                        padding: isMobile ? '0.5rem 0.75rem' : '0.5rem 1rem',
                        color: 'white',
                        fontSize: isMobile ? '0.75rem' : '0.875rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: isMobile ? '0.375rem' : '0.5rem'
                      }}
                      onMouseEnter={(e) => {
                        if (!isMobile) {
                        e.target.style.transform = 'translateY(-2px)';
                        e.target.style.boxShadow = '0 6px 20px rgba(5, 150, 105, 0.4)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isMobile) {
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = '0 4px 12px rgba(5, 150, 105, 0.3)';
                        }
                      }}
                    >
                      <FontAwesomeIcon icon={faDownload} />
                      {isMobile ? 'Export' : 'Export Excel'}
                    </button>
                  </div>
                )}
                {(selectedCategory || selectedSubCategory || selectedStatus || searchTerm) && (
                  <button
                    onClick={() => {
                      setSelectedCategory('');
                      setSelectedSubCategory('');
                      setSelectedStatus('');
                      setSearchTerm('');
                    }}
                    style={{
                      background: isDarkMode 
                        ? 'linear-gradient(135deg, rgba(75, 85, 99, 0.8) 0%, rgba(107, 114, 128, 0.8) 100%)'
                        : 'linear-gradient(135deg, rgba(241, 245, 249, 0.8) 0%, rgba(226, 232, 240, 0.8) 100%)',
                      border: isDarkMode ? '1px solid rgba(107, 114, 128, 0.5)' : '1px solid rgba(203, 213, 225, 0.5)',
                      borderRadius: '12px',
                      padding: isMobile ? '0.5rem 0.75rem' : '0.5rem 1rem',
                      color: isDarkMode ? '#d1d5db' : '#4b5563',
                      fontSize: isMobile ? '0.75rem' : '0.875rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    {isMobile ? 'Clear' : 'Clear filters'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Modern Table Container */}
          <div style={{ padding: '0' }}>
            <div style={{
              background: isDarkMode 
                ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.5) 0%, rgba(51, 65, 85, 0.5) 100%)'
                : 'linear-gradient(135deg, rgba(255, 255, 255, 0.5) 0%, rgba(248, 250, 252, 0.5) 100%)',
              overflow: 'auto',
              maxHeight: isMobile ? '60vh' : '70vh',
              position: 'relative'
            }}>
              {/* Mobile scroll hint */}
              {isMobile && (
                <div style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  background: isDarkMode ? 'rgba(55, 65, 81, 0.9)' : 'rgba(0, 0, 0, 0.7)',
                  color: 'white',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  fontSize: '0.7rem',
                  zIndex: 10,
                  opacity: 0.7
                }}>
                  ← Scroll horizontally →
                </div>
              )}
              
              {filteredTickets.length === 0 ? (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: isMobile ? '3rem 1rem' : '4rem 2rem',
                  textAlign: 'center'
                }}>
                  <div style={{
                    background: 'linear-gradient(135deg, #6b7280 0%, #9ca3af 100%)',
                    borderRadius: '50%',
                    width: isMobile ? '48px' : '64px',
                    height: isMobile ? '48px' : '64px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '1rem',
                    boxShadow: '0 8px 25px rgba(107, 114, 128, 0.3)'
                  }}>
                    <FontAwesomeIcon 
                      icon={faSearch} 
                      size={isMobile ? "lg" : "lg"} 
                      style={{ color: 'white' }} 
                    />
                  </div>
                  <Typography variant={isMobile ? "h6" : "h6"} sx={{ 
                    fontWeight: 700, 
                    color: isDarkMode ? '#f3f4f6' : '#1f2937',
                    marginBottom: '0.5rem',
                    fontSize: isMobile ? '1rem' : '1.25rem'
                  }}>
                    No tickets match your filters
                  </Typography>
                  <Typography variant="body2" sx={{ 
                    color: isDarkMode ? '#9ca3af' : '#6b7280',
                    fontSize: isMobile ? '0.8rem' : '0.875rem'
                  }}>
                    Try adjusting your search criteria to see more results
                  </Typography>
                </div>
              ) : (
                <Table sx={{ 
                  minWidth: isMobile ? 800 : 650,
                  '& .MuiTableCell-root': {
                    fontSize: isMobile ? '0.75rem' : '0.875rem',
                    padding: isMobile ? '8px 6px' : '12px 8px'
                  }
                }}>
                  {/* Enhanced Table Header */}
                  <TableHead>
                    <TableRow sx={{
                      background: isDarkMode 
                        ? 'linear-gradient(135deg, #374151 0%, #4b5563 100%)'
                        : 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
                      '& th': {
                        borderBottom: 'none',
                        color: isDarkMode ? '#f3f4f6' : '#1f2937',
                        fontWeight: 700,
                        fontSize: isMobile ? '0.7rem' : '0.875rem',
                        letterSpacing: '0.5px',
                        textTransform: 'uppercase',
                        padding: isMobile ? '12px 6px' : '1.5rem 1rem',
                        whiteSpace: 'nowrap'
                      }
                    }}>
                      <TableCell>Key</TableCell>
                      <TableCell>Summary</TableCell>
                      <TableCell>Reporter</TableCell>
                      <TableCell>Assignee</TableCell>
                      <TableCell>Status</TableCell>
                      {isAdmin && (
                        <TableCell>Severity</TableCell>
                      )}
                      <TableCell sx={{ 
                        display: { xs: 'none', md: 'table-cell' } // Hide on mobile using MUI responsive display
                      }}>
                        Created
                      </TableCell>
                      <TableCell>Due At</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedTickets.map((ticket, index) => {
                      const statusColors = getStatusColor(ticket.status);
                      const priorityColors = getPriorityColor(ticket.priority);
                      const dueDateUrgency = getDueDateUrgency(ticket.due_at, ticket.status);
                      
                      return (
                        <Fade key={ticket.id} in={true} timeout={400} style={{ transitionDelay: `${index * 50}ms` }}>
                          <TableRow 
                            onClick={(e) => handleRowClick(ticket.id, e)} 
                            sx={{ 
                              cursor: 'pointer',
                              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                              background: isDarkMode 
                                ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.3) 0%, rgba(51, 65, 85, 0.3) 100%)'
                                : 'linear-gradient(135deg, rgba(255, 255, 255, 0.3) 0%, rgba(248, 250, 252, 0.3) 100%)',
                              borderBottom: isDarkMode ? '1px solid rgba(55, 65, 81, 0.3)' : '1px solid rgba(226, 232, 240, 0.3)',
                              '&:hover': {
                                background: isDarkMode 
                                  ? 'linear-gradient(135deg, rgba(55, 65, 81, 0.5) 0%, rgba(75, 85, 99, 0.5) 100%)'
                                  : 'linear-gradient(135deg, rgba(241, 245, 249, 0.5) 0%, rgba(226, 232, 240, 0.5) 100%)',
                                transform: 'translateY(-2px)',
                                boxShadow: '0 8px 25px rgba(0, 0, 0, 0.1)'
                              },
                              '& td': {
                                borderBottom: 'none',
                                padding: '1.25rem 1rem',
                                verticalAlign: 'middle'
                              }
                            }}
                          >
                            {/* Ticket Key */}
                            <TableCell>
                              <div style={{
                                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                color: 'white',
                                padding: isMobile ? '0.375rem 0.5rem' : '0.5rem 0.75rem',
                                borderRadius: '8px',
                                fontSize: isMobile ? '0.75rem' : '0.875rem',
                                fontWeight: 700,
                                textAlign: 'center',
                                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                                fontFamily: 'monospace'
                              }}>
                                {ticketNumberMap[ticket.id] || generateTicketNumber(ticket.id, ticket.category_id, tickets)}
                              </div>
                            </TableCell>

                            {/* Summary */}
                            <TableCell>
                              <Typography variant="body2" sx={{ 
                                fontWeight: 600, 
                                color: isDarkMode ? '#f3f4f6' : '#1f2937',
                                lineHeight: 1.4,
                                fontSize: isMobile ? '0.75rem' : '0.875rem',
                                display: '-webkit-box',
                                WebkitLineClamp: isMobile ? 2 : 3,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}>
                                {ticket.title}
                              </Typography>
                            </TableCell>

                            {/* Reporter */}
                            <TableCell>
                              <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.375rem' : '0.5rem' }}>
                                <Avatar sx={{ 
                                  width: isMobile ? 24 : 32, 
                                  height: isMobile ? 24 : 32, 
                                  fontSize: isMobile ? '0.7rem' : '0.875rem',
                                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                                }}>
                                  {formatNameFromEmail(ticket.requester_email).charAt(0)}
                                </Avatar>
                                {!isMobile && (
                                <Typography variant="body2" sx={{ 
                                  fontWeight: 500, 
                                    color: isDarkMode ? '#d1d5db' : '#4b5563',
                                    fontSize: '0.8rem'
                                }}>
                                  {formatNameFromEmail(ticket.requester_email)}
                                </Typography>
                                )}
                              </div>
                            </TableCell>

                            {/* Assignee - Modified */}
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              {editingAssignee?.ticketId === ticket.id ? (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <FormControl size="small" fullWidth>
                                    <Select
                                      value={editingAssignee.tempAssigneeId || ''}
                                      displayEmpty
                                      onChange={(e) => handleAssigneeChange(e.target.value || null)}
                                      sx={{
                                        minWidth: isMobile ? 80 : 120,
                                        '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                                        disabled: ticket.status === 'RESOLVED' || ticket.status === 'CLOSED'
                                      }}
                                    >
                                      <MenuItem value="">
                                        <em>{assigneeLabel}</em>
                                      </MenuItem>
                                      {assignOptions.map(option => (
                                        <MenuItem key={option.id} value={option.id}>
                                          {option.name}
                                        </MenuItem>
                                      ))}
                                    </Select>
                                  </FormControl>
                                  <IconButton onClick={handleConfirmAssigneeChange} size="small" color="primary">
                                    <CheckIcon />
                                  </IconButton>
                                  <IconButton onClick={handleCancelAssigneeChange} size="small" color="error">
                                    <CloseIcon />
                                  </IconButton>
                                </Box>
                              ) : (
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                  {isAssignOptionsLoading ? (
                                    <CircularProgress size={16} />
                                  ) : ticket.assignee && assignOptions.length > 0 ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.375rem' : '0.5rem' }}>
                                      <Avatar sx={{ 
                                        width: isMobile ? 24 : 32, 
                                        height: isMobile ? 24 : 32, 
                                        fontSize: isMobile ? '0.7rem' : '0.875rem',
                                        background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)'
                                      }}>
                                        {formatNameFromEmail(ticket.assignee_email).charAt(0)}
                                      </Avatar>
                                      {!isMobile && (
                                        <Typography variant="body2" sx={{ 
                                          fontWeight: 500, 
                                          color: isDarkMode ? '#d1d5db' : '#4b5563',
                                          fontSize: '0.8rem'
                                        }}>
                                          {formatNameFromEmail(ticket.assignee_email)}
                                        </Typography>
                                      )}
                                    </div>
                                  ) : (
                                    <Typography variant="body2" sx={{ fontStyle: 'italic', color: isDarkMode ? '#9ca3af' : '#6b7280' }}>
                                      Unassigned
                                    </Typography>
                                  )}
                                  {isAdmin && !isAssignOptionsLoading && assignOptions.length > 0 && (
                                    <IconButton 
                                      onClick={() => handleEditAssigneeClick(ticket.id, ticket.assignee || null)} 
                                      size="small"
                                      sx={{ ml: 1, color: isDarkMode ? '#9ca3af' : '#6b7280' }}
                                      disabled={ticket.status === 'RESOLVED' || ticket.status === 'CLOSED'}
                                    >
                                      <EditIcon fontSize="inherit" />
                                    </IconButton>
                                  )}
                                </Box>
                              )}
                            </TableCell>

                            {/* Enhanced Status */}
                            <TableCell>
                              {isAdmin ? (
                                <FormControl size="small">
                                  <Select
                                    value={ticket.status}
                                    onChange={(e) => handleAdminStatusChange(ticket.id, e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    sx={{
                                      minWidth: isMobile ? 100 : 150,
                                      '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                                      '& .MuiSelect-select': { padding: 0 }
                                    }}
                                    renderValue={(selected) => (
                                      <div style={{
                                        background: statusColors.bg,
                                        color: statusColors.text,
                                        padding: isMobile ? '0.375rem 0.75rem' : '0.5rem 1rem',
                                        borderRadius: '12px',
                                        fontSize: isMobile ? '0.7rem' : '0.875rem',
                                        fontWeight: 700,
                                        textAlign: 'center',
                                        boxShadow: `0 4px 12px ${statusColors.shadow}`,
                                        textTransform: 'capitalize',
                                        minWidth: isMobile ? '90px' : '140px'
                                      }}>
                                        {isMobile 
                                          ? selected.replace('_', ' ').replace('WAITING FOR SUPPORT', 'Waiting').substring(0, 8) + (selected.length > 8 ? '...' : '')
                                          : selected.replace('_', ' ').replace('WAITING FOR SUPPORT', 'Waiting for Support')
                                        }
                                      </div>
                                    )}
                                  >
                                    {statusOrder.map(statusOption => {
                                      const optionColors = getStatusColor(statusOption);
                                      return (
                                        <MenuItem key={statusOption} value={statusOption}>
                                          <div style={{
                                            background: optionColors.bg,
                                            color: optionColors.text,
                                            padding: '0.5rem 1rem',
                                            borderRadius: '8px',
                                            fontSize: '0.875rem',
                                            fontWeight: 600,
                                            textAlign: 'center',
                                            width: '100%',
                                            textTransform: 'capitalize'
                                          }}>
                                            {statusOption.replace('_', ' ').replace('WAITING FOR SUPPORT', 'Waiting for Support')}
                                          </div>
                                        </MenuItem>
                                      );
                                    })}
                                  </Select>
                                </FormControl>
                              ) : (
                                <div style={{
                                  background: statusColors.bg,
                                  color: statusColors.text,
                                  padding: isMobile ? '0.375rem 0.75rem' : '0.5rem 1rem',
                                  borderRadius: '12px',
                                  fontSize: isMobile ? '0.7rem' : '0.875rem',
                                  fontWeight: 700,
                                  textAlign: 'center',
                                  boxShadow: `0 4px 12px ${statusColors.shadow}`,
                                  textTransform: 'capitalize',
                                  minWidth: isMobile ? '90px' : '140px'
                                }}>
                                  {isMobile 
                                    ? ticket.status?.replace('_', ' ').replace('WAITING FOR SUPPORT', 'Waiting').substring(0, 8) + (ticket.status?.length > 8 ? '...' : '')
                                    : ticket.status?.replace('_', ' ').replace('WAITING FOR SUPPORT', 'Waiting for Support')
                                  }
                                </div>
                              )}
                            </TableCell>

                            {/* Severity Column - Admin Only */}
                            {isAdmin && (
                              <TableCell onClick={(e) => e.stopPropagation()}>
                                <div style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '0.5rem',
                                  alignItems: 'center',
                                  minWidth: '120px'
                                }}>
                                  {/* Current Priority Display */}
                                  <div style={{
                                    background: priorityColors.bg,
                                    color: priorityColors.text,
                                    padding: '0.25rem 0.5rem',
                                    borderRadius: '6px',
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    textAlign: 'center',
                                    boxShadow: `0 2px 8px ${priorityColors.shadow}`,
                                    minWidth: '60px'
                                  }}>
                                    {ticket.priority}
                                  </div>
                                  
                                  {/* Priority Selection Controls */}
                                  <div style={{
                                    display: 'flex',
                                    gap: '0.25rem',
                                    flexWrap: 'wrap',
                                    justifyContent: 'center'
                                  }}>
                                    {['Low', 'Medium', 'High', 'Urgent'].map(priority => {
                                      const isCurrentPriority = ticket.priority === priority;
                                      const priorityColor = getPriorityColor(priority);
                                      
                                      return (
                                        <button
                                          key={priority}
                                          onClick={() => handlePriorityChange(ticket.id, priority)}
                                          disabled={ticket.status === 'RESOLVED' || ticket.status === 'CLOSED' || isCurrentPriority}
                                          style={{
                                            background: isCurrentPriority 
                                              ? priorityColor.bg 
                                              : (isDarkMode 
                                                ? 'rgba(55, 65, 81, 0.8)' 
                                                : 'rgba(255, 255, 255, 0.9)'),
                                            color: isCurrentPriority 
                                              ? priorityColor.text 
                                              : (isDarkMode ? '#d1d5db' : '#4b5563'),
                                            border: isCurrentPriority 
                                              ? 'none'
                                              : (isDarkMode ? '1px solid rgba(75, 85, 99, 0.5)' : '1px solid rgba(226, 232, 240, 0.5)'),
                                            borderRadius: '6px',
                                            padding: '0.375rem 0.5rem',
                                            fontSize: '0.65rem',
                                            fontWeight: isCurrentPriority ? 700 : 500,
                                            cursor: (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED' || isCurrentPriority) ? 'not-allowed' : 'pointer',
                                            opacity: (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') ? 0.5 : 1,
                                            minWidth: '45px',
                                            textAlign: 'center',
                                            transition: 'all 0.2s ease',
                                            boxShadow: isCurrentPriority ? `0 2px 8px ${priorityColor.shadow}` : 'none'
                                          }}
                                          title={isCurrentPriority 
                                            ? `Current priority: ${priority}` 
                                            : `Change priority to ${priority}`}
                                          onMouseEnter={(e) => {
                                            if (!isCurrentPriority && ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED') {
                                              e.target.style.background = priorityColor.bg;
                                              e.target.style.color = priorityColor.text;
                                              e.target.style.transform = 'translateY(-1px)';
                                              e.target.style.boxShadow = `0 3px 10px ${priorityColor.shadow}`;
                                            }
                                          }}
                                          onMouseLeave={(e) => {
                                            if (!isCurrentPriority && ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED') {
                                              e.target.style.background = isDarkMode 
                                                ? 'rgba(55, 65, 81, 0.8)' 
                                                : 'rgba(255, 255, 255, 0.9)';
                                              e.target.style.color = isDarkMode ? '#d1d5db' : '#4b5563';
                                              e.target.style.transform = 'translateY(0)';
                                              e.target.style.boxShadow = 'none';
                                            }
                                          }}
                                        >
                                          {priority}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              </TableCell>
                            )}

                            {/* Created Date - Hidden on mobile */}
                            <TableCell sx={{ 
                              display: { xs: 'none', md: 'table-cell' }
                            }}>
                              <Typography variant="body2" sx={{ 
                                color: isDarkMode ? '#9ca3af' : '#6b7280',
                                fontWeight: 500,
                                fontSize: '0.8rem'
                              }}>
                                {new Date(ticket.created_at).toLocaleDateString()}
                              </Typography>
                            </TableCell>

                            {/* Enhanced Due Date with Urgency Indicators */}
                            <TableCell>
                              {(() => {
                                // Show resolved badge for resolved/closed tickets
                                if (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') {
                                  return (
                                    <div style={{
                                      background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                                      color: 'white',
                                      padding: isMobile ? '0.375rem 0.75rem' : '0.5rem 1rem',
                                      borderRadius: '12px',
                                      fontSize: isMobile ? '0.7rem' : '0.875rem',
                                      fontWeight: 700,
                                      textAlign: 'center',
                                      boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: isMobile ? '0.25rem' : '0.5rem',
                                      minWidth: isMobile ? '80px' : '100px'
                                    }}>
                                      <CheckCircleIcon fontSize={isMobile ? "small" : "small"} />
                                      {isMobile ? 'Done' : 'Resolved'}
                                    </div>
                                  );
                                }
                                
                                const dueAt = ticket.due_at;
                                if (!dueAt) return (
                                  <div style={{
                                    background: isDarkMode 
                                      ? 'linear-gradient(135deg, rgba(107, 114, 128, 0.3) 0%, rgba(156, 163, 175, 0.3) 100%)'
                                      : 'linear-gradient(135deg, rgba(243, 244, 246, 0.8) 0%, rgba(229, 231, 235, 0.8) 100%)',
                                    color: isDarkMode ? '#9ca3af' : '#6b7280',
                                    padding: isMobile ? '0.375rem 0.75rem' : '0.5rem 1rem',
                                    borderRadius: '12px',
                                    fontSize: isMobile ? '0.7rem' : '0.875rem',
                                    fontWeight: 600,
                                    textAlign: 'center',
                                    border: isDarkMode ? '1px solid rgba(107, 114, 128, 0.3)' : '1px solid rgba(209, 213, 219, 0.5)',
                                    minWidth: isMobile ? '60px' : '100px'
                                  }}>
                                    N/A
                                  </div>
                                );
                                
                                const d = new Date(dueAt);
                                const today = new Date();
                                const isToday = d.toDateString() === today.toDateString();
                                const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                const dateStr = isMobile 
                                  ? `${d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' })}`
                                  : `${d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' })} ${timeStr}`;
                                const displayStr = isToday 
                                  ? (isMobile ? `Today` : `Today ${timeStr}`)
                                  : dateStr;
                                
                                const urgencyConfig = {
                                  overdue: {
                                    bg: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
                                    text: 'white',
                                    shadow: 'rgba(220, 38, 38, 0.3)',
                                    icon: ErrorIcon,
                                    pulse: true
                                  },
                                  urgent: {
                                    bg: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)',
                                    text: 'white',
                                    shadow: 'rgba(234, 88, 12, 0.3)',
                                    icon: WarningIcon,
                                    pulse: true
                                  },
                                  soon: {
                                    bg: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
                                    text: '#1f2937',
                                    shadow: 'rgba(245, 158, 11, 0.3)',
                                    icon: HourglassIcon
                                  },
                                  normal: {
                                    bg: priorityColors.bg,
                                    text: priorityColors.text,
                                    shadow: priorityColors.shadow,
                                    icon: ScheduleIcon
                                  }
                                };
                                
                                const config = urgencyConfig[dueDateUrgency] || urgencyConfig.normal;
                                const IconComponent = config.icon;
                                
                                return (
                                  <div style={{
                                    background: config.bg,
                                    color: config.text,
                                    padding: isMobile ? '0.375rem 0.5rem' : '0.5rem 1rem',
                                    borderRadius: '12px',
                                    fontSize: isMobile ? '0.65rem' : '0.875rem',
                                    fontWeight: 700,
                                    textAlign: 'center',
                                    boxShadow: `0 4px 12px ${config.shadow}`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: isMobile ? '0.25rem' : '0.5rem',
                                    minWidth: isMobile ? '100px' : '140px',
                                    animation: config.pulse ? 'pulse 2s infinite' : 'none',
                                    flexDirection: isMobile ? 'column' : 'row'
                                  }}>
                                    <IconComponent fontSize={isMobile ? "small" : "small"} />
                                    <span style={{ 
                                      lineHeight: isMobile ? '1.2' : '1',
                                      fontSize: isMobile ? '0.65rem' : 'inherit'
                                    }}>
                                    {displayStr}
                                    </span>
                                  </div>
                                );
                              })()}
                            </TableCell>
                          </TableRow>
                        </Fade>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>
            {/* Pagination Controls */}
            {filteredTickets.length > rowsPerPage && (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 3 }}>
                <Pagination
                  count={Math.ceil(filteredTickets.length / rowsPerPage)}
                  page={page}
                  onChange={(_, value) => setPage(value)}
                  color={isDarkMode ? 'primary' : 'standard'}
                  variant="outlined"
                  shape="rounded"
                  sx={{
                    '& .MuiPaginationItem-root': {
                      fontWeight: 600,
                      borderRadius: '8px',
                      background: isDarkMode
                        ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
                        : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                      color: isDarkMode ? '#f1f5f9' : '#1e293b',
                      border: isDarkMode ? '1px solid #334155' : '1px solid #e2e8f0',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                      transition: 'all 0.2s',
                      '&.Mui-selected': {
                        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                        color: 'white',
                        border: 'none',
                        boxShadow: '0 4px 16px rgba(99,102,241,0.12)'
                      }
                    }
                  }}
                />
              </Box>
            )}
          </div>
        </Card>
      </Fade>

      <AdminCommentModal
        open={adminCommentModal.open}
        onClose={() => setAdminCommentModal({ open: false, ticketId: null, newStatus: '', loading: false })}
        onSubmit={handleAdminCommentSubmit}
        loading={adminCommentModal.loading}
      />

      <style>{`
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.05);
            opacity: 0.9;
          }
        }
      `}</style>
    </>
  );
};

export default TicketList; 