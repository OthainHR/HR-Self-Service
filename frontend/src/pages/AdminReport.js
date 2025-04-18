import React, { useState } from 'react';
import { Box, Button, Typography, TextField, CircularProgress, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TableSortLabel } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { axiosInstance } from '../services/api';
import { saveAs } from 'file-saver'; // For CSV download

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

const columns = [
  { id: 'session_id', label: 'Session ID' },
  { id: 'user_email', label: 'User Email' },
  { id: 'question', label: 'Question' },
  { id: 'answer', label: 'Answer' },
  { id: 'asked_at', label: 'Asked At' },
  { id: 'answered_at', label: 'Answered At' },
];

const AdminReport = () => {
  const theme = useTheme();
  const [startDate, setStartDate] = useState(formatDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)));
  const [endDate, setEndDate] = useState(formatDate(new Date()));
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState('asked_at');
  const [sortDirection, setSortDirection] = useState('desc');

  const fetchReport = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axiosInstance.get('/chat/reports/weekly-qa', {
        params: { start_date: startDate, end_date: endDate }
      });
      setReport(res.data.results);
    } catch (err) {
      const errorMessage = 
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        `Failed to fetch report. Status: ${err?.response?.status || 'Network Error'}`;
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = () => {
    if (!report) return;
    let csv = 'Session ID,User Email,Question,Answer,Asked At,Answered At\n';
    report.forEach(row => {
      row.qas.forEach(qa => {
        csv += `"${row.session_id}","${row.user_email}","${qa.question.replace(/"/g, '""')}","${qa.answer.replace(/"/g, '""')}","${qa.asked_at}","${qa.answered_at}"\n`;
      });
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `weekly-qa-report-${startDate}_to_${endDate}.csv`);
  };

  // Flatten report for easier sorting
  const flattenedRows = (report || []).flatMap(row =>
    row.qas.map(qa => ({
      session_id: row.session_id,
      user_email: row.user_email,
      ...qa
    }))
  );

  // Sorting logic
  const handleSort = (columnId) => {
    if (sortBy === columnId) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(columnId);
      setSortDirection('asc');
    }
  };

  const sortedRows = [...flattenedRows].sort((a, b) => {
    let aValue = a[sortBy] || '';
    let bValue = b[sortBy] || '';
    // For dates, compare as Date objects
    if (sortBy === 'asked_at' || sortBy === 'answered_at') {
      aValue = aValue ? new Date(aValue) : new Date(0);
      bValue = bValue ? new Date(bValue) : new Date(0);
    }
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>Weekly Q&A Report</Typography>
      <Box sx={{ mt: 2, mb: 4, width: '100%', height: 600, overflow: 'hidden' }}>
        <iframe
          src={`${process.env.REACT_APP_BACKEND_URL}/qa-dashboard`}
          title="QA Dashboard"
          style={{ width: '100%', height: '100%', border: 'none' }}
        />
      </Box>
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <TextField
          label="Start Date"
          type="date"
          value={startDate}
          onChange={e => setStartDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label="End Date"
          type="date"
          value={endDate}
          onChange={e => setEndDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <Button variant="contained" onClick={fetchReport} disabled={loading}>Fetch Report</Button>
        {report && <Button variant="outlined" onClick={downloadCSV}>Download CSV</Button>}
      </Box>
      {loading && <CircularProgress />}
      {error && <Typography color="error">{error}</Typography>}
      {report && sortedRows.length > 0 && (
        <TableContainer component={Paper} sx={{ mt: 2, boxShadow: 3, borderRadius: 2, overflowX: 'auto', maxWidth: '100%' }}>
          <Table size="small" sx={{ minWidth: 1000 }}>
            <TableHead>
              <TableRow sx={{ backgroundColor: 'primary.main', color: 'primary.contrastText', position: 'sticky', top: 0, zIndex: 1 }}>
                {columns.map(col => (
                  <TableCell
                    key={col.id}
                    sortDirection={sortBy === col.id ? sortDirection : false}
                    sx={{ fontWeight: 'bold', backgroundColor: 'primary.main', color: 'primary.contrastText', cursor: 'pointer', position: 'sticky', top: 0, zIndex: 1 }}
                  >
                    <TableSortLabel
                      active={sortBy === col.id}
                      direction={sortBy === col.id ? sortDirection : 'asc'}
                      onClick={() => handleSort(col.id)}
                      sx={{ color: 'inherit', '& .MuiTableSortLabel-icon': { color: 'inherit !important' } }}
                    >
                      {col.label}
                    </TableSortLabel>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedRows.map((row, idx) => {
                // Theme-aware zebra striping and hover
                const isDark = theme.palette.mode === 'dark';
                const baseBg = isDark ? theme.palette.grey[900] : theme.palette.background.paper;
                const altBg = isDark ? theme.palette.grey[800] : theme.palette.grey[100];
                const hoverBg = isDark ? theme.palette.grey[700] : theme.palette.grey[200];
                const textColor = isDark ? theme.palette.common.white : theme.palette.text.primary;
                return (
                  <TableRow
                    key={row.session_id + idx}
                    sx={{
                      backgroundColor: idx % 2 === 0 ? baseBg : altBg,
                      color: textColor,
                      '&:hover': { backgroundColor: hoverBg },
                      transition: 'background 0.2s',
                    }}
                  >
                    <TableCell sx={{ color: textColor }}>{row.session_id}</TableCell>
                    <TableCell sx={{ color: textColor }}>{row.user_email}</TableCell>
                    <TableCell sx={{ color: textColor }}>{row.question}</TableCell>
                    <TableCell sx={{ color: textColor }}>{row.answer}</TableCell>
                    <TableCell sx={{ color: textColor }}>{row.asked_at}</TableCell>
                    <TableCell sx={{ color: textColor }}>{row.answered_at}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      {report && sortedRows.length === 0 && <Typography>No data for this period.</Typography>}
    </Box>
  );
};

export default AdminReport;
