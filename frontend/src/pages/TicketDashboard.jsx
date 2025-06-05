import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line
} from 'recharts';
import { supabase } from '../services/supabase';
import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  Typography,
  useMediaQuery,
  useTheme
} from '@mui/material';
import {
  ConfirmationNumber as TicketIcon,
  Speed as SpeedIcon,
  Assessment as AssessmentIcon,
  DonutLarge as DonutLargeIcon,
  AccessTime as AccessTimeIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

//------------------------------------------------------------------
// Constants
//------------------------------------------------------------------
const CHART_CARD_HEIGHT = 400; // px – every chart card shares a fixed height
const CHART_COLORS = [
  '#6366f1',
  '#8b5cf6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#06b6d4'
];

//------------------------------------------------------------------
// Helper utilities
//------------------------------------------------------------------
const capitalize = (s = '') => s.charAt(0).toUpperCase() + s.slice(1);
const formatNameFromEmail = (email = '') => {
  if (!email) return 'User';
  const lower = email.toLowerCase();
  if (lower === 'hr@othainsoft.com') return 'HR Admin';
  if (lower === 'it@othainsoft.com') return 'IT Admin';
  if (lower === 'accounts@othainsoft.com') return 'Accounts Admin';

  const [local] = lower.split('@');
  const parts = local.split('.');
  if (parts.length >= 2) return `${capitalize(parts[0])} ${capitalize(parts[1])}`;
  return capitalize(parts[0]);
};

//------------------------------------------------------------------
// Tiny floating particles in the background – purely cosmetic
//------------------------------------------------------------------
const FloatingParticle = ({ delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 80 }}
    animate={{
      opacity: [0, 0.3, 0],
      y: [-80, -180],
      x: [0, Math.random() * 100 - 50]
    }}
    transition={{ duration: 8, delay, repeat: Infinity, ease: 'easeInOut' }}
    style={{
      position: 'absolute',
      width: 2,
      height: 2,
      borderRadius: '50%',
      background: 'linear-gradient(45deg, #6366f1, #8b5cf6)',
      filter: 'blur(0.7px)',
      zIndex: 0
    }}
  />
);

//------------------------------------------------------------------
// Custom legend renderer
//------------------------------------------------------------------
const RoundedLegend = (props) => {
  const { payload } = props;
  return (
    <ul style={{ display: 'flex', flexWrap: 'wrap', gap: 16, margin: 0, padding: 0, listStyle: 'none' }}>
      {payload.map((entry, index) => (
        <li key={`item-${index}`} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="32" height="24" style={{ display: 'block' }}>
            <rect x="0" y="4" width="32" height="16" rx="8" ry="8" fill={entry.color} stroke="none" />
          </svg>
          <span style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>{entry.value}</span>
        </li>
      ))}
    </ul>
  );
};

//------------------------------------------------------------------
// Main component
//------------------------------------------------------------------
const TicketDashboard = () => {
  //----------------------------------------------------------------
  // Hooks & theme helpers
  //----------------------------------------------------------------
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user, isLoading: authLoading } = useAuth();

  //----------------------------------------------------------------
  // Local state
  //----------------------------------------------------------------
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);

  const [ticketStats, setTicketStats] = useState({
    totalTickets: 0,
    openTickets: 0,
    closedTickets: 0,
    avgResolutionTime: 0
  });
  const [ticketsByType, setTicketsByType] = useState([]);
  const [ticketsByStatus, setTicketsByStatus] = useState([]);
  const [resolutionTimeData, setResolutionTimeData] = useState([]);
  const [ticketVolumeData, setTicketVolumeData] = useState([]);

  //----------------------------------------------------------------
  // Fetch reference look‑ups (categories & sub‑categories)
  //----------------------------------------------------------------
  useEffect(() => {
    (async () => {
      const [{ data: cat }, { data: sub }] = await Promise.all([
        supabase.from('categories').select('id,name'),
        supabase.from('sub_categories').select('id,name')
      ]);
      setCategories(cat || []);
      setSubCategories(sub || []);
    })();
  }, []);

  //----------------------------------------------------------------
  // Fetch tickets once look‑ups are ready
  //----------------------------------------------------------------
  useEffect(() => {
    if (!categories.length || !subCategories.length) return;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: tickets, error: err } = await supabase
          .from('tickets')
          .select('id,created_at,resolved_at,status,category_id,sub_category_id');
        if (err) throw err;

        //------------------------------------------------------------------
        // Enrich tickets with category / subCategory names
        //------------------------------------------------------------------
        const catMap = Object.fromEntries(categories.map(c => [c.id, c.name]));
        const subMap = Object.fromEntries(subCategories.map(s => [s.id, s.name]));
        const records = (tickets || []).map(t => ({
          ...t,
          category_name: catMap[t.category_id] || 'Uncategorised',
          sub_category_name: subMap[t.sub_category_id] || ''
        }));

        //------------------------------------------------------------------
        // KPI calculations
        //------------------------------------------------------------------
        const totalTickets = records.length;
        const openTickets = records.filter(t => !['RESOLVED', 'CLOSED'].includes(t.status)).length;
        const closedTickets = totalTickets - openTickets;

        let totalResolutionHrs = 0;
        let resolvedCount = 0;
        records.forEach(t => {
          if (t.resolved_at) {
            const hrs = (new Date(t.resolved_at) - new Date(t.created_at)) / 36e5;
            totalResolutionHrs += hrs;
            resolvedCount += 1;
          }
        });

        setTicketStats({
          totalTickets,
          openTickets,
          closedTickets,
          avgResolutionTime: resolvedCount ? (totalResolutionHrs / resolvedCount).toFixed(2) : 0
        });

        //------------------------------------------------------------------
        // Charts: tickets by type
        //------------------------------------------------------------------
        const typeCounts = records.reduce((acc, r) => {
          acc[r.category_name] = (acc[r.category_name] || 0) + 1;
          return acc;
        }, {});
        setTicketsByType(Object.entries(typeCounts).map(([name, value]) => ({ name, value })));

        //------------------------------------------------------------------
        // Charts: tickets by status
        //------------------------------------------------------------------
        const statusCounts = records.reduce((acc, r) => {
          acc[r.status] = (acc[r.status] || 0) + 1;
          return acc;
        }, {});
        setTicketsByStatus(Object.entries(statusCounts).map(([name, value]) => ({ name, value })));

        //------------------------------------------------------------------
        // Charts: resolution time buckets
        //------------------------------------------------------------------
        const buckets = {
          '< 1hr': 0,
          '1-4 hrs': 0,
          '4-24 hrs': 0,
          '1-3 days': 0,
          '>3 days': 0
        };
        records.forEach(r => {
          if (!r.resolved_at) return;
          const hrs = (new Date(r.resolved_at) - new Date(r.created_at)) / 36e5;
          if (hrs < 1) buckets['< 1hr'] += 1;
          else if (hrs < 4) buckets['1-4 hrs'] += 1;
          else if (hrs < 24) buckets['4-24 hrs'] += 1;
          else if (hrs < 72) buckets['1-3 days'] += 1;
          else buckets['>3 days'] += 1;
        });
        setResolutionTimeData(Object.entries(buckets).map(([name, value]) => ({ name, value })));

        //------------------------------------------------------------------
        // Charts: ticket volume last 30 days
        //------------------------------------------------------------------
        const since = new Date();
        since.setDate(since.getDate() - 30);
        const volumeMap = records
          .filter(r => new Date(r.created_at) >= since)
          .reduce((acc, r) => {
            const d = new Date(r.created_at).toISOString().substring(0, 10); // yyyy‑mm‑dd
            acc[d] = (acc[d] || 0) + 1;
            return acc;
          }, {});
        setTicketVolumeData(
          Object.entries(volumeMap)
            .map(([date, count]) => ({ date, count }))
            .sort((a, b) => new Date(a.date) - new Date(b.date))
        );
      } catch (e) {
        console.error(e);
        setError(e.message || 'Unknown error');
      } finally {
        setLoading(false);
      }
    })();
  }, [categories, subCategories]);

  //------------------------------------------------------------------
  // Render guards
  //------------------------------------------------------------------
  if (authLoading)
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );

  if (!user || user.email !== 'tickets@othainsoft.com')
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography color="error">Access denied – authorised user only.</Typography>
      </Box>
    );

  if (loading)
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );

  if (error)
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );

  //------------------------------------------------------------------
  // Derived UI structures
  //------------------------------------------------------------------
  const kpiCards = [
    {
      label: 'Total Tickets',
      value: ticketStats.totalTickets,
      icon: TicketIcon,
      gradient: 'linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%)',
      shadow: 'rgba(99,102,241,0.3)'
    },
    {
      label: 'Open Tickets',
      value: ticketStats.openTickets,
      icon: DonutLargeIcon,
      gradient: 'linear-gradient(135deg,#10b981 0%,#059669 100%)',
      shadow: 'rgba(16,185,129,0.3)'
    },
    {
      label: 'Closed Tickets',
      value: ticketStats.closedTickets,
      icon: AssessmentIcon,
      gradient: 'linear-gradient(135deg,#ef4444 0%,#dc2626 100%)',
      shadow: 'rgba(239,68,68,0.3)'
    },
    {
      label: 'Avg. Resolution Time',
      value: `${ticketStats.avgResolutionTime} hrs`,
      icon: AccessTimeIcon,
      gradient: 'linear-gradient(135deg,#f59e0b 0%,#d97706 100%)',
      shadow: 'rgba(245,158,11,0.3)'
    }
  ];

  //------------------------------------------------------------------
  // Animation variants
  //------------------------------------------------------------------
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  //------------------------------------------------------------------
  // Component helpers – chart wrapper with consistent flex behaviour
  //------------------------------------------------------------------
  const ChartCard = ({ title, children }) => (
    <Card
      sx={{
        height: CHART_CARD_HEIGHT,
        borderRadius: 3,
        background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(248,250,252,0.9) 100%)',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
        borderRadius: 3
      }}
    >
      <CardContent sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: '#1e293b' }}>
          {title}
        </Typography>
        <Box sx={{ flexGrow: 1, minHeight: 0 }}>{children}</Box>
      </CardContent>
    </Card>
  );

  //------------------------------------------------------------------
  // JSX
  //------------------------------------------------------------------
  return (
    <Box
      sx={{
        position: 'relative',
        minHeight: '100vh',
        p: { xs: 2, sm: 3, md: 4 },
        background: 'linear-gradient(135deg,#f8fafc 0%,#e2e8f0 100%)',
        overflow: 'hidden'
      }}
    >
      {/* Floating particles */}
      {[...Array(15)].map((_, i) => (
        <FloatingParticle key={i} delay={i * 0.4} />
      ))}

      <motion.div initial="hidden" animate="visible" variants={containerVariants}>
        {/* Header */}
        <motion.div variants={itemVariants}>
          <Card
            sx={{
              mb: 4,
              borderRadius: 3,
              background: 'linear-gradient(135deg,rgba(255,255,255,0.9) 0%,rgba(248,250,252,0.9) 100%)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 25px 50px rgba(0,0,0,0.1)'
            }}
          >
            <CardContent sx={{ p: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
              <AssessmentIcon
                sx={{
                  fontSize: '2.5rem',
                  p: 1,
                  borderRadius: 2,
                  color: 'white',
                  background: 'linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%)'
                }}
              />
              <Box>
                <Typography
                  variant={isMobile ? 'h5' : 'h4'}
                  sx={{ fontWeight: 800, color: '#1e293b' }}
                >
                  Ticket Analytics Dashboard
                </Typography>
                <Typography sx={{ color: '#64748b' }}>
                  Insights into support ticket performance
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </motion.div>

        {/* KPI cards */}
        <motion.div variants={itemVariants}>
          <Grid container spacing={3} mb={4}>
            {kpiCards.map((c, i) => (
              <Grid item xs={12} sm={6} md={3} key={c.label}>
                <motion.div
                  variants={itemVariants}
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                >
                  <Card
                    sx={{
                      borderRadius: 3,
                      background: 'linear-gradient(135deg,rgba(255,255,255,0.9) 0%,rgba(248,250,252,0.9) 100%)',
                      backdropFilter: 'blur(20px)',
                      boxShadow: `0 10px 30px ${c.shadow}`
                    }}
                  >
                    <CardContent sx={{ textAlign: 'center', p: 3 }}>
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: 2,
                          mb: 2,
                          mx: 'auto',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: c.gradient,
                          boxShadow: `0 8px 25px ${c.shadow}`
                        }}
                      >
                        <c.icon sx={{ color: '#fff' }} />
                      </Box>
                      <Typography
                        variant="h4"
                        sx={{
                          fontWeight: 800,
                          background: c.gradient,
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent'
                        }}
                      >
                        {c.value}
                      </Typography>
                      <Typography sx={{ color: '#64748b', fontWeight: 600 }}>
                        {c.label}
                      </Typography>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </motion.div>

        {/* Charts */}
        <motion.div variants={itemVariants}>
          <Grid container spacing={3}>
            {/* Tickets by Type */}
            <Grid item xs={12} md={6} lg={4}>
              <ChartCard title="Tickets by Type">
                {ticketsByType.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={ticketsByType} dataKey="value" nameKey="name" cx="50%" cy="45%" outerRadius={isMobile ? 80 : 100} label>
                        {ticketsByType.map((entry, index) => {
                          const color = CHART_COLORS[index % CHART_COLORS.length];
                          const hex = color.replace('#', '');
                          const r = parseInt(hex.substring(0, 2), 16);
                          const g = parseInt(hex.substring(2, 4), 16);
                          const b = parseInt(hex.substring(4, 6), 16);
                          const shadow = `drop-shadow(0 2px 8px rgba(${r},${g},${b},0.42))`;
                          return (
                            <Cell key={`cell-${index}`} fill={color} style={{ filter: shadow }} />
                          );
                        })}
                      </Pie>
                      <Tooltip />
                      <Legend content={RoundedLegend} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <Box sx={{ textAlign: 'center', pt: 8, color: '#94a3b8' }}>No data</Box>
                )}
              </ChartCard>
            </Grid>

            {/* Tickets by Status */}
            <Grid item xs={12} md={6} lg={8}>
              <ChartCard title="Tickets by Status">
                {ticketsByStatus.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ticketsByStatus} layout="vertical">
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={90} />
                      <Tooltip contentStyle={{ borderRadius: '12px 12px 12px 12px' }} />
                      <Bar dataKey="value" radius={[0, 12, 12, 0]} activeBar={{ radius: [0, 12, 12, 0] }}>
                        {ticketsByStatus.map((e, i) => {
                          const color = CHART_COLORS[i % CHART_COLORS.length];
                          const hex = color.replace('#', '');
                          const r = parseInt(hex.substring(0, 2), 16);
                          const g = parseInt(hex.substring(2, 4), 16);
                          const b = parseInt(hex.substring(4, 6), 16);
                          const shadow = `drop-shadow(0 2px 8px rgba(${r},${g},${b},0.42))`;
                          return (
                            <Cell key={i} fill={color} style={{ filter: shadow }} />
                          );
                        })}
                      </Bar>
                      <Legend content={RoundedLegend} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <Box sx={{ textAlign: 'center', pt: 8, color: '#94a3b8' }}>No data</Box>
                )}
              </ChartCard>
            </Grid>

            {/* Resolution Time Distribution */}
            <Grid item xs={12} md={6} lg={6}>
              <ChartCard title="Resolution Time Distribution">
                {resolutionTimeData.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={resolutionTimeData} margin={{ bottom: 40 }}>
                      <XAxis dataKey="name" angle={-45} textAnchor="end" interval={0} tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip contentStyle={{ borderRadius: '12px 12px 12px 12px' }} />
                      <Bar dataKey="value" radius={[12, 12, 0, 0]} activeBar={{ radius: [12, 12, 0, 0] }}>
                        {resolutionTimeData.map((e, i) => {
                          const color = CHART_COLORS[i % CHART_COLORS.length];
                          const hex = color.replace('#', '');
                          const r = parseInt(hex.substring(0, 2), 16);
                          const g = parseInt(hex.substring(2, 4), 16);
                          const b = parseInt(hex.substring(4, 6), 16);
                          const shadow = `drop-shadow(0 2px 8px rgba(${r},${g},${b},0.62))`;
                          return (
                            <Cell key={i} fill={color} style={{ filter: shadow }} />
                          );
                        })}
                      </Bar>
                      <Legend content={RoundedLegend} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <Box sx={{ textAlign: 'center', pt: 8, color: '#94a3b8' }}>No data</Box>
                )}
              </ChartCard>
            </Grid>

            {/* Ticket Volume */}
            <Grid item xs={12} md={6} lg={6}>
              <ChartCard title="Ticket Volume (Last 30 Days)">
                <ResponsiveContainer width="100%" height="90%">
                  {ticketVolumeData.length > 0 ? (
                    <LineChart data={ticketVolumeData} margin={{ top: 30, right: 40, left: -10, bottom: 50 }}>
                      <XAxis
                        dataKey="date"
                        angle={-45}
                        textAnchor="end"
                        interval={Math.floor(ticketVolumeData.length / 10) || 0}
                        tickFormatter={d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        tick={{ fontSize: 10 }}
                      />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="count" stroke={CHART_COLORS[0]} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 6 }} />
                      <Legend content={RoundedLegend} />
                    </LineChart>
                  ) : (
                    <Box sx={{ textAlign: 'center', pt: 8, color: '#64748b' }}>No ticket volume data available.</Box>
                  )}
                </ResponsiveContainer>
              </ChartCard>
            </Grid>
          </Grid>
        </motion.div>
      </motion.div>
    </Box>
  );
};

export default TicketDashboard;
