/**
 * MiKO Reminder Service
 * Automated reminder system for appointments
 */

import { SendEmail } from './integrations';
import { format, differenceInHours } from 'date-fns';

// Reminder templates
const REMINDER_TEMPLATES = {
  reminder_48h: {
    subject: 'Your MiKO Consultation is in 2 Days',
    template: (data) => `
Dear ${data.patientName},

This is a friendly reminder that your consultation with Dr. Michael K. Obeng is scheduled for:

📅 Date: ${format(new Date(data.appointmentDate), 'EEEE, MMMM d, yyyy')}
🕐 Time: ${format(new Date(data.appointmentDate), 'h:mm a')} (Pacific Time)
📍 Type: ${data.consultationType === 'virtual' ? 'Virtual Video Consultation' : 'In-Person at Beverly Hills Office'}

${data.consultationType === 'virtual' ? `
Your video consultation link will be sent 1 hour before your appointment.

To prepare for your virtual consultation:
• Find a quiet, well-lit space
• Test your camera and microphone
• Have your medical history ready
• Prepare any questions you'd like to ask
` : `
Our Beverly Hills office is located at:
436 N Bedford Dr #305
Beverly Hills, CA 90210

Parking is available in the building garage.

Please arrive 15 minutes early to complete any paperwork.
`}

If you need to reschedule, please contact us at least 24 hours in advance:
📞 (310) 275-2705
✉️ office@mikoplasticsurgery.com

We look forward to seeing you!

Warm regards,
The MiKO Plastic Surgery Team
    `.trim(),
  },

  reminder_24h: {
    subject: 'Your MiKO Consultation is Tomorrow',
    template: (data) => `
Dear ${data.patientName},

Your consultation with Dr. Michael K. Obeng is tomorrow!

📅 Date: ${format(new Date(data.appointmentDate), 'EEEE, MMMM d, yyyy')}
🕐 Time: ${format(new Date(data.appointmentDate), 'h:mm a')} (Pacific Time)
📍 Type: ${data.consultationType === 'virtual' ? 'Virtual Video Consultation' : 'In-Person Visit'}

${data.consultationType === 'virtual' ? `
✨ Preparation Checklist:
□ Stable internet connection
□ Quiet, private space
□ Good lighting (face a window if possible)
□ List of questions prepared
□ Any photos you'd like to share
` : `
✨ What to Bring:
□ Valid photo ID
□ Insurance card (if applicable)
□ List of current medications
□ Any previous medical records
□ Questions for Dr. Obeng
`}

Need to make changes? Contact us:
📞 (310) 275-2705

See you tomorrow!

The MiKO Plastic Surgery Team
    `.trim(),
  },

  reminder_2h: {
    subject: 'Your MiKO Consultation Starts Soon',
    template: (data) => `
Dear ${data.patientName},

Your consultation with Dr. Obeng begins in 2 hours!

🕐 Time: ${format(new Date(data.appointmentDate), 'h:mm a')} (Pacific Time)

${data.consultationType === 'virtual' ? `
🎥 Join Your Video Consultation:
${data.meetLink || 'Your video link will be sent shortly'}

Quick tech check:
• Click the link above to test your connection
• Allow camera and microphone access when prompted
• If you have issues, call us at (310) 275-2705
` : `
📍 Location:
436 N Bedford Dr #305
Beverly Hills, CA 90210

Please arrive 10-15 minutes early.
`}

Questions? Call us at (310) 275-2705

See you soon!
The MiKO Team
    `.trim(),
  },

  confirmation: {
    subject: 'Your MiKO Consultation is Confirmed',
    template: (data) => `
Dear ${data.patientName},

Thank you for scheduling a consultation with Dr. Michael K. Obeng at MiKO Plastic Surgery!

Your appointment details:

📅 Date: ${format(new Date(data.appointmentDate), 'EEEE, MMMM d, yyyy')}
🕐 Time: ${format(new Date(data.appointmentDate), 'h:mm a')} (Pacific Time)
📍 Type: ${data.consultationType === 'virtual' ? 'Virtual Video Consultation' : 'In-Person Visit'}
🏷️ Confirmation #: ${data.confirmationId}

${data.consultationType === 'virtual' ? `
For your virtual consultation, you will receive a video link via email before your appointment.
` : `
Our Beverly Hills office:
436 N Bedford Dr #305
Beverly Hills, CA 90210
`}

What to expect:
• A comprehensive discussion of your goals
• Dr. Obeng's professional recommendations
• Personalized treatment plan
• Transparent pricing information
• Answers to all your questions

Need to reschedule or cancel?
Please contact us at least 24 hours in advance:
📞 (310) 275-2705
✉️ office@mikoplasticsurgery.com

We're honored you've chosen MiKO Plastic Surgery and look forward to meeting you.

Warm regards,
The MiKO Plastic Surgery Team

---
MiKO Plastic Surgery
Dr. Michael K. Obeng, MD, FACS
436 N Bedford Dr #305
Beverly Hills, CA 90210
(310) 275-2705
www.mikoplasticsurgery.com
    `.trim(),
  },
};

/**
 * Send an email reminder
 */
export const sendReminder = async (templateKey, appointmentData) => {
  const template = REMINDER_TEMPLATES[templateKey];

  if (!template) {
    console.error(`Unknown reminder template: ${templateKey}`);
    return { success: false, error: 'Unknown template' };
  }

  const emailContent = template.template(appointmentData);

  try {
    await SendEmail({
      to: appointmentData.patientEmail,
      subject: template.subject,
      body: emailContent,
    });

    return {
      success: true,
      template: templateKey,
      sentTo: appointmentData.patientEmail,
      sentAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Failed to send reminder:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Send booking confirmation
 */
export const sendConfirmation = async (appointmentData) => {
  return sendReminder('confirmation', appointmentData);
};

/**
 * Calculate which reminders should be sent for an appointment
 */
export const calculateDueReminders = (appointmentDate, sentReminders = []) => {
  const now = new Date();
  const apptDate = new Date(appointmentDate);
  const hoursUntil = differenceInHours(apptDate, now);

  const dueReminders = [];

  // 48-hour reminder (send if 46-50 hours out)
  if (hoursUntil >= 46 && hoursUntil <= 50 && !sentReminders.includes('reminder_48h')) {
    dueReminders.push('reminder_48h');
  }

  // 24-hour reminder (send if 22-26 hours out)
  if (hoursUntil >= 22 && hoursUntil <= 26 && !sentReminders.includes('reminder_24h')) {
    dueReminders.push('reminder_24h');
  }

  // 2-hour reminder (send if 1.5-2.5 hours out)
  if (hoursUntil >= 1.5 && hoursUntil <= 2.5 && !sentReminders.includes('reminder_2h')) {
    dueReminders.push('reminder_2h');
  }

  return dueReminders;
};

/**
 * Process reminders for a list of appointments
 * This would be called by a scheduled job in production
 */
export const processReminders = async (appointments) => {
  const results = [];

  for (const appointment of appointments) {
    const dueReminders = calculateDueReminders(
      appointment.appointmentDate,
      appointment.sentReminders || []
    );

    for (const reminderKey of dueReminders) {
      const result = await sendReminder(reminderKey, {
        patientName: appointment.patientName,
        patientEmail: appointment.patientEmail,
        appointmentDate: appointment.appointmentDate,
        consultationType: appointment.consultationType,
        confirmationId: appointment.confirmationId,
        meetLink: appointment.meetLink,
      });

      results.push({
        appointmentId: appointment.id,
        reminder: reminderKey,
        ...result,
      });
    }
  }

  return results;
};

/**
 * Schedule a reminder (stores intent, would integrate with job scheduler in production)
 */
export const scheduleReminder = (appointmentData, reminderKey, sendAt) => {
  // In production, this would:
  // 1. Store the reminder in a database
  // 2. Register with a job scheduler (like Bull, Agenda, or cloud scheduler)
  // 3. Return a job ID for tracking

  console.log(`Scheduled ${reminderKey} for ${appointmentData.patientEmail} at ${sendAt}`);

  return {
    scheduled: true,
    reminderKey,
    sendAt,
    appointmentId: appointmentData.confirmationId,
  };
};

/**
 * Schedule all reminders for a new appointment
 */
export const scheduleAllReminders = (appointmentData) => {
  const apptDate = new Date(appointmentData.appointmentDate);
  const scheduledReminders = [];

  // Schedule 48h reminder
  const reminder48h = new Date(apptDate.getTime() - 48 * 60 * 60 * 1000);
  if (reminder48h > new Date()) {
    scheduledReminders.push(
      scheduleReminder(appointmentData, 'reminder_48h', reminder48h)
    );
  }

  // Schedule 24h reminder
  const reminder24h = new Date(apptDate.getTime() - 24 * 60 * 60 * 1000);
  if (reminder24h > new Date()) {
    scheduledReminders.push(
      scheduleReminder(appointmentData, 'reminder_24h', reminder24h)
    );
  }

  // Schedule 2h reminder
  const reminder2h = new Date(apptDate.getTime() - 2 * 60 * 60 * 1000);
  if (reminder2h > new Date()) {
    scheduledReminders.push(
      scheduleReminder(appointmentData, 'reminder_2h', reminder2h)
    );
  }

  return scheduledReminders;
};

export default {
  sendReminder,
  sendConfirmation,
  calculateDueReminders,
  processReminders,
  scheduleReminder,
  scheduleAllReminders,
  REMINDER_TEMPLATES,
};
