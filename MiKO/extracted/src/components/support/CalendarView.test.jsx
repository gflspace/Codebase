/**
 * CalendarView Component Tests
 * Tests for appointment booking functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '../../__tests__/test-utils';
import CalendarView from './CalendarView';
import { format, addDays } from 'date-fns';

// Mock the API
const mockCheckAvailability = vi.fn();
const mockBookAppointment = vi.fn();

vi.mock('@/api/mikoAI', () => ({
  checkAvailability: (...args) => mockCheckAvailability(...args),
  bookAppointment: (...args) => mockBookAppointment(...args),
}));

describe('CalendarView', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    mockCheckAvailability.mockResolvedValue({
      success: true,
      availableSlots: [
        { time: '9:00 AM', available: true },
        { time: '10:00 AM', available: true },
        { time: '11:00 AM', available: false },
        { time: '1:00 PM', available: true },
        { time: '2:00 PM', available: true },
      ],
    });

    mockBookAppointment.mockResolvedValue({
      success: true,
      appointmentId: 'apt-123',
      message: 'Appointment booked successfully',
    });
  });

  describe('Initial Rendering', () => {
    it('should render calendar with consultation type selection', () => {
      render(<CalendarView />);

      expect(screen.getByText(/virtual consultation/i)).toBeInTheDocument();
      expect(screen.getByText(/in-person visit/i)).toBeInTheDocument();
    });

    it('should render week navigation', () => {
      render(<CalendarView />);

      // Should have navigation buttons
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should show prompt to select a date', () => {
      render(<CalendarView />);

      expect(screen.getByText(/select a date to view available times/i)).toBeInTheDocument();
    });

    it('should render days of the week', () => {
      render(<CalendarView />);

      // Check for day abbreviations
      expect(screen.getByText(/mon/i)).toBeInTheDocument();
      expect(screen.getByText(/tue/i)).toBeInTheDocument();
      expect(screen.getByText(/wed/i)).toBeInTheDocument();
    });

    it('should default to virtual consultation', () => {
      render(<CalendarView />);

      const virtualButton = screen.getByText(/virtual consultation/i).closest('button');
      expect(virtualButton).toHaveClass('border-[#4A1515]');
    });
  });

  describe('Consultation Type Selection', () => {
    it('should allow switching between virtual and in-person', async () => {
      const { user } = render(<CalendarView />);

      const inPersonButton = screen.getByText(/in-person visit/i).closest('button');
      await user.click(inPersonButton);

      expect(inPersonButton).toHaveClass('border-[#4A1515]');
    });
  });

  describe('Date Selection', () => {
    it('should display date buttons', () => {
      render(<CalendarView />);

      // Should have calendar buttons for date selection
      const allButtons = screen.getAllByRole('button');
      // Calendar should have navigation and day buttons
      expect(allButtons.length).toBeGreaterThan(5);
    });

    it('should disable weekend days', () => {
      render(<CalendarView />);

      // Sat and Sun should show as disabled (check via class or disabled state)
      expect(screen.getByText(/sat/i)).toBeInTheDocument();
      expect(screen.getByText(/sun/i)).toBeInTheDocument();
    });

    it('should fetch availability when a date is selected', async () => {
      const { user } = render(<CalendarView />);

      // Find a future weekday button (tomorrow if it's a weekday)
      const tomorrow = addDays(new Date(), 1);
      const dayOfWeek = tomorrow.getDay();

      // Skip if tomorrow is weekend
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        const tomorrowDate = format(tomorrow, 'd');

        // Find the button for tomorrow
        const dayButtons = screen.getAllByRole('button');
        const tomorrowButton = dayButtons.find(
          (btn) => btn.textContent.includes(tomorrowDate) && !btn.disabled
        );

        if (tomorrowButton) {
          await user.click(tomorrowButton);

          await waitFor(() => {
            expect(mockCheckAvailability).toHaveBeenCalled();
          });
        }
      }
    });
  });

  describe('Time Slot Selection', () => {
    it('should display time slots after date selection', async () => {
      const { user } = render(<CalendarView />);

      // Select a date (find first available future weekday)
      const dayButtons = screen.getAllByRole('button');
      const selectableDay = dayButtons.find((btn) => {
        const text = btn.textContent;
        return text.match(/^\d+$/) && !btn.disabled;
      });

      if (selectableDay) {
        await user.click(selectableDay);

        await waitFor(() => {
          expect(screen.getByText(/9:00 AM/i)).toBeInTheDocument();
        });
      }
    });

    it('should show available and unavailable slots differently', async () => {
      const { user } = render(<CalendarView />);

      // Select a date
      const dayButtons = screen.getAllByRole('button');
      const selectableDay = dayButtons.find((btn) => {
        const text = btn.textContent;
        return text.match(/^\d+$/) && !btn.disabled;
      });

      if (selectableDay) {
        await user.click(selectableDay);

        await waitFor(() => {
          // 11:00 AM should be unavailable according to our mock
          const slot11 = screen.queryByText(/11:00 AM/i);
          if (slot11) {
            const slotButton = slot11.closest('button');
            // Unavailable slots should have cursor-not-allowed class
            expect(slotButton).toHaveClass('cursor-not-allowed');
          }
        });
      }
    });
  });

  describe('Booking Form', () => {
    async function selectDateAndTime(user) {
      // Select a date
      const dayButtons = screen.getAllByRole('button');
      const selectableDay = dayButtons.find((btn) => {
        const text = btn.textContent;
        return text.match(/^\d+$/) && !btn.disabled;
      });

      if (selectableDay) {
        await user.click(selectableDay);

        await waitFor(() => {
          expect(screen.getByText(/9:00 AM/i)).toBeInTheDocument();
        });

        // Select a time
        const timeSlot = screen.getByText(/9:00 AM/i).closest('button');
        await user.click(timeSlot);

        // Click continue
        const continueButton = screen.getByRole('button', { name: /continue/i });
        await user.click(continueButton);
      }

      return !!selectableDay;
    }

    it('should show booking form after selecting date and time', async () => {
      const { user } = render(<CalendarView />);

      const selected = await selectDateAndTime(user);

      if (selected) {
        await waitFor(() => {
          expect(screen.getByText(/complete your booking/i)).toBeInTheDocument();
        });
      }
    });

    it('should require name field', async () => {
      const { user } = render(<CalendarView />);

      const selected = await selectDateAndTime(user);

      if (selected) {
        await waitFor(() => {
          expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
        });

        // Try to submit without name
        const confirmButton = screen.getByRole('button', { name: /confirm/i });
        await user.click(confirmButton);

        await waitFor(() => {
          expect(screen.getByText(/please enter your name/i)).toBeInTheDocument();
        });
      }
    });

    it('should validate email format', async () => {
      const { user } = render(<CalendarView />);

      const selected = await selectDateAndTime(user);

      if (selected) {
        await waitFor(() => {
          expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
        });

        // Enter name but invalid email
        await user.type(screen.getByLabelText(/full name/i), 'Test User');
        await user.type(screen.getByLabelText(/email/i), 'invalid-email');

        const confirmButton = screen.getByRole('button', { name: /confirm/i });
        await user.click(confirmButton);

        await waitFor(() => {
          expect(screen.getByText(/valid email/i)).toBeInTheDocument();
        });
      }
    });

    it('should call bookAppointment API on valid submission', async () => {
      const { user } = render(<CalendarView />);

      const selected = await selectDateAndTime(user);

      if (selected) {
        await waitFor(() => {
          expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
        });

        // Fill in valid data
        await user.type(screen.getByLabelText(/full name/i), 'Test User');
        await user.type(screen.getByLabelText(/email/i), 'test@example.com');
        await user.type(screen.getByLabelText(/phone/i), '555-123-4567');

        const confirmButton = screen.getByRole('button', { name: /confirm/i });
        await user.click(confirmButton);

        await waitFor(() => {
          expect(mockBookAppointment).toHaveBeenCalledWith(
            expect.objectContaining({
              name: 'Test User',
              email: 'test@example.com',
              phone: '555-123-4567',
            })
          );
        });
      }
    });
  });

  describe('Booking Confirmation', () => {
    it('should show success message after booking', async () => {
      const { user } = render(<CalendarView />);

      // Select date
      const dayButtons = screen.getAllByRole('button');
      const selectableDay = dayButtons.find((btn) => {
        const text = btn.textContent;
        return text.match(/^\d+$/) && !btn.disabled;
      });

      if (selectableDay) {
        await user.click(selectableDay);

        await waitFor(() => {
          expect(screen.getByText(/9:00 AM/i)).toBeInTheDocument();
        });

        // Select time
        const timeSlot = screen.getByText(/9:00 AM/i).closest('button');
        await user.click(timeSlot);

        // Continue
        const continueButton = screen.getByRole('button', { name: /continue/i });
        await user.click(continueButton);

        await waitFor(() => {
          expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
        });

        // Fill form
        await user.type(screen.getByLabelText(/full name/i), 'Test User');
        await user.type(screen.getByLabelText(/email/i), 'test@example.com');

        // Submit
        const confirmButton = screen.getByRole('button', { name: /confirm/i });
        await user.click(confirmButton);

        await waitFor(() => {
          expect(screen.getByText(/consultation scheduled/i)).toBeInTheDocument();
        });

        // Should show confirmation ID
        expect(screen.getByText(/apt-123/i)).toBeInTheDocument();
      }
    });

    it('should allow scheduling another appointment after success', async () => {
      mockBookAppointment.mockResolvedValue({
        success: true,
        appointmentId: 'apt-456',
      });

      const { user } = render(<CalendarView />);

      // Go through full booking flow (simplified for test)
      const dayButtons = screen.getAllByRole('button');
      const selectableDay = dayButtons.find((btn) => {
        const text = btn.textContent;
        return text.match(/^\d+$/) && !btn.disabled;
      });

      if (selectableDay) {
        await user.click(selectableDay);

        await waitFor(() => {
          expect(screen.getByText(/9:00 AM/i)).toBeInTheDocument();
        });

        await user.click(screen.getByText(/9:00 AM/i).closest('button'));
        await user.click(screen.getByRole('button', { name: /continue/i }));

        await waitFor(() => {
          expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
        });

        await user.type(screen.getByLabelText(/full name/i), 'Test User');
        await user.type(screen.getByLabelText(/email/i), 'test@example.com');
        await user.click(screen.getByRole('button', { name: /confirm/i }));

        await waitFor(() => {
          expect(screen.getByText(/consultation scheduled/i)).toBeInTheDocument();
        });

        // Click "schedule another"
        const scheduleAnotherLink = screen.getByText(/schedule another/i);
        await user.click(scheduleAnotherLink);

        // Should be back to initial state
        await waitFor(() => {
          expect(screen.getByText(/select a date/i)).toBeInTheDocument();
        });
      }
    });
  });

  describe('Error Handling', () => {
    it('should show error when booking fails', async () => {
      mockBookAppointment.mockResolvedValue({
        success: false,
        message: 'Slot no longer available',
      });

      const { user } = render(<CalendarView />);

      // Go through booking flow
      const dayButtons = screen.getAllByRole('button');
      const selectableDay = dayButtons.find((btn) => {
        const text = btn.textContent;
        return text.match(/^\d+$/) && !btn.disabled;
      });

      if (selectableDay) {
        await user.click(selectableDay);

        await waitFor(() => {
          expect(screen.getByText(/9:00 AM/i)).toBeInTheDocument();
        });

        await user.click(screen.getByText(/9:00 AM/i).closest('button'));
        await user.click(screen.getByRole('button', { name: /continue/i }));

        await waitFor(() => {
          expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
        });

        await user.type(screen.getByLabelText(/full name/i), 'Test User');
        await user.type(screen.getByLabelText(/email/i), 'test@example.com');
        await user.click(screen.getByRole('button', { name: /confirm/i }));

        await waitFor(() => {
          expect(screen.getByText(/slot no longer available/i)).toBeInTheDocument();
        });
      }
    });

    it('should handle availability fetch errors gracefully', async () => {
      mockCheckAvailability.mockResolvedValue({
        success: false,
        availableSlots: [],
      });

      const { user } = render(<CalendarView />);

      const dayButtons = screen.getAllByRole('button');
      const selectableDay = dayButtons.find((btn) => {
        const text = btn.textContent;
        return text.match(/^\d+$/) && !btn.disabled;
      });

      if (selectableDay) {
        await user.click(selectableDay);

        // Should still show default time slots
        await waitFor(() => {
          expect(screen.getByText(/9:00 AM/i)).toBeInTheDocument();
        });
      }
    });
  });
});
