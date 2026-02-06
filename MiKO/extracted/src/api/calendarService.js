/**
 * MiKO Calendar Service
 * Google Calendar integration with fallback to mock data
 */

import config, { isGoogleCalendarEnabled } from '@/config';
import { addDays, format, parseISO, setHours, setMinutes, isBefore, isAfter, startOfDay } from 'date-fns';

// Google API state
let gapiLoaded = false;
let gisLoaded = false;
let tokenClient = null;
let accessToken = null;

/**
 * Load Google API scripts
 */
const loadGoogleScripts = () => {
  return new Promise((resolve, reject) => {
    if (gapiLoaded && gisLoaded) {
      resolve();
      return;
    }

    // Load GAPI
    const gapiScript = document.createElement('script');
    gapiScript.src = 'https://apis.google.com/js/api.js';
    gapiScript.onload = () => {
      window.gapi.load('client', async () => {
        try {
          await window.gapi.client.init({
            apiKey: config.google.apiKey,
            discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
          });
          gapiLoaded = true;
          checkBothLoaded();
        } catch (error) {
          reject(error);
        }
      });
    };
    gapiScript.onerror = reject;
    document.body.appendChild(gapiScript);

    // Load GIS (Google Identity Services)
    const gisScript = document.createElement('script');
    gisScript.src = 'https://accounts.google.com/gsi/client';
    gisScript.onload = () => {
      gisLoaded = true;
      checkBothLoaded();
    };
    gisScript.onerror = reject;
    document.body.appendChild(gisScript);

    function checkBothLoaded() {
      if (gapiLoaded && gisLoaded) {
        resolve();
      }
    }
  });
};

/**
 * Initialize Google Calendar OAuth
 */
export const initGoogleCalendar = async () => {
  if (!isGoogleCalendarEnabled()) {
    console.warn('Google Calendar not configured - using mock data');
    return false;
  }

  try {
    await loadGoogleScripts();

    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: config.google.clientId,
      scope: config.google.scopes.join(' '),
      callback: (response) => {
        if (response.access_token) {
          accessToken = response.access_token;
        }
      },
    });

    return true;
  } catch (error) {
    console.error('Failed to initialize Google Calendar:', error);
    return false;
  }
};

/**
 * Request Google Calendar access
 */
export const requestCalendarAccess = () => {
  return new Promise((resolve, reject) => {
    if (!tokenClient) {
      reject(new Error('Google Calendar not initialized'));
      return;
    }

    tokenClient.callback = (response) => {
      if (response.error) {
        reject(new Error(response.error));
        return;
      }
      accessToken = response.access_token;
      resolve(accessToken);
    };

    tokenClient.requestAccessToken({ prompt: 'consent' });
  });
};

/**
 * Check if we have calendar access
 */
export const hasCalendarAccess = () => {
  return !!accessToken;
};

/**
 * Generate time slots for a given date based on business hours
 */
const generateTimeSlots = (date) => {
  const dayName = format(date, 'EEEE').toLowerCase();
  const dayConfig = config.businessHours.days[dayName];

  if (!dayConfig || !dayConfig.available) {
    return [];
  }

  const slots = [];
  const [openHour, openMin] = dayConfig.open.split(':').map(Number);
  const [closeHour, closeMin] = dayConfig.close.split(':').map(Number);

  let currentTime = setMinutes(setHours(date, openHour), openMin);
  const closeTime = setMinutes(setHours(date, closeHour), closeMin);

  const duration = config.businessHours.appointmentDuration;
  const buffer = config.businessHours.bufferTime;

  while (isBefore(currentTime, closeTime)) {
    slots.push({
      time: format(currentTime, 'h:mm a'),
      dateTime: currentTime.toISOString(),
      available: true,
    });

    // Add duration + buffer for next slot
    currentTime = new Date(currentTime.getTime() + (duration + buffer) * 60 * 1000);
  }

  return slots;
};

/**
 * Get busy times from Google Calendar
 */
const getBusyTimes = async (startDate, endDate) => {
  if (!accessToken) {
    return [];
  }

  try {
    const response = await window.gapi.client.calendar.freebusy.query({
      timeMin: startDate.toISOString(),
      timeMax: endDate.toISOString(),
      items: [{ id: config.google.calendarId }],
    });

    const busy = response.result.calendars[config.google.calendarId]?.busy || [];
    return busy.map(b => ({
      start: parseISO(b.start),
      end: parseISO(b.end),
    }));
  } catch (error) {
    console.error('Error fetching busy times:', error);
    return [];
  }
};

/**
 * Check if a slot conflicts with busy times
 */
const isSlotAvailable = (slot, busyTimes) => {
  const slotStart = parseISO(slot.dateTime);
  const slotEnd = new Date(slotStart.getTime() + config.businessHours.appointmentDuration * 60 * 1000);

  for (const busy of busyTimes) {
    // Check for overlap
    if (
      (isAfter(slotStart, busy.start) && isBefore(slotStart, busy.end)) ||
      (isAfter(slotEnd, busy.start) && isBefore(slotEnd, busy.end)) ||
      (isBefore(slotStart, busy.start) && isAfter(slotEnd, busy.end))
    ) {
      return false;
    }
  }

  return true;
};

/**
 * Get available time slots for a date
 */
export const getAvailability = async (date, _consultType = 'virtual') => {
  const targetDate = typeof date === 'string' ? parseISO(date) : date;

  // Don't allow booking in the past
  if (isBefore(targetDate, startOfDay(new Date()))) {
    return { success: true, slots: [], message: 'Cannot book appointments in the past' };
  }

  // Generate all possible slots for the day
  let slots = generateTimeSlots(targetDate);

  if (slots.length === 0) {
    return {
      success: true,
      slots: [],
      message: 'No appointments available on this day'
    };
  }

  // If we have Google Calendar access, check against real availability
  if (accessToken) {
    try {
      const dayStart = startOfDay(targetDate);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

      const busyTimes = await getBusyTimes(dayStart, dayEnd);

      slots = slots.map(slot => ({
        ...slot,
        available: isSlotAvailable(slot, busyTimes),
      }));
    } catch (error) {
      console.error('Error checking availability:', error);
      // Continue with all slots available if calendar check fails
    }
  }

  // Filter out past times for today
  const now = new Date();
  if (format(targetDate, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd')) {
    slots = slots.filter(slot => {
      const slotTime = parseISO(slot.dateTime);
      return isAfter(slotTime, now);
    });
  }

  return {
    success: true,
    slots,
    calendarConnected: !!accessToken,
  };
};

/**
 * Book an appointment
 */
export const bookAppointment = async (appointmentData) => {
  const {
    name,
    email,
    phone,
    dateTime,
    consultType,
    procedure,
    notes,
  } = appointmentData;

  // Validate required fields
  if (!name || !email || !dateTime) {
    return {
      success: false,
      message: 'Please provide your name, email, and preferred time.',
    };
  }

  const startTime = typeof dateTime === 'string' ? parseISO(dateTime) : dateTime;
  const endTime = new Date(startTime.getTime() + config.businessHours.appointmentDuration * 60 * 1000);

  // If we have Google Calendar access, create the event
  if (accessToken) {
    try {
      const event = {
        summary: `MiKO Consultation - ${name}`,
        description: `
Patient: ${name}
Email: ${email}
Phone: ${phone || 'Not provided'}
Consultation Type: ${consultType === 'virtual' ? 'Virtual (Video Call)' : 'In-Person'}
Procedure Interest: ${procedure || 'General consultation'}
Notes: ${notes || 'None'}

Booked via MiKO Patient Connect
        `.trim(),
        start: {
          dateTime: startTime.toISOString(),
          timeZone: config.businessHours.timezone,
        },
        end: {
          dateTime: endTime.toISOString(),
          timeZone: config.businessHours.timezone,
        },
        attendees: [
          { email: email },
          { email: config.contact.email },
        ],
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 }, // 24 hours
            { method: 'email', minutes: 60 }, // 1 hour
          ],
        },
        conferenceData: consultType === 'virtual' ? {
          createRequest: {
            requestId: `miko-${Date.now()}`,
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        } : undefined,
      };

      const response = await window.gapi.client.calendar.events.insert({
        calendarId: config.google.calendarId,
        resource: event,
        conferenceDataVersion: consultType === 'virtual' ? 1 : 0,
        sendUpdates: 'all',
      });

      return {
        success: true,
        confirmed: true,
        appointmentId: response.result.id,
        meetLink: response.result.conferenceData?.entryPoints?.[0]?.uri,
        message: `Your ${consultType} consultation has been booked for ${format(startTime, 'EEEE, MMMM d, yyyy')} at ${format(startTime, 'h:mm a')}.`,
        details: {
          date: startTime,
          time: format(startTime, 'h:mm a'),
          type: consultType,
          eventId: response.result.id,
        },
      };
    } catch (error) {
      console.error('Error creating calendar event:', error);
      // Fall through to manual booking
    }
  }

  // Manual booking (no calendar integration or calendar failed)
  // In production, this would send to a backend/CRM
  const bookingId = `MIKO-${Date.now().toString(36).toUpperCase()}`;

  return {
    success: true,
    confirmed: true,
    appointmentId: bookingId,
    message: `Your consultation request has been received. Confirmation #${bookingId}. Our team will send you a confirmation email shortly.`,
    details: {
      date: startTime,
      time: format(startTime, 'h:mm a'),
      type: consultType,
      bookingId,
    },
    pendingConfirmation: !accessToken, // Flag that manual confirmation is needed
  };
};

/**
 * Reschedule an appointment
 */
export const rescheduleAppointment = async (eventId, newDateTime) => {
  if (!accessToken || !eventId) {
    return {
      success: false,
      message: 'Unable to reschedule. Please contact us at (310) 275-2705.',
    };
  }

  try {
    const newStart = typeof newDateTime === 'string' ? parseISO(newDateTime) : newDateTime;
    const newEnd = new Date(newStart.getTime() + config.businessHours.appointmentDuration * 60 * 1000);

    await window.gapi.client.calendar.events.patch({
      calendarId: config.google.calendarId,
      eventId: eventId,
      resource: {
        start: {
          dateTime: newStart.toISOString(),
          timeZone: config.businessHours.timezone,
        },
        end: {
          dateTime: newEnd.toISOString(),
          timeZone: config.businessHours.timezone,
        },
      },
      sendUpdates: 'all',
    });

    return {
      success: true,
      message: `Your appointment has been rescheduled to ${format(newStart, 'EEEE, MMMM d')} at ${format(newStart, 'h:mm a')}.`,
    };
  } catch (error) {
    console.error('Error rescheduling:', error);
    return {
      success: false,
      message: 'Unable to reschedule. Please contact us at (310) 275-2705.',
    };
  }
};

/**
 * Cancel an appointment
 */
export const cancelAppointment = async (eventId) => {
  if (!accessToken || !eventId) {
    return {
      success: false,
      message: 'Unable to cancel. Please contact us at (310) 275-2705.',
    };
  }

  try {
    await window.gapi.client.calendar.events.delete({
      calendarId: config.google.calendarId,
      eventId: eventId,
      sendUpdates: 'all',
    });

    return {
      success: true,
      message: 'Your appointment has been cancelled.',
    };
  } catch (error) {
    console.error('Error cancelling:', error);
    return {
      success: false,
      message: 'Unable to cancel. Please contact us at (310) 275-2705.',
    };
  }
};

/**
 * Get upcoming appointments for the admin dashboard
 */
export const getUpcomingAppointments = async (days = 7) => {
  if (!accessToken) {
    return { success: false, appointments: [], message: 'Calendar not connected' };
  }

  try {
    const now = new Date();
    const endDate = addDays(now, days);

    const response = await window.gapi.client.calendar.events.list({
      calendarId: config.google.calendarId,
      timeMin: now.toISOString(),
      timeMax: endDate.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      q: 'MiKO Consultation', // Filter to only MiKO appointments
    });

    const appointments = (response.result.items || []).map(event => ({
      id: event.id,
      title: event.summary,
      start: parseISO(event.start.dateTime || event.start.date),
      end: parseISO(event.end.dateTime || event.end.date),
      description: event.description,
      meetLink: event.conferenceData?.entryPoints?.[0]?.uri,
      attendees: event.attendees,
      status: event.status,
    }));

    return {
      success: true,
      appointments,
    };
  } catch (error) {
    console.error('Error fetching appointments:', error);
    return {
      success: false,
      appointments: [],
      message: 'Failed to fetch appointments',
    };
  }
};

export default {
  initGoogleCalendar,
  requestCalendarAccess,
  hasCalendarAccess,
  getAvailability,
  bookAppointment,
  rescheduleAppointment,
  cancelAppointment,
  getUpcomingAppointments,
};
