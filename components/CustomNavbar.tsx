import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

const { width } = Dimensions.get('window');

export function CustomNavbar() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  // Define tabs including the new AI tab
  const tabs = [
    {
      name: 'Home',
      icon: 'home',
      route: '/(tabs)',
      active: pathname === '/' || pathname === '/(tabs)' || pathname === '/(tabs)/index',
    },
    {
      name: 'Calendar',
      icon: 'calendar',
      route: '/(tabs)/calendar',
      active: pathname === '/(tabs)/calendar',
    },
    {
      name: 'AI Assist',
      icon: 'sparkles',
      route: '/(tabs)/ai',
      active: pathname === '/(tabs)/ai',
    },
    {
      name: 'Health',
      icon: 'heart',
      route: '/(tabs)/health',
      active: pathname === '/(tabs)/health' || pathname.startsWith('/(tabs)/health/'),
    },
    {
      name: 'Profile',
      icon: 'person',
      route: '/(tabs)/profile',
      active: pathname === '/(tabs)/profile',
    },
  ];

  const handleNavigation = (route: string) => {
    // Use replace instead of push to avoid accumulating navigation history
    router.replace(route);
  };

  return (
    <View 
      style={[
        styles.container, 
        { 
          backgroundColor: colors.card,
          paddingBottom: Math.max(insets.bottom, 5), // Handle safe area
          height: 60 + Math.max(insets.bottom, 5),  // Add safe area to height
        }
      ]}
    >
      {tabs.map((tab, index) => (
        <TouchableOpacity
          key={index}
          style={styles.tab}
          onPress={() => handleNavigation(tab.route)}
          activeOpacity={0.7}
        >
          <View style={styles.tabContent}>
            <Ionicons
              name={tab.icon as any}
              size={22} // Keep size 22 for now, adjust if needed for 5 tabs
              color={tab.active ? colors.primary : colors.tabIconDefault}
            />
            <Text
              style={[
                styles.tabText,
                { color: tab.active ? colors.primary : colors.tabIconDefault },
              ]}
            >
              {tab.name}
            </Text>
            
            {/* Active indicator */}
            {tab.active && (
              <View 
                style={[
                  styles.activeIndicator, 
                  { backgroundColor: colors.primary }
                ]} 
              />
            )}
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    width: width,
    justifyContent: 'space-around',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
    zIndex: 1000,
  },
  tab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    position: 'relative',
    width: '100%',
  },
  tabText: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  activeIndicator: {
    position: 'absolute',
    top: -8,
    width: 30,
    height: 3,
    borderRadius: 1.5,
  },
}); 