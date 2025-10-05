import React from 'react';
import { Stack } from 'expo-router';
import { ComingSoon } from '../../components/ComingSoon';

export default function MoreScreen() {
  return (
    <>
      <Stack.Screen options={{ headerTitle: 'More' }} />
      <ComingSoon 
        title="More Features Coming Soon"
        message="Additional settings, profile management, and support features will be available in the next update."
        icon="settings-outline"
      />
    </>
  );
} 