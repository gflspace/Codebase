/**
 * MiKO Lead Management Hooks
 *
 * React hooks for fetching and managing leads from Supabase
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase, subscribeToLeads, isSupabaseConfigured } from '@/lib/supabase';

/**
 * Hook to fetch and subscribe to leads
 * @param {Object} options - Query options
 * @param {string} options.status - Filter by status
 * @param {number} options.limit - Number of leads to fetch
 * @param {boolean} options.realtime - Enable real-time updates
 * @returns {Object} Leads data and loading state
 */
export function useLeads({ status = null, limit = 50, realtime = true } = {}) {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchLeads = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setError('Supabase not configured');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      let query = supabase
        .from('leads')
        .select(`
          *,
          clinical_interests (
            id,
            procedure_category,
            specific_procedure,
            interest_level,
            is_revision
          ),
          appointments (
            id,
            appointment_type,
            status,
            scheduled_at
          )
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setLeads(data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching leads:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [status, limit]);

  useEffect(() => {
    fetchLeads();

    if (realtime && isSupabaseConfigured()) {
      const subscription = subscribeToLeads((payload) => {
        if (payload.eventType === 'INSERT') {
          setLeads((prev) => [payload.new, ...prev].slice(0, limit));
        } else if (payload.eventType === 'UPDATE') {
          setLeads((prev) =>
            prev.map((lead) => (lead.id === payload.new.id ? { ...lead, ...payload.new } : lead))
          );
        } else if (payload.eventType === 'DELETE') {
          setLeads((prev) => prev.filter((lead) => lead.id !== payload.old.id));
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [fetchLeads, realtime, limit]);

  return { leads, loading, error, refetch: fetchLeads };
}

/**
 * Hook to fetch a single lead by ID
 * @param {string} leadId - Lead ID
 * @returns {Object} Lead data and loading state
 */
export function useLead(leadId) {
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!leadId || !isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    const fetchLead = async () => {
      try {
        setLoading(true);
        const { data, error: fetchError } = await supabase
          .from('leads')
          .select(`
            *,
            clinical_interests (*),
            appointments (*),
            ai_qual_logs (
              id,
              input_message,
              ai_response,
              intent_detected,
              escalated,
              created_at
            ),
            communication_audit (
              id,
              channel,
              direction,
              message_body,
              created_at
            )
          `)
          .eq('id', leadId)
          .single();

        if (fetchError) throw fetchError;
        setLead(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching lead:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchLead();
  }, [leadId]);

  return { lead, loading, error };
}

/**
 * Hook to fetch lead pipeline statistics
 * @param {number} days - Number of days to look back
 * @returns {Object} Pipeline stats and loading state
 */
export function useLeadStats(days = 30) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    const fetchStats = async () => {
      try {
        setLoading(true);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        // Get lead counts by status
        const { data: pipelineData, error: pipelineError } = await supabase.rpc(
          'get_lead_pipeline_stats',
          {
            start_date: startDate.toISOString(),
            end_date: new Date().toISOString(),
          }
        );

        if (pipelineError) {
          // Fall back to manual query if RPC doesn't exist yet
          const { data: leads, error: leadsError } = await supabase
            .from('leads')
            .select('status, created_at')
            .gte('created_at', startDate.toISOString());

          if (leadsError) throw leadsError;

          const statusCounts = leads.reduce((acc, lead) => {
            acc[lead.status] = (acc[lead.status] || 0) + 1;
            return acc;
          }, {});

          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const newToday = leads.filter((l) => new Date(l.created_at) >= today).length;

          setStats({
            totalLeads: leads.length,
            newLeadsToday: newToday,
            byStatus: statusCounts,
            conversionRate: statusCounts.completed
              ? Math.round((statusCounts.completed / leads.length) * 100)
              : 0,
          });
        } else {
          // Use RPC results
          const totalLeads = pipelineData.reduce((sum, row) => sum + Number(row.count), 0);
          const statusCounts = pipelineData.reduce((acc, row) => {
            acc[row.status] = Number(row.count);
            return acc;
          }, {});

          setStats({
            totalLeads,
            byStatus: statusCounts,
            conversionRate: statusCounts.completed
              ? Math.round((statusCounts.completed / totalLeads) * 100)
              : 0,
          });
        }

        setError(null);
      } catch (err) {
        console.error('Error fetching lead stats:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [days]);

  return { stats, loading, error };
}

/**
 * Hook to fetch leads requiring clinical review
 * @returns {Object} Escalated leads and loading state
 */
export function useEscalatedLeads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    const fetchEscalated = async () => {
      try {
        setLoading(true);
        const { data, error: fetchError } = await supabase
          .from('leads')
          .select(`
            *,
            ai_qual_logs (
              input_message,
              risk_keywords_detected,
              escalation_reason,
              created_at
            )
          `)
          .eq('requires_clinical_review', true)
          .is('clinical_review_completed_at', null)
          .order('created_at', { ascending: true });

        if (fetchError) throw fetchError;
        setLeads(data || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching escalated leads:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchEscalated();
  }, []);

  return { leads, loading, error };
}

export default useLeads;
