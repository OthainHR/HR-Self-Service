import React from 'react';
import TicketingPage from '../features/ticketing/TicketingPage';

export default function Ticketing() {
  return (
    <div style={{
      width: '100%',
      minHeight: '100vh',
      display: 'flex', 
      flexDirection: 'column'
    }}>
      <TicketingPage />
    </div>
  );
} 