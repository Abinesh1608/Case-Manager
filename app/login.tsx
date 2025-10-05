import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Alert, Image, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import Colors from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing, Layout } from '@/constants/Spacing';
import { Button } from '../components/Button';
import { router } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const { login, signup, currentUser, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  
  // Redirect if already logged in
  useEffect(() => {
    if (currentUser && !authLoading) {
      router.replace('/(tabs)');
    }
  }, [currentUser, authLoading]);
  
  // Pre-filled test credentials for easy testing
  const [email, setEmail] = useState('test@example.com');
  const [password, setPassword] = useState('Test123!');
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [phone, setPhone] = useState('');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [allergies, setAllergies] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  
  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }
    
    if (!isLogin && !name) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }
    
    setLoading(true);
    
    try {
      if (isLogin) {
        await login(email, password);
        router.replace('/(tabs)');
      } else {
        // Include additional user info in signup
        const userProfile = {
          displayName: name,
          age: age,
          phone: phone,
          emergencyContact: {
            name: emergencyContactName,
            phone: emergencyContactPhone
          },
          allergies: allergies,
        };
        
        await signup(email, password, userProfile);
        router.replace('/(tabs)');
      }
    } catch (error) {
      console.error('Authentication error:', error);
      // Provide more specific error messages
      let errorMessage = 'An unknown error occurred. Please try again.';
      
      if (error.code) {
        switch (error.code) {
          case 'auth/invalid-email':
            errorMessage = 'The email address is not valid.';
            break;
          case 'auth/user-disabled':
            errorMessage = 'This user account has been disabled.';
            break;
          case 'auth/user-not-found':
          case 'auth/wrong-password':
            errorMessage = 'Invalid email or password. Please try again.';
            break;
          case 'auth/email-already-in-use':
            errorMessage = 'This email is already in use. Please try another email or sign in.';
            break;
          case 'auth/weak-password':
            errorMessage = 'Password is too weak. Please use a stronger password.';
            break;
          case 'auth/network-request-failed':
            errorMessage = 'Network error. Please check your internet connection.';
            break;
          default:
            errorMessage = error.message || errorMessage;
        }
      }
      
      Alert.alert('Authentication Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };
  
  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
  };
  
  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.logoContainer}>
          <Image 
            source={require('../assets/images/icon.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={[Typography.title, { color: colors.text, marginTop: Spacing.md }]}>
            Case Manager
          </Text>
          <Text style={[Typography.bodyText, { color: colors.text, opacity: 0.7, textAlign: 'center', marginTop: Spacing.sm }]}>
            {isLogin ? 'Sign in to manage your health data' : 'Create an account to get started'}
          </Text>
        </View>
        
        <View style={styles.formContainer}>
          {!isLogin && (
            <>
              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={24} color={colors.text} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                  placeholder="Full Name"
                  placeholderTextColor={colors.text + '80'}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>
              
              <View style={styles.inputContainer}>
                <Ionicons name="calendar-outline" size={24} color={colors.text} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                  placeholder="Age"
                  placeholderTextColor={colors.text + '80'}
                  value={age}
                  onChangeText={setAge}
                  keyboardType="number-pad"
                />
              </View>
              
              <View style={styles.inputContainer}>
                <Ionicons name="call-outline" size={24} color={colors.text} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                  placeholder="Phone Number"
                  placeholderTextColor={colors.text + '80'}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              </View>
              
              <Text style={[Typography.sectionHeader, { color: colors.text, marginTop: Spacing.md, marginBottom: Spacing.sm }]}>
                Emergency Contact
              </Text>
              
              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={24} color={colors.text} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                  placeholder="Emergency Contact Name"
                  placeholderTextColor={colors.text + '80'}
                  value={emergencyContactName}
                  onChangeText={setEmergencyContactName}
                  autoCapitalize="words"
                />
              </View>
              
              <View style={styles.inputContainer}>
                <Ionicons name="call-outline" size={24} color={colors.text} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                  placeholder="Emergency Contact Phone"
                  placeholderTextColor={colors.text + '80'}
                  value={emergencyContactPhone}
                  onChangeText={setEmergencyContactPhone}
                  keyboardType="phone-pad"
                />
              </View>
              
              <View style={styles.inputContainer}>
                <Ionicons name="medkit-outline" size={24} color={colors.text} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                  placeholder="Allergies (if any)"
                  placeholderTextColor={colors.text + '80'}
                  value={allergies}
                  onChangeText={setAllergies}
                />
              </View>
            </>
          )}
          
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={24} color={colors.text} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              placeholder="Email"
              placeholderTextColor={colors.text + '80'}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
          
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={24} color={colors.text} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              placeholder="Password"
              placeholderTextColor={colors.text + '80'}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
            />
          </View>
          
          {isLogin && (
            <TouchableOpacity style={styles.forgotPasswordContainer}>
              <Text style={[styles.forgotPassword, { color: colors.primary }]}>
                Forgot Password?
              </Text>
            </TouchableOpacity>
          )}
          
          <Button
            title={isLogin ? 'Sign In' : 'Create Account'}
            onPress={handleAuth}
            disabled={loading}
            style={styles.authButton}
          />
          
          <View style={styles.switchAuthContainer}>
            <Text style={{ color: colors.text }}>
              {isLogin ? "Don't have an account? " : "Already have an account? "}
            </Text>
            <TouchableOpacity onPress={toggleAuthMode}>
              <Text style={{ color: colors.primary, fontWeight: 'bold' }}>
                {isLogin ? 'Sign Up' : 'Sign In'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.footer}>
          <Text style={{ color: colors.text, opacity: 0.7, textAlign: 'center' }}>
            By continuing, you agree to our Terms of Service and Privacy Policy
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    padding: Spacing.lg,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  logo: {
    width: 100,
    height: 100,
  },
  formContainer: {
    marginBottom: Spacing.xl,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderRadius: Layout.borderRadiusMd,
    paddingHorizontal: Spacing.md,
    height: Layout.inputHeight,
  },
  inputIcon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    height: '100%',
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginBottom: Spacing.lg,
  },
  forgotPassword: {
    fontWeight: '600',
  },
  authButton: {
    marginBottom: Spacing.lg,
  },
  switchAuthContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  footer: {
    marginTop: Spacing.lg,
  },
}); 