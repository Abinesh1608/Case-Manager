import React, { useState, useEffect } from 'react';
import { 
  ScrollView, 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  Modal, 
  TextInput, 
  KeyboardAvoidingView, 
  Platform,
  Switch,
  FlatList,
  Alert
} from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import Colors from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing, Layout } from '@/constants/Spacing';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { Stack } from 'expo-router';
import { DateTimePickerModal } from '../../../components/DateTimePickerModal';
import { ThemedText } from '../../../components/ThemedText';
import { useAuth } from '../../../contexts/AuthContext';
import { listenToMedications, updateMedication, addMedication, deleteMedication } from '../../../services/firestoreService';
import { format } from 'date-fns';

// Define medication types
type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';
type Frequency = 'daily' | 'weekdays' | 'weekends' | 'weekly' | 'monthly' | 'as_needed';

interface Medication {
  id: string;
  name: string;
  dosage: string;
  instructions: string;
  timeOfDay: TimeOfDay;
  time: string;
  frequency: Frequency;
  refillReminder: boolean;
  refillDate?: string;
  notes?: string;
  taken: boolean;
}

interface MedicationGroupProps {
  title: string;
  timeOfDay: TimeOfDay;
  medications: Medication[];
  onToggleTaken: (id: string) => void;
}

function MedicationGroup({ title, timeOfDay, medications, onToggleTaken }: MedicationGroupProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const filteredMeds = medications.filter(med => med.timeOfDay === timeOfDay);

  if (filteredMeds.length === 0) return null;

  const getTimeIcon = (time: TimeOfDay) => {
    switch (time) {
      case 'morning': return 'sunny';
      case 'afternoon': return 'partly-sunny';
      case 'evening': return 'cloudy-night';
      case 'night': return 'moon';
      default: return 'time';
    }
  };

  return (
    <View style={styles.timeGroup}>
      <View style={styles.timeHeader}>
        <Ionicons name={getTimeIcon(timeOfDay)} size={Layout.contentIconSize} color={colors.primary} />
        <Text style={[Typography.sectionHeader, { color: colors.text, marginLeft: Spacing.sm }]}>
          {title}
        </Text>
      </View>
      
      {filteredMeds.map(medication => (
        <Card key={medication.id} variant="medication" style={medication.taken ? styles.medicationTaken : {}}>
          <View style={styles.medicationRow}>
            <View style={styles.medicationInfo}>
              <Text style={[Typography.bodyText, { color: colors.text }]}>
                {medication.name}
              </Text>
              <Text style={{ color: colors.text }}>
                {medication.dosage} - {medication.instructions}
              </Text>
              <Text style={{ color: colors.secondaryText, marginTop: 4 }}>
                {medication.time} - {formatFrequency(medication.frequency)}
              </Text>
              {medication.refillReminder && medication.refillDate && (
                <View style={styles.refillReminder}>
                  <Ionicons name="refresh" size={14} color={colors.primary} style={{ marginRight: 4 }} />
                  <Text style={{ color: colors.primary, fontSize: 12 }}>
                    Refill on {medication.refillDate}
                  </Text>
                </View>
              )}
            </View>
            <Button 
              title={medication.taken ? "Taken" : "Take"}
              variant={medication.taken ? "secondary" : "primary"}
              onPress={() => onToggleTaken(medication.id)} 
              style={{ height: Layout.buttonHeight * 0.8 }}
            />
          </View>
        </Card>
      ))}
    </View>
  );
}

// Helper function to format frequency for display
function formatFrequency(frequency: Frequency): string {
  switch (frequency) {
    case 'daily': return 'Every day';
    case 'weekdays': return 'Weekdays only';
    case 'weekends': return 'Weekends only';
    case 'weekly': return 'Once a week';
    case 'monthly': return 'Once a month';
    case 'as_needed': return 'As needed';
    default: return 'Daily';
  }
}

export default function MedicationsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const { currentUser } = useAuth();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('today');
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isTimePickerVisible, setIsTimePickerVisible] = useState(false);
  const [isRefillDatePickerVisible, setIsRefillDatePickerVisible] = useState(false);
  const [showPreviousMedications, setShowPreviousMedications] = useState(false);
  const [previousMedications, setPreviousMedications] = useState<Medication[]>([]);
  
  // New medication form state
  const [newMedication, setNewMedication] = useState<Partial<Medication>>({
    name: '',
    dosage: '',
    instructions: '',
    timeOfDay: 'morning',
    time: '8:00 AM',
    frequency: 'daily',
    refillReminder: false,
    notes: '',
    taken: false,
  });

  // Get current date
  const currentDate = new Date();
  const formattedDate = currentDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });

  // Fetch medications from Firebase
  useEffect(() => {
    if (!currentUser) return;

    setLoading(true);
    const unsubscribe = listenToMedications(currentUser.uid, (medicationList) => {
      setMedications(medicationList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Load previous medications (those already marked as taken)
  useEffect(() => {
    // Filter medications to find previously taken ones
    const taken = medications.filter(med => med.taken);
    // Get unique medications by name to avoid duplicates
    const uniqueMeds = Array.from(new Map(taken.map(item => [item.name, item])).values());
    setPreviousMedications(uniqueMeds);
  }, [medications]);

  // Handle medication taken toggle
  const handleToggleTaken = async (id: string) => {
    if (!currentUser) return;
    
    try {
      const medication = medications.find(med => med.id === id);
      if (medication) {
        await updateMedication(currentUser.uid, id, { taken: !medication.taken });
      }
    } catch (error) {
      console.error('Error updating medication:', error);
      Alert.alert('Error', 'Failed to update medication status');
    }
  };

  // Add new medication
  const handleAddMedication = async (newMedication: Omit<Medication, 'id'>) => {
    if (!currentUser) return;
    
    try {
      await addMedication(currentUser.uid, newMedication);
      setIsAddModalVisible(false);
    } catch (error) {
      console.error('Error adding medication:', error);
      Alert.alert('Error', 'Failed to add new medication');
    }
  };

  // Delete medication
  const handleDeleteMedication = async (id: string) => {
    if (!currentUser) return;
    
    try {
      Alert.alert(
        'Delete Medication',
        'Are you sure you want to delete this medication?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Delete', 
            onPress: async () => {
              await deleteMedication(currentUser.uid, id);
            },
            style: 'destructive'
          }
        ]
      );
    } catch (error) {
      console.error('Error deleting medication:', error);
      Alert.alert('Error', 'Failed to delete medication');
    }
  };

  // Handle time selection
  const handleTimeConfirm = (date: Date) => {
    const formattedTime = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    });
    setNewMedication({...newMedication, time: formattedTime});
    setIsTimePickerVisible(false);
  };

  // Handle refill date selection
  const handleRefillDateConfirm = (date: Date) => {
    const formattedDate = date.toISOString().split('T')[0];
    setNewMedication({...newMedication, refillDate: formattedDate});
    setIsRefillDatePickerVisible(false);
  };

  // Reuse a previous medication
  const handleReusePreviousMedication = (medication: Medication) => {
    if (!currentUser) return;
    
    // Create a new medication based on the previous one
    const newMedication = {
      name: medication.name,
      dosage: medication.dosage,
      instructions: medication.instructions,
      timeOfDay: medication.timeOfDay,
      time: medication.time,
      frequency: medication.frequency,
      refillReminder: medication.refillReminder,
      refillDate: medication.refillDate,
      notes: medication.notes,
      taken: false, // Always set as not taken for the new entry
    };
    
    // Add the medication
    addMedication(currentUser.uid, newMedication)
      .then(() => {
        Alert.alert("Success", `${medication.name} has been added to your medications.`);
        setShowPreviousMedications(false);
      })
      .catch(error => {
        console.error('Error adding medication:', error);
        Alert.alert('Error', 'Failed to add medication');
      });
  };

  // Create the emptyPreviousMeds style inside the component
  const dynamicStyles = {
    emptyPreviousMeds: {
      padding: Spacing.md,
      backgroundColor: colors.card,
      borderRadius: Layout.borderRadiusMd,
      marginBottom: Spacing.xl,
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ThemedText>Loading medications...</ThemedText>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ThemedText>Error: {error}</ThemedText>
        <Button 
          title="Retry" 
          onPress={() => {
            setError(null);
            setLoading(true);
          }} 
          style={{ marginTop: Spacing.md }}
        />
      </View>
    );
  }

  // Group medications by time of day
  const morningMeds = medications.filter(med => med.timeOfDay === 'morning');
  const afternoonMeds = medications.filter(med => med.timeOfDay === 'afternoon');
  const eveningMeds = medications.filter(med => med.timeOfDay === 'evening');
  const nightMeds = medications.filter(med => med.timeOfDay === 'night');

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: 'Medications',
          headerBackVisible: true,
          headerRight: () => (
            <TouchableOpacity 
              style={{ paddingHorizontal: Spacing.md }}
              onPress={() => setIsAddModalVisible(true)}
            >
              <Ionicons name="add-circle" size={Layout.headerIconSize} color={colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.dateContainer}>
          <Text style={[Typography.bodyText, { color: colors.text }]}>
            {formattedDate}
          </Text>
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'today' && styles.activeTabButton]}
            onPress={() => setActiveTab('today')}
          >
            <Text style={[
              Typography.label, 
              { color: activeTab === 'today' ? colors.primary : colors.text }
            ]}>
              Today
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'schedule' && styles.activeTabButton]}
            onPress={() => setActiveTab('schedule')}
          >
            <Text style={[
              Typography.label, 
              { color: activeTab === 'schedule' ? colors.primary : colors.text }
            ]}>
              Schedule
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'history' && styles.activeTabButton]}
            onPress={() => setActiveTab('history')}
          >
            <Text style={[
              Typography.label, 
              { color: activeTab === 'history' ? colors.primary : colors.text }
            ]}>
              History
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.addFromPreviousContainer}>
          <Button
            title={showPreviousMedications ? "Hide Previous Medications" : "Add from Previous Medications"}
            variant="secondary"
            onPress={() => setShowPreviousMedications(!showPreviousMedications)}
            icon={<Ionicons name="refresh" size={18} color={colors.primary} style={{ marginRight: 8 }} />}
          />
        </View>
        
        {showPreviousMedications && previousMedications.length > 0 && (
          <View style={styles.previousMedsContainer}>
            <Text style={[Typography.sectionHeader, { color: colors.text, marginBottom: Spacing.sm }]}>
              Previously Added Medications
            </Text>
            {previousMedications.map(medication => (
              <Card key={medication.id} variant="medication" style={styles.previousMedCard}>
                <View style={styles.medicationRow}>
                  <View style={styles.medicationInfo}>
                    <Text style={[Typography.bodyText, { color: colors.text }]}>
                      {medication.name}
                    </Text>
                    <Text style={{ color: colors.text }}>
                      {medication.dosage} - {medication.instructions}
                    </Text>
                    <Text style={{ color: colors.secondaryText, marginTop: 4 }}>
                      {medication.time} - {formatFrequency(medication.frequency)}
                    </Text>
                  </View>
                  <Button 
                    title="Add"
                    onPress={() => handleReusePreviousMedication(medication)} 
                    style={{ height: Layout.buttonHeight * 0.8 }}
                  />
                </View>
              </Card>
            ))}
          </View>
        )}
        
        {showPreviousMedications && previousMedications.length === 0 && (
          <View style={dynamicStyles.emptyPreviousMeds}>
            <Text style={[Typography.bodyText, { color: colors.text, textAlign: 'center' }]}>
              No previous medications found. Take medications to build history.
            </Text>
          </View>
        )}

        {activeTab === 'today' && (
          <>
            <MedicationGroup 
              title="Morning" 
              timeOfDay="morning" 
              medications={medications}
              onToggleTaken={handleToggleTaken}
            />
            
            <MedicationGroup 
              title="Afternoon" 
              timeOfDay="afternoon" 
              medications={medications}
              onToggleTaken={handleToggleTaken}
            />
            
            <MedicationGroup 
              title="Evening" 
              timeOfDay="evening" 
              medications={medications}
              onToggleTaken={handleToggleTaken}
            />
            
            <MedicationGroup 
              title="Night" 
              timeOfDay="night" 
              medications={medications}
              onToggleTaken={handleToggleTaken}
            />
          </>
        )}

        {activeTab === 'schedule' && (
          <View style={styles.comingSoon}>
            <Ionicons name="calendar" size={64} color={colors.primary} />
            <ThemedText style={styles.comingSoonText}>
              Medication schedule view coming soon
            </ThemedText>
            <Text style={{ color: colors.secondaryText, textAlign: 'center', marginTop: 8 }}>
              You will be able to view and manage your medication schedule by day, week, or month.
            </Text>
          </View>
        )}

        {activeTab === 'history' && (
          <View style={styles.comingSoon}>
            <Ionicons name="time" size={64} color={colors.primary} />
            <ThemedText style={styles.comingSoonText}>
              Medication history coming soon
            </ThemedText>
            <Text style={{ color: colors.secondaryText, textAlign: 'center', marginTop: 8 }}>
              Track your medication adherence and view history reports.
            </Text>
          </View>
        )}

        {/* Add Medication Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={isAddModalVisible}
          onRequestClose={() => setIsAddModalVisible(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContainer}
          >
            <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
              <View style={styles.modalHeader}>
                <ThemedText style={styles.modalTitle}>Add Medication</ThemedText>
                <TouchableOpacity onPress={() => setIsAddModalVisible(false)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScrollContent}>
                <View style={styles.formGroup}>
                  <ThemedText style={styles.label}>Medication Name *</ThemedText>
                  <TextInput
                    style={[styles.input, { borderColor: colors.border, color: colors.text }]}
                    placeholder="Enter medication name"
                    placeholderTextColor={colors.secondaryText}
                    value={newMedication.name}
                    onChangeText={(text) => setNewMedication({...newMedication, name: text})}
                  />
                </View>

                <View style={styles.formGroup}>
                  <ThemedText style={styles.label}>Dosage *</ThemedText>
                  <TextInput
                    style={[styles.input, { borderColor: colors.border, color: colors.text }]}
                    placeholder="e.g., 10mg, 1 tablet, etc."
                    placeholderTextColor={colors.secondaryText}
                    value={newMedication.dosage}
                    onChangeText={(text) => setNewMedication({...newMedication, dosage: text})}
                  />
                </View>

                <View style={styles.formGroup}>
                  <ThemedText style={styles.label}>Instructions</ThemedText>
                  <TextInput
                    style={[styles.input, { borderColor: colors.border, color: colors.text }]}
                    placeholder="e.g., Take with food, etc."
                    placeholderTextColor={colors.secondaryText}
                    value={newMedication.instructions}
                    onChangeText={(text) => setNewMedication({...newMedication, instructions: text})}
                  />
                </View>

                <View style={styles.formGroup}>
                  <ThemedText style={styles.label}>Time of Day</ThemedText>
                  <View style={styles.timeOfDayContainer}>
                    {(['morning', 'afternoon', 'evening', 'night'] as TimeOfDay[]).map((time) => (
                      <TouchableOpacity
                        key={time}
                        style={[
                          styles.timeOfDayOption,
                          newMedication.timeOfDay === time && styles.timeOfDaySelected,
                          { borderColor: colors.border }
                        ]}
                        onPress={() => setNewMedication({...newMedication, timeOfDay: time})}
                      >
                        <ThemedText style={[
                          styles.timeOfDayText,
                          newMedication.timeOfDay === time && { color: colors.primary }
                        ]}>
                          {time.charAt(0).toUpperCase() + time.slice(1)}
                        </ThemedText>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <ThemedText style={styles.label}>Specific Time</ThemedText>
                  <TouchableOpacity
                    style={[styles.timeSelector, { borderColor: colors.border }]}
                    onPress={() => setIsTimePickerVisible(true)}
                  >
                    <Ionicons name="time-outline" size={20} color={colors.primary} style={styles.timeIcon} />
                    <ThemedText>{newMedication.time}</ThemedText>
                  </TouchableOpacity>
                </View>

                <View style={styles.formGroup}>
                  <ThemedText style={styles.label}>Frequency</ThemedText>
                  <View style={styles.frequencyContainer}>
                    <FlatList
                      data={[
                        { id: 'daily', label: 'Daily' },
                        { id: 'weekdays', label: 'Weekdays' },
                        { id: 'weekends', label: 'Weekends' },
                        { id: 'weekly', label: 'Weekly' },
                        { id: 'monthly', label: 'Monthly' },
                        { id: 'as_needed', label: 'As Needed' }
                      ]}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          style={[
                            styles.frequencyOption,
                            newMedication.frequency === item.id && styles.frequencySelected,
                            { borderColor: colors.border }
                          ]}
                          onPress={() => setNewMedication({...newMedication, frequency: item.id as Frequency})}
                        >
                          <ThemedText style={[
                            styles.frequencyText,
                            newMedication.frequency === item.id && { color: colors.primary }
                          ]}>
                            {item.label}
                          </ThemedText>
                        </TouchableOpacity>
                      )}
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      keyExtractor={item => item.id}
                    />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <View style={styles.switchRow}>
                    <ThemedText style={styles.label}>Refill Reminder</ThemedText>
                    <Switch
                      value={newMedication.refillReminder}
                      onValueChange={(value) => setNewMedication({...newMedication, refillReminder: value})}
                      trackColor={{ false: colors.border, true: colors.primary + '70' }}
                      thumbColor={newMedication.refillReminder ? colors.primary : '#f4f3f4'}
                    />
                  </View>
                  
                  {newMedication.refillReminder && (
                    <TouchableOpacity
                      style={[styles.dateSelector, { borderColor: colors.border }]}
                      onPress={() => setIsRefillDatePickerVisible(true)}
                    >
                      <Ionicons name="calendar-outline" size={20} color={colors.primary} style={styles.timeIcon} />
                      <ThemedText>
                        {newMedication.refillDate || 'Select refill date'}
                      </ThemedText>
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.formGroup}>
                  <ThemedText style={styles.label}>Notes</ThemedText>
                  <TextInput
                    style={[styles.textArea, { borderColor: colors.border, color: colors.text }]}
                    placeholder="Enter any additional notes"
                    placeholderTextColor={colors.secondaryText}
                    value={newMedication.notes}
                    onChangeText={(text) => setNewMedication({...newMedication, notes: text})}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>
              </ScrollView>

              <View style={styles.modalFooter}>
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={() => setIsAddModalVisible(false)}
                  style={styles.footerButton}
                />
                <Button
                  title="Add Medication"
                  onPress={() => handleAddMedication(newMedication as Omit<Medication, 'id'>)}
                  style={styles.footerButton}
                />
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Time Picker */}
        <DateTimePickerModal
          isVisible={isTimePickerVisible}
          mode="time"
          date={new Date()}
          onConfirm={handleTimeConfirm}
          onCancel={() => setIsTimePickerVisible(false)}
        />

        {/* Refill Date Picker */}
        <DateTimePickerModal
          isVisible={isRefillDatePickerVisible}
          mode="date"
          date={new Date()}
          minimumDate={new Date()}
          onConfirm={handleRefillDateConfirm}
          onCancel={() => setIsRefillDatePickerVisible(false)}
        />
      </ScrollView>
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
  dateContainer: {
    marginVertical: Spacing.md,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: Spacing.lg,
  },
  tabButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Layout.borderRadiusMd,
    marginRight: Spacing.sm,
  },
  activeTabButton: {
    backgroundColor: '#008080' + '20',
  },
  timeGroup: {
    marginBottom: Spacing.xl,
  },
  timeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  medicationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  medicationInfo: {
    flex: 1,
  },
  medicationTaken: {
    opacity: 0.7,
  },
  refillReminder: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  comingSoon: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    marginTop: Spacing.xl,
  },
  comingSoonText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: Spacing.md,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalScrollContent: {
    marginVertical: Spacing.md,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  formGroup: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: Spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: Spacing.sm,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: Spacing.sm,
    fontSize: 16,
    minHeight: 100,
  },
  timeOfDayContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: Spacing.xs,
  },
  timeOfDayOption: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  timeOfDaySelected: {
    backgroundColor: 'rgba(0,128,128,0.1)',
    borderColor: '#008080',
  },
  timeOfDayText: {
    fontSize: 14,
  },
  timeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: Spacing.sm,
  },
  timeIcon: {
    marginRight: Spacing.sm,
  },
  frequencyContainer: {
    marginTop: Spacing.xs,
  },
  frequencyOption: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: Spacing.sm,
  },
  frequencySelected: {
    backgroundColor: 'rgba(0,128,128,0.1)',
    borderColor: '#008080',
  },
  frequencyText: {
    fontSize: 14,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: Spacing.sm,
  },
  footerButton: {
    flex: 1,
    marginHorizontal: Spacing.xs,
  },
  addFromPreviousContainer: {
    marginBottom: Spacing.md,
  },
  previousMedsContainer: {
    marginBottom: Spacing.xl,
  },
  previousMedCard: {
    marginBottom: Spacing.sm,
  },
}); 