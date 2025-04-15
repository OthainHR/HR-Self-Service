import React, { useState } from 'react';
import { Box, Button, Typography, TextField, CircularProgress, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import { axiosInstance } from '../services/api';
import { saveAs } from 'file-saver'; // For CSV download

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

const AdminReport = () => {
  const [startDate, setStartDate] = useState(formatDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)));
  const [endDate, setEndDate] = useState(formatDate(new Date()));
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');

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

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>Weekly Q&A Report</Typography>
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
      {report && report.length > 0 && (
        <TableContainer component={Paper} sx={{ mt: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Session ID</TableCell>
                <TableCell>User Email</TableCell>
                <TableCell>Question</TableCell>
                <TableCell>Answer</TableCell>
                <TableCell>Asked At</TableCell>
                <TableCell>Answered At</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {report.map(row =>
                row.qas.map((qa, idx) => (
                  <TableRow key={row.session_id + idx}>
                    <TableCell>{row.session_id}</TableCell>
                    <TableCell>{row.user_email}</TableCell>
                    <TableCell>{qa.question}</TableCell>
                    <TableCell>{qa.answer}</TableCell>
                    <TableCell>{qa.asked_at}</TableCell>
                    <TableCell>{qa.answered_at}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      {report && report.length === 0 && <Typography>No data for this period.</Typography>}
    </Box>
  );
};

export default AdminReport;
