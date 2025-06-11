import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { Box, Typography, Grid, Card, CardContent, CircularProgress } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useAuth } from '../contexts/AuthContext';
import { useTicketAssigneeRole } from '../utils/useTicketAssigneeRole';
import TicketList from '../features/ticketing/components/TicketList';

export default function ExpenseDashboard() {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const { user } = useAuth();
  const { role, loading: roleLoading } = useTicketAssigneeRole(user?.id);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  // Define status order for expense tickets (include approval step)
  const statusOrder = ['WAITING FOR APPROVAL', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

  // Handlers to update ticket status and assignee
  const handleUpdateTicketStatus = async (ticketId, newStatus) => {
    const { error } = await supabase.from('tickets').update({ status: newStatus }).eq('id', ticketId);
    if (error) return alert(error.message);
    fetchTickets();
  };
  const handleUpdateTicketAssignee = async (ticketId, newAssignee) => {
    const { error } = await supabase.from('tickets').update({ assignee: newAssignee }).eq('id', ticketId);
    if (error) return alert(error.message);
    fetchTickets();
  };

  const fetchTickets = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('tickets')
      .select(`
        *,
        category:categories(name),
        sub_category:sub_categories(name)
      `)
      .eq('categories.name', 'Expense Management');
    if (data) setTickets(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  // Filter tickets by role using approval_phase values from the tickets table
  let visible = tickets;
  if (!roleLoading && role && role !== 'accounts_admin') {
    if (role === 'reporting_manager') {
      visible = tickets.filter(t => t.approval_phase === 'manager');
    } else if (role === 'accounts_manager') {
      visible = tickets.filter(t => t.approval_phase === 'account_manager');
    } else if (role === 'cfo') {
      visible = tickets.filter(t => t.approval_phase === 'cfo');
    }
  }

  const counts = {
    pendingManager: visible.filter(t => t.approval_phase === 'manager').length,
    pendingAccount: visible.filter(t => t.approval_phase === 'account_manager').length,
    pendingCfo: visible.filter(t => t.approval_phase === 'cfo').length,
    resolved: visible.filter(t => t.status === 'RESOLVED').length,
    closed: visible.filter(t => t.status === 'CLOSED').length
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ color: isDarkMode ? '#f3f4f6' : '#1e2937' }}>
        Expense Management Dashboard
      </Typography>
      {(loading || roleLoading) ? (
        <CircularProgress />
      ) : (
        <>
        <Grid container spacing={2}>
          {[
            { label: 'Pending Manager', value: counts.pendingManager },
            { label: 'Pending Accounts', value: counts.pendingAccount },
            { label: 'Pending CFO', value: counts.pendingCfo },
            { label: 'Resolved', value: counts.resolved },
            { label: 'Closed', value: counts.closed }
          ].map(metric => (
            <Grid item xs={12} sm={6} md={4} key={metric.label}>
              <Card sx={{ background: isDarkMode ? 'rgba(30, 41, 59, 0.8)' : 'white' }}>
                <CardContent>
                  <Typography variant="subtitle1" sx={{ color: isDarkMode ? '#94a3b8' : '#64748b' }}>
                    {metric.label}
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: isDarkMode ? '#f3f4f6' : '#1e2937' }}>
                    {metric.value}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
        {/* Ticket list view for expense tickets */}
        <Box sx={{ mt: 4 }}>
          <TicketList
            tickets={visible}
            statusOrder={statusOrder}
            handleUpdateTicketStatus={handleUpdateTicketStatus}
            handleUpdateTicketAssignee={handleUpdateTicketAssignee}
            currentUserRole={role}
          />
        </Box>
        </>
      )}
    </Box>
  );
} 