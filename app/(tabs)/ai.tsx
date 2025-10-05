import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Platform 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import Colors from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing, Layout } from '@/constants/Spacing';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { useAuth } from '../../contexts/AuthContext';
import { User } from 'firebase/auth'; // Import Firebase User type

// Backend API URL configuration
const API_URL = Platform.OS === 'web' 
  ? 'http://localhost:8000'  // Use localhost for web development
  : 'http://172.26.80.1:8000'; // Replace with your IP for native device testing

export default function AiAssistantScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light']; // Provide default to fix null/undefined error
  const [isRecording, setIsRecording] = useState(false);
  const [userTranscript, setUserTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('Tap the sparkle button to ask me something...');
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const { currentUser } = useAuth(); // Get current user from auth context

  // Request permissions for audio recording
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Audio.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission denied', 'Please grant microphone permissions to use this feature.');
        }
      } catch (error) {
        console.error('Error requesting audio permissions:', error);
      }
    })();

    // Cleanup function to unload sound when component unmounts
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      // Clear previous state
      setUserTranscript('Listening...');
      setAiResponse('');
      
      // Configure recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      
      // Start new recording
      const recordingOptions = {
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        android: {
          ...Audio.RecordingOptionsPresets.HIGH_QUALITY.android,
          extension: '.wav',
          outputFormat: Audio.AndroidOutputFormat.DEFAULT,
          audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
        },
        ios: {
          ...Audio.RecordingOptionsPresets.HIGH_QUALITY.ios,
          extension: '.wav',
          outputFormat: Audio.IOSOutputFormat.LINEARPCM,
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
      };
      
      const { recording } = await Audio.Recording.createAsync(recordingOptions);
      
      setRecording(recording);
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording', error);
      Alert.alert('Error', 'Failed to start recording.');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    
    try {
      // Stop recording
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });
      
      const uri = recording.getURI();
      if (!uri) {
        throw new Error('Recording URI is null');
      }
      
      // Get file info - ONLY on native platforms (not web)
      if (Platform.OS !== 'web') {
        await FileSystem.getInfoAsync(uri);
      }
      
      setIsRecording(false);
      setRecording(null);
      setUserTranscript('Processing your request...');
      setIsProcessing(true);
      
      // Transcribe the recording
      await transcribeAudio(uri);
    } catch (error) {
      console.error('Failed to stop recording', error);
      setIsRecording(false);
      setIsProcessing(false);
      setUserTranscript('Error processing audio.');
      Alert.alert('Error', 'Failed to process recording.');
    }
  };

  const transcribeAudio = async (uri: string) => {
    try {      
      // Handle web platform differently than native
      if (Platform.OS === 'web') {
        try {
          // For web, we need to fetch the blob directly
          const response = await fetch(uri);
          const audioBlob = await response.blob();
          
          // Create FormData and append the blob
          const formData = new FormData();
          formData.append('file', audioBlob, 'recording.webm');
          
          // Send to backend
          const transcriptionResponse = await fetch(`${API_URL}/transcribe`, {
            method: 'POST',
            body: formData,
          });
          
          const responseText = await transcriptionResponse.text();
          
          if (!transcriptionResponse.ok) {
            throw new Error(`Transcription request failed: ${transcriptionResponse.status}`);
          }
          
          try {
            const data = JSON.parse(responseText);
            if (data.transcription) {
              setUserTranscript(data.transcription);
              await getAiResponse(data.transcription);
            } else {
              setUserTranscript('No speech detected. Please try again.');
              setIsProcessing(false);
            }
          } catch (e) {
            throw new Error(`Error parsing JSON response: ${e}`);
          }
        } catch (error) {
          console.error('Web transcription error:', error);
          setUserTranscript('Error transcribing audio.');
          setIsProcessing(false);
          Alert.alert('Error', `Failed to transcribe audio: ${error}`);
        }
        return;
      }
      
      // Native platforms (iOS, Android) handling
      const uriParts = uri.split('.');
      const fileExtension = uriParts[uriParts.length - 1];
      
      // Create a FormData object to send the audio file
      const formData = new FormData();
      
      // Use correct MIME type based on file extension
      let fileType = 'audio/wav';
      if (fileExtension === 'm4a') {
        fileType = 'audio/m4a';
      } else if (fileExtension === 'mp3') {
        fileType = 'audio/mp3';
      }
      
      // Add the file to the form data with correct file structure for native
      formData.append('file', {
        uri,
        name: `recording.${fileExtension}`,
        type: fileType,
      } as any);
      
      // Add user ID if available
      const userId = currentUser ? (currentUser as any).uid : null;
      if (userId) {
        formData.append('userId', userId);
      }
      
      // Call the backend transcription API
      const response = await fetch(`${API_URL}/transcribe`, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
      });
      
      const responseText = await response.text();
      
      if (!response.ok) {
        throw new Error(`Transcription request failed: ${response.status}`);
      }
      
      // Parse the JSON response
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        throw new Error(`Error parsing JSON response: ${e}`);
      }
      
      if (data.transcription) {
        setUserTranscript(data.transcription);
        
        // Now get AI response for the transcribed text
        await getAiResponse(data.transcription);
      } else {
        setUserTranscript('No speech detected. Please try again.');
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('Transcription error:', error);
      setUserTranscript('Error transcribing audio.');
      setIsProcessing(false);
      Alert.alert('Error', `Failed to transcribe audio: ${error}`);
    }
  };

  const getAiResponse = async (text: string) => {
    try {
      // Call the backend to get AI response
      setAiResponse('Processing your question...');
      
      // Get the current user ID if available
      const userId = currentUser ? (currentUser as any).uid : null;
      console.log('[AI REQUEST] Sending request with userId:', userId);
      
      // Call the backend AI endpoint with speech
      const response = await fetch(`${API_URL}/ai-response-speech`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          userId: userId || 'guest-user' // Send user ID or guest-user as fallback
        }),
      });
      
      if (!response.ok) {
        throw new Error(`AI response request failed: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.response) {
        setAiResponse(data.response);
        
        // Play the audio response if available
        if (data.audio_file) {
          await playAudioFile(`${API_URL}/audio/${data.audio_file}`);
        }
      } else {
        setAiResponse('Sorry, I could not generate a response. Please try again.');
      }
      
      setIsProcessing(false);
    } catch (error) {
      console.error('AI response error:', error);
      setAiResponse('Error getting AI response.');
      setIsProcessing(false);
    }
  };

  const playAudioFile = async (audioUrl: string) => {
    try {
      // Unload any existing sound
      if (sound) {
        await sound.unloadAsync();
      }
      
      // Load and play the new sound
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true }
      );
      
      setSound(newSound);
      
      // Unload when finished - using proper type checking
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          newSound.unloadAsync();
        }
      });
    } catch (error) {
      console.error('Error playing audio:', error);
      Alert.alert('Error', 'Failed to play audio response.');
    }
  };

  const handleRecordPress = () => {
    if (isProcessing) return; // Prevent button press during processing
    
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={styles.container}>
        {/* Output Display Area */}
        <ScrollView 
          style={styles.outputContainer} 
          contentContainerStyle={styles.outputContent}
        >
          <Text style={[styles.assistantResponse, { color: colors.text }]}>{aiResponse}</Text>
        </ScrollView>

        {/* User Input Display Area */}
        <View style={[styles.inputDisplayContainer, { backgroundColor: colors.card }]}>
          <Text style={[styles.inputLabel, { color: colors.secondaryText }]}>Your Input:</Text>
          <Text style={[styles.userInputText, { color: colors.text }]}>{userTranscript}</Text>
        </View>

        {/* Record Button Area */}
        <View style={styles.buttonContainer}>
          {isProcessing ? (
            <ActivityIndicator size="large" color={colors.primary} />
          ) : (
            <TouchableOpacity 
              style={[styles.recordButton, { backgroundColor: isRecording ? colors.error : colors.primary }]} 
              onPress={handleRecordPress}
              activeOpacity={0.7}
              disabled={isProcessing}
            >
              <Ionicons 
                name={'sparkles-outline'} 
                size={28}
                color={colors.background}
              />
            </TouchableOpacity>
          )}
          <Text style={[styles.buttonLabel, { color: colors.secondaryText }]}>
            {isRecording ? "Tap to stop" : "Tap to speak"}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: Spacing.md,
  },
  outputContainer: {
    flex: 3,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: Layout.borderRadiusMd,
    padding: Spacing.md,
  },
  outputContent: {
    flexGrow: 1,
  },
  assistantResponse: {
    fontSize: 20,
    lineHeight: 30,
  },
  inputDisplayContainer: {
    flex: 0.5,
    marginBottom: Spacing.md,
    borderRadius: Layout.borderRadiusMd,
    padding: Spacing.md,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  inputLabel: {
    ...Typography.label,
    fontSize: 18,
    marginBottom: Spacing.xs,
  },
  userInputText: {
    fontSize: 18,
    lineHeight: 26,
  },
  buttonContainer: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  buttonLabel: {
    marginTop: Spacing.xs,
    fontSize: 16,
    fontWeight: '500',
  }
}); 