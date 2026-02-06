/**
 * MiKO Lead Service
 *
 * API functions for managing leads in Supabase
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';

/**
 * Create a new lead
 * @param {Object} leadData - Lead data
 * @returns {Promise<Object>} Created lead or error
 */
export async function createLead(leadData) {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    const { data, error } = await supabase
      .from('leads')
      .insert([
        {
          full_name: leadData.name || leadData.full_name,
          email: leadData.email,
          phone: leadData.phone,
          source: leadData.source || 'website',
          status: 'new',
          notes: leadData.notes || leadData.message,
          utm_source: leadData.utm_source,
          utm_medium: leadData.utm_medium,
          utm_campaign: leadData.utm_campaign,
          referrer_url: leadData.referrer_url,
          landing_page: leadData.landing_page,
          metadata: leadData.metadata || {},
        },
      ])
      .select()
      .single();

    if (error) throw error;

    // If procedure interest provided, create clinical interest
    if (leadData.procedure) {
      await createClinicalInterest(data.id, leadData.procedure);
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error creating lead:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update lead status
 * @param {string} leadId - Lead ID
 * @param {string} status - New status
 * @returns {Promise<Object>} Updated lead or error
 */
export async function updateLeadStatus(leadId, status) {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    const updateData = { status };

    // Set first_contacted_at if transitioning from 'new'
    if (status === 'contacted') {
      const { data: currentLead } = await supabase
        .from('leads')
        .select('first_contacted_at')
        .eq('id', leadId)
        .single();

      if (!currentLead?.first_contacted_at) {
        updateData.first_contacted_at = new Date().toISOString();
      }
    }

    const { data, error } = await supabase
      .from('leads')
      .update(updateData)
      .eq('id', leadId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error updating lead status:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update lead details
 * @param {string} leadId - Lead ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated lead or error
 */
export async function updateLead(leadId, updates) {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    const { data, error } = await supabase
      .from('leads')
      .update(updates)
      .eq('id', leadId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error updating lead:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Add notes to a lead
 * @param {string} leadId - Lead ID
 * @param {string} notes - Notes to add
 * @param {boolean} internal - Whether notes are internal only
 * @returns {Promise<Object>} Updated lead or error
 */
export async function addLeadNotes(leadId, notes, internal = false) {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    const field = internal ? 'internal_notes' : 'notes';
    const { data: currentLead } = await supabase
      .from('leads')
      .select(field)
      .eq('id', leadId)
      .single();

    const existingNotes = currentLead?.[field] || '';
    const timestamp = new Date().toLocaleString();
    const newNotes = `${existingNotes}\n[${timestamp}] ${notes}`.trim();

    const { data, error } = await supabase
      .from('leads')
      .update({ [field]: newNotes })
      .eq('id', leadId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error adding lead notes:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Assign lead to staff member
 * @param {string} leadId - Lead ID
 * @param {string} userId - User ID to assign
 * @returns {Promise<Object>} Updated lead or error
 */
export async function assignLead(leadId, userId) {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    const { data, error } = await supabase
      .from('leads')
      .update({
        assigned_to: userId,
        assigned_at: new Date().toISOString(),
      })
      .eq('id', leadId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error assigning lead:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Mark clinical review as complete
 * @param {string} leadId - Lead ID
 * @param {string} reviewerId - Reviewer user ID
 * @param {string} notes - Review notes
 * @returns {Promise<Object>} Updated lead or error
 */
export async function completeClinicalReview(leadId, reviewerId, notes = '') {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    const { data, error } = await supabase
      .from('leads')
      .update({
        requires_clinical_review: false,
        clinical_review_completed_at: new Date().toISOString(),
        clinical_reviewer_id: reviewerId,
        internal_notes: notes
          ? `[Clinical Review] ${notes}`
          : '[Clinical Review] Completed',
      })
      .eq('id', leadId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error completing clinical review:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Create clinical interest for a lead
 * @param {string} leadId - Lead ID
 * @param {string} procedure - Procedure name
 * @param {Object} details - Additional details
 * @returns {Promise<Object>} Created interest or error
 */
export async function createClinicalInterest(leadId, procedure, details = {}) {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    // Map common procedure names to categories
    const categoryMap = {
      rhinoplasty: 'facial',
      facelift: 'facial',
      blepharoplasty: 'facial',
      brow_lift: 'facial',
      breast_augmentation: 'breast',
      breast_lift: 'breast',
      breast_reduction: 'breast',
      tummy_tuck: 'body',
      liposuction: 'body',
      bbl: 'body',
      mommy_makeover: 'body',
      botox: 'non_surgical',
      filler: 'non_surgical',
    };

    const procedureKey = procedure.toLowerCase().replace(/\s+/g, '_');
    const category = categoryMap[procedureKey] || 'other';

    const { data, error } = await supabase
      .from('clinical_interests')
      .insert([
        {
          lead_id: leadId,
          procedure_category: category,
          specific_procedure: procedure,
          interest_level: details.interest_level || 5,
          timeline: details.timeline,
          budget_range: details.budget_range,
          is_revision: details.is_revision || false,
          has_prior_surgery: details.has_prior_surgery || false,
          prior_surgery_details: details.prior_surgery_details,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error creating clinical interest:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Search leads
 * @param {string} query - Search query
 * @param {Object} filters - Additional filters
 * @returns {Promise<Object>} Search results or error
 */
export async function searchLeads(query, filters = {}) {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    let dbQuery = supabase
      .from('leads')
      .select(`
        *,
        clinical_interests (
          procedure_category,
          specific_procedure
        )
      `)
      .order('created_at', { ascending: false });

    // Text search
    if (query) {
      dbQuery = dbQuery.or(
        `full_name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`
      );
    }

    // Status filter
    if (filters.status) {
      dbQuery = dbQuery.eq('status', filters.status);
    }

    // Source filter
    if (filters.source) {
      dbQuery = dbQuery.eq('source', filters.source);
    }

    // Date range filter
    if (filters.startDate) {
      dbQuery = dbQuery.gte('created_at', filters.startDate);
    }
    if (filters.endDate) {
      dbQuery = dbQuery.lte('created_at', filters.endDate);
    }

    // Risk level filter
    if (filters.riskLevel) {
      dbQuery = dbQuery.eq('risk_level', filters.riskLevel);
    }

    // Limit
    if (filters.limit) {
      dbQuery = dbQuery.limit(filters.limit);
    }

    const { data, error } = await dbQuery;

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error searching leads:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Archive a lead
 * @param {string} leadId - Lead ID
 * @returns {Promise<Object>} Updated lead or error
 */
export async function archiveLead(leadId) {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    const { data, error } = await supabase
      .from('leads')
      .update({
        status: 'archived',
        archived_at: new Date().toISOString(),
      })
      .eq('id', leadId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error archiving lead:', error);
    return { success: false, error: error.message };
  }
}

export default {
  createLead,
  updateLeadStatus,
  updateLead,
  addLeadNotes,
  assignLead,
  completeClinicalReview,
  createClinicalInterest,
  searchLeads,
  archiveLead,
};
