import React, { useState, useEffect, useMemo, Suspense } from 'react';
import {
  Box, Button, Typography, TextField, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, TableSortLabel
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { axiosInstance } from '../services/api';
import { saveAs } from 'file-saver';

const formatDate = d => d.toISOString().slice(0, 10);

const columns = [
  { id: 'session_id',  label: 'Session ID' },
  { id: 'user_email',  label: 'User Email' },
  { id: 'question',    label: 'Question' },
  { id: 'answer',      label: 'Answer' },
  { id: 'asked_at',    label: 'Asked At' },
  { id: 'answered_at', label: 'Answered At' }
];

export default function AdminReport () {
  const theme = useTheme();

  const [startDate, setStartDate] = useState(formatDate(new Date(Date.now() - 7*24*3600*1000)));
  const [endDate,   setEndDate]   = useState(formatDate(new Date()));
  const [loading,   setLoading]   = useState(false);
  const [rows,      setRows]      = useState([]);
  const [error,     setError]     = useState('');
  const [sortBy,         setSortBy]         = useState('asked_at');
  const [sortDirection,  setSortDirection]  = useState('desc');

  /* ───────── fetch data ───────── */
  const fetchReport = async () => {
    setLoading(true); setError('');
    try {
      const res = await axiosInstance.get('/chat/reports/weekly-qa', {
        params: { start_date: startDate, end_date: endDate }
      });
      const flat = res.data.results.flatMap(r =>
        r.qas.map(qa => ({
          session_id:   r.session_id,
          user_email:   r.user_email,
          ...qa,
          asked_at_ts:    qa.asked_at    ? Date.parse(qa.asked_at)    : 0,
          answered_at_ts: qa.answered_at ? Date.parse(qa.answered_at) : 0
        }))
      );
      setRows(flat);
    } catch (err) {
      const msg = err?.response?.data?.detail
             ?? err?.response?.data?.message
             ?? `Failed to fetch report (${err?.response?.status || 'network error'})`;
      setError(msg);
    } finally { setLoading(false); }
  };

  /* auto‑load last 7 days on mount */
  useEffect(() => { fetchReport(); /* eslint-disable-next-line */ }, []);

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

  const baseUrl = import.meta.env.REACT_APP_BACKEND_URL || window.location.origin;

  /* ───────── UI ───────── */
  return (
    <Box sx={{ p:3 }}>
      <Typography variant="h5" gutterBottom>Weekly Q&A Report</Typography>

      {/* embedded Streamlit dashboard */}
      <Box sx={{ mt:2, mb:4, width:'100%', height:600 }}>
        <Suspense fallback={<CircularProgress />}>
          <iframe
            title="QA Dashboard"
            src={`${baseUrl}/qa-dashboard`}
            style={{ width:'100%', height:'100%', border:'none' }}
          />
        </Suspense>
      </Box>

      {/* date pickers + actions */}
      <Box sx={{ display:'flex', gap:2, flexWrap:'wrap', mb:2 }}>
        <TextField label="Start" type="date" value={startDate}
          onChange={e=>setStartDate(e.target.value)} InputLabelProps={{shrink:true}}/>
        <TextField label="End"   type="date" value={endDate}
          onChange={e=>setEndDate(e.target.value)}   InputLabelProps={{shrink:true}}/>
        <Button variant="contained" onClick={fetchReport} disabled={loading}>Fetch</Button>
        {!!rows.length && <Button variant="outlined" onClick={downloadCSV}>Download CSV</Button>}
      </Box>

      {loading && <CircularProgress />}
      {error   && <Typography color="error">{error}</Typography>}

      {!!rows.length && (
        <TableContainer component={Paper} sx={{ mt:2, maxHeight:600, borderRadius:2 }}>
          <Table size="small" stickyHeader aria-label="Q and A data">
            <TableHead>
              <TableRow>
                {columns.map(col => (
                  <TableCell key={col.id}
                    sortDirection={sortBy===col.id?sortDirection:false}
                    sx={{ fontWeight:'bold', cursor:'pointer' }}
                  >
                    <TableSortLabel
                      active={sortBy===col.id}
                      direction={sortBy===col.id?sortDirection:'asc'}
                      onClick={() => handleSort(col.id)}
                    >
                      {col.label}
                    </TableSortLabel>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedRows.map((r, idx) => {
                const zebra  = idx%2;
                const isDark = theme.palette.mode==='dark';
                return (
                  <TableRow key={r.session_id+idx}
                    sx={{
                      backgroundColor: zebra
                        ? (isDark?theme.palette.grey[900]:theme.palette.grey[100])
                        : 'inherit',
                      '&:hover':{
                        backgroundColor: isDark
                          ? theme.palette.grey[800]
                          : theme.palette.grey[200]
                      }
                    }}
                  >
                    <TableCell>{r.session_id}</TableCell>
                    <TableCell>{r.user_email}</TableCell>
                    <TableCell>{r.question}</TableCell>
                    <TableCell>{r.answer}</TableCell>
                    <TableCell>{r.asked_at}</TableCell>
                    <TableCell>{r.answered_at}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {!loading && !rows.length && !error && (
        <Typography>No data for this period.</Typography>
      )}
    </Box>
  );
}
