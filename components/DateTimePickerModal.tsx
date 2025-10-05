import React, { useState } from 'react';
import { Modal, View, Platform, StyleSheet, TouchableOpacity } from 'react-native';
import DateTimePicker from './DatePickerPolyfill';
import { ThemedText } from './ThemedText';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

interface DateTimePickerModalProps {
  isVisible: boolean;
  mode: 'date' | 'time' | 'datetime';
  date: Date;
  minimumDate?: Date;
  maximumDate?: Date;
  onConfirm: (date: Date) => void;
  onCancel: () => void;
}

// Function component with named export
export function DateTimePickerModal({
  isVisible,
  mode = 'date',
  date,
  minimumDate,
  maximumDate,
  onConfirm,
  onCancel,
}: DateTimePickerModalProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const [selectedDate, setSelectedDate] = useState(date || new Date());

  // Handle date change
  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      if (event.type === 'dismissed') {
        onCancel();
        return;
      }
      if (selectedDate) {
        setSelectedDate(selectedDate);
        onConfirm(selectedDate);
      }
    } else {
      if (selectedDate) {
        setSelectedDate(selectedDate);
      }
    }
  };

  // Confirm button for iOS
  const handleConfirm = () => {
    onConfirm(selectedDate);
  };

  if (Platform.OS === 'android') {
    if (!isVisible) return null;
    
    return (
      <DateTimePicker
        value={selectedDate}
        mode={mode as any}
        is24Hour={false}
        display="default"
        onChange={handleDateChange}
        minimumDate={minimumDate}
        maximumDate={maximumDate}
      />
    );
  }

  // iOS implementation with modal
  return (
    <Modal
      transparent={true}
      animationType="slide"
      visible={isVisible}
      onRequestClose={onCancel}
    >
      <View style={styles.centeredView}>
        <View style={[styles.modalView, { backgroundColor: colors.card }]}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onCancel}>
              <ThemedText style={styles.buttonText}>Cancel</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleConfirm}>
              <ThemedText style={[styles.buttonText, { color: colors.primary }]}>Confirm</ThemedText>
            </TouchableOpacity>
          </View>
          
          <DateTimePicker
            value={selectedDate}
            mode={mode as any}
            is24Hour={false}
            display="spinner"
            onChange={(event, date) => date && setSelectedDate(date)}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            style={styles.picker}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalView: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  picker: {
    height: 200,
  },
});

// Default export for Expo Router compatibility
export default DateTimePickerModal; 