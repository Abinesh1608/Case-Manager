import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';

interface DatePickerFallbackProps {
  value: Date;
  onChange: (event: any, date?: Date) => void;
  mode?: 'date' | 'time';
  display?: string;
  maximumDate?: Date;
  minimumDate?: Date;
}

const DatePickerFallback: React.FC<DatePickerFallbackProps> = ({
  value,
  onChange,
  mode = 'date',
  maximumDate,
  minimumDate
}) => {
  const [showModal, setShowModal] = useState(false);
  const [tempDate, setTempDate] = useState(value || new Date());
  
  const formatDate = (date: Date): string => {
    if (mode === 'date') {
      return date.toLocaleDateString();
    } else if (mode === 'time') {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleString();
  };

  const handleChange = (newDate: Date) => {
    setTempDate(newDate);
    onChange({ type: 'set', nativeEvent: { timestamp: newDate.getTime() } }, newDate);
    setShowModal(false);
  };

  // Generate time slots for the time picker
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute of [0, 30]) {
        const date = new Date(tempDate);
        date.setHours(hour, minute, 0, 0);
        slots.push(date);
      }
    }
    return slots;
  };

  // Generate days for the date picker
  const generateDays = () => {
    const days = [];
    const currentDate = new Date();
    const startDate = minimumDate || new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endDate = maximumDate || new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 0);

    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      days.push(new Date(date));
    }
    return days;
  };

  return (
    <View>
      <TouchableOpacity 
        onPress={() => setShowModal(true)}
        style={styles.button}
      >
        <Ionicons 
          name={mode === 'date' ? 'calendar-outline' : 'time-outline'} 
          size={24} 
          color={Colors.light.primary} 
        />
        <Text style={styles.buttonText}>{formatDate(value)}</Text>
      </TouchableOpacity>

      <Modal
        visible={showModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {mode === 'date' ? 'Select Date' : 'Select Time'}
            </Text>
            
            <ScrollView style={styles.optionsContainer}>
              {mode === 'date' ? (
                // Date selection
                <View style={styles.dateGrid}>
                  {generateDays().map((date, index) => (
                    <TouchableOpacity 
                      key={`date-${index}`}
                      style={[
                        styles.dateButton,
                        date.toDateString() === tempDate.toDateString() && styles.selectedButton
                      ]}
                      onPress={() => handleChange(date)}
                    >
                      <Text 
                        style={[
                          styles.dateText,
                          date.toDateString() === tempDate.toDateString() && styles.selectedText
                        ]}
                      >
                        {date.getDate()}
                      </Text>
                      <Text style={styles.monthText}>
                        {date.toLocaleDateString(undefined, { month: 'short' })}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                // Time selection
                <View style={styles.timeGrid}>
                  {generateTimeSlots().map((time, index) => (
                    <TouchableOpacity 
                      key={`time-${index}`}
                      style={[
                        styles.timeButton,
                        time.getHours() === tempDate.getHours() && 
                        time.getMinutes() === tempDate.getMinutes() && 
                        styles.selectedButton
                      ]}
                      onPress={() => handleChange(time)}
                    >
                      <Text 
                        style={[
                          styles.timeText,
                          time.getHours() === tempDate.getHours() && 
                          time.getMinutes() === tempDate.getMinutes() && 
                          styles.selectedText
                        ]}
                      >
                        {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </ScrollView>
            
            <TouchableOpacity 
              onPress={() => setShowModal(false)}
              style={styles.closeButton}
            >
              <Text style={styles.closeText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: 8,
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  buttonText: {
    marginLeft: 8,
    fontSize: 16,
    color: Colors.light.text,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    color: Colors.light.text,
  },
  optionsContainer: {
    width: '100%',
    maxHeight: 400,
  },
  dateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  dateButton: {
    width: '23%',
    margin: '1%',
    padding: 10,
    borderRadius: 8,
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: Colors.light.border,
    alignItems: 'center',
    marginBottom: 10,
  },
  dateText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  monthText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  timeButton: {
    width: '31%',
    margin: '1%',
    padding: 10,
    borderRadius: 8,
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: Colors.light.border,
    alignItems: 'center',
    marginBottom: 10,
  },
  timeText: {
    fontSize: 16,
    color: Colors.light.text,
  },
  selectedButton: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  selectedText: {
    color: 'white',
  },
  closeButton: {
    marginTop: 20,
    padding: 12,
    backgroundColor: Colors.light.primary,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  closeText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default DatePickerFallback; 