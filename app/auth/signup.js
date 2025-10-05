import React, { useState } from 'react';
import { 
  View, 
  TextInput, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/Button';
import Colors from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { Typography } from '@/constants/Typography';
import { Ionicons } from '@expo/vector-icons';

export default function SignupScreen() {
  const router = useRouter();
  const { signup } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  
  // Form fields
  const [formData, setFormData] = useState({
    displayName: '',
    age: '',
    gender: '',
    email: '',
    password: '',
    confirmPassword: '',
    emergencyContact: {
      name: '',
      phone: '',
      relationship: ''
    }
  });

  const updateFormField = (field, value) => {
    const fieldPath = field.split('.');
    
    if (fieldPath.length === 1) {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
      
      // Clear error when field is edited
      if (errors[field]) {
        setErrors(prev => ({
          ...prev,
          [field]: null
        }));
      }
    } else {
      // Handle nested fields like emergencyContact.name
      const [parent, child] = fieldPath;
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
      
      // Clear error when nested field is edited
      if (errors[`${parent}.${child}`]) {
        setErrors(prev => ({
          ...prev,
          [`${parent}.${child}`]: null
        }));
      }
    }
  };

  const validateForm = () => {
    let isValid = true;
    const newErrors = {};

    // Validate name
    if (!formData.displayName.trim()) {
      newErrors.displayName = 'Name is required';
      isValid = false;
    }

    // Validate age
    if (!formData.age) {
      newErrors.age = 'Age is required';
      isValid = false;
    } else if (isNaN(formData.age) || parseInt(formData.age) <= 0) {
      newErrors.age = 'Please enter a valid age';
      isValid = false;
    }

    // Validate email
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
      isValid = false;
    }

    // Validate password
    if (!formData.password) {
      newErrors.password = 'Password is required';
      isValid = false;
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
      isValid = false;
    }

    // Validate confirm password
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
      isValid = false;
    }

    // Validate emergency contact name
    if (!formData.emergencyContact.name.trim()) {
      newErrors['emergencyContact.name'] = 'Emergency contact name is required';
      isValid = false;
    }

    // Validate emergency contact phone
    if (!formData.emergencyContact.phone.trim()) {
      newErrors['emergencyContact.phone'] = 'Emergency contact phone is required';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSignup = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Create user data object
      const userData = {
        displayName: formData.displayName,
        age: parseInt(formData.age),
        gender: formData.gender,
        emergencyContact: formData.emergencyContact,
        createdAt: new Date().toISOString(),
        photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.displayName)}&background=random`
      };

      // Sign up with Firebase Auth and save user data to Firestore
      await signup(formData.email, formData.password, userData);
      
      Alert.alert(
        'Account Created', 
        'Please check your email and verify your account before logging in. A verification link has been sent to your email address.',
        [{ text: 'OK', onPress: () => router.replace('/auth/login') }]
      );
    } catch (error) {
      let errorMessage = 'Failed to create account. Please try again.';
      
      // Handle specific Firebase auth errors
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already registered. Please use a different email or sign in.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address format.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please choose a stronger password.';
      }
      
      Alert.alert('Signup Error', errorMessage);
      console.error('Signup error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 50 : 0}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoContainer}>
          <Image 
            source={require('../../assets/images/icon.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Sign up to get started</Text>
        
        <View style={styles.form}>
          {/* Personal Information */}
          <Text style={styles.sectionTitle}>Personal Information</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Full Name</Text>
            <View style={[styles.inputWrapper, errors.displayName && styles.inputError]}>
              <Ionicons name="person-outline" size={20} color={Colors.light.secondaryText} />
              <TextInput
                style={styles.input}
                placeholder="Enter your full name"
                value={formData.displayName}
                onChangeText={(text) => updateFormField('displayName', text)}
              />
            </View>
            {errors.displayName && <Text style={styles.errorText}>{errors.displayName}</Text>}
          </View>

          <View style={styles.row}>
            <View style={[styles.inputContainer, styles.halfWidth]}>
              <Text style={styles.label}>Age</Text>
              <View style={[styles.inputWrapper, errors.age && styles.inputError]}>
                <Ionicons name="calendar-outline" size={20} color={Colors.light.secondaryText} />
                <TextInput
                  style={styles.input}
                  placeholder="Age"
                  keyboardType="numeric"
                  value={formData.age}
                  onChangeText={(text) => updateFormField('age', text)}
                />
              </View>
              {errors.age && <Text style={styles.errorText}>{errors.age}</Text>}
            </View>

            <View style={[styles.inputContainer, styles.halfWidth]}>
              <Text style={styles.label}>Gender</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="transgender-outline" size={20} color={Colors.light.secondaryText} />
                <TextInput
                  style={styles.input}
                  placeholder="Gender (optional)"
                  value={formData.gender}
                  onChangeText={(text) => updateFormField('gender', text)}
                />
              </View>
            </View>
          </View>

          {/* Emergency Contact */}
          <Text style={styles.sectionTitle}>Emergency Contact</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Contact Name</Text>
            <View style={[styles.inputWrapper, errors['emergencyContact.name'] && styles.inputError]}>
              <Ionicons name="person-outline" size={20} color={Colors.light.secondaryText} />
              <TextInput
                style={styles.input}
                placeholder="Emergency contact name"
                value={formData.emergencyContact.name}
                onChangeText={(text) => updateFormField('emergencyContact.name', text)}
              />
            </View>
            {errors['emergencyContact.name'] && <Text style={styles.errorText}>{errors['emergencyContact.name']}</Text>}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Contact Phone</Text>
            <View style={[styles.inputWrapper, errors['emergencyContact.phone'] && styles.inputError]}>
              <Ionicons name="call-outline" size={20} color={Colors.light.secondaryText} />
              <TextInput
                style={styles.input}
                placeholder="Emergency contact phone"
                keyboardType="phone-pad"
                value={formData.emergencyContact.phone}
                onChangeText={(text) => updateFormField('emergencyContact.phone', text)}
              />
            </View>
            {errors['emergencyContact.phone'] && <Text style={styles.errorText}>{errors['emergencyContact.phone']}</Text>}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Relationship</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="people-outline" size={20} color={Colors.light.secondaryText} />
              <TextInput
                style={styles.input}
                placeholder="Relationship (optional)"
                value={formData.emergencyContact.relationship}
                onChangeText={(text) => updateFormField('emergencyContact.relationship', text)}
              />
            </View>
          </View>

          {/* Account Information */}
          <Text style={styles.sectionTitle}>Account Information</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <View style={[styles.inputWrapper, errors.email && styles.inputError]}>
              <Ionicons name="mail-outline" size={20} color={Colors.light.secondaryText} />
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
                value={formData.email}
                onChangeText={(text) => updateFormField('email', text)}
              />
            </View>
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <View style={[styles.inputWrapper, errors.password && styles.inputError]}>
              <Ionicons name="lock-closed-outline" size={20} color={Colors.light.secondaryText} />
              <TextInput
                style={styles.input}
                placeholder="Create a password"
                secureTextEntry={!showPassword}
                value={formData.password}
                onChangeText={(text) => updateFormField('password', text)}
              />
              <TouchableOpacity 
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                <Ionicons 
                  name={showPassword ? "eye-off-outline" : "eye-outline"} 
                  size={20} 
                  color={Colors.light.secondaryText} 
                />
              </TouchableOpacity>
            </View>
            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Confirm Password</Text>
            <View style={[styles.inputWrapper, errors.confirmPassword && styles.inputError]}>
              <Ionicons name="lock-closed-outline" size={20} color={Colors.light.secondaryText} />
              <TextInput
                style={styles.input}
                placeholder="Confirm your password"
                secureTextEntry={!showConfirmPassword}
                value={formData.confirmPassword}
                onChangeText={(text) => updateFormField('confirmPassword', text)}
              />
              <TouchableOpacity 
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                style={styles.eyeIcon}
              >
                <Ionicons 
                  name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} 
                  size={20} 
                  color={Colors.light.secondaryText} 
                />
              </TouchableOpacity>
            </View>
            {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
          </View>

          <Button
            title={loading ? "Creating Account..." : "Create Account"}
            onPress={handleSignup}
            disabled={loading}
            style={styles.signupButton}
            icon={loading ? <ActivityIndicator size="small" color="#fff" /> : null}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/auth/login')}>
            <Text style={styles.loginLink}>Sign in</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  logo: {
    width: 80,
    height: 80,
  },
  title: {
    ...Typography.title,
    fontSize: 28,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    ...Typography.bodyText,
    fontSize: 16,
    color: Colors.light.secondaryText,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.sectionHeader,
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
    fontSize: 18,
  },
  form: {
    marginBottom: Spacing.lg,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    width: '48%',
  },
  inputContainer: {
    marginBottom: Spacing.md,
  },
  label: {
    ...Typography.bodyText,
    marginBottom: Spacing.xs,
    fontWeight: '500',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    paddingHorizontal: Spacing.md,
    height: 50,
  },
  inputError: {
    borderColor: Colors.light.error,
  },
  input: {
    flex: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    fontSize: 16,
  },
  eyeIcon: {
    padding: Spacing.xs,
  },
  errorText: {
    color: Colors.light.error,
    marginTop: Spacing.xs,
    fontSize: 14,
  },
  signupButton: {
    height: 50,
    marginTop: Spacing.lg,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  footerText: {
    color: Colors.light.secondaryText,
  },
  loginLink: {
    color: Colors.light.primary,
    fontWeight: 'bold',
  },
}); 