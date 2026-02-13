/* eslint‑disable react/prop‑types */
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { parseISO } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import {
  Box, Typography, Grid, Card, CardContent,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, useTheme, useMediaQuery
} from '@mui/material';
import {
  QuestionAnswer as QuestionAnswerIcon,
  Speed as SpeedIcon,
  Group as GroupIcon,
  HelpOutline as HelpIcon,
  TrendingUp as TrendingUpIcon,
  Assessment as AssessmentIcon,
  Schedule as ScheduleIcon,
  Repeat as RepeatIcon
} from '@mui/icons-material';

// Floating particles animation
const FloatingParticle = ({ delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 100 }}
    animate={{ 
      opacity: [0, 0.4, 0],
      y: [-100, -200],
      x: [0, Math.random() * 80 - 40]
    }}
    transition={{
      duration: 8,
      delay,
      repeat: Infinity,
      ease: "easeInOut"
    }}
    style={{
      position: 'absolute',
      width: '2px',
      height: '2px',
      borderRadius: '50%',
      background: 'linear-gradient(45deg, #6366f1, #8b5cf6)',
      filter: 'blur(0.5px)',
      zIndex: 0
    }}
  />
);

/* ------------------------------------------------------------------ */
/*  1.  GAP WORDS + helper                                            */
/* ------------------------------------------------------------------ */
const GAP_WORDS = [
  /* apologies / deflection */
  'sorry', "i'm sorry", 'i am sorry', 'apologize', 'i apologize', 'unfortunately',
  /* no‑info statements */
  "i don't have", 'i do not have', "i don't currently have", 'i do not currently have',
  "i don't have access", 'i do not have access', 'no information', 'no information available',
  'no data', 'no details', 'not provided', 'not available',
  /* capability limits */
  'i am unable', "i'm unable", 'unable to', 'unable to provide', 'cannot provide', 'i cannot',
  /* uncertainty */
  'unsure', 'not sure', "i'm not sure"
];
const isGapAnswer = ans =>
  GAP_WORDS.some(w => (ans || '').toLowerCase().includes(w));

/* ------------------------------------------------------------------ */
/*  2.  HR ALIASES  (keyword → bucket)                                */
/* ------------------------------------------------------------------ */
const HR_ALIASES = {
  /* Insurance & Benefits */
  insurance : 'Insurance & Benefits',  medical : 'Insurance & Benefits',
  coverage  : 'Insurance & Benefits',  benefit : 'Insurance & Benefits',
  benefits  : 'Insurance & Benefits',

  /* Policy (generic) */
  policy    : 'Policy',

  /* Leave & Holidays */
  leave     : 'Leave / Holidays',  holiday  : 'Leave / Holidays',
  vacation  : 'Leave / Holidays',  sick     : 'Leave / Holidays',
  sandwich  : 'Leave / Holidays',

  /* Company info */
  othain    : 'Company Info',  company  : 'Company Info', website : 'Company Info',
  url       : 'Company Info',  ceo      : 'Company Info', founder : 'Company Info',
  mission   : 'Company Info',  vision   : 'Company Info', location: 'Company Info',
  office    : 'Company Info',

  /* Employee basics */
  employee  : 'Employee Basics', employees: 'Employee Basics', id: 'Employee Basics',
  code      : 'Employee Basics', number   : 'Employee Basics', designation: 'Employee Basics',
  role      : 'Employee Basics',

  /* Compensation */
  salary    : 'Compensation', pay     : 'Compensation', hike  : 'Compensation',
  increment : 'Compensation', bonus   : 'Compensation', compensation: 'Compensation',

  /* Process & Support */
  process   : 'Process & Support', procedure: 'Process & Support', submit : 'Process & Support',
  ticket    : 'Process & Support', steps    : 'Process & Support',

  /* IT / Facilities */
  services  : 'IT / Facilities', service : 'IT / Facilities', transport: 'IT / Facilities',
  cab       : 'IT / Facilities', laptop  : 'IT / Facilities', wifi     : 'IT / Facilities',
  equipment : 'IT / Facilities',

  /* Data & Privacy */
  data      : 'Data & Privacy', privacy : 'Data & Privacy', security : 'Data & Privacy',

  /* HR contact */
  hr        : 'HR Contact', contact : 'HR Contact', email : 'HR Contact', phone : 'HR Contact'
};

/* ------------------------------------------------------------------ */
/*  3.  Topic helpers (freq‑based + alias)                            */
/* ------------------------------------------------------------------ */
const STOP = new Set([
  'a','an','the','and','is','are','in','of','to','my','for','your',
  'how','what','who','when','why','does','do','can','could','would','should'
]);

/* find the N most common non‑stop words */
const buildTopicList = (rows, N = 15) => {
  const freq = {};
  rows.forEach(({ question }) => {
    (question || '')
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !STOP.has(w))
      .forEach(w => (freq[w] = (freq[w] || 0) + 1));
  });
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, N)
    .map(([w]) => w);
};

/* decide bucket for a single question */
const topicOf = (q, topicList) => {
  const s = (q || '').toLowerCase();

  /* explicit HR aliases first */
  for (const kw in HR_ALIASES) if (s.includes(kw)) return HR_ALIASES[kw];

  /* else fall back to top‑freq keyword so we don't miss new things */
  for (const kw of topicList)   if (s.includes(kw)) return kw.charAt(0).toUpperCase() + kw.slice(1);

  return 'Other';
};

/* ------------------------------------------------------------------ */
const defaultState = {
  topicCounts: [],
  hourSeries: Array(24).fill(0).map((_, h) => ({ hour: h, count: 0 })),
  kpi: { totalPairs: 0, uniqueSessions: 0, medianRt: 0, p95Rt: 0, unansweredPct: 0 },
  unansweredTable: [], slowestTable: [], repeatCounts: [], repeatTile: { pairs: 0, share: 0 }
};

/* ------------------------------------------------------------------ */
export default function QaDashboard({ rows }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [kpi, setKpi] = useState(defaultState.kpi);
  const [, setHourSeries] = useState(defaultState.hourSeries);
  const [topicCounts, setTopicCounts] = useState(defaultState.topicCounts);
  const [unansweredTable, setUnansweredTable] = useState(defaultState.unansweredTable);
  const [slowestTable, setSlowestTable] = useState(defaultState.slowestTable);
  const [repeatCounts, setRepeatCounts] = useState(defaultState.repeatCounts);
  const [repeatTile, setRepeatTile] = useState(defaultState.repeatTile);
  const [isValidData, setIsValidData] = useState(true);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    }
  };

  const kpiVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: (i) => ({
      opacity: 1,
      scale: 1,
      transition: {
        delay: i * 0.1,
        duration: 0.4,
        ease: "easeOut",
        type: "spring",
        damping: 25,
        stiffness: 300
      }
    })
  };

  /* -------------------------------------------------------------- */
  useEffect(() => {
    /* validate rows */
    if (!Array.isArray(rows)) {
      setIsValidData(false);
      const setters = {
        kpi: setKpi,
        hourSeries: setHourSeries,
        topicCounts: setTopicCounts,
        unansweredTable: setUnansweredTable,
        slowestTable: setSlowestTable,
        repeatCounts: setRepeatCounts,
        repeatTile: setRepeatTile,
      };
      Object.entries(defaultState).forEach(([key, value]) => {
        if (setters[key]) {
          setters[key](value);
        }
      });
      return;
    }
    setIsValidData(true);
    if (!rows.length) {
      const setters = {
        kpi: setKpi,
        hourSeries: setHourSeries,
        topicCounts: setTopicCounts,
        unansweredTable: setUnansweredTable,
        slowestTable: setSlowestTable,
        repeatCounts: setRepeatCounts,
        repeatTile: setRepeatTile,
      };
      Object.entries(defaultState).forEach(([key, value]) => {
        if (setters[key]) {
          setters[key](value);
        }
      });
      return;
    }

    const topicList = buildTopicList(rows);

    const topicTally = {}, gapTally = {}, repeats = {}, rtList = [];
    const sessions = new Set();
    const hourBuckets = Array(24).fill(0);

    rows.forEach(r => {
      sessions.add(r.session_id);

      const a = r.asked_at    ? parseISO(r.asked_at)    : null;
      const b = r.answered_at ? parseISO(r.answered_at) : null;
      if (a && b && !isNaN(a) && !isNaN(b)) rtList.push((b - a) / 1000);

      const unanswered = isGapAnswer(r.answer);

      const topic = topicOf(r.question, topicList);
      topicTally[topic] = (topicTally[topic] || 0) + 1;
      if (unanswered) gapTally[r.question] = (gapTally[r.question] || 0) + 1;

      const norm = (r.question || '').trim().toLowerCase();
      if (norm) repeats[norm] = (repeats[norm] || 0) + 1;

      if (a && !isNaN(a)) {
        const h = toZonedTime(a, 'Asia/Kolkata').getHours();
        hourBuckets[h] += 1;
      }
    });

    /* KPIs */
    rtList.sort((x, y) => x - y);
    const pct = q => rtList.length ? rtList[Math.floor(rtList.length * q)] : 0;
    const totalGap = Object.values(gapTally).reduce((a, b) => a + b, 0);
    const repeatPairs = Object.values(repeats).filter(c => c > 1).reduce((a, b) => a + b, 0);
    const repeatQs    = Object.values(repeats).filter(c => c > 1).length;
    const uniqQs      = Object.keys(repeats).length;

    setKpi({
      totalPairs    : rows.length,
      uniqueSessions: sessions.size,
      medianRt      : pct(0.5),
      p95Rt         : pct(0.95),
      unansweredPct : (totalGap / rows.length) * 100
    });
    setHourSeries(hourBuckets.map((c, h) => ({ hour: h, count: c })));
    setTopicCounts(Object.entries(topicTally)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value));
    setUnansweredTable(Object.entries(gapTally)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([q, c]) => ({ question: q, count: c })));
    setSlowestTable(rows
      .filter(r => r.asked_at && r.answered_at)
      .sort((a, b) =>
        (parseISO(b.answered_at) - parseISO(b.asked_at)) -
        (parseISO(a.answered_at) - parseISO(a.asked_at)))
      .slice(0, 5)
      .map(r => ({
        question: r.question,
        rt: ((parseISO(r.answered_at) - parseISO(r.asked_at)) / 1000).toFixed(2)
      })));
    setRepeatCounts(Object.entries(repeats)
      .filter(([, c]) => c > 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([q, c]) => ({ question: q, count: c })));
    setRepeatTile({
      pairs: repeatPairs,
      share: uniqQs ? (repeatQs / uniqQs) * 100 : 0
    });

  }, [rows]);

  /* -------------------------------------------------------------- */
  if (!isValidData) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h6" color="error">
          Dashboard data is invalid.
        </Typography>
      </Box>
    );
  }

  // KPI card data with icons and colors
  const kpiCards = [
    {
      label: 'Total Q&A Pairs',
      value: kpi.totalPairs,
      icon: QuestionAnswerIcon,
      gradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
      shadowColor: 'rgba(99, 102, 241, 0.3)'
    },
    {
      label: 'Unique Sessions',
      value: kpi.uniqueSessions,
      icon: GroupIcon,
      gradient: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
      shadowColor: 'rgba(16, 185, 129, 0.3)'
    },
    {
      label: 'Median Response Time',
      value: `${kpi.medianRt.toFixed(2)}s`,
      icon: SpeedIcon,
      gradient: 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)',
      shadowColor: 'rgba(6, 182, 212, 0.3)'
    },
    {
      label: 'P95 Response Time',
      value: `${kpi.p95Rt.toFixed(2)}s`,
      icon: ScheduleIcon,
      gradient: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)',
      shadowColor: 'rgba(249, 115, 22, 0.3)'
    },
    {
      label: 'Unanswered Rate',
      value: `${kpi.unansweredPct.toFixed(1)}%`,
      icon: HelpIcon,
      gradient: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
      shadowColor: 'rgba(239, 68, 68, 0.3)'
    }
  ];

  return (
    <Box sx={{
      position: 'relative',
      overflow: 'hidden',
      background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 50%, #e2e8f0 100%)',
      minHeight: '100vh',
      p: { xs: 2, sm: 3, md: 4 }
    }}>
      {/* Background Particles */}
      {[...Array(15)].map((_, i) => (
        <FloatingParticle key={i} delay={i * 0.4} />
      ))}

      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* Header */}
        <motion.div variants={itemVariants}>
          <Card sx={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.9) 100%)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(226, 232, 240, 0.5)',
            borderRadius: '24px',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.1)',
            mb: 4,
            overflow: 'hidden',
            position: 'relative'
          }}>
            {/* Header decoration */}
            <Box sx={{
              position: 'absolute',
              top: '-50%',
              right: '-20%',
              width: '400px',
              height: '200px',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              borderRadius: '50%',
              opacity: 0.05,
              filter: 'blur(60px)',
              zIndex: 0
            }} />

            <CardContent sx={{ p: 4, position: 'relative', zIndex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <AssessmentIcon sx={{ 
                  fontSize: '2.5rem',
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  borderRadius: '12px',
                  p: 1,
                  color: 'white'
                }} />
                <Box>
                  <Typography variant={isMobile ? "h5" : "h4"} sx={{ 
                    fontWeight: 800,
                    background: 'linear-gradient(135deg, #1e293b 0%, #475569 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  }}>
                    Q&A Analytics Dashboard
                  </Typography>
                  <Typography variant="body1" sx={{ 
                    color: '#64748b',
                    fontSize: { xs: '0.9rem', sm: '1rem' }
                  }}>
                    Real-time insights and performance metrics
                  </Typography>
                </Box>
              </Box>

              {/* Repeat Questions Summary */}
              <Chip 
                icon={<RepeatIcon />}
                label={`${repeatTile.pairs} repeat question pairs (${repeatTile.share.toFixed(1)}% of unique questions)`}
                sx={{
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  height: '36px'
                }}
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* KPI Cards */}
        <motion.div variants={itemVariants}>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {kpiCards.map((card, index) => (
              <Grid item xs={6} sm={6} md={4} lg={2.4} key={card.label}>
                <motion.div
                  custom={index}
                  variants={kpiVariants}
                  initial="hidden"
                  animate="visible"
                  whileHover={{ 
                    scale: 1.05,
                    transition: { duration: 0.2 }
                  }}
                >
                  <Card sx={{
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.9) 100%)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(226, 232, 240, 0.5)',
                    borderRadius: '20px',
                    boxShadow: `0 10px 30px ${card.shadowColor}`,
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    position: 'relative',
                    overflow: 'hidden',
                    height: '100%',
                    '&:hover': {
                      boxShadow: `0 15px 35px ${card.shadowColor}`
                    }
                  }}>
                    {/* Card shine effect */}
                    <Box sx={{
                      position: 'absolute',
                      top: '-50%',
                      left: '-50%',
                      width: '200%',
                      height: '200%',
                      background: 'linear-gradient(45deg, transparent, rgba(255,255,255,0.1), transparent)',
                      transform: 'rotate(45deg)',
                      transition: 'all 0.6s ease',
                      opacity: 0,
                      '.MuiCard-root:hover &': {
                        opacity: 1,
                        transform: 'translateX(100%) translateY(100%) rotate(45deg)'
                      }
                    }} />

                    <CardContent sx={{ 
                      p: 3, 
                      textAlign: 'center',
                      position: 'relative',
                      zIndex: 1
                    }}>
                      <Box sx={{
                        background: card.gradient,
                        borderRadius: '12px',
                        width: '48px',
                        height: '48px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 1rem auto',
                        boxShadow: `0 8px 25px ${card.shadowColor}`
                      }}>
                        <card.icon sx={{ fontSize: '1.5rem', color: 'white' }} />
                      </Box>

                      <Typography variant="h4" sx={{ 
                        fontWeight: 800,
                        background: card.gradient,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        mb: 1,
                        fontSize: { xs: '1.5rem', sm: '2rem' }
                      }}>
                        {card.value}
      </Typography>

                      <Typography variant="body2" sx={{ 
                        color: '#64748b',
                        fontWeight: 600,
                        fontSize: '0.8rem'
                      }}>
                        {card.label}
                      </Typography>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </motion.div>

        {/* Charts Section */}
        <motion.div variants={itemVariants}>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {/* Questions by Topic Chart */}
            <Grid item xs={12} lg={8}>
              <Card sx={{
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.9) 100%)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(226, 232, 240, 0.5)',
                borderRadius: '20px',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
                height: '100%'
              }}>
                <CardContent sx={{ p: 4 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                    <TrendingUpIcon sx={{ color: '#6366f1', fontSize: '1.5rem' }} />
                    <Typography variant="h6" sx={{ 
                      fontWeight: 700,
                      color: '#1e293b'
                    }}>
                      Questions by Topic
                    </Typography>
                  </Box>
                  
                  <Box sx={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={topicCounts}>
                        <XAxis 
                          type="number" 
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 12, fill: '#64748b' }}
                        />
                        <YAxis 
                          type="category" 
                          dataKey="name" 
                          width={140}
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 12, fill: '#64748b' }}
                        />
                        <Tooltip 
                          contentStyle={{
                            background: 'rgba(255, 255, 255, 0.95)',
                            border: '1px solid rgba(226, 232, 240, 0.5)',
                            borderRadius: '12px',
                            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)'
                          }}
                        />
                        <Bar 
                          dataKey="value" 
                          radius={[0, 6, 6, 0]}
                          fill="url(#topicGradient)"
                        />
                        <defs>
                          <linearGradient id="topicGradient" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#6366f1" />
                            <stop offset="100%" stopColor="#8b5cf6" />
                          </linearGradient>
                        </defs>
            </BarChart>
          </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Answered vs Unanswered Chart */}
            <Grid item xs={12} lg={4}>
              <Card sx={{
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.9) 100%)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(226, 232, 240, 0.5)',
                borderRadius: '20px',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
                height: '100%'
              }}>
                <CardContent sx={{ p: 4 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                    <HelpIcon sx={{ color: '#10b981', fontSize: '1.5rem' }} />
                    <Typography variant="h6" sx={{ 
                      fontWeight: 700,
                      color: '#1e293b'
                    }}>
                      Answer Coverage
                    </Typography>
                  </Box>
                  
                  <Box sx={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={[
                            { 
                              name: 'Answered',   
                              value: kpi.totalPairs - (kpi.unansweredPct / 100 * kpi.totalPairs) 
                            },
                            { 
                              name: 'Unanswered', 
                              value: (kpi.unansweredPct / 100 * kpi.totalPairs) 
                            }
                ]}
                dataKey="value"
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={5}
                          label={({ percent }) => `${(percent * 1).toFixed(0)}%`}
              >
                          <Cell fill="#10b981" />
                          <Cell fill="#ef4444" />
              </Pie>
                        <Legend 
                          wrapperStyle={{
                            fontSize: '14px',
                            color: '#64748b'
                          }}
                        />
                        <Tooltip 
                          contentStyle={{
                            background: 'rgba(255, 255, 255, 0.95)',
                            border: '1px solid rgba(226, 232, 240, 0.5)',
                            borderRadius: '12px',
                            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)'
                          }}
                        />
            </PieChart>
          </ResponsiveContainer>
      </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </motion.div>

        {/* Tables Section */}
        <motion.div variants={itemVariants}>
          <Grid container spacing={3}>
            {/* Top Unanswered Questions */}
            <Grid item xs={12} lg={4}>
              <Card sx={{
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.9) 100%)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(226, 232, 240, 0.5)',
                borderRadius: '20px',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
                height: '100%'
              }}>
                <CardContent sx={{ p: 4 }}>
                  <Typography variant="h6" sx={{ 
                    fontWeight: 700,
                    color: '#1e293b',
                    mb: 3,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}>
                    <HelpIcon sx={{ color: '#ef4444' }} />
                    Top Unanswered Questions
                  </Typography>
                  
                  <TableContainer sx={{ 
                    maxHeight: 400,
                    '&::-webkit-scrollbar': {
                      width: '6px'
                    },
                    '&::-webkit-scrollbar-track': {
                      background: 'transparent'
                    },
                    '&::-webkit-scrollbar-thumb': {
                      background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                      borderRadius: '3px'
                    }
                  }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 600, color: '#1e293b' }}>Count</TableCell>
                          <TableCell sx={{ fontWeight: 600, color: '#1e293b' }}>Question</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {unansweredTable.map((row, index) => (
                          <TableRow key={index} sx={{
                            '&:hover': { 
                              backgroundColor: 'rgba(99, 102, 241, 0.05)' 
                            }
                          }}>
                            <TableCell>
                              <Chip 
                                label={row.count}
                                size="small"
                                sx={{
                                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                  color: 'white',
                                  fontWeight: 600,
                                  minWidth: '40px'
                                }}
                              />
                            </TableCell>
                            <TableCell sx={{ 
                              fontSize: '0.875rem',
                              color: '#374151',
                              maxWidth: '200px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {row.question}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>

            {/* Slowest Responses */}
            <Grid item xs={12} lg={4}>
              <Card sx={{
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.9) 100%)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(226, 232, 240, 0.5)',
                borderRadius: '20px',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
                height: '100%'
              }}>
                <CardContent sx={{ p: 4 }}>
                  <Typography variant="h6" sx={{ 
                    fontWeight: 700,
                    color: '#1e293b',
                    mb: 3,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}>
                    <ScheduleIcon sx={{ color: '#f59e0b' }} />
                    Slowest Responses
                  </Typography>
                  
                  <TableContainer sx={{ 
                    maxHeight: 400,
                    '&::-webkit-scrollbar': {
                      width: '6px'
                    },
                    '&::-webkit-scrollbar-track': {
                      background: 'transparent'
                    },
                    '&::-webkit-scrollbar-thumb': {
                      background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                      borderRadius: '3px'
                    }
                  }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 600, color: '#1e293b' }}>Time (s)</TableCell>
                          <TableCell sx={{ fontWeight: 600, color: '#1e293b' }}>Question</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {slowestTable.map((row, index) => (
                          <TableRow key={index} sx={{
                            '&:hover': { 
                              backgroundColor: 'rgba(99, 102, 241, 0.05)' 
                            }
                          }}>
                            <TableCell>
                              <Chip 
                                label={`${row.rt}s`}
                                size="small"
                                sx={{
                                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                  color: 'white',
                                  fontWeight: 600,
                                  minWidth: '60px'
                                }}
                              />
                            </TableCell>
                            <TableCell sx={{ 
                              fontSize: '0.875rem',
                              color: '#374151',
                              maxWidth: '200px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {row.question}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>

            {/* Repeat Questions */}
            <Grid item xs={12} lg={4}>
              <Card sx={{
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.9) 100%)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(226, 232, 240, 0.5)',
                borderRadius: '20px',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
                height: '100%'
              }}>
                <CardContent sx={{ p: 4 }}>
                  <Typography variant="h6" sx={{ 
                    fontWeight: 700,
                    color: '#1e293b',
                    mb: 3,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}>
                    <RepeatIcon sx={{ color: '#8b5cf6' }} />
                    Most Repeated Questions
                  </Typography>
                  
                  <TableContainer sx={{ 
                    maxHeight: 400,
                    '&::-webkit-scrollbar': {
                      width: '6px'
                    },
                    '&::-webkit-scrollbar-track': {
                      background: 'transparent'
                    },
                    '&::-webkit-scrollbar-thumb': {
                      background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                      borderRadius: '3px'
                    }
                  }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 600, color: '#1e293b' }}>Count</TableCell>
                          <TableCell sx={{ fontWeight: 600, color: '#1e293b' }}>Question</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {repeatCounts.map((row, index) => (
                          <TableRow key={index} sx={{
                            '&:hover': { 
                              backgroundColor: 'rgba(99, 102, 241, 0.05)' 
                            }
                          }}>
                            <TableCell>
                              <Chip 
                                label={row.count}
                                size="small"
                                sx={{
                                  background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                                  color: 'white',
                                  fontWeight: 600,
                                  minWidth: '40px'
                                }}
                              />
                            </TableCell>
                            <TableCell sx={{ 
                              fontSize: '0.875rem',
                              color: '#374151',
                              maxWidth: '200px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {row.question}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
    </Card>
            </Grid>
          </Grid>
        </motion.div>
      </motion.div>
    </Box>
  );
}
