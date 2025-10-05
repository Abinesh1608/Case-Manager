import React from 'react';
import { TextInput as RNTextInput, TextInputProps, StyleSheet, View, Text } from 'react-native';
import Colors from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import Typography from '@/constants/Typography';
import { useColorScheme } from '@/hooks/useColorScheme';

interface CustomTextInputProps extends TextInputProps {
  error?: string;
}

export function TextInput(props: CustomTextInputProps) {
  const { error, style, ...otherProps } = props;
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme || 'light'];
  
  return (
    <View style={styles.container}>
      <RNTextInput
        style={[
          styles.input,
          { 
            color: colors.text,
            borderColor: error ? colors.error : colors.border,
            backgroundColor: colors.background 
          },
          style
        ]}
        placeholderTextColor={colors.secondaryText || '#999'}
        {...otherProps}
      />
      {error && <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 4,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 8,
    padding: Spacing.md,
    fontSize: 16,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 2,
  }
});

export default TextInput; 