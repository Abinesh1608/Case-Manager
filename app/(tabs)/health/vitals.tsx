import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  Modal, 
  TextInput, 
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator
} from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import Colors from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing, Layout } from '@/constants/Spacing';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { Stack } from 'expo-router';
import { useAuth } from '../../../contexts/AuthContext';
import { listenToVitals, addVital } from '../../../services/firestoreService';
import { DateTimePickerModal } from '../../../components/DateTimePickerModal';
import { LineChart } from 'react-native-chart-kit';
import { format, parseISO, isValid } from 'date-fns';

// Define vital types and interfaces
type VitalType = 'Blood Pressure' | 'Blood Sugar' | 'Weight' | 'Heart Rate' | 'Temperature' | 'Oxygen Saturation' | 'Custom';

interface Vital {
  id: string;
  type: string;
  value: string;
  unit?: string;
  date: string;
  time: string;
  notes?: string;
}

// Add the missing DUMMY_VITALS constant
const DUMMY_VITALS: Vital[] = [
  {
    id: 'dummy-bp-1',
    type: 'Blood Pressure',
    value: '120/80',
    unit: 'mmHg',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
    notes: 'Sample reading'
  },
  {
    id: 'dummy-bs-1',
    type: 'Blood Sugar',
    value: '100',
    unit: 'mg/dL',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
    notes: 'Fasting'
  },
  {
    id: 'dummy-weight-1',
    type: 'Weight',
    value: '70',
    unit: 'kg',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
  },
  {
    id: 'dummy-hr-1',
    type: 'Heart Rate',
    value: '72',
    unit: 'bpm',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
  },
  {
    id: 'dummy-temp-1',
    type: 'Temperature',
    value: '36.8',
    unit: '°C',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
  },
  {
    id: 'dummy-oxygen-1',
    type: 'Oxygen Saturation',
    value: '98',
    unit: '%',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
  }
];

// Define vital ranges for visualization
const VITAL_RANGES = {
  BLOOD_PRESSURE: {
    NORMAL: { min: 90, max: 120, diastolicMin: 60, diastolicMax: 80 },
    ELEVATED: { min: 120, max: 129, diastolicMin: 60, diastolicMax: 80 },
    HYPERTENSION_1: { min: 130, max: 139, diastolicMin: 80, diastolicMax: 89 },
    HYPERTENSION_2: { min: 140, max: 180, diastolicMin: 90, diastolicMax: 120 }
  },
  BLOOD_SUGAR: {
    NORMAL_FASTING: { min: 70, max: 100 },
    PREDIABETES_FASTING: { min: 100, max: 125 },
    DIABETES_FASTING: { min: 126, max: 200 }
  },
  HEART_RATE: {
    NORMAL: { min: 60, max: 100 }
  },
  OXYGEN_SATURATION: {
    NORMAL: { min: 95, max: 100 },
    LOW: { min: 90, max: 94 },
    SEVERE_LOW: { min: 0, max: 89 }
  },
  TEMPERATURE: {
    NORMAL: { min: 36.1, max: 37.2 },
    FEVER: { min: 37.3, max: 40 }
  }
};

// Helper function to parse blood pressure string to numbers
const parseBloodPressure = (bpString: string) => {
  const parts = bpString.split('/');
  if (parts.length === 2) {
    const systolic = parseInt(parts[0], 10);
    const diastolic = parseInt(parts[1], 10);
    if (!isNaN(systolic) && !isNaN(diastolic)) {
      return { systolic, diastolic };
    }
  }
  return null;
};

// Helper function to format date and time
const formatDateTime = (date: string, time: string) => {
  try {
    // Try to parse the date
    const parsedDate = parseISO(date);
    if (!isValid(parsedDate)) {
      return `${date} ${time}`;
    }
    
    // Format date to more readable format
    const formattedDate = format(parsedDate, 'MMM d, yyyy');
    return `${formattedDate} at ${time}`;
  } catch (error) {
    return `${date} ${time}`;
  }
};

// Component to show a range indicator visualization
function RangeIndicator({ value, ranges, unit }) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  
  // Find the range this value falls into
  const matchedRange = ranges.find(range => {
    const hasMin = range.min !== undefined;
    const hasMax = range.max !== undefined;
    
    if (hasMin && hasMax) {
      return value >= range.min && value <= range.max;
    } else if (hasMin) {
      return value >= range.min;
    } else if (hasMax) {
      return value <= range.max;
    }
    
    return false;
  });
  
  if (!matchedRange) return null;
  
  return (
    <View style={styles.rangeIndicator}>
      <View style={[styles.rangeBadge, { backgroundColor: matchedRange.color }]}>
        <Text style={styles.rangeLabel}>{matchedRange.label}</Text>
      </View>
      <Text style={[Typography.small, { color: colors.secondaryText }]}>
        {value} {unit}
      </Text>
    </View>
  );
}

// Blood pressure visualization component
function BloodPressureVisual({ systolic, diastolic }) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  
  const getSystolicCategory = () => {
    if (systolic < VITAL_RANGES.BLOOD_PRESSURE.NORMAL.min) return { label: 'Low', color: colors.info };
    if (systolic <= VITAL_RANGES.BLOOD_PRESSURE.NORMAL.max) return { label: 'Normal', color: colors.success };
    if (systolic <= VITAL_RANGES.BLOOD_PRESSURE.ELEVATED.max) return { label: 'Elevated', color: '#FFC107' }; // Amber
    if (systolic <= VITAL_RANGES.BLOOD_PRESSURE.HYPERTENSION_1.max) return { label: 'Stage 1', color: colors.warning };
    return { label: 'Stage 2', color: colors.error };
  };
  
  const getDiastolicCategory = () => {
    if (diastolic < VITAL_RANGES.BLOOD_PRESSURE.NORMAL.diastolicMin) return { label: 'Low', color: colors.info };
    if (diastolic <= VITAL_RANGES.BLOOD_PRESSURE.NORMAL.diastolicMax) return { label: 'Normal', color: colors.success };
    if (diastolic <= VITAL_RANGES.BLOOD_PRESSURE.HYPERTENSION_1.diastolicMax) return { label: 'Stage 1', color: colors.warning };
    return { label: 'Stage 2', color: colors.error };
  };
  
  const systolicCategory = getSystolicCategory();
  const diastolicCategory = getDiastolicCategory();
  
  // Use the more severe category for the overall status
  const overallCategory = 
    systolicCategory.label === 'Stage 2' || diastolicCategory.label === 'Stage 2' ? { label: 'Stage 2 Hypertension', color: colors.error } :
    systolicCategory.label === 'Stage 1' || diastolicCategory.label === 'Stage 1' ? { label: 'Stage 1 Hypertension', color: colors.warning } :
    systolicCategory.label === 'Elevated' ? { label: 'Elevated', color: '#FFC107' } :
    { label: 'Normal', color: colors.success };
  
  return (
    <View style={styles.bpVisualContainer}>
      <View style={[styles.bpStatusBadge, { backgroundColor: overallCategory.color }]}>
        <Text style={styles.bpStatusText}>{overallCategory.label}</Text>
      </View>
      
      <View style={styles.bpReadings}>
        <View style={styles.bpReading}>
          <Text style={[Typography.small, { color: colors.secondaryText }]}>Systolic</Text>
          <Text style={[Typography.bodyBold, { color: systolicCategory.color }]}>{systolic}</Text>
        </View>
        
        <View style={styles.bpReading}>
          <Text style={[Typography.small, { color: colors.secondaryText }]}>Diastolic</Text>
          <Text style={[Typography.bodyBold, { color: diastolicCategory.color }]}>{diastolic}</Text>
        </View>
      </View>
    </View>
  );
}

interface VitalCategoryProps {
  title: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  latestVital?: Vital | null;
  color: string;
  onPress: () => void;
}

// Component for displaying vital category cards
function VitalCategory({ title, icon, latestVital, color, onPress }: VitalCategoryProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  const renderVisualization = () => {
    if (!latestVital) return null;

    const numericValue = parseFloat(latestVital.value.replace(/[^0-9.]/g, ''));

    switch (latestVital.type) {
      case 'Blood Pressure':
        const bp = parseBloodPressure(latestVital.value);
        return bp ? <BloodPressureVisual systolic={bp.systolic} diastolic={bp.diastolic} /> : null;
      case 'Blood Sugar':
        // Basic example for fasting - needs context (e.g., time of day, meals)
        return <RangeIndicator value={numericValue} ranges={[
          { max: VITAL_RANGES.BLOOD_SUGAR.NORMAL_FASTING.min -1, color: colors.info, label: 'Low' },
          { min: VITAL_RANGES.BLOOD_SUGAR.NORMAL_FASTING.min, max: VITAL_RANGES.BLOOD_SUGAR.NORMAL_FASTING.max, color: colors.success, label: 'Normal (Fasting)' },
          { min: VITAL_RANGES.BLOOD_SUGAR.NORMAL_FASTING.max + 1, color: colors.warning, label: 'High (Fasting)' },
        ]} unit={latestVital.unit} />;
      case 'Heart Rate':
        return <RangeIndicator value={numericValue} ranges={[
          { max: VITAL_RANGES.HEART_RATE.NORMAL.min - 1, color: colors.info, label: 'Low' },
          { min: VITAL_RANGES.HEART_RATE.NORMAL.min, max: VITAL_RANGES.HEART_RATE.NORMAL.max, color: colors.success, label: 'Normal' },
          { min: VITAL_RANGES.HEART_RATE.NORMAL.max + 1, color: colors.warning, label: 'High' },
        ]} unit={latestVital.unit} />;
      case 'Oxygen Saturation':
         return <RangeIndicator value={numericValue} ranges={[
          { max: VITAL_RANGES.OXYGEN_SATURATION.LOW.max, color: colors.warning, label: 'Low' },
          { min: VITAL_RANGES.OXYGEN_SATURATION.NORMAL.min, max: VITAL_RANGES.OXYGEN_SATURATION.NORMAL.max, color: colors.success, label: 'Normal' },
        ]} unit={latestVital.unit} />;
      case 'Temperature':
        return <RangeIndicator value={numericValue} ranges={[
          { max: VITAL_RANGES.TEMPERATURE.NORMAL.min - 0.1, color: colors.info, label: 'Low' },
          { min: VITAL_RANGES.TEMPERATURE.NORMAL.min, max: VITAL_RANGES.TEMPERATURE.NORMAL.max, color: colors.success, label: 'Normal' },
          { min: VITAL_RANGES.TEMPERATURE.FEVER.min, color: colors.warning, label: 'Fever' },
        ]} unit={latestVital.unit} />;
      // Add cases for Weight, Custom, etc.
      default:
        return null;
    }
  };

  return (
    <Card style={styles.categoryCard} onPress={onPress}>
      <View style={styles.categoryHeader}>
        <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
          <Ionicons name={icon} size={Layout.contentIconSize} color={color} />
        </View>
        <View style={styles.categoryTitleContainer}>
          <Text style={[Typography.sectionHeader, { color: colors.text }]}>
            {title}
          </Text>
          {latestVital && (
            <Text style={[Typography.label, { color: colors.secondaryText }]}>
              {formatDateTime(latestVital.date, latestVital.time)}
            </Text>
          )}
        </View>
      </View>
      
      <View style={styles.readingContainer}>
        {latestVital ? (
          <View style={styles.latestReading}>
            <Text style={[styles.readingValue, { color: colors.text }]}>
              {latestVital.value}
            </Text>
            {latestVital.unit && (
              <Text style={[styles.readingUnit, { color: colors.secondaryText }]}>
                {latestVital.unit}
              </Text>
            )}
          </View>
        ) : (
          <Text style={[Typography.bodyText, { color: colors.secondaryText }]}>
            No readings yet
          </Text>
        )}
      </View>
      
      {renderVisualization()}

      <View style={styles.categoryFooter}>
        <Text style={[Typography.label, { color: colors.primary }]}>
          View history
        </Text>
        <Ionicons name="chevron-forward" size={16} color={colors.primary} />
      </View>
    </Card>
  );
}

// Component for displaying specific vital history with chart
function VitalHistoryModal({ 
  visible, 
  onClose, 
  vitalType, 
  vitals, 
  onAddReading 
}: { 
  visible: boolean; 
  onClose: () => void; 
  vitalType: string; 
  vitals: Vital[];
  onAddReading: () => void;
}) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const filteredVitals = vitals.filter(v => v.type === vitalType).sort((a, b) => 
    new Date(a.date + ' ' + a.time).getTime() - new Date(b.date + ' ' + b.time).getTime()
  );
  
  // Get chart data for the selected vital type
  const getChartData = () => {
    // For blood pressure, we need to handle the systolic/diastolic format
    if (vitalType === 'Blood Pressure') {
      const labels = filteredVitals.slice(-7).map(v => v.date.split('-')[2]); // Day of month
      const systolicData = filteredVitals.slice(-7).map(v => {
        const parts = v.value.split('/');
        return parseInt(parts[0], 10);
      });
      const diastolicData = filteredVitals.slice(-7).map(v => {
        const parts = v.value.split('/');
        return parseInt(parts[1], 10);
      });
      
      return {
        labels,
        datasets: [
          {
            data: systolicData,
            color: (opacity = 1) => `rgba(220, 20, 60, ${opacity})`, // Crimson for systolic
            strokeWidth: 2
          },
          {
            data: diastolicData,
            color: (opacity = 1) => `rgba(70, 130, 180, ${opacity})`, // Steel blue for diastolic
            strokeWidth: 2
          }
        ],
        legend: ['Systolic', 'Diastolic']
      };
    } else {
      // For other vital types that have simple numeric values
      const labels = filteredVitals.slice(-7).map(v => v.date.split('-')[2]); // Day of month
      const data = filteredVitals.slice(-7).map(v => {
        // Remove any non-numeric characters except decimal point
        const numericValue = v.value.replace(/[^0-9.]/g, '');
        return parseFloat(numericValue);
      });
      
      return {
        labels,
        datasets: [
          {
            data: data.length > 0 ? data : [0],
            color: (opacity = 1) => `rgba(0, 128, 128, ${opacity})`, // Teal
            strokeWidth: 2
          }
        ],
        legend: [vitalType]
      };
    }
  };
  
  const getVitalIcon = () => {
    switch (vitalType) {
      case 'Blood Pressure': return 'heart';
      case 'Blood Sugar': return 'water';
      case 'Weight': return 'body';
      case 'Heart Rate': return 'pulse';
      case 'Temperature': return 'thermometer';
      case 'Oxygen Saturation': return 'medical';
      default: return 'clipboard';
    }
  };
  
  const getUnit = () => {
    switch (vitalType) {
      case 'Blood Pressure': return 'mmHg';
      case 'Blood Sugar': return 'mg/dL';
      case 'Weight': return 'kg';
      case 'Heart Rate': return 'bpm';
      case 'Temperature': return '°C';
      case 'Oxygen Saturation': return '%';
      default: return '';
    }
  };
  
  return (
    <Modal
      animationType="slide"
      transparent={false}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[Typography.title, { color: colors.text }]}>
            {vitalType} History
          </Text>
          <View style={{ width: 24 }} />
        </View>
        
        <ScrollView style={styles.modalContent}>
          {filteredVitals.length > 0 ? (
            <>
              <View style={styles.chartContainer}>
                <LineChart
                  data={getChartData()}
                  width={Dimensions.get('window').width - Spacing.lg * 2}
                  height={220}
                  chartConfig={{
                    backgroundColor: colors.card,
                    backgroundGradientFrom: colors.card,
                    backgroundGradientTo: colors.card,
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(0, 128, 128, ${opacity})`,
                    labelColor: (opacity = 1) => colors.text,
                    style: {
                      borderRadius: 16,
                    },
                    propsForDots: {
                      r: '6',
                      strokeWidth: '2',
                      stroke: colors.primary,
                    },
                  }}
                  bezier
                  style={styles.chart}
                />
              </View>
              
              {filteredVitals.map((vital, index) => (
                <Card key={vital.id} style={styles.vitalHistoryCard}>
                  <View style={styles.vitalHistoryHeader}>
                    <View style={styles.vitalHistoryDate}>
                      <Ionicons name="calendar" size={16} color={colors.secondaryText} />
                      <Text style={[styles.vitalHistoryDateText, { color: colors.text }]}>
                        {vital.date} at {vital.time}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.vitalHistoryBody}>
                    <View style={styles.vitalHistoryValue}>
                      <Ionicons name={getVitalIcon()} size={20} color={colors.primary} />
                      <Text style={[styles.vitalHistoryValueText, { color: colors.text }]}>
                        {vital.value} {getUnit()}
                      </Text>
                    </View>
                    
                    {vital.notes && (
                      <Text style={[styles.vitalHistoryNotes, { color: colors.secondaryText }]}>
                        {vital.notes}
                      </Text>
                    )}
                  </View>
                </Card>
              ))}
            </>
          ) : (
            <View style={styles.emptyStateContainer}>
              <Ionicons name={getVitalIcon()} size={64} color={colors.secondaryText} />
              <Text style={[Typography.bodyText, { color: colors.text, textAlign: 'center', marginTop: Spacing.md }]}>
                No {vitalType.toLowerCase()} readings recorded yet.
              </Text>
            </View>
          )}
        </ScrollView>
        
        <Button
          title={`Add New ${vitalType} Reading`}
          onPress={onAddReading}
          icon="add"
          style={styles.addButton}
        />
      </View>
    </Modal>
  );
}

// Component for adding new vital readings
function AddVitalModal({ 
  visible, 
  onClose, 
  vitalType, 
  onSave 
}: { 
  visible: boolean; 
  onClose: () => void; 
  vitalType: string; 
  onSave: (vital: Omit<Vital, 'id'>) => void;
}) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const [value, setValue] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(
    new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
  );
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [isTimePickerVisible, setTimePickerVisible] = useState(false);
  
  const getVitalPlaceholder = () => {
    switch (vitalType) {
      case 'Blood Pressure': return '120/80';
      case 'Blood Sugar': return '100';
      case 'Weight': return '70';
      case 'Heart Rate': return '75';
      case 'Temperature': return '37.0';
      case 'Oxygen Saturation': return '98';
      default: return '';
    }
  };
  
  const getUnit = () => {
    switch (vitalType) {
      case 'Blood Pressure': return 'mmHg';
      case 'Blood Sugar': return 'mg/dL';
      case 'Weight': return 'kg';
      case 'Heart Rate': return 'bpm';
      case 'Temperature': return '°C';
      case 'Oxygen Saturation': return '%';
      default: return '';
    }
  };
  
  const handleSave = () => {
    if (!value.trim()) {
      Alert.alert('Error', 'Please enter a valid reading');
      return;
    }
    
    onSave({
      type: vitalType,
      value,
      date,
      time,
      notes,
      unit: getUnit(),
    });
    
    // Reset form
    setValue('');
    setNotes('');
    onClose();
  };
  
  const handleDateConfirm = (selectedDate: Date) => {
    setDatePickerVisible(false);
    setDate(selectedDate.toISOString().split('T')[0]);
  };
  
  const handleTimeConfirm = (selectedDate: Date) => {
    setTimePickerVisible(false);
    setTime(
      selectedDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
    );
  };
  
  return (
    <Modal
      animationType="slide"
      transparent={false}
      visible={visible}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.modalContainer, { backgroundColor: colors.background }]}
      >
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={{ color: colors.text }}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[Typography.title, { color: colors.text }]}>
            Add {vitalType} Reading
          </Text>
          <TouchableOpacity onPress={handleSave}>
            <Text style={{ color: colors.primary, fontWeight: 'bold' }}>Save</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.modalContent}>
          <View style={styles.formGroup}>
            <Text style={[Typography.label, { color: colors.text }]}>
              {vitalType} Value {getUnit() ? `(${getUnit()})` : ''}
            </Text>
            <TextInput
              style={[styles.input, { 
                color: colors.text, 
                borderColor: colors.border, 
                backgroundColor: colors.card 
              }]}
              value={value}
              onChangeText={setValue}
              placeholder={getVitalPlaceholder()}
              placeholderTextColor={colors.secondaryText}
              keyboardType="numeric"
            />
          </View>
          
          <View style={styles.formGroup}>
            <Text style={[Typography.label, { color: colors.text }]}>Date</Text>
            <TouchableOpacity 
              onPress={() => setDatePickerVisible(true)}
              style={[styles.input, { 
                color: colors.text, 
                borderColor: colors.border, 
                backgroundColor: colors.card,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingRight: Spacing.md,
              }]}
            >
              <Text style={{ color: colors.text }}>{date}</Text>
              <Ionicons name="calendar" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.formGroup}>
            <Text style={[Typography.label, { color: colors.text }]}>Time</Text>
            <TouchableOpacity 
              onPress={() => setTimePickerVisible(true)}
              style={[styles.input, { 
                color: colors.text, 
                borderColor: colors.border, 
                backgroundColor: colors.card,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingRight: Spacing.md,
              }]}
            >
              <Text style={{ color: colors.text }}>{time}</Text>
              <Ionicons name="time" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.formGroup}>
            <Text style={[Typography.label, { color: colors.text }]}>Notes (Optional)</Text>
            <TextInput
              style={[styles.textArea, { 
                color: colors.text, 
                borderColor: colors.border, 
                backgroundColor: colors.card 
              }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Add any additional notes..."
              placeholderTextColor={colors.secondaryText}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </ScrollView>
        
        <DateTimePickerModal
          isVisible={isDatePickerVisible}
          mode="date"
          onConfirm={handleDateConfirm}
          onCancel={() => setDatePickerVisible(false)}
        />
        
        <DateTimePickerModal
          isVisible={isTimePickerVisible}
          mode="time"
          onConfirm={handleTimeConfirm}
          onCancel={() => setTimePickerVisible(false)}
        />
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function VitalsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const { currentUser } = useAuth();
  const [vitals, setVitals] = useState<Vital[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVitalType, setSelectedVitalType] = useState<string>('');
  const [isHistoryModalVisible, setHistoryModalVisible] = useState(false);
  const [isAddModalVisible, setAddModalVisible] = useState(false);
  const [addModalInitialType, setAddModalInitialType] = useState<string>('');

  useEffect(() => {
    if (!currentUser) {
       setLoading(false);
       setVitals(DUMMY_VITALS);
       return;
    }

    setLoading(true);
    const unsubscribe = listenToVitals(currentUser.uid, (vitalsList) => {
      if (vitalsList.length === 0) {
         setVitals(DUMMY_VITALS);
      } else {
         setVitals(vitalsList);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const getLatestReading = (type: string): Vital | null => {
    const typeVitals = vitals.filter(v => v.type === type);
    if (typeVitals.length === 0) return null;

    typeVitals.sort((a, b) => {
      // Combine date and time for accurate sorting
      try {
         const dateTimeA = new Date(`${a.date} ${a.time}`).getTime();
         const dateTimeB = new Date(`${b.date} ${b.time}`).getTime();
         return dateTimeB - dateTimeA; // Descending order
      } catch(e) {
         // Fallback sort by date string if time parsing fails
         return b.date.localeCompare(a.date);
      }
    });
    return typeVitals[0];
  };

  const handleAddVitalSave = async (newVital: Omit<Vital, 'id'>) => {
    if (!currentUser) {
      Alert.alert('Authentication Error', 'You must be logged in to save vitals.');
      return;
    }

    try {
      await addVital(currentUser.uid, newVital);
      Alert.alert('Success', `${newVital.type} reading saved.`);
    } catch (error) {
      console.error('Error adding vital:', error);
      Alert.alert('Error', 'Failed to save vital reading. Please try again.');
    }
  };

  const openVitalHistory = (type: string) => {
    setSelectedVitalType(type);
    setHistoryModalVisible(true);
  };

  const openAddModal = (initialType: string = '') => {
    setAddModalInitialType(initialType);
    setAddModalVisible(true);
  };

  const openAddFromHistory = () => {
    setHistoryModalVisible(false);
    if (selectedVitalType) {
       openAddModal(selectedVitalType);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Health Vitals',
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: '#fff',
        }}
      />
      
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <View style={styles.headerTextContainer}>
              <Text style={[Typography.title, { color: colors.text }]}>
                My Health Vitals
              </Text>
              <Text style={[Typography.bodyText, { color: colors.secondaryText, marginTop: Spacing.xs }]}>
                Track and monitor your health measurements
              </Text>
            </View>
          </View>
          
          <View style={styles.categoriesContainer}>
            {/* Blood Pressure */}
            <VitalCategory
              title="Blood Pressure"
              icon="heart"
              latestVital={getLatestReading('Blood Pressure')}
              color={colors.appointment}
              onPress={() => openVitalHistory('Blood Pressure')}
            />
            
            {/* Blood Sugar */}
            <VitalCategory
              title="Blood Sugar"
              icon="water"
              latestVital={getLatestReading('Blood Sugar')}
              color="#FF9800"
              onPress={() => openVitalHistory('Blood Sugar')}
            />
            
            {/* Weight */}
            <VitalCategory
              title="Weight"
              icon="body"
              latestVital={getLatestReading('Weight')}
              color="#4CAF50"
              onPress={() => openVitalHistory('Weight')}
            />
            
            {/* Heart Rate */}
            <VitalCategory
              title="Heart Rate"
              icon="pulse"
              latestVital={getLatestReading('Heart Rate')}
              color="#D32F2F"
              onPress={() => openVitalHistory('Heart Rate')}
            />
            
            {/* Temperature */}
            <VitalCategory
              title="Temperature"
              icon="thermometer"
              latestVital={getLatestReading('Temperature')}
              color="#9C27B0"
              onPress={() => openVitalHistory('Temperature')}
            />
            
            {/* Oxygen Saturation */}
            <VitalCategory
              title="Oxygen Saturation"
              icon="medical"
              latestVital={getLatestReading('Oxygen Saturation')}
              color="#2196F3"
              onPress={() => openVitalHistory('Oxygen Saturation')}
            />
          </View>
          
          <View style={styles.addNewContainer}>
            <Text style={[Typography.sectionHeader, { color: colors.text }]}>
              Add New Reading
            </Text>
            <View style={styles.quickAddContainer}>
              <TouchableOpacity 
                style={[styles.quickAddButton, { backgroundColor: colors.appointment + '20', borderColor: colors.appointment }]}
                onPress={() => {
                  setSelectedVitalType('Blood Pressure');
                  openAddModal('Blood Pressure');
                }}
              >
                <Ionicons name="heart" size={24} color={colors.appointment} />
                <Text style={[styles.quickAddText, { color: colors.text }]}>Blood Pressure</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.quickAddButton, { backgroundColor: '#FF9800' + '20', borderColor: '#FF9800' }]}
                onPress={() => {
                  setSelectedVitalType('Blood Sugar');
                  openAddModal('Blood Sugar');
                }}
              >
                <Ionicons name="water" size={24} color="#FF9800" />
                <Text style={[styles.quickAddText, { color: colors.text }]}>Blood Sugar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.quickAddButton, { backgroundColor: '#4CAF50' + '20', borderColor: '#4CAF50' }]}
                onPress={() => {
                  setSelectedVitalType('Weight');
                  openAddModal('Weight');
                }}
              >
                <Ionicons name="body" size={24} color="#4CAF50" />
                <Text style={[styles.quickAddText, { color: colors.text }]}>Weight</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
        
        <TouchableOpacity
          style={[styles.floatingButton, { backgroundColor: colors.primary }]}
          onPress={() => openAddModal()}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={28} color="#FFF" />
        </TouchableOpacity>
        
        {selectedVitalType && (
          <>
            <VitalHistoryModal
              visible={isHistoryModalVisible}
              onClose={() => setHistoryModalVisible(false)}
              vitalType={selectedVitalType}
              vitals={vitals}
              onAddReading={openAddFromHistory}
            />
            
            <AddVitalModal
              visible={isAddModalVisible}
              onClose={() => setAddModalVisible(false)}
              vitalType={addModalInitialType}
              onSave={handleAddVitalSave}
            />
          </>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: 80,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  headerTextContainer: {
    flex: 1,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  categoryCard: {
    width: '48%',
    marginBottom: Spacing.md,
    padding: Spacing.md,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  categoryTitleContainer: {
    marginLeft: Spacing.sm,
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  readingContainer: {
    marginBottom: Spacing.sm,
  },
  latestReading: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  readingValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginRight: Spacing.xs,
  },
  readingUnit: {
    fontSize: 14,
    marginBottom: 4,
  },
  categoryFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addNewContainer: {
    marginTop: Spacing.lg,
  },
  quickAddContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
  },
  quickAddButton: {
    width: '31%',
    borderRadius: Layout.borderRadiusMd,
    borderWidth: 1,
    padding: Spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickAddText: {
    marginTop: Spacing.sm,
    fontSize: 12,
    textAlign: 'center',
  },
  floatingButton: {
    position: 'absolute',
    bottom: Spacing.xl,
    right: Spacing.lg,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  closeButton: {
    padding: Spacing.sm,
  },
  modalContent: {
    flex: 1,
    padding: Spacing.lg,
  },
  chartContainer: {
    marginBottom: Spacing.xl,
    alignItems: 'center',
    borderRadius: Layout.borderRadiusLg,
    overflow: 'hidden',
    padding: Spacing.sm,
  },
  chart: {
    
  },
  vitalHistoryCard: {
    marginBottom: Spacing.md,
    padding: Spacing.md,
  },
  vitalHistoryHeader: {
    marginBottom: Spacing.sm,
  },
  vitalHistoryDate: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vitalHistoryDateText: {
    marginLeft: Spacing.xs,
  },
  vitalHistoryBody: {
    
  },
  vitalHistoryValue: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  vitalHistoryValueText: {
    marginLeft: Spacing.sm,
    fontSize: 18,
    fontWeight: 'bold',
  },
  vitalHistoryNotes: {
    marginTop: Spacing.xs,
    fontStyle: 'italic',
  },
  emptyStateContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
    minHeight: 300,
  },
  addButton: {
    margin: Spacing.lg,
  },
  formGroup: {
    marginBottom: Spacing.lg,
  },
  input: {
    height: Layout.inputHeight,
    borderWidth: 1,
    borderRadius: Layout.borderRadiusMd,
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.xs,
    fontSize: 16,
    justifyContent: 'center',
  },
  dateTimePickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: Spacing.md,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: Layout.borderRadiusMd,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.xs,
    minHeight: 100,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  // Styles for vital visualizations
  rangeIndicator: {
    marginBottom: Spacing.sm,
    alignItems: 'flex-start',
  },
  rangeBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs / 2,
    borderRadius: Layout.borderRadiusSm,
    marginBottom: Spacing.xs,
  },
  rangeLabel: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  bpVisualContainer: {
    marginBottom: Spacing.sm,
  },
  bpStatusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs / 2,
    borderRadius: Layout.borderRadiusSm,
    marginBottom: Spacing.xs,
  },
  bpStatusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  bpReadings: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  bpReading: {
    alignItems: 'center',
  },
}); 