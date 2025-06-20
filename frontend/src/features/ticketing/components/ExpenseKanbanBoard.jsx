import React, { useEffect, useState } from 'react';
import { supabase } from '../../../services/supabase';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faSearch, faFilter, faSync, faTicketAlt, 
  faInfoCircle, faExclamationTriangle, faCheck, 
  faUserClock, faArrowRight, faTimesCircle, faSpinner,
  faHeadset, faExternalLinkAlt, faClock, faCalendarAlt,
  faUser, faBuilding, faLaptopCode, faUserTie, 
  faFileInvoiceDollar, faTools, faMoneyCheckAlt,
  faRobot
} from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';
import { 
  Select, MenuItem, FormControl, InputLabel, Chip, 
  Box, Typography, useTheme, Fade, Slide
} from '@mui/material';
import AdminCommentModal from './AdminCommentModal';
import { createTicketNumberMap, generateTicketNumber } from '../../../utils/ticketUtils';

const statusOrder = ['WAITING FOR APPROVAL 1', 'WAITING FOR APPROVAL 2', 'WAITING FOR APPROVAL 3', 'APPROVED', 'REJECTED'];

const getStatusIcon = (status) => {
  switch(status) {
    case 'WAITING FOR APPROVAL 1': return faHeadset;
    case 'WAITING FOR APPROVAL 2': return faArrowRight;
    case 'WAITING FOR APPROVAL 3': return faCheck;
    case 'APPROVED': return faTimesCircle;
    case 'REJECTED': return faTimesCircle;
    default: return faTicketAlt;
  }
};

const getPriorityIcon = (priority) => {
  switch(priority) {
    case 'Urgent': return faExclamationTriangle;
    case 'High': return faExclamationTriangle;
    case 'Medium': return faInfoCircle;
    case 'Low': return faInfoCircle;
    default: return faInfoCircle;
  }
};

const getStatusColors = (status) => {
  switch(status) {
    case 'WAITING FOR APPROVAL 1': return {
      gradient: 'linear-gradient(135deg, #6b7280 0%, #9ca3af 100%)',
      shadow: 'rgba(227, 228, 230, 0.3)',
      text: 'white'
    };
    case 'WAITING FOR APPROVAL 2': return {
      gradient: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)',
      shadow: 'rgba(234, 88, 12, 0.3)',
      text: 'white'
    };
    case 'WAITING FOR APPROVAL 3': return {
      gradient: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
      shadow: 'rgba(12, 27, 234, 0.3)',
      text: 'white'
    };
    case 'APPROVED': return {
      gradient: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
      shadow: 'rgba(107, 128, 113, 0.3)',
      text: 'white'
    };
    case 'REJECTED': return {
      gradient: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
      shadow: 'rgba(220, 38, 38, 0.3)',
      text: 'white'
    };
    default: return {
      gradient: 'linear-gradient(135deg, #6b7280 0%, #9ca3af 100%)',
      shadow: 'rgba(107, 114, 128, 0.3)',
      text: 'white'
    };
  }
};

const getPriorityColors = (priority) => {
  switch(priority?.toLowerCase()) {
    case 'urgent': return {
      gradient: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
      shadow: 'rgba(220, 38, 38, 0.3)',
      text: 'white'
    };
    case 'high': return {
      gradient: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)',
      shadow: 'rgba(234, 88, 12, 0.3)',
      text: 'white'
    };
    case 'medium': return {
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
      shadow: 'rgba(245, 158, 11, 0.3)',
      text: '#1f2937'
    };
    case 'low': return {
      gradient: 'linear-gradient(135deg, #9333ea 0%, #a855f7 100%)',
      shadow: 'rgba(147, 51, 234, 0.3)',
      text: 'white'
    };
    default: return {
      gradient: 'linear-gradient(135deg, #6b7280 0%, #9ca3af 100%)',
      shadow: 'rgba(107, 114, 128, 0.3)',
      text: 'white'
    };
  }
};

const getCategoryIcon = (categoryName) => {
  if (!categoryName) return faTicketAlt;
  const name = categoryName.toLowerCase();
  if (name.includes('it')) return faLaptopCode;
  if (name.includes('hr')) return faUserTie;
  if (name.includes('expense')) return faFileInvoiceDollar;
  if (name.includes('operations')) return faTools;
  if (name.includes('payroll')) return faMoneyCheckAlt;
  if (name.includes('ai')) return faRobot;
  return faTicketAlt;
};

const formatNameFromEmail = (email) => {
  if (!email) return 'Unknown User';
  if (email.toLowerCase() === 'hr@othainsoft.com') return 'HR Admin';
  if (email.toLowerCase() === 'it@othainsoft.com') return 'IT Admin';
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

// Add approval workflow logic
const getApprovalWorkflow = (currentStatus, userEmail) => {
  const workflows = {
    'WAITING FOR APPROVAL 1': {
      approver: 'accounts@othainsoft.com',
      nextStatus: 'WAITING FOR APPROVAL 2'
    },
    'WAITING FOR APPROVAL': {
      approver: 'accounts@othainsoft.com',
      nextStatus: 'WAITING FOR APPROVAL 2'
    },
    'WAITING FOR APPROVAL 2': {
      approver: 'praveen.omprakash@othainsoft.com',
      nextStatus: 'WAITING FOR APPROVAL 3'
    },
    'WAITING FOR APPROVAL 3': {
      approver: 'ps@jerseytechpartners.com',
      nextStatus: 'APPROVED'
    }
  };

  const workflow = workflows[currentStatus];
  if (!workflow) return { canApprove: false, canReject: false, nextStatus: null };

  const canApprove = workflow.approver === userEmail;
  const canReject = workflow.approver === userEmail;

  return {
    canApprove,
    canReject,
    nextStatus: workflow.nextStatus
  };
};

const KanbanColumn = ({ tickets, status, currentUserRole, statusOrder, handleAdminStatusChange, handleUpdateTicketAssignee, assignOptions, allTickets, userEmail }) => {
  const icon = getStatusIcon(status);
  const navigate = useNavigate();
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const statusColors = getStatusColors(status);
  
  // Create ticket number mapping for proper sequential numbering
  const ticketNumberMap = React.useMemo(() => {
    if (!allTickets || allTickets.length === 0) return {};
    return createTicketNumberMap(allTickets);
  }, [allTickets]);
  
  const handleTicketClick = (ticketId, e) => {
    if (
      e.target.closest('select') || 
      e.target.closest('button')
    ) {
      return;
    }
    navigate(`/ticket/${ticketId}`);
  };

  // Dynamic assignee placeholder based on role
  const assigneeLabelMap = {
    it_admin: 'IT Admin',
    hr_admin: 'HR Admin',
    payroll_admin: 'Accounts Admin',
    operations_admin: 'Operations Admin',
    ai_admin: 'AI Admin'
  };
  const assigneeLabel = assigneeLabelMap[currentUserRole] || 'Assignee';

  return (
    <Fade in={true} timeout={800}>
      <div style={{
        background: isDarkMode 
          ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(51, 65, 85, 0.95) 100%)'
          : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%)',
        backdropFilter: 'blur(20px)',
        borderRadius: '16px',
        padding: '1rem',
        border: isDarkMode ? '1px solid rgba(55, 65, 81, 0.5)' : '1px solid rgba(226, 232, 240, 0.5)',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.08)',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        height: 'auto'
      }}>
        {/* Background decoration */}
        <div style={{
          position: 'absolute',
          top: '-50%',
          right: '-20%',
          width: '160px',
          height: '160px',
          background: statusColors.gradient,
          borderRadius: '50%',
          opacity: 0.05,
          filter: 'blur(30px)'
        }} />

        {/* Column Header */}
        <div style={{
          background: statusColors.gradient,
          borderRadius: '12px',
          padding: '0.75rem 1rem',
          marginBottom: '1rem',
          boxShadow: `0 6px 20px ${statusColors.shadow}`,
          color: statusColors.text,
          position: 'relative',
          zIndex: 1
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <div style={{
                background: 'rgba(255, 255, 255, 0.15)',
                borderRadius: '8px',
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.2)'
              }}>
                <FontAwesomeIcon icon={icon} style={{ fontSize: '0.875rem' }} />
              </div>
              <div>
                <h3 style={{
                  margin: 0,
                  fontSize: '0.875rem',
                  fontWeight: '700',
                  textShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}>
                  {status.replace('_', ' ').replace('WAITING FOR SUPPORT', 'Waiting for Support')}
                </h3>
              </div>
            </div>
            <div style={{
              background: 'rgba(255, 255, 255, 0.15)',
              borderRadius: '8px',
              padding: '0.25rem 0.5rem',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}>
              <span style={{
                fontSize: '0.8rem',
                fontWeight: '700',
                textShadow: '0 1px 2px rgba(0,0,0,0.2)'
              }}>
                {tickets?.length || 0}
              </span>
            </div>
          </div>
        </div>

        {/* Tickets Container */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          position: 'relative',
          zIndex: 1
        }}>
          {tickets && tickets.length > 0 ? (
            tickets.map((ticket, index) => {
              const priorityColors = getPriorityColors(ticket.priority);
              const categoryIcon = getCategoryIcon(ticket.category_name);
              
              return (
                <Slide 
                  key={ticket.id} 
                  direction="up" 
                  in={true} 
                  timeout={600}
                  style={{ transitionDelay: `${index * 100}ms` }}
                >
                  <div
                    onClick={(e) => handleTicketClick(ticket.id, e)}
                    style={{
                      background: isDarkMode 
                        ? 'linear-gradient(135deg, rgba(55, 65, 81, 0.8) 0%, rgba(75, 85, 99, 0.8) 100%)'
                        : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.9) 100%)',
                      backdropFilter: 'blur(10px)',
                      borderRadius: '12px',
                      padding: '1rem',
                      border: isDarkMode ? '1px solid rgba(75, 85, 99, 0.5)' : '1px solid rgba(226, 232, 240, 0.5)',
                      boxShadow: '0 6px 20px rgba(0, 0, 0, 0.06)',
                      cursor: 'pointer',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-3px) scale(1.01)';
                      e.currentTarget.style.boxShadow = '0 12px 30px rgba(0, 0, 0, 0.12)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0) scale(1)';
                      e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.06)';
                    }}
                    title={`Priority: ${ticket.priority}\nCategory: ${ticket.category_name}\nSub-Category: ${ticket.sub_category_name}\nClient: ${ticket.client || 'N/A'}\nRequester: ${ticket.requester_email || 'N/A'}\nAssignee: ${ticket.assignee_email || 'N/A'}`}
                  >
                    {/* Priority indicator */}
                    <div style={{
                      position: 'absolute',
                      top: '0.75rem',
                      right: '0.75rem',
                      background: priorityColors.gradient,
                      color: priorityColors.text,
                      borderRadius: '6px',
                      padding: '0.125rem 0.375rem',
                      fontSize: '0.65rem',
                      fontWeight: '700',
                      boxShadow: `0 3px 10px ${priorityColors.shadow}`,
                      textTransform: 'uppercase',
                      letterSpacing: '0.3px'
                    }}>
                      {ticket.priority}
                    </div>

                    {/* Ticket Header */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.5rem',
                      marginBottom: '0.75rem',
                      paddingRight: '3rem' // Space for priority badge
                    }}>
                      <div style={{
                        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                        borderRadius: '8px',
                        width: '28px',
                        height: '28px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 3px 10px rgba(99, 102, 241, 0.3)',
                        flexShrink: 0
                      }}>
                        <FontAwesomeIcon 
                          icon={categoryIcon} 
                          style={{ 
                            color: 'white',
                            fontSize: '0.75rem'
                          }} 
                        />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h4 style={{
                          margin: '0 0 0.125rem 0',
                          fontSize: '0.875rem',
                          fontWeight: '700',
                          color: isDarkMode ? '#f3f4f6' : '#1f2937',
                          lineHeight: '1.3',
                          overflow: 'hidden',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical'
                        }}>
                          {ticket.title}
                        </h4>
                        <span style={{
                          fontSize: '0.65rem',
                          color: isDarkMode ? '#9ca3af' : '#6b7280',
                          fontWeight: '600',
                          background: isDarkMode 
                            ? 'rgba(55, 65, 81, 0.8)' 
                            : 'rgba(241, 245, 249, 0.8)',
                          padding: '0.1rem 0.375rem',
                          borderRadius: '4px',
                          backdropFilter: 'blur(5px)'
                        }}>
                          #{ticketNumberMap[ticket.id] || generateTicketNumber(ticket.id, ticket.category_id, allTickets)}
                        </span>
                      </div>
                    </div>

                    {/* Category and Sub-category */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                      marginBottom: '0.5rem',
                      padding: '0.375rem',
                      background: isDarkMode 
                        ? 'rgba(75, 85, 99, 0.5)' 
                        : 'rgba(241, 245, 249, 0.8)',
                      borderRadius: '8px',
                      border: isDarkMode ? '1px solid rgba(107, 114, 128, 0.3)' : '1px solid rgba(203, 213, 225, 0.5)'
                    }}>
                      <div style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                        flexShrink: 0
                      }} />
                      <span style={{
                        fontSize: '0.75rem',
                        color: isDarkMode ? '#d1d5db' : '#4b5563',
                        fontWeight: '500',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {ticket.category_name} {ticket.sub_category_name ? `> ${ticket.sub_category_name}` : ''}
                      </span>
                    </div>

                    {/* Description */}
                    <p style={{
                      margin: '0 0 0.75rem 0',
                      fontSize: '0.75rem',
                      color: isDarkMode ? '#d1d5db' : '#4b5563',
                      lineHeight: '1.4',
                      overflow: 'hidden',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical'
                    }}>
                      {ticket.description?.substring(0, 100)}{ticket.description?.length > 100 ? '...' : ''}
                    </p>

                    {/* Meta Information */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '0.5rem',
                      marginBottom: '0.75rem'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.375rem',
                        fontSize: '0.65rem',
                        color: isDarkMode ? '#9ca3af' : '#6b7280',
                        fontWeight: '500'
                      }}>
                        <FontAwesomeIcon icon={faBuilding} />
                        <span>{ticket.client || "N/A"}</span>
                      </div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.375rem',
                        fontSize: '0.65rem',
                        color: isDarkMode ? '#9ca3af' : '#6b7280',
                        fontWeight: '500'
                      }}>
                        <FontAwesomeIcon icon={faCalendarAlt} />
                        <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Requester info for admins */}
                    {(currentUserRole === 'admin' || currentUserRole === 'it_admin' || currentUserRole === 'hr_admin' || currentUserRole === 'payroll_admin' || currentUserRole === 'operations_admin' || currentUserRole === 'ai_admin') && ticket.requester_email && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.375rem',
                        fontSize: '0.65rem',
                        color: isDarkMode ? '#9ca3af' : '#6b7280',
                        fontWeight: '500',
                        marginBottom: '0.75rem',
                        padding: '0.375rem',
                        background: isDarkMode 
                          ? 'rgba(147, 51, 234, 0.1)' 
                          : 'rgba(139, 92, 246, 0.1)',
                        borderRadius: '6px',
                        border: isDarkMode 
                          ? '1px solid rgba(147, 51, 234, 0.2)' 
                          : '1px solid rgba(139, 92, 246, 0.2)'
                      }}>
                        <FontAwesomeIcon icon={faUser} />
                        <span>Requested by: {formatNameFromEmail(ticket.requester_email)}</span>
                      </div>
                    )}

                    {/* Updated date */}
                    {ticket.updated_at && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.375rem',
                        fontSize: '0.65rem',
                        color: isDarkMode ? '#9ca3af' : '#6b7280',
                        fontWeight: '500',
                        marginBottom: '0.75rem'
                      }}>
                        <FontAwesomeIcon icon={faClock} />
                        <span>Updated: {new Date(ticket.updated_at).toLocaleDateString()}</span>
                      </div>
                    )}

                    {/* Admin Actions */}
                    {(currentUserRole === 'admin' || currentUserRole === 'it_admin' || currentUserRole === 'hr_admin' || currentUserRole === 'payroll_admin' || currentUserRole === 'operations_admin' || currentUserRole === 'ai_admin') && (
                      <div style={{
                        padding: '0.75rem',
                        background: isDarkMode 
                          ? 'rgba(31, 41, 55, 0.8)' 
                          : 'rgba(248, 250, 252, 0.8)',
                        borderRadius: '8px',
                        border: isDarkMode ? '1px solid rgba(55, 65, 81, 0.5)' : '1px solid rgba(226, 232, 240, 0.5)',
                        backdropFilter: 'blur(10px)',
                        marginTop: '0.375rem'
                      }}>
                        {/* Assignee selector */}
                        <FormControl size="small" fullWidth onClick={e => e.stopPropagation()} sx={{ mb: 1 }} disabled={ticket.status === 'RESOLVED' || ticket.status === 'CLOSED'}>
                          <InputLabel>{assigneeLabel}</InputLabel>
                          <Select
                            value={ticket.assignee || ''}
                            displayEmpty
                            label={assigneeLabel}
                            onChange={e => handleUpdateTicketAssignee(ticket.id, e.target.value || null)}
                            sx={{
                              minWidth: '100%',
                            }}
                            disabled={ticket.status === 'RESOLVED' || ticket.status === 'CLOSED'}
                          >
                            <MenuItem value="">{assigneeLabel}</MenuItem>
                            {assignOptions.map(option => (
                              <MenuItem key={option.id} value={option.id}>{option.name}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        
                        {/* Replace Status Dropdown with Approve/Reject Buttons */}
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.5rem',
                          marginTop: '0.5rem'
                        }}>
                          {(() => {
                            const workflow = getApprovalWorkflow(ticket.status, userEmail);
                            
                            return (
                              <>
                                {/* Approve Button */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (workflow.canApprove) {
                                      handleAdminStatusChange(ticket.id, workflow.nextStatus);
                                    }
                                  }}
                                  disabled={!workflow.canApprove || ticket.status === 'APPROVED' || ticket.status === 'REJECTED'}
                                  style={{
                                    background: workflow.canApprove && ticket.status !== 'APPROVED' && ticket.status !== 'REJECTED'
                                      ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)'
                                      : (ticket.status === 'APPROVED' 
                                        ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)'
                                        : (isDarkMode ? 'rgba(75, 85, 99, 0.5)' : 'rgba(229, 231, 235, 0.8)')),
                                    color: workflow.canApprove && ticket.status !== 'APPROVED' && ticket.status !== 'REJECTED'
                                      ? 'white'
                                      : (ticket.status === 'APPROVED'
                                        ? 'white'
                                        : (isDarkMode ? '#9ca3af' : '#6b7280')),
                                    border: 'none',
                                    borderRadius: '8px',
                                    padding: '0.5rem 1rem',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    cursor: workflow.canApprove && ticket.status !== 'APPROVED' && ticket.status !== 'REJECTED' ? 'pointer' : 'not-allowed',
                                    transition: 'all 0.2s ease',
                                    boxShadow: workflow.canApprove && ticket.status !== 'APPROVED' && ticket.status !== 'REJECTED'
                                      ? '0 4px 12px rgba(5, 150, 105, 0.3)'
                                      : (ticket.status === 'APPROVED' ? '0 4px 12px rgba(5, 150, 105, 0.3)' : 'none'),
                                    opacity: workflow.canApprove && ticket.status !== 'APPROVED' && ticket.status !== 'REJECTED' ? 1 : 0.6,
                                    width: '100%',
                                    textAlign: 'center'
                                  }}
                                  title={
                                    ticket.status === 'APPROVED' 
                                      ? 'Already Approved'
                                      : ticket.status === 'REJECTED'
                                        ? 'Cannot approve rejected ticket'
                                        : workflow.canApprove 
                                          ? `Approve and move to ${workflow.nextStatus}` 
                                          : 'You cannot approve this ticket'
                                  }
                                  onMouseEnter={(e) => {
                                    if (workflow.canApprove && ticket.status !== 'APPROVED' && ticket.status !== 'REJECTED') {
                                      e.target.style.transform = 'translateY(-1px)';
                                      e.target.style.boxShadow = '0 6px 16px rgba(5, 150, 105, 0.4)';
                                    }
                                  }}
                                  onMouseLeave={(e) => {
                                    if (workflow.canApprove && ticket.status !== 'APPROVED' && ticket.status !== 'REJECTED') {
                                      e.target.style.transform = 'translateY(0)';
                                      e.target.style.boxShadow = '0 4px 12px rgba(5, 150, 105, 0.3)';
                                    }
                                  }}
                                >
                                  {ticket.status === 'APPROVED' ? 'APPROVED' : 'Approve'}
                                </button>

                                {/* Reject Button */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (workflow.canReject) {
                                      handleAdminStatusChange(ticket.id, 'REJECTED');
                                    }
                                  }}
                                  disabled={!workflow.canReject || ticket.status === 'APPROVED' || ticket.status === 'REJECTED'}
                                  style={{
                                    background: workflow.canReject && ticket.status !== 'APPROVED' && ticket.status !== 'REJECTED'
                                      ? 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)'
                                      : (ticket.status === 'REJECTED'
                                        ? 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)'
                                        : (isDarkMode ? 'rgba(75, 85, 99, 0.5)' : 'rgba(229, 231, 235, 0.8)')),
                                    color: workflow.canReject && ticket.status !== 'APPROVED' && ticket.status !== 'REJECTED'
                                      ? 'white'
                                      : (ticket.status === 'REJECTED'
                                        ? 'white'
                                        : (isDarkMode ? '#9ca3af' : '#6b7280')),
                                    border: 'none',
                                    borderRadius: '8px',
                                    padding: '0.5rem 1rem',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    cursor: workflow.canReject && ticket.status !== 'APPROVED' && ticket.status !== 'REJECTED' ? 'pointer' : 'not-allowed',
                                    transition: 'all 0.2s ease',
                                    boxShadow: workflow.canReject && ticket.status !== 'APPROVED' && ticket.status !== 'REJECTED'
                                      ? '0 4px 12px rgba(220, 38, 38, 0.3)'
                                      : (ticket.status === 'REJECTED' ? '0 4px 12px rgba(220, 38, 38, 0.3)' : 'none'),
                                    opacity: workflow.canReject && ticket.status !== 'APPROVED' && ticket.status !== 'REJECTED' ? 1 : (ticket.status === 'REJECTED' ? 1 : 0.4),
                                    width: '100%',
                                    textAlign: 'center'
                                  }}
                                  title={
                                    ticket.status === 'APPROVED' 
                                      ? 'Cannot reject approved ticket'
                                      : ticket.status === 'REJECTED'
                                        ? 'Already Rejected'
                                        : workflow.canReject 
                                          ? 'Reject this expense request' 
                                          : 'You cannot reject this ticket'
                                  }
                                  onMouseEnter={(e) => {
                                    if (workflow.canReject && ticket.status !== 'APPROVED' && ticket.status !== 'REJECTED') {
                                      e.target.style.transform = 'translateY(-1px)';
                                      e.target.style.boxShadow = '0 6px 16px rgba(220, 38, 38, 0.4)';
                                    }
                                  }}
                                  onMouseLeave={(e) => {
                                    if (workflow.canReject && ticket.status !== 'APPROVED' && ticket.status !== 'REJECTED') {
                                      e.target.style.transform = 'translateY(0)';
                                      e.target.style.boxShadow = '0 4px 12px rgba(220, 38, 38, 0.3)';
                                    }
                                  }}
                                >
                                  {ticket.status === 'REJECTED' ? 'REJECTED' : 'Reject'}
                                </button>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                </Slide>
              );
            })
          ) : (
            <div style={{
              padding: '2rem 1rem',
              textAlign: 'center',
              color: isDarkMode ? '#9ca3af' : '#6b7280',
              fontSize: '0.875rem',
              fontWeight: '500',
              background: isDarkMode 
                ? 'rgba(75, 85, 99, 0.3)' 
                : 'rgba(241, 245, 249, 0.6)',
              borderRadius: '12px',
              border: isDarkMode ? '1px solid rgba(107, 114, 128, 0.2)' : '1px solid rgba(203, 213, 225, 0.4)',
              backdropFilter: 'blur(10px)'
            }}>
              No tickets in this column
            </div>
          )}
        </div>
      </div>
    </Fade>
  );
};

export default function ExpenseKanbanBoard(props) {
  const [tickets, setTickets] = useState([]);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUserRole, setCurrentUserRole] = useState(null);
  const [userEmail, setUserEmail] = useState(null);

  const fetchTickets = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('v_ticket_board')
      .select('*')
      .eq('category_id', 5)
      .order('created_at', { ascending: false });

    if (error) {
      setError(error.message);
      setTickets([]);
    } else {
      setTickets(data.map(t => ({ ...t, status: t.expense_status })));
      setError(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTickets();
    const chan = supabase
      .channel('public:tickets:expense-view')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, fetchTickets)
      .subscribe();
    return () => supabase.removeChannel(chan);
  }, []);

  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const [assignOptions, setAssignOptions] = useState([]);
  const [adminCommentModal, setAdminCommentModal] = useState({ open: false, ticketId: null, newStatus: '', loading: false });
  useEffect(() => {
    const fetchAssignees = async () => {
      if (!currentUserRole) {
        setAssignOptions([]);
        return;
      }
      const adminRoles = ['admin', 'it_admin', 'hr_admin', 'payroll_admin', 'operations_admin', 'ai_admin'];
      let query = supabase.from('ticket_assignees').select('user_id, name, role');
      if (!adminRoles.includes(currentUserRole)) {
        query = query.eq('role', currentUserRole);
      }
      const { data, error } = await query;
      if (!error && data) {
        setAssignOptions(data.map(row => ({ id: row.user_id, name: row.name })));
      } else {
        setAssignOptions([]);
      }
    };
    fetchAssignees();
  }, [currentUserRole]);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [filters, setFilters] = useState({ search: '', category: '', sub_category: '', status: '' });

  useEffect(() => {
    const fetchUserRole = async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        return;
      }
      if (session) {
        let role = session.user?.user_metadata?.role || null;
        const email = session.user?.email?.toLowerCase();
        if (email === 'tickets@othainsoft.com') {
          role = 'admin';
        }
        setCurrentUserRole(role);
        setUserEmail(email);
      }
    };

    const fetchCategories = async () => {
      const { data, error: fetchError } = await supabase.from('categories').select('id, name').order('name');
      if (fetchError) {
        return;
      }
      setCategories(data || []);
    };

    const fetchSubCategories = async () => {
      if (!filters.category) {
        setSubCategories([]);
        return;
      }
      const { data, error: fetchError } = await supabase
        .from('sub_categories')
        .select('id, name')
        .eq('category_id', filters.category)
        .order('name');
      if (fetchError) {
        return;
      }
      setSubCategories(data || []);
    };

    fetchUserRole();
    fetchCategories();
    fetchSubCategories();
  }, [filters.category]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleAdminStatusChange = async (ticketId, newStatus) => {
    if (["RESOLVED", "CLOSED"].includes(newStatus)) {
      setAdminCommentModal({ open: true, ticketId, newStatus, loading: false });
    } else {
      // Update expense_status for expense tickets
      try {
        const { error } = await supabase
          .from('tickets')
          .update({ expense_status: newStatus })
          .eq('id', ticketId);
        if (error) throw error;
        await fetchTickets();
      } catch (err) {
        alert('Failed to update ticket: ' + (err.message || err));
      }
    }
  };

  const handleUpdateTicketAssignee = async (ticketId, newAssigneeId) => {
    setTickets(prev => prev.map(ticket => ticket.id === ticketId ? { ...ticket, assignee: newAssigneeId } : ticket));
    try {
      const { error: updateError } = await supabase
        .from('tickets')
        .update({ assignee: newAssigneeId })
        .eq('id', ticketId);
      if (updateError) {
        setError(`Failed to update assignee: ${updateError.message}`);
        await fetchTickets();
      }
    } catch (err) {
      setError('An unexpected error occurred while updating the assignee.');
      await fetchTickets();
    }
  };

  // Group tickets by status
  const board = statusOrder.reduce((acc, status) => {
    if (status === 'WAITING FOR APPROVAL 1') {
      // Include both 'WAITING FOR APPROVAL 1' and 'WAITING FOR APPROVAL' tickets in this column
      acc[status] = tickets.filter(ticket => 
        ticket.status === 'WAITING FOR APPROVAL 1' || ticket.status === 'WAITING FOR APPROVAL'
      );
    } else {
      acc[status] = tickets.filter(ticket => ticket.status === status);
    }
    return acc;
  }, {});

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
      // Refresh tickets after update
      await fetchTickets();
      setAdminCommentModal({ open: false, ticketId: null, newStatus: '', loading: false });
    } catch (err) {
      setAdminCommentModal(modal => ({ ...modal, loading: false }));
      alert('Failed to update ticket: ' + (err.message || err));
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '60vh',
        background: isDarkMode 
          ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
          : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
        borderRadius: '16px',
        margin: '1.5rem',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Background decoration */}
        <Box sx={{
          position: 'absolute',
          top: '-50%',
          right: '-20%',
          width: '240px',
          height: '240px',
          background: isDarkMode 
            ? 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)'
            : 'linear-gradient(135deg, #ddd6fe 0%, #c7d2fe 100%)',
          borderRadius: '50%',
          opacity: 0.1,
          filter: 'blur(30px)'
        }} />
        
        <Box sx={{
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          borderRadius: '50%',
          width: '60px',
          height: '60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1rem',
          animation: 'pulse 2s infinite',
          zIndex: 1
        }}>
          <FontAwesomeIcon icon={faSpinner} spin size="lg" style={{ color: 'white' }} />
        </Box>
        
        <Typography variant="h5" sx={{ 
          fontWeight: 700, 
          color: isDarkMode ? '#f1f5f9' : '#1e293b',
          marginBottom: '0.5rem',
          zIndex: 1,
          fontSize: '1.125rem'
        }}>
          Loading Kanban Board
        </Typography>
        <Typography variant="body1" sx={{ 
          color: isDarkMode ? '#94a3b8' : '#64748b',
          textAlign: 'center',
          zIndex: 1,
          fontSize: '0.875rem'
        }}>
          Please wait while we organize your tickets...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <div style={{
        background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
        border: '1px solid #fca5a5',
        borderRadius: '12px',
        padding: '1rem',
        margin: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        boxShadow: '0 8px 25px rgba(220, 38, 38, 0.15)'
      }}>
        <FontAwesomeIcon icon={faExclamationTriangle} style={{ color: '#dc2626', fontSize: '1.125rem' }} />
        <span style={{ color: '#7f1d1d', fontWeight: '600', fontSize: '0.875rem' }}>Error: {error}</span>
      </div>
    );
  }

  return (
    <div style={{
      background: isDarkMode 
        ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)'
        : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
      minHeight: '100vh',
      padding: '1.5rem',
      position: 'relative',
      overflow: 'visible',
      height: 'auto'
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

      {/* Filters Section */}
      <Fade in={true} timeout={600}>
        <div style={{
          background: isDarkMode 
            ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(51, 65, 85, 0.95) 100%)'
            : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%)',
          backdropFilter: 'blur(20px)',
          borderRadius: '16px',
          padding: '1rem',
          marginBottom: '1.5rem',
          border: isDarkMode ? '1px solid rgba(55, 65, 81, 0.5)' : '1px solid rgba(226, 232, 240, 0.5)',
          boxShadow: '0 15px 40px rgba(0, 0, 0, 0.08)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.75rem',
          alignItems: 'center'
        }}>
          {/* Search */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: isDarkMode 
              ? 'rgba(55, 65, 81, 0.8)' 
              : 'rgba(255, 255, 255, 0.9)',
            borderRadius: '10px',
            padding: '0 0.75rem',
            minWidth: '160px',
            flex: '1 1 160px',
            border: isDarkMode ? '1px solid rgba(75, 85, 99, 0.5)' : '1px solid rgba(226, 232, 240, 0.5)',
            backdropFilter: 'blur(10px)',
            transition: 'all 0.2s ease'
          }}>
            <FontAwesomeIcon icon={faSearch} style={{ color: '#6b7280', marginRight: '0.5rem', fontSize: '0.8rem' }} />
            <input 
              type="text" 
              name="search" 
              placeholder="Search tickets..." 
              value={filters.search} 
              onChange={handleFilterChange} 
              style={{
                border: 'none',
                background: 'transparent',
                padding: '0.5rem 0',
                fontSize: '0.8rem',
                color: isDarkMode ? '#f3f4f6' : '#1f2937',
                width: '100%',
                outline: 'none'
              }}
            />
          </div>

          {/* Category */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: isDarkMode 
              ? 'rgba(55, 65, 81, 0.8)' 
              : 'rgba(255, 255, 255, 0.9)',
            borderRadius: '10px',
            padding: '0 0.75rem',
            minWidth: '140px',
            flex: '1 1 140px',
            border: isDarkMode ? '1px solid rgba(75, 85, 99, 0.5)' : '1px solid rgba(226, 232, 240, 0.5)',
            backdropFilter: 'blur(10px)'
          }}>
            <FontAwesomeIcon icon={faFilter} style={{ color: '#6b7280', marginRight: '0.5rem', fontSize: '0.8rem' }} />
            <select 
              name="category" 
              value={filters.category} 
              onChange={handleFilterChange}
              style={{
                border: 'none',
                background: 'transparent',
                padding: '0.5rem 0',
                fontSize: '0.8rem',
                color: isDarkMode ? '#f3f4f6' : '#1f2937',
                width: '100%',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="">All Categories</option>
              {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
            </select>
          </div>

          {/* Sub-category */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: isDarkMode 
              ? 'rgba(55, 65, 81, 0.8)' 
              : 'rgba(255, 255, 255, 0.9)',
            borderRadius: '10px',
            padding: '0 0.75rem',
            minWidth: '140px',
            flex: '1 1 140px',
            border: isDarkMode ? '1px solid rgba(75, 85, 99, 0.5)' : '1px solid rgba(226, 232, 240, 0.5)',
            backdropFilter: 'blur(10px)',
            opacity: (!filters.category || subCategories.length === 0) ? 0.6 : 1
          }}>
            <FontAwesomeIcon icon={faFilter} style={{ color: '#6b7280', marginRight: '0.5rem', fontSize: '0.8rem' }} />
            <select 
              name="sub_category" 
              value={filters.sub_category} 
              onChange={handleFilterChange} 
              disabled={!filters.category || subCategories.length === 0}
              style={{
                border: 'none',
                background: 'transparent',
                padding: '0.5rem 0',
                fontSize: '0.8rem',
                color: isDarkMode ? '#f3f4f6' : '#1f2937',
                width: '100%',
                outline: 'none',
                cursor: (!filters.category || subCategories.length === 0) ? 'not-allowed' : 'pointer'
              }}
            >
              <option value="">All Sub-Categories</option>
              {subCategories.map(sub => <option key={sub.id} value={sub.id}>{sub.name}</option>)}
            </select>
          </div>

          {/* Status */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: isDarkMode 
              ? 'rgba(55, 65, 81, 0.8)' 
              : 'rgba(255, 255, 255, 0.9)',
            borderRadius: '10px',
            padding: '0 0.75rem',
            minWidth: '120px',
            flex: '1 1 120px',
            border: isDarkMode ? '1px solid rgba(75, 85, 99, 0.5)' : '1px solid rgba(226, 232, 240, 0.5)',
            backdropFilter: 'blur(10px)'
          }}>
            <FontAwesomeIcon icon={faFilter} style={{ color: '#6b7280', marginRight: '0.5rem', fontSize: '0.8rem' }} />
            <select
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              style={{
                border: 'none',
                background: 'transparent',
                padding: '0.5rem 0',
                fontSize: '0.8rem',
                color: isDarkMode ? '#f3f4f6' : '#1f2937',
                width: '100%',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="">All Statuses</option>
              {statusOrder.map(stat => (
                <option key={stat} value={stat}>{stat.replace('_', ' ').replace('WAITING FOR SUPPORT', 'Waiting for Support')}</option>
              ))}
            </select>
          </div>

          {/* Refresh Button */}
          <button 
            onClick={fetchTickets} 
            disabled={isLoading} 
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
              background: isLoading 
                ? (isDarkMode ? '#4b5563' : '#e5e7eb')
                : 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
              color: isLoading 
                ? (isDarkMode ? '#9ca3af' : '#9ca3af')
                : 'white',
              border: 'none',
              borderRadius: '10px',
              padding: '0.5rem 1rem',
              fontSize: '0.8rem',
              fontWeight: '600',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: isLoading 
                ? 'none' 
                : '0 6px 20px rgba(59, 130, 246, 0.3)',
              minWidth: '110px'
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 8px 25px rgba(59, 130, 246, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isLoading) {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.3)';
              }
            }}
          >
            <FontAwesomeIcon 
              icon={faSync} 
              spin={isLoading} 
              style={{ fontSize: '0.8rem' }}
            />
            {isLoading ? 'Refreshing...' : 'Refresh Board'}
          </button>
        </div>
      </Fade>

      {/* Error Message */}
      {error && (
        <Slide direction="down" in={!!error} mountOnEnter unmountOnExit>
          <div style={{
            background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
            border: '1px solid #fca5a5',
            borderRadius: '12px',
            padding: '0.75rem 1rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: '0 8px 25px rgba(220, 38, 38, 0.15)'
          }}>
            <FontAwesomeIcon icon={faExclamationTriangle} style={{ color: '#dc2626', fontSize: '0.875rem' }} />
            <span style={{ color: '#7f1d1d', fontWeight: '600', fontSize: '0.8rem' }}>{error}</span>
          </div>
        </Slide>
      )}

      {/* Kanban Board */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1.5rem',
        alignItems: 'start'
      }}>
        {statusOrder.map(statusKey => (
          <KanbanColumn
            key={statusKey}
            tickets={board[statusKey]}
            status={statusKey}
            currentUserRole={currentUserRole}
            statusOrder={statusOrder}
            handleAdminStatusChange={handleAdminStatusChange}
            handleUpdateTicketAssignee={handleUpdateTicketAssignee}
            assignOptions={assignOptions}
            allTickets={tickets}
            userEmail={userEmail}
          />
        ))}
      </div>

      <AdminCommentModal
        open={adminCommentModal.open}
        onClose={() => setAdminCommentModal({ open: false, ticketId: null, newStatus: '', loading: false })}
        onSubmit={handleAdminCommentSubmit}
        loading={adminCommentModal.loading}
      />

      {/* Add animations CSS */}
      <style jsx>{`
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