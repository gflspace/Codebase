/**
 * MiKO Appointment Management Hooks
 *
 * React hooks for fetching and managing appointments from Supabase
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase, subscribeToAppointments, isSupabaseConfigured } from '@/lib/supabase';
import { startOfDay, endOfDay, addDays, format } from 'date-fns';

/**
 * Hook to fetch appointments
 * @param {Object} options - Query options
 * @param {Date} options.startDate - Start date filter
 * @param {Date} options.endDate - End date filter
 * @param {string} options.status - Filter by status
 * @param {boolean} options.realtime - Enable real-time updates
 * @returns {Object} Appointments data and loading state
 */
export function useAppointments({
  startDate = null,
  endDate = null,
  status = null,
  realtime = true,
} = {}) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAppointments = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setError('Supabase not configured');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      let query = supabase
        .from('appointments')
        .select(`
          *,
          leads (
            id,
            full_name,
            email,
            phone
          )
        `)
        .order('scheduled_at', { ascending: true });

      if (startDate) {
        query = query.gte('scheduled_at', startDate.toISOString());
      }

      if (endDate) {
        query = query.lte('scheduled_at', endDate.toISOString());
      }

      if (status) {
        if (Array.isArray(status)) {
          query = query.in('status', status);
        } else {
          query = query.eq('status', status);
        }
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      // Transform data to match expected format
      const transformed = (data || []).map((apt) => ({
        ...apt,
        patientName: apt.leads?.full_name || 'Unknown',
        patientEmail: apt.leads?.email,
        patientPhone: apt.leads?.phone,
        type: apt.appointment_type,
        procedure: apt.procedure_of_interest,
        start: new Date(apt.scheduled_at),
      }));

      setAppointments(transformed);
      setError(null);
    } catch (err) {
      console.error('Error fetching appointments:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, status]);

  useEffect(() => {
    fetchAppointments();

    if (realtime && isSupabaseConfigured()) {
      const subscription = subscribeToAppointments((payload) => {
        if (payload.eventType === 'INSERT') {
          fetchAppointments(); // Refetch to get joined data
        } else if (payload.eventType === 'UPDATE') {
          setAppointments((prev) =>
            prev.map((apt) =>
              apt.id === payload.new.id ? { ...apt, ...payload.new } : apt
            )
          );
        } else if (payload.eventType === 'DELETE') {
          setAppointments((prev) => prev.filter((apt) => apt.id !== payload.old.id));
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [fetchAppointments, realtime]);

  return { appointments, loading, error, refetch: fetchAppointments };
}

/**
 * Hook to fetch today's appointments
 * @returns {Object} Today's appointments and loading state
 */
export function useTodaysAppointments() {
  const today = new Date();
  return useAppointments({
    startDate: startOfDay(today),
    endDate: endOfDay(today),
    status: ['pending', 'confirmed', 'reminded', 'checked_in'],
  });
}

/**
 * Hook to fetch upcoming appointments (next 7 days)
 * @param {number} days - Number of days to look ahead
 * @returns {Object} Upcoming appointments and loading state
 */
export function useUpcomingAppointments(days = 7) {
  const today = new Date();
  return useAppointments({
    startDate: today,
    endDate: addDays(today, days),
    status: ['pending', 'confirmed', 'reminded'],
  });
}

/**
 * Hook to fetch available time slots
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @param {number} duration - Slot duration in minutes
 * @returns {Object} Available slots and loading state
 */
export function useAvailableSlots(startDate, endDate, duration = 60) {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!startDate || !endDate || !isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    const fetchSlots = async () => {
      try {
        setLoading(true);

        // Call the database function to get available slots
        const { data, error: fetchError } = await supabase.rpc('get_available_slots', {
          start_date: format(startDate, 'yyyy-MM-dd'),
          end_date: format(endDate, 'yyyy-MM-dd'),
          slot_duration_minutes: duration,
        });

        if (fetchError) {
          // Fallback: generate slots manually if RPC doesn't exist
          console.warn('get_available_slots RPC not available, using fallback');
          const fallbackSlots = generateFallbackSlots(startDate, endDate, duration);
          setSlots(fallbackSlots);
        } else {
          setSlots(data || []);
        }

        setError(null);
      } catch (err) {
        console.error('Error fetching available slots:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSlots();
  }, [startDate, endDate, duration]);

  return { slots, loading, error };
}

/**
 * Generate fallback slots when RPC is not available
 */
function generateFallbackSlots(startDate, endDate, duration) {
  const slots = [];
  const current = new Date(startDate);

  while (current <= endDate) {
    const dayOfWeek = current.getDay();

    // Skip weekends
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      // Business hours: 9 AM to 5 PM
      for (let hour = 9; hour < 17; hour++) {
        const slotStart = new Date(current);
        slotStart.setHours(hour, 0, 0, 0);

        const slotEnd = new Date(slotStart);
        slotEnd.setMinutes(slotEnd.getMinutes() + duration);

        slots.push({
          slot_start: slotStart.toISOString(),
          slot_end: slotEnd.toISOString(),
          slot_date: format(current, 'yyyy-MM-dd'),
          slot_time: format(slotStart, 'HH:mm:ss'),
        });
      }
    }

    current.setDate(current.getDate() + 1);
  }

  return slots;
}

export default useAppointments;
