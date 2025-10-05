import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Text, Image, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { format, isPast, isSameMonth, subMonths, addMonths } from 'date-fns';
import { ThemedText } from '../../../components/ThemedText';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import Colors from '@/constants/Colors';
import { Spacing, Layout } from '@/constants/Spacing';
import { Typography } from '@/constants/Typography';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Link } from 'expo-router';
import AppointmentScheduler from '../../../components/AppointmentScheduler';
import { Stack } from 'expo-router';
import { useAuth } from '../../../contexts/AuthContext';
import { 
  listenToAppointments, 
  addAppointment, 
  updateAppointment, 
  deleteAppointment 
} from '../../../services/firestoreService';

// Define the Appointment type
interface Appointment {
  id: string;
  doctorName: string;
  doctorImage: string;
  specialty: string;
  date: string;
  time: string;
  location: string;
  address?: string;
  notes?: string;
  reason?: string;
  status: 'upcoming' | 'past' | 'cancelled';
  isPast?: boolean;
  reminderSet?: boolean;
  followUp?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export default function AppointmentsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('upcoming');
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [schedulerVisible, setSchedulerVisible] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch appointments from Firestore
  useEffect(() => {
    if (!currentUser) return;

    setLoading(true);
    try {
      const unsubscribe = listenToAppointments(currentUser.uid, (appointmentList) => {
        // Update appointments with real-time data
        setAppointments(appointmentList);
        setLoading(false);
      });
      
      return () => unsubscribe();
    } catch (err) {
      console.error('Error loading appointments:', err);
      setError('Failed to load appointments');
      setLoading(false);
    }
  }, [currentUser]);

  // Filter appointments based on active tab
  const filteredAppointments = appointments.filter(appointment => {
    const appointmentDate = new Date(appointment.date);
    const isPastAppointment = isPast(appointmentDate);
    
    if (activeTab === 'upcoming') {
      return !isPastAppointment && appointment.status !== 'past';
    } else {
      return isPastAppointment || appointment.status === 'past';
    }
  });

  // Group appointments by month
  const groupAppointmentsByMonth = (appointments: Appointment[]) => {
    return appointments.reduce((groups, appointment) => {
      const monthYear = format(new Date(appointment.date), 'MMMM yyyy');
      
      if (!groups[monthYear]) {
        groups[monthYear] = [];
      }
      
      groups[monthYear].push(appointment);
      return groups;
    }, {} as Record<string, Appointment[]>);
  };

  const groupedAppointments = groupAppointmentsByMonth(filteredAppointments);

  // Handle appointment scheduling
  const handleScheduleAppointment = () => {
    setSchedulerVisible(true);
  };

  // Fix the appointment display and date formatting
  const formatAppointmentDate = (dateString) => {
    console.log('Formatting appointment date:', dateString);
    if (!dateString) return '';
    
    try {
      // Parse the date components
      const [year, month, day] = dateString.split('-').map(Number);
      
      // Create a date object with these components (months are 0-indexed in JS)
      const date = new Date(year, month - 1, day);
      console.log('Parsed appointment date:', date.toString());
      
      // Format and return
      return format(date, 'EEEE, MMMM d, yyyy');
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString; // Return original if there's an error
    }
  };

  // Update the callback for when an appointment is added
  const handleAppointmentAdded = () => {
    console.log("Appointment added callback executed");
    
    // Refresh the list after a short delay to ensure Firestore has updated
    setTimeout(() => {
      if (currentUser) {
        console.log("Refreshing appointments list after add");
        setLoading(true);
        listenToAppointments(currentUser.uid, (appointmentList) => {
          console.log("Received updated appointments:", appointmentList.length);
          setAppointments(appointmentList);
          setLoading(false);
        });
      }
    }, 1000);
    
    setSchedulerVisible(false);
  };

  // Handle appointment cancellation
  const handleCancelAppointment = async (appointment: Appointment) => {
    if (!currentUser) return;
    
    Alert.alert(
      'Cancel Appointment',
      `Are you sure you want to cancel your appointment with Dr. ${appointment.doctorName}?`,
      [
        {
          text: 'No',
          style: 'cancel'
        },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await updateAppointment(currentUser.uid, appointment.id, {
                status: 'cancelled',
                updatedAt: new Date().toISOString()
              });
              
              Alert.alert('Success', 'Appointment cancelled successfully');
            } catch (error) {
              console.error('Error cancelling appointment:', error);
              Alert.alert('Error', 'Failed to cancel appointment. Please try again.');
            }
          }
        }
      ]
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: 'Appointments',
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.background },
        }}
      />
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[
              styles.tabButton, 
              activeTab === 'upcoming' && { 
                ...styles.activeTab,
                backgroundColor: colors.primary + '20',
                borderColor: colors.primary
              }
            ]}
            onPress={() => setActiveTab('upcoming')}
          >
            <ThemedText style={[styles.tabText, activeTab === 'upcoming' && { color: colors.primary }]}>
              Upcoming
            </ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.tabButton, 
              activeTab === 'past' && { 
                ...styles.activeTab, 
                backgroundColor: colors.primary + '20',
                borderColor: colors.primary
              }
            ]}
            onPress={() => setActiveTab('past')}
          >
            <ThemedText style={[styles.tabText, activeTab === 'past' && { color: colors.primary }]}>
              Past
            </ThemedText>
          </TouchableOpacity>
        </View>
        
        {activeTab === 'upcoming' && (
          <View style={styles.scheduleContainer}>
            <Button
              title="Schedule New Appointment"
              onPress={handleScheduleAppointment}
              icon={<Ionicons name="calendar" size={18} color="#fff" style={styles.buttonIcon} />}
            />
          </View>
        )}
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <ThemedText style={styles.loadingText}>Loading appointments...</ThemedText>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={60} color={colors.error} />
            <ThemedText style={styles.errorText}>{error}</ThemedText>
            <Button
              title="Try Again"
              onPress={() => {
                setLoading(true);
                setError(null);
                // Re-fetch appointments
                if (currentUser) {
                  listenToAppointments(currentUser.uid, (appointmentList) => {
                    setAppointments(appointmentList);
                    setLoading(false);
                  });
                } else {
                  setLoading(false);
                  setError('You must be logged in to view appointments');
                }
              }}
              style={styles.retryButton}
            />
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {Object.keys(groupedAppointments).length > 0 ? (
              Object.entries(groupedAppointments).map(([month, appointments]) => (
                <View key={month} style={styles.monthSection}>
                  <ThemedText style={styles.monthTitle}>{month}</ThemedText>
                  
                  {appointments.map((appointment) => {
                    console.log(`Rendering appointment: ${appointment.id}`, {
                      date: appointment.date,
                      doctorName: appointment.doctorName,
                      time: appointment.time
                    });
                    
                    return (
                      <Card key={appointment.id} variant="appointment" style={styles.appointmentCard}>
                        <View style={styles.appointmentHeader}>
                          <View style={styles.doctorInfo}>
                            <Image 
                              source={{ uri: appointment.doctorImage || 'https://via.placeholder.com/50' }} 
                              style={styles.doctorImage} 
                            />
                            <View style={styles.doctorDetails}>
                              <ThemedText style={styles.doctorName}>
                                {appointment.doctorName}
                              </ThemedText>
                              <ThemedText style={styles.specialty}>
                                {appointment.specialty}
                              </ThemedText>
                            </View>
                          </View>
                          
                          {appointment.status === 'cancelled' && (
                            <View style={styles.cancelledBadge}>
                              <ThemedText style={styles.cancelledText}>Cancelled</ThemedText>
                            </View>
                          )}
                        </View>
                        
                        <View style={styles.appointmentDetails}>
                          <View style={styles.detailRow}>
                            <Ionicons name="calendar-outline" size={16} color={colors.secondaryText} style={styles.icon} />
                            <ThemedText style={styles.detailText}>
                              {formatAppointmentDate(appointment.date)}
                            </ThemedText>
                          </View>
                          
                          <View style={styles.detailRow}>
                            <Ionicons name="time-outline" size={16} color={colors.secondaryText} style={styles.icon} />
                            <ThemedText style={styles.detailText}>
                              {appointment.time}
                            </ThemedText>
                          </View>
                          
                          <View style={styles.detailRow}>
                            <Ionicons name="location-outline" size={16} color={colors.secondaryText} style={styles.icon} />
                            <View>
                              <ThemedText style={styles.detailText}>
                                {appointment.location}
                              </ThemedText>
                              {appointment.address && (
                                <ThemedText style={styles.addressText}>
                                  {appointment.address}
                                </ThemedText>
                              )}
                            </View>
                          </View>

                          {appointment.reason && (
                            <View style={styles.detailRow}>
                              <Ionicons name="information-circle-outline" size={16} color={colors.secondaryText} style={styles.icon} />
                              <ThemedText style={styles.detailText}>
                                Reason: {appointment.reason}
                              </ThemedText>
                            </View>
                          )}
                        </View>
                        
                        {activeTab === 'upcoming' && appointment.status !== 'cancelled' ? (
                          <View style={styles.appointmentActions}>
                            <Button
                              title="Directions"
                              variant="outline"
                              size="small"
                              onPress={() => alert(`Directions to ${appointment.location}`)}
                              icon={<Ionicons name="navigate-outline" size={16} color={colors.primary} />}
                              style={styles.actionButton}
                            />
                            <Button
                              title="Reschedule"
                              variant="outline"
                              size="small"
                              onPress={() => {
                                setSelectedAppointment(appointment);
                                setSchedulerVisible(true);
                              }}
                              icon={<Ionicons name="calendar-outline" size={16} color={colors.primary} />}
                              style={styles.actionButton}
                            />
                            <Button
                              title="Cancel"
                              variant="outline"
                              size="small"
                              onPress={() => handleCancelAppointment(appointment)}
                              icon={<Ionicons name="close-circle-outline" size={16} color={colors.error} />}
                              style={styles.actionButton}
                            />
                          </View>
                        ) : activeTab === 'past' && appointment.status !== 'cancelled' ? (
                          <View style={styles.appointmentActions}>
                            <Button
                              title="View Summary"
                              variant="outline"
                              size="small"
                              onPress={() => alert('View appointment summary')}
                              icon={<Ionicons name="document-text-outline" size={16} color={colors.primary} />}
                              style={styles.actionButton}
                            />
                            <Button
                              title="Schedule Follow-up"
                              variant="outline"
                              size="small"
                              onPress={handleScheduleAppointment}
                              icon={<Ionicons name="calendar-outline" size={16} color={colors.primary} />}
                              style={styles.actionButton}
                            />
                          </View>
                        ) : null}
                      </Card>
                    );
                  })}
                </View>
              ))
            ) : (
              <View style={styles.emptyStateContainer}>
                <Ionicons name="calendar-outline" size={60} color={colors.secondaryText} style={styles.emptyStateIcon} />
                <ThemedText style={styles.emptyStateTitle}>
                  No {activeTab} appointments
                </ThemedText>
                <ThemedText style={styles.emptyStateText}>
                  {activeTab === 'upcoming' 
                    ? "You don't have any upcoming appointments scheduled."
                    : "You don't have any past appointment records."}
                </ThemedText>
                {activeTab === 'upcoming' && (
                  <Button
                    title="Schedule Appointment"
                    onPress={handleScheduleAppointment}
                    style={styles.emptyStateButton}
                    icon={<Ionicons name="add-circle-outline" size={18} color="#fff" />}
                  />
                )}
              </View>
            )}
          </ScrollView>
        )}
        
        <AppointmentScheduler
          visible={schedulerVisible}
          onClose={() => setSchedulerVisible(false)}
          onAppointmentAdded={handleAppointmentAdded}
          initialDate={format(selectedDate || new Date(), 'yyyy-MM-dd')}
          appointment={selectedAppointment || undefined}
          mode={selectedAppointment ? 'reschedule' : 'schedule'}
        />
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    backgroundColor: Colors.light.card,
  },
  tabButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
  },
  activeTab: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
  },
  scheduleContainer: {
    padding: Spacing.md,
    backgroundColor: Colors.light.card,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  buttonIcon: {
    marginRight: Spacing.xs,
  },
  scrollContent: {
    padding: Spacing.md,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  errorText: {
    marginTop: Spacing.md,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  retryButton: {
    marginTop: Spacing.md,
  },
  monthSection: {
    marginBottom: Spacing.lg,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: Spacing.md,
  },
  appointmentCard: {
    marginBottom: Spacing.md,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  doctorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  doctorImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  doctorDetails: {
    marginLeft: Spacing.sm,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  specialty: {
    fontSize: 14,
    opacity: 0.7,
  },
  cancelledBadge: {
    backgroundColor: Colors.light.error + '20',
    borderRadius: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs / 2,
  },
  cancelledText: {
    color: Colors.light.error,
    fontSize: 12,
    fontWeight: 'bold',
  },
  appointmentDetails: {
    marginBottom: Spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  icon: {
    marginTop: 2,
    marginRight: Spacing.sm,
  },
  detailText: {
    fontSize: 14,
  },
  addressText: {
    fontSize: 14,
    opacity: 0.7,
  },
  appointmentActions: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    flexWrap: 'wrap',
  },
  actionButton: {
    marginRight: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  emptyStateIcon: {
    marginBottom: Spacing.md,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: Spacing.sm,
  },
  emptyStateText: {
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  emptyStateButton: {
    minWidth: 200,
  },
}); 