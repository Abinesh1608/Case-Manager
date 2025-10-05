import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, View, Text, TouchableOpacity, Image, Alert, Platform, ActivityIndicator } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import Colors from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing, Layout } from '@/constants/Spacing';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../../components/Card';
import { Stack, router } from 'expo-router';
import { Button } from '../../components/Button';
import { useAuth } from '../../contexts/AuthContext';
import { ComingSoon } from '../../components/ComingSoon';
// Correct Firebase imports
import { getAuth, signOut, onAuthStateChanged } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db, auth } from '../../firebase';

interface ProfileSectionProps {
  title: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  description: string;
  onPress: () => void;
  color?: string;
}

function ProfileSection({ title, icon, description, onPress, color }: ProfileSectionProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  
  return (
    <Card onPress={onPress} style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <View style={[styles.iconContainer, { backgroundColor: (color || colors.primary) + '20' }]}>
          <Ionicons name={icon} size={Layout.contentIconSize} color={color || colors.primary} />
        </View>
        <Text style={[Typography.sectionHeader, { color: colors.text }]}>
          {title}
        </Text>
      </View>
      <Text style={[Typography.bodyText, { color: colors.text, marginTop: Spacing.xs }]}>
        {description}
      </Text>
    </Card>
  );
}

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const { logout, currentUser } = useAuth();

  // Debug check for function accessibility
  console.log("[DEBUG] Profile screen mounted");
  console.log("[DEBUG] Auth context available:", !!useAuth);
  console.log("[DEBUG] Context logout function available:", !!logout);
  console.log("[DEBUG] Current user available:", !!currentUser);
  console.log("[DEBUG] Firebase auth available:", !!auth);

  // Add state for user profile data
  const [userData, setUserData] = useState({
    age: '',
    phone: '',
    emergencyContact: {
      name: '',
      phone: '',
    },
    allergies: '',
  });

  // Add loading state for logout button
  const [loggingOut, setLoggingOut] = useState(false);

  // Load user profile data
  useEffect(() => {
    if (!currentUser) return;
    
    // Function to fetch user data
    const fetchUserData = async () => {
      try {
        // Here we would fetch user data from Firebase
        // For now, use mock data if the user is from a quick login
        // In a real app, this would come from Firestore
        const mockData = {
          age: '45',
          phone: '(555) 987-6543',
          emergencyContact: {
            name: currentUser.displayName ? `${currentUser.displayName}'s Emergency Contact` : 'Emergency Contact',
            phone: '(555) 123-4567',
          },
          allergies: 'Penicillin, Peanuts',
        };
        
        // Simulate fetching user data
        setUserData(mockData);
        
        // For real implementation:
        // const userDoc = await getUserData(currentUser.uid);
        // setUserData(userDoc);
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };
    
    fetchUserData();
  }, [currentUser]);

  // Add a listener for auth state changes
  useEffect(() => {
    // Monitor auth state
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log("Auth state changed:", user ? "User logged in" : "User logged out");
      if (!user) {
        // If user is logged out, redirect to login
        router.replace('/login');
      }
    });
    
    // Clean up listener on unmount
    return () => unsubscribe();
  }, []);

  // Navigation functions - only Records exists, the rest need ComingSoon screens
  const navigateToRecords = () => router.replace('/(tabs)/profile/records');
  
  // These navigate to temporary routes that will show ComingSoon
  const navigateToContacts = () => {
    router.push({
      pathname: '/(tabs)/comingSoon',
      params: { 
        title: 'Contacts Coming Soon',
        message: 'Contact management features will be available in a future update.',
        icon: 'people-outline'
      }
    });
  };
  
  const navigateToSettings = () => {
    router.push({
      pathname: '/(tabs)/comingSoon',
      params: { 
        title: 'Settings Coming Soon',
        message: 'Account settings and preferences will be available in a future update.',
        icon: 'settings-outline'
      }
    });
  };
  
  const navigateToHelp = () => {
    router.push({
      pathname: '/(tabs)/comingSoon',
      params: { 
        title: 'Help & Support Coming Soon',
        message: 'Support resources and help documentation will be available in a future update.',
        icon: 'help-circle-outline'
      }
    });
  };

  const navigateToEditProfile = () => {
    router.push({
      pathname: '/(tabs)/comingSoon',
      params: { 
        title: 'Edit Profile Coming Soon',
        message: 'Profile editing features will be available in a future update.',
        icon: 'create-outline'
      }
    });
  };

  const navigateToEmergency = () => {
    router.push({
      pathname: '/(tabs)/comingSoon',
      params: { 
        title: 'Emergency Feature Coming Soon',
        message: 'Emergency contact and quick call features will be available in a future update.',
        icon: 'alert-circle-outline'
      }
    });
  };

  // Simplified logout function
  const performLogout = async () => {
    try {
      // 1. Clear AsyncStorage first
      await AsyncStorage.clear();
      
      // 2. Sign out from Firebase
      try {
        await signOut(auth);
      } catch (signOutError) {
        // Attempt fallback auth as backup
        console.error("Firebase signOut failed:", signOutError);
        const fallbackAuth = getAuth();
        await signOut(fallbackAuth);
      }
      
      // 3. Add small delay before navigation to ensure all operations complete
      setTimeout(() => {
        router.replace('/login');
      }, 300);
      
      return true; // Signal success
    } catch (error) {
      console.error("Logout failed with error:", error);
      Alert.alert("Logout Error", "Please try again or use emergency logout below.");
      return false; // Signal failure
    }
  };

  return (
    <>
      <Stack.Screen 
        options={{
          headerTitle: 'My Profile',
          headerRight: () => (
            <TouchableOpacity 
              style={{ paddingHorizontal: Spacing.md }}
              onPress={navigateToSettings}
            >
              <Ionicons name="settings-outline" size={Layout.headerIconSize} color={colors.text} />
            </TouchableOpacity>
          ),
        }} 
      />
      
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Profile Card */}
        <Card style={styles.profileCard}>
          <View style={styles.profileHeaderRow}>
            <View style={styles.profileInfo}>
              <Text style={[Typography.title, { color: colors.text }]}>
                {currentUser?.displayName || 'User'}
              </Text>
              <Text style={[Typography.bodyText, { color: colors.text, marginTop: Spacing.xs }]}>
                {currentUser?.email}
              </Text>
            </View>
            <TouchableOpacity 
              style={[styles.editButton, { backgroundColor: colors.primary + '20' }]}
              onPress={navigateToEditProfile}
            >
              <Ionicons name="create-outline" size={Layout.contentIconSize} color={colors.primary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.profileImageRow}>
            <Image 
              source={{ uri: currentUser?.photoURL || 'https://via.placeholder.com/150' }} 
              style={styles.profileImage} 
            />
            <View style={styles.emergencyInfoContainer}>
              <Text style={[Typography.sectionHeader, { color: colors.emergency }]}>
                Emergency Info
              </Text>
              <Text style={[Typography.bodyText, { color: colors.text, marginTop: Spacing.xs }]}>
                • Emergency Contact: {userData.emergencyContact.name}
              </Text>
              <Text style={[Typography.bodyText, { color: colors.text }]}>
                • Phone: {userData.emergencyContact.phone}
              </Text>
              <Text style={[Typography.bodyText, { color: colors.text }]}>
                • Allergies: {userData.allergies || 'None specified'}
              </Text>
            </View>
          </View>
        </Card>
        
        {/* User Info Card */}
        <Card style={styles.profileCard}>
          <Text style={[Typography.sectionHeader, { color: colors.text }]}>
            Personal Information
          </Text>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={20} color={colors.primary} />
            <Text style={[Typography.bodyText, { color: colors.text, marginLeft: Spacing.sm }]}>
              Age: {userData.age || 'Not specified'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={20} color={colors.primary} />
            <Text style={[Typography.bodyText, { color: colors.text, marginLeft: Spacing.sm }]}>
              Phone: {userData.phone || 'Not specified'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={20} color={colors.primary} />
            <Text style={[Typography.bodyText, { color: colors.text, marginLeft: Spacing.sm }]}>
              Email: {currentUser?.email}
            </Text>
          </View>
        </Card>

        {/* Main sections */}
        <View style={styles.sectionsContainer}>
          <ProfileSection 
            title="Medical Records" 
            icon="document-text" 
            color={colors.primary}
            description="Access and manage your health records, prescriptions, and test results."
            onPress={navigateToRecords} 
          />
          
          <ProfileSection 
            title="Caregivers & Contacts" 
            icon="people" 
            color="#007AFF"
            description="Manage your healthcare providers, family members, and emergency contacts."
            onPress={navigateToContacts} 
          />
          
          <ProfileSection 
            title="Account Settings" 
            icon="settings" 
            color="#555555"
            description="Update your profile information, notifications, and privacy settings."
            onPress={navigateToSettings} 
          />
          
          <ProfileSection 
            title="Help & Support" 
            icon="help-circle" 
            color="#4A90E2"
            description="Get help with the app, contact support, or view tutorials."
            onPress={navigateToHelp} 
          />
        </View>
        
        {/* Main Logout button */}
        <View style={styles.logoutButtonContainer}>
          <TouchableOpacity
            style={styles.directLogoutButton}
            onPress={async () => {
              try {
                setLoggingOut(true);
                const result = await performLogout();
              } catch (error) {
                console.error("Error in logout:", error);
              } finally {
                setLoggingOut(false);
              }
            }}
          >
            {loggingOut ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={styles.directLogoutButtonText}>LOG OUT</Text>
            )}
          </TouchableOpacity>
          
          {/* Keep emergency button as is */}
          <TouchableOpacity 
            style={styles.emergencyLogoutButton} 
            onPress={async () => {
              try {
                // Force a hard logout directly
                
                // Clear all storage
                try {
                  await AsyncStorage.clear();
                } catch (storageError) {
                  console.error("Failed to clear storage:", storageError);
                }
                
                // Try all possible auth logout methods
                try {
                  await signOut(auth);
                } catch (e) {
                  console.log("Direct signOut failed:", e);
                }
                
                try {
                  const fallbackAuth = getAuth();
                  await signOut(fallbackAuth);
                } catch (e) {
                  console.log("Fallback signOut failed:", e);
                }
                
                // Force redirect
                setTimeout(() => {
                  // Use standard router navigation instead of _reset
                  try {
                    router.replace('/login');
                  } catch (e) {
                    console.log("router.replace failed, trying alternative:", e);
                    router.navigate('/login');
                  }
                }, 200);
              } catch (error) {
                console.log("Emergency logout failed:", error);
                
                // Use window.location as last resort (for web)
                if (typeof window !== 'undefined') {
                  window.location.href = '/login';
                } else {
                  // Try to reset the router or navigate
                  router.push('/login');
                }
              }
            }}
          >
            <Text style={styles.emergencyLogoutText}>Emergency Logout (Bypass Auth)</Text>
          </TouchableOpacity>
        </View>
        
        {/* Emergency Button */}
        <Button
          title="Emergency"
          variant="danger"
          onPress={navigateToEmergency}
          style={styles.emergencyButton}
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
  profileCard: {
    marginVertical: Spacing.md,
    padding: Spacing.md,
    borderRadius: Layout.borderRadiusLg,
  },
  profileHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  profileInfo: {
    flex: 1,
  },
  editButton: {
    width: Layout.minTouchTarget,
    height: Layout.minTouchTarget,
    borderRadius: Layout.minTouchTarget / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImageRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 20,
    marginRight: Spacing.lg,
  },
  emergencyInfoContainer: {
    flex: 1,
  },
  sectionsContainer: {
    marginTop: Spacing.lg,
  },
  sectionCard: {
    marginBottom: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  iconContainer: {
    width: Layout.minTouchTarget,
    height: Layout.minTouchTarget,
    borderRadius: Layout.minTouchTarget / 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  logoutButtonContainer: {
    marginTop: Spacing.lg,
    alignItems: 'center',
    width: '100%',
  },
  directLogoutButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    marginVertical: 10,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  directLogoutButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  emergencyLogoutButton: {
    marginTop: Spacing.sm,
    padding: Spacing.xs,
  },
  emergencyLogoutText: {
    fontSize: 12,
    color: '#999',
    textDecorationLine: 'underline',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  emergencyButton: {
    marginTop: Spacing.lg,
  },
}); 