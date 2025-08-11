import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  Divider,
  useTheme,
  Skeleton,
  Card,
  CardContent,
  Chip,
  IconButton,
  Collapse,
  Fade,
  Slide,
  useMediaQuery
} from '@mui/material';
import { 
  Search as SearchIcon, 
  Add as AddIcon, 
  Upload as UploadIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Description as DescriptionIcon,
  Category as CategoryIcon,
  Source as SourceIcon,
  AutoAwesome as AutoAwesomeIcon,
  Psychology as PsychologyIcon,
  LibraryBooks as LibraryBooksIcon,
  TrendingUp as TrendingUpIcon,
  Clear as ClearIcon,
  FilterList as FilterListIcon
} from '@mui/icons-material';
import { knowledgeApi } from '../services/api';
import supabaseService, { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useDarkMode } from '../contexts/DarkModeContext';

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`knowledge-tabpanel-${index}`}
      aria-labelledby={`knowledge-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Fade in={value === index} timeout={600}>
          <Box sx={{ p: { xs: 2, md: 3 } }}>{children}</Box>
        </Fade>
      )}
    </div>
  );
}

function Knowledge() {
  const { user, isLoading: authIsLoading } = useAuth();
  const { isDarkMode } = useDarkMode();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  const [tabValue, setTabValue] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [showFullText, setShowFullText] = useState(false);
  const [expandedResults, setExpandedResults] = useState({});
  const [selectedCategory, setSelectedCategory] = useState('');
  
  const [newDocument, setNewDocument] = useState({
    title: '',
    text: '',
    source: '',
    category: 'general',
  });
  const [addingDocument, setAddingDocument] = useState(false);
  const [addSuccess, setAddSuccess] = useState(false);
  const [addError, setAddError] = useState('');

  const categories = [
    { value: '', label: 'All Categories', icon: '📚' },
    { value: 'general', label: 'General', icon: '📄' },
    { value: 'policy', label: 'Policy', icon: '📋' },
    { value: 'benefits', label: 'Benefits', icon: '🎯' },
    { value: 'leave', label: 'Leave', icon: '🏖️' },
    { value: 'payroll', label: 'Payroll', icon: '💰' },
    { value: 'onboarding', label: 'Onboarding', icon: '🚀' }
  ];

  // Test Supabase connection on component mount
  useEffect(() => {
    const testConnection = async () => {
      try {
        const result = await supabaseService.testConnection();
        if (!result.success) {
          console.warn('Supabase connection test failed');
        }
        // Removed: console.log('Supabase connection successful');
      } catch (err) {
        console.error('Connection test error:', err);
      }
    };
    testConnection();
  }, []);
  // Handle tab change with smooth transition
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setAddSuccess(false);
    setAddError('');
    setError('');
    setSuccess('');
  };
  
  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  // Clear search and filters
  const handleClearSearch = () => {
    setSearchQuery('');
    setSelectedCategory('');
    setSearchResults([]);
    setSuccess('');
    setError('');
  };

  // Toggle expanded result
  const toggleExpandedResult = (index) => {
    setExpandedResults(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };
  
  // Handle search form submission
  const handleSearch = async (e) => {
    try {
      e.preventDefault();
      setLoading(true);
      setError('');
      setSuccess('');
      
      if (!searchQuery || searchQuery.trim() === '') {
        setError('Please enter a search query');
        setLoading(false);
        return;
      }

      // Get documents directly from Supabase
      let query = supabase.from('knowledge_documents').select('*');
      
      // Apply category filter if selected
      if (selectedCategory) {
        query = query.eq('metadata->>category', selectedCategory);
      }
      
      const { data: documents, error } = await query;
      
      if (error) {
        throw error;
      }
      
      if (!documents || documents.length === 0) {
        setError('No documents found in database. Please upload some documents first.');
        setLoading(false);
        return;
      }
      
      // Filter documents on client side that contain the search query
      const searchQueryLower = searchQuery.toLowerCase();
      
      const filteredDocuments = documents.filter(doc => {
        if (!doc.text) return false;
        
        const docTextLower = doc.text.toLowerCase();
        const titleLower = (doc.metadata?.title || '').toLowerCase();
        const sourceLower = (doc.metadata?.source || '').toLowerCase();
        
        return docTextLower.includes(searchQueryLower) ||
               titleLower.includes(searchQueryLower) ||
               sourceLower.includes(searchQueryLower);
      });
      
      if (filteredDocuments.length === 0) {
        setError('No documents match your search query.');
        setLoading(false);
        return;
      }
      
      // Format documents for display with relevance scoring
      const formattedDocuments = filteredDocuments.map(doc => {
        const text = doc.text || '';
        const title = doc.metadata?.title || '';
        const source = doc.metadata?.source || '';
        
        // Simple relevance scoring based on match frequency and position
        const titleMatches = (title.toLowerCase().match(new RegExp(searchQueryLower, 'g')) || []).length;
        const textMatches = (text.toLowerCase().match(new RegExp(searchQueryLower, 'g')) || []).length;
        const sourceMatches = (source.toLowerCase().match(new RegExp(searchQueryLower, 'g')) || []).length;
        
        const titleBoost = titleMatches * 3;
        const sourceBoost = sourceMatches * 2;
        const relevanceScore = Math.min((titleBoost + sourceBoost + textMatches) / 10, 1);
        
        return {
          id: doc.id,
          text: text,
          title: title || 'Unknown',
          source: source || 'Unknown',
          category: doc.metadata?.category || 'general',
          relevance_score: relevanceScore,
          created_at: doc.created_at
        };
      });
      
      // Sort by relevance score
      formattedDocuments.sort((a, b) => b.relevance_score - a.relevance_score);
      
      setSearchResults(formattedDocuments);
      setSuccess(`Found ${formattedDocuments.length} result(s) matching "${searchQuery}"`);
    } catch (err) {
      setError(`Error searching documents: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle new document form change
  const handleDocumentChange = (e) => {
    const { name, value } = e.target;
    setNewDocument({ ...newDocument, [name]: value });
  };
  
  // Handle adding a new document
  const handleAddDocument = async (e) => {
    e.preventDefault();
    
    if (!newDocument.title.trim() || !newDocument.text.trim() || !newDocument.source.trim()) {
      setAddError('Please fill in all required fields');
      return;
    }
    
    setAddingDocument(true);
    setAddSuccess(false);
    setAddError('');
    
    try {
      const result = await knowledgeApi.addDocument(newDocument);

      if (result.success) {
        setNewDocument({ title: '', text: '', source: '', category: 'general' });
        setAddSuccess(true);
      } else {
        const detail = result.error?.response?.data?.detail || result.error?.message || 'API call failed';
        throw new Error(detail);
      }
    } catch (apiError) {
      setAddError(`Error: ${apiError.message}`);
    } finally {
      setAddingDocument(false);
    }
  };

  // Enhanced skeleton loader
  const renderSearchSkeletons = () => (
    <Box>
      <Skeleton variant="text" width="60%" height={32} sx={{ mb: 2 }} />
      <Grid container spacing={2}>
        {[...Array(3)].map((_, index) => (
          <Grid item xs={12} key={index}>
            <Card sx={{
              background: isDarkMode 
                ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(51, 65, 85, 0.8) 100%)'
                : 'linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(248, 250, 252, 0.8) 100%)',
              backdropFilter: 'blur(20px)',
              borderRadius: '16px',
              border: isDarkMode ? '1px solid rgba(55, 65, 81, 0.5)' : '1px solid rgba(226, 232, 240, 0.5)',
              p: 2
            }}>
              <Box display="flex" gap={2} mb={2}>
                <Skeleton variant="rectangular" width={24} height={24} />
                <Skeleton variant="text" width="40%" height={24} />
                <Skeleton variant="circular" width={60} height={20} />
              </Box>
              <Skeleton variant="text" width="30%" height={20} sx={{ mb: 1 }} />
              <Skeleton variant="rectangular" height={80} />
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  // Show loading indicator if auth is loading
  if (authIsLoading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: isDarkMode 
          ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)'
          : 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)'
      }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <>
      {/* Modern Background */}
      <Box 
        sx={{
          minHeight: '100vh',
          width: '100%',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: isDarkMode 
            ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)'
            : 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #f0f4ff 100%)',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: isDarkMode
              ? `radial-gradient(circle at 20% 30%, rgba(99, 102, 241, 0.15) 0%, transparent 40%),
                 radial-gradient(circle at 80% 70%, rgba(139, 92, 246, 0.1) 0%, transparent 40%),
                 radial-gradient(circle at 40% 80%, rgba(59, 130, 246, 0.1) 0%, transparent 40%)`
              : `radial-gradient(circle at 20% 30%, rgba(99, 102, 241, 0.08) 0%, transparent 40%),
                 radial-gradient(circle at 80% 70%, rgba(139, 92, 246, 0.06) 0%, transparent 40%),
                 radial-gradient(circle at 40% 80%, rgba(59, 130, 246, 0.06) 0%, transparent 40%)`,
            zIndex: 0,
          }
        }}
      />

      {/* Floating particles animation */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 1,
          '&::before, &::after': {
            content: '""',
            position: 'absolute',
            width: '2px',
            height: '2px',
            background: isDarkMode ? 'rgba(255, 255, 255, 0.3)' : 'rgba(99, 102, 241, 0.3)',
            borderRadius: '50%',
            animation: 'float 6s ease-in-out infinite',
          },
          '&::before': {
            top: '20%',
            left: '10%',
            animationDelay: '0s',
          },
          '&::after': {
            top: '60%',
            right: '15%',
            animationDelay: '3s',
          },
          '@keyframes float': {
            '0%, 100%': { transform: 'translateY(0px) scale(1)', opacity: 0.7 },
            '50%': { transform: 'translateY(-20px) scale(1.1)', opacity: 1 },
          }
        }}
      />

      {/* Main Content */}
      <Container 
        maxWidth="lg" 
        sx={{ 
          position: 'relative', 
          zIndex: 10, 
          pt: { xs: 2, md: 4 }, 
          pb: 8,
          minHeight: '100vh'
        }}
      >
        <Slide direction="down" in={true} timeout={800}>
          <Box textAlign="center" mb={4}>
            <Box display="flex" alignItems="center" justifyContent="center" gap={2} mb={2}>
              <Box
                sx={{
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  borderRadius: '50%',
                  width: { xs: 48, md: 56 },
                  height: { xs: 48, md: 56 },
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 25px rgba(99, 102, 241, 0.3)',
                }}
              >
                <PsychologyIcon sx={{ color: 'white', fontSize: { xs: 28, md: 32 } }} />
              </Box>
              <Typography 
                variant={isMobile ? "h4" : "h3"} 
                sx={{ 
                  fontWeight: 800, 
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  letterSpacing: '-0.025em'
                }}
              >
                Knowledge Base
              </Typography>
            </Box>
            <Typography 
              variant="body1" 
              sx={{ 
                color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
                fontSize: { xs: '1rem', md: '1.125rem' },
                maxWidth: '600px',
                mx: 'auto'
              }}
            >
              Intelligent document search and management system powered by AI
            </Typography>
          </Box>
        </Slide>
        
        <Fade in={true} timeout={1000}>
          <Paper 
            elevation={0} 
            sx={{ 
              borderRadius: { xs: '20px', md: '24px' },
              overflow: 'hidden',
              background: isDarkMode 
                ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(51, 65, 85, 0.95) 100%)'
                : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%)',
              backdropFilter: 'blur(20px)',
              border: isDarkMode 
                ? '1px solid rgba(55, 65, 81, 0.5)' 
                : '1px solid rgba(226, 232, 240, 0.5)',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.1)',
              position: 'relative',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '1px',
                background: 'linear-gradient(90deg, transparent, rgba(99, 102, 241, 0.5), transparent)',
              }
            }}
          >
            {/* Enhanced Tabs */}
            <Box sx={{
              background: isDarkMode 
                ? 'linear-gradient(135deg, rgba(55, 65, 81, 0.8) 0%, rgba(75, 85, 99, 0.8) 100%)'
                : 'linear-gradient(135deg, rgba(241, 245, 249, 0.8) 0%, rgba(226, 232, 240, 0.8) 100%)',
              borderBottom: isDarkMode 
                ? '1px solid rgba(55, 65, 81, 0.5)' 
                : '1px solid rgba(226, 232, 240, 0.5)'
            }}>
              <Tabs 
                value={tabValue} 
                onChange={handleTabChange} 
                aria-label="knowledge base tabs"
                variant={isMobile ? "fullWidth" : "standard"}
                sx={{
                  '& .MuiTab-root': {
                    fontWeight: 600,
                    py: { xs: 1.5, md: 2 },
                    px: { xs: 2, md: 3 },
                    fontSize: { xs: '0.875rem', md: '1rem' },
                    color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
                    textTransform: 'none',
                    minHeight: { xs: 48, md: 56 },
                    transition: 'all 0.3s ease',
                    '&.Mui-selected': {
                      color: isDarkMode ? 'white' : '#6366f1',
                      fontWeight: 700,
                      background: isDarkMode 
                        ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)'
                        : 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)',
                    },
                    '&:hover': {
                      background: isDarkMode 
                        ? 'rgba(255, 255, 255, 0.05)' 
                        : 'rgba(99, 102, 241, 0.05)',
                    }
                  },
                  '& .MuiTabs-indicator': {
                    height: 3,
                    borderRadius: '3px 3px 0 0',
                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  }
                }}
              >
                <Tab 
                  label={
                    <Box display="flex" alignItems="center" gap={1}>
                      <SearchIcon fontSize="small" />
                      {!isMobile && "Search Knowledge"}
                      {isMobile && "Search"}
                    </Box>
                  } 
                />
                <Tab 
                  label={
                    <Box display="flex" alignItems="center" gap={1}>
                      <AddIcon fontSize="small" />
                      {!isMobile && "Add Document"}
                      {isMobile && "Add"}
                    </Box>
                  } 
                />
              </Tabs>
            </Box>
            
            {/* Search Tab */}
            <TabPanel value={tabValue} index={0}>
              <Box mb={3}>
                <Typography 
                  variant="h5" 
                  sx={{ 
                    fontWeight: 700, 
                    color: isDarkMode ? '#f3f4f6' : '#1f2937',
                    mb: 1,
                    fontSize: { xs: '1.25rem', md: '1.5rem' }
                  }}
                >
                  🔍 Search Knowledge Base
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: isDarkMode ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)',
                    fontSize: { xs: '0.875rem', md: '1rem' }
                  }}
                >
                  Find relevant information from your knowledge base using AI-powered search
                </Typography>
              </Box>
              
              {/* Alert Messages */}
              <Slide direction="down" in={!!success} timeout={300}>
                <Box>
                  {success && (
                    <Alert 
                      severity="success" 
                      sx={{ 
                        mb: 3, 
                        borderRadius: '12px',
                        background: isDarkMode 
                          ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(21, 128, 61, 0.1) 100%)'
                          : 'linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, rgba(21, 128, 61, 0.08) 100%)',
                        backdropFilter: 'blur(10px)',
                        border: isDarkMode 
                          ? '1px solid rgba(34, 197, 94, 0.2)' 
                          : '1px solid rgba(34, 197, 94, 0.2)',
                        '& .MuiAlert-icon': {
                          color: '#22c55e'
                        },
                        '& .MuiAlert-message': {
                          color: isDarkMode ? '#f3f4f6' : '#1f2937',
                          fontWeight: 500
                        }
                      }}
                    >
                      {success}
                    </Alert>
                  )}
                </Box>
              </Slide>
              
              <Slide direction="down" in={!!error} timeout={300}>
                <Box>
                  {error && (
                    <Alert 
                      severity="error" 
                      sx={{ 
                        mb: 3,
                        borderRadius: '12px',
                        background: isDarkMode 
                          ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(185, 28, 28, 0.1) 100%)'
                          : 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(185, 28, 28, 0.08) 100%)',
                        backdropFilter: 'blur(10px)',
                        border: isDarkMode 
                          ? '1px solid rgba(239, 68, 68, 0.2)' 
                          : '1px solid rgba(239, 68, 68, 0.2)',
                        '& .MuiAlert-icon': {
                          color: '#ef4444'
                        },
                        '& .MuiAlert-message': {
                          color: isDarkMode ? '#f3f4f6' : '#1f2937',
                          fontWeight: 500
                        }
                      }}
                    >
                      {error}
                    </Alert>
                  )}
                </Box>
              </Slide>
              
              {/* Enhanced Search Form */}
              <Box mb={4}>
                <Grid container spacing={2}>
                  {/* Search Bar */}
                  <Grid item xs={12} md={8}>
                    <Box
                      component="form"
                      onSubmit={handleSearch}
                      sx={{
                        position: 'relative',
                        background: isDarkMode 
                          ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(51, 65, 85, 0.8) 100%)'
                          : 'linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(248, 250, 252, 0.8) 100%)',
                        backdropFilter: 'blur(10px)',
                        borderRadius: '16px',
                        border: isDarkMode 
                          ? '1px solid rgba(55, 65, 81, 0.5)' 
                          : '1px solid rgba(226, 232, 240, 0.5)',
                        overflow: 'hidden',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          border: isDarkMode 
                            ? '1px solid rgba(99, 102, 241, 0.5)' 
                            : '1px solid rgba(99, 102, 241, 0.3)',
                          boxShadow: '0 8px 25px rgba(99, 102, 241, 0.15)'
                        },
                        '&:focus-within': {
                          border: isDarkMode 
                            ? '1px solid rgba(99, 102, 241, 0.7)' 
                            : '1px solid rgba(99, 102, 241, 0.5)',
                          boxShadow: '0 12px 35px rgba(99, 102, 241, 0.2)'
                        }
                      }}
                    >
                      <TextField
                        fullWidth
                        placeholder="Search your knowledge base..."
                        value={searchQuery}
                        onChange={handleSearchChange}
                        variant="outlined"
                        InputProps={{
                          startAdornment: (
                            <Box sx={{ mr: 1, display: 'flex', alignItems: 'center' }}>
                              <AutoAwesomeIcon sx={{ 
                                color: isDarkMode ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)',
                                fontSize: 20
                              }} />
                            </Box>
                          ),
                          endAdornment: searchQuery && (
                            <IconButton
                              size="small"
                              onClick={handleClearSearch}
                              sx={{ 
                                color: isDarkMode ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)',
                                '&:hover': {
                                  color: isDarkMode ? 'white' : 'black',
                                  background: isDarkMode 
                                    ? 'rgba(255, 255, 255, 0.1)' 
                                    : 'rgba(0, 0, 0, 0.05)'
                                }
                              }}
                            >
                              <ClearIcon fontSize="small" />
                            </IconButton>
                          ),
                          sx: {
                            '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                            color: isDarkMode ? '#f3f4f6' : '#1f2937',
                            fontSize: { xs: '1rem', md: '1.125rem' },
                            py: { xs: 1, md: 1.5 },
                            px: 2,
                            '&::placeholder': {
                              color: isDarkMode ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)',
                              opacity: 1
                            }
                          }
                        }}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && searchQuery.trim()) {
                            e.preventDefault();
                            handleSearch(e);
                          }
                        }}
                      />
                    </Box>
                  </Grid>
                  
                  {/* Category Filter */}
                  <Grid item xs={12} md={4}>
                    <FormControl fullWidth>
                      <Box
                        sx={{
                          background: isDarkMode 
                            ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(51, 65, 85, 0.8) 100%)'
                            : 'linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(248, 250, 252, 0.8) 100%)',
                          backdropFilter: 'blur(10px)',
                          borderRadius: '16px',
                          border: isDarkMode 
                            ? '1px solid rgba(55, 65, 81, 0.5)' 
                            : '1px solid rgba(226, 232, 240, 0.5)',
                        }}
                      >
                        <Select
                          value={selectedCategory}
                          onChange={(e) => setSelectedCategory(e.target.value)}
                          displayEmpty
                          startAdornment={
                            <FilterListIcon sx={{ 
                              mr: 1, 
                              color: isDarkMode ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)',
                              fontSize: 20
                            }} />
                          }
                          sx={{
                            '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                            color: isDarkMode ? '#f3f4f6' : '#1f2937',
                            py: { xs: 1, md: 1.5 },
                            px: 2,
                            '& .MuiSelect-icon': {
                              color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)'
                            }
                          }}
                          MenuProps={{
                            PaperProps: {
                              sx: { 
                                bgcolor: isDarkMode ? '#374151' : 'white',
                                backdropFilter: 'blur(20px)',
                                borderRadius: '12px',
                                border: isDarkMode 
                                  ? '1px solid rgba(55, 65, 81, 0.5)' 
                                  : '1px solid rgba(226, 232, 240, 0.5)',
                                mt: 1,
                                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)'
                              },
                            },
                          }}
                        >
                          {categories.slice(1).map((category) => (
                            <MenuItem key={category.value} value={category.value}>
                              <Box display="flex" alignItems="center" gap={1}>
                                <span>{category.icon}</span>
                                {category.label}
                              </Box>
                            </MenuItem>
                          ))}
                        </Select>
                      </Box>
                    </FormControl>
                  </Grid>
                </Grid>
                
                {/* Search Buttons */}
                <Box mt={3} display="flex" gap={2} flexWrap="wrap">
                  <Button
                    onClick={handleSearch}
                    variant="contained"
                    size="large"
                    startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SearchIcon />}
                    disabled={!searchQuery.trim() || loading}
                    sx={{ 
                      borderRadius: '12px',
                      px: { xs: 3, md: 4 },
                      py: 1.5,
                      fontSize: { xs: '0.875rem', md: '1rem' },
                      fontWeight: 600,
                      background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                      boxShadow: '0 8px 25px rgba(99, 102, 241, 0.3)',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #5b5bf6 0%, #7c3aed 100%)',
                        boxShadow: '0 12px 35px rgba(99, 102, 241, 0.4)',
                        transform: 'translateY(-2px)'
                      },
                      '&:disabled': {
                        background: isDarkMode ? 'rgba(75, 85, 99, 0.5)' : 'rgba(156, 163, 175, 0.5)',
                        boxShadow: 'none',
                        transform: 'none'
                      }
                    }}
                  >
                    {loading ? 'Searching...' : 'Search'}
                  </Button>
                  
                  <Button
                    variant="outlined"
                    size="large"
                    startIcon={<LibraryBooksIcon />}
                    onClick={async () => {
                      try {
                        setLoading(true);
                        const { data, error } = await supabase
                          .from('knowledge_documents')
                          .select('*')
                          .order('created_at', { ascending: false });
                        
                        if (error) throw error;
                        
                        if (!data || data.length === 0) {
                          setError('No documents found in database!');
                          return;
                        }
                        
                        const formattedDocs = data.map(doc => ({
                          id: doc.id,
                          text: doc.text,
                          title: doc.metadata?.title || 'Unknown',
                          source: doc.metadata?.source || 'Unknown',
                          category: doc.metadata?.category || 'general',
                          relevance_score: 1.0,
                          created_at: doc.created_at
                        }));
                        
                        setSearchResults(formattedDocs);
                        setSuccess(`Showing all ${formattedDocs.length} documents in database.`);
                        setSearchQuery('');
                      } catch (err) {
                        setError(`Failed to fetch documents: ${err.message}`);
                      } finally {
                        setLoading(false);
                      }
                    }}
                    sx={{ 
                      borderRadius: '12px',
                      px: { xs: 2, md: 3 },
                      py: 1.5,
                      fontSize: { xs: '0.875rem', md: '1rem' },
                      fontWeight: 600,
                      borderColor: isDarkMode ? 'rgba(99, 102, 241, 0.5)' : '#6366f1',
                      color: isDarkMode ? '#a5b4fc' : '#6366f1',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        borderColor: '#6366f1',
                        background: isDarkMode 
                          ? 'rgba(99, 102, 241, 0.1)' 
                          : 'rgba(99, 102, 241, 0.05)',
                        transform: 'translateY(-1px)'
                      }
                    }}
                  >
                    Show All
                  </Button>
                </Box>
              </Box>
              
              {/* Search Results */}
              {loading ? (
                renderSearchSkeletons()
              ) : searchResults.length > 0 ? (
                <Box>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                    <Typography 
                      variant="h6" 
                      sx={{ 
                        fontWeight: 600, 
                        color: isDarkMode ? '#f3f4f6' : '#1f2937',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1
                      }}
                    >
                      <TrendingUpIcon />
                      {searchResults.length} Results
                    </Typography>
                    
                    <Button
                      size="small"
                      variant="text"
                      onClick={() => setShowFullText(!showFullText)}
                      sx={{
                        color: isDarkMode ? '#a5b4fc' : '#6366f1',
                        fontWeight: 500,
                        '&:hover': {
                          background: isDarkMode 
                            ? 'rgba(99, 102, 241, 0.1)' 
                            : 'rgba(99, 102, 241, 0.05)',
                        }
                      }}
                    >
                      {showFullText ? "Show Less" : "Show Full Text"}
                    </Button>
                  </Box>
                  
                  <Grid container spacing={3}>
                    {searchResults.map((result, index) => (
                      <Grid item xs={12} key={index}>
                        <Fade in={true} timeout={300 + index * 100}>
                          <Card sx={{
                            background: isDarkMode 
                              ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(51, 65, 85, 0.8) 100%)'
                              : 'linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(248, 250, 252, 0.8) 100%)',
                            backdropFilter: 'blur(20px)',
                            borderRadius: '16px',
                            border: isDarkMode 
                              ? '1px solid rgba(55, 65, 81, 0.5)' 
                              : '1px solid rgba(226, 232, 240, 0.5)',
                            transition: 'all 0.3s ease',
                            cursor: 'pointer',
                            '&:hover': {
                              transform: 'translateY(-4px)',
                              boxShadow: '0 12px 35px rgba(0, 0, 0, 0.15)',
                              border: isDarkMode 
                                ? '1px solid rgba(99, 102, 241, 0.5)' 
                                : '1px solid rgba(99, 102, 241, 0.3)',
                            }
                          }}>
                            <CardContent sx={{ p: 3 }}>
                              {/* Header */}
                              <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                                <Box flex={1}>
                                  <Box display="flex" alignItems="center" gap={2} mb={1}>
                                    <DescriptionIcon sx={{ 
                                      color: isDarkMode ? '#a5b4fc' : '#6366f1',
                                      fontSize: 20
                                    }} />
                                    <Typography variant="h6" sx={{ 
                                      fontWeight: 700, 
                                      color: isDarkMode ? '#f3f4f6' : '#1f2937',
                                      fontSize: { xs: '1rem', md: '1.125rem' }
                                    }}>
                                      {result.title}
                                    </Typography>
                                  </Box>
                                  
                                  <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
                                    <Chip
                                      icon={<CategoryIcon fontSize="small" />}
                                      label={result.category}
                                      size="small"
                                      sx={{
                                        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                        color: 'white',
                                        fontWeight: 600,
                                        '& .MuiChip-icon': { color: 'white' }
                                      }}
                                    />
                                    <Chip
                                      icon={<SourceIcon fontSize="small" />}
                                      label={result.source}
                                      size="small"
                                      variant="outlined"
                                      sx={{
                                        borderColor: isDarkMode ? 'rgba(99, 102, 241, 0.5)' : '#6366f1',
                                        color: isDarkMode ? '#a5b4fc' : '#6366f1',
                                        '& .MuiChip-icon': { 
                                          color: isDarkMode ? '#a5b4fc' : '#6366f1' 
                                        }
                                      }}
                                    />
                                    <Chip
                                      label={`${Math.round((result.relevance_score || 0) * 100)}% match`}
                                      size="small"
                                      sx={{
                                        background: isDarkMode 
                                          ? 'rgba(34, 197, 94, 0.1)' 
                                          : 'rgba(34, 197, 94, 0.1)',
                                        color: '#22c55e',
                                        fontWeight: 600
                                      }}
                                    />
                                  </Box>
                                </Box>
                                
                                <IconButton
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleExpandedResult(index);
                                  }}
                                  sx={{
                                    color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)',
                                    '&:hover': {
                                      background: isDarkMode 
                                        ? 'rgba(255, 255, 255, 0.1)' 
                                        : 'rgba(0, 0, 0, 0.05)',
                                    }
                                  }}
                                >
                                  {expandedResults[index] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                </IconButton>
                              </Box>
                              
                              {/* Content */}
                              <Collapse in={expandedResults[index] || showFullText}>
                                <Typography
                                  variant="body2"
                                  sx={{
                                    color: isDarkMode ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.7)',
                                    lineHeight: 1.6,
                                    fontSize: { xs: '0.875rem', md: '1rem' },
                                    whiteSpace: 'pre-wrap',
                                    background: isDarkMode 
                                      ? 'rgba(30, 41, 59, 0.5)' 
                                      : 'rgba(248, 250, 252, 0.5)',
                                    padding: 2,
                                    borderRadius: '12px',
                                    border: isDarkMode 
                                      ? '1px solid rgba(55, 65, 81, 0.3)' 
                                      : '1px solid rgba(226, 232, 240, 0.3)',
                                  }}
                                >
                                  {result.text || 'No content available'}
                                </Typography>
                              </Collapse>
                              
                              {!expandedResults[index] && !showFullText && (
                                <Typography
                                  variant="body2"
                                  sx={{
                                    color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
                                    lineHeight: 1.6,
                                    fontSize: { xs: '0.875rem', md: '1rem' }
                                  }}
                                >
                                  {result.text ? (result.text.length > 200 
                                    ? `${result.text.substring(0, 200)}...` 
                                    : result.text) : 'No content available'}
                                </Typography>
                              )}
                              
                              {result.created_at && (
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: isDarkMode ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)',
                                    display: 'block',
                                    mt: 2,
                                    fontStyle: 'italic'
                                  }}
                                >
                                  Created: {new Date(result.created_at).toLocaleDateString()}
                                </Typography>
                              )}
                            </CardContent>
                          </Card>
                        </Fade>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              ) : searchQuery && !loading && (
                <Box 
                  textAlign="center" 
                  py={6}
                  sx={{
                    background: isDarkMode 
                      ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.3) 0%, rgba(51, 65, 85, 0.3) 100%)'
                      : 'linear-gradient(135deg, rgba(248, 250, 252, 0.5) 0%, rgba(241, 245, 249, 0.5) 100%)',
                    borderRadius: '16px',
                    border: isDarkMode 
                      ? '1px solid rgba(55, 65, 81, 0.3)' 
                      : '1px solid rgba(226, 232, 240, 0.3)',
                  }}
                >
                  <SearchIcon sx={{ 
                    fontSize: 48, 
                    color: isDarkMode ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)',
                    mb: 2 
                  }} />
                  <Typography variant="h6" sx={{ 
                    color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
                    fontWeight: 600,
                    mb: 1
                  }}>
                    No results found
                  </Typography>
                  <Typography variant="body2" sx={{ 
                    color: isDarkMode ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)',
                  }}>
                    Try adjusting your search terms or browse all documents
                  </Typography>
                </Box>
              )}
            </TabPanel>
            
            {/* Add Document Tab */}
            <TabPanel value={tabValue} index={1}>
              <Box mb={3}>
                <Typography 
                  variant="h5" 
                  sx={{ 
                    fontWeight: 700, 
                    color: isDarkMode ? '#f3f4f6' : '#1f2937',
                    mb: 1,
                    fontSize: { xs: '1.25rem', md: '1.5rem' }
                  }}
                >
                  📚 Add New Document
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: isDarkMode ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)',
                    fontSize: { xs: '0.875rem', md: '1rem' }
                  }}
                >
                  Expand your knowledge base by adding new documents and information
                </Typography>
              </Box>
              
              {/* Alert Messages */}
              <Slide direction="down" in={addSuccess} timeout={300}>
                <Box>
                  {addSuccess && (
                    <Alert 
                      severity="success" 
                      sx={{ 
                        mb: 3, 
                        borderRadius: '12px',
                        background: isDarkMode 
                          ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(21, 128, 61, 0.1) 100%)'
                          : 'linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, rgba(21, 128, 61, 0.08) 100%)',
                        backdropFilter: 'blur(10px)',
                        border: isDarkMode 
                          ? '1px solid rgba(34, 197, 94, 0.2)' 
                          : '1px solid rgba(34, 197, 94, 0.2)',
                        '& .MuiAlert-icon': {
                          color: '#22c55e'
                        },
                        '& .MuiAlert-message': {
                          color: isDarkMode ? '#f3f4f6' : '#1f2937',
                          fontWeight: 500
                        }
                      }}
                    >
                      Document added successfully! 🎉
                    </Alert>
                  )}
                </Box>
              </Slide>
              
              <Slide direction="down" in={!!addError} timeout={300}>
                <Box>
                  {addError && (
                    <Alert 
                      severity="error" 
                      sx={{ 
                        mb: 3,
                        borderRadius: '12px',
                        background: isDarkMode 
                          ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(185, 28, 28, 0.1) 100%)'
                          : 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(185, 28, 28, 0.08) 100%)',
                        backdropFilter: 'blur(10px)',
                        border: isDarkMode 
                          ? '1px solid rgba(239, 68, 68, 0.2)' 
                          : '1px solid rgba(239, 68, 68, 0.2)',
                        '& .MuiAlert-icon': {
                          color: '#ef4444'
                        },
                        '& .MuiAlert-message': {
                          color: isDarkMode ? '#f3f4f6' : '#1f2937',
                          fontWeight: 500
                        }
                      }}
                    >
                      {addError}
                    </Alert>
                  )}
                </Box>
              </Slide>
              
              {/* Enhanced Form */}
              <Box 
                component="form" 
                onSubmit={handleAddDocument}
                sx={{
                  background: isDarkMode 
                    ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.5) 0%, rgba(51, 65, 85, 0.5) 100%)'
                    : 'linear-gradient(135deg, rgba(255, 255, 255, 0.5) 0%, rgba(248, 250, 252, 0.5) 100%)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: '20px',
                  border: isDarkMode 
                    ? '1px solid rgba(55, 65, 81, 0.5)' 
                    : '1px solid rgba(226, 232, 240, 0.5)',
                  p: { xs: 3, md: 4 }
                }}
              >
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <TextField
                      required
                      fullWidth
                      label="Document Title"
                      name="title"
                      value={newDocument.title}
                      onChange={handleDocumentChange}
                      placeholder="Enter a descriptive title for your document"
                      sx={{
                        '& label': {
                          color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
                          fontWeight: 600
                        },
                        '& label.Mui-focused': {
                          color: isDarkMode ? '#a5b4fc' : '#6366f1',
                        },
                        '& .MuiOutlinedInput-root': {
                          color: isDarkMode ? '#f3f4f6' : '#1f2937',
                          background: isDarkMode 
                            ? 'rgba(30, 41, 59, 0.5)' 
                            : 'rgba(255, 255, 255, 0.7)',
                          backdropFilter: 'blur(10px)',
                          borderRadius: '12px',
                          '& fieldset': {
                            borderColor: isDarkMode 
                              ? 'rgba(55, 65, 81, 0.5)' 
                              : 'rgba(226, 232, 240, 0.5)',
                          },
                          '&:hover fieldset': {
                            borderColor: isDarkMode 
                              ? 'rgba(99, 102, 241, 0.5)' 
                              : 'rgba(99, 102, 241, 0.3)',
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: isDarkMode ? '#a5b4fc' : '#6366f1',
                            borderWidth: '2px'
                          },
                        },
                      }}
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <TextField
                      required
                      fullWidth
                      label="Source"
                      name="source"
                      value={newDocument.source}
                      onChange={handleDocumentChange}
                      placeholder="e.g., Employee Handbook, HR Policy"
                      helperText="Where did this information come from?"
                      sx={{
                        '& label': {
                          color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
                          fontWeight: 600
                        },
                        '& label.Mui-focused': {
                          color: isDarkMode ? '#a5b4fc' : '#6366f1',
                        },
                        '& .MuiOutlinedInput-root': {
                          color: isDarkMode ? '#f3f4f6' : '#1f2937',
                          background: isDarkMode 
                            ? 'rgba(30, 41, 59, 0.5)' 
                            : 'rgba(255, 255, 255, 0.7)',
                          backdropFilter: 'blur(10px)',
                          borderRadius: '12px',
                          '& fieldset': {
                            borderColor: isDarkMode 
                              ? 'rgba(55, 65, 81, 0.5)' 
                              : 'rgba(226, 232, 240, 0.5)',
                          },
                          '&:hover fieldset': {
                            borderColor: isDarkMode 
                              ? 'rgba(99, 102, 241, 0.5)' 
                              : 'rgba(99, 102, 241, 0.3)',
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: isDarkMode ? '#a5b4fc' : '#6366f1',
                            borderWidth: '2px'
                          },
                        },
                        '& .MuiFormHelperText-root': {
                          color: isDarkMode ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)',
                          fontWeight: 500
                        }
                      }}
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth required>
                      <InputLabel sx={{
                        color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
                        fontWeight: 600,
                        '&.Mui-focused': {
                          color: isDarkMode ? '#a5b4fc' : '#6366f1',
                        }
                      }}>
                        Category
                      </InputLabel>
                      <Select
                        name="category"
                        value={newDocument.category}
                        onChange={handleDocumentChange}
                        label="Category"
                        sx={{
                          color: isDarkMode ? '#f3f4f6' : '#1f2937',
                          background: isDarkMode 
                            ? 'rgba(30, 41, 59, 0.5)' 
                            : 'rgba(255, 255, 255, 0.7)',
                          backdropFilter: 'blur(10px)',
                          borderRadius: '12px',
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: isDarkMode 
                              ? 'rgba(55, 65, 81, 0.5)' 
                              : 'rgba(226, 232, 240, 0.5)',
                          },
                          '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: isDarkMode 
                              ? 'rgba(99, 102, 241, 0.5)' 
                              : 'rgba(99, 102, 241, 0.3)',
                          },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                            borderColor: isDarkMode ? '#a5b4fc' : '#6366f1',
                            borderWidth: '2px'
                          },
                          '& .MuiSelect-icon': {
                            color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)',
                          },
                        }}
                        MenuProps={{
                          PaperProps: {
                            sx: { 
                              bgcolor: isDarkMode ? '#374151' : 'white',
                              backdropFilter: 'blur(20px)',
                              borderRadius: '12px',
                              border: isDarkMode 
                                ? '1px solid rgba(55, 65, 81, 0.5)' 
                                : '1px solid rgba(226, 232, 240, 0.5)',
                              mt: 1,
                              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)'
                            },
                          },
                        }}
                      >
                        {categories.slice(1).map((category) => (
                          <MenuItem key={category.value} value={category.value}>
                            <Box display="flex" alignItems="center" gap={1}>
                              <span>{category.icon}</span>
                              {category.label}
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <TextField
                      required
                      fullWidth
                      multiline
                      rows={8}
                      label="Document Content"
                      name="text"
                      value={newDocument.text}
                      onChange={handleDocumentChange}
                      placeholder="Enter the full content of your document here..."
                      helperText="This content will be searchable in the knowledge base"
                      sx={{
                        '& label': {
                          color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
                          fontWeight: 600
                        },
                        '& label.Mui-focused': {
                          color: isDarkMode ? '#a5b4fc' : '#6366f1',
                        },
                        '& .MuiOutlinedInput-root': {
                          color: isDarkMode ? '#f3f4f6' : '#1f2937',
                          background: isDarkMode 
                            ? 'rgba(30, 41, 59, 0.5)' 
                            : 'rgba(255, 255, 255, 0.7)',
                          backdropFilter: 'blur(10px)',
                          borderRadius: '12px',
                          '& fieldset': {
                            borderColor: isDarkMode 
                              ? 'rgba(55, 65, 81, 0.5)' 
                              : 'rgba(226, 232, 240, 0.5)',
                          },
                          '&:hover fieldset': {
                            borderColor: isDarkMode 
                              ? 'rgba(99, 102, 241, 0.5)' 
                              : 'rgba(99, 102, 241, 0.3)',
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: isDarkMode ? '#a5b4fc' : '#6366f1',
                            borderWidth: '2px'
                          },
                        },
                        '& .MuiFormHelperText-root': {
                          color: isDarkMode ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)',
                          fontWeight: 500
                        }
                      }}
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Button
                      type="submit"
                      variant="contained"
                      size="large"
                      startIcon={addingDocument ? <CircularProgress size={20} color="inherit" /> : <AddIcon />}
                      disabled={addingDocument}
                      sx={{ 
                        borderRadius: '12px',
                        px: { xs: 4, md: 6 },
                        py: 1.5,
                        fontSize: { xs: '1rem', md: '1.125rem' },
                        fontWeight: 700,
                        background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                        boxShadow: '0 8px 25px rgba(5, 150, 105, 0.3)',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #047857 0%, #059669 100%)',
                          boxShadow: '0 12px 35px rgba(5, 150, 105, 0.4)',
                          transform: 'translateY(-2px)'
                        },
                        '&:disabled': {
                          background: isDarkMode ? 'rgba(75, 85, 99, 0.5)' : 'rgba(156, 163, 175, 0.5)',
                          boxShadow: 'none',
                          transform: 'none'
                        }
                      }}
                    >
                      {addingDocument ? 'Adding Document...' : 'Add to Knowledge Base'}
                    </Button>
                  </Grid>
                </Grid>
              </Box>
            </TabPanel>
          </Paper>
        </Fade>
      </Container>
    </>
  );
}

export default Knowledge;
