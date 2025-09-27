import { useEffect, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { getInputSuggestions, parseNaturalLanguage, validateParsedResult } from '../services/nlpParser';
import VoiceInput, { speakText } from './VoiceInput';

/**
 * Smart Input Component for Natural Language Reminders
 * Combines text input, voice input, and AI parsing
 */

export default function SmartInput({ 
  onReminderParsed, 
  onError, 
  darkMode = false,
  initialValue = '',
  placeholder = "Try: 'Remind me to call mom at 7 PM'"
}) {
  const [inputText, setInputText] = useState(initialValue);
  const [parsedResult, setParsedResult] = useState(null);
  const [showVoice, setShowVoice] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showParsePreview, setShowParsePreview] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [suggestions] = useState(getInputSuggestions());
  
  const inputRef = useRef(null);
  const parseTimeoutRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Auto-parse as user types (with debounce)
  useEffect(() => {
    if (parseTimeoutRef.current) {
      clearTimeout(parseTimeoutRef.current);
    }

    if (inputText.trim().length > 3) {
      parseTimeoutRef.current = setTimeout(() => {
        handleSmartParse(inputText, false); // Silent parsing
      }, 600); // Reduced from 1000ms to 600ms for faster response
    } else {
      setParsedResult(null);
    }

    return () => {
      if (parseTimeoutRef.current) {
        clearTimeout(parseTimeoutRef.current);
      }
    };
  }, [inputText]);

  // Handle voice input result
  const handleVoiceResult = (voiceText) => {
    console.log('🎤 Voice input received:', voiceText);
    setInputText(voiceText);
    setShowVoice(false);
    
    // Clear any existing parse timeout to avoid race conditions
    if (parseTimeoutRef.current) {
      clearTimeout(parseTimeoutRef.current);
    }
    
    // Parse the voice input immediately since it's intentional
    handleSmartParse(voiceText, true);
  };

  // Handle smart parsing
  const handleSmartParse = async (text, showFeedback = true) => {
    if (!text.trim()) return;

    setIsProcessing(true);
    
    try {
      console.log('🧠 Parsing:', text);
      const result = parseNaturalLanguage(text.trim());
      
      setParsedResult(result);
      
      if (showFeedback) {
        if (result.success) {
          // Show success animation
          animateSuccess();
          
          // Provide audio feedback
          if (result.reminder.confidence > 70) {
            speakText(`Reminder set: ${result.reminder.text} ${result.reminder.timeDescription || ''}`);
          }
        } else {
          Alert.alert(
            'Parsing Issue',
            `I had trouble understanding "${text}". Please try rephrasing or use the manual input.`,
            [
              { text: 'Try Again', style: 'default' },
              { text: 'Manual Input', onPress: () => setShowParsePreview(false) }
            ]
          );
        }
      }

      // Validate the result
      const validation = validateParsedResult(result);
      if (validation.warnings.length > 0 && showFeedback) {
        console.warn('⚠️ Parsing warnings:', validation.warnings);
      }

    } catch (error) {
      console.error('❌ Error parsing input:', error);
      onError && onError(`Parsing error: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Success animation
  const animateSuccess = () => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(2000),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion) => {
    setInputText(suggestion);
    setShowSuggestions(false);
    inputRef.current?.focus();
    
    // Auto-parse the suggestion
    setTimeout(() => {
      handleSmartParse(suggestion, true);
    }, 500);
  };

  // Create reminder from parsed result
  const handleCreateReminder = () => {
    if (!parsedResult || !parsedResult.success) {
      Alert.alert('Error', 'Please enter a valid reminder or try rephrasing');
      return;
    }

    // Pass the parsed reminder data to parent component
    onReminderParsed && onReminderParsed(parsedResult);
    
    // Clear input
    setInputText('');
    setParsedResult(null);
    setShowParsePreview(false);
  };

  // Render parsing preview
  const renderParsePreview = () => {
    if (!parsedResult) return null;

    const { reminder, parseDetails } = parsedResult;
    const confidenceColor = reminder.confidence > 70 ? '#4CAF50' : 
                           reminder.confidence > 50 ? '#FF9800' : '#F44336';

    return (
      <View style={[styles.parsePreview, darkMode && styles.darkPreview]}>
        <View style={styles.previewHeader}>
          <Text style={[styles.previewTitle, darkMode && styles.darkText]}>
            🧠 Smart Parse Result
          </Text>
          <View style={[styles.confidenceBadge, { backgroundColor: confidenceColor }]}>
            <Text style={styles.confidenceText}>{reminder.confidence}%</Text>
          </View>
        </View>

        <ScrollView style={styles.previewContent} showsVerticalScrollIndicator={false}>
          <View style={styles.previewItem}>
            <Text style={[styles.previewLabel, darkMode && styles.darkText]}>📝 Task:</Text>
            <Text style={[styles.previewValue, darkMode && styles.darkText]}>{reminder.text}</Text>
          </View>

          <View style={styles.previewItem}>
            <Text style={[styles.previewLabel, darkMode && styles.darkText]}>⏰ Time:</Text>
            <Text style={[styles.previewValue, darkMode && styles.darkText]}>
              {reminder.timeDescription || `${reminder.time} seconds`}
            </Text>
          </View>

          <View style={styles.previewItem}>
            <Text style={[styles.previewLabel, darkMode && styles.darkText]}>📂 Category:</Text>
            <Text style={[styles.previewValue, darkMode && styles.darkText]}>{reminder.category}</Text>
          </View>

          <View style={styles.previewItem}>
            <Text style={[styles.previewLabel, darkMode && styles.darkText]}>🎯 Priority:</Text>
            <Text style={[styles.previewValue, darkMode && styles.darkText]}>{reminder.priority}</Text>
          </View>

          <View style={styles.previewItem}>
            <Text style={[styles.previewLabel, darkMode && styles.darkText]}>🔄 Type:</Text>
            <Text style={[styles.previewValue, darkMode && styles.darkText]}>{reminder.type}</Text>
          </View>

          {reminder.note && (
            <View style={styles.previewItem}>
              <Text style={[styles.previewLabel, darkMode && styles.darkText]}>💡 Note:</Text>
              <Text style={[styles.previewNote, darkMode && styles.darkText]}>{reminder.note}</Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.previewActions}>
          <TouchableOpacity 
            style={[styles.previewButton, styles.cancelButton]}
            onPress={() => setShowParsePreview(false)}
          >
            <Text style={styles.cancelButtonText}>✕ Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.previewButton, styles.confirmButton]}
            onPress={handleCreateReminder}
          >
            <Text style={styles.confirmButtonText}>✓ Create Reminder</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, darkMode && styles.darkContainer]}>
      {/* Success Animation Overlay */}
      <Animated.View 
        style={[
          styles.successOverlay,
          { opacity: fadeAnim }
        ]}
        pointerEvents="none"
      >
        <Text style={styles.successText}>✨ Parsed Successfully!</Text>
      </Animated.View>

      {/* Smart Input Field */}
      <View style={[styles.inputContainer, darkMode && styles.darkInputContainer]}>
        <TextInput
          ref={inputRef}
          style={[styles.textInput, darkMode && styles.darkTextInput]}
          placeholder={placeholder}
          placeholderTextColor={darkMode ? '#999' : '#666'}
          value={inputText}
          onChangeText={setInputText}
          multiline={true}
          numberOfLines={2}
          returnKeyType="done"
          onSubmitEditing={() => handleSmartParse(inputText, true)}
        />
        
        {/* Input Actions */}
        <View style={styles.inputActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.voiceButton]}
            onPress={() => setShowVoice(!showVoice)}
          >
            <Text style={styles.actionButtonText}>🎤</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.suggestionsButton]}
            onPress={() => setShowSuggestions(true)}
          >
            <Text style={styles.actionButtonText}>💡</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.parseButton]}
            onPress={() => handleSmartParse(inputText, true)}
            disabled={!inputText.trim() || isProcessing}
          >
            <Text style={styles.actionButtonText}>
              {isProcessing ? '⏳' : '🧠'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Voice Input Section */}
      {showVoice && (
        <View style={[styles.voiceSection, darkMode && styles.darkVoiceSection]}>
          <VoiceInput
            onVoiceResult={handleVoiceResult}
            onError={onError}
            darkMode={darkMode}
          />
        </View>
      )}

      {/* Parse Preview */}
      {parsedResult && parsedResult.success && (
        <TouchableOpacity
          style={[styles.quickPreview, darkMode && styles.darkQuickPreview]}
          onPress={() => setShowParsePreview(true)}
        >
          <Text style={[styles.quickPreviewText, darkMode && styles.darkText]}>
            ✨ Smart parsed: "{parsedResult.reminder.text}" - Tap to review
          </Text>
        </TouchableOpacity>
      )}

      {/* Suggestions Modal */}
      <Modal
        visible={showSuggestions}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowSuggestions(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.suggestionsModal, darkMode && styles.darkModal]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, darkMode && styles.darkText]}>
                💡 Smart Input Examples
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowSuggestions(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.suggestionsList}>
              {suggestions.map((suggestion, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.suggestionItem, darkMode && styles.darkSuggestionItem]}
                  onPress={() => handleSuggestionSelect(suggestion)}
                >
                  <Text style={[styles.suggestionText, darkMode && styles.darkText]}>
                    {suggestion}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Parse Preview Modal */}
      <Modal
        visible={showParsePreview}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowParsePreview(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.previewModal, darkMode && styles.darkModal]}>
            {renderParsePreview()}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  darkContainer: {
    // Dark mode styling handled by child components
  },
  successOverlay: {
    position: 'absolute',
    top: -40,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
  },
  successText: {
    backgroundColor: '#4CAF50',
    color: 'white',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    fontSize: 14,
    fontWeight: '600',
  },
  inputContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#007AFF',
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  darkInputContainer: {
    backgroundColor: '#333',
    borderColor: '#1E90FF',
  },
  textInput: {
    fontSize: 16,
    color: '#333',
    paddingHorizontal: 15,
    paddingVertical: 12,
    minHeight: 50,
    maxHeight: 100,
    textAlignVertical: 'top',
  },
  darkTextInput: {
    color: '#fff',
  },
  inputActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    minWidth: 40,
    alignItems: 'center',
  },
  voiceButton: {
    backgroundColor: '#FF6B6B',
  },
  suggestionsButton: {
    backgroundColor: '#FFD93D',
  },
  parseButton: {
    backgroundColor: '#4ECDC4',
  },
  actionButtonText: {
    fontSize: 18,
  },
  voiceSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginTop: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  darkVoiceSection: {
    backgroundColor: '#333',
  },
  quickPreview: {
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    padding: 12,
    marginTop: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  darkQuickPreview: {
    backgroundColor: '#1a2332',
    borderLeftColor: '#1E90FF',
  },
  quickPreviewText: {
    fontSize: 14,
    color: '#1976D2',
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  suggestionsModal: {
    backgroundColor: 'white',
    borderRadius: 16,
    maxHeight: '70%',
    width: '100%',
  },
  previewModal: {
    backgroundColor: 'white',
    borderRadius: 16,
    maxHeight: '80%',
    width: '100%',
  },
  darkModal: {
    backgroundColor: '#333',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  darkText: {
    color: '#fff',
  },
  closeButton: {
    padding: 5,
  },
  closeButtonText: {
    fontSize: 20,
    color: '#666',
  },
  suggestionsList: {
    padding: 10,
  },
  suggestionItem: {
    padding: 15,
    borderRadius: 8,
    marginVertical: 3,
    backgroundColor: '#f8f9fa',
  },
  darkSuggestionItem: {
    backgroundColor: '#444',
  },
  suggestionText: {
    fontSize: 16,
    color: '#333',
  },
  parsePreview: {
    backgroundColor: 'white',
    maxHeight: 500,
  },
  darkPreview: {
    backgroundColor: '#333',
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  confidenceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  confidenceText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  previewContent: {
    padding: 20,
    maxHeight: 300,
  },
  previewItem: {
    marginBottom: 15,
  },
  previewLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  previewValue: {
    fontSize: 16,
    color: '#333',
  },
  previewNote: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  previewActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    gap: 15,
  },
  previewButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#6c757d',
  },
  confirmButton: {
    backgroundColor: '#007AFF',
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButtonText: {
    color: 'white',  
    fontSize: 16,
    fontWeight: '600',
  },
});