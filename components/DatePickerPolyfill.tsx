import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import DatePickerFallback from './DatePickerFallback';

// Determine if the fallback should be used based on environment
const shouldUseFallback = () => {
  // Always use fallback in development mode (__DEV__ is a global variable)
  if (__DEV__) {
    console.log('[DatePickerPolyfill] Using fallback in development mode.');
    return true;
  }
  // Always use fallback on web
  if (Platform.OS === 'web') {
    console.log('[DatePickerPolyfill] Using fallback on web.');
    return true;
  }
  // Check if we're potentially in Expo Go (which might lack the native module)
  const isExpoGo = typeof global !== 'undefined' && !!(global as any).__expo;
  if (isExpoGo) {
    console.log('[DatePickerPolyfill] Detected Expo Go, using fallback.');
    return true;
  }
  // Otherwise, assume native environment where the module *might* exist
  return false;
};

const USE_FALLBACK = shouldUseFallback();

// Conditionally attempt to require the native module *only* if not using fallback
let DateTimePicker: any = null;
if (!USE_FALLBACK) {
  try {
    // Attempt to require the actual native module
    DateTimePicker = require('@react-native-community/datetimepicker').default;
    console.log('[DatePickerPolyfill] Native DateTimePicker loaded successfully.');
  } catch (error) {
    console.warn('[DatePickerPolyfill] Native DateTimePicker import failed, will use fallback:', error);
    // Ensure DateTimePicker remains null if import fails
    DateTimePicker = null;
  }
}

export interface DatePickerPolyfillProps {
  value: Date;
  onChange: (event: any, date?: Date) => void;
  mode?: 'date' | 'time';
  display?: 'default' | 'spinner' | 'calendar' | 'clock';
  maximumDate?: Date;
  minimumDate?: Date;
  testID?: string;
}

const DatePickerPolyfill = (props: DatePickerPolyfillProps) => {
  // Use fallback if determined at module load time OR if the native module failed to load
  if (USE_FALLBACK || !DateTimePicker) {
    return <DatePickerFallback {...props} />;
  }

  // Attempt to render the native component, with a final catch
  try {
    return <DateTimePicker {...props} />;
  } catch (renderError) {
    console.error('[DatePickerPolyfill] Error rendering native DateTimePicker, falling back:', renderError);
    return <DatePickerFallback {...props} />;
  }
};

export default DatePickerPolyfill;

// Re-export the types from the original package
export type DateTimePickerEvent = {
  nativeEvent: {
    timestamp: number;
  };
  type: string;
};