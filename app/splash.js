import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import Colors from '@/constants/Colors';
import LottieView from 'lottie-react-native';

export default function SplashScreen() {
  const router = useRouter();
  const { currentUser, loading } = useAuth();

  useEffect(() => {
    // Wait for auth to be checked, then navigate appropriately
    const checkAuthAndNavigate = async () => {
      // Keep the minimum delay if desired, or adjust/remove
      await new Promise(resolve => setTimeout(resolve, 2500)); // Adjusted delay for Lottie
      
      if (!loading) {
        if (currentUser) {
          // User is signed in, navigate to home
          router.replace('/(tabs)');
        } else {
          // No user, navigate to login
          router.replace('/login');
        }
      }
    };

    // If loading state changes AFTER the initial check, re-run navigation
    // This handles cases where auth state loads later than the timeout
    if (!loading) {
        checkAuthAndNavigate();
    }
    
  }, [currentUser, loading, router]);

  return (
    <View style={styles.container}>
      {/* Display the Lottie animation */}
      <LottieView
        source={require('./Images/Splash Screen.json')}
        autoPlay
        loop={true} // Loop until navigation happens
        style={styles.lottieSplash} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.background, // Or a color that matches animation
  },
  lottieSplash: {
    width: '80%', // Adjust size as needed, relative size might be better
    aspectRatio: 1, // Adjust if the animation isn't square
  },
  // Remove styles for logo, title, subtitle, loader
}); 