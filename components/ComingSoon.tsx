import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import Colors from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import { Ionicons } from '@expo/vector-icons';

interface ComingSoonProps {
  title?: string;
  message?: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
}

export function ComingSoon({ 
  title = "Coming Soon", 
  message = "This feature is under development and will be available in a future update.", 
  icon = "time-outline" 
}: ComingSoonProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Ionicons name={icon} size={80} color={colors.primary} style={styles.icon} />
        <Text style={[Typography.title, styles.title, { color: colors.text }]}>
          {title}
        </Text>
        <Text style={[Typography.bodyText, styles.message, { color: colors.text }]}>
          {message}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  content: {
    alignItems: 'center',
    maxWidth: 300,
  },
  icon: {
    marginBottom: Spacing.md,
  },
  title: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  message: {
    textAlign: 'center',
    opacity: 0.8,
  },
}); 