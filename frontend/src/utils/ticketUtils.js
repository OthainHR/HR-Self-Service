// Utility functions for ticket number generation and formatting

/**
 * Generate proper ticket number based on category ID and creation chronology
 * @param {string} ticketId - The ticket UUID
 * @param {number} categoryId - The category ID
 * @param {Array} allTickets - Array of all tickets for calculating sequence
 * @returns {string} - Formatted ticket number (e.g., "OTH-IT001")
 */
export const generateTicketNumber = (ticketId, categoryId, allTickets = []) => {
  // Category prefix mapping based on category IDs
  const categoryPrefixes = {
    1: 'OTH-IT',   // IT Requests
    2: 'OTH-HR',   // HR Requests  
    3: 'OTH-PAY',  // Payroll Requests
    4: 'OTH-OPS',  // Operations
    5: 'OTH-EXP',  // Expense Management
    6: 'OTH-AI',   // AI Requests
  };
  
  const prefix = categoryPrefixes[categoryId] || 'OTH-GEN';
  
  // If we have all tickets, calculate the proper sequence number
  if (allTickets.length > 0) {
    // Find the current ticket
    const currentTicket = allTickets.find(t => t.id === ticketId);
    if (!currentTicket) {
      // Fallback to simple numbering if ticket not found
      return `${prefix}${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
    }
    
    // Get all tickets in the same category
    const categoryTickets = allTickets.filter(t => t.category_id === categoryId);
    
    // Sort by creation date, then by ID for consistent ordering
    const sortedTickets = categoryTickets.sort((a, b) => {
      const dateCompare = new Date(a.created_at) - new Date(b.created_at);
      if (dateCompare !== 0) return dateCompare;
      return a.id.localeCompare(b.id);
    });
    
    // Find the position of current ticket in the sorted list
    const sequenceNumber = sortedTickets.findIndex(t => t.id === ticketId) + 1;
    
    return `${prefix}${String(sequenceNumber).padStart(3, '0')}`;
  }
  
  // Fallback: use a simple approach if no ticket data available
  return `${prefix}${ticketId.slice(0, 3).toUpperCase()}`;
};

/**
 * Generate ticket number from category name (legacy support)
 * @param {string} categoryName - The category name
 * @param {string} ticketId - The ticket UUID
 * @returns {string} - Formatted ticket number
 */
export const generateTicketNumberFromName = (categoryName, ticketId) => {
  const category = (categoryName || '').toLowerCase().trim();
  let prefix = 'OTH-GEN';

  const IT_NAMES   = ['it', 'it support', 'it requests', 'technical'];
  const HR_NAMES   = ['hr', 'hr support', 'hr requests', 'human resources', 'leave applications', 'benefits inquiries'];
  const EXP_NAMES  = ['expense', 'expense management', 'expenses'];
  const PAY_NAMES  = ['payroll', 'payroll requests', 'accounts', 'accounts support', 'accounts requests', 'tax payments'];
  const OPS_NAMES  = ['operations', 'ops'];
  const AI_NAMES   = ['ai', 'ai request', 'ai requests', 'general ai request'];

  if (IT_NAMES.includes(category)) {
    prefix = 'OTH-IT';
  } else if (HR_NAMES.includes(category)) {
    prefix = 'OTH-HR';
  } else if (EXP_NAMES.includes(category)) {
    prefix = 'OTH-EXP';
  } else if (PAY_NAMES.includes(category)) {
    prefix = 'OTH-PAY';
  } else if (OPS_NAMES.includes(category)) {
    prefix = 'OTH-OPS';
  } else if (AI_NAMES.includes(category)) {
    prefix = 'OTH-AI';
  }

  return `${prefix}${ticketId.slice(0, 8)}`;
};

/**
 * Create a map of ticket IDs to their sequential numbers for efficient lookup
 * @param {Array} tickets - Array of tickets
 * @returns {Object} - Map of ticketId -> ticketNumber
 */
export const createTicketNumberMap = (tickets) => {
  const numberMap = {};
  
  if (!tickets || tickets.length === 0) {
    return numberMap;
  }
  
  // Group tickets by category
  const ticketsByCategory = tickets.reduce((acc, ticket) => {
    const categoryId = ticket.category_id;
    if (!acc[categoryId]) acc[categoryId] = [];
    acc[categoryId].push(ticket);
    return acc;
  }, {});
  
  // Generate numbers for each category
  Object.entries(ticketsByCategory).forEach(([categoryId, categoryTickets]) => {
    // Sort by creation date, then by ID for consistent ordering
    const sortedTickets = categoryTickets.sort((a, b) => {
      const dateCompare = new Date(a.created_at) - new Date(b.created_at);
      if (dateCompare !== 0) return dateCompare;
      return a.id.localeCompare(b.id);
    });
    
    // Category prefix mapping
    const categoryPrefixes = {
      1: 'OTH-IT',   // IT Requests
      2: 'OTH-HR',   // HR Requests  
      3: 'OTH-PAY',  // Payroll Requests
      4: 'OTH-OPS',  // Operations
      5: 'OTH-EXP',  // Expense Management
      6: 'OTH-AI',   // AI Requests
    };
    
    const prefix = categoryPrefixes[parseInt(categoryId)] || 'OTH-GEN';
    
    // Assign sequential numbers directly
    sortedTickets.forEach((ticket, index) => {
      const sequenceNumber = index + 1;
      numberMap[ticket.id] = `${prefix}${String(sequenceNumber).padStart(3, '0')}`;
    });
  });
  
  return numberMap;
};

/**
 * Format ticket number for display
 * @param {string} ticketNumber - The ticket number
 * @returns {string} - Formatted for display
 */
export const formatTicketNumber = (ticketNumber) => {
  if (!ticketNumber) return 'N/A';
  return ticketNumber;
};

/**
 * Get category prefix from category ID
 * @param {number} categoryId - The category ID
 * @returns {string} - Category prefix
 */
export const getCategoryPrefix = (categoryId) => {
  const prefixes = {
    1: 'OTH-IT',   // IT Requests
    2: 'OTH-HR',   // HR Requests  
    3: 'OTH-PAY',  // Payroll Requests
    4: 'OTH-OPS',  // Operations
    5: 'OTH-EXP',  // Expense Management
    6: 'OTH-AI',   // AI Requests
  };
  
  return prefixes[categoryId] || 'OTH-GEN';
}; 