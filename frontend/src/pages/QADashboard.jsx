/* eslint‑disable react/prop‑types */
import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { parseISO } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import {
  Box, Paper, Typography, Divider,
  Grid, Card, CardContent
} from '@mui/material';

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
/*  2.  HR ALIASES  (keyword → bucket)                                */
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
  const [kpi, setKpi]                   = useState(defaultState.kpi);
  const [hourSeries, setHourSeries]     = useState(defaultState.hourSeries);
  const [topicCounts, setTopicCounts]   = useState(defaultState.topicCounts);
  const [unansweredTable, setUnansweredTable] = useState(defaultState.unansweredTable);
  const [slowestTable, setSlowestTable] = useState(defaultState.slowestTable);
  const [repeatCounts, setRepeatCounts] = useState(defaultState.repeatCounts);
  const [repeatTile, setRepeatTile]     = useState(defaultState.repeatTile);
  const [isValidData, setIsValidData]   = useState(true);

  /* -------------------------------------------------------------- */
  useEffect(() => {

    /* validate rows */
    if (!Array.isArray(rows)) {
      setIsValidData(false);
      Object.entries(defaultState).forEach(([k, v]) =>
        k === 'kpi' ? setKpi(v) : eval(`set${k.charAt(0).toUpperCase()+k.slice(1)}(v)`));
      return;
    }
    setIsValidData(true);
    if (!rows.length) {   // reset on empty
      Object.entries(defaultState).forEach(([k, v]) =>
        k === 'kpi' ? setKpi(v) : eval(`set${k.charAt(0).toUpperCase()+k.slice(1)}(v)`));
      return;
    }

    const topicList = buildTopicList(rows);         // top keywords

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
    return <Typography color="error">Dashboard data is invalid.</Typography>;
  }

  const Tile = ({ label, value }) => (
    <Box sx={{ flex: 1, p: 2, bgcolor: '#f4f6f8', borderRadius: 2, textAlign: 'center' }}>
      <Typography variant="h6" fontWeight={600}>{value}</Typography>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
    </Box>
  );

  return (
    <Card sx={{ p: 3, mb: 4, boxShadow: 3, borderRadius: 2 }}>
      <Typography variant="h6" gutterBottom>Weekly Q/A Dashboard</Typography>

      {/* KPI grid */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={4} md={2}><CardContent sx={{ textAlign: 'center' }}>
          <Typography variant="h4" color="primary">{kpi.totalPairs}</Typography>
          <Typography variant="subtitle2">Q&A pairs</Typography>
        </CardContent></Grid>
        <Grid item xs={6} sm={4} md={2}><CardContent sx={{ textAlign: 'center' }}>
          <Typography variant="h4" color="primary">{kpi.uniqueSessions}</Typography>
          <Typography variant="subtitle2">Sessions</Typography>
        </CardContent></Grid>
        <Grid item xs={6} sm={4} md={2}><CardContent sx={{ textAlign: 'center' }}>
          <Typography variant="h4" color="primary">{kpi.medianRt.toFixed(2)}</Typography>
          <Typography variant="subtitle2">Median RT (s)</Typography>
        </CardContent></Grid>
        <Grid item xs={6} sm={4} md={2}><CardContent sx={{ textAlign: 'center' }}>
          <Typography variant="h4" color="primary">{kpi.p95Rt.toFixed(2)}</Typography>
          <Typography variant="subtitle2">P95 RT (s)</Typography>
        </CardContent></Grid>
        <Grid item xs={6} sm={4} md={2}><CardContent sx={{ textAlign: 'center' }}>
          <Typography variant="h4" color="primary">{kpi.unansweredPct.toFixed(1)}%</Typography>
          <Typography variant="subtitle2">Unanswered</Typography>
        </CardContent></Grid>
      </Grid>

      <Typography variant="body2" sx={{ mb: 1 }}>
        <strong>Repeat questions:</strong> {repeatTile.pairs} pairs across {repeatTile.share.toFixed(1)} % of unique questions
      </Typography>

      {/* Charts row */}
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>

        {/* Questions by Topic */}
        <Paper sx={{ p: 2, flex: 1, minWidth: 260 }}>
          <Typography variant="subtitle2">Questions by Topic</Typography>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart layout="vertical" data={topicCounts}>
              <XAxis type="number" />
              <YAxis type="category" dataKey="name" width={130} />
              <Tooltip />
              <Bar dataKey="value" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </Paper>

        {/* Answered vs Unanswered */}
        <Paper sx={{ p: 2, width: 260 }}>
          <Typography variant="subtitle2">Answered vs Unanswered</Typography>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={[
                  { name: 'Answered',   value: kpi.totalPairs - (kpi.unansweredPct / 100 * kpi.totalPairs) },
                  { name: 'Unanswered', value: (kpi.unansweredPct / 100 * kpi.totalPairs) }
                ]}
                dataKey="value"
                innerRadius={40}
                outerRadius={60}
                label
              >
                <Cell fill="#0088FE" /><Cell fill="#FF8042" />
              </Pie>
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Paper>
      </Box>

      {/* Tables */}
      <Divider sx={{ my: 3 }} />

      <Typography variant="subtitle2">Top Unanswered Questions</Typography>
      <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 14 }}>
        {unansweredTable.map(u => `${u.count} ×  ${u.question}`).join('\n')}
      </pre>

      <Typography variant="subtitle2" sx={{ mt: 2 }}>Slowest Responses</Typography>
      <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 14 }}>
        {slowestTable.map(s => `${s.rt}s — ${s.question}`).join('\n')}
      </pre>

      <Typography variant="subtitle2" sx={{ mt: 2 }}>Repeat Question Counts (top 10)</Typography>
      <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 14 }}>
        {repeatCounts.map(r => `${r.count} ×  ${r.question}`).join('\n')}
      </pre>
    </Card>
  );
}
