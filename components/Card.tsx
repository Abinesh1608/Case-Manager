import React from 'react';
import { 
  View, 
  StyleSheet, 
  ViewStyle, 
  TouchableOpacity 
} from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import Colors from '@/constants/Colors';
import { Spacing, Layout } from '@/constants/Spacing';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  variant?: 'default' | 'medication' | 'appointment' | 'emergency' | 'wellness';
}

export function Card({ 
  children, 
  style, 
  onPress, 
  variant = 'default' 
}: CardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  const getBorderColor = () => {
    switch (variant) {
      case 'medication':
        return colors.medication;
      case 'appointment':
        return colors.appointment;
      case 'emergency':
        return colors.emergency;
      case 'wellness':
        return colors.wellness;
      default:
        return colors.border;
    }
  };

  const CardContainer = onPress ? TouchableOpacity : View;

  return (
    <CardContainer
      style={[
        styles.card,
        { 
          backgroundColor: colors.card,
          borderColor: getBorderColor(),
        },
        variant !== 'default' && styles.accentCard,
        style
      ]}
      onPress={onPress}
      activeOpacity={onPress ? 0.8 : 1}
    >
      {children}
    </CardContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Layout.borderRadiusMd,
    padding: Spacing.md,
    marginVertical: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
  },
  accentCard: {
    borderLeftWidth: 4,
  },
}); 