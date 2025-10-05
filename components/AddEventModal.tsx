import React, { useState, useEffect } from 'react';
import { 
  Modal, 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Switch,
  Text,
  FlatList
} from 'react-native';
import { ThemedText } from './ThemedText';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './Button';
import Colors from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { format, parse, isValid, addMonths, isToday, isBefore, setHours, setMinutes } from 'date-fns';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Card } from './Card';
import { addEvent } from '../services/firestoreService';
import { useAuth } from '../contexts/AuthContext';

// User interface for Firebase auth
interface User {
  uid: string;
  email: string;
  // Add other user properties as needed
}

// Debug logging utility
const logEvent = (eventName: string, data?: any) => {
  console.log(`[AddEventModal] ${eventName}:`, data || '');
};

// Debug date function similar to AppointmentScheduler
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

export interface Event {
  id?: string;
  title: string;
  description: string;
  date: string; // ISO date string
  time: string | null;
  location: string;
  isAllDay: boolean;
  isRecurring: boolean;
  recurrencePattern?: string | null;
  recurrenceEnd?: string | null;
  category: 'personal' | 'work' | 'social' | 'health' | 'other';
  color?: string;
  attachments?: string[];
  reminders?: any[];
  reminderTime?: number;
  reminderType?: string;
  status: 'upcoming' | 'completed' | 'cancelled';
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
  timeZone?: string;
}

interface AddEventModalProps {
  visible: boolean;
  onClose: () => void;
  onAddEvent: (event: Event) => void;
  initialDate?: string;
}

export default function AddEventModal({ visible, onClose, onAddEvent, initialDate }: AddEventModalProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme || 'light'];
  const { currentUser } = useAuth();
  const typedUser = currentUser as User | null;
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState<Date>(initialDate ? new Date(initialDate) : new Date());
  const [time, setTime] = useState<Date>(new Date());
  const [location, setLocation] = useState('');
  const [isAllDay, setIsAllDay] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrencePattern, setRecurrencePattern] = useState<string | null>(null);
  const [recurrenceEnd, setRecurrenceEnd] = useState<Date | null>(null);
  const [category, setCategory] = useState<'personal' | 'work' | 'social' | 'health' | 'other'>('personal');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showRecurrenceEndPicker, setShowRecurrenceEndPicker] = useState(false);
  const [reminderTime, setReminderTime] = useState(30); // Default 30 minutes before
  const [reminderType, setReminderType] = useState('notification');
  const [errors, setErrors] = useState<{
    title?: string;
    date?: string;
    time?: string;
    location?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeZone, setTimeZone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [timeSlots, setTimeSlots] = useState<Date[]>([]);
  const [isTimeSlotModalVisible, setTimeSlotModalVisible] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<Date | null>(null);
  const [showNativeTimePicker, setShowNativeTimePicker] = useState(false);

  // Initialize date from the calendar selection
  useEffect(() => {
    if (initialDate) {
      // Parse the initialDate (YYYY-MM-DD) format
      try {
        const dateParts = initialDate.split('-');
        if (dateParts.length === 3) {
          const year = parseInt(dateParts[0]);
          const month = parseInt(dateParts[1]) - 1; // JS months are 0-based
          const day = parseInt(dateParts[2]);
          const newDate = new Date(year, month, day, 12, 0, 0);
          
          if (isValid(newDate)) {
            setDate(newDate);
            logEvent('Date initialized from calendar selection', initialDate);
            debugDate('Initial date set', newDate);
          }
        }
      } catch (error) {
        console.error('Error parsing initialDate:', error);
      }
    }
  }, [initialDate, visible]);

  // Generate time slots when date changes
  useEffect(() => {
    if (date) {
      const slots = generateTimeSlots(date);
      setTimeSlots(slots);
      
      // Set a default time slot if none is selected or if the current selection is invalid
      if (!selectedTimeSlot || !isValid(selectedTimeSlot)) {
        setSelectedTimeSlot(slots.length > 0 ? slots[0] : null);
        if (slots.length > 0) {
          setTime(slots[0]);
        }
      }
    }
  }, [date]);

  // Log when date changes to debug any timezone issues
  useEffect(() => {
    if (date) {
      debugDate('Event date changed', date, format(date, 'yyyy-MM-dd'));
    }
  }, [date]);

  // Handle the modal becoming visible
  useEffect(() => {
    if (visible) {
      // Refresh time slots when modal opens
      const slots = generateTimeSlots(date);
      setTimeSlots(slots);
    }
  }, [visible]);

  // Add a utility function to generate time slots for the current day
  const generateTimeSlots = (selectedDate: Date): Date[] => {
    const slots: Date[] = [];
    const now = new Date();
    
    // Set start and end times for the day
    let startHour = 9; // Default 9 AM
    let endHour = 17; // Default 5 PM
    
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
        if (isToday(selectedDate) && hour === startHour && minute < now.getMinutes() && now.getMinutes() > 30) {
          continue; // Skip past times for today
        }
        
        const slotTime = new Date(selectedDate);
        slotTime.setHours(hour, minute, 0, 0);
        slots.push(slotTime);
      }
    }
    
    return slots;
  };

  const handleConfirmDate = (selectedDate: Date) => {
    setShowDatePicker(false);
    setDate(selectedDate);
  };

  const handleTimeConfirm = (selectedTime: Date) => {
    setShowTimePicker(false);
    setShowNativeTimePicker(false);
    if (selectedTime) {
      setTime(selectedTime);
      setSelectedTimeSlot(selectedTime);
    }
  };

  const handleNativeTimeChange = (event, selectedTime) => {
    setShowNativeTimePicker(false);
    if (selectedTime) {
      setTime(selectedTime);
      setSelectedTimeSlot(selectedTime);
    }
  };

  const handleRecurrenceEndConfirm = (selectedDate: Date) => {
    setShowRecurrenceEndPicker(false);
    setRecurrenceEnd(selectedDate);
  };

  // Add a new function to handle manual time selection with preset buttons
  const handleTimeSlotButtonSelect = (hour: number, minute: number) => {
    const newTime = new Date(date);
    newTime.setHours(hour, minute, 0, 0);
    setTime(newTime);
    setSelectedTimeSlot(newTime);
    
    // Format for display
    const formattedTime = format(newTime, 'h:mm a');
    console.log('Selected time manually:', formattedTime);
  };

  // Handle time slot selection from the list
  const handleTimeSlotSelect = (slot: Date) => {
    setSelectedTimeSlot(slot);
    setTime(slot);
    setTimeSlotModalVisible(false);
  };

  const validateForm = () => {
    const newErrors: any = {};
    
    // Check required text fields
    if (!title.trim()) newErrors.title = 'Event title is required';
    if (!location.trim()) newErrors.location = 'Location is required';
    
    // Date validation - more thorough
    if (!date) {
      newErrors.date = 'Date is required';
    } else if (!isValid(date)) {
      newErrors.date = 'Valid date is required';
    } else if (isBefore(date, new Date()) && !isToday(date)) {
      newErrors.date = 'Date cannot be in the past';
    }
    
    // Time validation - only if not all day
    if (!isAllDay) {
      if (!time) {
        newErrors.time = 'Time is required';
      } else if (!isValid(time)) {
        newErrors.time = 'Valid time is required';
      }
    }
    
    // Recurrence validation
    if (isRecurring && !recurrencePattern) {
      newErrors.recurrence = 'Please select a recurrence pattern';
    }
    
    return newErrors;
  };

  const openTimePicker = () => {
    logEvent('Opening time picker', Platform.OS);
    
    if (Platform.OS === 'android') {
      logEvent('Using Android native time picker');
      setShowNativeTimePicker(true);
    } else {
      logEvent('Using time slot modal');
      setTimeSlotModalVisible(true);
    }
  };

  const handleAddEvent = async () => {
    logEvent('Add event button pressed');
    
    // Debug all form values before submission
    debugDate('Submit - Date value', date);
    console.log('Submit form values:', {
      title,
      description,
      location,
      date: format(date, 'yyyy-MM-dd'),
      time: isAllDay ? null : format(time, 'HH:mm'),
      isAllDay,
      isRecurring,
      recurrencePattern
    });
    
    // Prevent double submission
    if (isSubmitting) {
      logEvent('Preventing double submission');
      return;
    }
    
    const newErrors = validateForm();
    
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
      if (!typedUser) {
        console.error('User not authenticated');
        Alert.alert('Error', 'You must be logged in to add an event');
        return;
      }

      // Ensure the date is correctly formatted, without timezone conversion issues
      // Get the date components directly to avoid timezone shifts
      const year = date.getFullYear();
      const month = date.getMonth() + 1; // getMonth() is 0-indexed
      const day = date.getDate();
      
      // Format the date manually to ensure the exact date the user selected
      const formattedDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      
      logEvent('Formatted date for event (manual format)', formattedDate);
      
      // Format time only if not all day event
      const formattedTime = isAllDay ? null : format(time, 'HH:mm');
      
      // Create the event data object with all required fields
      // Ensure no undefined values which Firestore rejects
      const eventData: Event = {
        title: title.trim() || "",
        description: description.trim() || "",
        date: formattedDate,
        time: formattedTime,
        location: location.trim() || "",
        isAllDay,
        isRecurring,
        status: 'upcoming',
        isCompleted: false,
        category,
        color: getCategoryColor(category),
        attachments: [],
        reminders: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        reminderTime: reminderTime || 30,
        reminderType: reminderType || 'notification',
        timeZone: timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        // Always initialize these to avoid undefined values
        recurrencePattern: null,
        recurrenceEnd: null
      };
      
      // Only set recurrence fields if event is recurring
      if (isRecurring && recurrencePattern) {
        eventData.recurrencePattern = recurrencePattern;
        
        // Format recurrenceEnd if it exists, otherwise leave as null
        if (recurrenceEnd) {
          const recEndYear = recurrenceEnd.getFullYear();
          const recEndMonth = recurrenceEnd.getMonth() + 1;
          const recEndDay = recurrenceEnd.getDate();
          eventData.recurrenceEnd = `${recEndYear}-${recEndMonth.toString().padStart(2, '0')}-${recEndDay.toString().padStart(2, '0')}`;
        }
      }
      
      logEvent('Final event data to save:', eventData);
      console.log('FINAL EVENT DATA:', JSON.stringify(eventData));
      
      // Display a saving indicator to the user
      Alert.alert(
        'Saving',
        'Saving your event...',
        [],
        { cancelable: false }
      );
      
      // Add event to Firestore
      const newEvent = await addEvent(typedUser.uid, eventData);
      logEvent('Event added successfully', newEvent);
      
      // Reset form and close modal
      resetForm();
      
      // Only pass back the new event ID to avoid duplication through listener
      if (newEvent && newEvent.id) {
        onAddEvent({ ...eventData, id: newEvent.id });
      }
      
      // Success alert
      Alert.alert(
        'Success',
        'Event added successfully',
        [{ text: 'OK', onPress: onClose }]
      );
    } catch (error) {
      console.error('Error adding event:', error);
      Alert.alert('Error', 'Failed to add event. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDate(new Date());
    setTime(new Date());
    setLocation('');
    setIsAllDay(false);
    setIsRecurring(false);
    setRecurrencePattern(null);
    setRecurrenceEnd(null);
    setCategory('personal');
    setErrors({});
    setSelectedTimeSlot(null);
  };

  const getCategoryColor = (cat: string) => {
    const categoryColors = {
      personal: '#FF9500',
      work: '#007AFF',
      social: '#FF2D55',
      health: '#4CD964',
      other: '#8E8E93'
    };
    return categoryColors[cat] || categoryColors.other;
  };

  const recurrenceOptions = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'biweekly', label: 'Bi-weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
    { value: 'yearly', label: 'Yearly' }
  ];

  // Render time slot item for the time picker modal
  const renderTimeSlot = ({ item }: { item: Date }) => {
    const isSelected = selectedTimeSlot && 
                      selectedTimeSlot.getHours() === item.getHours() && 
                      selectedTimeSlot.getMinutes() === item.getMinutes();
    return (
      <TouchableOpacity
        style={[
          styles.timeSlotItem,
          isSelected && { backgroundColor: colors.primary, borderColor: colors.primary }
        ]}
        onPress={() => handleTimeSlotSelect(item)}
      >
        <Text style={[
          styles.timeSlotText,
          isSelected && { color: 'white' }
        ]}>
          {format(item, 'h:mm a')}
        </Text>
      </TouchableOpacity>
    );
  };

  // Render time slot buttons for quick selection
  const renderTimeSlotButtons = () => {
    // Generate hours for quick selection
    const hours = [];
    for (let i = 9; i <= 17; i++) {
      hours.push(i);
    }

    return (
      <View style={styles.timeSlotButtonsContainer}>
        <ThemedText style={styles.timeSelectionHeader}>Select a Time</ThemedText>
        <ScrollView style={styles.timeSlotButtonsScroll}>
          <View style={styles.timeButtonsGrid}>
            {hours.map(hour => (
              <View key={`hour-${hour}`} style={styles.timeButtonRow}>
                <TouchableOpacity
                  style={[
                    styles.timeButton,
                    time && time.getHours() === hour && time.getMinutes() === 0 && styles.selectedTimeButton
                  ]}
                  onPress={() => handleTimeSlotButtonSelect(hour, 0)}
                >
                  <Text style={[
                    styles.timeButtonText,
                    time && time.getHours() === hour && time.getMinutes() === 0 && styles.selectedTimeButtonText
                  ]}>
                    {format(setHours(setMinutes(new Date(), 0), hour), 'h:mm a')}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.timeButton,
                    time && time.getHours() === hour && time.getMinutes() === 30 && styles.selectedTimeButton
                  ]}
                  onPress={() => handleTimeSlotButtonSelect(hour, 30)}
                >
                  <Text style={[
                    styles.timeButtonText,
                    time && time.getHours() === hour && time.getMinutes() === 30 && styles.selectedTimeButtonText
                  ]}>
                    {format(setHours(setMinutes(new Date(), 30), hour), 'h:mm a')}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add New Event</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="black" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalBody}>
            <Text style={styles.inputLabel}>Title*</Text>
            <TextInput
              style={[styles.input, errors.title && styles.inputError]}
              value={title}
              onChangeText={setTitle}
              placeholder="Enter event title"
            />
            {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
            
            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Enter event description"
              multiline={true}
              numberOfLines={3}
            />
            
            <Text style={styles.inputLabel}>Date*</Text>
            <TouchableOpacity 
              style={[styles.dateTimePicker, errors.date && styles.inputError]}
              onPress={() => {
                console.log('Opening date picker');
                setShowDatePicker(true);
              }}
            >
              <Text>{format(date, 'MMMM dd, yyyy')}</Text>
              <Ionicons name="calendar" size={24} color={Colors.light.tint} />
            </TouchableOpacity>
            {errors.date && <Text style={styles.errorText}>{errors.date}</Text>}
            
            <View style={styles.switchContainer}>
              <Text style={styles.switchLabel}>All Day Event</Text>
              <Switch
                value={isAllDay}
                onValueChange={setIsAllDay}
                trackColor={{ false: '#767577', true: Colors.light.primary }}
                thumbColor={isAllDay ? '#f4f3f4' : '#f4f3f4'}
              />
            </View>
            
            {!isAllDay && (
              <>
                <Text style={styles.inputLabel}>Time*</Text>
                <TouchableOpacity 
                  style={[styles.dateTimePicker, errors.time && styles.inputError]} 
                  onPress={openTimePicker}
                >
                  <Text>{format(time, 'h:mm a')}</Text>
                  <Ionicons name="time" size={24} color={Colors.light.tint} />
                </TouchableOpacity>
                {errors.time && <Text style={styles.errorText}>{errors.time}</Text>}

                {/* Quick time selection buttons */}
                {renderTimeSlotButtons()}
              </>
            )}
            
            <Text style={styles.inputLabel}>Location*</Text>
            <TextInput
              style={[styles.input, errors.location && styles.inputError]}
              value={location}
              onChangeText={setLocation}
              placeholder="Enter location"
            />
            {errors.location && <Text style={styles.errorText}>{errors.location}</Text>}
            
            <View style={styles.switchContainer}>
              <Text style={styles.switchLabel}>Recurring Event</Text>
              <Switch
                value={isRecurring}
                onValueChange={setIsRecurring}
                trackColor={{ false: '#767577', true: Colors.light.primary }}
                thumbColor={isRecurring ? '#f4f3f4' : '#f4f3f4'}
              />
            </View>
            
            {isRecurring && (
              <>
                <Text style={styles.inputLabel}>Recurrence Pattern</Text>
                <View style={styles.recurrenceContainer}>
                  {recurrenceOptions.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.recurrenceButton,
                        recurrencePattern === option.value && styles.selectedRecurrence
                      ]}
                      onPress={() => setRecurrencePattern(option.value)}
                    >
                      <Text style={recurrencePattern === option.value ? styles.selectedOptionText : styles.recurrenceButtonText}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                
                <Text style={styles.inputLabel}>End Recurrence (Optional)</Text>
                <TouchableOpacity 
                  style={styles.dateTimePicker}
                  onPress={() => setShowRecurrenceEndPicker(true)}
                >
                  <Text>{recurrenceEnd ? format(recurrenceEnd, 'MMMM dd, yyyy') : 'No end date'}</Text>
                  <Ionicons name="calendar" size={24} color={Colors.light.tint} />
                </TouchableOpacity>
              </>
            )}
            
            <Text style={styles.inputLabel}>Category</Text>
            <View style={styles.categoryContainer}>
              {['personal', 'work', 'social', 'health', 'other'].map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.categoryButton,
                    { backgroundColor: getCategoryColor(option) },
                    category === option && styles.selectedCategory
                  ]}
                  onPress={() => setCategory(option as any)}
                >
                  <Text style={styles.categoryText}>{option}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          
          <View style={styles.modalFooter}>
            <Button 
              title="Cancel" 
              variant="outline"
              onPress={onClose} 
              style={styles.footerButton}
            />
            <Button 
              title={isSubmitting ? "Saving..." : "Add Event"}
              onPress={handleAddEvent}
              style={styles.footerButton}
              disabled={isSubmitting}
            />
          </View>
        </View>
      </View>
      
      {/* Time slot modal for selecting time */}
      <Modal
        visible={isTimeSlotModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setTimeSlotModalVisible(false)}
      >
        <View style={styles.timeSlotModalContainer}>
          <View style={styles.timeSlotModalContent}>
            <View style={styles.timeSlotModalHeader}>
              <Text style={styles.timeSlotModalTitle}>Select Time</Text>
              <TouchableOpacity onPress={() => setTimeSlotModalVisible(false)}>
                <Ionicons name="close" size={24} color="black" />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={timeSlots}
              renderItem={renderTimeSlot}
              keyExtractor={(item) => item.toISOString()}
              style={styles.timeSlotList}
              contentContainerStyle={styles.timeSlotListContent}
            />
          </View>
        </View>
      </Modal>
      
      <DateTimePickerModal
        isVisible={showDatePicker}
        mode="date"
        onConfirm={handleConfirmDate}
        onCancel={() => setShowDatePicker(false)}
        date={date}
        minimumDate={new Date()}
      />
      
      <DateTimePickerModal
        isVisible={showTimePicker}
        mode="time"
        onConfirm={handleTimeConfirm}
        onCancel={() => setShowTimePicker(false)}
        date={time}
      />
      
      <DateTimePickerModal
        isVisible={showRecurrenceEndPicker}
        mode="date"
        onConfirm={handleRecurrenceEndConfirm}
        onCancel={() => setShowRecurrenceEndPicker(false)}
        date={recurrenceEnd || addMonths(date, 3)}
        minimumDate={date}
      />

      {Platform.OS === 'android' && showNativeTimePicker && (
        <DateTimePickerModal
          isVisible={showNativeTimePicker}
          mode="time"
          onConfirm={handleTimeConfirm}
          onCancel={() => setShowNativeTimePicker(false)}
          date={time}
        />
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    width: '90%',
    maxHeight: '90%',
    backgroundColor: 'white',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 5,
  },
  modalBody: {
    padding: 15,
    maxHeight: 500,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  inputLabel: {
    fontSize: 16,
    marginBottom: 5,
    marginTop: 10,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
  },
  inputError: {
    borderColor: Colors.light.error || 'red',
  },
  errorText: {
    color: Colors.light.error || 'red',
    fontSize: 12,
    marginTop: -8,
    marginBottom: 8,
  },
  dateTimePicker: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 10,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginVertical: 10,
  },
  categoryButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    margin: 5,
    minWidth: '28%',
    alignItems: 'center',
  },
  selectedCategory: {
    transform: [{ scale: 1.1 }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  categoryText: {
    color: 'white',
    fontWeight: '500',
  },
  footerButton: {
    flex: 1,
    marginHorizontal: 5,
  },
  recurrenceContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  recurrenceButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
    margin: 5,
    minWidth: '45%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selectedRecurrence: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  recurrenceButtonText: {
    color: '#333',
  },
  selectedOptionText: {
    color: 'white',
    fontWeight: '500',
  },
  timeSlotModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  timeSlotModalContent: {
    width: '80%',
    maxHeight: '60%',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  timeSlotModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  timeSlotModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  timeSlotList: {
    flexGrow: 0,
  },
  timeSlotListContent: {
    paddingVertical: 10,
  },
  timeSlotItem: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  timeSlotText: {
    fontSize: 16,
  },
  timeSlotButtonsContainer: {
    marginVertical: 5,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  timeSelectionHeader: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 10,
  },
  timeSlotButtonsScroll: {
    maxHeight: 200,
  },
  timeButtonsGrid: {
    marginBottom: 10,
  },
  timeButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  timeButton: {
    flex: 1,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  selectedTimeButton: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  timeButtonText: {
    fontSize: 14,
  },
  selectedTimeButtonText: {
    color: 'white',
  },
}); 