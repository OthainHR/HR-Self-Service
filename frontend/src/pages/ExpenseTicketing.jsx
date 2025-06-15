import React from 'react';
import ExpenseTicketing from '../features/ticketing/ExpenseTicketingPage';

export default function Ticketing() {
  return (
    <div style={{
      width: '100%',
      minHeight: '100vh',
      display: 'flex', 
      flexDirection: 'column'
    }}>
      <ExpenseTicketing />
    </div>
  );
} 