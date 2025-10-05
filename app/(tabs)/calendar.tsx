import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { Calendar as RNCalendar, DateData } from 'react-native-calendars';
import { format, parseISO } from 'date-fns';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../../components/Card';
import { useColorScheme } from '@/hooks/useColorScheme';
import Colors from '@/constants/Colors';
import { Spacing, Layout } from '@/constants/Spacing';
import Typography from '@/constants/Typography';
import { ThemedText } from '../../components/ThemedText';
import { Button } from '../../components/Button';
import { useAuth } from '../../contexts/AuthContext';
import { 
  listenToEvents, 
  listenToAppointments,
  addEvent,
  updateEvent,
  deleteEvent,
  updateAppointment
} from '../../services/firestoreService';
import AddEventModal from '../../components/AddEventModal';
import { Event } from '../../components/AddEventModal';

// Define event styles based on category
const EVENT_COLORS = {
  personal: Colors.light.primary,
  work: '#FF9500',
  family: '#FF3B30',
  health: Colors.light.wellness,
  other: '#8E8E93',
  appointment: Colors.light.appointment
};

// Define Appointment type to match Event fields format
interface Appointment {
  id: string;
  doctorName: string;
  specialty: string;
  date: string;
  time: string;
  location: string;
  status: string;
  isRecurring?: boolean;
  recurrencePattern?: string | null;
  recurrenceEnd?: string | null;
  color?: string;
}

// Add a clearer default export for Expo Router, ensuring it's properly detected
export default function CalendarScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme || 'light'];
  const { currentUser } = useAuth();
  
  const [selected, setSelected] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [markedDates, setMarkedDates] = useState({});
  const [events, setEvents] = useState<Event[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addEventModalVisible, setAddEventModalVisible] = useState(false);
  const [selectedDateEvents, setSelectedDateEvents] = useState<(Event | Appointment)[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Handle date selection with improved visual feedback
  const onDayPress = (day: DateData) => {
    console.log("Selected date from calendar:", day.dateString);
    
    // Ensure date is in YYYY-MM-DD format
    const formattedDate = day.dateString;
    
    // If already selected, show animation or visual feedback
    if (selected === formattedDate) {
      // Show feedback by briefly updating UI
      const tempMarked = { ...markedDates };
      if (tempMarked[formattedDate]) {
        tempMarked[formattedDate] = {
          ...tempMarked[formattedDate],
          selected: true,
          selectedColor: colors.accent || '#4CD964', // Use different color for feedback
        };
      } else {
        tempMarked[formattedDate] = {
          selected: true,
          selectedColor: colors.accent || '#4CD964',
        };
      }
      
      // Apply the temporary highlight
      setMarkedDates(tempMarked);
      
      // Then reset after a short delay
      setTimeout(() => {
        updateMarkedDates(events, appointments);
      }, 300);
    }
    
    // Update the selected date
    setSelected(formattedDate);
    updateSelectedDateEvents(formattedDate);
  };
  
  // Update selected date events when date changes
  const updateSelectedDateEvents = (date: string) => {
    console.log("Updating events for date:", date);
    
    const dateEvents = events.filter(event => {
      console.log(`Comparing event date ${event.date} with selected date ${date}`);
      return event.date === date;
    });
    
    const dateAppointments = appointments.filter(apt => {
      console.log(`Comparing appointment date ${apt.date} with selected date ${date}`);
      return apt.date === date;
    });
    
    // Combine and sort by time
    const combinedEvents = [
      ...dateEvents, 
      ...dateAppointments.map(apt => ({
        ...apt,
        title: `Dr. ${apt.doctorName} (${apt.specialty})`,
        category: 'appointment',
        time: apt.time,
        location: apt.location,
        isAppointment: true
      }))
    ].sort((a, b) => {
      // All day events first, then sort by time
      if (a.isAllDay) return -1;
      if (b.isAllDay) return 1;
      return a.time.localeCompare(b.time);
    });
    
    console.log(`Found ${dateEvents.length} events and ${dateAppointments.length} appointments for ${date}`);
    setSelectedDateEvents(combinedEvents);
  };
  
  // Load events and appointments from Firestore
  useEffect(() => {
    if (!currentUser) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const unsubscribeEvents = listenToEvents(currentUser.uid, (eventsList) => {
        setEvents(eventsList);
        updateMarkedDates(eventsList, appointments);
      });
      
      const unsubscribeAppointments = listenToAppointments(currentUser.uid, (appointmentsList) => {
        // Only get active appointments
        const activeAppointments = appointmentsList.filter(apt => apt.status !== 'cancelled');
        setAppointments(activeAppointments);
        updateMarkedDates(events, activeAppointments);
      });
      
      // Update selected date events when component mounts
      updateSelectedDateEvents(selected);
      
      setLoading(false);
      
      return () => {
        unsubscribeEvents();
        unsubscribeAppointments();
      };
    } catch (err) {
      console.error('Error loading calendar data:', err);
      setError('Failed to load calendar data');
      setLoading(false);
    }
  }, [currentUser]);
  
  // Update selected date events when events or appointments change
  useEffect(() => {
    updateSelectedDateEvents(selected);
  }, [events, appointments, selected]);
  
  // Update marked dates for the calendar
  const updateMarkedDates = (eventsList: Event[], appointmentsList: Appointment[]) => {
    const marked = {};
    const formatDateString = (dateStr: string) => {
      // Ensure consistent date format (YYYY-MM-DD)
      try {
        if (!dateStr) return '';
        // If already in correct format, return as is
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
        
        // Parse and format the date
        const date = new Date(dateStr);
        return format(date, 'yyyy-MM-dd');
      } catch (error) {
        console.error("Error formatting date:", error, dateStr);
        return dateStr;
      }
    };
    
    // Mark event dates
    eventsList.forEach(event => {
      if (event.status !== 'cancelled') {
        const formattedDate = formatDateString(event.date);
        const color = event.color || EVENT_COLORS[event.category || 'other'] || Colors.light.primary;
        
        if (marked[formattedDate]) {
          // If date already has dots, add another one
          marked[formattedDate].dots.push({
            key: event.id,
            color: color,
          });
        } else {
          // First dot for this date
          marked[formattedDate] = {
            dots: [{
              key: event.id,
              color: color,
            }],
          };
        }
      }
    });
    
    // Mark appointment dates
    appointmentsList.forEach(appointment => {
      const formattedDate = formatDateString(appointment.date);
      const color = Colors.light.appointment;
      
      if (marked[formattedDate]) {
        // If date already has dots, add another one
        marked[formattedDate].dots.push({
          key: appointment.id,
          color: color,
        });
      } else {
        // First dot for this date
        marked[formattedDate] = {
          dots: [{
            key: appointment.id,
            color: color,
          }],
        };
      }
    });
    
    // Mark selected date with a more prominent indicator
    if (marked[selected]) {
      marked[selected] = {
        ...marked[selected],
        selected: true,
        selectedColor: colors.primary + '80', // More opacity for better visibility
        selectedTextColor: '#ffffff',
      };
    } else {
      marked[selected] = {
        selected: true,
        selectedColor: colors.primary + '80', // More opacity for better visibility
        selectedTextColor: '#ffffff',
        dots: [] // Include an empty array so it's compatible with multi-dot marking
      };
    }
    
    setMarkedDates(marked);
  };
  
  // Handle adding a new event, properly handling the event ID to prevent duplicates
  const handleAddEvent = async (eventData: Event) => {
    console.log('Adding event with data:', eventData);
    if (!currentUser) {
      Alert.alert('Error', 'You must be logged in to add events');
      return;
    }
    
    try {
      // If the event already has an ID, it was already added to Firestore by the modal
      // We don't need to add it again, just close the modal and wait for the listener to update
      if (eventData.id) {
        console.log('Event already added with ID:', eventData.id);
        setAddEventModalVisible(false);
        return;
      }
      
      // Otherwise, add the event to Firestore
      const result = await addEvent(currentUser.uid, eventData);
      console.log('Event added successfully with ID:', result.id);
      Alert.alert('Success', 'Event added successfully');
      setAddEventModalVisible(false);
    } catch (error) {
      console.error('Error adding event:', error);
      Alert.alert('Error', 'Failed to add event. Please try again.');
    }
  };
  
  // Add a function to show the add event modal with the selected date
  const showAddEventModal = () => {
    console.log('Opening add event modal with date:', selected);
    setAddEventModalVisible(true);
  };
  
  // Handle marking an event as completed
  const handleMarkAsCompleted = async (item: any) => {
    if (!currentUser) return;
    
    try {
      if (item.isAppointment) {
        // It's an appointment
        await updateAppointment(currentUser.uid, item.id, {
          status: 'past',
          updatedAt: new Date().toISOString()
        });
      } else {
        // It's an event
        await updateEvent(currentUser.uid, item.id, {
          status: 'completed',
          isCompleted: true,
          updatedAt: new Date().toISOString()
        });
      }
      
      Alert.alert('Success', 'Event marked as completed');
    } catch (error) {
      console.error('Error marking event as completed:', error);
      Alert.alert('Error', 'Failed to update event status. Please try again.');
    }
  };
  
  // Handle deleting an event
  const handleDeleteEvent = async (eventId: string) => {
    try {
      setIsLoading(true);
      console.log('Deleting event with ID:', eventId);
      
      if (!currentUser || !currentUser.uid) {
        Alert.alert('Error', 'You must be logged in to delete events');
        setIsLoading(false);
        return;
      }
      
      await deleteEvent(currentUser.uid, eventId);
      console.log('Event successfully deleted');
      
      // Remove the event from the events array
      setEvents(prev => prev.filter(event => event.id !== eventId));
      Alert.alert('Success', 'Event deleted successfully');
    } catch (error) {
      console.error('Error deleting event:', error);
      Alert.alert('Error', 'An unexpected error occurred while deleting the event');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Update the function for handling recurring events display
  const isRecurringEvent = (item: Event | Appointment) => {
    return item.isRecurring && item.recurrencePattern;
  };
  
  // Render event card with recurrence info
  const renderEventCard = (item: any, index: number) => {
    const isAppointment = item.isAppointment;
    const isCompleted = item.status === 'completed' || item.isCompleted;
    const categoryColor = isAppointment 
      ? Colors.light.appointment 
      : item.color || EVENT_COLORS[item.category || 'other'];
    
    const recurrenceText = item.isRecurring && item.recurrencePattern
      ? `Repeats ${item.recurrencePattern}${item.recurrenceEnd ? ' until ' + format(new Date(item.recurrenceEnd), 'MMM d, yyyy') : ''}`
      : '';
    
    return (
      <Card 
        key={item.id || index} 
        style={[
          styles.eventCard, 
          { borderLeftColor: categoryColor, borderLeftWidth: 4 },
          isCompleted && styles.completedEvent
        ]}
      >
        <View style={styles.eventHeader}>
          <View style={styles.eventHeaderLeft}>
            <ThemedText style={[
              styles.eventTitle, 
              isCompleted && styles.completedText
            ]}>
              {item.title || (isAppointment ? `Dr. ${item.doctorName}` : 'Untitled Event')}
            </ThemedText>
            
            <View style={styles.eventMeta}>
              {item.time && (
                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={14} color={isCompleted ? colors.textLight : colors.text} />
                  <ThemedText style={[styles.metaText, isCompleted && styles.completedText]}>
                    {item.isAllDay ? 'All day' : item.time}
                  </ThemedText>
                </View>
              )}
              
              {item.location && (
                <View style={styles.metaItem}>
                  <Ionicons name="location-outline" size={14} color={isCompleted ? colors.textLight : colors.text} />
                  <ThemedText style={[styles.metaText, isCompleted && styles.completedText]}>
                    {item.location}
                  </ThemedText>
                </View>
              )}
              
              {isRecurringEvent(item) && (
                <View style={styles.metaItem}>
                  <Ionicons name="repeat" size={14} color={isCompleted ? colors.textLight : colors.text} />
                  <ThemedText style={[styles.metaText, isCompleted && styles.completedText]}>
                    {recurrenceText}
                  </ThemedText>
                </View>
              )}
            </View>
          </View>
  
          <View style={styles.eventActions}>
            {!isCompleted && (
              <TouchableOpacity
                style={styles.eventAction}
                onPress={() => handleMarkAsCompleted(item)}
                accessibilityLabel="Mark as completed"
              >
                <Ionicons name="checkmark-circle-outline" size={20} color={colors.success} />
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={styles.eventAction}
              onPress={() => {
                console.log('Delete button pressed for item:', item);
                if (item && item.id) {
                  // Make sure we're only deleting non-appointment items
                  if (!isAppointment) {
                    console.log('Calling handleDeleteEvent with ID:', item.id);
                    handleDeleteEvent(item.id);
                  } else {
                    Alert.alert('Cannot Delete', 'Appointments cannot be deleted from this screen. Please go to the Appointments section to manage appointments.');
                  }
                } else {
                  console.error('Cannot delete event: Missing event ID for item', item);
                  Alert.alert('Error', 'Unable to delete this event. Missing event ID.');
                }
              }}
              accessibilityLabel="Delete event"
            >
              <Ionicons name="trash-outline" size={20} color={colors.error} />
            </TouchableOpacity>
          </View>
        </View>
        
        {item.description && (
          <ThemedText style={[styles.eventDescription, isCompleted && styles.completedText]}>
            {item.description}
          </ThemedText>
        )}
      </Card>
    );
  };
  
  return (
    <>
      <Stack.Screen 
        options={{
          headerTitle: 'Calendar',
          headerRight: () => (
            <TouchableOpacity 
              onPress={showAddEventModal}
              style={{ paddingHorizontal: Spacing.md }}
            >
              <Ionicons name="add-circle" size={Layout.headerIconSize} color={colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />
      
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <RNCalendar
          theme={{
            calendarBackground: colors.card,
            textSectionTitleColor: colors.text,
            selectedDayBackgroundColor: colors.primary,
            selectedDayTextColor: '#ffffff',
            todayTextColor: colors.primary,
            todayBackgroundColor: colors.primary + '20',
            dayTextColor: colors.text,
            textDisabledColor: colors.border,
            dotColor: colors.primary,
            selectedDotColor: '#ffffff',
            arrowColor: colors.primary,
            monthTextColor: colors.text,
            indicatorColor: colors.primary,
            textDayFontWeight: '300',
            textMonthFontWeight: 'bold',
            textDayHeaderFontWeight: '300'
          }}
          style={styles.calendar}
          markingType={'multi-dot'}
          markedDates={markedDates}
          onDayPress={onDayPress}
          current={selected}
        />
        
        <View style={styles.eventsContainer}>
          <View style={styles.eventsHeader}>
            <ThemedText style={styles.eventsHeaderTitle}>
              Events for {format(parseISO(selected), 'MMMM d, yyyy')}
            </ThemedText>
            <TouchableOpacity 
              style={styles.addEventButton}
              onPress={showAddEventModal}
            >
              <Ionicons name="add" size={18} color={colors.primary} />
              <ThemedText style={{ color: colors.primary, marginLeft: 4 }}>Add Event</ThemedText>
            </TouchableOpacity>
          </View>
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <ThemedText style={styles.loadingText}>Loading events...</ThemedText>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={60} color={colors.error} />
              <ThemedText style={styles.errorText}>{error}</ThemedText>
              <Button
                title="Try Again"
                onPress={() => {
                  // Reload events
                  if (currentUser) {
                    setLoading(true);
                    listenToEvents(currentUser.uid, (eventsList) => {
                      setEvents(eventsList);
                      updateMarkedDates(eventsList, appointments);
                      setLoading(false);
                    });
                  }
                }}
              />
            </View>
          ) : (
            <ScrollView style={styles.eventsList}>
              {selectedDateEvents.length > 0 ? (
                selectedDateEvents.map((item, index) => renderEventCard(item, index))
              ) : (
                <View style={styles.emptyContainer}>
                  <Ionicons name="calendar-outline" size={60} color={colors.secondaryText} />
                  <ThemedText style={styles.emptyText}>No events for this day</ThemedText>
                  <Button
                    title="Add Event"
                    onPress={showAddEventModal}
                    icon={<Ionicons name="add-circle-outline" size={18} color="#fff" />}
                    style={styles.emptyAddButton}
                  />
                </View>
              )}
            </ScrollView>
          )}
        </View>
        
        <AddEventModal
          visible={addEventModalVisible}
          onClose={() => setAddEventModalVisible(false)}
          onAddEvent={handleAddEvent}
          initialDate={selected}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  calendar: {
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  eventsContainer: {
    flex: 1,
    padding: Spacing.md,
  },
  eventsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  eventsHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  addEventButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventsList: {
    flex: 1,
  },
  eventCard: {
    marginBottom: Spacing.md,
    padding: Spacing.md,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  eventHeaderLeft: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  metaText: {
    fontSize: 14,
    marginLeft: Spacing.xs / 2,
  },
  eventDescription: {
    fontSize: 14,
    marginTop: Spacing.sm,
    color: Colors.light.textLight,
  },
  eventActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  eventAction: {
    padding: Spacing.xs,
    marginLeft: Spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  errorText: {
    marginVertical: Spacing.md,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyText: {
    fontSize: 16,
    marginVertical: Spacing.md,
    textAlign: 'center',
  },
  emptyAddButton: {
    marginTop: Spacing.md,
  },
  completedEvent: {
    opacity: 0.7,
    backgroundColor: Colors.light.success + '05',
  },
  completedText: {
    textDecorationLine: 'line-through',
  },
}); 