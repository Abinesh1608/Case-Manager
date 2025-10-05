import React from 'react';
import { Stack } from 'expo-router';
import { ComingSoon } from '../../../components/ComingSoon';

export default function WellnessScreen() {
  return (
    <>
      <Stack.Screen options={{ 
        headerTitle: 'Wellness & Lifestyle',
        headerBackVisible: true // Make sure back button is visible
      }} />
      <ComingSoon 
        title="Wellness Features Coming Soon"
        message="Track your diet, activity, sleep, and wellness practices in a future update."
        icon="leaf-outline"
      />
    </>
  );
} 