import React, { useEffect, useState } from 'react';
import { supabase } from '../../../services/supabase';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faSearch, faFilter, faSync, faTicketAlt, 
  faInfoCircle, faExclamationTriangle, faCheck, 
  faArrowRight, faTimesCircle, faSpinner,
  faHeadset, faClock, faCalendarAlt,
  faUser, faBuilding, faLaptopCode, faUserTie, 
  faFileInvoiceDollar, faTools, faMoneyCheckAlt,
  faRobot, faDownload
} from '@fortawesome/free-solid-svg-icons';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { useNavigate } from 'react-router-dom';
import { 
  Select, MenuItem, FormControl, InputLabel, Chip, 
  Box, Typography, useTheme, Fade, Slide
} from '@mui/material';
import AdminCommentModal from './AdminCommentModal';
import { generateTicketNumber } from '../../../utils/ticketUtils';

const statusOrder = ['WAITING FOR SUPPORT', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

const getStatusIcon = (status) => {
  switch(status) {
    case 'WAITING FOR SUPPORT': return faHeadset;
    case 'IN_PROGRESS': return faArrowRight;
    case 'RESOLVED': return faCheck;
    case 'CLOSED': return faTimesCircle;
    default: return faTicketAlt;
  }
};

const getStatusColors = (status) => {
  switch(status) {
    case 'WAITING FOR SUPPORT': return {
      gradient: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
      shadow: 'rgba(37, 99, 235, 0.3)',
      text: 'white'
    };
    case 'IN_PROGRESS': return {
      gradient: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)',
      shadow: 'rgba(234, 88, 12, 0.3)',
      text: 'white'
    };
    case 'RESOLVED': return {
      gradient: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
      shadow: 'rgba(5, 150, 105, 0.3)',
      text: 'white'
    };
    case 'CLOSED': return {
      gradient: 'linear-gradient(135deg, #6b7280 0%, #9ca3af 100%)',
      shadow: 'rgba(107, 114, 128, 0.3)',
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

const KanbanColumn = ({ tickets, status, currentUserRole, statusOrder, handleAdminStatusChange, handleUpdateTicketAssignee, handlePriorityChange, assignOptions, allTickets, ticketNumberMap }) => {
  const icon = getStatusIcon(status);
  const navigate = useNavigate();
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const statusColors = getStatusColors(status);
  
  // ✅ REMOVED: Local ticketNumberMap creation - now using prop from parent
  // const ticketNumberMap = React.useMemo(() => {
  //   if (!allTickets || allTickets.length === 0) return {};
  //   return createTicketNumberMap(allTickets);
  // }, [allTickets]);
  
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
                        <FormControl
                          size="small"
                          fullWidth
                          onClick={(e) => e.stopPropagation()}
                          sx={{
                            '.MuiOutlinedInput-root': {
                              borderRadius: '8px',
                              background: isDarkMode 
                                ? 'linear-gradient(135deg, rgba(55, 65, 81, 0.8) 0%, rgba(75, 85, 99, 0.8) 100%)'
                                : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.9) 100%)',
                              backdropFilter: 'blur(10px)',
                              border: 'none',
                              transition: 'all 0.2s',
                              '&:hover': {
                                background: isDarkMode 
                                  ? 'linear-gradient(135deg, rgba(75, 85, 99, 0.9) 0%, rgba(107, 114, 128, 0.9) 100%)'
                                  : 'linear-gradient(135deg, rgba(248, 250, 252, 0.95) 0%, rgba(241, 245, 249, 0.95) 100%)',
                                transform: 'translateY(-1px)',
                                boxShadow: '0 5px 15px rgba(0, 0, 0, 0.1)'
                              },
                            },
                            '.MuiSelect-select': {
                              padding: '0.5rem 0.75rem',
                              display: 'flex',
                              alignItems: 'center',
                            },
                            '.MuiOutlinedInput-notchedOutline': { 
                              border: 'none',
                            },
                          }}
                        >
                          <Select
                            value={ticket.status}
                            onChange={(e) => handleAdminStatusChange(ticket.id, e.target.value)}
                            displayEmpty
                            renderValue={(selected) => {
                              const selectedColors = getStatusColors(selected);
                              return (
                                <Chip 
                                  label={selected.replace('_', ' ').replace('WAITING FOR SUPPORT', 'Waiting for Support')}
                                  sx={{ 
                                    height: '24px',
                                    fontSize: '0.7rem',
                                    background: selectedColors.gradient,
                                    color: selectedColors.text,
                                    fontWeight: 700,
                                    borderRadius: '6px',
                                    boxShadow: `0 3px 10px ${selectedColors.shadow}`,
                                    border: 'none',
                                    '.MuiChip-label': {
                                      padding: '0 8px',
                                    },
                                    '&:hover': {
                                      transform: 'translateY(-1px)',
                                      boxShadow: `0 5px 12px ${selectedColors.shadow}`
                                    }
                                  }}
                                />
                              );
                            }}
                            MenuProps={{
                              PaperProps: {
                                sx: {
                                  borderRadius: '12px',
                                  boxShadow: '0 15px 45px rgba(0, 0, 0, 0.15)',
                                  border: isDarkMode ? '1px solid rgba(55, 65, 81, 0.5)' : '1px solid rgba(226, 232, 240, 0.5)',
                                  background: isDarkMode 
                                    ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(51, 65, 85, 0.95) 100%)'
                                    : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%)',
                                  backdropFilter: 'blur(20px)',
                                  '.MuiMenuItem-root': {
                                    fontSize: '0.75rem',
                                    padding: '6px 12px',
                                    borderRadius: '6px',
                                    margin: '3px 6px',
                                    '&:hover': {
                                      background: isDarkMode 
                                        ? 'rgba(55, 65, 81, 0.8)'
                                        : 'rgba(241, 245, 249, 0.8)'
                                    }
                                  }
                                }
                              }
                            }}
                          >
                            {statusOrder.map(statusOption => {
                              const optionColors = getStatusColors(statusOption);
                              return (
                                <MenuItem key={statusOption} value={statusOption}>
                                  <Chip 
                                    label={statusOption.replace('_', ' ').replace('WAITING FOR SUPPORT', 'Waiting for Support')}
                                    size="small"
                                    sx={{ 
                                      height: '20px',
                                      fontSize: '0.65rem',
                                      background: optionColors.gradient,
                                      color: optionColors.text,
                                      fontWeight: 700,
                                      borderRadius: '6px',
                                      boxShadow: `0 2px 6px ${optionColors.shadow}`,
                                      '.MuiChip-label': {
                                        padding: '0 6px',
                                      }
                                    }}
                                  />
                                </MenuItem>
                              );
                            })}
                          </Select>
                        </FormControl>
                        
                        {/* Priority Adjustment Controls */}
                        <div style={{
                          marginTop: '0.75rem',
                          padding: '0.75rem',
                          background: isDarkMode 
                            ? 'rgba(55, 65, 81, 0.6)' 
                            : 'rgba(241, 245, 249, 0.6)',
                          borderRadius: '8px',
                          border: isDarkMode ? '1px solid rgba(75, 85, 99, 0.4)' : '1px solid rgba(203, 213, 225, 0.4)'
                        }}>
                          <Typography variant="caption" sx={{ 
                            color: isDarkMode ? '#9ca3af' : '#6b7280',
                            fontWeight: 600,
                            fontSize: '0.7rem',
                            marginBottom: '0.5rem',
                            display: 'block'
                          }}>
                            Severity Control
                          </Typography>
                          
                          <div style={{
                            display: 'flex',
                            gap: '0.25rem',
                            flexWrap: 'wrap',
                            justifyContent: 'center'
                          }}>
                            {['Low', 'Medium', 'High', 'Urgent'].map(priority => {
                              const isCurrentPriority = ticket.priority === priority;
                              const priorityColor = getPriorityColors(priority);
                              
                              return (
                                <button
                                  key={priority}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handlePriorityChange(ticket.id, priority);
                                  }}
                                  disabled={ticket.status === 'RESOLVED' || ticket.status === 'CLOSED' || isCurrentPriority}
                                  style={{
                                    background: isCurrentPriority 
                                      ? priorityColor.gradient 
                                      : (isDarkMode 
                                        ? 'rgba(30, 41, 59, 0.8)' 
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
                                    minWidth: '50px',
                                    textAlign: 'center',
                                    transition: 'all 0.2s ease',
                                    boxShadow: isCurrentPriority ? `0 2px 8px ${priorityColor.shadow}` : 'none',
                                    margin: '0.125rem'
                                  }}
                                  title={isCurrentPriority 
                                    ? `Current priority: ${priority}` 
                                    : `Change priority to ${priority}`}
                                  onMouseEnter={(e) => {
                                    if (!isCurrentPriority && ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED') {
                                      e.target.style.background = priorityColor.gradient;
                                      e.target.style.color = priorityColor.text;
                                      e.target.style.transform = 'translateY(-1px)';
                                      e.target.style.boxShadow = `0 3px 10px ${priorityColor.shadow}`;
                                    }
                                  }}
                                  onMouseLeave={(e) => {
                                    if (!isCurrentPriority && ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED') {
                                      e.target.style.background = isDarkMode 
                                        ? 'rgba(30, 41, 59, 0.8)' 
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

export default function KanbanBoard({ ticketNumberMap, tickets: propTickets, onDataRefresh }) {
  const [tickets, setTickets] = useState(propTickets || []);
  const [isLoading, setIsLoading] = useState(false); // Changed to false since we're not fetching
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    sub_category: '',
    status: ''
  });
  const [assignOptions, setAssignOptions] = useState([]);
  const [currentUserRole, setCurrentUserRole] = useState(null);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [adminCommentModal, setAdminCommentModal] = useState({ open: false, ticketId: null, newStatus: null, loading: false });
  
  // Date range selector state for export
  const [selectedDateRange, setSelectedDateRange] = useState('');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showCustomDateRange, setShowCustomDateRange] = useState(false);
  
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  // ✅ NEW: Update tickets when propTickets changes
  useEffect(() => {
    setTickets(propTickets || []);
  }, [propTickets]);

  // ✅ REMOVED: Local ticketNumberMap creation - now using prop from parent
  // const ticketNumberMap = React.useMemo(() => {
  //   return createTicketNumberMap(allTickets);
  // }, [allTickets]);

  // ✅ REMOVED: fetchTickets function - now using propTickets
  // const fetchTickets = async () => {
  //   // ... removed entire function
  // };

  // ✅ REMOVED: useEffect for fetchTickets - no longer needed
  // useEffect(() => {
  //   fetchTickets();
  // }, [filters]);

  // ✅ MODIFIED: Simplified subscription to trigger parent refresh
  useEffect(() => {
    const subscription = supabase
      .channel('public:tickets:kanban-board')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tickets' }, () => {
        // Trigger parent refresh when new tickets are added
        if (onDataRefresh) {
          onDataRefresh();
        }
      })
      .subscribe();
    return () => {
      supabase.removeChannel(subscription);
    };
  }, [onDataRefresh]);

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

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleExportToExcel = async () => {
    // Get tickets for selected date range (or all if no range selected)
    const ticketsToExport = getTicketsForDateRange(selectedDateRange, tickets);
    
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
    const worksheet = workbook.addWorksheet('Kanban Tickets');

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
    saveAs(blob, 'kanban_tickets.xlsx');
  };

  const handleAdminStatusChange = async (ticketId, newStatus) => {
    if (["RESOLVED", "CLOSED"].includes(newStatus)) {
      setAdminCommentModal({ open: true, ticketId, newStatus, loading: false });
    } else {
      // Directly update status for other transitions
      try {
        const { error } = await supabase
          .from('tickets')
          .update({ status: newStatus })
          .eq('id', ticketId);
        if (error) throw error;
        // Update local state immediately for better UX
        setTickets(prev => prev.map(ticket => 
          ticket.id === ticketId ? { ...ticket, status: newStatus } : ticket
        ));
        // Trigger parent refresh to sync data
        if (onDataRefresh) {
          onDataRefresh();
        }
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
      } else {
        // Trigger parent refresh to sync data
        if (onDataRefresh) {
          onDataRefresh();
        }
      }
    } catch (err) {
      setError('An unexpected error occurred while updating the assignee.');
    }
  };

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

  // Priority change function for Kanban - simplified
  const handlePriorityChange = async (ticketId, newPriority) => {
    try {
      // Find the current ticket
      const currentTicket = tickets.find(t => t.id === ticketId);
      if (!currentTicket) return;

      // Skip if same priority
      if (currentTicket.priority === newPriority) {
        return;
      }

      // Calculate new due date based on priority change
      let newDueDate = null;
      if (currentTicket.due_at) {
        const now = new Date();
        
        // Calculate days to add based on priority
        let daysToAdd = 0;
        switch (newPriority.toLowerCase()) {
          case 'urgent':
            daysToAdd = 1;
            break;
          case 'high':
            daysToAdd = 3;
            break;
          case 'medium':
            daysToAdd = 7;
            break;
          case 'low':
            daysToAdd = 14;
            break;
          default:
            daysToAdd = 7;
        }
        
        newDueDate = new Date(now.getTime() + (daysToAdd * 24 * 60 * 60 * 1000));
      }

      // Update ticket in database
      const updateData = { priority: newPriority };
      if (newDueDate) {
        updateData.due_at = newDueDate.toISOString();
      }

      const { error } = await supabase
        .from('tickets')
        .update(updateData)
        .eq('id', ticketId);

      if (error) throw error;

      // Update local state immediately for better UX
      setTickets(prev => prev.map(ticket => 
        ticket.id === ticketId 
          ? { ...ticket, priority: newPriority, due_at: newDueDate?.toISOString() || ticket.due_at }
          : ticket
      ));

      // Trigger parent refresh to sync data
      if (onDataRefresh) {
        onDataRefresh();
      }

    } catch (error) {
      console.error('Error changing priority and due date:', error);
      alert('Failed to update priority: ' + (error.message || error));
    }
  };

  // Group tickets by status
  const board = statusOrder.reduce((acc, status) => {
    acc[status] = tickets.filter(ticket => ticket.status === status);
    return acc;
  }, {});

  // Modal submit handler
  const handleAdminCommentSubmit = async (comment) => {
    try {
      setAdminCommentModal(prev => ({ ...prev, loading: true }));
      const { error } = await supabase
        .from('tickets')
        .update({ 
          status: adminCommentModal.newStatus,
          admin_comment: comment 
        })
        .eq('id', adminCommentModal.ticketId);
      if (error) throw error;
      
      // Update local state immediately for better UX
      setTickets(prev => prev.map(ticket => 
        ticket.id === adminCommentModal.ticketId 
          ? { ...ticket, status: adminCommentModal.newStatus, admin_comment: comment }
          : ticket
      ));
      
      // Trigger parent refresh to sync data
      if (onDataRefresh) {
        onDataRefresh();
      }
      
      setAdminCommentModal({ open: false, ticketId: null, newStatus: '', loading: false });
    } catch (err) {
      alert('Failed to update ticket: ' + (err.message || err));
      setAdminCommentModal(prev => ({ ...prev, loading: false }));
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
            minWidth: '180px',
            flex: '1 1 180px',
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
            onClick={() => {
              if (onDataRefresh) {
                setIsLoading(true);
                onDataRefresh().finally(() => setIsLoading(false));
              }
            }} 
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

          {/* Export Section - Admin Only */}
          {currentUserRole && ['admin', 'it_admin', 'hr_admin', 'payroll_admin', 'operations_admin', 'ai_admin'].includes(currentUserRole) && tickets.length > 0 && (
            <>
              {/* Date Range Selector */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                background: isDarkMode 
                  ? 'rgba(55, 65, 81, 0.8)' 
                  : 'rgba(255, 255, 255, 0.9)',
                borderRadius: '10px',
                padding: '0 0.75rem',
                minWidth: '180px',
                flex: '1 1 180px',
                border: isDarkMode ? '1px solid rgba(75, 85, 99, 0.5)' : '1px solid rgba(226, 232, 240, 0.5)',
                backdropFilter: 'blur(10px)'
              }}>
                <FontAwesomeIcon icon={faCalendarAlt} style={{ color: '#6b7280', marginRight: '0.5rem', fontSize: '0.8rem' }} />
                <select
                  value={selectedDateRange}
                  onChange={(e) => {
                    setSelectedDateRange(e.target.value);
                    if (e.target.value !== 'custom') {
                      setShowCustomDateRange(false);
                    } else {
                      setShowCustomDateRange(true);
                    }
                  }}
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
                  {getDateRangeOptions().map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom Date Range Inputs */}
              {showCustomDateRange && (
                <div style={{
                  display: 'flex',
                  gap: '0.5rem',
                  alignItems: 'center'
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
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '0.5rem 1rem',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 6px 20px rgba(5, 150, 105, 0.3)',
                  minWidth: '120px'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 8px 25px rgba(5, 150, 105, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 6px 20px rgba(5, 150, 105, 0.3)';
                }}
              >
                <FontAwesomeIcon icon={faDownload} style={{ fontSize: '0.8rem' }} />
                Export Excel
              </button>
            </>
          )}
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
            handlePriorityChange={handlePriorityChange}
            assignOptions={assignOptions}
            allTickets={tickets}
            ticketNumberMap={ticketNumberMap}
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
      <style>{`
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