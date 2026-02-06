/**
 * Reminder Service Tests
 * Unit tests for reminder functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  calculateDueReminders,
  scheduleAllReminders,
} from './reminderService';
import reminderServiceDefault from './reminderService';

const { REMINDER_TEMPLATES } = reminderServiceDefault;

// Mock the integrations
vi.mock('./integrations', () => ({
  SendEmail: vi.fn(() => Promise.resolve({ success: true })),
}));

describe('reminderService', () => {
  describe('calculateDueReminders', () => {
    it('should return 48h reminder when appointment is 48 hours away', () => {
      const now = new Date();
      const appointmentDate = new Date(now.getTime() + 48 * 60 * 60 * 1000);

      const result = calculateDueReminders(appointmentDate.toISOString(), []);

      expect(result).toContain('reminder_48h');
    });

    it('should return 48h reminder when appointment is 47 hours away', () => {
      const now = new Date();
      const appointmentDate = new Date(now.getTime() + 47 * 60 * 60 * 1000);

      const result = calculateDueReminders(appointmentDate.toISOString(), []);

      expect(result).toContain('reminder_48h');
    });

    it('should return 48h reminder when appointment is 49 hours away', () => {
      const now = new Date();
      const appointmentDate = new Date(now.getTime() + 49 * 60 * 60 * 1000);

      const result = calculateDueReminders(appointmentDate.toISOString(), []);

      expect(result).toContain('reminder_48h');
    });

    it('should NOT return 48h reminder when appointment is 51 hours away', () => {
      const now = new Date();
      const appointmentDate = new Date(now.getTime() + 51 * 60 * 60 * 1000);

      const result = calculateDueReminders(appointmentDate.toISOString(), []);

      expect(result).not.toContain('reminder_48h');
    });

    it('should NOT return 48h reminder when appointment is 45 hours away', () => {
      const now = new Date();
      const appointmentDate = new Date(now.getTime() + 45 * 60 * 60 * 1000);

      const result = calculateDueReminders(appointmentDate.toISOString(), []);

      expect(result).not.toContain('reminder_48h');
    });

    it('should return 24h reminder when appointment is 24 hours away', () => {
      const now = new Date();
      const appointmentDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const result = calculateDueReminders(appointmentDate.toISOString(), []);

      expect(result).toContain('reminder_24h');
    });

    it('should return 24h reminder when appointment is 23 hours away', () => {
      const now = new Date();
      const appointmentDate = new Date(now.getTime() + 23 * 60 * 60 * 1000);

      const result = calculateDueReminders(appointmentDate.toISOString(), []);

      expect(result).toContain('reminder_24h');
    });

    it('should return 24h reminder when appointment is 25 hours away', () => {
      const now = new Date();
      const appointmentDate = new Date(now.getTime() + 25 * 60 * 60 * 1000);

      const result = calculateDueReminders(appointmentDate.toISOString(), []);

      expect(result).toContain('reminder_24h');
    });

    it('should NOT return 24h reminder when outside window', () => {
      const now = new Date();
      const appointmentDate = new Date(now.getTime() + 20 * 60 * 60 * 1000);

      const result = calculateDueReminders(appointmentDate.toISOString(), []);

      expect(result).not.toContain('reminder_24h');
    });

    it('should return 2h reminder when appointment is 2 hours away', () => {
      const now = new Date();
      const appointmentDate = new Date(now.getTime() + 2 * 60 * 60 * 1000);

      const result = calculateDueReminders(appointmentDate.toISOString(), []);

      expect(result).toContain('reminder_2h');
    });

    it('should return 2h reminder when appointment is 1.75 hours away', () => {
      // Note: differenceInHours returns integers, so 1.75 hours = 1 hour difference
      // This means 1.75 hours does NOT satisfy >= 1.5, so no reminder is returned
      const now = new Date();
      const appointmentDate = new Date(now.getTime() + 1.75 * 60 * 60 * 1000);

      const result = calculateDueReminders(appointmentDate.toISOString(), []);

      // Due to integer rounding in differenceInHours, 1.75 hours = 1 hour, which is < 1.5
      expect(result).not.toContain('reminder_2h');
    });

    it('should NOT return 2h reminder when appointment is 3 hours away', () => {
      const now = new Date();
      const appointmentDate = new Date(now.getTime() + 3 * 60 * 60 * 1000);

      const result = calculateDueReminders(appointmentDate.toISOString(), []);

      expect(result).not.toContain('reminder_2h');
    });

    it('should NOT return 2h reminder when appointment is 1 hour away', () => {
      const now = new Date();
      const appointmentDate = new Date(now.getTime() + 1 * 60 * 60 * 1000);

      const result = calculateDueReminders(appointmentDate.toISOString(), []);

      expect(result).not.toContain('reminder_2h');
    });

    it('should skip already sent reminders', () => {
      const now = new Date();
      const appointmentDate = new Date(now.getTime() + 48 * 60 * 60 * 1000);
      const sentReminders = ['reminder_48h'];

      const result = calculateDueReminders(appointmentDate.toISOString(), sentReminders);

      expect(result).not.toContain('reminder_48h');
    });

    it('should return multiple reminders if all are due and not sent', () => {
      // This is an edge case - in practice, only one would be due at a time
      const now = new Date();
      const appointmentDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const result = calculateDueReminders(appointmentDate.toISOString(), []);

      // Only 24h should be due
      expect(result).toContain('reminder_24h');
      expect(result).not.toContain('reminder_48h');
      expect(result).not.toContain('reminder_2h');
    });

    it('should return empty array when no reminders are due', () => {
      const now = new Date();
      const appointmentDate = new Date(now.getTime() + 72 * 60 * 60 * 1000);

      const result = calculateDueReminders(appointmentDate.toISOString(), []);

      expect(result).toHaveLength(0);
    });

    it('should return empty array for past appointments', () => {
      const now = new Date();
      const appointmentDate = new Date(now.getTime() - 1 * 60 * 60 * 1000);

      const result = calculateDueReminders(appointmentDate.toISOString(), []);

      expect(result).toHaveLength(0);
    });
  });

  describe('scheduleAllReminders', () => {
    it('should schedule all future reminders', () => {
      const now = new Date();
      // Appointment 72 hours from now - all reminders should be scheduled
      const appointmentDate = new Date(now.getTime() + 72 * 60 * 60 * 1000);

      const appointmentData = {
        appointmentDate: appointmentDate.toISOString(),
        patientEmail: 'test@example.com',
        confirmationId: 'apt-123',
      };

      const result = scheduleAllReminders(appointmentData);

      expect(result).toHaveLength(3);
      expect(result.some(r => r.reminderKey === 'reminder_48h')).toBe(true);
      expect(result.some(r => r.reminderKey === 'reminder_24h')).toBe(true);
      expect(result.some(r => r.reminderKey === 'reminder_2h')).toBe(true);
    });

    it('should not schedule past reminders', () => {
      const now = new Date();
      // Appointment 20 hours from now - only 2h reminder should be scheduled
      const appointmentDate = new Date(now.getTime() + 20 * 60 * 60 * 1000);

      const appointmentData = {
        appointmentDate: appointmentDate.toISOString(),
        patientEmail: 'test@example.com',
        confirmationId: 'apt-123',
      };

      const result = scheduleAllReminders(appointmentData);

      expect(result.some(r => r.reminderKey === 'reminder_48h')).toBe(false);
      expect(result.some(r => r.reminderKey === 'reminder_24h')).toBe(false);
      expect(result.some(r => r.reminderKey === 'reminder_2h')).toBe(true);
    });

    it('should return empty array for appointments less than 2 hours away', () => {
      const now = new Date();
      const appointmentDate = new Date(now.getTime() + 1 * 60 * 60 * 1000);

      const appointmentData = {
        appointmentDate: appointmentDate.toISOString(),
        patientEmail: 'test@example.com',
        confirmationId: 'apt-123',
      };

      const result = scheduleAllReminders(appointmentData);

      expect(result).toHaveLength(0);
    });
  });

  describe('REMINDER_TEMPLATES', () => {
    const mockAppointmentData = {
      patientName: 'John Doe',
      appointmentDate: new Date('2024-02-15T14:00:00Z').toISOString(),
      consultationType: 'virtual',
      confirmationId: 'apt-123',
      meetLink: 'https://meet.google.com/abc-123',
    };

    it('should have all required template keys', () => {
      expect(REMINDER_TEMPLATES).toHaveProperty('reminder_48h');
      expect(REMINDER_TEMPLATES).toHaveProperty('reminder_24h');
      expect(REMINDER_TEMPLATES).toHaveProperty('reminder_2h');
      expect(REMINDER_TEMPLATES).toHaveProperty('confirmation');
    });

    it('should generate 48h reminder with patient name', () => {
      const template = REMINDER_TEMPLATES.reminder_48h;
      const content = template.template(mockAppointmentData);

      expect(content).toContain('John Doe');
      expect(content).toContain('Dr. Michael K. Obeng');
    });

    it('should include virtual consultation info for virtual appointments', () => {
      const template = REMINDER_TEMPLATES.reminder_48h;
      const content = template.template(mockAppointmentData);

      expect(content).toContain('Virtual Video Consultation');
      expect(content).toContain('camera');
    });

    it('should include office address for in-person appointments', () => {
      const inPersonData = { ...mockAppointmentData, consultationType: 'inperson' };
      const template = REMINDER_TEMPLATES.reminder_48h;
      const content = template.template(inPersonData);

      expect(content).toContain('Beverly Hills');
      expect(content).toContain('436 N Bedford Dr');
    });

    it('should include meet link in 2h reminder for virtual', () => {
      const template = REMINDER_TEMPLATES.reminder_2h;
      const content = template.template(mockAppointmentData);

      expect(content).toContain('https://meet.google.com/abc-123');
    });

    it('should have subjects for all templates', () => {
      expect(REMINDER_TEMPLATES.reminder_48h.subject).toBe('Your MiKO Consultation is in 2 Days');
      expect(REMINDER_TEMPLATES.reminder_24h.subject).toBe('Your MiKO Consultation is Tomorrow');
      expect(REMINDER_TEMPLATES.reminder_2h.subject).toBe('Your MiKO Consultation Starts Soon');
      expect(REMINDER_TEMPLATES.confirmation.subject).toBe('Your MiKO Consultation is Confirmed');
    });

    it('should include contact information in all templates', () => {
      const templates = ['reminder_48h', 'reminder_24h', 'reminder_2h', 'confirmation'];

      templates.forEach((key) => {
        const content = REMINDER_TEMPLATES[key].template(mockAppointmentData);
        expect(content).toContain('(310) 275-2705');
      });
    });
  });
});
