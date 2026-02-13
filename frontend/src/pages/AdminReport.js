import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Button, Typography, TextField, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, TableSortLabel, Container,
  Card, CardContent, Grid, Chip, Fade, Slide, useMediaQuery,
  useTheme, alpha
} from '@mui/material';
import { 
  Analytics as AnalyticsIcon,
  Download as DownloadIcon,
  Search as SearchIcon,
  CalendarToday as CalendarIcon,
  Assessment as AssessmentIcon,
  Timeline as TimelineIcon,
  PieChart as PieChartIcon,
  BarChart as BarChartIcon,
  TrendingUp as TrendingUpIcon,
  AutoAwesome as AIIcon,
  Refresh as RefreshIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { axiosInstance } from '../services/api';
import { saveAs } from 'file-saver';
import QADashboard from './QADashboard';

const formatDate = d => d.toISOString().slice(0, 10);

const columns = [
  { id: 'session_id',  label: 'Session ID', icon: '🔗' },
  { id: 'user_email',  label: 'User Email', icon: '👤' },
  { id: 'question',    label: 'Question', icon: '❓' },
  { id: 'answer',      label: 'Answer', icon: '💬' },
  { id: 'asked_at',    label: 'Asked At', icon: '📅' },
  { id: 'answered_at', label: 'Answered At', icon: '✅' }
];

// Floating particles animation
const FloatingParticle = ({ delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 100 }}
    animate={{ 
      opacity: [0, 1, 0],
      y: [-100, -200],
      x: [0, Math.random() * 100 - 50]
    }}
    transition={{
      duration: 8,
      delay,
      repeat: Infinity,
      ease: "easeInOut"
    }}
    style={{
      position: 'absolute',
      width: '4px',
      height: '4px',
      borderRadius: '50%',
      background: 'linear-gradient(45deg, #6366f1, #8b5cf6)',
      filter: 'blur(1px)',
      zIndex: 0
    }}
  />
);

export default function AdminReport() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [startDate, setStartDate] = useState(formatDate(new Date(Date.now() - 7*24*3600*1000)));
  const [endDate,   setEndDate]   = useState(formatDate(new Date()));
  const [loading,   setLoading]   = useState(false);
  const [rows,      setRows]      = useState([]);
  const [error,     setError]     = useState('');
  const [sortBy,         setSortBy]         = useState('asked_at');
  const [sortDirection,  setSortDirection]  = useState('desc');
  const [showTable, setShowTable] = useState(false);

  const isDarkMode = theme.palette.mode === 'dark';

  /* ───────── fetch data ───────── */
  const fetchReport = async () => {
    setLoading(true); 
    setError('');
    setShowTable(false);
    
    try {
      const res = await axiosInstance.get('/chat/reports/weekly-qa', {
        params: { start_date: startDate, end_date: endDate }
      });
      const flat = res.data.results.flatMap(r =>
        r.qas.map(qa => ({
          session_id:      r.session_id,
          user_email:      r.user_email,
          ...qa,
          asked_at_ts:     qa.asked_at    ? Date.parse(qa.asked_at)    : 0,
          answered_at_ts:  qa.answered_at ? Date.parse(qa.answered_at) : 0
        }))
      );
      setRows(flat);
      setTimeout(() => setShowTable(true), 500); // Delayed table appearance
    } catch (err) {
      const msg = err?.response?.data?.detail
             ?? err?.response?.data?.message
             ?? `Failed to fetch report (${err?.response?.status || 'network error'})`;
      setError(msg);
    } finally { 
      setLoading(false); 
    }
  };

  /* auto‑load last 7 days on mount */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchReport(); }, []);

  /* csv export */
  const downloadCSV = () => {
    if (!rows.length) return;
    let csv = 'Session ID,User Email,Question,Answer,Asked At,Answered At\n';
    rows.forEach(r => {
      const q = r.question.replace(/"/g,'""').replace(/\n/g,' ');
      const a = r.answer.replace(/"/g,'""').replace(/\n/g,' ');
      csv += `"${r.session_id}","${r.user_email}","${q}","${a}","${r.asked_at}","${r.answered_at}"\n`;
    });
    saveAs(
      new Blob([csv], { type:'text/csv;charset=utf-8;' }),
      `weekly-qa-report-${startDate}_to_${endDate}.csv`
    );
  };

  /* sorting */
  const handleSort = id => {
    if (sortBy === id) setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(id); setSortDirection('asc'); }
  };

  const sortedRows = useMemo(() => {
    const out = [...rows];
    out.sort((a,b) => {
      let av = a[sortBy]; let bv = b[sortBy];
      if (sortBy === 'asked_at')   { av = a.asked_at_ts;   bv = b.asked_at_ts; }
      if (sortBy === 'answered_at'){ av = a.answered_at_ts;bv = b.answered_at_ts; }
      if (av < bv) return sortDirection === 'asc' ? -1 :  1;
      if (av > bv) return sortDirection === 'asc' ?  1 : -1;
      return 0;
    });
    return out;
  }, [rows, sortBy, sortDirection]);

  // Calculate stats for header cards
  const stats = useMemo(() => {
    if (!rows.length) return { totalQuestions: 0, uniqueUsers: 0, avgResponseTime: 0, unansweredQuestions: 0 };
    
    const uniqueUsers = new Set(rows.map(r => r.user_email)).size;
    const responseTimes = rows.filter(r => r.asked_at_ts && r.answered_at_ts)
      .map(r => (r.answered_at_ts - r.asked_at_ts) / 1000);
    const avgResponseTime = responseTimes.length ? 
      (responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) : 0;
    const unansweredQuestions = rows.filter(r => 
      !r.answer || r.answer.toLowerCase().includes('sorry') || 
      r.answer.toLowerCase().includes("don't have")
    ).length;

    return {
      totalQuestions: rows.length,
      uniqueUsers,
      avgResponseTime: Math.round(avgResponseTime),
      unansweredQuestions
    };
  }, [rows]);

  /* ───────── UI ───────── */
  return (
    <Box sx={{ 
      minHeight: '100vh',
      background: isDarkMode 
        ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)'
        : 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 50%, #e2e8f0 100%)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Animated Background Particles */}
      {[...Array(15)].map((_, i) => (
        <FloatingParticle key={i} delay={i * 0.5} />
      ))}

      <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 1, py: 4 }}>
        {/* Hero Header */}
        <Fade in timeout={800}>
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <motion.div
              initial={{ opacity: 0, y: -30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
                <AnalyticsIcon sx={{ 
                  fontSize: { xs: '2rem', md: '3rem' }, 
                  mr: 2,
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  borderRadius: '50%',
                  p: 1,
                  color: 'white'
                }} />
                <Typography variant={isMobile ? "h4" : "h2"} sx={{ 
                  fontWeight: 800,
                  background: 'linear-gradient(135deg, #1e293b 0%, #475569 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  ...(isDarkMode && {
                    background: 'linear-gradient(135deg, #f1f5f9 0%, #cbd5e1 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  })
                }}>
                  Weekly Analytics Report
                </Typography>
              </Box>
              <Typography variant="h6" sx={{ 
                color: isDarkMode ? '#94a3b8' : '#64748b',
                fontWeight: 500,
                maxWidth: '600px',
                mx: 'auto',
                fontSize: { xs: '0.9rem', md: '1.1rem' }
              }}>
                Comprehensive insights into Q&A performance and user engagement metrics
              </Typography>
            </motion.div>
          </Box>
        </Fade>

        {/* Stats Cards */}
        <Fade in timeout={1000} style={{ transitionDelay: '200ms' }}>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {[
              { title: 'Total Questions', value: stats.totalQuestions, icon: <TimelineIcon />, color: '#3b82f6' },
              { title: 'Unique Users', value: stats.uniqueUsers, icon: <PieChartIcon />, color: '#10b981' },
              { title: 'Avg Response Time', value: `${stats.avgResponseTime}s`, icon: <TrendingUpIcon />, color: '#f59e0b' },
              { title: 'Unanswered', value: stats.unansweredQuestions, icon: <BarChartIcon />, color: '#ef4444' }
            ].map((stat, index) => (
              <Grid item xs={6} md={3} key={stat.title}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index, duration: 0.5 }}
                >
                  <Card sx={{
                    background: isDarkMode 
                      ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(51, 65, 85, 0.8) 100%)'
                      : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.9) 100%)',
                    backdropFilter: 'blur(20px)',
                    border: `1px solid ${alpha(stat.color, 0.2)}`,
                    borderRadius: '16px',
                    boxShadow: `0 8px 32px ${alpha(stat.color, 0.1)}`,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: `0 12px 40px ${alpha(stat.color, 0.2)}`
                    }
                  }}>
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box>
                          <Typography variant="body2" sx={{ 
                            color: isDarkMode ? '#94a3b8' : '#64748b',
                            fontSize: { xs: '0.75rem', md: '0.875rem' },
                            fontWeight: 600,
                            mb: 1
                          }}>
                            {stat.title}
                          </Typography>
                          <Typography variant="h4" sx={{ 
                            fontWeight: 800,
                            color: stat.color,
                            fontSize: { xs: '1.5rem', md: '2rem' }
                          }}>
                            {stat.value}
                          </Typography>
                        </Box>
                        <Box sx={{
                          background: `linear-gradient(135deg, ${stat.color}20, ${stat.color}40)`,
                          borderRadius: '12px',
                          p: 1.5,
                          color: stat.color
                        }}>
                          {stat.icon}
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </Fade>

        {/* Controls Card */}
        <Slide in direction="up" timeout={1000} style={{ transitionDelay: '400ms' }}>
          <Card sx={{
            background: isDarkMode 
              ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(51, 65, 85, 0.8) 100%)'
              : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.9) 100%)',
            backdropFilter: 'blur(20px)',
            border: isDarkMode ? '1px solid rgba(51, 65, 85, 0.5)' : '1px solid rgba(226, 232, 240, 0.5)',
            borderRadius: '20px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
            mb: 4,
            overflow: 'hidden',
            position: 'relative'
          }}>
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <SearchIcon sx={{ mr: 2, color: '#6366f1' }} />
                <Typography variant="h6" sx={{ 
                  fontWeight: 700,
                  color: isDarkMode ? '#f1f5f9' : '#1e293b'
                }}>
                  Date Range & Actions
                </Typography>
      </Box>

              <Box sx={{ 
                display: 'flex', 
                gap: 2, 
                flexWrap: 'wrap', 
                alignItems: 'center',
                ...(isMobile && { flexDirection: 'column', alignItems: 'stretch' })
              }}>
                <TextField 
                  label="Start Date" 
                  type="date" 
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)} 
                  InputLabelProps={{ shrink: true }}
                  sx={{
                    minWidth: isMobile ? '100%' : '200px',
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '12px',
                      background: isDarkMode 
                        ? 'rgba(15, 23, 42, 0.5)' 
                        : 'rgba(255, 255, 255, 0.8)',
                      '&:hover': {
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#6366f1'
                        }
                      }
                    }
                  }}
                  InputProps={{
                    startAdornment: <CalendarIcon sx={{ mr: 1, color: '#6366f1' }} />
                  }}
                />
                
                <TextField 
                  label="End Date" 
                  type="date" 
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)} 
                  InputLabelProps={{ shrink: true }}
                  sx={{
                    minWidth: isMobile ? '100%' : '200px',
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '12px',
                      background: isDarkMode 
                        ? 'rgba(15, 23, 42, 0.5)' 
                        : 'rgba(255, 255, 255, 0.8)',
                      '&:hover': {
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#6366f1'
                        }
                      }
                    }
                  }}
                  InputProps={{
                    startAdornment: <CalendarIcon sx={{ mr: 1, color: '#6366f1' }} />
                  }}
                />
                
                <Button 
                  variant="contained" 
                  onClick={fetchReport} 
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
                  sx={{
                    borderRadius: '12px',
                    px: 3,
                    py: 1.5,
                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                    boxShadow: '0 4px 16px rgba(99, 102, 241, 0.3)',
                    textTransform: 'none',
                    fontWeight: 600,
                    minWidth: isMobile ? '100%' : 'auto',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #5856eb 0%, #7c3aed 100%)',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 6px 20px rgba(99, 102, 241, 0.4)'
                    },
                    '&:disabled': {
                      background: 'rgba(99, 102, 241, 0.3)'
                    }
                  }}
                >
                  {loading ? 'Fetching...' : 'Fetch Report'}
                </Button>
                
                {!!rows.length && (
                  <Button 
                    variant="outlined" 
                    onClick={downloadCSV}
                    startIcon={<DownloadIcon />}
                    sx={{
                      borderRadius: '12px',
                      px: 3,
                      py: 1.5,
                      border: '2px solid #10b981',
                      color: '#10b981',
                      textTransform: 'none',
                      fontWeight: 600,
                      minWidth: isMobile ? '100%' : 'auto',
                      '&:hover': {
                        background: 'rgba(16, 185, 129, 0.1)',
                        borderColor: '#059669',
                        transform: 'translateY(-2px)',
                        boxShadow: '0 6px 20px rgba(16, 185, 129, 0.2)'
                      }
                    }}
                  >
                    Export CSV
                  </Button>
                )}
              </Box>
            </CardContent>
          </Card>
        </Slide>

        {/* Error Display */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card sx={{
                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.1) 100%)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '16px',
                mb: 4
              }}>
                <CardContent>
                  <Typography color="error" sx={{ fontWeight: 600 }}>
                    {error}
                  </Typography>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dashboard Charts */}
        <AnimatePresence>
      {!!rows.length && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.8 }}
            >
              <Card sx={{
                background: isDarkMode 
                  ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(51, 65, 85, 0.8) 100%)'
                  : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.9) 100%)',
                backdropFilter: 'blur(20px)',
                border: isDarkMode ? '1px solid rgba(51, 65, 85, 0.5)' : '1px solid rgba(226, 232, 240, 0.5)',
                borderRadius: '20px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                mb: 4
              }}>
                <CardContent sx={{ p: 4 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <AssessmentIcon sx={{ mr: 2, color: '#8b5cf6' }} />
                    <Typography variant="h6" sx={{ 
                      fontWeight: 700,
                      color: isDarkMode ? '#f1f5f9' : '#1e293b'
                    }}>
                      Analytics Dashboard
                    </Typography>
                  </Box>
          <QADashboard rows={rows} />
                </CardContent>
              </Card>
            </motion.div>
      )}
        </AnimatePresence>

        {/* Data Table */}
        <AnimatePresence>
          {!!rows.length && showTable && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <Card sx={{
                background: isDarkMode 
                  ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(51, 65, 85, 0.8) 100%)'
                  : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.9) 100%)',
                backdropFilter: 'blur(20px)',
                border: isDarkMode ? '1px solid rgba(51, 65, 85, 0.5)' : '1px solid rgba(226, 232, 240, 0.5)',
                borderRadius: '20px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                overflow: 'hidden'
              }}>
                <CardContent sx={{ p: 0 }}>
                  <Box sx={{ p: 4, pb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <ViewIcon sx={{ mr: 2, color: '#f59e0b' }} />
                        <Typography variant="h6" sx={{ 
                          fontWeight: 700,
                          color: isDarkMode ? '#f1f5f9' : '#1e293b'
                        }}>
                          Detailed Q&A Data
                        </Typography>
                      </Box>
                      <Chip 
                        label={`${rows.length} entries`}
                        sx={{
                          background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
                          color: 'white',
                          fontWeight: 600
                        }}
                      />
                    </Box>
                  </Box>
                  
                  <TableContainer sx={{ 
                    maxHeight: 600,
                    '&::-webkit-scrollbar': {
                      width: '8px',
                      height: '8px'
                    },
                    '&::-webkit-scrollbar-track': {
                      background: 'rgba(0,0,0,0.1)',
                      borderRadius: '4px'
                    },
                    '&::-webkit-scrollbar-thumb': {
                      background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                      borderRadius: '4px'
                    }
                  }}>
                    <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                {columns.map(col => (
                            <TableCell 
                              key={col.id}
                              sortDirection={sortBy === col.id ? sortDirection : false}
                              sx={{ 
                                fontWeight: 700,
                                cursor: 'pointer',
                                background: isDarkMode 
                                  ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.9) 100%)'
                                  : 'linear-gradient(135deg, rgba(248, 250, 252, 0.9) 0%, rgba(241, 245, 249, 0.9) 100%)',
                                color: isDarkMode ? '#f1f5f9' : '#1e293b',
                                borderBottom: `2px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`,
                                '&:hover': {
                                  background: isDarkMode 
                                    ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(51, 65, 85, 0.9) 100%)'
                                    : 'linear-gradient(135deg, rgba(241, 245, 249, 0.9) 0%, rgba(226, 232, 240, 0.9) 100%)'
                                }
                              }}
                  >
                    <TableSortLabel
                                active={sortBy === col.id}
                                direction={sortBy === col.id ? sortDirection : 'asc'}
                      onClick={() => handleSort(col.id)}
                                sx={{
                                  '& .MuiTableSortLabel-icon': {
                                    color: '#6366f1 !important'
                                  }
                                }}
                    >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <span>{col.icon}</span>
                      {col.label}
                                </Box>
                    </TableSortLabel>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
                        {sortedRows.map((r, idx) => (
                          <TableRow 
                            key={r.session_id + idx}
                    sx={{
                              background: idx % 2 === 0 
                                ? 'transparent'
                                : isDarkMode 
                                  ? 'rgba(51, 65, 85, 0.3)'
                                  : 'rgba(248, 250, 252, 0.5)',
                              '&:hover': {
                                background: isDarkMode 
                                  ? 'rgba(99, 102, 241, 0.1)'
                                  : 'rgba(99, 102, 241, 0.05)',
                                transform: 'scale(1.001)',
                                transition: 'all 0.2s ease'
                              },
                              cursor: 'pointer'
                    }}
                  >
                            <TableCell sx={{ 
                              color: isDarkMode ? '#cbd5e1' : '#475569',
                              fontFamily: 'monospace',
                              fontSize: '0.75rem'
                            }}>
                              {r.session_id}
                            </TableCell>
                            <TableCell sx={{ 
                              color: isDarkMode ? '#94a3b8' : '#64748b',
                              fontWeight: 500
                            }}>
                              {r.user_email}
                            </TableCell>
                            <TableCell sx={{ 
                              color: isDarkMode ? '#f1f5f9' : '#1e293b',
                              maxWidth: '300px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {r.question}
                            </TableCell>
                            <TableCell sx={{ 
                              color: isDarkMode ? '#e2e8f0' : '#334155',
                              maxWidth: '400px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {r.answer}
                            </TableCell>
                            <TableCell sx={{ 
                              color: isDarkMode ? '#94a3b8' : '#64748b',
                              fontSize: '0.75rem'
                            }}>
                              {r.asked_at}
                            </TableCell>
                            <TableCell sx={{ 
                              color: isDarkMode ? '#94a3b8' : '#64748b',
                              fontSize: '0.75rem'
                            }}>
                              {r.answered_at}
                            </TableCell>
                  </TableRow>
                        ))}
            </TableBody>
          </Table>
        </TableContainer>
                </CardContent>
              </Card>
            </motion.div>
      )}
        </AnimatePresence>

        {/* No Data State */}
        <AnimatePresence>
      {!loading && !rows.length && !error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <Card sx={{
                background: isDarkMode 
                  ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(51, 65, 85, 0.8) 100%)'
                  : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.9) 100%)',
                backdropFilter: 'blur(20px)',
                border: isDarkMode ? '1px solid rgba(51, 65, 85, 0.5)' : '1px solid rgba(226, 232, 240, 0.5)',
                borderRadius: '20px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                textAlign: 'center',
                py: 8
              }}>
                <CardContent>
                  <AIIcon sx={{ 
                    fontSize: '4rem', 
                    color: '#94a3b8',
                    mb: 2
                  }} />
                  <Typography variant="h6" sx={{ 
                    color: isDarkMode ? '#94a3b8' : '#64748b',
                    fontWeight: 600
                  }}>
                    No data available for this period
                  </Typography>
                  <Typography variant="body2" sx={{ 
                    color: isDarkMode ? '#64748b' : '#94a3b8',
                    mt: 1
                  }}>
                    Try adjusting your date range to see results
                  </Typography>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </Container>
    </Box>
  );
}
