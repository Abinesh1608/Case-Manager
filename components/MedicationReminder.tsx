import React, { useState } from 'react';
import { 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  Modal,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { ThemedText } from './ThemedText';
import { Card } from './Card';
import { Button } from './Button';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  schedule: string;
  time: string;
  notes?: string;
  taken: boolean;
}

interface MedicationReminderProps {
  medications: Medication[];
  onTakeMedication: (id: string) => void;
  onAddMedication: (medication: Omit<Medication, 'id' | 'taken'>) => void;
}

export function MedicationReminder({ medications, onTakeMedication, onAddMedication }: MedicationReminderProps) {
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [medicationName, setMedicationName] = useState('');
  const [dosage, setDosage] = useState('');
  const [schedule, setSchedule] = useState('');
  const [time, setTime] = useState('08:00 AM');
  const [notes, setNotes] = useState('');

  const scheduleOptions = ['Daily', 'Morning', 'Afternoon', 'Evening', 'As needed'];

  const handleAddMedication = () => {
    if (!medicationName || !dosage || !schedule) {
      alert('Please fill out all required fields');
      return;
    }

    onAddMedication({
      name: medicationName,
      dosage,
      schedule,
      time,
      notes
    });

    // Reset form
    setMedicationName('');
    setDosage('');
    setSchedule('');
    setTime('08:00 AM');
    setNotes('');
    setIsAddModalVisible(false);
  };

  // Calculate today's medications (ones that are due today)
  const todayMedications = medications.filter(med => !med.taken);
  const completedMedications = medications.filter(med => med.taken);

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <ThemedText style={styles.headerTitle}>Medication Reminders</ThemedText>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => setIsAddModalVisible(true)}
        >
          <Ionicons name="add-circle" size={24} color={Colors.light.medication} />
          <ThemedText style={styles.addButtonText}>Add Medication</ThemedText>
        </TouchableOpacity>
      </View>

      {todayMedications.length === 0 ? (
        <Card style={styles.emptyStateCard}>
          <Ionicons name="checkmark-circle" size={40} color={Colors.light.wellness} />
          <ThemedText style={styles.emptyStateText}>All medications taken for today!</ThemedText>
        </Card>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.medicationScroll}>
          {todayMedications.map((medication) => (
            <Card key={medication.id} variant="medication" style={styles.medicationCard}>
              <View style={styles.medicationHeader}>
                <ThemedText style={styles.medicationTime}>{medication.time}</ThemedText>
                <ThemedText style={styles.medicationSchedule}>{medication.schedule}</ThemedText>
              </View>
              <ThemedText style={styles.medicationName}>{medication.name}</ThemedText>
              <ThemedText style={styles.medicationDosage}>{medication.dosage}</ThemedText>
              {medication.notes && (
                <ThemedText style={styles.medicationNotes}>{medication.notes}</ThemedText>
              )}
              <Button
                title="Take Now"
                onPress={() => onTakeMedication(medication.id)}
                icon={<Ionicons name="checkmark-circle" size={16} color="#fff" />}
                style={styles.takeButton}
              />
            </Card>
          ))}
        </ScrollView>
      )}

      {completedMedications.length > 0 && (
        <View style={styles.completedSection}>
          <ThemedText style={styles.sectionTitle}>Completed</ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.medicationScroll}>
            {completedMedications.map((medication) => (
              <Card key={medication.id} variant="medication" style={[styles.medicationCard, styles.completedCard]}>
                <View style={styles.medicationHeader}>
                  <ThemedText style={styles.medicationTime}>{medication.time}</ThemedText>
                  <ThemedText style={styles.medicationSchedule}>{medication.schedule}</ThemedText>
                </View>
                <ThemedText style={styles.medicationName}>{medication.name}</ThemedText>
                <ThemedText style={styles.medicationDosage}>{medication.dosage}</ThemedText>
                <View style={styles.takenIndicator}>
                  <Ionicons name="checkmark-circle" size={16} color={Colors.light.wellness} />
                  <ThemedText style={styles.takenText}>Taken</ThemedText>
                </View>
              </Card>
            ))}
          </ScrollView>
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
          style={styles.centeredView}
        >
          <View style={styles.modalView}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Add Medication</ThemedText>
              <TouchableOpacity onPress={() => setIsAddModalVisible(false)}>
                <Ionicons name="close-circle-outline" size={24} color={Colors.light.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <ThemedText style={styles.label}>Medication Name *</ThemedText>
                <TextInput
                  style={styles.input}
                  placeholder="Enter medication name"
                  value={medicationName}
                  onChangeText={setMedicationName}
                />
              </View>

              <View style={styles.formGroup}>
                <ThemedText style={styles.label}>Dosage *</ThemedText>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 10mg, 1 tablet"
                  value={dosage}
                  onChangeText={setDosage}
                />
              </View>

              <View style={styles.formGroup}>
                <ThemedText style={styles.label}>Schedule *</ThemedText>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Daily, With meals"
                  value={schedule}
                  onChangeText={setSchedule}
                />
              </View>

              <View style={styles.formGroup}>
                <ThemedText style={styles.label}>Time</ThemedText>
                <TextInput
                  style={styles.input}
                  placeholder="HH:MM AM/PM"
                  value={time}
                  onChangeText={setTime}
                />
              </View>

              <View style={styles.formGroup}>
                <ThemedText style={styles.label}>Notes</ThemedText>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Additional instructions or notes"
                  value={notes}
                  onChangeText={setNotes}
                  multiline={true}
                  numberOfLines={4}
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
                title="Add" 
                onPress={handleAddMedication}
                style={styles.footerButton}
                color={Colors.light.medication}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addButtonText: {
    color: Colors.light.medication,
    marginLeft: 4,
  },
  medicationScroll: {
    flexGrow: 0,
  },
  medicationCard: {
    width: 180,
    marginRight: Spacing.md,
    paddingVertical: Spacing.md,
  },
  completedCard: {
    opacity: 0.7,
  },
  medicationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  medicationTime: {
    fontSize: 14,
    color: Colors.light.text,
  },
  medicationSchedule: {
    fontSize: 12,
    color: Colors.light.medication,
    backgroundColor: Colors.light.medication + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 10,
  },
  medicationName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  medicationDosage: {
    fontSize: 14,
    marginBottom: Spacing.sm,
  },
  medicationNotes: {
    fontSize: 12,
    color: Colors.light.secondaryText,
    marginBottom: Spacing.sm,
  },
  takeButton: {
    marginTop: Spacing.xs,
  },
  emptyStateCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  emptyStateText: {
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  completedSection: {
    marginTop: Spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  takenIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  takenText: {
    marginLeft: 4,
    fontSize: 14,
    color: Colors.light.wellness,
  },
  // Modal styles
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: 'white',
    borderRadius: 10,
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
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalBody: {
    padding: Spacing.md,
    maxHeight: '70%',
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
  label: {
    marginBottom: Spacing.xs,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    padding: Spacing.md,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  footerButton: {
    flex: 1,
    marginHorizontal: Spacing.xs,
  },
}); 