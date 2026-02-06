/**
 * MiKO Appointment Service
 *
 * API functions for managing appointments in Supabase
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';

/**
 * Create a new appointment
 * @param {Object} appointmentData - Appointment data
 * @returns {Promise<Object>} Created appointment or error
 */
export async function createAppointment(appointmentData) {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    const { data, error } = await supabase
      .from('appointments')
      .insert([
        {
          lead_id: appointmentData.lead_id || appointmentData.leadId,
          appointment_type: appointmentData.type || appointmentData.appointment_type || 'virtual',
          status: 'pending',
          scheduled_at: appointmentData.scheduled_at || appointmentData.scheduledAt,
          duration_minutes: appointmentData.duration || 60,
          location: appointmentData.location,
          virtual_meeting_url: appointmentData.virtual_meeting_url,
          procedure_of_interest: appointmentData.procedure,
          consultation_notes: appointmentData.notes,
          booked_via: appointmentData.booked_via || 'website',
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error creating appointment:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update appointment status
 * @param {string} appointmentId - Appointment ID
 * @param {string} status - New status
 * @returns {Promise<Object>} Updated appointment or error
 */
export async function updateAppointmentStatus(appointmentId, status) {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    const updateData = { status };

    // Handle specific status transitions
    switch (status) {
      case 'confirmed':
        updateData.patient_confirmed = true;
        updateData.patient_confirmed_at = new Date().toISOString();
        break;
      case 'checked_in':
        updateData.checked_in_at = new Date().toISOString();
        break;
      case 'in_progress':
        updateData.actual_start_time = new Date().toISOString();
        break;
      case 'completed':
        updateData.actual_end_time = new Date().toISOString();
        break;
      case 'no_show':
        updateData.marked_no_show_at = new Date().toISOString();
        break;
      case 'cancelled':
        updateData.cancelled_at = new Date().toISOString();
        break;
    }

    const { data, error } = await supabase
      .from('appointments')
      .update(updateData)
      .eq('id', appointmentId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error updating appointment status:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Cancel an appointment
 * @param {string} appointmentId - Appointment ID
 * @param {string} reason - Cancellation reason
 * @param {string} notes - Additional notes
 * @returns {Promise<Object>} Updated appointment or error
 */
export async function cancelAppointment(appointmentId, reason, notes = '') {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    const { data, error } = await supabase
      .from('appointments')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason,
        cancellation_notes: notes,
      })
      .eq('id', appointmentId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error cancelling appointment:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Reschedule an appointment
 * @param {string} appointmentId - Original appointment ID
 * @param {string} newDateTime - New scheduled time
 * @returns {Promise<Object>} New appointment or error
 */
export async function rescheduleAppointment(appointmentId, newDateTime) {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    // Get the original appointment
    const { data: original, error: fetchError } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', appointmentId)
      .single();

    if (fetchError) throw fetchError;

    // Create new appointment
    const { data: newAppointment, error: createError } = await supabase
      .from('appointments')
      .insert([
        {
          lead_id: original.lead_id,
          appointment_type: original.appointment_type,
          status: 'pending',
          scheduled_at: newDateTime,
          duration_minutes: original.duration_minutes,
          location: original.location,
          virtual_meeting_url: original.virtual_meeting_url,
          procedure_of_interest: original.procedure_of_interest,
          consultation_notes: original.consultation_notes,
          booked_via: 'reschedule',
          rescheduled_from_id: appointmentId,
        },
      ])
      .select()
      .single();

    if (createError) throw createError;

    // Update original appointment
    const { error: updateError } = await supabase
      .from('appointments')
      .update({
        status: 'rescheduled',
        rescheduled_to_id: newAppointment.id,
      })
      .eq('id', appointmentId);

    if (updateError) throw updateError;

    return { success: true, data: newAppointment };
  } catch (error) {
    console.error('Error rescheduling appointment:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Check if a time slot is available
 * @param {string} dateTime - DateTime to check
 * @param {number} duration - Duration in minutes
 * @returns {Promise<Object>} Availability status
 */
export async function checkSlotAvailability(dateTime, duration = 60) {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    const { data, error } = await supabase.rpc('is_slot_available', {
      check_time: dateTime,
      duration_minutes: duration,
    });

    if (error) {
      // Fallback to manual check
      const checkTime = new Date(dateTime);
      const endTime = new Date(checkTime.getTime() + duration * 60000);

      const { data: conflicts, error: conflictError } = await supabase
        .from('appointments')
        .select('id')
        .in('status', ['pending', 'confirmed', 'reminded'])
        .gte('scheduled_at', checkTime.toISOString())
        .lt('scheduled_at', endTime.toISOString());

      if (conflictError) throw conflictError;

      return { success: true, available: conflicts.length === 0 };
    }

    return { success: true, available: data };
  } catch (error) {
    console.error('Error checking slot availability:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Mark reminder as sent
 * @param {string} appointmentId - Appointment ID
 * @param {string} reminderType - Type of reminder (48h, 24h, 2h)
 * @returns {Promise<Object>} Updated appointment or error
 */
export async function markReminderSent(appointmentId, reminderType) {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    const fieldMap = {
      '48h': 'reminder_48h_sent_at',
      '24h': 'reminder_24h_sent_at',
      '2h': 'reminder_2h_sent_at',
    };

    const field = fieldMap[reminderType];
    if (!field) {
      return { success: false, error: 'Invalid reminder type' };
    }

    const { data, error } = await supabase
      .from('appointments')
      .update({ [field]: new Date().toISOString() })
      .eq('id', appointmentId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error marking reminder as sent:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Add outcome notes to completed appointment
 * @param {string} appointmentId - Appointment ID
 * @param {string} notes - Outcome notes
 * @param {string} nextSteps - Next steps
 * @param {boolean} followUpRequired - Whether follow-up is needed
 * @returns {Promise<Object>} Updated appointment or error
 */
export async function addAppointmentOutcome(
  appointmentId,
  notes,
  nextSteps = '',
  followUpRequired = false
) {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    const { data, error } = await supabase
      .from('appointments')
      .update({
        outcome_notes: notes,
        next_steps: nextSteps,
        follow_up_required: followUpRequired,
      })
      .eq('id', appointmentId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error adding appointment outcome:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get appointment by ID
 * @param {string} appointmentId - Appointment ID
 * @returns {Promise<Object>} Appointment data or error
 */
export async function getAppointment(appointmentId) {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        leads (
          id,
          full_name,
          email,
          phone
        ),
        appointment_reminders (*)
      `)
      .eq('id', appointmentId)
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error fetching appointment:', error);
    return { success: false, error: error.message };
  }
}

export default {
  createAppointment,
  updateAppointmentStatus,
  cancelAppointment,
  rescheduleAppointment,
  checkSlotAvailability,
  markReminderSent,
  addAppointmentOutcome,
  getAppointment,
};
