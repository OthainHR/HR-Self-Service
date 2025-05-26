import React, { useState, useEffect } from 'react';
import { Box, Tabs, Tab, Typography, Button, Fade, Slide, CircularProgress } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTicketAlt, faList, faPlus, faColumns, faThList, faSpinner, faChartLine } from '@fortawesome/free-solid-svg-icons';
import KanbanBoard from './components/KanbanBoard';
import TicketForm from './components/TicketForm';
import TicketList from './components/TicketList';
import './styles/ticketing.css';
import { useTheme } from '@mui/material/styles';
import { supabase } from '../../services/supabase';

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`ticketing-tabpanel-${index}`}
      aria-labelledby={`ticketing-tab-${index}`}
      {...other}
      style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
    >
      {value === index && (
        <Fade in={true} timeout={600}>
          <Box sx={{ flex: 1, overflow: 'auto', p: 0 }}>
            {children}
          </Box>
        </Fade>
      )}
    </div>
  );
}

const statusOrder = ['WAITING FOR SUPPORT', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

export default function TicketingPage() {
  const [tabValue, setTabValue] = useState(0);
  const [viewMode, setViewMode] = useState('kanban');
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const [currentUserRole, setCurrentUserRole] = useState(null);
  const [allTickets, setAllTickets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUserRoleAndTickets = async () => {
      setIsLoading(true);
      setError(null);
      console.log('[TicketingPage] Fetching user session...');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      let role = null;
      if (sessionError) {
        console.error('[TicketingPage] Error fetching session:', sessionError);
      }
      if (session) {
        console.log('[TicketingPage] Session found:', session);
        console.log('[TicketingPage] User metadata:', session.user?.user_metadata);
        // Determine role from session
        role = session.user?.user_metadata?.role || null;
        const email = session.user?.email?.toLowerCase();
        // Treat the tickets account as admin
        if (email === 'tickets@othainsoft.com') {
          console.log('[TicketingPage] Overriding role to admin for tickets account');
          role = 'admin';
        }
        console.log('[TicketingPage] Role from session:', role, 'email:', email);
        setCurrentUserRole(role);

        // Set default tab based on admin status
        const adminRolesForDefaultView = ['admin', 'it_admin', 'hr_admin', 'payroll_admin'];
        const currentIsAdmin = adminRolesForDefaultView.includes(role);
        setTabValue(currentIsAdmin ? 0 : 1);

        if (adminRolesForDefaultView.includes(role)) {
          setViewMode('list');
        } else {
          setViewMode('kanban');
        }

        let query = supabase.from('v_ticket_board').select('*');
        const { data: ticketData, error: fetchError } = await query.order('created_at', { ascending: false });

        if (fetchError) {
          console.error('Error fetching tickets for list view:', fetchError);
          setError(`Failed to load tickets: ${fetchError.message}`);
          setAllTickets([]);
        } else {
          setAllTickets(ticketData || []);
        }
        setIsLoading(false);
      } else {
        console.log('[TicketingPage] No active session.');
        setCurrentUserRole(null);
        setTabValue(0); // Default to dashboard if no session
      }
    };

    fetchUserRoleAndTickets();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[TicketingPage] Auth state changed:', event);
        let role = null;
        if (session) {
          console.log('[TicketingPage] New session from auth change:', session);
          console.log('[TicketingPage] User metadata from auth change:', session.user?.user_metadata);
          let role = session.user?.user_metadata?.role || null;
          const email = session.user?.email?.toLowerCase();
          if (email === 'tickets@othainsoft.com') {
            console.log('[TicketingPage] Overriding role to admin for tickets account (auth change)');
            role = 'admin';
          }
          console.log('[TicketingPage] Role from auth change:', role, 'email:', email);
          setCurrentUserRole(role);

          // Set default tab based on admin status from auth change
          const adminRolesForDefaultView = ['admin', 'it_admin', 'hr_admin', 'payroll_admin'];
          const authChangeIsAdmin = adminRolesForDefaultView.includes(role);
          setTabValue(authChangeIsAdmin ? 0 : 1);

          if (adminRolesForDefaultView.includes(role)) {
            setViewMode('list');
          } else {
            setViewMode('kanban');
          }
        } else {
          console.log('[TicketingPage] Session ended from auth change.');
          setCurrentUserRole(null);
          setTabValue(0); // Default to dashboard if session ends
        }
      }
    );
    
    const ticketsSubscription = supabase
      .channel('public:tickets:list-view')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, payload => {
        console.log('Ticket change received for list view!', payload);
        const fetchUpdatedTickets = async () => {
          setIsLoading(true);
          let query = supabase.from('v_ticket_board').select('*');
          const { data: ticketData, error: fetchError } = await query.order('created_at', { ascending: false });
          if (fetchError) {
            console.error('Error re-fetching tickets for list view:', fetchError);
            setError(`Failed to reload tickets: ${fetchError.message}`);
          } else {
            setAllTickets(ticketData || []);
          }
          setIsLoading(false);
        };
        fetchUpdatedTickets();
      })
      .subscribe();

    return () => {
      if (authListener && typeof authListener.subscription?.unsubscribe === 'function') {
        console.log('[TicketingPage] Unsubscribing auth listener.');
        authListener.subscription.unsubscribe();
      }
      console.log('[TicketingPage] Unsubscribing tickets list-view listener.');
      supabase.removeChannel(ticketsSubscription);
    };
  }, []);

  const handleChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const adminRoles = ['admin', 'it_admin', 'hr_admin', 'payroll_admin'];
  const isAdminUser = adminRoles.includes(currentUserRole);
  console.log('[TicketingPage] currentUserRole:', currentUserRole, 'isAdminUser:', isAdminUser);

  const handleToggleViewMode = () => {
    setViewMode((prevMode) => (prevMode === 'kanban' ? 'list' : 'kanban'));
  };

  const handleUpdateTicketStatus = async (ticketId, newStatus) => {
    setAllTickets(prevTickets => 
      prevTickets.map(ticket => 
        ticket.id === ticketId ? { ...ticket, status: newStatus } : ticket
      )
    );

    try {
      const { error: updateError } = await supabase
        .from('tickets')
        .update({ status: newStatus })
        .eq('id', ticketId);

      if (updateError) {
        console.error('Error updating ticket status from list view:', updateError);
        setError(`Failed to update ticket: ${updateError.message}`);
        const { data: ticketData, error: fetchError } = await supabase.from('v_ticket_board').select('*').order('created_at', { ascending: false });
        if (fetchError) {
          console.error('Error re-fetching tickets after update failure:', fetchError);
        } else {
          setAllTickets(ticketData || []);
        }
      } else {
        console.log(`Ticket ${ticketId} status updated to ${newStatus} from list view`);
      }
    } catch (err) {
      console.error('Unexpected error updating ticket status from list view:', err);
      setError('An unexpected error occurred while updating the ticket.');
      const { data: ticketData, error: fetchError } = await supabase.from('v_ticket_board').select('*').order('created_at', { ascending: false });
      if (fetchError) {
        console.error('Error re-fetching tickets after unexpected error:', fetchError);
      } else {
        setAllTickets(ticketData || []);
      }
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: isDarkMode 
        ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)'
        : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
      position: 'relative'
    }}>
      {/* Background decoration */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: isDarkMode 
          ? 'radial-gradient(circle at 20% 80%, rgba(59, 130, 246, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(139, 92, 246, 0.1) 0%, transparent 50%)'
          : 'radial-gradient(circle at 20% 80%, rgba(99, 102, 241, 0.05) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(139, 92, 246, 0.05) 0%, transparent 50%)',
        zIndex: -1,
        pointerEvents: 'none'
      }} />

      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        minHeight: '100vh',
        position: 'relative',
        zIndex: 1
      }}>
        {/* Modern Header */}
        <Slide direction="down" in={true} timeout={800}>
          <div style={{
            background: isDarkMode 
              ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(51, 65, 85, 0.95) 100%)'
              : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%)',
            backdropFilter: 'blur(20px)',
            borderBottom: isDarkMode ? '1px solid rgba(55, 65, 81, 0.5)' : '1px solid rgba(226, 232, 240, 0.5)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
            padding: '1rem 1.5rem',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Header background decoration */}
            <div style={{
              position: 'absolute',
              top: '-50%',
              right: '-10%',
              width: '150px',
              height: '150px',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              borderRadius: '50%',
              opacity: 0.05,
              filter: 'blur(30px)'
            }} />

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              position: 'relative',
              zIndex: 1
            }}>
              {/* Modern Title */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}>
                <div style={{
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  borderRadius: '12px',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 6px 20px rgba(99, 102, 241, 0.3)',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  {/* Icon shine effect */}
                  <div style={{
                    position: 'absolute',
                    top: '-50%',
                    left: '-50%',
                    width: '200%',
                    height: '200%',
                    background: 'linear-gradient(45deg, transparent, rgba(255,255,255,0.1), transparent)',
                    transform: 'rotate(45deg)',
                    animation: 'shine 3s ease-in-out infinite'
                  }} />
                  <FontAwesomeIcon 
                    icon={faTicketAlt} 
                    style={{ 
                      color: 'white', 
                      fontSize: '1.125rem',
                      position: 'relative',
                      zIndex: 1
                    }} 
                  />
                </div>
                <div>
                  <Typography 
                    variant="h4" 
                    component="h1" 
                    sx={{ 
                      fontWeight: 800,
                      fontSize: '1.375rem',
                      margin: 0,
                      ...(isDarkMode 
                        ? { color: 'white' }
                        : {
                            background: 'linear-gradient(135deg, #1e293b 0%, #475569 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text'
                          }
                      )
                    }}
                  >
                    Othain Ticketing System
                  </Typography>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: isDarkMode ? '#94a3b8' : '#64748b',
                      fontWeight: 500,
                      marginTop: '0.125rem',
                      fontSize: '0.8rem'
                    }}
                  >
                    Enterprise Support Management
                  </Typography>
                </div>
              </div>

              {/* Modern Toggle Button */}
              <button
                onClick={handleToggleViewMode}
                style={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '0.625rem 1.25rem',
                  color: 'white',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: '0 6px 20px rgba(59, 130, 246, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-2px) scale(1.02)';
                  e.target.style.boxShadow = '0 8px 25px rgba(59, 130, 246, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0) scale(1)';
                  e.target.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.3)';
                }}
              >
                <FontAwesomeIcon icon={viewMode === 'kanban' ? faThList : faColumns} />
                {viewMode === 'kanban' ? 'List View' : 'Kanban View'}
              </button>
            </div>
          </div>
        </Slide>

        {/* Modern Tab Navigation */}
        <Fade in={true} timeout={1000}>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            padding: '1.5rem 1.5rem 0 1.5rem'
          }}>
            <div style={{
              background: isDarkMode 
                ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(51, 65, 85, 0.8) 100%)'
                : 'linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(248, 250, 252, 0.8) 100%)',
              backdropFilter: 'blur(20px)',
              borderRadius: '16px',
              padding: '0.375rem',
              border: isDarkMode ? '1px solid rgba(55, 65, 81, 0.5)' : '1px solid rgba(226, 232, 240, 0.5)',
              boxShadow: '0 6px 20px rgba(0, 0, 0, 0.06)',
              position: 'relative'
            }}>
              <Tabs 
                value={tabValue} 
                onChange={handleChange} 
                aria-label="ticketing tabs"
                sx={{
                  minHeight: 'auto',
                  '& .MuiTabs-indicator': {
                    display: 'none' // Hide default indicator
                  },
                  '& .MuiTab-root': { 
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    textTransform: 'none',
                    padding: '0.625rem 1.25rem',
                    minHeight: 'auto',
                    borderRadius: '12px',
                    margin: '0.125rem',
                    color: isDarkMode ? '#94a3b8' : '#64748b',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    position: 'relative',
                    zIndex: 1,
                    '&.Mui-selected': {
                      background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                      color: 'white',
                      boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)',
                      transform: 'translateY(-1px)'
                    },
                    '&:hover:not(.Mui-selected)': {
                      background: isDarkMode 
                        ? 'rgba(55, 65, 81, 0.8)'
                        : 'rgba(241, 245, 249, 0.8)',
                      transform: 'translateY(-1px)'
                    },
                    '&.Mui-disabled': {
                      color: isDarkMode ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.26)',
                      cursor: 'not-allowed',
                      opacity: 0.5
                    }
                  }
                }}
              >
                <Tab 
                  icon={<FontAwesomeIcon icon={faChartLine} style={{ fontSize: '0.875rem' }} />} 
                  iconPosition="start" 
                  label="Ticket Dashboard" 
                  id="ticketing-tab-0" 
                  aria-controls="ticketing-tabpanel-0" 
                />
                <Tab 
                  icon={<FontAwesomeIcon icon={faPlus} style={{ fontSize: '0.875rem' }} />} 
                  iconPosition="start" 
                  label={isAdminUser ? "Create Ticket for User" : "Create New Ticket"} 
                  id="ticketing-tab-1" 
                  aria-controls="ticketing-tabpanel-1" 
                />
              </Tabs>
            </div>
          </div>
        </Fade>

        {/* Content Area */}
        <Box sx={{ flex: 1, padding: '1.5rem', position: 'relative', overflow: 'visible' }}>
          <TabPanel value={tabValue} index={0}>
            {isLoading ? (
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column',
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '50vh',
                background: isDarkMode 
                  ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(51, 65, 85, 0.8) 100%)'
                  : 'linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(248, 250, 252, 0.8) 100%)',
                backdropFilter: 'blur(20px)',
                borderRadius: '20px',
                border: isDarkMode ? '1px solid rgba(55, 65, 81, 0.5)' : '1px solid rgba(226, 232, 240, 0.5)',
                boxShadow: '0 15px 40px rgba(0, 0, 0, 0.08)',
                position: 'relative',
                overflow: 'hidden'
              }}>
                {/* Loading background decoration */}
                <div style={{
                  position: 'absolute',
                  top: '-50%',
                  right: '-20%',
                  width: '200px',
                  height: '200px',
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  borderRadius: '50%',
                  opacity: 0.05,
                  filter: 'blur(30px)'
                }} />
                
                <div style={{
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  borderRadius: '50%',
                  width: '60px',
                  height: '60px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1rem',
                  boxShadow: '0 6px 20px rgba(99, 102, 241, 0.3)',
                  animation: 'pulse 2s infinite',
                  position: 'relative',
                  zIndex: 1
                }}>
                  <FontAwesomeIcon icon={faSpinner} spin size="lg" style={{ color: 'white' }} />
                </div>
                
                <Typography variant="h5" sx={{ 
                  fontWeight: 700, 
                  color: isDarkMode ? '#f1f5f9' : '#1e293b',
                  marginBottom: '0.5rem',
                  position: 'relative',
                  zIndex: 1,
                  fontSize: '1.25rem'
                }}>
                  Loading Dashboard
                </Typography>
                <Typography variant="body1" sx={{ 
                  color: isDarkMode ? '#94a3b8' : '#64748b',
                  textAlign: 'center',
                  position: 'relative',
                  zIndex: 1,
                  fontSize: '0.875rem'
                }}>
                  Please wait while we prepare your tickets...
                </Typography>
              </Box>
            ) : error ? (
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column',
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '50vh',
                background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
                backdropFilter: 'blur(20px)',
                borderRadius: '20px',
                border: '1px solid #fca5a5',
                boxShadow: '0 15px 40px rgba(220, 38, 38, 0.15)',
                padding: '1.5rem'
              }}>
                <div style={{
                  background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
                  borderRadius: '50%',
                  width: '60px',
                  height: '60px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1rem',
                  boxShadow: '0 6px 20px rgba(220, 38, 38, 0.3)'
                }}>
                  <FontAwesomeIcon icon={faTicketAlt} size="lg" style={{ color: 'white' }} />
                </div>
                <Typography variant="h5" sx={{ 
                  fontWeight: 700, 
                  color: '#7f1d1d',
                  marginBottom: '0.5rem',
                  fontSize: '1.25rem'
                }}>
                  Error Loading Dashboard
                </Typography>
                <Typography variant="body1" sx={{ 
                  color: '#991b1b',
                  textAlign: 'center',
                  fontSize: '0.875rem'
                }}>
                  {error}
                </Typography>
              </Box>
            ) : viewMode === 'kanban' ? (
              <KanbanBoard />
            ) : (
              <TicketList tickets={allTickets} statusOrder={statusOrder} handleUpdateTicketStatus={handleUpdateTicketStatus} currentUserRole={currentUserRole} />
            )}
          </TabPanel>
          
          <TabPanel value={tabValue} index={1}>
            <TicketForm />
          </TabPanel>
        </Box>
      </Box>

      {/* Add custom animations */}
      <style jsx>{`
        @keyframes shine {
          0%, 100% {
            transform: translateX(-100%) translateY(-100%) rotate(45deg);
          }
          50% {
            transform: translateX(100%) translateY(100%) rotate(45deg);
          }
        }
        
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }
      `}</style>
    </div>
  );
} 