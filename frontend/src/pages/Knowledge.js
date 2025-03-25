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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
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
} from '@mui/material';
import { Search as SearchIcon, Add as AddIcon, Upload as UploadIcon } from '@mui/icons-material';
import { knowledgeApi } from '../services/api';
import supabaseService, { supabase } from '../services/supabase';

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
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function Knowledge() {
  const [tabValue, setTabValue] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [file, setFile] = useState(null);
  const [text, setText] = useState('');
  const [showFullText, setShowFullText] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  
  const [newDocument, setNewDocument] = useState({
    title: '',
    text: '',
    source: '',
    category: 'general',
  });
  const [addingDocument, setAddingDocument] = useState(false);
  const [addSuccess, setAddSuccess] = useState(false);
  const [addError, setAddError] = useState('');
  
  // Check if user has access to knowledge base
  useEffect(() => {
    const checkAccess = () => {
      const userStr = localStorage.getItem('user');
      if (!userStr) {
        setHasAccess(false);
        return;
      }
      
      try {
        const user = JSON.parse(userStr);
        // Check if user has knowledge:access permission
        if (user.permissions && user.permissions.includes('knowledge:access')) {
          setHasAccess(true);
        } else if (user.role === 'admin') {
          // Admins always have access
          setHasAccess(true);
        } else {
          setHasAccess(false);
        }
      } catch (err) {
        console.error('Error checking knowledge access:', err);
        setHasAccess(false);
      }
    };
    
    checkAccess();
  }, []);
  
  // Test Supabase connection on component mount
  useEffect(() => {
    const testConnection = async () => {
      try {
        const result = await supabaseService.testConnection();
        if (!result.success) {
          console.error('Supabase connection failed:', result.error);
        }
      } catch (err) {
        console.error('Error testing Supabase connection:', err);
      }
    };
    
    testConnection();
  }, []);
  
  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setAddSuccess(false);
    setAddError('');
  };
  
  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };
  
  // Handle search form submission
  const handleSearch = async (e) => {
    try {
      e.preventDefault();
      setLoading(true);
      // Clear previous messages
      setError('');
      setSuccess('');
      
      if (!searchQuery || searchQuery.trim() === '') {
        setError('Please enter a search query');
        setLoading(false);
        return;
      }

      // Get documents directly from Supabase
      const { data: documents, error } = await supabase
        .from('knowledge_documents')
        .select('*');
      
      if (error) {
        throw error;
      }
      
      if (!documents || documents.length === 0) {
        setError('No documents found in database. Please upload some documents first.');
        setLoading(false);
        return;
      }
      
      // Filter documents on client side that contain the search query
      // Convert search query to lowercase for case-insensitive matching
      const searchQueryLower = searchQuery.toLowerCase();
      
      const filteredDocuments = documents.filter(doc => {
        // Check if document has text field
        if (!doc.text) {
          return false;
        }
        
        const docTextLower = doc.text.toLowerCase();
        const isMatch = docTextLower.includes(searchQueryLower);
        
        return isMatch;
      });
      
      if (filteredDocuments.length === 0) {
        setError('No documents match your search query.');
        setLoading(false);
        return;
      }
      
      // Format documents for display
      const formattedDocuments = filteredDocuments.map(doc => ({
        id: doc.id,
        text: doc.text,
        title: doc.metadata?.title || 'Unknown',
        source: doc.metadata?.source || 'Unknown',
        category: doc.metadata?.category || 'general',
        relevance_score: 1.0
      }));
      
      setSearchResults(formattedDocuments);
      setSuccess(`Found ${formattedDocuments.length} result(s)`);
    } catch (err) {
      console.error('Error in handleSearch:', err);
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
    
    // Validate form
    if (!newDocument.title.trim() || !newDocument.text.trim() || !newDocument.source.trim()) {
      setAddError('Please fill in all required fields');
      return;
    }
    
    setAddingDocument(true);
    setAddSuccess(false);
    setAddError('');
    
    console.log('Attempting to add document:', newDocument);
    
    try {
      // First try using direct Supabase connection
      try {
        console.log('Trying direct Supabase connection...');
        const supabaseResult = await supabaseService.addDocument(newDocument);
        
        if (supabaseResult.success) {
          console.log('Document added successfully via direct Supabase insertion');
          
          // Reset form on success
          setNewDocument({
            title: '',
            text: '',
            source: '',
            category: 'general',
          });
          
          setAddSuccess(true);
          return; // Exit if successful
        } else {
          throw new Error(supabaseResult.error || 'Supabase insertion failed');
        }
      } catch (supabaseError) {
        console.error('Direct Supabase insert failed:', supabaseError);
        
        // Check if this is due to OpenAI unavailability
        if (supabaseError.message && supabaseError.message.includes('Real embeddings required')) {
          console.log('Falling back to API due to real embeddings requirement');
          // We'll continue to the API fallback in this case
        } else if (supabaseError.message && supabaseError.message.includes('OpenAI API')) {
          setAddError(`Cannot add document: OpenAI API is required but not available. 
                      Please provide valid OpenAI credentials.`);
          setAddingDocument(false);
          return; // Don't try API fallback for OpenAI errors
        } else {
          // Continue to API fallback for other types of errors
          console.log('Falling back to API service due to other error:', supabaseError.message);
        }
      }
      
      // Fallback to API
      console.log('Attempting to add document via API...');
      const result = await knowledgeApi.addDocument(newDocument);
      console.log(result.message || 'Document added successfully');
      
      // Reset form on success
      setNewDocument({
        title: '',
        text: '',
        source: '',
        category: 'general',
      });
      
      setAddSuccess(true);
    } catch (error) {
      console.error('Error adding document:', error);
      
      // Special handling for OpenAI API errors
      if (error.message && error.message.includes('OpenAI')) {
        setAddError(`Cannot add document: OpenAI API is required but not available. 
                    Please provide valid OpenAI credentials.`);
      }
      // Detailed error logging for other errors
      else if (error.response) {
        console.error('Error response:', error.response.data);
        console.error('Status code:', error.response.status);
        setAddError(error.response.data?.detail || 'Failed to add document: Server error');
      } else if (error.request) {
        console.error('No response received:', error.request);
        setAddError('Failed to add document: No response from server');
      } else {
        console.error('Error message:', error.message);
        setAddError(`Failed to add document: ${error.message}`);
      }
    } finally {
      setAddingDocument(false);
    }
  };

  const handleFileUpload = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await knowledgeApi.uploadFile(file);
      setSuccess(result.message);
      setFile(null);
      // Reset file input
      document.getElementById('file-input').value = '';
    } catch (err) {
      setError(`Upload failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTextUpload = async () => {
    if (!text.trim()) {
      setError('Please enter some text');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Create document with all required fields
      const metadata = {
        title: "Text Upload " + new Date().toLocaleString(),
        source: "Manual Text Entry",
        category: "general"
      };
      
      console.log('Uploading text with metadata:', metadata);
      const result = await knowledgeApi.uploadDocument(text, metadata);
      setSuccess(result.message);
      setText('');
    } catch (err) {
      setError(`Upload failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Box 
        sx={{
          minHeight: 'calc(100vh - 80px)',
          width: '100vw',
          margin: 0,
          padding: 0,
          position: 'fixed',
          top: 64, // Add space for navbar height
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(135deg, #e0f7fa 0%, #e8f5e9 50%, #f3e5f5 100%)',
          backgroundSize: 'cover',
          backgroundAttachment: 'fixed',
          overflowY: 'auto',
          zIndex: 0, // Lower z-index so navbar stays on top
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100%',
            height: '100%',
            backgroundImage: 'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.5) 0%, transparent 25%), radial-gradient(circle at 80% 70%, rgba(153,204,255,0.3) 0%, transparent 30%)',
            zIndex: 0,
          }
        }}
      />
      <Container maxWidth="md" sx={{ position: 'relative', zIndex: 5, pt: 4, pb: 8 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
          Knowledge Base Management
        </Typography>
        
        {!hasAccess ? (
          <Paper elevation={0} sx={{ 
            borderRadius: 3,
            overflow: 'hidden',
            padding: 4,
            bgcolor: 'rgba(255, 255, 255, 0.65)',
            backdropFilter: 'blur(15px)',
            border: '1px solid rgba(255, 255, 255, 0.6)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
            textAlign: 'center'
          }}>
            <Typography variant="h5" color="error" gutterBottom>
              Access Denied
            </Typography>
            <Typography variant="body1" paragraph>
              You don't have permission to access the Knowledge Base management features.
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              This feature is only available to admin users or accounts with specific permissions.
            </Typography>
            <Button 
              variant="contained" 
              color="primary" 
              sx={{ mt: 3 }}
              onClick={() => window.location.href = '/chat'}
            >
              Return to Chat
            </Button>
          </Paper>
        ) : (
          <Paper elevation={0} sx={{ 
            borderRadius: 3,
            overflow: 'hidden',
            bgcolor: 'rgba(255, 255, 255, 0.65)',
            backdropFilter: 'blur(15px)',
            border: '1px solid rgba(255, 255, 255, 0.6)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)'
          }}>
            <Box sx={{ borderBottom: 1, borderColor: 'rgba(0, 0, 0, 0.08)', bgcolor: 'rgba(255, 255, 255, 0.5)' }}>
              <Tabs 
                value={tabValue} 
                onChange={handleTabChange} 
                aria-label="knowledge base tabs"
                sx={{
                  '& .MuiTab-root': {
                    fontWeight: 500,
                    py: 1.5,
                    '&.Mui-selected': {
                      color: 'primary.main',
                      fontWeight: 600
                    }
                  },
                  '& .MuiTabs-indicator': {
                    height: 3,
                    borderRadius: '3px 3px 0 0'
                  }
                }}
              >
                <Tab label="Search Knowledge Base" />
                <Tab label="Add to Knowledge Base" />
              </Tabs>
            </Box>
            
            {/* Search Tab */}
            <TabPanel value={tabValue} index={0}>
              <Typography variant="h6" gutterBottom>
                Search HR Knowledge Base
              </Typography>
              
              {success && (
                <Alert severity="success" sx={{ 
                  mb: 2, 
                  bgcolor: 'rgba(237, 247, 237, 0.7)',
                  backdropFilter: 'blur(5px)',
                  borderRadius: '8px'
                }}>
                  {success}
                </Alert>
              )}
              
              {error && (
                <Alert severity="error" sx={{ 
                  mb: 2,
                  bgcolor: 'rgba(253, 237, 237, 0.7)',
                  backdropFilter: 'blur(5px)',
                  borderRadius: '8px'
                }}>
                  {error}
                </Alert>
              )}
              
              <Box component="div" sx={{ mb: 4 }}>
                <Grid container spacing={2} component="form" onSubmit={handleSearch}>
                  <Grid item xs={12} sm={9}>
                    <TextField
                      fullWidth
                      label="Search Query"
                      value={searchQuery}
                      onChange={handleSearchChange}
                      placeholder="Type your search query here..."
                      variant="outlined"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && searchQuery.trim()) {
                          e.preventDefault();
                          handleSearch(e);
                        }
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          bgcolor: 'rgba(255, 255, 255, 0.5)',
                          backdropFilter: 'blur(5px)',
                          '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'rgba(0, 0, 0, 0.23)',
                          },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'primary.main',
                          }
                        }
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Button
                      fullWidth
                      type="submit"
                      onClick={handleSearch}
                      variant="contained"
                      color="primary"
                      startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SearchIcon />}
                      disabled={!searchQuery.trim() || loading}
                      sx={{ 
                        height: '100%',
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      {loading ? 'Searching...' : 'Direct Search'}
                    </Button>
                  </Grid>
                </Grid>
                
                {/* Quick test button */}
                <Box mt={2} display="flex" justifyContent="center" gap={2}>
                  <Button
                    size="small"
                    variant="outlined"
                    color="info"
                    sx={{
                      bgcolor: 'rgba(255, 255, 255, 0.3)',
                      backdropFilter: 'blur(5px)',
                      borderColor: 'rgba(0, 0, 0, 0.12)',
                      '&:hover': {
                        bgcolor: 'rgba(255, 255, 255, 0.5)',
                        borderColor: 'primary.light'
                      }
                    }}
                    onClick={async () => {
                      try {
                        setLoading(true);
                        
                        // Direct query without any functions
                        const { data, error } = await supabase
                          .from('knowledge_documents')
                          .select('*');
                        
                        if (error) {
                          throw error;
                        }
                        
                        if (!data || data.length === 0) {
                          setError('No documents found in database!');
                          return;
                        }
                        
                        // Format and display
                        const formattedDocs = data.map(doc => ({
                          id: doc.id,
                          text: doc.text,
                          title: doc.metadata?.title || 'Unknown',
                          source: doc.metadata?.source || 'Unknown',
                          category: doc.metadata?.category || 'general',
                          relevance_score: 1.0
                        }));
                        
                        // Show the documents
                        setSearchResults(formattedDocs);
                        setSuccess(`Showing all ${formattedDocs.length} documents in database.`);
                        
                        // If some documents have text, set as search query to help user
                        if (data[0] && data[0].text) {
                          const sampleWord = data[0].text.split(' ')[0];
                          setSearchQuery(sampleWord);
                        }
                      } catch (err) {
                        console.error('Emergency fetch failed:', err);
                        setError(`Emergency fetch failed: ${err.message}`);
                      } finally {
                        setLoading(false);
                      }
                    }}
                  >
                    Show All Documents
                  </Button>
                </Box>
              </Box>
              
              {searchResults.length > 0 ? (
                <Box>
                  <Typography variant="subtitle1" gutterBottom>
                    {`Found ${searchResults.length} results for "${searchQuery}"`}
                  </Typography>
                  
                  <Box mb={2} display="flex" justifyContent="flex-end">
                    <Button
                      size="small"
                      variant="text"
                      color="primary"
                      onClick={() => setShowFullText(!showFullText)}
                    >
                      {showFullText ? "Show Less" : "Show Full Text"}
                    </Button>
                  </Box>
                  
                  <List sx={{ 
                    bgcolor: 'rgba(255, 255, 255, 0.4)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: 2,
                    overflow: 'hidden',
                    border: '1px solid rgba(255, 255, 255, 0.5)'
                  }}>
                    {searchResults.map((result, index) => (
                      <React.Fragment key={index}>
                        <ListItem alignItems="flex-start">
                          <ListItemText
                            primary={`${result.title} - Match Score: ${((result.score || result.relevance_score || 0) * 100).toFixed(2)}%`}
                            secondary={
                              <React.Fragment>
                                <Typography component="span" variant="body2" color="text.secondary">
                                  Source: {result.source} | Category: {result.category}
                                </Typography>
                                <Typography
                                  component="span"
                                  variant="body2"
                                  color="text.primary"
                                  sx={{ display: 'block', mt: 1 }}
                                >
                                  {result.text ? (result.text.length > 200 && !showFullText
                                    ? `${result.text.substring(0, 200)}...` 
                                    : result.text) : 'No text content'}
                                </Typography>
                              </React.Fragment>
                            }
                          />
                        </ListItem>
                        {index < searchResults.length - 1 && <Divider sx={{ opacity: 0.6 }} />}
                      </React.Fragment>
                    ))}
                  </List>
                </Box>
              ) : (
                <Box mt={2}>
                  <Typography variant="subtitle1">
                    No results found for "{searchQuery}". Try a different search term.
                  </Typography>
                </Box>
              )}
            </TabPanel>
            
            {/* Add Document Tab */}
            <TabPanel value={tabValue} index={1}>
              <Typography variant="h6" gutterBottom>
                Add to Knowledge Base
              </Typography>
              
              {addSuccess && (
                <Alert severity="success" sx={{ 
                  mb: 3, 
                  bgcolor: 'rgba(237, 247, 237, 0.7)',
                  backdropFilter: 'blur(5px)',
                  borderRadius: '8px'
                }}>
                  Document added successfully!
                </Alert>
              )}
              
              {addError && (
                <Alert severity="error" sx={{ 
                  mb: 3,
                  bgcolor: 'rgba(253, 237, 237, 0.7)',
                  backdropFilter: 'blur(5px)',
                  borderRadius: '8px'
                }}>
                  {addError}
                </Alert>
              )}
              
              <Box component="form" onSubmit={handleAddDocument}>
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <TextField
                      required
                      fullWidth
                      label="Document Title"
                      name="title"
                      value={newDocument.title}
                      onChange={handleDocumentChange}
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
                      helperText="e.g., Employee Handbook, HR Policy, etc."
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth required>
                      <InputLabel>Category</InputLabel>
                      <Select
                        name="category"
                        value={newDocument.category}
                        onChange={handleDocumentChange}
                        label="Category"
                      >
                        <MenuItem value="general">General</MenuItem>
                        <MenuItem value="policy">Policy</MenuItem>
                        <MenuItem value="benefits">Benefits</MenuItem>
                        <MenuItem value="leave">Leave</MenuItem>
                        <MenuItem value="payroll">Payroll</MenuItem>
                        <MenuItem value="onboarding">Onboarding</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <TextField
                      required
                      fullWidth
                      multiline
                      rows={8}
                      label="Document Text"
                      name="text"
                      value={newDocument.text}
                      onChange={handleDocumentChange}
                      helperText="The text content of the document that will be searchable"
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Button
                      type="submit"
                      variant="contained"
                      startIcon={addingDocument ? <CircularProgress size={20} color="inherit" /> : <AddIcon />}
                      disabled={addingDocument}
                      sx={{ 
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      {addingDocument ? 'Adding...' : 'Add Document'}
                    </Button>
                  </Grid>
                </Grid>
              </Box>
            </TabPanel>
          </Paper>
        )}
      </Container>
    </>
  );
}

export default Knowledge;
