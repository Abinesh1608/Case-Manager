import React from 'react';
import { 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  ViewStyle, 
  TextStyle,
  ActivityIndicator,
  View
} from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import Colors from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Layout, Spacing } from '@/constants/Spacing';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger';
type ButtonSize = 'small' | 'medium' | 'large';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  style,
  textStyle,
  icon,
  iconPosition = 'left'
}: ButtonProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  const getButtonStyles = (): ViewStyle => {
    let btnStyle: ViewStyle = {};
    
    switch (variant) {
      case 'primary':
        btnStyle = {
          backgroundColor: colors.primary,
          borderWidth: 0,
        };
        break;
      case 'secondary':
        btnStyle = {
          backgroundColor: colors.background,
          borderWidth: 0,
        };
        break;
      case 'outline':
        btnStyle = {
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderColor: colors.primary,
        };
        break;
      case 'danger':
        btnStyle = {
          backgroundColor: colors.emergency,
          borderWidth: 0,
        };
        break;
    }

    if (disabled) {
      btnStyle.opacity = 0.6;
    }

    return btnStyle;
  };

  const getTextStyles = (): TextStyle => {
    let txtStyle: TextStyle = {};
    
    switch (variant) {
      case 'primary':
        txtStyle = {
          color: '#FFFFFF',
        };
        break;
      case 'secondary':
        txtStyle = {
          color: colors.text,
        };
        break;
      case 'outline':
        txtStyle = {
          color: colors.primary,
        };
        break;
      case 'danger':
        txtStyle = {
          color: '#FFFFFF',
        };
        break;
    }

    return txtStyle;
  };

  const getSizeStyles = (): ViewStyle => {
    switch (size) {
      case 'small':
        return {
          height: Layout.buttonHeight * 0.75,
          paddingHorizontal: Spacing.md,
        };
      case 'large':
        return {
          height: Layout.buttonHeight * 1.25,
          paddingHorizontal: Spacing.xl,
        };
      default:
        return {};
    }
  };

  const getTextSizeStyles = (): TextStyle => {
    switch (size) {
      case 'small':
        return {
          fontSize: 14,
        };
      case 'large':
        return {
          fontSize: 18,
          fontWeight: '600',
        };
      default:
        return {};
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        getButtonStyles(),
        getSizeStyles(),
        style
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variant === 'outline' ? colors.primary : '#FFFFFF'} />
      ) : (
        <View style={styles.buttonContent}>
          {icon && iconPosition === 'left' && (
            <View style={styles.iconContainer}>
              {icon}
            </View>
          )}
          <Text style={[
            Typography.button,
            getTextStyles(),
            getTextSizeStyles(),
            textStyle
          ]}>
            {title}
          </Text>
          {icon && iconPosition === 'right' && (
            <View style={styles.iconContainer}>
              {icon}
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    height: Layout.buttonHeight,
    borderRadius: Layout.borderRadiusMd,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: Layout.minTouchTarget * 2,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginHorizontal: Spacing.xs,
  },
}); 