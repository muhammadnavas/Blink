import { AudioRecorder } from 'expo-audio';
import * as Speech from 'expo-speech';
import { useRef, useState } from 'react';
import {
    Alert,
    Animated,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

/**
 * Voice Input Component for Smart Reminders
 * Provides speech-to-text and text-to-speech functionality
 */

export default function VoiceInput({ 
  onVoiceResult, 
  onError, 
  isListening = false,
  darkMode = false,
  disabled = false 
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState(null);
  const [transcription, setTranscription] = useState('');
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Request audio permissions
  const requestPermissions = async () => {
    try {
      const { status } = await AudioRecorder.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required', 
          'Please grant microphone permission to use voice input'
        );
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error requesting audio permissions:', error);
      return false;
    }
  };

  // Start voice recording
  const startRecording = async () => {
    try {
      if (disabled) return;
      
      const hasPermission = await requestPermissions();
      if (!hasPermission) return;

      console.log('🎤 Starting voice recording...');
      
      // Create audio recorder instance
      const newRecording = new AudioRecorder({
        extension: '.m4a',
        sampleRate: 44100,
        numberOfChannels: 1,
        bitRate: 128000,
      });

      // Start recording
      await newRecording.record();

      setRecording(newRecording);
      setIsRecording(true);
      startPulseAnimation();

      // Auto-stop after 8 seconds to prevent long recordings
      const autoStopTimer = setTimeout(() => {
        if (isRecording) {
          console.log('🕐 Auto-stopping recording after 8 seconds');
          stopRecording();
        }
      }, 8000); // Reduced from 10s to 8s
      
      // Store timer reference for cleanup
      setRecording(Object.assign(newRecording, { autoStopTimer }));

    } catch (error) {
      console.error('❌ Error starting recording:', error);
      onError && onError('Failed to start voice recording: ' + error.message);
      Alert.alert('Error', 'Failed to start voice recording');
    }
  };

  // Stop voice recording
  const stopRecording = async () => {
    try {
      if (!recording) return;

      console.log('🛑 Stopping voice recording...');
      
      setIsRecording(false);
      stopPulseAnimation();
      
      // Clear auto-stop timer if it exists
      if (recording.autoStopTimer) {
        clearTimeout(recording.autoStopTimer);
      }
      
      const uri = await recording.stop();
      setRecording(null);

      if (uri) {
        // In a real app, you would send this to a speech-to-text service
        // For now, we'll simulate the process and show a demo response
        await processVoiceInput(uri);
      }

    } catch (error) {
      console.error('❌ Error stopping recording:', error);
      onError && onError('Failed to stop voice recording: ' + error.message);
    }
  };

  // Process voice input (simulated speech-to-text)
  const processVoiceInput = async (audioUri) => {
    try {
      console.log('🧠 Processing voice input...');
      
      // Simulate processing delay (reduced for better UX)
      await new Promise(resolve => setTimeout(resolve, 800)); // Reduced from 1500ms to 800ms
      
      // In a real implementation, you would:
      // 1. Send audio to speech-to-text service (Google Speech, AWS Transcribe, etc.)
      // 2. Get back the transcribed text
      // 3. Pass it to the natural language parser
      
      // For demo purposes, we'll simulate some common voice inputs
      const demoInputs = [
        "Remind me to call mom at 7 PM",
        "Take medicine in 30 minutes",
        "Meeting tomorrow at 2 PM",
        "Buy groceries this evening",
        "Daily reminder to exercise at 8 AM",
        "Pay bills by Friday",
        "Water plants in 2 hours"
      ];
      
      const simulatedTranscription = demoInputs[Math.floor(Math.random() * demoInputs.length)];
      
      setTranscription(simulatedTranscription);
      
      // Provide haptic feedback if available
      if (Platform.OS === 'ios') {
        // Import haptics only on iOS
        const { impactAsync, ImpactFeedbackStyle } = await import('expo-haptics');
        await impactAsync(ImpactFeedbackStyle.Light);
      }
      
      // Call the callback with the transcribed text
      onVoiceResult && onVoiceResult(simulatedTranscription);
      
      console.log('✅ Voice processing complete:', simulatedTranscription);
      
    } catch (error) {
      console.error('❌ Error processing voice input:', error);
      onError && onError('Failed to process voice input: ' + error.message);
    }
  };

  // Start pulse animation for recording indicator
  const startPulseAnimation = () => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    );
    
    const scale = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    
    pulse.start();
    scale.start();
  };

  // Stop pulse animation
  const stopPulseAnimation = () => {
    pulseAnim.stopAnimation();
    scaleAnim.stopAnimation();
    
    Animated.parallel([
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Handle voice button press
  const handleVoicePress = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // Speak text using text-to-speech
  const speakText = async (text) => {
    try {
      const isAvailable = await Speech.isSpeakingAsync();
      if (isAvailable) {
        await Speech.stop();
      }
      
      await Speech.speak(text, {
        language: 'en-US',
        pitch: 1.0,
        rate: 0.9,
        volume: 0.8,
      });
    } catch (error) {
      console.error('❌ Error with text-to-speech:', error);
    }
  };

  return (
    <View style={[styles.container, darkMode && styles.darkContainer]}>
      {/* Main Voice Button */}
      <TouchableOpacity
        style={[
          styles.voiceButton,
          isRecording && styles.recordingButton,
          disabled && styles.disabledButton,
          darkMode && styles.darkButton
        ]}
        onPress={handleVoicePress}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <Animated.View
          style={[
            styles.buttonInner,
            {
              transform: [
                { scale: isRecording ? pulseAnim : scaleAnim },
              ],
            },
          ]}
        >
          <Text style={[styles.buttonIcon, darkMode && styles.darkIcon]}>
            {isRecording ? '🛑' : '🎤'}
          </Text>
        </Animated.View>
        
        {isRecording && (
          <View style={styles.recordingIndicator}>
            <Animated.View 
              style={[
                styles.pulseRing,
                {
                  transform: [{ scale: pulseAnim }],
                  opacity: pulseAnim.interpolate({
                    inputRange: [1, 1.3],
                    outputRange: [0.7, 0],
                  }),
                },
              ]}
            />
          </View>
        )}
      </TouchableOpacity>

      {/* Status Text */}
      <Text style={[styles.statusText, darkMode && styles.darkText]}>
        {isRecording 
          ? 'Listening... (tap to stop)' 
          : disabled 
          ? 'Voice input disabled'
          : 'Tap to speak'
        }
      </Text>

      {/* Last Transcription Display */}
      {transcription && (
        <View style={[styles.transcriptionContainer, darkMode && styles.darkTranscription]}>
          <Text style={[styles.transcriptionLabel, darkMode && styles.darkText]}>
            Last voice input:
          </Text>
          <Text style={[styles.transcriptionText, darkMode && styles.darkText]}>
            "{transcription}"
          </Text>
          <TouchableOpacity
            style={styles.speakButton}
            onPress={() => speakText(transcription)}
          >
            <Text style={styles.speakButtonText}>🔊 Play</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Voice Input Tips */}
      <View style={[styles.tipsContainer, darkMode && styles.darkTips]}>
        <Text style={[styles.tipsTitle, darkMode && styles.darkText]}>
          💡 Voice Tips:
        </Text>
        <Text style={[styles.tipsText, darkMode && styles.darkText]}>
          Try: "Remind me to call mom at 7 PM" or "Take medicine in 30 minutes"
        </Text>
      </View>
    </View>
  );
}

// Text-to-speech utility function (can be used separately)
export const speakText = async (text, options = {}) => {
  try {
    const defaultOptions = {
      language: 'en-US',
      pitch: 1.0,
      rate: 0.9,
      volume: 0.8,
      ...options
    };
    
    const isAvailable = await Speech.isSpeakingAsync();
    if (isAvailable) {
      await Speech.stop();
    }
    
    await Speech.speak(text, defaultOptions);
    return true;
  } catch (error) {
    console.error('❌ Text-to-speech error:', error);
    return false;
  }
};

// Check if speech is supported
export const isSpeechSupported = async () => {
  try {
    return Speech.isSpeakingAsync !== undefined;
  } catch (error) {
    return false;
  }
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 15,
  },
  darkContainer: {
    backgroundColor: 'transparent',
  },
  voiceButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    position: 'relative',
  },
  recordingButton: {
    backgroundColor: '#FF3B30',
  },
  disabledButton: {
    backgroundColor: '#999',
    opacity: 0.6,
  },
  darkButton: {
    backgroundColor: '#1E90FF',
  },
  buttonInner: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonIcon: {
    fontSize: 28,
  },
  darkIcon: {
    // Icon color doesn't need to change for emojis
  },
  recordingIndicator: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
  },
  pulseRing: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 45,
    borderWidth: 3,
    borderColor: '#FF3B30',
  },
  statusText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  darkText: {
    color: '#ccc',
  },
  transcriptionContainer: {
    marginTop: 15,
    padding: 15,
    backgroundColor: '#f0f8ff',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
    width: '100%',
  },
  darkTranscription: {
    backgroundColor: '#2c2c2c',
    borderLeftColor: '#1E90FF',
  },
  transcriptionLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
    fontWeight: '500',
  },
  transcriptionText: {
    fontSize: 16,
    color: '#333',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  speakButton: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#007AFF',
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  speakButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  tipsContainer: {
    marginTop: 15,
    padding: 12,
    backgroundColor: '#fff9e6',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffe066',
    width: '100%',
  },
  darkTips: {
    backgroundColor: '#332900',
    borderColor: '#996600',
  },
  tipsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#b8860b',
    marginBottom: 4,
  },
  tipsText: {
    fontSize: 11,
    color: '#8b7355',
    lineHeight: 14,
  },
});