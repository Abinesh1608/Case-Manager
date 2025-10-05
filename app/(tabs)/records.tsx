import React, { useState } from 'react';
import { ScrollView, StyleSheet, View, Text, TouchableOpacity, Image } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import Colors from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing, Layout } from '@/constants/Spacing';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Stack, router } from 'expo-router';

// Sample record categories
const RECORD_CATEGORIES = [
  { id: '1', name: 'Prescriptions', icon: 'document-text', color: '#9370DB' },
  { id: '2', name: 'Lab Results', icon: 'flask', color: '#4682B4' },
  { id: '3', name: 'Imaging', icon: 'scan', color: '#2E8B57' },
  { id: '4', name: 'Discharge Summaries', icon: 'bed', color: '#D32F2F' },
  { id: '5', name: 'Insurance', icon: 'card', color: '#FF9500' },
];

// Sample records
const RECORDS = [
  {
    id: '1',
    title: 'Blood Work Results',
    date: '2023-08-15',
    category: 'Lab Results',
    filename: 'bloodwork_aug2023.pdf',
    fileType: 'pdf',
  },
  {
    id: '2',
    title: 'Lisinopril Prescription',
    date: '2023-07-20',
    category: 'Prescriptions',
    filename: 'lisinopril_rx_jul2023.pdf',
    fileType: 'pdf',
  },
  {
    id: '3',
    title: 'Chest X-Ray',
    date: '2023-06-10',
    category: 'Imaging',
    filename: 'chest_xray_jun2023.jpg',
    fileType: 'image',
  },
  {
    id: '4',
    title: 'Hospital Discharge',
    date: '2023-05-05',
    category: 'Discharge Summaries',
    filename: 'discharge_may2023.pdf',
    fileType: 'pdf',
  },
  {
    id: '5',
    title: 'Insurance Card',
    date: '2023-01-01',
    category: 'Insurance',
    filename: 'insurance_card_2023.jpg',
    fileType: 'image',
  },
];

export default function RecordsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  // Filter records by category if one is selected
  const filteredRecords = selectedCategory 
    ? RECORDS.filter(record => record.category === selectedCategory)
    : RECORDS;
  
  // Get category color
  const getCategoryColor = (categoryName: string) => {
    const category = RECORD_CATEGORIES.find(cat => cat.name === categoryName);
    return category ? category.color : colors.primary;
  };
  
  // Get file icon based on type
  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'pdf':
        return 'document-text';
      case 'image':
        return 'image';
      default:
        return 'document';
    }
  };

  const navigateToUploadRecord = () => {
    router.push({
      pathname: '/(tabs)/comingSoon',
      params: { 
        title: 'Upload Records Coming Soon',
        message: 'Record upload functionality will be available in a future update.',
        icon: 'cloud-upload-outline'
      }
    });
  };
  
  const navigateToAddRecord = () => {
    router.push({
      pathname: '/(tabs)/comingSoon',
      params: { 
        title: 'Add Records Coming Soon',
        message: 'Adding new medical records will be available in a future update.',
        icon: 'add-circle-outline'
      }
    });
  };

  const navigateToViewRecord = (record: any) => {
    router.push({
      pathname: '/(tabs)/comingSoon',
      params: { 
        title: 'View Record Coming Soon',
        message: `Record viewing for "${record.title}" will be available in a future update.`,
        icon: 'eye-outline'
      }
    });
  };

  return (
    <>
      <Stack.Screen 
        options={{
          headerTitle: 'Medical Records',
          headerRight: () => (
            <TouchableOpacity 
              style={{ paddingHorizontal: Spacing.md }}
              onPress={navigateToAddRecord}
            >
              <Ionicons name="add-circle" size={Layout.headerIconSize} color={colors.primary} />
            </TouchableOpacity>
          ),
        }} 
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Category Buttons */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesContainer}
          contentContainerStyle={styles.categoriesContent}
        >
          <TouchableOpacity 
            style={[
              styles.categoryButton, 
              !selectedCategory && styles.activeCategoryButton,
              { borderColor: colors.primary }
            ]}
            onPress={() => setSelectedCategory(null)}
          >
            <Ionicons name="apps" size={24} color={!selectedCategory ? colors.primary : colors.text} />
            <Text 
              style={[
                Typography.label, 
                { color: !selectedCategory ? colors.primary : colors.text }
              ]}
            >
              All
            </Text>
          </TouchableOpacity>
          
          {RECORD_CATEGORIES.map(category => (
            <TouchableOpacity 
              key={category.id}
              style={[
                styles.categoryButton, 
                selectedCategory === category.name && styles.activeCategoryButton,
                { borderColor: category.color }
              ]}
              onPress={() => setSelectedCategory(category.name)}
            >
              <Ionicons 
                name={category.icon as any} 
                size={24} 
                color={selectedCategory === category.name ? category.color : colors.text} 
              />
              <Text 
                style={[
                  Typography.label, 
                  { color: selectedCategory === category.name ? category.color : colors.text }
                ]}
              >
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        
        {/* Records List */}
        <View style={styles.recordsContainer}>
          <Text style={[Typography.sectionHeader, { color: colors.text, marginBottom: Spacing.md }]}>
            {selectedCategory || 'All Records'} ({filteredRecords.length})
          </Text>
          
          {filteredRecords.map(record => (
            <Card key={record.id} style={styles.recordCard}>
              <View style={styles.recordRow}>
                <View style={[
                  styles.fileIconContainer, 
                  { backgroundColor: getCategoryColor(record.category) + '20' }
                ]}>
                  <Ionicons 
                    name={getFileIcon(record.fileType)} 
                    size={Layout.contentIconSize} 
                    color={getCategoryColor(record.category)} 
                  />
                </View>
                <View style={styles.recordInfo}>
                  <Text style={[Typography.bodyText, { color: colors.text }]}>
                    {record.title}
                  </Text>
                  <Text style={{ color: colors.text }}>
                    {new Date(record.date).toLocaleDateString()}
                  </Text>
                  <Text style={{ color: colors.text, fontSize: 14 }}>
                    {record.filename}
                  </Text>
                </View>
                <TouchableOpacity 
                  style={styles.viewButton}
                  onPress={() => navigateToViewRecord(record)}
                >
                  <Ionicons name="eye" size={Layout.contentIconSize} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </Card>
          ))}
        </View>
        
        {/* Upload Button */}
        <Button
          title="Upload New Record"
          onPress={navigateToUploadRecord}
          icon={<Ionicons name="cloud-upload" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />}
          style={styles.uploadButton}
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
  categoriesContainer: {
    marginVertical: Spacing.lg,
  },
  categoriesContent: {
    paddingRight: Spacing.md,
  },
  categoryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.sm,
    marginRight: Spacing.md,
    minWidth: 90,
    borderRadius: Layout.borderRadiusMd,
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  activeCategoryButton: {
    backgroundColor: '#F5F5F5',
  },
  recordsContainer: {
    marginBottom: Spacing.xl,
  },
  recordCard: {
    marginBottom: Spacing.md,
  },
  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fileIconContainer: {
    width: Layout.minTouchTarget,
    height: Layout.minTouchTarget,
    borderRadius: Layout.borderRadiusMd,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  recordInfo: {
    flex: 1,
  },
  viewButton: {
    padding: Spacing.sm,
  },
  uploadButton: {
    marginTop: Spacing.lg,
  },
}); 