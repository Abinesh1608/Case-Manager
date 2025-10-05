import { ColorSchemeName, useColorScheme as reactNativeUseColorScheme } from 'react-native';

/**
 * A hook to get the current color scheme (light or dark)
 * @returns The current color scheme, defaults to 'light' if not available
 */
export function useColorScheme(): NonNullable<ColorSchemeName> {
  // Direct implementation without useState to avoid potential issues
  const colorScheme = reactNativeUseColorScheme();
  return colorScheme || 'light';
}

// Default export for Expo Router compatibility
export default useColorScheme; 