import React, { useEffect, useState } from 'react';
import { supabase } from '../../../services/supabase'; // Updated import path
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faTicketAlt, faTags, faLayerGroup, faClipboardList, 
  faBuilding, faExclamationTriangle, faPaperPlane,
  faExclamationCircle, faCheckCircle, faInfoCircle,
  faChevronLeft, // For 'Change Category' button
  faLaptopCode, faUserTie, faFileInvoiceDollar, // IT, HR, Accounts
  faTools, faMoneyCheckAlt, // Operations, Payroll
  faSpinner, // Added for loading state
  faRobot, // Added for AI Requests
  faUsers // Added for 'on behalf of' user selection
} from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '@mui/material/styles'; // Added useTheme import
import { Box, Typography, List, ListItem, ListItemText, IconButton, Button } from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';

const CLIENT_OPTIONS = ["IQVIA", "GBT", "Presidio", "Othain"];
const ADMIN_EMAILS = ['it@othainsoft.com', 'hr@othainsoft.com', 'accounts@othainsoft.com'];

export default function TicketForm({ onTicketCreated }) {
  const theme = useTheme(); // Get the theme object
  const isDarkMode = theme.palette.mode === 'dark'; // Determine if dark mode is active

  const [cats, setCats] = useState([]);
  const [subs, setSubs] = useState([]);
  const [form, setForm] = useState({
    title: '',
    description: '',
    category_id: null,
    sub_category_id: null,
    priority: 'Medium',
    client: ''
  });
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false); // This is for sub-categories and submit
  const [isLoadingCategories, setIsLoadingCategories] = useState(true); // New state for initial category loading
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [categorySelected, setCategorySelected] = useState(false); // New state
  const [selectedCategoryName, setSelectedCategoryName] = useState(''); // To display selected category name
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  // Admin specific states
  const [isAdmin, setIsAdmin] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedOnBehalfOfUserId, setSelectedOnBehalfOfUserId] = useState(''); // Store ID of user
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // New state for attachments
  const [attachments, setAttachments] = useState([]);

  // Handle responsive design
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      setIsTablet(window.innerWidth <= 1024 && window.innerWidth > 768);
    };

    // Initial check
    handleResize();

    // Add event listener
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Get current authenticated user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
      if (user && ADMIN_EMAILS.includes(user.email)) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
    };
    getUser();
  }, []);

  // Effect to fetch all users if the current user is an admin
  useEffect(() => {
    if (isAdmin) {
      const fetchAllUsers = async () => {
        setIsLoadingUsers(true);
        setError(null);
        // Ensure user is authenticated before querying
        const { data: users, error: usersError } = await supabase
          .rpc('get_all_user_emails');
        if (usersError || !users) {
          setError('You must be logged in to load users.');
          setAllUsers([]);
          setIsLoadingUsers(false);
          return;
        }
        try {
          setAllUsers(users.sort((a,b) => a.email.localeCompare(b.email)));
        } catch (err) {
          setError('An unexpected error occurred while loading users.');
          setAllUsers([]);
        } finally {
          setIsLoadingUsers(false);
        }
      };
      fetchAllUsers();
    } else {
      setAllUsers([]); // Clear users if not admin or admin status changes
      setSelectedOnBehalfOfUserId(''); // Clear selection
    }
  }, [isAdmin]); // Re-run if isAdmin changes

  // 1. Load categories (runs once or if dependencies change)
  useEffect(() => {
    const fetchCategories = async () => {
      setIsLoadingCategories(true); // Set loading true before fetch
      setError(null); // Clear previous errors
      try {
        const { data, error: fetchError } = await supabase.from('categories').select('id, name').order('name');
        if (fetchError) {
          setError('Failed to load categories.');
          setCats([]); // Ensure cats is an empty array on error
        } else {
          setCats(data || []);
        }
      } catch (catError) {
        setError('An unexpected error occurred while loading categories.');
        setCats([]);
      } finally {
        setIsLoadingCategories(false); // Set loading false after fetch attempt
      }
    };
    fetchCategories();
  }, []);

  // 2. Load sub-cats on category change
  useEffect(() => {
    if (!form.category_id) {
      setSubs([]);
      setForm(f => ({ ...f, sub_category_id: null }));
      return;
    }
    const fetchSubCategories = async () => {
      setIsLoading(true); // Indicate loading for sub-categories
      const { data, error: fetchError } = await supabase
        .from('sub_categories')
        .select('id, name')
        .eq('category_id', form.category_id)
        .order('name');
      if (fetchError) {
        setError('Failed to load sub-categories.');
      } else {
        setSubs(data || []);
        if (data && !data.find(s => s.id === form.sub_category_id)) {
          setForm(f => ({ ...f, sub_category_id: null }));
        }
      }
      setIsLoading(false);
    };
    fetchSubCategories();
  }, [form.category_id]);

  // 3. Handle submit
  async function handleSubmit(e) {
    e.preventDefault();
    if (!currentUser) {
      setError("You must be logged in to create a ticket.");
      return;
    }
    if (!form.category_id) {
        setError("A category must be selected."); // Should not happen if flow is correct
        return;
    }
    if (!form.sub_category_id) {
        setError("Please select a sub-category.");
        return;
    }
    if (!form.client) {
        setError("Please select a client.");
        return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessMessage('');

    try {
      // Determine default assignee based on category name
      const categoryObj = cats.find(cat => cat.id === form.category_id);
      let defaultAssigneeEmail = null;
      if (categoryObj) {
        const name = categoryObj.name.toLowerCase();
        if (name.includes('it requests') || name.includes('ai requests') || name.includes('it, ai, operations')) {
          defaultAssigneeEmail = 'it@othainsoft.com';
        } else if (name.includes('hr')) {
          defaultAssigneeEmail = 'hr@othainsoft.com';
        } else if (name.includes('accounts')) {
          defaultAssigneeEmail = 'accounts@othainsoft.com';
        } else if (name.includes('payroll')) {
          // Payroll tickets also go to accounts team
          defaultAssigneeEmail = 'accounts@othainsoft.com';
        }
      }
      let assigneeId = null;
      if (defaultAssigneeEmail) {
        const { data: assigneeUser, error: assigneeError } = await supabase
          .from('v_user_emails')
          .select('id')
          .eq('email', defaultAssigneeEmail)
          .single();
        if (assigneeError || !assigneeUser) {
        } else {
          assigneeId = assigneeUser.id;
        }
      }
      // Build ticket object
      const ticketToInsert = {
        ...form,
        requested_by: selectedOnBehalfOfUserId && isAdmin ? selectedOnBehalfOfUserId : currentUser.id
      };

      if (assigneeId) ticketToInsert.assignee = assigneeId;
      // Insert ticket and get new ID
      const { data: insertedTickets, error: insertError } = await supabase
        .from('tickets')
        .insert([ ticketToInsert ])
        .select('id');

      if (insertError) {
        setError(`Failed to create ticket: ${insertError.message}`);
      } else {
        const newTicketId = insertedTickets[0].id;
        // Upload attachments (await all, check for errors)
        let uploadError = null;
        if (attachments.length > 0) {
          const uploadResults = await Promise.all(
            attachments.map(async (file) => {
              const filePath = `${newTicketId}/${file.name}`;
              const { error } = await supabase.storage
                .from('ticket-attachments')
                .upload(filePath, file, { cacheControl: '3600', upsert: false });
              return error;
            })
          );
          uploadError = uploadResults.find(e => e);
        }
        if (uploadError) {
          setError(`Ticket created, but failed to upload one or more attachments: ${uploadError.message || uploadError}`);
          setIsLoading(false);
          return;
        }
        // Clear attachments after upload
        setAttachments([]);
        setSuccessMessage('Ticket created successfully!');
        setForm({
          title: '',
          description: '',
          category_id: null, // Reset category_id
          sub_category_id: null,
          priority: 'Medium',
          client: ''
        });
        setSubs([]);
        setCategorySelected(false); // Go back to category selection
        setSelectedCategoryName('');
        setSelectedOnBehalfOfUserId(''); // Reset on behalf of user selection
        // Notify parent to reload ticket list or board
        if (onTicketCreated) {
          await onTicketCreated();
        }
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm(prevForm => ({ ...prevForm, [name]: value }));
  };

  // New handler for category button click
  const handleCategoryButtonClick = (category) => {
    setForm(prevForm => ({
      ...prevForm,
      category_id: category.id,
      sub_category_id: null // Reset sub-category when main category changes
    }));
    setSelectedCategoryName(category.name);
    setCategorySelected(true);
    setError(null); // Clear any previous errors
    setSuccessMessage('');
  };

  // New handler for changing category
  const handleChangeCategoryClick = () => {
    setCategorySelected(false);
    setForm(prevForm => ({
      ...prevForm,
      category_id: null,
      sub_category_id: null
    }));
    setSelectedCategoryName('');
    setSubs([]);
    setError(null);
    setSuccessMessage('');
  };

  const handleSubCategoryChange = (e) => {
    const subCategoryId = e.target.value ? Number(e.target.value) : null;
    setForm(prevForm => ({ ...prevForm, sub_category_id: subCategoryId }));
  };

  // Handler to add attachments
  const handleAttachmentChange = (e) => {
    const files = Array.from(e.target.files);
    setAttachments(prev => [...prev, ...files]);
  };

  // Handler to remove single attachment
  const handleRemoveAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  if (isLoadingCategories) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        padding: '2rem',
        background: isDarkMode 
          ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
          : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
        borderRadius: '20px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.1)',
        margin: '1rem'
      }}>
        <div style={{
          background: isDarkMode 
            ? 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)'
            : 'linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%)',
          borderRadius: '50%',
          width: '80px',
          height: '80px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1.5rem',
          animation: 'pulse 2s infinite'
        }}>
          <FontAwesomeIcon icon={faSpinner} spin size="2x" style={{ color: 'white' }} />
        </div>
        <h3 style={{ 
          margin: '0 0 0.5rem 0', 
          fontSize: '1.5rem',
          fontWeight: '600',
          color: isDarkMode ? '#f1f5f9' : '#1e293b'
        }}>
          Loading Form Options
        </h3>
        <p style={{ 
          margin: 0, 
          fontSize: '1rem',
          color: isDarkMode ? '#94a3b8' : '#64748b',
          textAlign: 'center'
        }}>
          Please wait while we prepare everything for you...
        </p>
      </div>
    );
  }

  return (
    <div style={{
      background: isDarkMode 
        ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
        : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
      borderRadius: '20px',
      padding: isMobile ? '1rem' : '1.5rem',
      boxShadow: '0 15px 50px rgba(0, 0, 0, 0.08)',
      border: isDarkMode ? '1px solid #374151' : '1px solid #e2e8f0',
      position: 'relative',
      overflow: 'hidden',
      outline: 'none'
    }}>
      {/* Background decoration */}
      <div style={{
        position: 'absolute',
        top: '-50%',
        right: '-20%',
        width: '200px',
        height: '200px',
        background: isDarkMode 
          ? 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)'
          : 'linear-gradient(135deg, #ddd6fe 0%, #c7d2fe 100%)',
        borderRadius: '50%',
        opacity: '0.1',
        filter: 'blur(30px)'
      }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '1.5rem',
          padding: '0.75rem',
          background: isDarkMode 
            ? 'linear-gradient(135deg, #374151 0%, #4b5563 100%)'
            : 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
          borderRadius: '12px',
          border: isDarkMode ? '1px solid #4b5563' : '1px solid #cbd5e1'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
            borderRadius: '10px',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: '0.75rem',
            boxShadow: '0 6px 20px rgba(59, 130, 246, 0.3)'
          }}>
            <FontAwesomeIcon icon={faTicketAlt} style={{ color: 'white', fontSize: '1.125rem' }} />
          </div>
          <div>
            <h2 style={{
              margin: '0 0 0.125rem 0',
              fontSize: '1.375rem',
              fontWeight: '700',
              ...(isDarkMode 
                ? { color: 'white' } // Simple white text in dark mode
                : {
                    background: 'linear-gradient(135deg, #1e293b 0%, #475569 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }
              )
            }}>
              Create New Ticket
            </h2>
            <p style={{
              margin: 0,
              fontSize: '0.875rem',
              color: isDarkMode ? '#94a3b8' : '#64748b'
            }}>
              Get help from our expert support team
            </p>
          </div>
        </div>

        {error && (
          <div style={{
            background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
            border: '1px solid #fca5a5',
            borderRadius: '10px',
            padding: '0.75rem',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            animation: 'slideIn 0.3s ease-out'
          }}>
            <FontAwesomeIcon icon={faExclamationCircle} style={{ color: '#dc2626', marginRight: '0.625rem' }} />
            <span style={{ color: '#7f1d1d', fontWeight: '500', fontSize: '0.875rem' }}>{error}</span>
          </div>
        )}

        {successMessage && (
          <div style={{
            background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
            border: '1px solid #86efac',
            borderRadius: '10px',
            padding: '0.75rem',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            animation: 'slideIn 0.3s ease-out'
          }}>
            <FontAwesomeIcon icon={faCheckCircle} style={{ color: '#16a34a', marginRight: '0.625rem' }} />
            <span style={{ color: '#14532d', fontWeight: '500', fontSize: '0.875rem' }}>{successMessage}</span>
          </div>
        )}

        {!categorySelected ? (
          <div>
            <div style={{
              textAlign: 'center',
              marginBottom: '2rem'
            }}>
              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: '600',
                color: isDarkMode ? '#f1f5f9' : '#1e293b',
                marginBottom: '0.375rem'
              }}>
                Choose Your Request Category
              </h3>
              <p style={{
                fontSize: '0.875rem',
                color: isDarkMode ? '#94a3b8' : '#64748b',
                margin: 0
              }}>
                Select the category that best describes your request
              </p>
            </div>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : isTablet ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
              gap: isMobile ? '0.75rem' : '1.5rem',
              maxWidth: '900px',
              margin: '0 auto',
              justifyContent: 'center'
            }}>
              {cats.map((category, index) => {
                let subheading = '';
                let icon = faTicketAlt;
                let gradientColors = '';
                
                switch (category.name) {
                  case 'Accounts':
                    subheading = 'Billing, invoices & payments';
                    icon = faFileInvoiceDollar;
                    gradientColors = 'linear-gradient(135deg, #059669 0%, #10b981 100%)';
                    break;
                  case 'HR Requests':
                    subheading = 'Onboarding, leave & benefits';
                    icon = faUserTie;
                    gradientColors = 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)';
                    break;
                  case 'IT Requests':
                    subheading = 'Hardware, software & access';
                    icon = faLaptopCode;
                    gradientColors = 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)';
                    break;
                  case 'Operations':
                    subheading = 'Facilities, supplies & events';
                    icon = faTools;
                    gradientColors = 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)';
                    break;
                  case 'Payroll Requests':
                    subheading = 'Payslips, taxes & reimbursements';
                    icon = faMoneyCheckAlt;
                    gradientColors = 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)';
                    break;
                  case 'AI Requests':
                    subheading = 'AI-related requests';
                    icon = faRobot;
                    gradientColors = 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)';
                    break;
                  default:
                    gradientColors = 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)';
                }
                
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => handleCategoryButtonClick(category)}
                    style={{
                      background: gradientColors,
                      border: 'none',
                      borderRadius: isMobile ? '12px' : '16px',
                      padding: isMobile ? '1.25rem 1rem' : '1.5rem 1.125rem',
                      cursor: 'pointer',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: '0 8px 25px rgba(0, 0, 0, 0.1)',
                      position: 'relative',
                      overflow: 'hidden',
                      animationDelay: `${index * 0.1}s`,
                      animation: 'fadeInUp 0.6s ease-out forwards',
                      opacity: 0,
                      transform: 'translateY(20px)',
                      width: '100%',
                      minHeight: isMobile ? 'auto' : '140px'
                    }}
                    onMouseEnter={(e) => {
                      if (!isMobile) {
                        e.currentTarget.style.transform = 'translateY(-6px) scale(1.02)';
                        e.currentTarget.style.boxShadow = '0 15px 35px rgba(0, 0, 0, 0.2)';
                        // Add slight brightness increase
                        e.currentTarget.style.filter = 'brightness(1.1)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isMobile) {
                        e.currentTarget.style.transform = 'translateY(0) scale(1)';
                        e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.1)';
                        e.currentTarget.style.filter = 'brightness(1)';
                      }
                    }}
                    onMouseDown={(e) => {
                      if (!isMobile) {
                        e.currentTarget.style.transform = 'translateY(-2px) scale(0.98)';
                      }
                    }}
                    onMouseUp={(e) => {
                      if (!isMobile) {
                        e.currentTarget.style.transform = 'translateY(-6px) scale(1.02)';
                      }
                    }}
                  >
                    {/* Enhanced shine effect */}
                    <div 
                      style={{
                        position: 'absolute',
                        top: '-50%',
                        left: '-50%',
                        width: '200%',
                        height: '200%',
                        background: 'linear-gradient(45deg, transparent, rgba(255,255,255,0.15), transparent)',
                        transform: 'rotate(45deg) translateX(-100%)',
                        transition: 'transform 0.6s ease',
                        pointerEvents: 'none'
                      }}
                      className="shine-effect"
                    />
                    
                    <div style={{
                      display: 'flex',
                      flexDirection: isMobile ? 'row' : 'column',
                      alignItems: 'center',
                      position: 'relative',
                      zIndex: 1,
                      gap: isMobile ? '1rem' : '0',
                      pointerEvents: 'none' // Prevent child elements from interfering with hover
                    }}>
                      <div style={{
                        background: 'rgba(255, 255, 255, 0.15)',
                        borderRadius: isMobile ? '10px' : '12px',
                        width: isMobile ? '40px' : '48px',
                        height: isMobile ? '40px' : '48px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: isMobile ? '0' : '0.75rem',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        flexShrink: 0,
                        transition: 'all 0.3s ease'
                      }}>
                        <FontAwesomeIcon 
                          icon={icon} 
                          style={{ 
                            fontSize: isMobile ? '1.25rem' : '1.5rem',
                            color: 'white',
                            transition: 'transform 0.3s ease'
                          }} 
                        />
                      </div>
                      <div style={{
                        textAlign: isMobile ? 'left' : 'center',
                        flex: isMobile ? 1 : 'none'
                      }}>
                        <h4 style={{
                          color: 'white',
                          fontSize: isMobile ? '1rem' : '1.125rem',
                          fontWeight: '700',
                          margin: '0 0 0.375rem 0',
                          textShadow: '0 2px 4px rgba(0,0,0,0.2)',
                          transition: 'transform 0.3s ease'
                        }}>
                          {category.name}
                        </h4>
                        {subheading && (
                          <p style={{
                            color: 'rgba(255, 255, 255, 0.9)',
                            fontSize: isMobile ? '0.75rem' : '0.8rem',
                            margin: 0,
                            fontWeight: '400',
                            textAlign: isMobile ? 'left' : 'center',
                            lineHeight: '1.4',
                            textShadow: '0 1px 2px rgba(0,0,0,0.2)',
                            transition: 'opacity 0.3s ease'
                          }}>
                            {subheading}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            
            {cats.length === 0 && !isLoading && !error && (
              <div style={{
                textAlign: 'center',
                padding: '2rem',
                color: isDarkMode ? '#94a3b8' : '#64748b'
              }}>
                <FontAwesomeIcon icon={faSpinner} size="lg" style={{ marginBottom: '0.75rem' }} />
                <p>Loading categories...</p>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ position: 'relative' }}>
            <div style={{
              background: isDarkMode 
                ? 'linear-gradient(135deg, #374151 0%, #4b5563 100%)'
                : 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
              padding: isMobile ? '0.75rem' : '1rem',
              marginBottom: '1.5rem',
              borderRadius: '12px',
              border: isDarkMode ? '1px solid #4b5563' : '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              justifyContent: 'space-between',
              alignItems: isMobile ? 'flex-start' : 'center',
              gap: isMobile ? '0.75rem' : '0',
              boxShadow: '0 3px 10px rgba(0, 0, 0, 0.05)'
            }}>
              <div>
                <span style={{
                  fontSize: '0.8rem',
                  color: isDarkMode ? '#9ca3af' : '#6b7280',
                  fontWeight: '500'
                }}>
                  Selected Category:
                </span>
                <div style={{
                  fontSize: isMobile ? '1rem' : '1.125rem',
                  fontWeight: '700',
                  color: isDarkMode ? '#f3f4f6' : '#1f2937',
                  marginTop: '0.125rem'
                }}>
                  {selectedCategoryName}
                </div>
              </div>
              <button 
                type="button" 
                onClick={handleChangeCategoryClick}
                style={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                  border: 'none',
                  color: 'white',
                  fontSize: isMobile ? '0.75rem' : '0.8rem',
                  fontWeight: '600',
                  padding: isMobile ? '0.5rem 1rem' : '0.625rem 1.25rem',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 3px 10px rgba(59, 130, 246, 0.3)',
                  alignSelf: isMobile ? 'flex-start' : 'auto'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'scale(1.03)';
                  e.target.style.boxShadow = '0 5px 15px rgba(59, 130, 246, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'scale(1)';
                  e.target.style.boxShadow = '0 3px 10px rgba(59, 130, 246, 0.3)';
                }}
              >
                <FontAwesomeIcon icon={faChevronLeft} style={{ marginRight: '0.375rem' }} />
                Change Category
              </button>
            </div>

            {/* Form fields with modern styling */}
            <div style={{ display: 'grid', gap: '1.25rem' }}>
              {isAdmin && (
                <div>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: isDarkMode ? '#f3f4f6' : '#374151',
                    marginBottom: '0.5rem'
                  }}>
                    <FontAwesomeIcon icon={faUsers} style={{ marginRight: '0.5rem', color: '#6366f1' }} />
                    Create Ticket On Behalf Of (Admin)
                  </label>
                  <select
                    id="on_behalf_of_user_id"
                    name="on_behalf_of_user_id"
                    value={selectedOnBehalfOfUserId}
                    onChange={(e) => setSelectedOnBehalfOfUserId(e.target.value)}
                    disabled={isLoadingUsers || allUsers.length === 0}
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      fontSize: '0.875rem',
                      border: isDarkMode ? '2px solid #4b5563' : '2px solid #e5e7eb',
                      borderRadius: '10px',
                      background: isDarkMode ? '#374151' : '#ffffff',
                      color: isDarkMode ? '#f3f4f6' : '#374151',
                      transition: 'all 0.2s ease',
                      cursor: isLoadingUsers || allUsers.length === 0 ? 'not-allowed' : 'pointer'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#6366f1';
                      e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = isDarkMode ? '#4b5563' : '#e5e7eb';
                      e.target.style.boxShadow = 'none';
                    }}
                  >
                    <option value="" disabled> 
                      {isLoadingUsers 
                        ? "Loading users..." 
                        : allUsers.length === 0 
                          ? "No users available" 
                          : "Select User* (Required)"}
                    </option>
                    {/* Option to select themselves explicitly or act as default */}
                    {currentUser && <option value={currentUser.id}>Yourself ({currentUser.email})</option>}
                    {allUsers.map(user => (
                      // Prevent admin from selecting themselves again if already in list from v_user_emails
                      user.id !== currentUser?.id && 
                      <option key={user.id} value={user.id}>
                        {user.email} {/* Display user email, or name if available */}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: isDarkMode ? '#f3f4f6' : '#374151',
                  marginBottom: '0.5rem'
                }}>
                  <FontAwesomeIcon icon={faLayerGroup} style={{ marginRight: '0.5rem', color: '#6366f1' }} />
                  Sub-Category*
                </label>
                <select
                  id="sub_category_id"
                  name="sub_category_id"
                  value={form.sub_category_id || ''}
                  onChange={handleSubCategoryChange}
                  required
                  disabled={subs.length === 0 || isLoading}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    fontSize: '0.875rem',
                    border: isDarkMode ? '2px solid #4b5563' : '2px solid #e5e7eb',
                    borderRadius: '10px',
                    background: isDarkMode ? '#374151' : '#ffffff',
                    color: isDarkMode ? '#f3f4f6' : '#374151',
                    transition: 'all 0.2s ease',
                    cursor: subs.length === 0 || isLoading ? 'not-allowed' : 'pointer'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#6366f1';
                    e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = isDarkMode ? '#4b5563' : '#e5e7eb';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  <option value="" disabled>
                    {isLoading 
                        ? "Loading sub-categories..." 
                        : subs.length === 0 
                            ? (form.category_id ? "No sub-categories available" : "Select a category first")
                            : "Select a Sub-Category"}
                  </option>
                  {subs.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: isDarkMode ? '#f3f4f6' : '#374151',
                  marginBottom: '0.5rem'
                }}>
                  <FontAwesomeIcon icon={faClipboardList} style={{ marginRight: '0.5rem', color: '#6366f1' }} />
                  Ticket Summary*
                </label>
                <input
                  id="title"
                  name="title"
                  type="text"
                  placeholder="Brief description of your request"
                  maxLength={120}
                  value={form.title}
                  onChange={handleInputChange}
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    fontSize: '0.875rem',
                    border: isDarkMode ? '2px solid #4b5563' : '2px solid #e5e7eb',
                    borderRadius: '10px',
                    background: isDarkMode ? '#374151' : '#ffffff',
                    color: isDarkMode ? '#f3f4f6' : '#374151',
                    transition: 'all 0.2s ease'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#6366f1';
                    e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = isDarkMode ? '#4b5563' : '#e5e7eb';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              <div>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: isDarkMode ? '#f3f4f6' : '#374151',
                  marginBottom: '0.5rem'
                }}>
                  <FontAwesomeIcon icon={faClipboardList} style={{ marginRight: '0.5rem', color: '#6366f1' }} />
                  Detailed Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  placeholder="Please provide as much detail as possible to help us address your request"
                  value={form.description}
                  onChange={handleInputChange}
                  rows="4"
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    fontSize: '0.875rem',
                    border: isDarkMode ? '2px solid #4b5563' : '2px solid #e5e7eb',
                    borderRadius: '10px',
                    background: isDarkMode ? '#374151' : '#ffffff',
                    color: isDarkMode ? '#f3f4f6' : '#374151',
                    transition: 'all 0.2s ease',
                    resize: 'vertical',
                    minHeight: '100px'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#6366f1';
                    e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = isDarkMode ? '#4b5563' : '#e5e7eb';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1.25rem' }}>
                <div>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: isDarkMode ? '#f3f4f6' : '#374151',
                    marginBottom: '0.5rem'
                  }}>
                    <FontAwesomeIcon icon={faBuilding} style={{ marginRight: '0.5rem', color: '#6366f1' }} />
                    Client*
                  </label>
                  <select
                    id="client"
                    name="client"
                    value={form.client}
                    onChange={handleInputChange}
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      fontSize: '0.875rem',
                      border: isDarkMode ? '2px solid #4b5563' : '2px solid #e5e7eb',
                      borderRadius: '10px',
                      background: isDarkMode ? '#374151' : '#ffffff',
                      color: isDarkMode ? '#f3f4f6' : '#374151',
                      transition: 'all 0.2s ease',
                      cursor: 'pointer'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#6366f1';
                      e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = isDarkMode ? '#4b5563' : '#e5e7eb';
                      e.target.style.boxShadow = 'none';
                    }}
                  >
                    <option value="" disabled>Select a Client</option>
                    {CLIENT_OPTIONS.map(clientName => (
                      <option key={clientName} value={clientName}>{clientName}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: isDarkMode ? '#f3f4f6' : '#374151',
                    marginBottom: '0.5rem'
                  }}>
                    <FontAwesomeIcon icon={faExclamationTriangle} style={{ marginRight: '0.5rem', color: '#6366f1' }} />
                    Priority*
                  </label>
                  <select
                    id="priority"
                    name="priority"
                    value={form.priority}
                    onChange={handleInputChange}
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      fontSize: '0.875rem',
                      border: isDarkMode ? '2px solid #4b5563' : '2px solid #e5e7eb',
                      borderRadius: '10px',
                      background: isDarkMode ? '#374151' : '#ffffff',
                      color: isDarkMode ? '#f3f4f6' : '#374151',
                      transition: 'all 0.2s ease',
                      cursor: 'pointer'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#6366f1';
                      e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = isDarkMode ? '#4b5563' : '#e5e7eb';
                      e.target.style.boxShadow = 'none';
                    }}
                  >
                    {['Low', 'Medium', 'High', 'Urgent'].map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>

              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>Attachments</Typography>
                <input
                  id="ticket-attachment-input"
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.xls,.xlsx,.csv"
                  onChange={handleAttachmentChange}
                  style={{ display: 'none' }}
                />
                <label htmlFor="ticket-attachment-input">
                  <Button
                    variant="contained"
                    component="span"
                    sx={{
                      background: isDarkMode
                        ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
                        : 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                      color: 'white',
                      fontWeight: 700,
                      borderRadius: '10px',
                      boxShadow: '0 4px 16px rgba(99, 102, 241, 0.15)',
                      px: 2.5,
                      py: 1.25,
                      textTransform: 'none',
                      fontSize: '1rem',
                      mb: 1,
                      '&:hover': {
                        background: isDarkMode
                          ? 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)'
                          : 'linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)',
                        boxShadow: '0 8px 24px rgba(99, 102, 241, 0.22)'
                      }
                    }}
                    startIcon={<FontAwesomeIcon icon={faPaperPlane} style={{ color: 'white' }} />}
                  >
                    Choose Files
                  </Button>
                </label>
                {attachments.length > 0 && (
                  <Typography variant="body2" sx={{ color: isDarkMode ? '#a5b4fc' : '#6366f1', fontWeight: 500, mt: 0.5, mb: 1 }}>
                    {attachments.length} file{attachments.length > 1 ? 's' : ''} selected
                  </Typography>
                )}
                {attachments.length > 0 && (
                  <List dense>
                    {attachments.map((file, idx) => (
                      <ListItem
                        key={idx}
                        secondaryAction={
                          <IconButton edge="end" aria-label="remove" onClick={() => handleRemoveAttachment(idx)}>
                            <DeleteIcon />
                          </IconButton>
                        }
                      >
                        <ListItemText primary={file.name} secondary={`${(file.size/1024).toFixed(1)} KB`} />
                      </ListItem>
                    ))}
                  </List>
                )}
              </Box>

              <button 
                type="submit" 
                disabled={isLoading || !currentUser || !form.sub_category_id || (isAdmin && !selectedOnBehalfOfUserId)}
                style={{
                  background: (isLoading || !currentUser || !form.sub_category_id || (isAdmin && !selectedOnBehalfOfUserId))
                    ? (isDarkMode ? '#4b5563' : '#e5e7eb')
                    : 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                  border: 'none',
                  color: (isLoading || !currentUser || !form.sub_category_id || (isAdmin && !selectedOnBehalfOfUserId))
                    ? (isDarkMode ? '#9ca3af' : '#9ca3af')
                    : 'white',
                  fontSize: '1rem',
                  fontWeight: '700',
                  padding: '1rem 1.5rem',
                  borderRadius: '12px',
                  cursor: (isLoading || !currentUser || !form.sub_category_id || (isAdmin && !selectedOnBehalfOfUserId)) ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  marginTop: '0.75rem',
                  boxShadow: (isLoading || !currentUser || !form.sub_category_id || (isAdmin && !selectedOnBehalfOfUserId)) 
                    ? 'none' 
                    : '0 6px 20px rgba(59, 130, 246, 0.3)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  if (!isLoading && currentUser && form.sub_category_id && !(isAdmin && !selectedOnBehalfOfUserId)) {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 8px 30px rgba(59, 130, 246, 0.4)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isLoading && currentUser && form.sub_category_id && !(isAdmin && !selectedOnBehalfOfUserId)) {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.3)';
                  }
                }}
              >
                {isLoading ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} spin />
                    Submitting...
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faPaperPlane} />
                    Submit Ticket
                  </>
                )}
              </button>
              
              {!currentUser && (
                <div style={{
                  background: isDarkMode 
                    ? 'linear-gradient(135deg, #374151 0%, #4b5563 100%)'
                    : 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                  border: isDarkMode ? '1px solid #6b7280' : '1px solid #f59e0b',
                  borderRadius: '10px',
                  padding: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  marginTop: '0.75rem'
                }}>
                  <FontAwesomeIcon 
                    icon={faInfoCircle} 
                    style={{ 
                      color: isDarkMode ? '#fbbf24' : '#d97706', 
                      marginRight: '0.5rem' 
                    }} 
                  />
                  <span style={{ 
                    color: isDarkMode ? '#fef3c7' : '#92400e',
                    fontWeight: '500',
                    fontSize: '0.875rem'
                  }}>
                    Please log in to submit a ticket.
                  </span>
                </div>
              )}
            </div>
          </form>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeInUp {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
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

        @keyframes shine {
          0% {
            transform: rotate(45deg) translateX(-100%);
          }
          100% {
            transform: rotate(45deg) translateX(100%);
          }
        }

        /* Category card hover effects */
        button:hover .shine-effect {
          animation: shine 0.6s ease-in-out;
        }

        /* Enhanced button hover states */
        button {
          will-change: transform, box-shadow, filter;
        }

        button:active {
          transition: transform 0.1s ease !important;
        }

        /* Prevent text selection on buttons */
        button * {
          user-select: none;
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
        }
      `}</style>
    </div>
  );
} 