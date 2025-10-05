import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  Platform,
  Alert,
  Text as RNText,
  TextInput as RNTextInput,
  AccessibilityInfo,
  FlatList,
  Modal,
  StatusBar
} from 'react-native';
import { ThemedText } from './ThemedText';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { Button } from './Button';
import { TextInput } from './TextInput';
import Colors from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import DateTimePickerModal from "react-native-modal-datetime-picker";
import DateTimePicker from './DatePickerPolyfill';
import { format, parse, isValid, addHours, isBefore, isAfter, setHours, setMinutes, addMinutes, isToday, addMonths, addDays, parseISO, subDays, startOfDay } from 'date-fns';
import { addAppointment, saveAppointment } from '../services/firestoreService';
import { useAuth } from '../contexts/AuthContext';
import Typography from '@/constants/Typography';
import { Card } from './Card';
import { Calendar } from 'react-native-calendars';
import { useColorScheme } from '@/hooks/useColorScheme';

export interface Appointment {
  id: string;
  doctorName: string;
  doctorImage?: string;
  specialty: string;
  date: string; // ISO date string
  time: string;
  location: string;
  address?: string;
  notes?: string;
  status: 'upcoming' | 'past' | 'cancelled';
  isPast?: boolean;
  reminderSet?: boolean;
  followUp?: boolean;
  createdAt?: string;
  updatedAt?: string;
  reason?: string;
  duration: number;
  isRecurring: boolean;
  recurrencePattern: RecurrencePattern | null;
  recurrenceEnd?: string;
  reminderTime: number;
  reminderType: ReminderType;
  timeZone: string;
  color?: string;
}

type ReminderType = 'notification' | 'email' | 'sms' | 'all';
type RecurrencePattern = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';

interface AppointmentSchedulerProps {
  visible: boolean;
  onClose: () => void;
  onAppointmentAdded: () => void;
  initialDate?: string;
  appointment?: Appointment;
  mode?: 'schedule' | 'reschedule';
}

interface User {
  uid: string;
  email: string;
  // Add other user properties as needed
}

// Add a debug logging function
const logEvent = (eventName: string, data?: any) => {
  console.log(`[AppointmentScheduler] ${eventName}:`, data || '');
};

// Add this diagnostic helper function before the component
const debugDate = (label: string, dateObj: Date, formattedDate?: string) => {
  console.log(`[${label}]:`, {
    original: dateObj.toString(),
    year: dateObj.getFullYear(),
    month: dateObj.getMonth() + 1, // +1 because getMonth is 0-indexed
    date: dateObj.getDate(),
    formatted: formattedDate,
    timestamp: dateObj.getTime()
  });
};

export function AppointmentScheduler({ 
  visible, 
  onClose, 
  onAppointmentAdded,
  initialDate,
  appointment,
  mode = 'schedule'
}: AppointmentSchedulerProps) {
  const { currentUser } = useAuth();
  const typedUser = currentUser as User | null;
  const isReschedule = mode === 'reschedule';
  const title = isReschedule ? 'Reschedule Appointment' : 'Schedule Appointment';
  
  const [doctorName, setDoctorName] = useState(appointment?.doctorName || '');
  const [specialty, setSpecialty] = useState(appointment?.specialty || '');
  const [location, setLocation] = useState(appointment?.location || '');
  const [notes, setNotes] = useState(appointment?.notes || '');

  const [date, setDate] = useState<Date>(
    appointment?.date 
      ? parse(appointment.date, 'yyyy-MM-dd', new Date()) 
      : initialDate 
        ? new Date(initialDate) 
        : new Date()
  );
  const [time, setTime] = useState<Date>(
    appointment?.time 
      ? parse(appointment.time, 'HH:mm', new Date()) 
      : new Date()
  );
  
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [isTimePickerVisible, setTimePickerVisible] = useState(false);
  
  const [errors, setErrors] = useState<{
    doctorName?: string;
    specialty?: string;
    date?: string;
    time?: string;
    location?: string;
    duration?: string;
    recurrence?: string;
  }>({});
  
  const [manualDateInput, setManualDateInput] = useState('');
  const [manualTimeInput, setManualTimeInput] = useState('');
  const [showManualDateInput, setShowManualDateInput] = useState(false);
  const [showManualTimeInput, setShowManualTimeInput] = useState(false);

  const [duration, setDuration] = useState(30); // Default 30 minutes
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrencePattern, setRecurrencePattern] = useState<RecurrencePattern | null>(null);
  const [recurrenceEnd, setRecurrenceEnd] = useState<Date | null>(null);
  const [recurrenceEndPickerVisible, setRecurrenceEndPickerVisible] = useState(false);
  const [reminderTime, setReminderTime] = useState(30); // Default 30 minutes before
  const [reminderType, setReminderType] = useState<ReminderType>('notification');
  const [availableTimeSlots, setAvailableTimeSlots] = useState<Date[]>([]);
  const [timeZone, setTimeZone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<Date | null>(null);
  const [isTimeSlotModalVisible, setTimeSlotModalVisible] = useState(false);
  const [appointmentColor, setAppointmentColor] = useState(Colors.light.primary);
  const [showNativeDatePicker, setShowNativeDatePicker] = useState(false);
  const [showNativeTimePicker, setShowNativeTimePicker] = useState(false);
  const [showCustomCalendar, setShowCustomCalendar] = useState(false);

  // Debug renderer counter to ensure we're getting updates
  const [renderCount, setRenderCount] = useState(0);
  
  // Debug render counter
  useEffect(() => {
    setRenderCount(prev => prev + 1);
    logEvent('Component rendered', renderCount);
  }, []);
  
  // Debug date picker visibility
  useEffect(() => {
    logEvent('Date picker visibility changed', { 
      isDatePickerVisible, 
      showNativeDatePicker,
      platform: Platform.OS 
    });
  }, [isDatePickerVisible, showNativeDatePicker]);

  // Log when date changes to debug the off-by-one issue
  useEffect(() => {
    if (date) {
      debugDate('Date changed', date, format(date, 'yyyy-MM-dd'));
    }
  }, [date]);

  // Improve the time slots generation in the useEffect hook
  useEffect(() => {
    if (isValid(date)) {
      // Use the utility function to generate time slots
      const slots = generateTimeSlots(date);
      setAvailableTimeSlots(slots);
      
      // If no time slot is selected yet, default to the first available
      if ((!selectedTimeSlot || !isValid(selectedTimeSlot)) && slots.length > 0) {
        setSelectedTimeSlot(slots[0]);
        setTime(slots[0]);
      }
    }
  }, [date]);

  // Improve the validation function to be more thorough
  const validateInputs = () => {
    const newErrors: any = {};
    
    // Check required text fields
    if (!doctorName.trim()) newErrors.doctorName = 'Doctor name is required';
    if (!specialty.trim()) newErrors.specialty = 'Specialty is required';
    if (!location.trim()) newErrors.location = 'Location is required';
    
    // Date validation - more thorough
    if (!date) {
      newErrors.date = 'Date is required';
    } else if (!isValid(date)) {
      newErrors.date = 'Valid date is required';
    } else if (isBefore(date, startOfDay(new Date())) && !isToday(date)) {
      newErrors.date = 'Date cannot be in the past';
    }
    
    // Time validation - more thorough
    if (!time) {
      newErrors.time = 'Time is required';
    } else if (!isValid(time)) {
      newErrors.time = 'Valid time is required';
    } else if (!selectedTimeSlot && !showManualTimeInput) {
      newErrors.time = 'Please select a time slot';
    } else {
      // Create a datetime that combines the selected date and time
      const selectedDateTime = new Date(date);
      selectedDateTime.setHours(time.getHours());
      selectedDateTime.setMinutes(time.getMinutes());
      
      // Check if the combined datetime is in the past
      const now = new Date();
      
      // Only show error if the selected date is today and time is in the past
      if (isToday(date) && isBefore(selectedDateTime, now)) {
        newErrors.time = 'Time cannot be in the past';
      }
    }
    
    // Recurrence validation
    if (isRecurring && !recurrencePattern) {
      newErrors.recurrence = 'Please select a recurrence pattern';
    }
    
    // Recurrence end date validation
    if (isRecurring && recurrencePattern && recurrenceEnd) {
      if (!isValid(recurrenceEnd)) {
        newErrors.recurrence = 'Invalid recurrence end date';
      } else if (isBefore(recurrenceEnd, date)) {
        newErrors.recurrence = 'Recurrence end date must be after appointment date';
      }
    }
    
    // Duration validation
    if (!duration) {
      newErrors.duration = 'Duration is required';
    } else if (duration < 15) {
      newErrors.duration = 'Duration must be at least 15 minutes';
    } else if (duration > 240) {
      newErrors.duration = 'Duration cannot exceed 4 hours';
    }
    
    return newErrors;
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSchedule = async () => {
    logEvent('Schedule button pressed');
    
    // Debug all form values before submission
    debugDate('Submit - Date value', date);
    console.log('Submit form values:', {
      doctorName,
      specialty,
      location,
      date: format(date, 'yyyy-MM-dd'),
      time: format(time, 'HH:mm'),
      duration,
      isRecurring,
      recurrencePattern,
      notes: notes.trim()
    });
    
    // Prevent double submission
    if (isSubmitting) {
      logEvent('Preventing double submission');
      return;
    }
    
    const newErrors = validateInputs();
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      logEvent('Validation errors', newErrors);
      
      // Show an alert with validation errors
      const errorMessages = Object.values(newErrors).join('\n• ');
      Alert.alert(
        'Missing Information',
        `Please correct the following issues:\n\n• ${errorMessages}`,
        [{ text: 'OK', style: 'default' }]
      );
      
      return;
    }
    
    setErrors({});
    setIsSubmitting(true);
    
    try {
      // Ensure the date is correctly formatted, without timezone conversion issues
      // Get the date components directly to avoid timezone shifts
      const year = date.getFullYear();
      const month = date.getMonth() + 1; // getMonth() is 0-indexed
      const day = date.getDate();
      
      // Format the date manually to ensure the exact date the user selected
      const formattedDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      
      logEvent('Formatted date for appointment (manual format)', formattedDate);
      
      const formattedTime = format(time, 'HH:mm');
      
      // Create the appointment data object with all required fields
      // Ensure no undefined values which Firestore rejects
      const appointmentData = {
        doctorName: doctorName.trim() || "",
        specialty: specialty.trim() || "",
        date: formattedDate,
        time: formattedTime,
        location: location.trim() || "",
        notes: notes.trim() || "",
        status: 'upcoming',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        duration: duration || 30,
        isRecurring: Boolean(isRecurring),
        reminderTime: reminderTime || 30,
        reminderType: reminderType || 'notification',
        timeZone: timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        color: appointmentColor || Colors.light.primary,
        // Always initialize these to null (not undefined) to avoid Firestore errors
        recurrencePattern: null,
        recurrenceEnd: null
      };
      
      // Only set recurrence fields if appointment is recurring
      if (isRecurring && recurrencePattern) {
        appointmentData.recurrencePattern = recurrencePattern;
        
        // Format recurrenceEnd if it exists, otherwise leave as null
        if (recurrenceEnd && isValid(recurrenceEnd)) {
          const recEndYear = recurrenceEnd.getFullYear();
          const recEndMonth = (recurrenceEnd.getMonth() + 1).toString().padStart(2, '0');
          const recEndDay = recurrenceEnd.getDate().toString().padStart(2, '0');
          appointmentData.recurrenceEnd = `${recEndYear}-${recEndMonth}-${recEndDay}`;
        }
      }
      
      logEvent('Final appointment data to save:', appointmentData);
      console.log('FINAL APPOINTMENT DATA:', JSON.stringify(appointmentData));
      
      // Check if user is logged in
      if (!typedUser || !typedUser.uid) {
        throw new Error('User not logged in');
      }
      
      // Display a saving indicator to the user
      Alert.alert(
        'Saving',
        'Saving your appointment...',
        [],
        { cancelable: false }
      );
      
      let result;
      
      // Try to save the appointment
        if (isReschedule && appointment) {
          console.log('Rescheduling appointment with ID:', appointment.id);
        result = await saveAppointment(typedUser.uid, {
            ...appointmentData,
            id: appointment.id
          });
        logEvent('Appointment rescheduled successfully', appointment.id);
        } else {
        console.log('Adding new appointment for user:', typedUser.uid);
        result = await addAppointment(typedUser.uid, appointmentData);
        logEvent('New appointment added successfully', result);
        console.log('Added appointment result:', result);
        }
        
      // Success alert
        Alert.alert(
          'Success',
          `Appointment ${isReschedule ? 'rescheduled' : 'scheduled'} successfully`,
          [{ text: 'OK', onPress: onClose }]
        );
      
      // Call the callback to refresh appointments list
        onAppointmentAdded();
    } catch (error) {
      console.error('Error scheduling appointment:', error);
      Alert.alert(
        'Error',
        `Failed to schedule appointment: ${error.message || 'Unknown error'}. Please try again.`,
        [{ text: 'OK' }]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDateConfirm = (selectedDate: Date) => {
    setDatePickerVisible(false);
    setDate(selectedDate);
  };

  const handleTimeConfirm = (selectedTime: Date) => {
    setTimePickerVisible(false);
    setTime(selectedTime);
  };

  const handleManualDateInput = (text: string) => {
    setManualDateInput(text);
    try {
      const parsedDate = parse(text, 'yyyy-MM-dd', new Date());
      if (isValid(parsedDate)) {
        setDate(parsedDate);
      }
    } catch (error) {
      // Invalid date format
    }
  };

  const handleManualTimeInput = (text: string) => {
    setManualTimeInput(text);
    try {
      const parsedTime = parse(text, 'HH:mm', new Date());
      if (isValid(parsedTime)) {
        setTime(parsedTime);
      }
    } catch (error) {
      // Invalid time format
    }
  };

  const handleRecurrenceEndConfirm = (selectedDate: Date) => {
    setRecurrenceEndPickerVisible(false);
    setRecurrenceEnd(selectedDate);
  };

  const handleTimeSlotSelect = (slot: Date) => {
    logEvent('Time slot selected', format(slot, 'h:mm a'));
    setSelectedTimeSlot(slot);
    setTime(slot);
    setTimeSlotModalVisible(false);
  };

  // Display time in a more readable format for the time slot picker
  const formatTimeSlot = (date: Date) => {
    return format(date, 'h:mm a');
  };

  const formattedDate = isValid(date) ? format(date, 'MMMM dd, yyyy') : 'Select date';
  const formattedTime = isValid(time) ? format(time, 'h:mm a') : 'Select time';
  
  const openDatePicker = () => {
    logEvent('Opening date picker', Platform.OS);
    
    // First try the custom calendar fallback
    setShowCustomCalendar(true);
    
    // Also try the native methods as backup
    if (Platform.OS === 'android') {
      logEvent('Using Android native picker');
      setShowNativeDatePicker(true);
    } else {
      logEvent('Using iOS modal picker');
      setDatePickerVisible(true);
    }
  };

  const openTimePicker = () => {
    logEvent('Opening time picker', Platform.OS);
    
    // Generate time slots if they don't exist yet
    if (availableTimeSlots.length === 0) {
      const slots = generateTimeSlots(date);
      setAvailableTimeSlots(slots);
    }
    
    if (Platform.OS === 'android') {
      logEvent('Using Android native time picker');
      setShowNativeTimePicker(true);
    } else {
      logEvent('Using iOS time slot modal');
      setTimeSlotModalVisible(true);
    }
  };

  const handleNativeDateChange = (event, selectedDate) => {
    logEvent('Native date selected', selectedDate);
    setShowNativeDatePicker(false);
    
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const handleNativeTimeChange = (event, selectedTime) => {
    setShowNativeTimePicker(false);
    if (selectedTime) {
      setTime(selectedTime);
    }
  };

  // Custom calendar handlers
  const handleCustomCalendarSelect = (day) => {
    logEvent('Custom calendar date selected', day);
    console.log('Raw calendar day selection:', day);
    
    // Instead of using the timestamp which can cause timezone issues,
    // explicitly parse the date from the dateString (YYYY-MM-DD format)
    const dateString = day.dateString; // This is in YYYY-MM-DD format from the calendar
    console.log('Calendar dateString:', dateString);
    
    // Parse the date parts manually to avoid timezone issues
    const [year, month, dayOfMonth] = dateString.split('-').map(Number);
    
    // Create a date at noon in the local timezone to avoid any date shifting
    // Month is 0-indexed in JavaScript Date, so subtract 1 from the month
    const correctedDate = new Date(year, month - 1, dayOfMonth, 12, 0, 0, 0);
    
    debugDate('Selected date from calendar directly from dateString', correctedDate);
    setDate(correctedDate);
    setShowCustomCalendar(false);
  };

  // Add a utility function to generate time slots for the current day
  const generateTimeSlots = (selectedDate: Date): Date[] => {
    const slots: Date[] = [];
    const now = new Date();
    
    // Set start and end times for the day (9 AM to 5 PM)
    let startHour = 9;
    let endHour = 17;
    
    // If the selected date is today, start from the next available slot
    if (isToday(selectedDate)) {
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      
      // Round up to nearest half hour
      if (currentHour >= startHour) {
        startHour = currentHour;
        if (currentMinute >= 30) {
          startHour += 1; // Move to next hour
        }
      }
    }
    
    // Generate time slots at 30-minute intervals
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute of [0, 30]) {
        // Skip past times for today
        if (isToday(selectedDate) && 
            ((hour === startHour && minute < now.getMinutes() && now.getMinutes() > 30) || 
             hour < now.getHours())) {
          continue;
        }
        
        // Create a new date object for this time slot
        const slotTime = new Date(selectedDate);
        slotTime.setHours(hour, minute, 0, 0);
        slots.push(slotTime);
      }
    }
    
    return slots;
  };

  // Add a new function to handle manual time selection with preset buttons
  const handleTimeSlotButtonSelect = (hour: number, minute: number) => {
    const newTime = new Date();
    newTime.setHours(hour, minute, 0, 0);
    setTime(newTime);
    setSelectedTimeSlot(newTime);
    
    // Format for display
    const formattedTime = format(newTime, 'h:mm a');
    console.log('Selected time manually:', formattedTime);
  };
  
  if (!visible) return null;
  
  return (
    <View style={styles.modalContainer}>
      <Card style={styles.modalView}>
        <View style={styles.modalHeader}>
          <ThemedText style={styles.modalTitle}>{title}</ThemedText>
          <TouchableOpacity onPress={onClose} accessibilityLabel="Close appointment scheduler">
            <Ionicons name="close-circle-outline" size={24} color={Colors.light.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalBody}>
          <View style={styles.formGroup}>
            <ThemedText style={styles.label}>Doctor Name *</ThemedText>
            <TextInput
              placeholder="Enter doctor's name"
              value={doctorName}
              onChangeText={setDoctorName}
              error={errors.doctorName}
              accessibilityLabel="Doctor name input"
            />
            {errors.doctorName && (
              <RNText style={styles.errorText}>{errors.doctorName}</RNText>
            )}
          </View>

          <View style={styles.formGroup}>
            <ThemedText style={styles.label}>Specialty *</ThemedText>
            <TextInput
              placeholder="Enter specialty"
              value={specialty}
              onChangeText={setSpecialty}
              error={errors.specialty}
              accessibilityLabel="Doctor specialty input"
            />
            {errors.specialty && (
              <RNText style={styles.errorText}>{errors.specialty}</RNText>
            )}
          </View>

          <View style={styles.formRow}>
            <View style={[styles.formGroup, styles.formHalf]}>
              <ThemedText style={styles.label}>Date *</ThemedText>
              {showManualDateInput ? (
                <View>
                  <RNTextInput
                    style={[styles.input, errors.date && styles.inputError]}
                    placeholder="YYYY-MM-DD"
                    value={manualDateInput}
                    onChangeText={handleManualDateInput}
                    keyboardType="numeric"
                    accessibilityLabel="Manual date input"
                  />
                  <TouchableOpacity 
                    style={styles.switchInputButton}
                    onPress={() => setShowManualDateInput(false)}
                    accessibilityLabel="Switch to calendar"
                  >
                    <ThemedText style={styles.switchInputText}>Use Calendar</ThemedText>
                  </TouchableOpacity>
                </View>
              ) : (
                <View>
              <TouchableOpacity 
                style={[styles.dateTimeButton, errors.date && styles.inputError]} 
                    onPress={openDatePicker}
                    accessibilityLabel="Open date picker"
              >
                <ThemedText>{formattedDate}</ThemedText>
                <Ionicons name="calendar-outline" size={20} color={Colors.light.primary} />
              </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.switchInputButton}
                    onPress={() => setShowManualDateInput(true)}
                    accessibilityLabel="Switch to manual date input"
                  >
                    <ThemedText style={styles.switchInputText}>Type Date</ThemedText>
                  </TouchableOpacity>
                </View>
              )}
              {errors.date && (
                <RNText style={styles.errorText}>{errors.date}</RNText>
              )}
            </View>

            <View style={[styles.formGroup, styles.formHalf]}>
              <ThemedText style={styles.label}>Time *</ThemedText>
              {showManualTimeInput ? (
                <View>
                  <RNTextInput
                    style={[styles.input, errors.time && styles.inputError]}
                    placeholder="HH:MM (24h format)"
                    value={manualTimeInput}
                    onChangeText={handleManualTimeInput}
                    keyboardType="numeric"
                    accessibilityLabel="Manual time input"
                  />
                  <TouchableOpacity 
                    style={styles.switchInputButton}
                    onPress={() => setShowManualTimeInput(false)}
                    accessibilityLabel="Switch to time picker"
                  >
                    <ThemedText style={styles.switchInputText}>Use Time Picker</ThemedText>
                  </TouchableOpacity>
                </View>
              ) : (
                <View>
              <TouchableOpacity 
                style={[styles.dateTimeButton, errors.time && styles.inputError]} 
                    onPress={openTimePicker}
                    accessibilityLabel="Open time picker"
              >
                    <ThemedText>{selectedTimeSlot ? formatTimeSlot(selectedTimeSlot) : formattedTime}</ThemedText>
                <Ionicons name="time-outline" size={20} color={Colors.light.primary} />
              </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.switchInputButton}
                    onPress={() => setShowManualTimeInput(true)}
                    accessibilityLabel="Switch to manual time input"
                  >
                    <ThemedText style={styles.switchInputText}>Type Time</ThemedText>
                  </TouchableOpacity>
                </View>
              )}
              {errors.time && (
                <RNText style={styles.errorText}>{errors.time}</RNText>
              )}
            </View>
          </View>

          <View style={styles.formGroup}>
            <ThemedText style={styles.label}>Location *</ThemedText>
            <TextInput
              placeholder="Enter location"
              value={location}
              onChangeText={setLocation}
              error={errors.location}
              accessibilityLabel="Location input"
            />
            {errors.location && (
              <RNText style={styles.errorText}>{errors.location}</RNText>
            )}
          </View>

          <View style={styles.formRow}>
            <View style={[styles.formGroup, styles.formHalf]}>
              <ThemedText style={styles.label}>Duration (minutes) *</ThemedText>
              <RNTextInput
                style={[styles.input, errors.duration && styles.inputError]}
                value={duration.toString()}
                onChangeText={(text) => setDuration(parseInt(text) || 30)}
                keyboardType="numeric"
                accessibilityLabel="Appointment duration in minutes"
              />
              {errors.duration && (
                <RNText style={styles.errorText}>{errors.duration}</RNText>
              )}
            </View>

            <View style={[styles.formGroup, styles.formHalf]}>
              <ThemedText style={styles.label}>Time Zone</ThemedText>
              <RNTextInput
                style={styles.input}
                value={timeZone}
                editable={false}
                accessibilityLabel={`Current time zone: ${timeZone}`}
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <ThemedText style={styles.label}>Appointment Color</ThemedText>
            <View style={styles.colorPicker}>
              {[Colors.light.primary, '#E74C3C', '#F39C12', '#2ECC71', '#3498DB', '#9B59B6'].map(color => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    appointmentColor === color && styles.selectedColorOption
                  ]}
                  onPress={() => setAppointmentColor(color)}
                  accessibilityLabel={`Select color ${color}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: appointmentColor === color }}
                />
              ))}
            </View>
          </View>

          <View style={styles.formGroup}>
            <TouchableOpacity 
              style={styles.checkboxContainer}
              onPress={() => setIsRecurring(!isRecurring)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isRecurring }}
            >
              <Ionicons 
                name={isRecurring ? "checkbox" : "square-outline"} 
                size={24} 
                color={Colors.light.primary} 
              />
              <ThemedText style={styles.checkboxLabel}>Recurring Appointment</ThemedText>
            </TouchableOpacity>

            {isRecurring && (
              <View style={styles.recurringOptions}>
                <ThemedText style={styles.subLabel}>Recurrence Pattern</ThemedText>
                <View style={styles.recurrenceOptions}>
                  {[
                    { value: 'daily', label: 'Daily' },
                    { value: 'weekly', label: 'Weekly' },
                    { value: 'biweekly', label: 'Bi-weekly' },
                    { value: 'monthly', label: 'Monthly' },
                    { value: 'quarterly', label: 'Quarterly' },
                    { value: 'yearly', label: 'Yearly' }
                  ].map(option => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.recurrenceButton, 
                        recurrencePattern === option.value && styles.selectedRecurrence
                      ]}
                      onPress={() => setRecurrencePattern(option.value as RecurrencePattern)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: recurrencePattern === option.value }}
                    >
                      <ThemedText style={recurrencePattern === option.value ? styles.selectedOptionText : undefined}>
                        {option.label}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={[styles.formGroup, { marginTop: Spacing.md }]}>
                  <ThemedText style={styles.subLabel}>End Recurrence (Optional)</ThemedText>
                  <TouchableOpacity
                    style={styles.dateTimeButton}
                    onPress={() => setRecurrenceEndPickerVisible(true)}
                    accessibilityLabel="Select recurrence end date"
                  >
                    <ThemedText>
                      {recurrenceEnd ? format(recurrenceEnd, 'MMMM dd, yyyy') : 'No end date'}
                    </ThemedText>
                    <Ionicons name="calendar-outline" size={20} color={Colors.light.primary} />
                  </TouchableOpacity>
                </View>
              </View>
            )}
            {errors.recurrence && (
              <RNText style={styles.errorText}>{errors.recurrence}</RNText>
            )}
          </View>

          <View style={styles.formGroup}>
            <ThemedText style={styles.label}>Reminder</ThemedText>
            <View style={styles.reminderSection}>
              <View style={styles.reminderOptions}>
                {[5, 15, 30, 60, 120, 1440].map((minutes) => (
                  <TouchableOpacity
                    key={minutes}
                    style={[
                      styles.reminderButton, 
                      reminderTime === minutes && styles.selectedReminder
                    ]}
                    onPress={() => setReminderTime(minutes)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: reminderTime === minutes }}
                  >
                    <ThemedText style={reminderTime === minutes ? styles.selectedOptionText : undefined}>
                      {minutes === 1440 ? '1 day' : `${minutes} min`}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
              
              <View style={[styles.formGroup, { marginTop: Spacing.md }]}>
                <ThemedText style={styles.subLabel}>Reminder Type</ThemedText>
                <View style={styles.reminderTypeOptions}>
                  {[
                    { value: 'notification', label: 'App', icon: 'bell' },
                    { value: 'email', label: 'Email', icon: 'envelope' },
                    { value: 'sms', label: 'SMS', icon: 'comment' },
                    { value: 'all', label: 'All', icon: 'check-circle' }
                  ].map(option => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.reminderTypeButton, 
                        reminderType === option.value && styles.selectedReminderType
                      ]}
                      onPress={() => setReminderType(option.value as ReminderType)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: reminderType === option.value }}
                    >
                      <FontAwesome 
                        name={option.icon} 
                        size={16} 
                        color={reminderType === option.value ? '#fff' : Colors.light.text} 
                      />
                      <ThemedText style={[
                        styles.reminderTypeText,
                        reminderType === option.value && styles.selectedOptionText
                      ]}>
                        {option.label}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </View>

          <View style={styles.formGroup}>
            <ThemedText style={styles.label}>Notes (Optional)</ThemedText>
            <TextInput
              placeholder="Add notes about this appointment"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
              style={styles.textArea}
              accessibilityLabel="Appointment notes"
            />
          </View>

          {/* Alternative Time Selection Method */}
          <View style={[styles.formGroup, showManualTimeInput ? { display: 'none' } : {}]}>
            <ThemedText style={styles.subLabel}>Quick Time Selection</ThemedText>
            <View style={styles.quickTimeContainer}>
              {[9, 10, 11, 12, 13, 14, 15, 16].map(hour => (
                <View key={hour} style={styles.hourColumn}>
                  <TouchableOpacity 
                    style={styles.timeButton}
                    onPress={() => handleTimeSlotButtonSelect(hour, 0)}
                  >
                    <ThemedText style={styles.timeButtonText}>
                      {format(new Date().setHours(hour, 0, 0, 0), 'h:mm a')}
                    </ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.timeButton}
                    onPress={() => handleTimeSlotButtonSelect(hour, 30)}
                  >
                    <ThemedText style={styles.timeButtonText}>
                      {format(new Date().setHours(hour, 30, 0, 0), 'h:mm a')}
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>

        <View style={styles.modalFooter}>
          <Button 
            title="Cancel" 
            variant="outline"
            onPress={onClose} 
            style={styles.footerButton}
            disabled={isSubmitting}
          />
          <Button 
            title={isSubmitting ? "Saving..." : (isReschedule ? "Reschedule" : "Schedule")}
            onPress={handleSchedule}
            style={styles.footerButton}
            disabled={isSubmitting}
          />
        </View>
      </Card>
      
      {/* Debug indicator for development */}
      {__DEV__ && (
        <View style={styles.debugIndicator}>
          <RNText style={styles.debugText}>
            Render: {renderCount} | DatePicker: {isDatePickerVisible ? 'Visible' : 'Hidden'} | 
            NativePicker: {showNativeDatePicker ? 'Visible' : 'Hidden'}
          </RNText>
        </View>
      )}
      
      {/* Custom Calendar Modal (fallback) */}
      <Modal
        visible={showCustomCalendar}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCustomCalendar(false)}
      >
        <View style={styles.timeSlotModalContainer}>
          <View style={styles.calendarModalContent}>
            <View style={styles.timeSlotModalHeader}>
              <ThemedText style={styles.timeSlotModalTitle}>Select a Date</ThemedText>
              <TouchableOpacity onPress={() => setShowCustomCalendar(false)}>
                <Ionicons name="close" size={24} color={Colors.light.text} />
              </TouchableOpacity>
            </View>
            
            <Calendar
              current={date.toISOString().split('T')[0]}
              minDate={new Date().toISOString().split('T')[0]}
              onDayPress={handleCustomCalendarSelect}
              markedDates={{
                [date.toISOString().split('T')[0]]: {selected: true, selectedColor: Colors.light.primary}
              }}
              theme={{
                selectedDayBackgroundColor: Colors.light.primary,
                todayTextColor: Colors.light.primary,
                arrowColor: Colors.light.primary,
                textDayFontSize: 16,
                textMonthFontSize: 16,
                textDayHeaderFontSize: 14,
                todayButtonFontSize: 16,
              }}
              enableSwipeMonths={true}
              hideExtraDays={false}
              firstDay={1}
              onPressToday={() => {
                const today = new Date();
                setDate(today);
                setShowCustomCalendar(false);
              }}
              showWeekNumbers={false}
            />
            
            <View style={styles.calendarButtonContainer}>
              <Button
                title="Today"
                variant="outline"
                onPress={() => {
                  const today = new Date();
                  setDate(today);
                  setShowCustomCalendar(false);
                }}
                style={styles.calendarButton}
              />
              <Button
                title="Confirm"
                onPress={() => setShowCustomCalendar(false)}
                style={styles.calendarButton}
              />
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Native date picker for Android */}
      {showNativeDatePicker && Platform.OS === 'android' && (
        <DateTimePicker
          testID="dateTimePicker"
          value={date}
          mode="date"
          display="default" 
          onChange={handleNativeDateChange}
          minimumDate={new Date()}
        />
      )}
      
      {/* Native time picker for Android */}
      {showNativeTimePicker && Platform.OS === 'android' && (
        <DateTimePicker
          testID="timeTimePicker"
          value={time}
          mode="time"
          display="default"
          onChange={handleNativeTimeChange}
        />
      )}
      
      {/* Modal date picker for iOS */}
      {Platform.OS === 'ios' && (
      <DateTimePickerModal
        isVisible={isDatePickerVisible}
        mode="date"
        date={date}
        minimumDate={new Date()}
        onConfirm={handleDateConfirm}
        onCancel={() => setDatePickerVisible(false)}
          display="spinner"
      />
      )}
      
      {/* Modal time picker for iOS */}
      {Platform.OS === 'ios' && (
      <DateTimePickerModal
        isVisible={isTimePickerVisible}
        mode="time"
        date={time}
        onConfirm={handleTimeConfirm}
        onCancel={() => setTimePickerVisible(false)}
          display="spinner"
      />
      )}

      <DateTimePickerModal
        isVisible={recurrenceEndPickerVisible}
        mode="date"
        date={recurrenceEnd || addMonths(date, 3)}
        minimumDate={date}
        onConfirm={handleRecurrenceEndConfirm}
        onCancel={() => setRecurrenceEndPickerVisible(false)}
        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
      />

      {/* Time Slot Selection Modal */}
      <Modal
        visible={isTimeSlotModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setTimeSlotModalVisible(false)}
        presentationStyle="overFullScreen"
      >
        <View style={styles.timeSlotModalContainer}>
          <View style={styles.timeSlotModalContent}>
            <View style={styles.timeSlotModalHeader}>
              <ThemedText style={styles.timeSlotModalTitle}>Select a Time</ThemedText>
              <TouchableOpacity 
                onPress={() => setTimeSlotModalVisible(false)}
                style={styles.closeButton}
                hitSlop={{top: 10, right: 10, bottom: 10, left: 10}}
              >
                <Ionicons name="close" size={24} color={Colors.light.text} />
              </TouchableOpacity>
            </View>
            
            {availableTimeSlots.length > 0 ? (
              <FlatList
                data={availableTimeSlots}
                keyExtractor={(item) => item.toISOString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.timeSlotItem,
                      selectedTimeSlot && selectedTimeSlot.getTime() === item.getTime() && styles.selectedTimeSlot
                    ]}
                    onPress={() => handleTimeSlotSelect(item)}
                    activeOpacity={0.7}
                  >
                    <ThemedText style={
                      selectedTimeSlot && selectedTimeSlot.getTime() === item.getTime() 
                        ? styles.selectedTimeSlotText 
                        : styles.timeSlotText
                    }>
                      {formatTimeSlot(item)}
                    </ThemedText>
                  </TouchableOpacity>
                )}
                numColumns={3}
                contentContainerStyle={styles.timeSlotList}
              />
            ) : (
              <View style={styles.emptyTimeSlots}>
                <ThemedText>No available time slots for this day.</ThemedText>
                <ThemedText>Please select a different date.</ThemedText>
              </View>
            )}
            
            <View style={styles.timeSlotModalFooter}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setTimeSlotModalVisible(false)}
                style={styles.timeSlotFooterButton}
              />
              <Button
                title="Confirm"
                onPress={() => {
                  if (selectedTimeSlot) {
                    setTime(selectedTimeSlot);
                    setTimeSlotModalVisible(false);
                  } else {
                    Alert.alert('Please select a time');
                  }
                }}
                style={styles.timeSlotFooterButton}
                disabled={!selectedTimeSlot}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 1000,
  },
  modalView: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 10,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    padding: Spacing.md,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalBody: {
    padding: Spacing.md,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  formGroup: {
    marginBottom: Spacing.md,
  },
  formRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  formHalf: {
    width: '48%',
  },
  label: {
    marginBottom: Spacing.xs,
    fontSize: 14,
    fontWeight: '500',
  },
  dateTimeButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    backgroundColor: Colors.light.background,
  },
  inputError: {
    borderColor: Colors.light.error,
  },
  errorText: {
    color: Colors.light.error,
    fontSize: 12,
    marginTop: 4,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  footerButton: {
    flex: 1,
    marginHorizontal: Spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    padding: Spacing.sm,
    backgroundColor: Colors.light.background,
    marginBottom: Spacing.xs,
  },
  switchInputButton: {
    padding: Spacing.xs,
    alignItems: 'center',
  },
  switchInputText: {
    color: Colors.light.primary,
    fontSize: 12,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  checkboxLabel: {
    marginLeft: Spacing.sm,
  },
  recurringOptions: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 8,
    padding: Spacing.sm,
  },
  subLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: Spacing.xs,
  },
  recurrenceOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  recurrenceButton: {
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    width: '48%',
    marginBottom: Spacing.sm,
    alignItems: 'center',
  },
  selectedRecurrence: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  selectedOptionText: {
    color: '#fff',
  },
  reminderSection: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 8,
    padding: Spacing.sm,
  },
  reminderOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  reminderButton: {
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    width: '31%',
    marginBottom: Spacing.sm,
    alignItems: 'center',
  },
  selectedReminder: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  reminderTypeOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  reminderTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    width: '23%',
    justifyContent: 'center',
  },
  reminderTypeText: {
    marginLeft: 4,
    fontSize: 12,
  },
  selectedReminderType: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  colorPicker: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  selectedColorOption: {
    borderWidth: 3,
    borderColor: Colors.light.background,
    transform: [{ scale: 1.1 }],
  },
  timeSlotModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  timeSlotModalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: Colors.light.background,
    borderRadius: 10,
    padding: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    maxWidth: 500, // Cap the width on larger screens
  },
  timeSlotModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    paddingBottom: Spacing.sm,
  },
  timeSlotModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  timeSlotList: {
    paddingVertical: Spacing.sm,
  },
  timeSlotItem: {
    flex: 1,
    margin: 5,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    alignItems: 'center',
  },
  selectedTimeSlot: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  timeSlotText: {
    fontSize: 14,
  },
  selectedTimeSlotText: {
    color: '#fff',
    fontSize: 14,
  },
  timeSlotConfirmButton: {
    marginTop: Spacing.md,
  },
  emptyTimeSlots: {
    padding: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    height: 150,
  },
  timeSlotModalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    paddingTop: Spacing.md,
  },
  timeSlotFooterButton: {
    flex: 1,
    marginHorizontal: Spacing.xs,
  },
  debugIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 4,
    zIndex: 9999,
  },
  debugText: {
    color: 'white',
    fontSize: 10,
  },
  calendarModalContent: {
    width: '90%',
    backgroundColor: Colors.light.background,
    borderRadius: 10,
    padding: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  calendarButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
  },
  calendarButton: {
    flex: 1,
    marginHorizontal: Spacing.xs,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  quickTimeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginVertical: Spacing.sm,
  },
  hourColumn: {
    width: '24%', // 4 columns 
    marginBottom: Spacing.sm,
  },
  timeButton: {
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 6,
    padding: Spacing.xs,
    marginVertical: 4,
    alignItems: 'center',
  },
  timeButtonText: {
    fontSize: 12,
  },
});

export default AppointmentScheduler; 