/**
 * MiKO Reminder Webhook Service
 *
 * This module provides the webhook endpoint for n8n to trigger reminder processing.
 * It fetches upcoming appointments, calculates due reminders, sends them, and tracks status.
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { sendReminder, calculateDueReminders, REMINDER_TEMPLATES } from './reminderService';
import { addHours, subHours, format } from 'date-fns';

/**
 * Fetch appointments that need reminder processing
 * Gets appointments in the next 50 hours (to cover 48h reminder window)
 */
export async function fetchUpcomingAppointments() {
  if (!isSupabaseConfigured()) {
    console.warn('Supabase not configured - cannot fetch appointments');
    return { success: false, appointments: [], error: 'Supabase not configured' };
  }

  try {
    const now = new Date();
    const futureWindow = addHours(now, 50); // 50 hours ahead to catch 48h reminders

    const { data: appointments, error } = await supabase
      .from('appointments')
      .select(`
        id,
        lead_id,
        patient_name,
        patient_email,
        patient_phone,
        procedure,
        consultation_type,
        scheduled_time,
        status,
        google_event_id,
        google_meet_link,
        notes,
        created_at
      `)
      .gte('scheduled_time', now.toISOString())
      .lte('scheduled_time', futureWindow.toISOString())
      .in('status', ['confirmed', 'pending'])
      .order('scheduled_time', { ascending: true });

    if (error) {
      console.error('Error fetching appointments:', error);
      return { success: false, appointments: [], error: error.message };
    }

    return { success: true, appointments: appointments || [] };
  } catch (error) {
    console.error('Error in fetchUpcomingAppointments:', error);
    return { success: false, appointments: [], error: error.message };
  }
}

/**
 * Get already sent reminders for an appointment
 */
export async function getSentReminders(appointmentId) {
  if (!isSupabaseConfigured()) {
    return [];
  }

  try {
    const { data: reminders, error } = await supabase
      .from('appointment_reminders')
      .select('reminder_type, sent_at, delivery_status')
      .eq('appointment_id', appointmentId)
      .eq('delivery_status', 'sent');

    if (error) {
      console.error('Error fetching sent reminders:', error);
      return [];
    }

    return reminders?.map(r => r.reminder_type) || [];
  } catch (error) {
    console.error('Error in getSentReminders:', error);
    return [];
  }
}

/**
 * Record a scheduled reminder in the database
 */
export async function scheduleReminderInDB(appointmentId, reminderType, scheduledFor, channel = 'email') {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    const { data, error } = await supabase
      .from('appointment_reminders')
      .insert({
        appointment_id: appointmentId,
        reminder_type: reminderType,
        channel,
        scheduled_for: scheduledFor,
        delivery_status: 'pending',
      })
      .select()
      .single();

    if (error) {
      // Ignore duplicate key errors (reminder already scheduled)
      if (error.code === '23505') {
        return { success: true, data: null, alreadyScheduled: true };
      }
      console.error('Error scheduling reminder:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error in scheduleReminderInDB:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update reminder status after sending
 */
export async function updateReminderStatus(appointmentId, reminderType, status, errorMessage = null) {
  if (!isSupabaseConfigured()) {
    return { success: false };
  }

  try {
    const updateData = {
      delivery_status: status,
      ...(status === 'sent' && { sent_at: new Date().toISOString() }),
      ...(errorMessage && { delivery_error: errorMessage }),
    };

    const { error } = await supabase
      .from('appointment_reminders')
      .update(updateData)
      .eq('appointment_id', appointmentId)
      .eq('reminder_type', reminderType)
      .eq('delivery_status', 'pending');

    if (error) {
      console.error('Error updating reminder status:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in updateReminderStatus:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Process a single appointment's reminders
 */
export async function processAppointmentReminders(appointment) {
  const results = [];

  // Get already sent reminders
  const sentReminders = await getSentReminders(appointment.id);

  // Calculate which reminders are due
  const dueReminders = calculateDueReminders(appointment.scheduled_time, sentReminders);

  if (dueReminders.length === 0) {
    return { appointmentId: appointment.id, results: [], noDueReminders: true };
  }

  // Process each due reminder
  for (const reminderType of dueReminders) {
    try {
      // Prepare appointment data for the template
      const appointmentData = {
        patientName: appointment.patient_name,
        patientEmail: appointment.patient_email,
        appointmentDate: appointment.scheduled_time,
        consultationType: appointment.consultation_type,
        confirmationId: appointment.id.substring(0, 8).toUpperCase(),
        meetLink: appointment.google_meet_link,
      };

      // Schedule in DB first (to prevent duplicates)
      const scheduleResult = await scheduleReminderInDB(
        appointment.id,
        reminderType,
        new Date().toISOString()
      );

      if (scheduleResult.alreadyScheduled) {
        results.push({
          reminderType,
          status: 'skipped',
          reason: 'Already scheduled',
        });
        continue;
      }

      // Send the reminder
      const sendResult = await sendReminder(reminderType, appointmentData);

      // Update status based on result
      if (sendResult.success) {
        await updateReminderStatus(appointment.id, reminderType, 'sent');
        results.push({
          reminderType,
          status: 'sent',
          sentTo: appointmentData.patientEmail,
          sentAt: new Date().toISOString(),
        });
      } else {
        await updateReminderStatus(appointment.id, reminderType, 'failed', sendResult.error);
        results.push({
          reminderType,
          status: 'failed',
          error: sendResult.error,
        });
      }
    } catch (error) {
      console.error(`Error processing ${reminderType} for appointment ${appointment.id}:`, error);
      results.push({
        reminderType,
        status: 'error',
        error: error.message,
      });
    }
  }

  return { appointmentId: appointment.id, patientName: appointment.patient_name, results };
}

/**
 * Main webhook handler - processes all due reminders
 * This is the function n8n will call
 */
export async function processAllReminders() {
  const startTime = Date.now();
  const processingResults = {
    success: true,
    timestamp: new Date().toISOString(),
    appointmentsProcessed: 0,
    remindersSent: 0,
    remindersFailed: 0,
    remindersSkipped: 0,
    details: [],
    errors: [],
  };

  try {
    // Fetch upcoming appointments
    const { success, appointments, error } = await fetchUpcomingAppointments();

    if (!success) {
      processingResults.success = false;
      processingResults.errors.push(`Failed to fetch appointments: ${error}`);
      return processingResults;
    }

    if (appointments.length === 0) {
      processingResults.message = 'No upcoming appointments to process';
      return processingResults;
    }

    // Process each appointment
    for (const appointment of appointments) {
      const result = await processAppointmentReminders(appointment);
      processingResults.appointmentsProcessed++;

      if (!result.noDueReminders) {
        processingResults.details.push(result);

        // Count results
        for (const r of result.results) {
          if (r.status === 'sent') processingResults.remindersSent++;
          else if (r.status === 'failed') processingResults.remindersFailed++;
          else if (r.status === 'skipped') processingResults.remindersSkipped++;
        }
      }
    }

    processingResults.processingTimeMs = Date.now() - startTime;
    processingResults.message = `Processed ${processingResults.appointmentsProcessed} appointments, sent ${processingResults.remindersSent} reminders`;

    return processingResults;
  } catch (error) {
    console.error('Error in processAllReminders:', error);
    processingResults.success = false;
    processingResults.errors.push(error.message);
    processingResults.processingTimeMs = Date.now() - startTime;
    return processingResults;
  }
}

/**
 * Webhook response handler for n8n
 * Returns data in a format n8n can easily process
 */
export async function handleReminderWebhook(request = {}) {
  const { action = 'process' } = request;

  switch (action) {
    case 'process':
      return processAllReminders();

    case 'status':
      // Return system status
      return {
        success: true,
        service: 'MiKO Reminder Service',
        supabaseConfigured: isSupabaseConfigured(),
        timestamp: new Date().toISOString(),
        availableTemplates: Object.keys(REMINDER_TEMPLATES),
      };

    case 'test':
      // Test mode - don't actually send
      const { appointments } = await fetchUpcomingAppointments();
      return {
        success: true,
        mode: 'test',
        upcomingAppointments: appointments.length,
        appointments: appointments.map(a => ({
          id: a.id,
          patient: a.patient_name,
          scheduledTime: a.scheduled_time,
          dueReminders: calculateDueReminders(a.scheduled_time, []),
        })),
      };

    default:
      return {
        success: false,
        error: `Unknown action: ${action}`,
        availableActions: ['process', 'status', 'test'],
      };
  }
}

/**
 * Initialize reminder schedules for a new appointment
 * Called when an appointment is created
 */
export async function initializeRemindersForAppointment(appointmentId, scheduledTime) {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase not configured' };
  }

  const apptDate = new Date(scheduledTime);
  const now = new Date();
  const scheduledReminders = [];

  const reminderSchedule = [
    { type: 'reminder_48h', hoursBeforeAppt: 48 },
    { type: 'reminder_24h', hoursBeforeAppt: 24 },
    { type: 'reminder_2h', hoursBeforeAppt: 2 },
  ];

  for (const reminder of reminderSchedule) {
    const scheduledFor = subHours(apptDate, reminder.hoursBeforeAppt);

    // Only schedule if it's in the future
    if (scheduledFor > now) {
      const result = await scheduleReminderInDB(
        appointmentId,
        reminder.type,
        scheduledFor.toISOString()
      );

      if (result.success) {
        scheduledReminders.push({
          type: reminder.type,
          scheduledFor: scheduledFor.toISOString(),
        });
      }
    }
  }

  return {
    success: true,
    appointmentId,
    scheduledReminders,
    message: `Scheduled ${scheduledReminders.length} reminders for appointment`,
  };
}

export default {
  fetchUpcomingAppointments,
  processAllReminders,
  handleReminderWebhook,
  initializeRemindersForAppointment,
  processAppointmentReminders,
};
