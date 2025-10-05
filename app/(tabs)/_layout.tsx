import { Stack } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/Colors';
import { CustomNavbar } from '../../components/CustomNavbar';
import { AuthCheck } from '../../components/AuthCheck';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();

  // Calculate bottom padding to account for the navbar and safe area
  const bottomPadding = 60 + Math.max(insets.bottom, 5);

  // Check authentication
  return (
    <View style={styles.container}>
      <AuthCheck />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.card,
            shadowOpacity: 0.1,
          },
          headerTitleStyle: {
            color: colors.text,
            fontSize: 18,
            fontWeight: '600',
          },
          headerTitleAlign: 'center',
          headerShadowVisible: true,
          // Add bottom padding to account for our custom navbar + safe area
          contentStyle: {
            paddingBottom: bottomPadding,
          },
          // Prevent going back to splash screen
          headerBackVisible: true,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            headerTitle: 'CaseManager',
            // Prevent back navigation for main tab
            headerBackVisible: false,
          }}
        />
        
        <Stack.Screen
          name="calendar"
          options={{
            headerTitle: 'My Schedule',
            // Prevent back navigation for main tab
            headerBackVisible: false,
          }}
        />
        
        <Stack.Screen
          name="profile"
          options={{
            headerTitle: 'My Profile',
            // Prevent back navigation for main tab
            headerBackVisible: false,
          }}
        />
        
        <Stack.Screen
          name="health/index"
          options={{
            headerTitle: 'Health',
            // Since this is a child screen, allow normal back behavior
          }}
        />
        
        <Stack.Screen
          name="health/appointments"
          options={{
            headerTitle: 'Appointments',
            // Since this is a child screen, allow normal back behavior
          }}
        />
        
        <Stack.Screen
          name="health/medications"
          options={{
            headerTitle: 'Medications',
            // Since this is a child screen, allow normal back behavior
          }}
        />
      </Stack>
      
      {/* Our custom navbar component - completely hardcoded */}
      <CustomNavbar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
});
