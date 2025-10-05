import React from 'react';
import { Stack } from 'expo-router';
import { ComingSoon } from '../../components/ComingSoon';

export default function ExploreScreen() {
  return (
    <>
      <Stack.Screen options={{ headerTitle: 'Explore' }} />
      <ComingSoon 
        title="Explore Features Coming Soon"
        message="Discover new health resources, community features, and information in a future update."
        icon="compass-outline"
      />
    </>
  );
}
