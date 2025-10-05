import React from 'react';
import { Stack, useLocalSearchParams } from 'expo-router';
import { ComingSoon } from '../../components/ComingSoon';

export default function ComingSoonScreen() {
  // Get parameters from the URL
  const params = useLocalSearchParams();
  
  // Extract parameters with defaults
  const title = params.title as string || "Coming Soon";
  const message = params.message as string || "This feature is under development and will be available in a future update.";
  const icon = params.icon as string || "time-outline";
  
  return (
    <>
      <Stack.Screen options={{ headerTitle: title }} />
      <ComingSoon 
        title={title}
        message={message}
        icon={icon}
      />
    </>
  );
} 