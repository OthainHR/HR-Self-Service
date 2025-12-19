import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

export function useTicketAssigneeRole(userId) {
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setRole(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .from('ticket_assignees')
      .select('role')
      .eq('user_id', userId)
      .single()
      .then(({ data, error }) => {
        if (data) setRole(data.role);
        else setRole(null);
        setLoading(false);
      });
  }, [userId]);

  return { role, loading };
} 