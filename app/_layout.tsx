import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, SplashScreen } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';
// Remove Text, View, StyleSheet if they are confirmed unused in this file
// import { Text, View, StyleSheet } from 'react-native'; 
import { AuthProvider } from '../contexts/AuthContext';
import { useColorScheme } from '@/hooks/useColorScheme';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

// Keep native splash screen managed
SplashScreen.preventAutoHideAsync(); 

export default function RootLayout() {
  const colorScheme = useColorScheme();
  // Keep state for font readiness, not overall app readiness (splash.js handles navigation)
  const [fontsReady, setFontsReady] = useState(false);

  const [fontsLoaded, fontLoadingError] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    async function prepare() {
      try {
        // Wait for fonts to load
        await new Promise<void>((resolve) => {
          const checkFonts = () => {
            if (fontsLoaded || fontLoadingError) {
              resolve();
            } else {
              setTimeout(checkFonts, 100);
            }
          };
          checkFonts();
        });

        if (fontLoadingError) {
          console.warn(`Fonts failed to load: ${fontLoadingError.message}`);
        }
        // Add any other essential async tasks needed BEFORE the main app UI renders
        // e.g., loading essential config

      } catch (e) {
        console.warn('Error during app preparation:', e);
      } finally {
        // Indicate that fonts (and other essentials) are ready
        setFontsReady(true);
        // Hide the native splash screen now
        await SplashScreen.hideAsync();
      }
    }

    prepare();
  }, [fontsLoaded, fontLoadingError]); // Rerun when font status changes

  // Do not render anything until fonts are loaded (or errored)
  // The splash.js route will be displayed by Expo Router during this time
  if (!fontsReady) {
    return null; // Render nothing, native splash is visible, splash.js route handles visuals
  }

  // --- Fonts are ready, Render the main app layout --- 
  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          {/* Stack screens are defined here, but splash.js controls initial view */}
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" options={{ title: 'Oops!' }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </AuthProvider>
  );
}

// Remove Lottie-specific styles if StyleSheet is no longer needed
// const styles = StyleSheet.create({ ... });
