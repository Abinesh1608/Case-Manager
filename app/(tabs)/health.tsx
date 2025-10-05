import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, View, Text, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import Colors from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing, Layout } from '@/constants/Spacing';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../../components/Card';
import { Stack, router } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { listenToAppointments } from '../../services/firestoreService';
import { format } from 'date-fns';

// Get device width for responsive layout
const { width } = Dimensions.get('window');

// Function to generate upcoming dates for 3 days view
const generateUpcomingDates = () => {
  const dates = [];
  const today = new Date();
  
  for (let i = 0; i < 5; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    
    const isToday = i === 0;
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
    const dayNumber = date.getDate();
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    
    dates.push({
      date,
      dayName,
      dayNumber,
      month,
      isToday,
      hasAppointment: i === 1, // For demo, appointment on tomorrow
      hasReminders: i === 0 || i === 2, // For demo, reminders today and day after tomorrow
    });
  }
  
  return dates;
};

interface HealthCategoryProps {
  title: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  description: string;
  onPress: () => void;
  badge?: number;
}

function HealthCategory({ title, icon, color, description, onPress, badge }: HealthCategoryProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  return (
    <Card style={styles.categoryCard} onPress={onPress}>
      <View style={styles.categoryHeader}>
        <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
          <Ionicons name={icon} size={Layout.contentIconSize} color={color} />
          
          {badge ? (
            <View style={[styles.badge, { backgroundColor: colors.emergency }]}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          ) : null}
        </View>
        <Text style={[Typography.sectionHeader, { color: colors.text }]}>
          {title}
        </Text>
      </View>
      <Text style={[Typography.bodyText, { color: colors.text }]}>
        {description}
      </Text>
      <View style={styles.categoryFooter}>
        <Text style={[Typography.label, { color: colors.primary }]}>
          View details
        </Text>
        <Ionicons name="chevron-forward" size={16} color={colors.primary} />
      </View>
    </Card>
  );
}

function DateSelector() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const [selectedDateIndex, setSelectedDateIndex] = useState(0);
  const dates = generateUpcomingDates();
  
  return (
    <View style={styles.dateSelector}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dateSelectorContent}
      >
        {dates.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.dateItem,
              selectedDateIndex === index && {
                backgroundColor: colors.primary,
                borderColor: colors.primary,
              },
            ]}
            onPress={() => setSelectedDateIndex(index)}
          >
            <Text
              style={[
                styles.dateDayName,
                { color: selectedDateIndex === index ? '#FFF' : colors.text },
              ]}
            >
              {item.dayName}
            </Text>
            <Text
              style={[
                styles.dateDayNumber,
                { color: selectedDateIndex === index ? '#FFF' : colors.text },
              ]}
            >
              {item.dayNumber}
            </Text>
            <Text
              style={[
                styles.dateMonth,
                { color: selectedDateIndex === index ? '#FFF' : colors.text },
              ]}
            >
              {item.month}
            </Text>
            
            {item.hasAppointment && (
              <View
                style={[
                  styles.dateIndicator,
                  {
                    backgroundColor: selectedDateIndex === index
                      ? '#FFF'
                      : colors.appointment,
                  },
                ]}
              />
            )}
            
            {item.hasReminders && (
              <View
                style={[
                  styles.dateIndicator,
                  {
                    backgroundColor: selectedDateIndex === index
                      ? '#FFF'
                      : colors.medication,
                    marginLeft: item.hasAppointment ? Spacing.xs : 0,
                  },
                ]}
              />
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

// Define the Appointment interface for type safety
interface Appointment {
  id: string;
  doctorName: string;
  specialty: string;
  date: string;
  time: string;
  location: string;
  status: string;
}

export default function HealthScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const { currentUser, isEmailVerified } = useAuth();
  const [showDashboard, setShowDashboard] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Navigation handlers
  const navigateToMedications = () => router.replace('/(tabs)/health/medications');
  const navigateToVitals = () => router.replace('/(tabs)/health/vitals');
  const navigateToWellness = () => router.replace('/(tabs)/health/wellness');
  const navigateToAppointments = () => router.replace('/(tabs)/health/appointments');
  const navigateToRecords = () => router.replace('/(tabs)/health/records');
  const navigateToCalendar = () => router.replace('/(tabs)/calendar');

  // Fetch appointments from Firestore
  useEffect(() => {
    if (!currentUser) return;
    
    setLoading(true);
    
    const unsubscribe = listenToAppointments(currentUser.uid, (appointmentsList) => {
      // Filter upcoming appointments and sort by date
      const upcomingAppointments = appointmentsList
        .filter(apt => apt.status === 'upcoming')
        .sort((a, b) => {
          // Sort by date and time
          const dateA = new Date(`${a.date}T${a.time}`);
          const dateB = new Date(`${b.date}T${b.time}`);
          return dateA.getTime() - dateB.getTime();
        });
      
      setAppointments(upcomingAppointments);
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [currentUser]);
  
  // Get the next appointment (first upcoming appointment)
  const nextAppointment = appointments.length > 0 ? appointments[0] : null;
  
  // Format the appointment date and time for display
  const formatAppointmentDateTime = (date: string, time: string) => {
    try {
      const dateObj = new Date(date);
      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
      const month = dateObj.toLocaleDateString('en-US', { month: 'short' });
      const day = dateObj.getDate();
      
      return `${dayName}, ${month} ${day} • ${time}`;
    } catch (error) {
      console.error("Error formatting date:", error);
      return `${date} • ${time}`;
    }
  };

  // Render the appointment card
  const renderNextAppointment = () => {
    if (loading) {
      return (
        <Card style={styles.appointmentCard}>
          <View style={{ alignItems: 'center', padding: Spacing.md }}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={{ marginTop: Spacing.sm, color: colors.text }}>
              Loading appointments...
            </Text>
          </View>
        </Card>
      );
    }
    
    if (!nextAppointment) {
      return (
        <Card style={styles.appointmentCard}>
          <View style={{ alignItems: 'center', padding: Spacing.md }}>
            <Ionicons name="calendar-outline" size={40} color={colors.secondaryText} />
            <Text style={{ marginTop: Spacing.sm, color: colors.text, textAlign: 'center' }}>
              No upcoming appointments
            </Text>
            <TouchableOpacity 
              style={[styles.viewAllButton, { borderColor: colors.primary, marginTop: Spacing.md }]}
              onPress={navigateToAppointments}
            >
              <Text style={[styles.viewAllText, { color: colors.primary }]}>
                Schedule an Appointment
              </Text>
            </TouchableOpacity>
          </View>
        </Card>
      );
    }
    
    return (
      <Card
        variant="appointment"
        style={styles.appointmentCard}
        onPress={navigateToAppointments}
      >
        <View style={styles.appointmentCardHeader}>
          <Text style={[Typography.sectionHeader, { color: colors.text }]}>
            Next Appointment
          </Text>
          <TouchableOpacity onPress={navigateToAppointments}>
            <Text style={{ color: colors.appointment }}>View All</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.appointmentDetails}>
          <View style={[styles.appointmentIconContainer, { backgroundColor: colors.appointment + '20' }]}>
            <Ionicons name="calendar" size={Layout.contentIconSize} color={colors.appointment} />
          </View>
          <View style={styles.appointmentInfo}>
            <Text style={[Typography.bodyText, { color: colors.text, fontWeight: '600' }]}>
              Dr. {nextAppointment.doctorName} - {nextAppointment.specialty}
            </Text>
            <Text style={{ color: colors.text }}>
              {formatAppointmentDateTime(nextAppointment.date, nextAppointment.time)}
            </Text>
            <Text style={{ color: colors.text, marginTop: Spacing.xs }}>
              {nextAppointment.location}
            </Text>
          </View>
        </View>
      </Card>
    );
  };

  return (
    <>
      <Stack.Screen 
        options={{
          headerTitle: 'Health',
          headerRight: () => (
            <TouchableOpacity 
              style={{ paddingHorizontal: Spacing.md }}
              onPress={() => setShowDashboard(!showDashboard)}
            >
              <Ionicons 
                name={showDashboard ? "calendar" : "grid"} 
                size={Layout.headerIconSize} 
                color={colors.text} 
              />
            </TouchableOpacity>
          ),
        }} 
      />

      {showDashboard ? (
        // Dashboard View (from health/index.tsx)
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
          <Text style={[Typography.title, { color: colors.text }]}>
            Health Dashboard
          </Text>
          
          <View style={styles.cardsContainer}>
            <TouchableOpacity 
              style={[styles.dashboardCard, { backgroundColor: colors.primary + '10' }]}
              onPress={navigateToAppointments}
            >
              <Ionicons name="calendar" size={32} color={colors.primary} />
              <Text style={[styles.cardTitle, { color: colors.text }]}>Appointments</Text>
              <Text style={[styles.cardDescription, { color: colors.secondaryText }]}>
                Manage your doctor visits
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.dashboardCard, { backgroundColor: '#4CAF50' + '10' }]}
              onPress={navigateToMedications}
            >
              <Ionicons name="medkit" size={32} color="#4CAF50" />
              <Text style={[styles.cardTitle, { color: colors.text }]}>Medications</Text>
              <Text style={[styles.cardDescription, { color: colors.secondaryText }]}>
                Track your prescriptions
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.dashboardCard, { backgroundColor: '#2196F3' + '10' }]}
              onPress={navigateToVitals}
            >
              <Ionicons name="pulse" size={32} color="#2196F3" />
              <Text style={[styles.cardTitle, { color: colors.text }]}>Vitals</Text>
              <Text style={[styles.cardDescription, { color: colors.secondaryText }]}>
                Monitor your health metrics
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.dashboardCard, { backgroundColor: '#9C27B0' + '10' }]}
              onPress={navigateToRecords}
            >
              <Ionicons name="document-text" size={32} color="#9C27B0" />
              <Text style={[styles.cardTitle, { color: colors.text }]}>Records</Text>
              <Text style={[styles.cardDescription, { color: colors.secondaryText }]}>
                Access your health documents
              </Text>
            </TouchableOpacity>
          </View>
          
          <Text style={[Typography.subtitle, { color: colors.text, marginTop: Spacing.xl }]}>
            Upcoming Appointment
          </Text>
          
          {renderNextAppointment()}
        </ScrollView>
      ) : (
        // Calendar View (from original health.tsx)
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
          {/* Date selector component */}
          <DateSelector />
          
          {/* Next Appointment Card */}
          {renderNextAppointment()}

          {/* Health Categories */}
          <Text style={[Typography.sectionHeader, { color: colors.text, marginTop: Spacing.lg, marginBottom: Spacing.sm }]}>
            Health Management
          </Text>
          
          <HealthCategory 
            title="Medications" 
            icon="medical" 
            color={colors.medication}
            description="Track and manage your daily medications and prescriptions."
            onPress={navigateToMedications}
            badge={2}
          />
          
          <HealthCategory 
            title="Vitals & Measurements" 
            icon="pulse" 
            color={colors.vitals}
            description="Record and monitor your health vitals and measurements."
            onPress={navigateToVitals}
          />
          
          <HealthCategory 
            title="Records & Documents" 
            icon="document-text" 
            color={colors.records}
            description="Access and manage your health records and test results."
            onPress={navigateToRecords}
          />
          
          <HealthCategory 
            title="Wellness & Lifestyle" 
            icon="leaf" 
            color={colors.wellness}
            description="Track diet, activity, sleep and wellness practices."
            onPress={navigateToWellness}
          />
        </ScrollView>
      )}
    </>
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
  // Date selector styles
  dateSelector: {
    marginBottom: Spacing.md,
  },
  dateSelectorContent: {
    paddingHorizontal: Spacing.sm,
  },
  dateItem: {
    width: 60,
    height: 85,
    borderRadius: Layout.borderRadiusMd,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: Spacing.xs,
    paddingVertical: Spacing.sm,
  },
  dateDayName: {
    fontSize: 12,
    fontWeight: '500',
  },
  dateDayNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 2,
  },
  dateMonth: {
    fontSize: 12,
  },
  dateIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 4,
  },
  // Appointment card styles
  appointmentCard: {
    marginBottom: Spacing.md,
  },
  appointmentCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  appointmentDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appointmentIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  appointmentInfo: {
    flex: 1,
  },
  // Health category styles
  categoryCard: {
    marginBottom: Spacing.md,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  categoryFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  // Dashboard card styles (from health/index.tsx)
  cardsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: Spacing.lg,
  },
  dashboardCard: {
    width: '48%',
    padding: Spacing.md,
    borderRadius: Layout.borderRadiusMd,
    marginBottom: Spacing.md,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: Spacing.md,
  },
  cardDescription: {
    fontSize: 14,
    marginTop: 4,
  },
  // Appointment styles from health/index.tsx
  appointmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appointmentTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: Spacing.sm,
  },
  appointmentSpecialty: {
    fontSize: 14,
    marginLeft: Spacing.lg + Spacing.sm,
    marginTop: 2,
  },
  appointmentDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  appointmentDetailText: {
    marginLeft: Spacing.sm,
  },
  viewAllButton: {
    borderWidth: 1,
    borderRadius: Layout.borderRadiusMd,
    padding: Spacing.sm,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  viewAllText: {
    fontWeight: '500',
  },
}); 