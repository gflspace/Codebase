/**
 * Appointment Service Tests
 *
 * Tests for:
 * - createAppointment
 * - updateAppointmentStatus (with all status transitions)
 * - cancelAppointment
 * - rescheduleAppointment
 * - checkSlotAvailability (including RPC fallback)
 * - markReminderSent
 * - addAppointmentOutcome
 * - getAppointment
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createAppointment,
  updateAppointmentStatus,
  cancelAppointment,
  rescheduleAppointment,
  checkSlotAvailability,
  markReminderSent,
  addAppointmentOutcome,
  getAppointment,
} from './appointmentService';

// Mock the supabase module
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
  isSupabaseConfigured: vi.fn(() => true),
}));

import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// Helper to create chainable mock
const createChainableMock = (finalData = null, finalError = null) => {
  const chain = {
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: finalData, error: finalError }),
  };
  return chain;
};

describe('Appointment Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isSupabaseConfigured.mockReturnValue(true);
  });

  // ===========================================
  // CREATE APPOINTMENT
  // ===========================================
  describe('createAppointment', () => {
    it('should create an appointment successfully', async () => {
      const mockAppointment = {
        id: 'appt-123',
        lead_id: 'lead-456',
        appointment_type: 'virtual',
        status: 'pending',
        scheduled_at: '2024-01-15T10:00:00Z',
      };

      const chain = createChainableMock(mockAppointment);
      supabase.from.mockReturnValue(chain);

      const result = await createAppointment({
        lead_id: 'lead-456',
        type: 'virtual',
        scheduled_at: '2024-01-15T10:00:00Z',
        duration: 60,
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockAppointment);
      expect(supabase.from).toHaveBeenCalledWith('appointments');
      expect(chain.insert).toHaveBeenCalled();
    });

    it('should handle leadId as alternative to lead_id', async () => {
      const mockAppointment = { id: 'appt-123', lead_id: 'lead-789' };
      const chain = createChainableMock(mockAppointment);
      supabase.from.mockReturnValue(chain);

      await createAppointment({
        leadId: 'lead-789',
        scheduledAt: '2024-01-15T10:00:00Z',
      });

      const insertCall = chain.insert.mock.calls[0][0][0];
      expect(insertCall.lead_id).toBe('lead-789');
    });

    it('should use default values for optional fields', async () => {
      const mockAppointment = { id: 'appt-123' };
      const chain = createChainableMock(mockAppointment);
      supabase.from.mockReturnValue(chain);

      await createAppointment({
        lead_id: 'lead-123',
        scheduled_at: '2024-01-15T10:00:00Z',
      });

      const insertCall = chain.insert.mock.calls[0][0][0];
      expect(insertCall.appointment_type).toBe('virtual');
      expect(insertCall.duration_minutes).toBe(60);
      expect(insertCall.booked_via).toBe('website');
      expect(insertCall.status).toBe('pending');
    });

    it('should return error when Supabase is not configured', async () => {
      isSupabaseConfigured.mockReturnValue(false);

      const result = await createAppointment({ lead_id: 'test' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Supabase not configured');
    });

    it('should handle database errors', async () => {
      const chain = createChainableMock(null, { message: 'Database error' });
      supabase.from.mockReturnValue(chain);

      const result = await createAppointment({
        lead_id: 'lead-123',
        scheduled_at: '2024-01-15T10:00:00Z',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });

  // ===========================================
  // UPDATE APPOINTMENT STATUS
  // ===========================================
  describe('updateAppointmentStatus', () => {
    it('should update status to confirmed with timestamp', async () => {
      const mockAppointment = { id: 'appt-123', status: 'confirmed' };
      const chain = createChainableMock(mockAppointment);
      supabase.from.mockReturnValue(chain);

      const result = await updateAppointmentStatus('appt-123', 'confirmed');

      expect(result.success).toBe(true);
      const updateCall = chain.update.mock.calls[0][0];
      expect(updateCall.status).toBe('confirmed');
      expect(updateCall.patient_confirmed).toBe(true);
      expect(updateCall.patient_confirmed_at).toBeDefined();
    });

    it('should update status to checked_in with timestamp', async () => {
      const mockAppointment = { id: 'appt-123', status: 'checked_in' };
      const chain = createChainableMock(mockAppointment);
      supabase.from.mockReturnValue(chain);

      await updateAppointmentStatus('appt-123', 'checked_in');

      const updateCall = chain.update.mock.calls[0][0];
      expect(updateCall.status).toBe('checked_in');
      expect(updateCall.checked_in_at).toBeDefined();
    });

    it('should update status to in_progress with actual_start_time', async () => {
      const mockAppointment = { id: 'appt-123', status: 'in_progress' };
      const chain = createChainableMock(mockAppointment);
      supabase.from.mockReturnValue(chain);

      await updateAppointmentStatus('appt-123', 'in_progress');

      const updateCall = chain.update.mock.calls[0][0];
      expect(updateCall.status).toBe('in_progress');
      expect(updateCall.actual_start_time).toBeDefined();
    });

    it('should update status to completed with actual_end_time', async () => {
      const mockAppointment = { id: 'appt-123', status: 'completed' };
      const chain = createChainableMock(mockAppointment);
      supabase.from.mockReturnValue(chain);

      await updateAppointmentStatus('appt-123', 'completed');

      const updateCall = chain.update.mock.calls[0][0];
      expect(updateCall.status).toBe('completed');
      expect(updateCall.actual_end_time).toBeDefined();
    });

    it('should update status to no_show with timestamp', async () => {
      const mockAppointment = { id: 'appt-123', status: 'no_show' };
      const chain = createChainableMock(mockAppointment);
      supabase.from.mockReturnValue(chain);

      await updateAppointmentStatus('appt-123', 'no_show');

      const updateCall = chain.update.mock.calls[0][0];
      expect(updateCall.status).toBe('no_show');
      expect(updateCall.marked_no_show_at).toBeDefined();
    });

    it('should update status to cancelled with timestamp', async () => {
      const mockAppointment = { id: 'appt-123', status: 'cancelled' };
      const chain = createChainableMock(mockAppointment);
      supabase.from.mockReturnValue(chain);

      await updateAppointmentStatus('appt-123', 'cancelled');

      const updateCall = chain.update.mock.calls[0][0];
      expect(updateCall.status).toBe('cancelled');
      expect(updateCall.cancelled_at).toBeDefined();
    });

    it('should handle unknown status without extra fields', async () => {
      const mockAppointment = { id: 'appt-123', status: 'pending' };
      const chain = createChainableMock(mockAppointment);
      supabase.from.mockReturnValue(chain);

      await updateAppointmentStatus('appt-123', 'pending');

      const updateCall = chain.update.mock.calls[0][0];
      expect(updateCall.status).toBe('pending');
      expect(Object.keys(updateCall)).toEqual(['status']);
    });

    it('should return error when Supabase is not configured', async () => {
      isSupabaseConfigured.mockReturnValue(false);

      const result = await updateAppointmentStatus('appt-123', 'confirmed');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Supabase not configured');
    });

    it('should handle database errors', async () => {
      const chain = createChainableMock(null, { message: 'Update failed' });
      supabase.from.mockReturnValue(chain);

      const result = await updateAppointmentStatus('appt-123', 'confirmed');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Update failed');
    });
  });

  // ===========================================
  // CANCEL APPOINTMENT
  // ===========================================
  describe('cancelAppointment', () => {
    it('should cancel an appointment with reason and notes', async () => {
      const mockAppointment = { id: 'appt-123', status: 'cancelled' };
      const chain = createChainableMock(mockAppointment);
      supabase.from.mockReturnValue(chain);

      const result = await cancelAppointment(
        'appt-123',
        'Patient request',
        'Will reschedule next week'
      );

      expect(result.success).toBe(true);
      const updateCall = chain.update.mock.calls[0][0];
      expect(updateCall.status).toBe('cancelled');
      expect(updateCall.cancellation_reason).toBe('Patient request');
      expect(updateCall.cancellation_notes).toBe('Will reschedule next week');
      expect(updateCall.cancelled_at).toBeDefined();
    });

    it('should cancel with empty notes by default', async () => {
      const mockAppointment = { id: 'appt-123', status: 'cancelled' };
      const chain = createChainableMock(mockAppointment);
      supabase.from.mockReturnValue(chain);

      await cancelAppointment('appt-123', 'Schedule conflict');

      const updateCall = chain.update.mock.calls[0][0];
      expect(updateCall.cancellation_notes).toBe('');
    });

    it('should return error when Supabase is not configured', async () => {
      isSupabaseConfigured.mockReturnValue(false);

      const result = await cancelAppointment('appt-123', 'reason');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Supabase not configured');
    });

    it('should handle database errors', async () => {
      const chain = createChainableMock(null, { message: 'Cancel failed' });
      supabase.from.mockReturnValue(chain);

      const result = await cancelAppointment('appt-123', 'reason');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cancel failed');
    });
  });

  // ===========================================
  // RESCHEDULE APPOINTMENT
  // ===========================================
  describe('rescheduleAppointment', () => {
    it('should reschedule an appointment successfully', async () => {
      const originalAppointment = {
        id: 'appt-original',
        lead_id: 'lead-123',
        appointment_type: 'virtual',
        duration_minutes: 60,
        location: 'Office A',
        virtual_meeting_url: 'https://zoom.us/123',
        procedure_of_interest: 'Consultation',
        consultation_notes: 'First visit',
      };

      const newAppointment = {
        id: 'appt-new',
        lead_id: 'lead-123',
        status: 'pending',
        scheduled_at: '2024-01-20T14:00:00Z',
      };

      // Mock the three operations: select original, insert new, update original
      let callCount = 0;
      supabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call: get original appointment
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: originalAppointment, error: null }),
          };
        } else if (callCount === 2) {
          // Second call: insert new appointment
          return {
            insert: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: newAppointment, error: null }),
          };
        } else {
          // Third call: update original appointment
          return {
            update: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ error: null }),
          };
        }
      });

      const result = await rescheduleAppointment('appt-original', '2024-01-20T14:00:00Z');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(newAppointment);
    });

    it('should return error when Supabase is not configured', async () => {
      isSupabaseConfigured.mockReturnValue(false);

      const result = await rescheduleAppointment('appt-123', '2024-01-20T14:00:00Z');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Supabase not configured');
    });

    it('should handle error when fetching original appointment', async () => {
      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
      });

      const result = await rescheduleAppointment('appt-123', '2024-01-20T14:00:00Z');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Not found');
    });

    it('should handle error when creating new appointment', async () => {
      let callCount = 0;
      supabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { id: 'original' }, error: null }),
          };
        } else {
          return {
            insert: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Insert failed' } }),
          };
        }
      });

      const result = await rescheduleAppointment('appt-123', '2024-01-20T14:00:00Z');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Insert failed');
    });
  });

  // ===========================================
  // CHECK SLOT AVAILABILITY
  // ===========================================
  describe('checkSlotAvailability', () => {
    it('should check availability via RPC successfully', async () => {
      supabase.rpc.mockResolvedValue({ data: true, error: null });

      const result = await checkSlotAvailability('2024-01-15T10:00:00Z', 60);

      expect(result.success).toBe(true);
      expect(result.available).toBe(true);
      expect(supabase.rpc).toHaveBeenCalledWith('is_slot_available', {
        check_time: '2024-01-15T10:00:00Z',
        duration_minutes: 60,
      });
    });

    it('should use default duration of 60 minutes', async () => {
      supabase.rpc.mockResolvedValue({ data: true, error: null });

      await checkSlotAvailability('2024-01-15T10:00:00Z');

      expect(supabase.rpc).toHaveBeenCalledWith('is_slot_available', {
        check_time: '2024-01-15T10:00:00Z',
        duration_minutes: 60,
      });
    });

    it('should fallback to manual check when RPC fails', async () => {
      supabase.rpc.mockResolvedValue({ data: null, error: { message: 'RPC not found' } });

      const chain = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lt: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
      supabase.from.mockReturnValue(chain);

      const result = await checkSlotAvailability('2024-01-15T10:00:00Z', 60);

      expect(result.success).toBe(true);
      expect(result.available).toBe(true);
      expect(supabase.from).toHaveBeenCalledWith('appointments');
    });

    it('should return not available when conflicts exist in fallback', async () => {
      supabase.rpc.mockResolvedValue({ data: null, error: { message: 'RPC not found' } });

      const chain = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lt: vi.fn().mockResolvedValue({ data: [{ id: 'conflict-1' }], error: null }),
      };
      supabase.from.mockReturnValue(chain);

      const result = await checkSlotAvailability('2024-01-15T10:00:00Z', 60);

      expect(result.success).toBe(true);
      expect(result.available).toBe(false);
    });

    it('should return error when Supabase is not configured', async () => {
      isSupabaseConfigured.mockReturnValue(false);

      const result = await checkSlotAvailability('2024-01-15T10:00:00Z');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Supabase not configured');
    });

    it('should handle fallback query error', async () => {
      supabase.rpc.mockResolvedValue({ data: null, error: { message: 'RPC error' } });

      const chain = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lt: vi.fn().mockResolvedValue({ data: null, error: { message: 'Query failed' } }),
      };
      supabase.from.mockReturnValue(chain);

      const result = await checkSlotAvailability('2024-01-15T10:00:00Z');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Query failed');
    });
  });

  // ===========================================
  // MARK REMINDER SENT
  // ===========================================
  describe('markReminderSent', () => {
    it('should mark 48h reminder as sent', async () => {
      const mockAppointment = { id: 'appt-123' };
      const chain = createChainableMock(mockAppointment);
      supabase.from.mockReturnValue(chain);

      const result = await markReminderSent('appt-123', '48h');

      expect(result.success).toBe(true);
      const updateCall = chain.update.mock.calls[0][0];
      expect(updateCall.reminder_48h_sent_at).toBeDefined();
    });

    it('should mark 24h reminder as sent', async () => {
      const mockAppointment = { id: 'appt-123' };
      const chain = createChainableMock(mockAppointment);
      supabase.from.mockReturnValue(chain);

      const result = await markReminderSent('appt-123', '24h');

      expect(result.success).toBe(true);
      const updateCall = chain.update.mock.calls[0][0];
      expect(updateCall.reminder_24h_sent_at).toBeDefined();
    });

    it('should mark 2h reminder as sent', async () => {
      const mockAppointment = { id: 'appt-123' };
      const chain = createChainableMock(mockAppointment);
      supabase.from.mockReturnValue(chain);

      const result = await markReminderSent('appt-123', '2h');

      expect(result.success).toBe(true);
      const updateCall = chain.update.mock.calls[0][0];
      expect(updateCall.reminder_2h_sent_at).toBeDefined();
    });

    it('should return error for invalid reminder type', async () => {
      const result = await markReminderSent('appt-123', '1h');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid reminder type');
    });

    it('should return error when Supabase is not configured', async () => {
      isSupabaseConfigured.mockReturnValue(false);

      const result = await markReminderSent('appt-123', '24h');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Supabase not configured');
    });

    it('should handle database errors', async () => {
      const chain = createChainableMock(null, { message: 'Update failed' });
      supabase.from.mockReturnValue(chain);

      const result = await markReminderSent('appt-123', '48h');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Update failed');
    });
  });

  // ===========================================
  // ADD APPOINTMENT OUTCOME
  // ===========================================
  describe('addAppointmentOutcome', () => {
    it('should add outcome with all fields', async () => {
      const mockAppointment = { id: 'appt-123' };
      const chain = createChainableMock(mockAppointment);
      supabase.from.mockReturnValue(chain);

      const result = await addAppointmentOutcome(
        'appt-123',
        'Patient showed interest in rhinoplasty',
        'Schedule follow-up consultation',
        true
      );

      expect(result.success).toBe(true);
      const updateCall = chain.update.mock.calls[0][0];
      expect(updateCall.outcome_notes).toBe('Patient showed interest in rhinoplasty');
      expect(updateCall.next_steps).toBe('Schedule follow-up consultation');
      expect(updateCall.follow_up_required).toBe(true);
    });

    it('should use default values for optional parameters', async () => {
      const mockAppointment = { id: 'appt-123' };
      const chain = createChainableMock(mockAppointment);
      supabase.from.mockReturnValue(chain);

      await addAppointmentOutcome('appt-123', 'Consultation completed');

      const updateCall = chain.update.mock.calls[0][0];
      expect(updateCall.outcome_notes).toBe('Consultation completed');
      expect(updateCall.next_steps).toBe('');
      expect(updateCall.follow_up_required).toBe(false);
    });

    it('should return error when Supabase is not configured', async () => {
      isSupabaseConfigured.mockReturnValue(false);

      const result = await addAppointmentOutcome('appt-123', 'notes');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Supabase not configured');
    });

    it('should handle database errors', async () => {
      const chain = createChainableMock(null, { message: 'Outcome update failed' });
      supabase.from.mockReturnValue(chain);

      const result = await addAppointmentOutcome('appt-123', 'notes');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Outcome update failed');
    });
  });

  // ===========================================
  // GET APPOINTMENT
  // ===========================================
  describe('getAppointment', () => {
    it('should fetch appointment with related data', async () => {
      const mockAppointment = {
        id: 'appt-123',
        lead_id: 'lead-456',
        status: 'confirmed',
        leads: {
          id: 'lead-456',
          full_name: 'John Doe',
          email: 'john@example.com',
          phone: '555-1234',
        },
        appointment_reminders: [
          { id: 'reminder-1', type: '24h' },
        ],
      };

      const chain = createChainableMock(mockAppointment);
      supabase.from.mockReturnValue(chain);

      const result = await getAppointment('appt-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockAppointment);
      expect(supabase.from).toHaveBeenCalledWith('appointments');
      expect(chain.select).toHaveBeenCalled();
    });

    it('should return error when Supabase is not configured', async () => {
      isSupabaseConfigured.mockReturnValue(false);

      const result = await getAppointment('appt-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Supabase not configured');
    });

    it('should handle not found error', async () => {
      const chain = createChainableMock(null, { message: 'Appointment not found' });
      supabase.from.mockReturnValue(chain);

      const result = await getAppointment('nonexistent');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Appointment not found');
    });
  });

  // ===========================================
  // INTEGRATION TESTS
  // ===========================================
  describe('Integration Scenarios', () => {
    it('should handle full appointment lifecycle', async () => {
      // This test verifies the expected flow:
      // create -> confirm -> check_in -> in_progress -> complete -> add outcome

      const states = ['confirmed', 'checked_in', 'in_progress', 'completed'];

      for (const status of states) {
        const chain = createChainableMock({ id: 'appt-123', status });
        supabase.from.mockReturnValue(chain);

        const result = await updateAppointmentStatus('appt-123', status);
        expect(result.success).toBe(true);
      }
    });

    it('should handle cancellation flow', async () => {
      const chain = createChainableMock({ id: 'appt-123', status: 'cancelled' });
      supabase.from.mockReturnValue(chain);

      const result = await cancelAppointment(
        'appt-123',
        'Patient requested',
        'Will call to reschedule'
      );

      expect(result.success).toBe(true);
      expect(result.data.status).toBe('cancelled');
    });

    it('should handle no-show flow', async () => {
      const chain = createChainableMock({ id: 'appt-123', status: 'no_show' });
      supabase.from.mockReturnValue(chain);

      const result = await updateAppointmentStatus('appt-123', 'no_show');

      expect(result.success).toBe(true);
      const updateCall = chain.update.mock.calls[0][0];
      expect(updateCall.marked_no_show_at).toBeDefined();
    });
  });
});
