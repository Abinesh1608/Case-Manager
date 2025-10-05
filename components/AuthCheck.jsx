import React, { useEffect } from 'react';
import { router } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { LoadingScreen } from './LoadingScreen';

export function AuthCheck() {
  const { currentUser, loading } = useAuth();

  useEffect(() => {
    // Don't run any redirects until auth state is loaded
    if (!loading) {
      if (!currentUser) {
        router.replace('login');
      }
    }
  }, [currentUser, loading]);

  if (loading) {
    return <LoadingScreen message="Checking authentication..." />;
  }

  // If not authenticated, show nothing (will redirect)
  if (!currentUser) {
    return null;
  }

  // If authenticated, continue with the app
  return null;
} 