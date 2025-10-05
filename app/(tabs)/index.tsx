import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, View, Text, TouchableOpacity, Image, Alert } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import Colors from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing, Layout } from '@/constants/Spacing';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { router } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { 
  listenToMedications, 
  updateMedication, 
  addMedication as addMedicationToDb,
  listenToAppointments,
  listenToEvents
} from '../../services/firestoreService';

interface DashboardTileProps {
  title: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  onPress: () => void;
  notification?: number;
}

function DashboardTile({ title, icon, color, onPress, notification }: DashboardTileProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  return (
    <TouchableOpacity
      style={[
        styles.tile,
        { backgroundColor: colors.card }
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={Layout.contentIconSize * 1.5} color={color} />
        
        {notification ? (
          <View style={[styles.notificationBadge, { backgroundColor: colors.emergency }]}>
            <Text style={styles.notificationText}>{notification}</Text>
          </View>
        ) : null}
      </View>
      <Text style={[Typography.label, { color: colors.text, marginTop: Spacing.xs }]}>{title}</Text>
    </TouchableOpacity>
  );
}

function ProgressRing({ progress, size, strokeWidth, color }: { 
  progress: number; 
  size: number; 
  strokeWidth: number; 
  color: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <View style={{ width: size, height: size }}>
      {/* Background Circle */}
      <View style={[
        StyleSheet.absoluteFill,
        { alignItems: 'center', justifyContent: 'center' }
      ]}>
        <View style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: color + '30',
        }} />
      </View>
      
      {/* Progress Circle */}
      <View style={[
        StyleSheet.absoluteFill,
        { alignItems: 'center', justifyContent: 'center', transform: [{ rotateZ: '-90deg' }] }
      ]}>
        <View style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: 'transparent',
          borderTopColor: color,
          borderRightColor: progress > 25 ? color : 'transparent',
          borderBottomColor: progress > 50 ? color : 'transparent',
          borderLeftColor: progress > 75 ? color : 'transparent',
          transform: [{ rotateZ: ((progress * 3.6) % 90) + 'deg' }],
        }} />
      </View>
      
      {/* Center Content */}
      <View style={[
        StyleSheet.absoluteFill,
        { alignItems: 'center', justifyContent: 'center' }
      ]}>
        <Text style={{ color, fontSize: size * 0.3, fontWeight: 'bold' }}>
          {progress}%
        </Text>
      </View>
    </View>
  );
}

// Sample medications data
interface Medication {
  id: string;
  name: string;
  dosage: string;
  schedule: string;
  time: string;
  notes?: string;
  taken: boolean;
}

// Appointment interface
interface Appointment {
  id: string;
  doctorName: string;
  specialty: string;
  date: string;
  time: string;
  location: string;
  status: string;
}

// Event interface
interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string | null;
  location: string;
  isAllDay: boolean;
  category: string;
  status: string;
  color?: string;
}

// Get icon for event category
const getCategoryIcon = (category: string): React.ComponentProps<typeof Ionicons>['name'] => {
  switch (category.toLowerCase()) {
    case 'personal':
      return 'person';
    case 'work':
      return 'briefcase';
    case 'social':
      return 'people';
    case 'health':
      return 'fitness';
    case 'other':
      return 'ellipsis-horizontal';
    default:
      return 'calendar';
  }
};

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const { currentUser } = useAuth();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [totalMedicationCount, setTotalMedicationCount] = useState<number>(0);
  const [takenMedicationCount, setTakenMedicationCount] = useState<number>(0);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([]);

  // Get current date
  const currentDate = new Date();
  const formattedDate = currentDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });
  
  // Current time greeting
  const currentHour = currentDate.getHours();
  let greeting = 'Good morning';
  if (currentHour >= 12 && currentHour < 18) {
    greeting = 'Good afternoon';
  } else if (currentHour >= 18) {
    greeting = 'Good evening';
  }

  // Load medications from Firebase
  useEffect(() => {
    if (!currentUser) return;
    
    const unsubscribe = listenToMedications(currentUser.uid, (medicationList) => {
      setMedications(medicationList);
      setTotalMedicationCount(medicationList.length);
      setTakenMedicationCount(medicationList.filter(med => med.taken).length);
    });
    
    // Clean up the listener on unmount
    return () => unsubscribe();
  }, [currentUser]);
  
  // Load appointments from Firebase
  useEffect(() => {
    if (!currentUser) return;
    
    const unsubscribe = listenToAppointments(currentUser.uid, (appointmentList) => {
      // Filter active, upcoming appointments
      const upcomingAppointments = appointmentList.filter(appointment => {
        const appointmentDate = new Date(appointment.date);
        return (
          appointmentDate >= new Date() && // Only future appointments
          appointment.status !== 'cancelled' && // Not cancelled
          appointment.status === 'upcoming' // Explicitly upcoming
        );
      });
      
      // Sort appointments by date
      const sortedAppointments = [...upcomingAppointments].sort((a, b) => {
        const dateA = new Date(a.date + ' ' + a.time);
        const dateB = new Date(b.date + ' ' + b.time);
        return dateA.getTime() - dateB.getTime();
      });
      
      setAppointments(sortedAppointments);
    });
    
    // Clean up the listener on unmount
    return () => unsubscribe();
  }, [currentUser]);

  // Load events from Firebase
  useEffect(() => {
    if (!currentUser) return;
    
    const unsubscribe = listenToEvents(currentUser.uid, (eventsList) => {
      // Filter for upcoming events
      const activeEvents = eventsList.filter(event => {
        const eventDate = new Date(event.date + (event.time ? ' ' + event.time : ''));
        return (
          eventDate >= new Date() && // Only future events
          event.status !== 'cancelled' && // Not cancelled
          event.status === 'upcoming' // Explicitly upcoming
        );
      });
      
      // Sort by date
      const sortedEvents = [...activeEvents].sort((a, b) => {
        const dateA = new Date(a.date + (a.time ? ' ' + a.time : ''));
        const dateB = new Date(b.date + (b.time ? ' ' + b.time : ''));
        return dateA.getTime() - dateB.getTime();
      });
      
      // Get the next 2 events
      setUpcomingEvents(sortedEvents.slice(0, 2));
    });
    
    return () => unsubscribe();
  }, [currentUser]);

  // Navigate to screens
  const navigateToMedications = () => router.replace('/(tabs)/health/medications');
  const navigateToAppointments = () => router.replace('/(tabs)/health/appointments');
  const navigateToRecords = () => router.replace('/(tabs)/profile/records');
  const navigateToVitals = () => router.replace('/(tabs)/health/vitals');
  const navigateToContacts = () => router.replace('/(tabs)/profile/contacts');
  const navigateToWellness = () => router.replace('/(tabs)/health/wellness');
  const navigateToCalendar = () => router.replace('/(tabs)/calendar');

  // Handle taking medication
  const handleTakeMedication = (id: string) => {
    if (!currentUser) return;
    
    const medication = medications.find(med => med.id === id);
    if (medication && !medication.taken) {
      // Update in Firebase
      updateMedication(currentUser.uid, id, { taken: true })
        .then(() => {
          // Update locally for immediate UI feedback
          const updatedMedications = medications.map(med => 
            med.id === id ? { ...med, taken: true } : med
          );
          setMedications(updatedMedications);
          
          // Don't increment count directly, as we might over-count
          // Instead, recalculate based on the updated medications array
          const newTakenCount = updatedMedications.filter(med => med.taken).length;
          setTakenMedicationCount(newTakenCount);
        })
        .catch(error => {
          console.error("Error updating medication: ", error);
          Alert.alert("Error", "Failed to update medication status. Please try again.");
        });
    } else if (medication && medication.taken) {
      // Medication already taken, show a message
      Alert.alert("Already Taken", "This medication has already been marked as taken.");
    }
  };

  // Handle adding new medication
  const handleAddMedication = (medication: Omit<Medication, 'id' | 'taken'>) => {
    if (!currentUser) return;
    
    const newMedication = {
      ...medication,
      taken: false,
    };
    
    addMedicationToDb(currentUser.uid, newMedication)
      .catch(error => console.error("Error adding medication: ", error));
  };

  // Calculate medication progress
  const medicationProgress = totalMedicationCount > 0 
    ? Math.round((takenMedicationCount / totalMedicationCount) * 100) 
    : 0;

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]} 
      contentContainerStyle={styles.content}
    >
      {/* Welcome Header */}
      <View style={styles.header}>
        <View>
          <Text style={[Typography.bodyText, { color: colors.text, opacity: 0.8 }]}>
            {formattedDate}
          </Text>
          <Text style={[Typography.title, { color: colors.text }]}>
            {greeting}, {currentUser?.displayName || 'User'}
          </Text>
        </View>
        <TouchableOpacity 
          style={[styles.avatarContainer, { borderColor: colors.primary }]}
          onPress={() => router.replace('/(tabs)/profile')}
        >
        <Image
            source={{ uri: currentUser?.photoURL || 'https://via.placeholder.com/150' }} 
            style={styles.avatar}
          />
        </TouchableOpacity>
      </View>
      
      {/* Summary Cards Row */}
      <View style={styles.summaryRow}>
        <Card style={[styles.summaryCard, { flex: 1.5 }]} variant="medication">
          <View style={styles.summaryCardHeader}>
            <Text style={[Typography.label, { color: colors.text }]}>
              Today's Progress
            </Text>
            <TouchableOpacity onPress={navigateToMedications}>
              <Ionicons name="arrow-forward-circle" size={24} color={colors.medication} />
            </TouchableOpacity>
          </View>
          <View style={styles.medicationProgress}>
            <ProgressRing
              progress={medicationProgress}
              size={80}
              strokeWidth={8}
              color={colors.medication}
            />
            <View style={styles.medicationStats}>
              <Text style={[Typography.sectionHeader, { color: colors.text }]}>
                {medicationProgress}%
              </Text>
              <Text style={{ color: colors.text }}>
                {takenMedicationCount} of {totalMedicationCount} taken
              </Text>
              <Text style={{ color: colors.text, fontWeight: 'bold', marginTop: Spacing.xs }}>
                {totalMedicationCount - takenMedicationCount} remaining
              </Text>
            </View>
          </View>
        </Card>
        
        <Card style={[styles.summaryCard, { flex: 1 }]} variant="wellness">
          <View style={styles.summaryCardHeader}>
            <Text style={[Typography.label, { color: colors.text }]}>
              Vitals
            </Text>
            <TouchableOpacity onPress={navigateToVitals}>
              <Ionicons name="arrow-forward-circle" size={24} color={colors.wellness} />
            </TouchableOpacity>
          </View>
          <View style={styles.vitalsSummary}>
            <Ionicons name="pulse" size={24} color={colors.wellness} />
            <Text style={[Typography.sectionHeader, { color: colors.text, marginLeft: Spacing.xs }]}>
              120/80
            </Text>
          </View>
          <Text style={{ color: colors.text, marginTop: Spacing.xs }}>
            Last checked: Today
          </Text>
        </Card>
      </View>

      {/* Today's Medications */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[Typography.sectionHeader, { color: colors.text }]}>
            Today's Medications
          </Text>
          <TouchableOpacity onPress={navigateToMedications}>
            <Text style={{ color: colors.primary }}>View All</Text>
          </TouchableOpacity>
        </View>
        
        {medications.map(medication => (
          !medication.taken ? (
            <Card key={medication.id} variant="medication">
              <View style={styles.medicationRow}>
                <View style={[styles.medicationIcon, { backgroundColor: colors.medication + '20' }]}>
                  <Ionicons name="medical" size={Layout.contentIconSize} color={colors.medication} />
                </View>
                <View style={styles.medicationInfo}>
                  <Text style={[Typography.bodyText, { color: colors.text }]}>
                    {medication.name}
                  </Text>
                  <Text style={{ color: colors.text }}>
                    {medication.dosage} - {medication.time}
                  </Text>
                </View>
                <Button 
                  title="Take"
                  onPress={() => handleTakeMedication(medication.id)}
                  style={{ height: Layout.buttonHeight * 0.8 }}
                />
              </View>
            </Card>
          ) : null
        ))}
        
        {medications.length === 0 ? (
          <View style={[styles.emptyMedicationContainer, { backgroundColor: colors.card }]}>
            <Ionicons name="information-circle" size={50} color={colors.primary} />
            <Text style={[styles.emptyMedicationText, { color: colors.text }]}>
              No medications added yet
            </Text>
          </View>
        ) : medications.filter(med => !med.taken).length === 0 ? (
          <View style={[styles.emptyMedicationContainer, { backgroundColor: colors.card }]}>
            <Ionicons name="checkmark-circle" size={50} color={colors.success || 'green'} />
            <Text style={[styles.emptyMedicationText, { color: colors.text }]}>
              All medications taken for today!
            </Text>
          </View>
        ) : null}
      </View>

      {/* Next Appointment */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[Typography.sectionHeader, { color: colors.text }]}>
            Next Appointment
          </Text>
          <TouchableOpacity onPress={navigateToAppointments}>
            <Text style={{ color: colors.primary }}>View All</Text>
          </TouchableOpacity>
        </View>
        
        {appointments.length > 0 ? (
          <Card variant="appointment" onPress={navigateToAppointments}>
            <View style={styles.appointmentRow}>
              <View style={[styles.appointmentDateContainer, { backgroundColor: colors.appointment + '20' }]}>
                <Text style={[styles.appointmentMonth, { color: colors.appointment }]}>
                  {new Date(appointments[0].date).toLocaleString('en-US', { month: 'short' }).toUpperCase()}
                </Text>
                <Text style={[styles.appointmentDay, { color: colors.appointment }]}>
                  {new Date(appointments[0].date).getDate()}
                </Text>
              </View>
              <View style={styles.appointmentInfo}>
                <Text style={[Typography.bodyText, { color: colors.text, fontWeight: 'bold' }]}>
                  {appointments[0].doctorName}
                </Text>
                <Text style={[Typography.caption, { color: colors.text }]}>
                  {appointments[0].specialty}
                </Text>
                <Text style={[Typography.bodyText, { color: colors.text, marginTop: 4 }]}>
                  {new Date(appointments[0].date).toLocaleDateString('en-US', { weekday: 'long' })}, {appointments[0].time}
                </Text>
                <Text style={[Typography.bodyText, { color: colors.text, marginTop: 2 }]}>
                  {appointments[0].location}
                </Text>
              </View>
            </View>
          </Card>
        ) : (
          <View style={[styles.emptyMedicationContainer, { backgroundColor: colors.card }]}>
            <Ionicons name="calendar" size={50} color={colors.appointment} />
            <Text style={[styles.emptyMedicationText, { color: colors.text }]}>
              No upcoming appointments
            </Text>
            <TouchableOpacity 
              style={[styles.scheduleButton, { backgroundColor: colors.appointment + '20' }]} 
              onPress={navigateToAppointments}
            >
              <Text style={{ color: colors.appointment }}>Schedule Now</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Upcoming Events */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[Typography.sectionHeader, { color: colors.text }]}>
            Upcoming Events
          </Text>
          <TouchableOpacity onPress={navigateToCalendar}>
            <Text style={{ color: colors.primary }}>View All</Text>
          </TouchableOpacity>
        </View>
        
        {upcomingEvents.length > 0 ? (
          upcomingEvents.map((event) => (
            <Card key={event.id} variant="wellness" style={{ marginBottom: Spacing.sm }} onPress={navigateToCalendar}>
              <View style={styles.appointmentRow}>
                <View style={[styles.appointmentDateContainer, { 
                  backgroundColor: (event.color || EVENT_COLORS[event.category] || colors.primary) + '20' 
                }]}>
                  <Text style={[styles.appointmentMonth, { 
                    color: event.color || EVENT_COLORS[event.category] || colors.primary 
                  }]}>
                    {new Date(event.date).toLocaleString('en-US', { month: 'short' }).toUpperCase()}
                  </Text>
                  <Text style={[styles.appointmentDay, { 
                    color: event.color || EVENT_COLORS[event.category] || colors.primary 
                  }]}>
                    {new Date(event.date).getDate()}
                  </Text>
                </View>
                <View style={styles.appointmentInfo}>
                  <Text style={[Typography.bodyText, { color: colors.text, fontWeight: 'bold' }]}>
                    {event.title}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                    <Ionicons 
                      name={getCategoryIcon(event.category)} 
                      size={14} 
                      color={event.color || EVENT_COLORS[event.category] || colors.text} 
                      style={{ marginRight: 4 }} 
                    />
                    <Text style={[Typography.caption, { 
                      color: event.color || EVENT_COLORS[event.category] || colors.text 
                    }]}>
                      {event.category.charAt(0).toUpperCase() + event.category.slice(1)}
                    </Text>
                  </View>
                  <Text style={[Typography.bodyText, { color: colors.text, marginTop: 4 }]}>
                    {new Date(event.date).toLocaleDateString('en-US', { weekday: 'long' })}, 
                    {event.isAllDay ? ' All day' : event.time ? ' ' + event.time : ''}
                  </Text>
                  {event.location && (
                    <Text style={[Typography.bodyText, { color: colors.text, marginTop: 2 }]}>
                      {event.location}
                    </Text>
                  )}
                </View>
              </View>
            </Card>
          ))
        ) : (
          <View style={[styles.emptyMedicationContainer, { backgroundColor: colors.card }]}>
            <Ionicons name="calendar-outline" size={50} color={colors.primary} />
            <Text style={[styles.emptyMedicationText, { color: colors.text }]}>
              No upcoming events
            </Text>
            <TouchableOpacity 
              style={[styles.scheduleButton, { backgroundColor: colors.primary + '20' }]} 
              onPress={navigateToCalendar}
            >
              <Text style={{ color: colors.primary }}>Add Event</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Feature Tiles */}
      <View style={styles.section}>
        <Text style={[Typography.sectionHeader, { color: colors.text }]}>
          Quick Access
        </Text>
        <View style={styles.tilesContainer}>
          <DashboardTile 
            title="Medications" 
            icon="medical" 
            color={colors.medication} 
            onPress={navigateToMedications} 
            notification={medications.filter(med => !med.taken).length}
          />
          <DashboardTile 
            title="Appointments" 
            icon="calendar" 
            color={colors.appointment}
            onPress={navigateToAppointments} 
          />
          <DashboardTile 
            title="Records" 
            icon="document-text" 
            color={colors.primary}
            onPress={navigateToRecords} 
          />
          <DashboardTile 
            title="Vitals" 
            icon="pulse" 
            color="#FF9500"
            onPress={navigateToVitals} 
          />
          <DashboardTile 
            title="Contacts" 
            icon="people" 
            color="#007AFF"
            onPress={navigateToContacts} 
          />
          <DashboardTile 
            title="Wellness" 
            icon="leaf" 
            color={colors.wellness}
            onPress={navigateToWellness} 
          />
        </View>
      </View>

      {/* Emergency Button */}
      <Button
        title="Emergency"
        variant="danger"
        onPress={() => {}}
        style={styles.emergencyButton}
        icon={<Ionicons name="warning" size={24} color="#FFFFFF" style={{ marginRight: Spacing.sm }} />}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.md,
    paddingBottom: Spacing.xl * 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: Spacing.md,
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  summaryRow: {
    flexDirection: 'row',
    marginBottom: Spacing.lg,
  },
  summaryCard: {
    marginRight: Spacing.md,
    borderRadius: Layout.borderRadiusLg,
    padding: Spacing.md,
  },
  summaryCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  medicationProgress: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  medicationStats: {
    marginLeft: Spacing.md,
  },
  vitalsSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  appointmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appointmentDateContainer: {
    width: 60,
    height: 70,
    borderRadius: Layout.borderRadiusMd,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  appointmentMonth: {
    fontSize: 14,
    fontWeight: '600',
  },
  appointmentDay: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  appointmentInfo: {
    flex: 1,
  },
  tilesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
  tile: {
    width: Layout.homeTileSize,
    height: Layout.homeTileSize,
    borderRadius: Layout.borderRadiusMd,
    marginBottom: Spacing.md,
    padding: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  iconContainer: {
    width: Layout.homeTileSize * 0.6,
    height: Layout.homeTileSize * 0.6,
    borderRadius: Layout.homeTileSize * 0.3,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFF',
  },
  notificationText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  emergencyButton: {
    marginTop: Spacing.lg,
    height: Layout.buttonHeight * 1.2,
    borderRadius: Layout.borderRadiusLg,
  },
  medicationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  medicationIcon: {
    width: Layout.minTouchTarget,
    height: Layout.minTouchTarget,
    borderRadius: Layout.minTouchTarget / 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  medicationInfo: {
    flex: 1,
  },
  emptyMedicationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: Layout.borderRadiusMd,
    marginTop: Spacing.sm,
  },
  emptyMedicationText: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: Spacing.sm,
  },
  scheduleButton: {
    padding: Spacing.md,
    borderRadius: Layout.borderRadiusMd,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

