import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Video,
  MapPin,
  CheckCircle,
  CalendarDays,
  Sparkles,
  Loader2,
  User,
  Mail,
  Phone,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format, addDays, startOfWeek, isSameDay, addWeeks, subWeeks } from 'date-fns';
import { checkAvailability, bookAppointment } from '@/api/mikoAI';

const defaultTimeSlots = [
  { time: '9:00 AM', available: true },
  { time: '10:00 AM', available: true },
  { time: '11:00 AM', available: true },
  { time: '1:00 PM', available: true },
  { time: '2:00 PM', available: true },
  { time: '3:00 PM', available: true },
  { time: '4:00 PM', available: true },
];

const consultationTypes = [
  { id: 'virtual', label: 'Virtual Consultation', icon: Video, description: 'Video call from anywhere' },
  { id: 'inperson', label: 'In-Person Visit', icon: MapPin, description: 'Beverly Hills office' },
];

export default function CalendarView() {
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [selectedType, setSelectedType] = useState('virtual');
  const [isBooked, setIsBooked] = useState(false);
  const [bookingDetails, setBookingDetails] = useState(null);

  // Availability state
  const [timeSlots, setTimeSlots] = useState(defaultTimeSlots);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [availabilityError, setAvailabilityError] = useState(null);

  // Booking form state
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [bookingError, setBookingError] = useState(null);
  const [patientInfo, setPatientInfo] = useState({
    name: '',
    email: '',
    phone: '',
  });

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeek, i));
  const today = new Date();

  // Convert 12-hour time to ISO datetime
  const timeToISO = useCallback((date, time) => {
    const [timePart, period] = time.split(' ');
    let [hours, minutes] = timePart.split(':').map(Number);

    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;

    const dateObj = new Date(date);
    dateObj.setHours(hours, minutes, 0, 0);

    return dateObj.toISOString();
  }, []);

  // Fetch availability when date is selected
  const fetchAvailability = useCallback(async (date) => {
    setIsLoadingSlots(true);
    setAvailabilityError(null);

    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      const response = await checkAvailability({
        date: dateStr,
        consultType: selectedType,
      });

      if (response.success && response.availableSlots?.length > 0) {
        // Map API slots to our format
        const apiSlots = response.availableSlots.map(slot => {
          // Handle different slot formats from API
          const time = typeof slot === 'string' ? slot : slot.time;
          return {
            time,
            available: typeof slot === 'object' ? slot.available !== false : true,
          };
        });
        setTimeSlots(apiSlots.length > 0 ? apiSlots : defaultTimeSlots);
      } else {
        // Use default slots if API doesn't return specific availability
        setTimeSlots(defaultTimeSlots);
      }
    } catch (error) {
      console.error('Error fetching availability:', error);
      setAvailabilityError('Unable to load availability. Showing default times.');
      setTimeSlots(defaultTimeSlots);
    } finally {
      setIsLoadingSlots(false);
    }
  }, [selectedType]);

  // Fetch availability when date changes
  useEffect(() => {
    if (selectedDate) {
      fetchAvailability(selectedDate);
      setSelectedTime(null); // Reset time when date changes
    }
  }, [selectedDate, fetchAvailability]);

  // Handle date selection
  const handleDateSelect = (day) => {
    setSelectedDate(day);
    setShowBookingForm(false);
    setBookingError(null);
  };

  // Handle time selection
  const handleTimeSelect = (time) => {
    setSelectedTime(time);
    setShowBookingForm(false);
    setBookingError(null);
  };

  // Handle form input change
  const handleInputChange = (field, value) => {
    setPatientInfo(prev => ({ ...prev, [field]: value }));
    setBookingError(null);
  };

  // Validate form
  const validateForm = () => {
    if (!patientInfo.name.trim()) {
      setBookingError('Please enter your name');
      return false;
    }
    if (!patientInfo.email.trim() || !/\S+@\S+\.\S+/.test(patientInfo.email)) {
      setBookingError('Please enter a valid email address');
      return false;
    }
    return true;
  };

  // Handle booking confirmation
  const handleConfirmBooking = async () => {
    if (!validateForm()) return;

    setIsBooking(true);
    setBookingError(null);

    try {
      const dateTime = timeToISO(selectedDate, selectedTime);

      const response = await bookAppointment({
        name: patientInfo.name,
        email: patientInfo.email,
        phone: patientInfo.phone,
        dateTime,
        consultType: selectedType,
      });

      if (response.success) {
        setBookingDetails({
          date: selectedDate,
          time: selectedTime,
          type: selectedType,
          confirmationId: response.appointmentId,
        });
        setIsBooked(true);
      } else {
        setBookingError(response.message || 'Unable to complete booking. Please try again.');
      }
    } catch (error) {
      console.error('Booking error:', error);
      setBookingError('Unable to complete booking. Please try again or call (310) 275-2705.');
    } finally {
      setIsBooking(false);
    }
  };

  // Proceed to booking form
  const handleProceedToBook = () => {
    setShowBookingForm(true);
  };

  // Reset and book another
  const handleBookAnother = () => {
    setIsBooked(false);
    setSelectedDate(null);
    setSelectedTime(null);
    setShowBookingForm(false);
    setPatientInfo({ name: '', email: '', phone: '' });
    setBookingDetails(null);
    setBookingError(null);
  };

  // Success screen
  if (isBooked) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 bg-[#FDFCFB]">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', damping: 15 }}
          className="w-20 h-20 rounded-full bg-gradient-to-br from-[#3D1010] to-[#4A1515] flex items-center justify-center mb-6"
        >
          <CheckCircle className="w-10 h-10 text-white" />
        </motion.div>
        <motion.h3
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-xl font-medium text-[#2D0A0A] mb-3 text-center"
        >
          Consultation Scheduled
        </motion.h3>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center mb-6"
        >
          <p className="text-[#4A1515] font-medium">
            {bookingDetails?.date && format(bookingDetails.date, 'EEEE, MMMM d, yyyy')}
          </p>
          <p className="text-[#6B5C4C]">
            {bookingDetails?.time} • {bookingDetails?.type === 'virtual' ? 'Virtual' : 'In-Person'}
          </p>
          {bookingDetails?.confirmationId && (
            <p className="text-xs text-[#8B7355] mt-2">
              Confirmation: {bookingDetails.confirmationId}
            </p>
          )}
        </motion.div>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-[#6B5C4C] text-center text-sm max-w-xs mb-8"
        >
          You&apos;ll receive a confirmation email at {patientInfo.email} shortly with details and preparation instructions.
        </motion.p>
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          onClick={handleBookAnother}
          className="text-[#4A1515] text-sm font-medium hover:underline"
        >
          Schedule another appointment
        </motion.button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#FDFCFB]">
      {/* Consultation Type */}
      <div className="px-4 py-4 border-b border-[#F0EBE5] bg-white">
        <div className="flex gap-2">
          {consultationTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => {
                setSelectedType(type.id);
                if (selectedDate) fetchAvailability(selectedDate);
              }}
              className={`flex-1 p-3 rounded-xl border-2 transition-all ${
                selectedType === type.id
                  ? 'border-[#4A1515] bg-[#FBF8F5]'
                  : 'border-[#E8E3DC] bg-white hover:border-[#C4A484]'
              }`}
            >
              <type.icon className={`w-5 h-5 mx-auto mb-2 ${
                selectedType === type.id ? 'text-[#4A1515]' : 'text-[#8B7355]'
              }`} />
              <p className={`text-xs font-medium ${
                selectedType === type.id ? 'text-[#4A1515]' : 'text-[#4A3628]'
              }`}>
                {type.label}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Calendar */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-4">
          {/* Week Navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
              className="p-2 rounded-lg hover:bg-[#F0EBE5] text-[#4A3628] transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h3 className="text-sm font-medium text-[#2D0A0A]">
              {format(currentWeek, 'MMMM yyyy')}
            </h3>
            <button
              onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
              className="p-2 rounded-lg hover:bg-[#F0EBE5] text-[#4A3628] transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-1 mb-6">
            {weekDays.map((day, index) => {
              const isToday = isSameDay(day, today);
              const isPast = day < today && !isToday;
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const isWeekend = index === 5 || index === 6;

              return (
                <button
                  key={index}
                  onClick={() => !isPast && !isWeekend && handleDateSelect(day)}
                  disabled={isPast || isWeekend}
                  className={`p-2 rounded-xl text-center transition-all ${
                    isSelected
                      ? 'bg-gradient-to-br from-[#3D1010] to-[#4A1515] text-white'
                      : isPast || isWeekend
                      ? 'text-[#C4B8A8] cursor-not-allowed'
                      : isToday
                      ? 'bg-[#FBF8F5] text-[#4A1515] border border-[#4A1515]'
                      : 'hover:bg-[#F0EBE5] text-[#4A3628]'
                  }`}
                >
                  <span className="text-[10px] uppercase tracking-wide">
                    {format(day, 'EEE')}
                  </span>
                  <span className="block text-lg font-medium mt-0.5">
                    {format(day, 'd')}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Time Slots */}
          <AnimatePresence mode="wait">
            {selectedDate && !showBookingForm && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-[#4A1515]" />
                    <h4 className="text-sm font-medium text-[#2D0A0A]">
                      {format(selectedDate, 'EEEE, MMMM d')}
                    </h4>
                  </div>
                  {isLoadingSlots && (
                    <Loader2 className="w-4 h-4 text-[#4A1515] animate-spin" />
                  )}
                </div>

                {availabilityError && (
                  <p className="text-xs text-amber-600 mb-3">{availabilityError}</p>
                )}

                <div className="grid grid-cols-2 gap-2">
                  {timeSlots.map((slot, index) => (
                    <button
                      key={index}
                      onClick={() => slot.available && handleTimeSelect(slot.time)}
                      disabled={!slot.available || isLoadingSlots}
                      className={`p-3 rounded-xl border-2 transition-all flex items-center gap-2 ${
                        selectedTime === slot.time
                          ? 'border-[#4A1515] bg-[#FBF8F5]'
                          : slot.available
                          ? 'border-[#E8E3DC] hover:border-[#C4A484] bg-white'
                          : 'border-[#F0EBE5] bg-[#FAFAFA] cursor-not-allowed'
                      }`}
                    >
                      <Clock className={`w-4 h-4 ${
                        selectedTime === slot.time
                          ? 'text-[#4A1515]'
                          : slot.available
                          ? 'text-[#8B7355]'
                          : 'text-[#C4B8A8]'
                      }`} />
                      <span className={`text-sm ${
                        selectedTime === slot.time
                          ? 'text-[#4A1515] font-medium'
                          : slot.available
                          ? 'text-[#4A3628]'
                          : 'text-[#C4B8A8]'
                      }`}>
                        {slot.time}
                      </span>
                      {slot.available && selectedTime !== slot.time && (
                        <Sparkles className="w-3 h-3 text-[#C4A484] ml-auto" />
                      )}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Booking Form */}
            {showBookingForm && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2 mb-4">
                  <CalendarDays className="w-4 h-4 text-[#4A1515]" />
                  <h4 className="text-sm font-medium text-[#2D0A0A]">
                    Complete Your Booking
                  </h4>
                </div>

                <div className="bg-[#FBF8F5] rounded-xl p-3 mb-4">
                  <p className="text-sm text-[#4A1515] font-medium">
                    {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                  </p>
                  <p className="text-xs text-[#6B5C4C]">
                    {selectedTime} • {selectedType === 'virtual' ? 'Virtual' : 'In-Person'}
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="name" className="text-[#4A3628] text-xs font-medium">
                      Full Name *
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B7355]" />
                      <Input
                        id="name"
                        value={patientInfo.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        placeholder="Your name"
                        className="pl-10 bg-white border-[#E8E3DC] focus:border-[#4A1515] focus:ring-[#4A1515] rounded-xl h-11"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-[#4A3628] text-xs font-medium">
                      Email Address *
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B7355]" />
                      <Input
                        id="email"
                        type="email"
                        value={patientInfo.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        placeholder="your@email.com"
                        className="pl-10 bg-white border-[#E8E3DC] focus:border-[#4A1515] focus:ring-[#4A1515] rounded-xl h-11"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="phone" className="text-[#4A3628] text-xs font-medium">
                      Phone Number (Optional)
                    </Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B7355]" />
                      <Input
                        id="phone"
                        type="tel"
                        value={patientInfo.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        placeholder="(555) 123-4567"
                        className="pl-10 bg-white border-[#E8E3DC] focus:border-[#4A1515] focus:ring-[#4A1515] rounded-xl h-11"
                      />
                    </div>
                  </div>
                </div>

                {bookingError && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl">
                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <p className="text-xs text-red-600">{bookingError}</p>
                  </div>
                )}

                <button
                  onClick={() => setShowBookingForm(false)}
                  className="text-xs text-[#8B7355] hover:text-[#4A1515]"
                >
                  &larr; Change date or time
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {!selectedDate && (
            <div className="text-center py-8">
              <CalendarDays className="w-10 h-10 text-[#C4B8A8] mx-auto mb-3" />
              <p className="text-[#8B7355] text-sm">
                Select a date to view available times
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-[#F0EBE5] bg-white">
        {showBookingForm ? (
          <Button
            onClick={handleConfirmBooking}
            disabled={isBooking || !patientInfo.name || !patientInfo.email}
            className="w-full bg-gradient-to-r from-[#3D1010] to-[#4A1515] hover:from-[#4A1515] hover:to-[#5A2020] text-white rounded-xl h-12 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isBooking ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Booking...
              </span>
            ) : (
              <span>Confirm Booking</span>
            )}
          </Button>
        ) : (
          <Button
            onClick={handleProceedToBook}
            disabled={!selectedDate || !selectedTime}
            className="w-full bg-gradient-to-r from-[#3D1010] to-[#4A1515] hover:from-[#4A1515] hover:to-[#5A2020] text-white rounded-xl h-12 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {selectedDate && selectedTime ? (
              <span>Continue with {selectedTime}</span>
            ) : (
              <span>Select Date & Time</span>
            )}
          </Button>
        )}
        <p className="text-center text-xs text-[#8B7355] mt-3">
          Free consultation • No obligation
        </p>
      </div>
    </div>
  );
}
