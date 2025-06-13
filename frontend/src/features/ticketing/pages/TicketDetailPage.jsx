import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../../services/supabase';
import { Box, Typography, Button, TextField, Paper, CircularProgress, Alert, Divider, List, ListItem, ListItemText, Avatar, Chip, Grid, Card, CardContent, CardHeader, Fade, Slide, LinearProgress } from '@mui/material';
import { ArrowBack as ArrowBackIcon, NoteAdd as NoteAddIcon, Reply as ReplyIcon, AccountCircle, Schedule as ScheduleIcon, Person as PersonIcon, Category as CategoryIcon, Business as BusinessIcon, PriorityHigh as PriorityIcon, Timeline as TimelineIcon, InsertDriveFile as InsertDriveFileIcon } from '@mui/icons-material';
import '../styles/TicketDetailPage.css';
import Snackbar from '@mui/material/Snackbar';
import Container from '@mui/material/Container';
import { useTheme } from '@mui/material/styles';
import { useAuth } from '../../../contexts/AuthContext';
import { useTicketAssigneeRole } from '../../../utils/useTicketAssigneeRole';

/* --- Log after all imports --- */


const TicketDetailPage = () => {
  const { ticketId } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  

  const [ticket, setTicket] = useState(null);
  const [communications, setCommunications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [internalNote, setInternalNote] = useState('');
  const [replyMessage, setReplyMessage] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  const [attachments, setAttachments] = useState([]);
  const [isAttachmentsLoading, setIsAttachmentsLoading] = useState(false);
  const [attachmentsError, setAttachmentsError] = useState(null);
  const [replyAttachments, setReplyAttachments] = useState([]);
  const [adminReplyAttachments, setAdminReplyAttachments] = useState([]);
  const [uploadingReply, setUploadingReply] = useState(false);
  const [uploadingAdminReply, setUploadingAdminReply] = useState(false);
  const [commentAttachmentMap, setCommentAttachmentMap] = useState({}); // { [commentId]: [fileObj, ...] }

  const { user } = useAuth();
  const { role, loading: roleLoading } = useTicketAssigneeRole(user?.id);

  // Helper to format a display name from an email in the form firstname.lastname@domain
  const formatNameFromEmail = (email) => {
    if (!email) return 'User';
    // Special case: HR admin email
    if (email.toLowerCase() === 'hr@othainsoft.com') return 'HR Admin';
    // Special case: IT admin email
    if (email.toLowerCase() === 'it@othainsoft.com') return 'IT Admin';
    // Special case: Accounts admin email
    if (email.toLowerCase() === 'accounts@othainsoft.com') return 'Accounts Admin';
    if (email.toLowerCase() === 'operations@othainsoft.com') return 'Operations Admin';
    if (email.toLowerCase() === 'ai@othainsoft.com') return 'AI Admin';
    const local = email.split('@')[0];
    const parts = local.split('.');
    const capitalize = s => s.charAt(0).toUpperCase() + s.slice(1);
    if (parts.length >= 2) {
      return `${capitalize(parts[0])} ${capitalize(parts[1])}`;
    }
    return capitalize(parts[0]);
  };

  // Get priority color based on priority level
  const getPriorityColor = (priority) => {
    switch(priority?.toLowerCase()) {
      case 'low': return { 
        bg: 'linear-gradient(135deg, #9333ea 0%, #a855f7 100%)', 
        shadow: 'rgba(147, 51, 234, 0.3)' 
      };
      case 'medium': return { 
        bg: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)', 
        shadow: 'rgba(245, 158, 11, 0.3)',
        text: '#1f2937'
      };
      case 'high': return { 
        bg: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)', 
        shadow: 'rgba(234, 88, 12, 0.3)' 
      };
      case 'urgent': return { 
        bg: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)', 
        shadow: 'rgba(220, 38, 38, 0.3)' 
      };
      default: return { 
        bg: 'linear-gradient(135deg, #6b7280 0%, #9ca3af 100%)', 
        shadow: 'rgba(107, 114, 128, 0.3)' 
      };
    }
  };

  // Get status color based on status
  const getStatusColor = (status) => {
    switch(status) {
      case 'new': 
      case 'WAITING FOR SUPPORT': return { 
        bg: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)', 
        shadow: 'rgba(37, 99, 235, 0.3)' 
      };
      case 'in_progress': 
      case 'IN_PROGRESS': return { 
        bg: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)', 
        shadow: 'rgba(234, 88, 12, 0.3)' 
      };
      case 'waiting_on_client': return { 
        bg: 'linear-gradient(135deg, #9333ea 0%, #a855f7 100%)', 
        shadow: 'rgba(147, 51, 234, 0.3)' 
      };
      case 'resolved': 
      case 'RESOLVED':
      case 'CLOSED': return { 
        bg: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', 
        shadow: 'rgba(5, 150, 105, 0.3)' 
      };
      default: return { 
        bg: 'linear-gradient(135deg, #6b7280 0%, #9ca3af 100%)', 
        shadow: 'rgba(107, 114, 128, 0.3)' 
      };
    }
  };

  useEffect(() => {
    
    if (currentUser) {
      let role = currentUser.user_metadata?.role;
      const email = currentUser.email?.toLowerCase();
      
      // Treat specific tickets account as admin
      if (email === 'tickets@othainsoft.com') {
        role = 'admin';
      }
      setIsAdmin(
        role === 'admin' || role === 'it_admin' || role === 'hr_admin' || role === 'payroll_admin' || role === 'operations_admin' || role === 'ai_admin'
      );
    } else {
      setIsAdmin(false);
    }
  }, [currentUser]);

  const fetchTicketData = useCallback(async () => {
    
    setIsLoading(true);
    setError(null);
    try {
      const { data: ticketData, error: ticketError } = await supabase
        .from('v_ticket_board')
        .select('*')
        .eq('id', ticketId)
        .single();
      
      
      if (ticketError) throw ticketError;
      setTicket(ticketData);

      const { data: commsDataBasic, error: commsBasicError } = await supabase
        .from('ticket_communications')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });
      if (commsBasicError) throw commsBasicError;

      // Fetch user details for each communication (N+1 fallback)
      const commsWithUserDetails = await Promise.all(
        (commsDataBasic || []).map(async (comm) => {
          let userDetails = null;
          if (comm.user_id) {
            const { data: userData, error: userError } = await supabase
              .from('v_user_emails')
              .select('email')
              .eq('id', comm.user_id)
              .single();
            if (!userError && userData) {
              userDetails = userData; // { email }
            }
          }
          return { ...comm, user_details: userDetails };
        })
      );
      setCommunications(commsWithUserDetails);

    } catch (fetchError) {
      
      setError(`Failed to load ticket data: ${fetchError.message}`);
      setTicket(null);
      setCommunications([]);
    } finally {
      
      setIsLoading(false);
    }
  }, [ticketId]);

  // Load current user on mount
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        setError('Could not fetch user details.');
        setIsAuthLoading(false);
      } else {
        setCurrentUser(user);
        setIsAuthLoading(false);
      }
    };
    getCurrentUser();
  }, []);

  // Fetch ticket data once auth is known and ticketId changes
  useEffect(() => {
    if (isAuthLoading) return;
    if (!ticketId) {
      setIsLoading(false);
      return;
    }
    if (!currentUser) {
      setError('You must be logged in to view ticket details.');
      setIsLoading(false);
      return;
    }
    fetchTicketData();
  }, [ticketId, currentUser, fetchTicketData, isAuthLoading]);

  useEffect(() => {
    if (!ticketId) return;
    const channel = supabase
      .channel(`ticket-comms-${ticketId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'ticket_communications', filter: `ticket_id=eq.${ticketId}` },
        (payload) => {
          
          fetchTicketData(); 
        }
      )
      .subscribe();

    return () => {
      
      supabase.removeChannel(channel);
    };
  }, [ticketId, fetchTicketData]);

  // Fetch ticket attachments from Supabase Storage
  useEffect(() => {
    if (!ticket || !ticket.id) return;
    setIsAttachmentsLoading(true);
    setAttachmentsError(null);
    async function fetchAttachments() {
      try {
        const { data, error } = await supabase.storage
          .from('ticket-attachments')
          .list(`${ticket.id}/`, { limit: 100 });
        if (error) throw error;
        setAttachments(data || []);
      } catch (err) {
        setAttachmentsError('Failed to load attachments.');
        setAttachments([]);
      } finally {
        setIsAttachmentsLoading(false);
      }
    }
    fetchAttachments();
  }, [ticket]);

  // Helper to fetch attachments for a comment
  const fetchCommentAttachments = async (commentId) => {
    try {
      const { data, error } = await supabase.storage
        .from('ticket-attachments')
        .list(`${ticket.id}/comment-attachments/${commentId}/`, { limit: 20 });
      if (error) return [];
      return data || [];
    } catch {
      return [];
    }
  };

  // Fetch attachments for all comments after communications load
  useEffect(() => {
    if (!ticket || !communications.length) return;
    (async () => {
      const map = {};
      for (const comm of communications) {
        if (comm.id) {
          map[comm.id] = await fetchCommentAttachments(comm.id);
        }
      }
      setCommentAttachmentMap(map);
    })();
  }, [ticket, communications]);

  const handleReplyAttachmentChange = (e, isAdmin) => {
    const files = Array.from(e.target.files);
    if (isAdmin) setAdminReplyAttachments(files);
    else setReplyAttachments(files);
  };

  const handleSubmitCommunication = async (message, type) => {
    if (!message.trim() || !currentUser) return;
    setIsSubmitting(true);
    try {
      const { data: insertData, error: insertError } = await supabase
        .from('ticket_communications')
        .insert([{ 
          ticket_id: ticketId, 
          user_id: currentUser.id,
          message: message, 
          type: type 
        }])
        .select();
      if (insertError) throw insertError;
      const newComm = insertData && insertData[0];
      // Upload attachments if any
      let uploadError = null;
      if (type === 'admin_reply' && adminReplyAttachments.length > 0 && newComm) {
        setUploadingAdminReply(true);
        for (const file of adminReplyAttachments) {
          const filePath = `${ticket.id}/comment-attachments/${newComm.id}/${file.name}`;
          const { error } = await supabase.storage
            .from('ticket-attachments')
            .upload(filePath, file, { cacheControl: '3600', upsert: false });
          if (error) uploadError = error;
        }
        setAdminReplyAttachments([]);
        setUploadingAdminReply(false);
      } else if (type === 'customer_reply' && replyAttachments.length > 0 && newComm) {
        setUploadingReply(true);
        for (const file of replyAttachments) {
          const filePath = `${ticket.id}/comment-attachments/${newComm.id}/${file.name}`;
          const { error } = await supabase.storage
            .from('ticket-attachments')
            .upload(filePath, file, { cacheControl: '3600', upsert: false });
          if (error) uploadError = error;
        }
        setReplyAttachments([]);
        setUploadingReply(false);
      }
      if (uploadError) throw uploadError;

      // Show confirmation overlay
      let confirmationText = '';
      if (type === 'internal_note') confirmationText = 'Internal note added';
      else if (type === 'admin_reply') confirmationText = 'Admin reply sent';
      else confirmationText = 'Comment sent';
      setSnackbarMessage(confirmationText);
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      if (type === 'internal_note') setInternalNote('');
      if (type === 'customer_reply' || type === 'admin_reply') setReplyMessage('');
    } catch (submissionError) {
      
      console.error('Error submitting communication:', submissionError);
      setError(`Failed to submit ${type}: ${submissionError.message}`);
      setSnackbarMessage('Failed to send');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Add expense approval handlers
  const handleApprove = async () => {
    // Capture previous phase
    const oldPhase = ticket.approval_phase;
    // Build update payload: include status for all tickets
    let updates = {};
    if (ticket.category_name === 'Expense Management') {
      // Expense workflow: advance phases
      if (ticket.approval_phase === 'manager') {
        updates.approval_phase = 'account_manager';
      } else if (ticket.approval_phase === 'account_manager') {
        updates.approval_phase = 'cfo';
      } else if (ticket.approval_phase === 'cfo') {
        updates.approval_phase = null;
      }
      // lookup next assignee if needed
      if (updates.approval_phase === 'account_manager') {
        const { data: acctRow } = await supabase.from('ticket_assignees').select('user_id').eq('role', 'accounts_manager').single();
        if (acctRow?.user_id) updates.assignee = acctRow.user_id;
      } else if (updates.approval_phase === 'cfo') {
        const { data: cfoRow } = await supabase.from('ticket_assignees').select('user_id').eq('role', 'cfo').single();
        if (cfoRow?.user_id) updates.assignee = cfoRow.user_id;
      } else if (updates.approval_phase === null) {
        updates.assignee = null;
      }
      // Set status for expense approvals
      updates.status = ticket.approval_phase === 'cfo' ? 'RESOLVED' : 'IN_PROGRESS';
    } else {
      // Generic ticket: always move to In Progress
      updates.status = 'IN_PROGRESS';
    }
    // Perform update and return new phase
    const { data: updatedRows, error: updError } = await supabase
      .from('tickets')
      .update(updates)
      .eq('id', ticket.id)
      .select('approval_phase');
    if (updError) return alert(updError.message);
    const newPhase = updatedRows?.[0]?.approval_phase;
    if (newPhase === oldPhase) {
      console.error(`Approval phase did not change. Old and new phase: ${oldPhase}`);
      return alert('Approval phase did not change. Please try again.');
    }
    // Log audit trail
    await supabase.from('ticket_communications').insert([{  
      ticket_id: ticket.id,
      user_id: currentUser.id,
      message: `Approved at phase ${ticket.approval_phase}`,
      type: 'approval'
    }]);
    fetchTicketData();
    navigate('/expense-dashboard');
  };

  const handleReject = async () => {
    // Reject back to employee
    const { error: rejError } = await supabase
      .from('tickets')
      .update({ status: 'WAITING_FOR_SUPPORT', approval_phase: null, assignee: ticket.requested_by })
      .eq('id', ticket.id);
    if (rejError) return alert(rejError.message);
    await supabase.from('ticket_communications').insert([{ 
      ticket_id: ticket.id,
      user_id: currentUser.id,
      message: `Rejected by ${ticket.approval_phase}`,
      type: 'approval'
    }]);
    fetchTicketData();
  };

  if (isLoading) { 
    
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '80vh',
        background: isDarkMode 
          ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
          : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
        borderRadius: '20px',
        margin: '2rem',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Background decoration */}
        <Box sx={{
          position: 'absolute',
          top: '-50%',
          right: '-20%',
          width: '300px',
          height: '300px',
          background: isDarkMode 
            ? 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)'
            : 'linear-gradient(135deg, #ddd6fe 0%, #c7d2fe 100%)',
          borderRadius: '50%',
          opacity: 0.1,
          filter: 'blur(40px)'
        }} />
        
        <Box sx={{
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          borderRadius: '50%',
          width: '80px',
          height: '80px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1.5rem',
          animation: 'pulse 2s infinite',
          zIndex: 1
        }}>
          <CircularProgress sx={{ color: 'white' }} size={40} />
        </Box>
        
        <Typography variant="h5" sx={{ 
          fontWeight: 700, 
          color: isDarkMode ? '#f1f5f9' : '#1e293b',
          marginBottom: '0.5rem',
          zIndex: 1
        }}>
          Loading Ticket Details
        </Typography>
        <Typography variant="body1" sx={{ 
          color: isDarkMode ? '#94a3b8' : '#64748b',
          textAlign: 'center',
          zIndex: 1
        }}>
          Please wait while we fetch the ticket information...
        </Typography>
      </Box>
    );
  }

  if (error && !ticket) {
    
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert 
          severity="error" 
          sx={{
            borderRadius: '16px',
            boxShadow: '0 10px 30px rgba(220, 38, 38, 0.15)',
            border: '1px solid #fca5a5'
          }}
        >
          {error}
        </Alert>
      </Container>
    );
  }

  if (!ticket) {
    
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert 
          severity="warning"
          sx={{
            borderRadius: '16px',
            boxShadow: '0 10px 30px rgba(245, 158, 11, 0.15)',
            border: '1px solid #fbbf24'
          }}
        >
          Ticket not found or you may not have permission to view this specific ticket.
        </Alert>
      </Container>
    );
  }

  const priorityColors = getPriorityColor(ticket.priority);
  const statusColors = getStatusColor(ticket.status);

  return (
    <Container maxWidth="xl" sx={{ 
      py: 2.5, 
      px: 2.5, 
      minHeight: 'calc(100vh - 64px)',
      background: isDarkMode 
        ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)'
        : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
      position: 'relative'
    }}>
      {/* Background decoration */}
      <Box sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: isDarkMode 
          ? 'radial-gradient(circle at 20% 80%, rgba(59, 130, 246, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(139, 92, 246, 0.1) 0%, transparent 50%)'
          : 'radial-gradient(circle at 20% 80%, rgba(99, 102, 241, 0.05) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(139, 92, 246, 0.05) 0%, transparent 50%)',
        zIndex: -1
      }} />

      <Fade in={true} timeout={800}>
        <Paper 
          elevation={0}
          sx={{ 
            p: { xs: 1.5, sm: 2.5, md: 3 }, 
            borderRadius: '20px',
            background: isDarkMode 
              ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(51, 65, 85, 0.95) 100%)'
              : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%)',
            backdropFilter: 'blur(20px)',
            border: isDarkMode ? '1px solid rgba(55, 65, 81, 0.5)' : '1px solid rgba(226, 232, 240, 0.5)',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Header with back button and title */}
          <Box sx={{ mb: 3 }}>
            <Button 
              startIcon={<ArrowBackIcon />} 
              onClick={() => navigate(-1)} 
              sx={{ 
                mb: 2.5,
                fontWeight: 600,
                color: isDarkMode ? '#94a3b8' : '#64748b',
                background: isDarkMode 
                  ? 'linear-gradient(135deg, rgba(55, 65, 81, 0.8) 0%, rgba(75, 85, 99, 0.8) 100%)'
                  : 'linear-gradient(135deg, rgba(248, 250, 252, 0.8) 0%, rgba(241, 245, 249, 0.8) 100%)',
                backdropFilter: 'blur(10px)',
                borderRadius: '10px',
                border: isDarkMode ? '1px solid rgba(75, 85, 99, 0.5)' : '1px solid rgba(226, 232, 240, 0.5)',
                px: 2.5,
                py: 1.25,
                fontSize: '0.875rem',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  background: isDarkMode 
                    ? 'linear-gradient(135deg, rgba(75, 85, 99, 0.9) 0%, rgba(107, 114, 128, 0.9) 100%)'
                    : 'linear-gradient(135deg, rgba(241, 245, 249, 0.9) 0%, rgba(226, 232, 240, 0.9) 100%)',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 8px 20px rgba(0, 0, 0, 0.15)'
                }
              }}
            >
              Back to Tickets
            </Button>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
              <Box>
                <Typography variant="h3" component="h1" sx={{ 
                  fontWeight: 800,
                  background: isDarkMode 
                    ? 'linear-gradient(135deg, #f1f5f9 0%, #cbd5e1 100%)'
                    : 'linear-gradient(135deg, #1e293b 0%, #475569 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  mb: 0.75,
                  lineHeight: 1.2,
                  fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' }
                }}>
                  {ticket.title || 'Ticket Detail'}
                </Typography>
                <Typography variant="h6" sx={{ 
                  color: isDarkMode ? '#94a3b8' : '#64748b',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  fontSize: '0.875rem'
                }}>
                  <TimelineIcon fontSize="small" />
                  Ticket #{ticket.id}
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                <Chip 
                  label={ticket.status?.replace('_', ' ').replace('WAITING FOR SUPPORT', 'Waiting for Support')}
                  sx={{ 
                    textTransform: 'capitalize',
                    background: statusColors.bg,
                    color: statusColors.text || 'white',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    height: '32px',
                    px: 1.5,
                    borderRadius: '16px',
                    boxShadow: `0 4px 15px ${statusColors.shadow}`,
                    border: 'none',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: `0 6px 20px ${statusColors.shadow}`
                    }
                  }}
                />
                <Chip 
                  label={ticket.priority}
                  icon={<PriorityIcon />}
                  sx={{ 
                    background: priorityColors.bg,
                    color: priorityColors.text || 'white',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    height: '32px',
                    px: 1.5,
                    borderRadius: '16px',
                    boxShadow: `0 4px 15px ${priorityColors.shadow}`,
                    border: 'none',
                    '& .MuiChip-icon': {
                      color: priorityColors.text || 'white'
                    },
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: `0 6px 20px ${priorityColors.shadow}`
                    }
                  }}
                />
              </Box>
            </Box>
          </Box>

          {/* Insert Approve/Reject buttons after error banner and before content */}
          {error && (
            <Slide direction="down" in={!!error} mountOnEnter unmountOnExit>
              <Alert 
                severity="info" 
                sx={{
                  mb: 2.5,
                  borderRadius: '10px',
                  background: isDarkMode 
                    ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.1) 100%)'
                    : 'linear-gradient(135deg, rgba(219, 234, 254, 0.8) 0%, rgba(191, 219, 254, 0.8) 100%)',
                  border: isDarkMode ? '1px solid rgba(59, 130, 246, 0.2)' : '1px solid rgba(59, 130, 246, 0.3)'
                }}
              >
                {error}
              </Alert>
            </Slide>
          )}

          {/* Debug log for approval buttons */}
          
          {/* Only show Approve/Reject when user's workflow role matches the phase and they are the assignee */}
          {!roleLoading
            && ticket.assignee === user.id
            && (
              (role === 'reporting_manager' && ticket.approval_phase === 'manager')
              || (role === 'accounts_manager'  && ticket.approval_phase === 'account_manager')
              || (role === 'cfo'               && ticket.approval_phase === 'cfo')
            )
            && (
              <Box sx={{ mb: 2.5, display: 'flex', gap: 2 }}>
                <Button variant="contained" color="primary" onClick={handleApprove}>
                  Approve
                </Button>
                <Button variant="outlined" color="error" onClick={handleReject}>
                  Reject
                </Button>
              </Box>
            )
          }
        
          {/* Ticket Information Cards */}
          <Grid container spacing={2.5} sx={{ mb: 3 }}>
            {/* Main Details Card */}
            <Grid item xs={12} lg={8}>
              <Card sx={{ 
                borderRadius: '16px',
                background: isDarkMode 
                  ? 'linear-gradient(135deg, rgba(55, 65, 81, 0.8) 0%, rgba(75, 85, 99, 0.8) 100%)'
                  : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.9) 100%)',
                backdropFilter: 'blur(10px)',
                border: isDarkMode ? '1px solid rgba(75, 85, 99, 0.5)' : '1px solid rgba(226, 232, 240, 0.5)',
                boxShadow: '0 8px 25px rgba(0, 0, 0, 0.1)',
                overflow: 'visible'
              }}>
                <CardHeader 
                  title={
                    <Typography variant="h6" sx={{ 
                      fontWeight: 700, 
                      color: isDarkMode ? '#f3f4f6' : '#1f2937',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      fontSize: '1rem'
                    }}>
                      <CategoryIcon />
                      Ticket Information
                    </Typography>
                  }
                  sx={{ pb: 1.5 }}
                />
                <CardContent sx={{ pt: 0 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6} md={4}>
                      <Box sx={{ 
                        p: 1.5, 
                        borderRadius: '10px',
                        background: isDarkMode 
                          ? 'linear-gradient(135deg, rgba(75, 85, 99, 0.5) 0%, rgba(107, 114, 128, 0.5) 100%)'
                          : 'linear-gradient(135deg, rgba(241, 245, 249, 0.8) 0%, rgba(226, 232, 240, 0.8) 100%)',
                        border: isDarkMode ? '1px solid rgba(107, 114, 128, 0.3)' : '1px solid rgba(203, 213, 225, 0.5)'
                      }}>
                        <Typography variant="caption" sx={{ color: isDarkMode ? '#9ca3af' : '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.7rem' }}>ID</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: isDarkMode ? '#f3f4f6' : '#1f2937', fontSize: '1rem' }}>{ticket.id}</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                      <Box sx={{ 
                        p: 1.5, 
                        borderRadius: '10px',
                        background: isDarkMode 
                          ? 'linear-gradient(135deg, rgba(75, 85, 99, 0.5) 0%, rgba(107, 114, 128, 0.5) 100%)'
                          : 'linear-gradient(135deg, rgba(241, 245, 249, 0.8) 0%, rgba(226, 232, 240, 0.8) 100%)',
                        border: isDarkMode ? '1px solid rgba(107, 114, 128, 0.3)' : '1px solid rgba(203, 213, 225, 0.5)'
                      }}>
                        <Typography variant="caption" sx={{ color: isDarkMode ? '#9ca3af' : '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.7rem' }}>Category</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: isDarkMode ? '#f3f4f6' : '#1f2937', fontSize: '1rem' }}>{ticket.category_name || 'N/A'}</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                      <Box sx={{ 
                        p: 1.5, 
                        borderRadius: '10px',
                        background: isDarkMode 
                          ? 'linear-gradient(135deg, rgba(75, 85, 99, 0.5) 0%, rgba(107, 114, 128, 0.5) 100%)'
                          : 'linear-gradient(135deg, rgba(241, 245, 249, 0.8) 0%, rgba(226, 232, 240, 0.8) 100%)',
                        border: isDarkMode ? '1px solid rgba(107, 114, 128, 0.3)' : '1px solid rgba(203, 213, 225, 0.5)'
                      }}>
                        <Typography variant="caption" sx={{ color: isDarkMode ? '#9ca3af' : '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.7rem' }}>Sub-Category</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: isDarkMode ? '#f3f4f6' : '#1f2937', fontSize: '1rem' }}>{ticket.sub_category_name || 'N/A'}</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ 
                        p: 1.5, 
                        borderRadius: '10px',
                        background: isDarkMode 
                          ? 'linear-gradient(135deg, rgba(75, 85, 99, 0.5) 0%, rgba(107, 114, 128, 0.5) 100%)'
                          : 'linear-gradient(135deg, rgba(241, 245, 249, 0.8) 0%, rgba(226, 232, 240, 0.8) 100%)',
                        border: isDarkMode ? '1px solid rgba(107, 114, 128, 0.3)' : '1px solid rgba(203, 213, 225, 0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1
                      }}>
                        <PersonIcon sx={{ color: isDarkMode ? '#9ca3af' : '#6b7280', fontSize: '1rem' }} />
                        <Box>
                          <Typography variant="caption" sx={{ color: isDarkMode ? '#9ca3af' : '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.7rem' }}>Requester</Typography>
                          <Typography variant="h6" sx={{ fontWeight: 700, color: isDarkMode ? '#f3f4f6' : '#1f2937', fontSize: '1rem' }}>{formatNameFromEmail(ticket.requester_email) || 'N/A'}</Typography>
                        </Box>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ 
                        p: 1.5, 
                        borderRadius: '10px',
                        background: isDarkMode 
                          ? 'linear-gradient(135deg, rgba(75, 85, 99, 0.5) 0%, rgba(107, 114, 128, 0.5) 100%)'
                          : 'linear-gradient(135deg, rgba(241, 245, 249, 0.8) 0%, rgba(226, 232, 240, 0.8) 100%)',
                        border: isDarkMode ? '1px solid rgba(107, 114, 128, 0.3)' : '1px solid rgba(203, 213, 225, 0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1
                      }}>
                        <BusinessIcon sx={{ color: isDarkMode ? '#9ca3af' : '#6b7280', fontSize: '1rem' }} />
                        <Box>
                          <Typography variant="caption" sx={{ color: isDarkMode ? '#9ca3af' : '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.7rem' }}>Client</Typography>
                          <Typography variant="h6" sx={{ fontWeight: 700, color: isDarkMode ? '#f3f4f6' : '#1f2937', fontSize: '1rem' }}>{ticket.client || 'N/A'}</Typography>
                        </Box>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* Timeline Card */}
            <Grid item xs={12} lg={4}>
              <Card sx={{ 
                borderRadius: '16px',
                background: isDarkMode 
                  ? 'linear-gradient(135deg, rgba(55, 65, 81, 0.8) 0%, rgba(75, 85, 99, 0.8) 100%)'
                  : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.9) 100%)',
                backdropFilter: 'blur(10px)',
                border: isDarkMode ? '1px solid rgba(75, 85, 99, 0.5)' : '1px solid rgba(226, 232, 240, 0.5)',
                boxShadow: '0 8px 25px rgba(0, 0, 0, 0.1)',
                height: 'fit-content'
              }}>
                <CardHeader 
                  title={
                    <Typography variant="h6" sx={{ 
                      fontWeight: 700, 
                      color: isDarkMode ? '#f3f4f6' : '#1f2937',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      fontSize: '1rem'
                    }}>
                      <ScheduleIcon />
                      Timeline
                    </Typography>
                  }
                  sx={{ pb: 1.5 }}
                />
                <CardContent sx={{ pt: 0, '& > *:not(:last-child)': { mb: 1.5 } }}>
                  <Box sx={{ 
                    p: 1.5, 
                    borderRadius: '10px',
                    background: isDarkMode 
                      ? 'linear-gradient(135deg, rgba(75, 85, 99, 0.5) 0%, rgba(107, 114, 128, 0.5) 100%)'
                      : 'linear-gradient(135deg, rgba(241, 245, 249, 0.8) 0%, rgba(226, 232, 240, 0.8) 100%)',
                    border: isDarkMode ? '1px solid rgba(107, 114, 128, 0.3)' : '1px solid rgba(203, 213, 225, 0.5)'
                  }}>
                    <Typography variant="caption" sx={{ color: isDarkMode ? '#9ca3af' : '#6b7280', fontWeight: 600, fontSize: '0.75rem' }}>Created</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: isDarkMode ? '#f3f4f6' : '#1f2937', fontSize: '0.875rem' }}>{new Date(ticket.created_at).toLocaleString()}</Typography>
                  </Box>
                  {ticket.due_at && (
                    <Box sx={{ 
                      p: 1.5, 
                      borderRadius: '10px',
                      background: isDarkMode 
                        ? 'linear-gradient(135deg, rgba(75, 85, 99, 0.5) 0%, rgba(107, 114, 128, 0.5) 100%)'
                        : 'linear-gradient(135deg, rgba(241, 245, 249, 0.8) 0%, rgba(226, 232, 240, 0.8) 100%)',
                      border: isDarkMode ? '1px solid rgba(107, 114, 128, 0.3)' : '1px solid rgba(203, 213, 225, 0.5)'
                    }}>
                      <Typography variant="caption" sx={{ color: isDarkMode ? '#9ca3af' : '#6b7280', fontWeight: 600, fontSize: '0.75rem' }}>Due At</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: isDarkMode ? '#f3f4f6' : '#1f2937', fontSize: '0.875rem' }}>{new Date(ticket.due_at).toLocaleString()}</Typography>
                    </Box>
                  )}
                  <Box sx={{ 
                    p: 1.5, 
                    borderRadius: '10px',
                    background: isDarkMode 
                      ? 'linear-gradient(135deg, rgba(75, 85, 99, 0.5) 0%, rgba(107, 114, 128, 0.5) 100%)'
                      : 'linear-gradient(135deg, rgba(241, 245, 249, 0.8) 0%, rgba(226, 232, 240, 0.8) 100%)',
                    border: isDarkMode ? '1px solid rgba(107, 114, 128, 0.3)' : '1px solid rgba(203, 213, 225, 0.5)'
                  }}>
                    <Typography variant="caption" sx={{ color: isDarkMode ? '#9ca3af' : '#6b7280', fontWeight: 600, fontSize: '0.75rem' }}>Last Updated</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: isDarkMode ? '#f3f4f6' : '#1f2937', fontSize: '0.875rem' }}>{ticket.updated_at ? new Date(ticket.updated_at).toLocaleString() : 'N/A'}</Typography>
                  </Box>
                  {ticket.resolved_at && (
                    <Box sx={{ 
                      p: 1.5, 
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, rgba(5, 150, 105, 0.1) 0%, rgba(16, 185, 129, 0.1) 100%)',
                      border: '1px solid rgba(5, 150, 105, 0.3)'
                    }}>
                      <Typography variant="caption" sx={{ color: '#065f46', fontWeight: 600, fontSize: '0.75rem' }}>Resolved At</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#065f46', fontSize: '0.875rem' }}>{new Date(ticket.resolved_at).toLocaleString()}</Typography>
                    </Box>
                  )}
                  {ticket.time_to_resolution && (
                    <Box sx={{ 
                      p: 1.5, 
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
                      border: '1px solid rgba(99, 102, 241, 0.3)'
                    }}>
                      <Typography variant="caption" sx={{ color: '#4338ca', fontWeight: 600, fontSize: '0.75rem' }}>Resolution Time</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#4338ca', fontSize: '0.875rem' }}>{ticket.time_to_resolution}</Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Description Card */}
          <Card sx={{ 
            mb: 3,
            borderRadius: '16px',
            background: isDarkMode 
              ? 'linear-gradient(135deg, rgba(55, 65, 81, 0.8) 0%, rgba(75, 85, 99, 0.8) 100%)'
              : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.9) 100%)',
            backdropFilter: 'blur(10px)',
            border: isDarkMode ? '1px solid rgba(75, 85, 99, 0.5)' : '1px solid rgba(226, 232, 240, 0.5)',
            boxShadow: '0 8px 25px rgba(0, 0, 0, 0.1)'
          }}>
            <CardHeader 
              title={
                <Typography variant="h6" sx={{ 
                  fontWeight: 700, 
                  color: isDarkMode ? '#f3f4f6' : '#1f2937',
                  fontSize: '1rem'
                }}>
                  Description
                </Typography>
              }
            />
            <CardContent>
              <Typography 
                variant="body1" 
                sx={{
                  whiteSpace: 'pre-wrap', 
                  color: isDarkMode ? '#d1d5db' : '#4b5563',
                  lineHeight: 1.6,
                  fontSize: '0.875rem'
                }}
              >
                {ticket.description || 'No description provided.'}
              </Typography>
            </CardContent>
          </Card>

          {/* Attachments Card */}
          <Card sx={{
            mb: 3,
            borderRadius: '16px',
            background: isDarkMode
              ? 'linear-gradient(135deg, rgba(55, 65, 81, 0.8) 0%, rgba(75, 85, 99, 0.8) 100%)'
              : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.9) 100%)',
            backdropFilter: 'blur(10px)',
            border: isDarkMode ? '1px solid rgba(75, 85, 99, 0.5)' : '1px solid rgba(226, 232, 240, 0.5)',
            boxShadow: '0 8px 25px rgba(0, 0, 0, 0.1)'
          }}>
            <CardHeader
              title={
                <Typography variant="h6" sx={{
                  fontWeight: 700,
                  color: isDarkMode ? '#f3f4f6' : '#1f2937',
                  fontSize: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}>
                  <InsertDriveFileIcon sx={{ mr: 1, color: isDarkMode ? '#a5b4fc' : '#6366f1' }} />
                  Attachments
                </Typography>
              }
            />
            <CardContent>
              {isAttachmentsLoading ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <CircularProgress size={24} />
                  <Typography variant="body2">Loading attachments...</Typography>
                </Box>
              ) : attachmentsError ? (
                <Alert severity="error">{attachmentsError}</Alert>
              ) : attachments.length === 0 ? (
                <Typography variant="body2" sx={{ color: isDarkMode ? '#9ca3af' : '#64748b' }}>
                  No attachments for this ticket.
                </Typography>
              ) : (
                <List dense>
                  {attachments.map((file) => (
                    <ListItem key={file.name} sx={{
                      borderRadius: '10px',
                      background: isDarkMode
                        ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(51, 65, 85, 0.7) 100%)'
                        : 'linear-gradient(135deg, rgba(241, 245, 249, 0.8) 0%, rgba(226, 232, 240, 0.8) 100%)',
                      border: isDarkMode ? '1px solid rgba(55, 65, 81, 0.2)' : '1px solid rgba(226, 232, 240, 0.2)',
                      mb: 1,
                      px: 2
                    }}>
                      <InsertDriveFileIcon sx={{ color: isDarkMode ? '#a5b4fc' : '#6366f1', mr: 1 }} />
                      <ListItemText
                        primary={<a
                          href={supabase.storage.from('ticket-attachments').getPublicUrl(`${ticket.id}/${file.name}`).data.publicUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: isDarkMode ? '#a5b4fc' : '#2563eb', fontWeight: 600, textDecoration: 'underline' }}
                        >
                          {file.name}
                        </a>}
                        secondary={`${(file.metadata?.size ? file.metadata.size : file.size || 0) / 1024 < 1024
                          ? `${((file.metadata?.size ? file.metadata.size : file.size || 0) / 1024).toFixed(1)} KB`
                          : `${((file.metadata?.size ? file.metadata.size : file.size || 0) / 1024 / 1024).toFixed(2)} MB`
                        }`}
                        sx={{ ml: 1 }}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>

          {/* Admin Comment Card */}
          {ticket.admin_comment && (
            <Slide direction="up" in={!!ticket.admin_comment} mountOnEnter>
              <Card sx={{ 
                mb: 3,
                borderRadius: '16px',
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(5, 150, 105, 0.12) 100%)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                boxShadow: '0 8px 25px rgba(16, 185, 129, 0.10)'
              }}>
                <CardHeader 
                  title={
                    <Typography variant="h6" sx={{ 
                      fontWeight: 700, 
                      color: '#047857',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      fontSize: '1rem'
                    }}>
                      <NoteAddIcon />
                      Resolution Reason
                    </Typography>
                  }
                />
                <CardContent>
                  <Typography 
                    variant="body1" 
                    sx={{
                      whiteSpace: 'pre-wrap', 
                      color: '#065f46',
                      lineHeight: 1.6,
                      fontSize: '0.95rem'
                    }}
                  >
                    {ticket.admin_comment}
                  </Typography>
                </CardContent>
              </Card>
            </Slide>
          )}

          <Divider sx={{ my: 3, borderColor: isDarkMode ? 'rgba(75, 85, 99, 0.5)' : 'rgba(226, 232, 240, 0.5)' }} />

          {/* Activity Section */}
          <Typography variant="h4" component="h2" sx={{ 
            mb: 2.5, 
            fontWeight: 800,
            background: isDarkMode 
              ? 'linear-gradient(135deg, #f1f5f9 0%, #cbd5e1 100%)'
              : 'linear-gradient(135deg, #1e293b 0%, #475569 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            fontSize: '1.5rem'
          }}>
            Activity & Communications
          </Typography>

          <List sx={{ mb: 3 }}>
            {communications.map((comm, index) => (
              <Fade key={comm.id} in={true} timeout={600} style={{ transitionDelay: `${index * 100}ms` }}>
                <ListItem 
                  alignItems="flex-start" 
                  sx={{
                    p: 2.5, 
                    mb: 2.5,
                    borderRadius: '16px',
                    background: comm.type === 'internal_note'
                      ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(124, 58, 237, 0.1) 100%)'
                      : comm.type === 'admin_reply'
                        ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(251, 191, 36, 0.1) 100%)'
                        : isDarkMode 
                          ? 'linear-gradient(135deg, rgba(55, 65, 81, 0.8) 0%, rgba(75, 85, 99, 0.8) 100%)'
                          : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.9) 100%)',
                    border: comm.type === 'internal_note'
                      ? '1px solid rgba(139, 92, 246, 0.3)'
                      : comm.type === 'admin_reply'
                        ? '1px solid rgba(245, 158, 11, 0.3)'
                        : isDarkMode ? '1px solid rgba(75, 85, 99, 0.5)' : '1px solid rgba(226, 232, 240, 0.5)',
                    boxShadow: '0 8px 25px rgba(0, 0, 0, 0.08)',
                    backdropFilter: 'blur(10px)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 12px 35px rgba(0, 0, 0, 0.12)'
                    }
                  }}
                >
                  <Avatar sx={{
                    background: comm.type === 'internal_note'
                      ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)'
                      : comm.type === 'admin_reply'
                        ? 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)'
                        : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    mr: 1.5,
                    width: 48,
                    height: 48,
                    boxShadow: '0 6px 20px rgba(0, 0, 0, 0.15)'
                  }}>
                    {comm.type === 'internal_note' ? <NoteAddIcon /> : <ReplyIcon />}
                  </Avatar>
                  <ListItemText
                    primaryTypographyProps={{
                      fontWeight: 700, 
                      color: isDarkMode ? '#f3f4f6' : '#1f2937',
                      fontSize: '1rem'
                    }}
                    primary={`${formatNameFromEmail(comm.user_details?.email)} ${comm.type === 'internal_note'
                      ? '(Internal Note)'
                      : comm.type === 'admin_reply'
                        ? '(Admin Reply)'
                        : '(Customer Reply)'}`}
                    secondaryTypographyProps={{component: 'div'}}
                    secondary={
                      <>
                        <Typography variant="caption" display="block" gutterBottom sx={{ 
                          color: isDarkMode ? '#9ca3af' : '#6b7280',
                          fontWeight: 600,
                          fontSize: '0.8rem',
                          mb: 0.75
                        }}>
                          {new Date(comm.created_at).toLocaleString()}
                        </Typography>
                        <Typography variant="body1" sx={{
                          whiteSpace: 'pre-wrap', 
                          mt: 0.75, 
                          color: isDarkMode ? '#d1d5db' : '#4b5563',
                          lineHeight: 1.5,
                          fontSize: '0.875rem'
                        }}>
                          {comm.message}
                        </Typography>
                      </>
                    }
                  />
                  {/* Attachments for this comment */}
                  {commentAttachmentMap[comm.id] && commentAttachmentMap[comm.id].length > 0 && (
                    <Box sx={{ mt: 1, ml: 7 }}>
                      <Typography variant="caption" sx={{ fontWeight: 600, color: isDarkMode ? '#a5b4fc' : '#6366f1', mb: 0.5 }}>
                        Attachments:
                      </Typography>
                      <List dense>
                        {commentAttachmentMap[comm.id].map((file) => (
                          <ListItem key={file.name} sx={{ pl: 0 }}>
                            <InsertDriveFileIcon sx={{ color: isDarkMode ? '#a5b4fc' : '#6366f1', mr: 1 }} />
                            <ListItemText
                              primary={<a
                                href={supabase.storage.from('ticket-attachments').getPublicUrl(`${ticket.id}/comment-attachments/${comm.id}/${file.name}`).data.publicUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: isDarkMode ? '#a5b4fc' : '#2563eb', fontWeight: 600, textDecoration: 'underline' }}
                              >
                                {file.name}
                              </a>}
                              secondary={`${(file.metadata?.size ? file.metadata.size : file.size || 0) / 1024 < 1024
                                ? `${((file.metadata?.size ? file.metadata.size : file.size || 0) / 1024).toFixed(1)} KB`
                                : `${((file.metadata?.size ? file.metadata.size : file.size || 0) / 1024 / 1024).toFixed(2)} MB`
                              }`}
                              sx={{ ml: 1 }}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  )}
                </ListItem>
              </Fade>
            ))}
            {communications.length === 0 && (
              <Paper 
                sx={{ 
                  p: 3, 
                  borderRadius: '16px', 
                  textAlign: 'center',
                  background: isDarkMode 
                    ? 'linear-gradient(135deg, rgba(55, 65, 81, 0.8) 0%, rgba(75, 85, 99, 0.8) 100%)'
                    : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.9) 100%)',
                  border: isDarkMode ? '1px solid rgba(75, 85, 99, 0.5)' : '1px solid rgba(226, 232, 240, 0.5)',
                  backdropFilter: 'blur(10px)'
                }}
              >
                <Typography sx={{ color: isDarkMode ? '#9ca3af' : '#6b7280', fontSize: '1rem' }}>
                  No activity yet - be the first to add a comment!
                </Typography>
              </Paper>
            )}
          </List>

          {/* Communication Forms */}
          <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {/* Admin Internal Note Form */}
            {isAdmin && (
              <Card sx={{ 
                borderRadius: '16px',
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(124, 58, 237, 0.1) 100%)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 8px 25px rgba(139, 92, 246, 0.15)'
              }}>
                <CardHeader 
                  title={
                    <Typography variant="h6" sx={{ 
                      fontWeight: 700, 
                      color: isDarkMode ? '#c4b5fd' : '#6d28d9',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      fontSize: '1rem'
                    }}>
                      <NoteAddIcon />
                      Add Internal Note
                    </Typography>
                  }
                />
                <CardContent>
                  <TextField
                    label="Internal Note"
                    multiline
                    rows={3}
                    value={internalNote}
                    onChange={(e) => setInternalNote(e.target.value)}
                    variant="outlined"
                    fullWidth
                    sx={{ 
                      mb: 2.5,
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '10px',
                        background: isDarkMode ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.9)',
                        backdropFilter: 'blur(10px)',
                        '& fieldset': { borderColor: 'rgba(139, 92, 246, 0.3)' },
                        '&:hover fieldset': { borderColor: 'rgba(139, 92, 246, 0.5)' },
                        '&.Mui-focused fieldset': { borderColor: '#8b5cf6', borderWidth: '2px' },
                      },
                      '& .MuiInputLabel-root': { color: isDarkMode ? '#c4b5fd' : '#6d28d9' }
                    }}
                    disabled={isSubmitting}
                  />
                  <Button
                    variant="contained"
                    onClick={() => handleSubmitCommunication(internalNote, 'internal_note')}
                    sx={{ 
                      borderRadius: '10px',
                      fontWeight: 700,
                      background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                      boxShadow: '0 6px 20px rgba(139, 92, 246, 0.3)',
                      px: 3.5,
                      py: 1.25,
                      fontSize: '0.875rem',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                        transform: 'translateY(-2px)',
                        boxShadow: '0 8px 25px rgba(139, 92, 246, 0.4)'
                      },
                      '&:disabled': {
                        background: isDarkMode ? '#4b5563' : '#e5e7eb',
                        color: isDarkMode ? '#9ca3af' : '#9ca3af'
                      }
                    }}
                    disabled={isSubmitting || !internalNote.trim()}
                  >
                    {isSubmitting && internalNote ? (
                      <CircularProgress size={20} sx={{ color: 'white', mr: 1 }} />
                    ) : null}
                    {isSubmitting && internalNote ? 'Saving...' : 'Save Internal Note'}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Reply/Comment Form */}
            <Card sx={{ 
              borderRadius: '16px',
              background: isAdmin 
                ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(251, 191, 36, 0.1) 100%)'
                : isDarkMode 
                  ? 'linear-gradient(135deg, rgba(55, 65, 81, 0.8) 0%, rgba(75, 85, 99, 0.8) 100%)'
                  : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.9) 100%)',
              border: isAdmin 
                ? '1px solid rgba(245, 158, 11, 0.3)'
                : isDarkMode ? '1px solid rgba(75, 85, 99, 0.5)' : '1px solid rgba(226, 232, 240, 0.5)',
              backdropFilter: 'blur(10px)',
              boxShadow: isAdmin 
                ? '0 8px 25px rgba(245, 158, 11, 0.15)'
                : '0 8px 25px rgba(0, 0, 0, 0.08)'
            }}>
              <CardHeader 
                title={
                  <Typography variant="h6" sx={{ 
                    fontWeight: 700, 
                    color: isAdmin 
                      ? (isDarkMode ? '#fbbf24' : '#92400e')
                      : (isDarkMode ? '#f3f4f6' : '#1f2937'),
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    fontSize: '1rem'
                  }}>
                    <ReplyIcon />
                    {isAdmin ? 'Admin Reply' : 'Add Comment'}
                  </Typography>
                }
              />
              <CardContent>
                <TextField
                  label={isAdmin ? 'Admin Reply' : 'Your Comment'}
                  multiline
                  rows={3}
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  variant="outlined"
                  fullWidth
                  sx={{ 
                    mb: 2.5,
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '10px',
                      background: isDarkMode ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.9)',
                      backdropFilter: 'blur(10px)',
                      '& fieldset': { 
                        borderColor: isAdmin 
                          ? 'rgba(245, 158, 11, 0.3)'
                          : isDarkMode ? 'rgba(75, 85, 99, 0.5)' : 'rgba(226, 232, 240, 0.5)'
                      },
                      '&:hover fieldset': { 
                        borderColor: isAdmin 
                          ? 'rgba(245, 158, 11, 0.5)'
                          : '#6366f1'
                      },
                      '&.Mui-focused fieldset': { 
                        borderColor: isAdmin ? '#f59e0b' : '#6366f1', 
                        borderWidth: '2px' 
                      },
                    },
                    '& .MuiInputLabel-root': { 
                      color: isAdmin 
                        ? (isDarkMode ? '#fbbf24' : '#92400e')
                        : (isDarkMode ? '#d1d5db' : '#6b7280')
                    }
                  }}
                  disabled={isSubmitting}
                />
                {/* Attachments for User/Admin Reply */}
                {isAdmin ? (
                  <Box sx={{ mt: 2, mb: 2 }}>
                    <input
                      id="admin-reply-attachment-input"
                      type="file"
                      multiple
                      onChange={e => handleReplyAttachmentChange(e, true)}
                      style={{ display: 'none' }}
                    />
                    <label htmlFor="admin-reply-attachment-input">
                      <Button
                        variant="contained"
                        component="span"
                        sx={{
                          borderRadius: '10px',
                          fontWeight: 600,
                          background: 'linear-gradient(135deg, #f59e0b 0%, #eab308 100%)',
                          color: 'white',
                          boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
                          mr: 2,
                          mb: 2
                        }}
                        disabled={uploadingAdminReply}
                      >
                        Choose Files
                      </Button>
                    </label>
                    {adminReplyAttachments.length > 0 && (
                      <Typography variant="body2" sx={{ display: 'inline', ml: 1 }}>
                        {adminReplyAttachments.length} file(s) selected
                      </Typography>
                    )}
                    {uploadingAdminReply && <LinearProgress sx={{ mt: 1, mb: 1 }} />}
                  </Box>
                ) : (
                  <Box sx={{ mt: 2, mb: 2 }}>
                    <input
                      id="user-reply-attachment-input"
                      type="file"
                      multiple
                      onChange={e => handleReplyAttachmentChange(e, false)}
                      style={{ display: 'none' }}
                    />
                    <label htmlFor="user-reply-attachment-input">
                      <Button
                        variant="contained"
                        component="span"
                        sx={{
                          borderRadius: '10px',
                          fontWeight: 600,
                          background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                          color: 'white',
                          boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                          mr: 2,
                          mb: 2
                        }}
                        disabled={uploadingReply}
                      >
                        Choose Files
                      </Button>
                    </label>
                    {replyAttachments.length > 0 && (
                      <Typography variant="body2" sx={{ display: 'inline', ml: 1 }}>
                        {replyAttachments.length} file(s) selected
                      </Typography>
                    )}
                    {uploadingReply && <LinearProgress sx={{ mt: 1, mb: 1 }} />}
                  </Box>
                )}
                <Button
                  variant="contained"
                  onClick={() => handleSubmitCommunication(replyMessage, isAdmin ? 'admin_reply' : 'customer_reply')}
                  sx={{ 
                    borderRadius: '10px',
                    fontWeight: 700,
                    background: isAdmin 
                      ? 'linear-gradient(135deg, #f59e0b 0%, #eab308 100%)'
                      : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    boxShadow: isAdmin 
                      ? '0 6px 20px rgba(245, 158, 11, 0.3)'
                      : '0 6px 20px rgba(59, 130, 246, 0.3)',
                    px: 3.5,
                    py: 1.25,
                    fontSize: '0.875rem',
                    '&:hover': {
                      background: isAdmin 
                        ? 'linear-gradient(135deg, #eab308 0%, #d97706 100%)'
                        : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                      transform: 'translateY(-2px)',
                      boxShadow: isAdmin 
                        ? '0 8px 25px rgba(245, 158, 11, 0.4)'
                        : '0 8px 25px rgba(59, 130, 246, 0.4)'
                    },
                    '&:disabled': {
                      background: isDarkMode ? '#4b5563' : '#e5e7eb',
                      color: isDarkMode ? '#9ca3af' : '#9ca3af'
                    }
                  }}
                  disabled={isSubmitting || !replyMessage.trim()}
                >
                  {isSubmitting && replyMessage ? (
                    <CircularProgress size={20} sx={{ color: 'white', mr: 1 }} />
                  ) : null}
                  {isSubmitting && replyMessage 
                    ? 'Sending...'
                    : (isAdmin ? 'Send Admin Reply' : 'Send Comment')}
                </Button>
              </CardContent>
            </Card>
          </Box>
        </Paper>
      </Fade>

      {/* Enhanced Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setSnackbarOpen(false)} 
          severity={snackbarSeverity} 
          sx={{ 
            width: '100%', 
            borderRadius: '12px',
            boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)',
            backdropFilter: 'blur(10px)',
            fontWeight: 600
          }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default TicketDetailPage;

 
 