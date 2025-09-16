import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Alert,
  Skeleton,
  Grid,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import { Receipt as PayslipIcon, Download as DownloadIcon } from '@mui/icons-material';
import { hrService } from '../../services/hrServiceDirect';

const HRPayslips = () => {
  const [payslip, setPayslip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    loadPayslip();

    const handleRefresh = () => loadPayslip();
    window.addEventListener('hrRefresh', handleRefresh);
    
    return () => window.removeEventListener('hrRefresh', handleRefresh);
  }, [selectedMonth, selectedYear]);

  const loadPayslip = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await hrService.getMyPayslip(selectedMonth, selectedYear);
      
      if (result.success) {
        setPayslip(result.data);
      } else {
        setError(result.error);
        setPayslip(null);
      }
    } catch (err) {
      setError('Failed to load payslip');
      setPayslip(null);
    } finally {
      setLoading(false);
    }
  };

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  if (loading) {
    return (
      <Card elevation={2}>
        <CardContent>
          <Skeleton variant="text" height={40} width="50%" />
          <Grid container spacing={2} sx={{ mt: 2 }}>
            <Grid item xs={12} sm={6}>
              <Skeleton variant="rectangular" height={56} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Skeleton variant="rectangular" height={56} />
            </Grid>
          </Grid>
          <Skeleton variant="rectangular" height={300} sx={{ mt: 3 }} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card elevation={2}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <PayslipIcon sx={{ mr: 1 }} />
          <Typography variant="h6">Payslips</Typography>
        </Box>

        {/* Month/Year Selector */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth>
              <InputLabel>Month</InputLabel>
              <Select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                label="Month"
                sx={{ borderRadius: 1.5 }}
              >
                {months.map((month, index) => (
                  <MenuItem key={index} value={index + 1}>
                    {month}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth>
              <InputLabel>Year</InputLabel>
              <Select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                label="Year"
                sx={{ borderRadius: 1.5 }}
              >
                {years.map((year) => (
                  <MenuItem key={year} value={year}>
                    {year}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<DownloadIcon />}
              disabled={!payslip}
              sx={{ height: 56, borderRadius: 1.5 }}
            >
              Download PDF
            </Button>
          </Grid>
        </Grid>

        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 1.5 }}>
            {error}
          </Alert>
        )}

        {payslip ? (
          <Box>
            {/* Payslip Summary */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Paper elevation={0} sx={{ p: 2, bgcolor: 'primary.light', textAlign: 'center' }}>
                  <Typography variant="h4" color="primary.main">
                    ₹{payslip.gross_salary?.toLocaleString() || '0'}
                  </Typography>
                  <Typography variant="body2" color="primary.dark">
                    Gross Salary
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Paper elevation={0} sx={{ p: 2, bgcolor: 'success.light', textAlign: 'center' }}>
                  <Typography variant="h4" color="success.main">
                    ₹{payslip.net_salary?.toLocaleString() || '0'}
                  </Typography>
                  <Typography variant="body2" color="success.dark">
                    Net Salary
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Paper elevation={0} sx={{ p: 2, bgcolor: 'warning.light', textAlign: 'center' }}>
                  <Typography variant="h4" color="warning.main">
                    ₹{payslip.total_deductions?.toLocaleString() || '0'}
                  </Typography>
                  <Typography variant="body2" color="warning.dark">
                    Total Deductions
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Paper elevation={0} sx={{ p: 2, bgcolor: 'info.light', textAlign: 'center' }}>
                  <Typography variant="h4" color="info.main">
                    {months[selectedMonth - 1]} {selectedYear}
                  </Typography>
                  <Typography variant="body2" color="info.dark">
                    Pay Period
                  </Typography>
                </Paper>
              </Grid>
            </Grid>

            {/* Earnings and Deductions Table */}
            <Grid container spacing={2}>
              {/* Earnings */}
              <Grid item xs={12} md={6}>
                <Paper elevation={1}>
                  <Box sx={{ p: 2, bgcolor: 'success.main', color: 'white' }}>
                    <Typography variant="h6">Earnings</Typography>
                  </Box>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Component</TableCell>
                          <TableCell align="right">Amount (₹)</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {payslip.earnings?.map((earning, index) => (
                          <TableRow key={index}>
                            <TableCell>{earning.component}</TableCell>
                            <TableCell align="right">{earning.amount.toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow sx={{ bgcolor: 'success.light' }}>
                          <TableCell><strong>Total Earnings</strong></TableCell>
                          <TableCell align="right"><strong>₹{payslip.gross_salary?.toLocaleString()}</strong></TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              </Grid>

              {/* Deductions */}
              <Grid item xs={12} md={6}>
                <Paper elevation={1}>
                  <Box sx={{ p: 2, bgcolor: 'error.main', color: 'white' }}>
                    <Typography variant="h6">Deductions</Typography>
                  </Box>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Component</TableCell>
                          <TableCell align="right">Amount (₹)</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {payslip.deductions?.map((deduction, index) => (
                          <TableRow key={index}>
                            <TableCell>{deduction.component}</TableCell>
                            <TableCell align="right">{deduction.amount.toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow sx={{ bgcolor: 'error.light' }}>
                          <TableCell><strong>Total Deductions</strong></TableCell>
                          <TableCell align="right"><strong>₹{payslip.total_deductions?.toLocaleString()}</strong></TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              </Grid>
            </Grid>
          </Box>
        ) : (
          <Alert severity="info" variant="outlined" sx={{ borderRadius: 1.5 }}>
            No payslip found for {months[selectedMonth - 1]} {selectedYear}
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default HRPayslips;
