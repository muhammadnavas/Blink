import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  FlatList,
  Modal,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import SmartInput from './components/SmartInput';
import SwipeableReminder from './components/SwipeableReminder';
import { speakText as voiceSpeakText } from './components/VoiceInput';
import {
  addNotificationResponseReceivedListener,
  cancelAllReminders,
  cancelAllScheduledNotifications,
  cancelReminder,
  getNotificationStats,
  handleNotificationResponse,
  initializeNotificationSystem,
  scheduleLocalNotification,
  scheduleSimpleNotification,
  scheduleWithFallback,
  testImmediateNotification
} from './services/notifications';
import smartSuggestions from './services/smartSuggestions';

const { width } = Dimensions.get('window');

export default function App() {
  const [reminder, setReminder] = useState('');
  const [reminders, setReminders] = useState([]);
  const [completedReminders, setCompletedReminders] = useState([]);
  const [selectedTime, setSelectedTime] = useState(300); // 5 minutes default
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState('active'); // 'active', 'completed'
  
  // Modal states
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingReminder, setEditingReminder] = useState(null);
  
  // Smart input states
  const [smartInputMode, setSmartInputMode] = useState(true);
  const [lastParsedReminder, setLastParsedReminder] = useState(null);
  
  // Notification stats
  const [notificationStats, setNotificationStats] = useState(null);
  
  // Recurring reminder states
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringType, setRecurringType] = useState('daily');
  const [customRecurringDays, setCustomRecurringDays] = useState(1);
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  
  // Dark mode state
  const [darkMode, setDarkMode] = useState(false);
  
  // Smart suggestions state
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Simplified time options - only essential ones
  const timeOptions = [
    { label: '1 minute', value: 60 },
    { label: '5 minutes', value: 300 },
    { label: '15 minutes', value: 900 },
    { label: '30 minutes', value: 1800 },
    { label: '1 hour', value: 3600 },
    { label: '2 hours', value: 7200 },
    { label: '1 day', value: 86400 }
  ];

  // Recurring reminder options
  const recurringOptions = [
    { label: 'Daily', value: 'daily', interval: 86400 },
    { label: 'Weekly', value: 'weekly', interval: 604800 },
    { label: 'Monthly', value: 'monthly', interval: 2592000 },
    { label: 'Custom Days', value: 'custom', interval: null }
  ];

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    setIsLoading(true);
    await requestNotificationPermissions();
    await initializeNotificationSystem();
    await loadReminders();
    await loadCompletedReminders();
    await loadThemePreference();
    await updateNotificationStats();
    await loadSmartSuggestions();
    
    // Check if running in Expo Go and warn user about timing issues
    await checkExpoGoLimitations();
    
    // Add notification listeners
    const responseSubscription = addNotificationResponseReceivedListener(handleNotificationResponse);
    const receivedSubscription = Notifications.addNotificationReceivedListener(notification => {
      const receivedTime = Date.now();
      console.log(`🔔 Notification received: ${notification.request.content.title}`);
      
      // Check if this was an immediate notification (appeared within 5 seconds of creation)
      const data = notification.request.content.data;
      if (data && data.scheduledAt && data.expectedDelay) {
        const actualDelay = (receivedTime - data.scheduledAt) / 1000;
        const expectedDelay = data.expectedDelay;
        
        if (actualDelay < 10 && expectedDelay > 30) {
          console.warn(`⚠️ Notification appeared immediately (${actualDelay.toFixed(1)}s) instead of after ${expectedDelay}s - This is expected in Expo Go`);
        }
      }
    });
    
    setIsLoading(false);
    
    return () => {
      if (responseSubscription) responseSubscription.remove();
      if (receivedSubscription) receivedSubscription.remove();
    };
  };

  const requestNotificationPermissions = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please enable notifications to receive reminders.');
    }
  };

  const loadReminders = async () => {
    try {
      const data = await AsyncStorage.getItem('reminders');
      if (data) setReminders(JSON.parse(data));
    } catch (error) {
      console.error('Error loading reminders:', error);
    }
  };

  const loadCompletedReminders = async () => {
    try {
      const data = await AsyncStorage.getItem('completed_reminders');
      if (data) setCompletedReminders(JSON.parse(data));
    } catch (error) {
      console.error('Error loading completed reminders:', error);
    }
  };

  const saveReminders = async (newReminders) => {
    try {
      setReminders(newReminders);
      await AsyncStorage.setItem('reminders', JSON.stringify(newReminders));
    } catch (error) {
      console.error('Error saving reminders:', error);
    }
  };

  const saveCompletedReminders = async (newCompleted) => {
    try {
      setCompletedReminders(newCompleted);
      await AsyncStorage.setItem('completed_reminders', JSON.stringify(newCompleted));
    } catch (error) {
      console.error('Error saving completed reminders:', error);
    }
  };

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('theme_preference');
      if (savedTheme !== null) {
        setDarkMode(JSON.parse(savedTheme));
      }
    } catch (error) {
      console.error('Error loading theme preference:', error);
    }
  };

  const toggleDarkMode = async () => {
    try {
      const newDarkMode = !darkMode;
      setDarkMode(newDarkMode);
      await AsyncStorage.setItem('theme_preference', JSON.stringify(newDarkMode));
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  const loadSmartSuggestions = async () => {
    try {
      const { suggestions: newSuggestions } = await smartSuggestions.analyzeUserPatterns();
      setSuggestions(newSuggestions);
    } catch (error) {
      console.error('Error loading smart suggestions:', error);
    }
  };

  const applySuggestion = async (suggestion) => {
    try {
      switch (suggestion.action) {
        case 'setTime':
          setSelectedTime(suggestion.value);
          Alert.alert('✅ Applied', `Time set to ${formatTimeDisplay(suggestion.value)}`);
          break;
        case 'enableRecurring':
          setIsRecurring(true);
          Alert.alert('✅ Applied', 'Recurring reminders enabled');
          break;
        case 'useSimilar':
          setReminder(suggestion.value.text);
          setSelectedTime(suggestion.value.time);
          if (suggestion.value.isRecurring) {
            setIsRecurring(true);
            setRecurringType(suggestion.value.recurringType);
          }
          Alert.alert('✅ Applied', `Similar reminder template applied`);
          break;
        default:
          console.log('Unknown suggestion action:', suggestion.action);
      }
      setShowSuggestions(false);
      
      // Refresh suggestions after applying one
      await loadSmartSuggestions();
    } catch (error) {
      console.error('Error applying suggestion:', error);
      Alert.alert('Error', 'Failed to apply suggestion');
    }
  };

  const getSuggestionIcon = (type) => {
    switch (type) {
      case 'time': return '⏰';
      case 'category': return '📂';
      case 'recurring': return '🔄';
      case 'words': return '💬';
      case 'timeOfDay': return '🌅';
      case 'similar': return '🔍';
      default: return '💡';
    }
  };

  const getSuggestionColor = (type) => {
    switch (type) {
      case 'time': return '#007AFF';
      case 'category': return '#FF9500';
      case 'recurring': return '#4CAF50';
      case 'words': return '#9C27B0';
      case 'timeOfDay': return '#FF6B6B';
      case 'similar': return '#00BCD4';
      default: return '#9C27B0';
    }
  };

  // Handle smart parsed reminder
  const handleSmartReminderParsed = async (parsedResult) => {
    try {
      console.log('🧠 Processing smart reminder:', parsedResult);
      
      const { reminder: smartReminder } = parsedResult;
      setLastParsedReminder(parsedResult);
      
      // Create new reminder from smart parsing
      const reminderKey = `reminder_${Date.now()}`;
      const newReminder = {
        id: Date.now().toString(),
        text: smartReminder.text,
        time: smartReminder.time,
        completed: false,
        createdAt: new Date().toISOString(),
        reminderKey,
        smartParsed: true,
        confidence: smartReminder.confidence,
        timeDescription: smartReminder.timeDescription,
        // Check if smart parsing detected recurring patterns
        isRecurring: smartReminder.isRecurring || false,
        recurringType: smartReminder.recurringType || null,
        nextOccurrence: smartReminder.isRecurring ? calculateSmartNextOccurrence(smartReminder) : null,
        recurringCount: smartReminder.isRecurring ? 0 : null
      };
      
      const newReminders = [...reminders, newReminder];
      await saveReminders(newReminders);
      
      // Schedule notification
      await scheduleReminderNotification(newReminder);
      
      // Provide voice feedback
      await voiceSpeakText(`Reminder created: ${smartReminder.text}`);
      
      Alert.alert(
        '✨ Smart Reminder Created!', 
        `"${smartReminder.text}" scheduled with ${smartReminder.confidence}% confidence`,
        [{ text: 'Great!', style: 'default' }]
      );
      
      await updateNotificationStats();
      
    } catch (error) {
      console.error('❌ Error creating smart reminder:', error);
      Alert.alert('Error', `Failed to create smart reminder: ${error.message}`);
    }
  };

  const addReminder = async () => {
    if (reminder.trim() === '') {
      Alert.alert('Error', 'Please enter a reminder text');
      return;
    }
    
    setIsLoading(true);
    
    const reminderKey = `reminder_${Date.now()}`;
    const newReminder = { 
      id: Date.now().toString(), 
      text: reminder,
      time: selectedTime,
      completed: false,
      createdAt: new Date().toISOString(),
      reminderKey,
      // Recurring reminder properties
      isRecurring,
      recurringType: isRecurring ? recurringType : null,
      customRecurringDays: isRecurring && recurringType === 'custom' ? customRecurringDays : null,
      nextOccurrence: isRecurring ? calculateNextOccurrence() : null,
      recurringCount: isRecurring ? 0 : null
    };
    
    const newReminders = [...reminders, newReminder];
    await saveReminders(newReminders);
    
    await scheduleReminderNotification(newReminder);
    
    // Reset form
    setReminder('');
    setIsRecurring(false);
    setRecurringType('daily');
    setCustomRecurringDays(1);
    setIsLoading(false);
  };

  const calculateNextOccurrence = () => {
    const now = new Date();
    const baseTime = new Date(now.getTime() + (selectedTime * 1000));
    
    let intervalMs;
    switch (recurringType) {
      case 'daily':
        intervalMs = 86400 * 1000; // 24 hours
        break;
      case 'weekly':
        intervalMs = 604800 * 1000; // 7 days
        break;
      case 'monthly':
        intervalMs = 2592000 * 1000; // 30 days (approximate)
        break;
      case 'custom':
        intervalMs = customRecurringDays * 86400 * 1000;
        break;
      default:
        intervalMs = 86400 * 1000;
    }
    
    return new Date(baseTime.getTime() + intervalMs).toISOString();
  };

  const calculateSmartNextOccurrence = (smartReminder) => {
    const now = new Date();
    const baseTime = new Date(now.getTime() + (smartReminder.time * 1000));
    
    let intervalMs;
    switch (smartReminder.recurringType) {
      case 'daily':
        intervalMs = 86400 * 1000;
        break;
      case 'weekly':
        intervalMs = 604800 * 1000;
        break;
      case 'monthly':
        intervalMs = 2592000 * 1000;
        break;
      default:
        intervalMs = 86400 * 1000;
    }
    
    return new Date(baseTime.getTime() + intervalMs).toISOString();
  };

  const scheduleRecurringNotification = async (reminderData) => {
    try {
      const nextOccurrenceDate = new Date(reminderData.nextOccurrence);
      const now = new Date();
      const secondsUntilNext = Math.floor((nextOccurrenceDate.getTime() - now.getTime()) / 1000);
      
      if (secondsUntilNext > 0) {
        const reminderTitle = `🔄 ${reminderData.recurringType.charAt(0).toUpperCase() + reminderData.recurringType.slice(1)} Reminder`;
        const reminderBody = `${reminderData.text} (Repeats ${reminderData.recurringType})`;
        
        await scheduleLocalNotification(
          reminderTitle,
          reminderBody,
          secondsUntilNext
        );
        
        console.log(`🔄 Next recurring reminder scheduled for: ${nextOccurrenceDate.toLocaleString()}`);
      }
    } catch (error) {
      console.error('Error scheduling recurring notification:', error);
    }
  };

  const snoozeReminder = async (reminderId, snoozeMinutes = 10) => {
    try {
      const reminder = reminders.find(r => r.id === reminderId);
      if (!reminder) {
        Alert.alert('Error', 'Reminder not found');
        return;
      }

      // Show snooze options to user
      Alert.alert(
        '😴 Snooze Reminder',
        `"${reminder.text}"`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: '5 min', onPress: () => performSnooze(reminder, 5) },
          { text: '10 min', onPress: () => performSnooze(reminder, 10) },
          { text: '30 min', onPress: () => performSnooze(reminder, 30) },
          { text: '1 hour', onPress: () => performSnooze(reminder, 60) }
        ]
      );
      
    } catch (error) {
      console.error('Error showing snooze options:', error);
      Alert.alert('Error', 'Failed to show snooze options');
    }
  };

  const performSnooze = async (reminder, snoozeMinutes) => {
    try {
      // Cancel current notification
      if (reminder.reminderKey) {
        await cancelReminder(reminder.reminderKey);
      }

      // Create snoozed reminder with better tracking
      const snoozedReminder = {
        ...reminder,
        time: snoozeMinutes * 60, // Convert to seconds
        snoozed: true,
        snoozeCount: (reminder.snoozeCount || 0) + 1,
        originalTime: reminder.originalTime || reminder.time,
        reminderKey: `reminder_${Date.now()}_snoozed`,
        snoozeHistory: [
          ...(reminder.snoozeHistory || []),
          {
            snoozeTime: new Date().toISOString(),
            snoozeDuration: snoozeMinutes
          }
        ]
      };

      // Update reminders array
      const newReminders = reminders.map(r => 
        r.id === reminder.id ? snoozedReminder : r
      );
      await saveReminders(newReminders);

      // Schedule snoozed notification with proper title
      const snoozeTitle = `😴 Snoozed Reminder (#${snoozedReminder.snoozeCount})`;
      const snoozeNotificationData = {
        ...snoozedReminder,
        title: snoozeTitle
      };
      
      await scheduleReminderNotification(snoozeNotificationData);
      await updateNotificationStats();

      // Show success feedback
      Alert.alert(
        '✅ Snoozed!', 
        `"${reminder.text}" will remind you again in ${snoozeMinutes} ${snoozeMinutes === 1 ? 'minute' : 'minutes'}`
      );
      
    } catch (error) {
      console.error('Error performing snooze:', error);
      Alert.alert('Error', 'Failed to snooze reminder');
    }
  };

  const scheduleReminderNotification = async (reminderData) => {
    try {
      const { text, time, isRecurring, recurringType } = reminderData;
      
      console.log('🔧 Enhanced scheduling for:', text, 'in', time, 'seconds', isRecurring ? `(Recurring: ${recurringType})` : '');
      
      // Try enhanced scheduling first, then fallback if needed
      let notificationId;
      const reminderTitle = isRecurring ? `🔄 ${recurringType.charAt(0).toUpperCase() + recurringType.slice(1)} Reminder` : '⏰ Reminder';
      const reminderBody = isRecurring ? `${text} (Repeats ${recurringType})` : text;
      
      try {
        notificationId = await scheduleLocalNotification(
          reminderTitle, 
          reminderBody, 
          time
        );
      } catch (error) {
        console.log('🔄 Standard scheduling failed, trying fallback...');
        notificationId = await scheduleWithFallback(
          reminderTitle, 
          reminderBody, 
          time
        );
      }
      
      // If recurring, schedule the next occurrence
      if (isRecurring && reminderData.nextOccurrence) {
        await scheduleRecurringNotification(reminderData);
      }
      
      await updateNotificationStats();
      
      // Check if in Expo Go for different messaging
      try {
        const Constants = require('expo-constants').default;
        const isExpoGo = Constants.appOwnership === 'expo';
        
        if (isExpoGo) {
          Alert.alert(
            'Reminder Scheduled!', 
            `⚠️ In Expo Go, this notification may appear immediately rather than in ${formatTimeDisplay(time)}. This is normal in development mode.`,
            [{ text: 'OK', style: 'default' }]
          );
        } else {
          Alert.alert('Reminder Set!', `Notification scheduled for ${formatTimeDisplay(time)}`);
        }
      } catch {
        Alert.alert('Reminder Set!', `Notification scheduled for ${formatTimeDisplay(time)}`);
      }
      
    } catch (error) {
      console.error('Error scheduling notification:', error);
      Alert.alert('Error', `Failed to schedule notification: ${error.message}`);
    }
  };

  const completeReminder = async (reminderId) => {
    const reminder = reminders.find(r => r.id === reminderId);
    if (!reminder) return;

    // Cancel the notification
    if (reminder.reminderKey) {
      try {
        await cancelReminder(reminder.reminderKey);
      } catch (error) {
        console.error('Error canceling reminder:', error);
      }
    }

    // Move to completed
    const completedReminder = {
      ...reminder,
      completed: true,
      completedAt: new Date().toISOString()
    };
    
    const newReminders = reminders.filter(r => r.id !== reminderId);
    const newCompleted = [completedReminder, ...completedReminders];
    
    await saveReminders(newReminders);
    await saveCompletedReminders(newCompleted);
    await updateNotificationStats();
  };

  const deleteReminder = async (id, isCompleted = false) => {
    Alert.alert(
      'Delete Reminder',
      'Are you sure you want to delete this reminder?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            if (isCompleted) {
              const newCompleted = completedReminders.filter(item => item.id !== id);
              await saveCompletedReminders(newCompleted);
            } else {
              const reminder = reminders.find(r => r.id === id);
              if (reminder && reminder.reminderKey) {
                try {
                  await cancelReminder(reminder.reminderKey);
                } catch (error) {
                  console.error('Error canceling reminder:', error);
                }
              }
              const newReminders = reminders.filter(item => item.id !== id);
              await saveReminders(newReminders);
            }
            await updateNotificationStats();
          }
        }
      ]
    );
  };

  const editReminder = (reminder) => {
    setEditingReminder(reminder);
    setReminder(reminder.text);
    setSelectedTime(reminder.time);
    setShowEditModal(true);
  };

  const updateReminder = async () => {
    if (!editingReminder || reminder.trim() === '') return;

    // Cancel old notification
    if (editingReminder.reminderKey) {
      try {
        await cancelReminder(editingReminder.reminderKey);
      } catch (error) {
        console.error('Error canceling old reminder:', error);
      }
    }

    const updatedReminder = {
      ...editingReminder,
      text: reminder,
      time: selectedTime,
      updatedAt: new Date().toISOString()
    };

    const newReminders = reminders.map(r => 
      r.id === editingReminder.id ? updatedReminder : r
    );
    
    await saveReminders(newReminders);
    await scheduleReminderNotification(updatedReminder);
    
    setShowEditModal(false);
    setEditingReminder(null);
    setReminder('');
  };

  const updateNotificationStats = async () => {
    try {
      const stats = await getNotificationStats();
      setNotificationStats(stats);
    } catch (error) {
      console.error('Error updating notification stats:', error);
    }
  };

  const testEnhancedNotification = async () => {
    try {
      console.log('🧪 Testing enhanced notification scheduling...');
      
      // Test both approaches
      await scheduleLocalNotification('🎯 Enhanced Test', 'This uses multiple scheduling strategies', 10);
      await scheduleWithFallback('🔄 Fallback Test', 'This uses setTimeout fallback for Expo Go', 15);
      
      Alert.alert(
        '🧪 Enhanced Test Started', 
        'Two test notifications scheduled:\n\n• Enhanced (10s): Multiple strategies\n• Fallback (15s): setTimeout for Expo Go\n\nCheck console for detailed logs!'
      );
      
    } catch (error) {
      console.error('❌ Enhanced test failed:', error);
      Alert.alert('Test Failed', error.message);
    }
  };

  const runDiagnostics = async () => {
    try {
      console.log('\n🔧 ===== COMPREHENSIVE DIAGNOSTICS =====');
      
      // 1. Check notification permissions
      const permissions = await Notifications.getPermissionsAsync();
      console.log('🔒 Permissions:', permissions);
      
      // 2. Check device capabilities
      const Constants = require('expo-constants').default;
      console.log('📱 Environment:', {
        appOwnership: Constants.appOwnership,
        isDevice: Constants.isDevice,
        platform: Constants.platform
      });
      
      // 3. Check scheduled notifications
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      console.log('📅 Currently scheduled:', scheduled.length);
      
      // 4. Test simple scheduling
      console.log('🧪 Testing simple 5-second notification...');
      const simpleId = await scheduleSimpleNotification('🔧 Diagnostic Test', 'Simple 5-second test', 5);
      console.log('✅ Simple scheduling ID:', simpleId);
      
      // 5. Test enhanced scheduling  
      console.log('🧪 Testing enhanced 10-second notification...');
      const enhancedId = await scheduleLocalNotification('🎯 Enhanced Test', 'Enhanced 10-second test', 10);
      console.log('✅ Enhanced scheduling ID:', enhancedId);
      
      // 6. Verify they were scheduled
      const afterScheduled = await Notifications.getAllScheduledNotificationsAsync();
      console.log('📅 After scheduling:', afterScheduled.length);
      
      Alert.alert(
        '🔧 Diagnostics Complete',
        `Permissions: ${permissions.status}\nEnvironment: ${Constants.appOwnership}\nScheduled Before: ${scheduled.length}\nScheduled After: ${afterScheduled.length}\n\nTwo test notifications should arrive in 5s and 10s. Check console for details!`
      );
      
    } catch (error) {
      console.error('❌ Diagnostics failed:', error);
      Alert.alert('Diagnostics Failed', error.message);
    }
  };

  const checkExpoGoLimitations = async () => {
    try {
      // Check if we're in Expo Go by looking for the characteristic warning
      const Constants = require('expo-constants').default;
      const isExpoGo = Constants.appOwnership === 'expo';
      
      if (isExpoGo) {
        console.warn('⚠️ Running in Expo Go - notifications may appear immediately due to development environment limitations');
        // Show one-time warning to user
        const hasShownWarning = await AsyncStorage.getItem('expo_go_warning_shown');
        if (!hasShownWarning) {
          setTimeout(() => {
            Alert.alert(
              '⚠️ Expo Go Limitation',
              'Notifications may appear immediately in Expo Go instead of at scheduled times. This is normal in the development environment. Timing will work correctly in a production build.',
              [
                { text: 'Got it', onPress: () => AsyncStorage.setItem('expo_go_warning_shown', 'true') }
              ]
            );
          }, 3000); // Delay to not interfere with app startup
        }
      }
    } catch (error) {
      console.log('Could not detect Expo Go status:', error.message);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReminders();
    await loadCompletedReminders();
    await updateNotificationStats();
    setRefreshing(false);
  };

  // Filter reminders based on search query
  const getFilteredReminders = () => {
    if (!searchQuery) return reminders;
    return reminders.filter(reminder =>
      reminder.text.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const getFilteredCompletedReminders = () => {
    if (!searchQuery) return completedReminders;
    return completedReminders.filter(reminder =>
      reminder.text.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const clearAllNotifications = async () => {
    Alert.alert(
      'Clear All Data',
      'This will remove all reminders and cancel all notifications. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              // Cancel all scheduled notifications
              await cancelAllScheduledNotifications();
              // Cancel all tracked reminders
              await cancelAllReminders();
              // Clear local storage
              await saveReminders([]);
              await saveCompletedReminders([]);
              // Update stats
              await updateNotificationStats();
              Alert.alert('Success', 'All reminders and notifications cleared');
            } catch (error) {
              console.error('Clear all error:', error);
              Alert.alert('Error', `Failed to clear data: ${error.message}`);
            }
          }
        }
      ]
    );
  };

  // Helper function to format time display
  const formatTimeDisplay = (timeValue) => {
    // Handle invalid input
    if (!timeValue || typeof timeValue !== 'number' || timeValue <= 0) {
      return '5 minutes'; // Default fallback
    }

    // Check for standard time options first
    const standardOption = timeOptions.find(t => t.value === timeValue);
    if (standardOption) {
      return standardOption.label;
    }
    
    // Format custom time with better accuracy
    const days = Math.floor(timeValue / 86400);
    const hours = Math.floor((timeValue % 86400) / 3600);
    const minutes = Math.floor((timeValue % 3600) / 60);
    const seconds = timeValue % 60;
    
    if (days > 0) {
      return days === 1 ? '1 day' : `${days} days`;
    } else if (hours > 0) {
      if (minutes > 0) {
        return `${hours}h ${minutes}m`;
      }
      return hours === 1 ? '1 hour' : `${hours} hours`;
    } else if (minutes > 0) {
      return minutes === 1 ? '1 minute' : `${minutes} minutes`;
    } else {
      return seconds === 1 ? '1 second' : `${seconds} seconds`;
    }
    
    return '5 minutes';
  };

  const renderTabBar = () => (
    <View style={[styles.tabBar, dynamicStyles.border]}>
      <TouchableOpacity 
        style={[
          styles.tabButton, 
          selectedTab === 'active' && styles.activeTab,
          dynamicStyles.border
        ]}
        onPress={() => setSelectedTab('active')}
      >
        <Text style={[
          styles.tabText, 
          selectedTab === 'active' && styles.activeTabText,
          selectedTab !== 'active' && dynamicStyles.text
        ]}>
          Active ({reminders.length})
        </Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[
          styles.tabButton, 
          selectedTab === 'completed' && styles.activeTab,
          dynamicStyles.border
        ]}
        onPress={() => setSelectedTab('completed')}
      >
        <Text style={[
          styles.tabText, 
          selectedTab === 'completed' && styles.activeTabText,
          selectedTab !== 'completed' && dynamicStyles.text
        ]}>
          Completed ({completedReminders.length})
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderReminder = ({ item }) => {
    const isCompleted = item.completed;
    
    // Define swipe actions
    const leftAction = !isCompleted ? {
      icon: '✓',
      text: 'Complete',
      color: '#4CAF50'
    } : null;
    
    const rightAction = !isCompleted ? {
      icon: '😴',
      text: 'Snooze',
      color: '#FF9800'
    } : {
      icon: '🗑️',
      text: 'Delete',
      color: '#f44336'
    };
    
    return (
      <SwipeableReminder
        leftAction={leftAction}
        rightAction={rightAction}
        onSwipeLeft={() => !isCompleted ? completeReminder(item.id) : null}
        onSwipeRight={() => !isCompleted ? snoozeReminder(item.id, 10) : deleteReminder(item.id, isCompleted)}
        darkMode={darkMode}
      >
        <TouchableOpacity 
          style={[styles.reminderItem, dynamicStyles.cardBackground, { opacity: isCompleted ? 0.7 : 1 }]}
          onPress={() => isCompleted ? null : editReminder(item)}
          onLongPress={() => deleteReminder(item.id, isCompleted)}
        >
        <View style={styles.reminderContent}>
          <View style={styles.reminderHeader}>
            <Text style={[styles.reminderText, dynamicStyles.text]}>
              {item.text}
            </Text>
            <View style={styles.headerActions}>
              {!isCompleted && (
                <TouchableOpacity 
                  style={styles.completeButton}
                  onPress={() => completeReminder(item.id)}
                >
                  <Text style={styles.completeButtonText}>✓</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity 
                style={styles.deleteButton}
                onPress={() => deleteReminder(item.id, isCompleted)}
              >
                <Text style={styles.deleteButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.reminderFooter}>
            <Text style={[styles.timeText, { color: darkMode ? '#cccccc' : '#666' }]}>
              {item.timeDescription || formatTimeDisplay(item.time)}
            </Text>
            {isCompleted && item.completedAt && (
              <Text style={[styles.completedAtText, { color: darkMode ? '#999999' : '#888888' }]}>
                Completed: {new Date(item.completedAt).toLocaleDateString()}
              </Text>
            )}
            <View style={styles.badgeContainer}>
              {item.smartParsed && (
                <Text style={styles.smartBadge}>🧠 Smart</Text>
              )}
              {item.isRecurring && (
                <Text style={styles.recurringBadge}>
                  🔄 {item.recurringType === 'custom' 
                    ? `Every ${item.customRecurringDays} days` 
                    : item.recurringType.charAt(0).toUpperCase() + item.recurringType.slice(1)
                  }
                </Text>
              )}
              {item.snoozed && (
                <Text style={[styles.snoozeBadge, { backgroundColor: darkMode ? '#FF7043' : '#FF9800', color: 'white' }]}>
                  😴 Snoozed ({item.snoozeCount}x)
                </Text>
              )}
            </View>
            {item.isRecurring && item.nextOccurrence && !isCompleted && (
              <Text style={[styles.nextOccurrenceText, { color: darkMode ? '#66BB6A' : '#4CAF50' }]}>
                Next: {new Date(item.nextOccurrence).toLocaleDateString()} at {new Date(item.nextOccurrence).toLocaleTimeString()}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
      </SwipeableReminder>
    );
  };

  // Get dynamic styles based on theme
  const dynamicStyles = getDynamicStyles(darkMode);

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent, dynamicStyles.container]}>
        <Text style={[styles.loadingText, dynamicStyles.text]}>Loading Blink Reminder...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      <StatusBar barStyle={darkMode ? "light-content" : "dark-content"} />
      
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.title, dynamicStyles.text]}>Blink Reminder</Text>
          {notificationStats && (
            <Text style={[styles.statsText, dynamicStyles.text]}>
              {notificationStats.activeReminders} active
            </Text>
          )}
        </View>
        <TouchableOpacity 
          style={[
            styles.themeToggle,
            { backgroundColor: darkMode ? '#404040' : '#f0f0f0' }
          ]}
          onPress={toggleDarkMode}
        >
          <Text style={[styles.themeToggleText, { color: darkMode ? '#ffffff' : '#333333' }]}>
            {darkMode ? '☀️' : '🌙'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <TextInput
        style={[styles.searchInput, dynamicStyles.inputBackground, dynamicStyles.text]}
        placeholder="Search reminders..."
        placeholderTextColor={darkMode ? '#888888' : '#666666'}
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      {/* Tab Bar */}
      {renderTabBar()}

      {/* Development Mode Warning */}
      {__DEV__ && (
        <View style={styles.devWarning}>
          <Text style={styles.devWarningText}>⚠️ Development Mode</Text>
          <Text style={styles.devWarningSubtext}>Notifications may appear immediately in Expo Go</Text>
        </View>
      )}

      {/* Add Reminder Form - only show on active tab */}
      {selectedTab === 'active' && (
        <View style={styles.formContainer}>
          {/* Smart Input */}
          <SmartInput
            onReminderParsed={handleSmartReminderParsed}
            onError={(error) => Alert.alert('Smart Input Error', error)}
            placeholder="Try: 'Call mom in 30 minutes' or use manual input below"
          />
          
          <Text style={styles.orText}>— OR —</Text>
          
          {/* Manual Input */}
          <TextInput
            style={[styles.input, dynamicStyles.inputBackground, dynamicStyles.text, dynamicStyles.border]}
            placeholder="Enter reminder manually"
            placeholderTextColor={darkMode ? '#888888' : '#666666'}
            value={reminder}
            onChangeText={setReminder}
          />
          
          <TouchableOpacity 
            style={[styles.timeSelector, dynamicStyles.inputBackground, dynamicStyles.border]}
            onPress={() => setShowTimeModal(true)}
          >
            <Text style={[styles.timeSelectorText, dynamicStyles.text]}>
              ⏰ {formatTimeDisplay(selectedTime)}
            </Text>
            <Text style={[styles.arrow, dynamicStyles.text]}>▼</Text>
          </TouchableOpacity>

          {/* Recurring Reminder Toggle */}
          <TouchableOpacity 
            style={[
              styles.recurringToggle, 
              isRecurring && styles.recurringToggleActive,
              !isRecurring && dynamicStyles.inputBackground,
              !isRecurring && dynamicStyles.border
            ]}
            onPress={() => setIsRecurring(!isRecurring)}
          >
            <Text style={[
              styles.recurringToggleText, 
              isRecurring && styles.recurringToggleTextActive,
              !isRecurring && dynamicStyles.text
            ]}>
              🔄 {isRecurring ? 'Recurring Enabled' : 'Make Recurring'}
            </Text>
          </TouchableOpacity>

          {/* Recurring Options */}
          {isRecurring && (
            <TouchableOpacity 
              style={styles.recurringSelector}
              onPress={() => setShowRecurringModal(true)}
            >
              <Text style={styles.recurringSelectorText}>
                🔄 {recurringType === 'custom' ? `Every ${customRecurringDays} days` : recurringType.charAt(0).toUpperCase() + recurringType.slice(1)}
              </Text>
              <Text style={styles.arrow}>▼</Text>
            </TouchableOpacity>
          )}

          {/* Smart Suggestions Button */}
          {suggestions.length > 0 && (
            <TouchableOpacity 
              style={styles.suggestionsButton}
              onPress={() => setShowSuggestions(true)}
            >
              <Text style={styles.suggestionsButtonText}>
                💡 Smart Suggestions ({suggestions.length})
              </Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity style={styles.addButton} onPress={addReminder}>
            <Text style={styles.addButtonText}>Add Reminder</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Content based on selected tab */}
      {selectedTab === 'active' && (
        <FlatList
          style={styles.list}
          data={getFilteredReminders()}
          keyExtractor={(item) => item.id}
          renderItem={renderReminder}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, dynamicStyles.text]}>No active reminders</Text>
              <Text style={[styles.emptySubtext, { color: darkMode ? '#cccccc' : '#666666' }]}>Add a reminder to get started!</Text>
            </View>
          }
        />
      )}

      {selectedTab === 'completed' && (
        <FlatList
          style={styles.list}
          data={getFilteredCompletedReminders()}
          keyExtractor={(item) => item.id}
          renderItem={renderReminder}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, dynamicStyles.text]}>No completed reminders</Text>
              <Text style={[styles.emptySubtext, { color: darkMode ? '#cccccc' : '#666666' }]}>Complete some reminders to see them here!</Text>
            </View>
          }
        />
      )}

      {/* Debug/Test Section at bottom */}
      <View style={styles.debugContainer}>
        <TouchableOpacity style={styles.debugButton} onPress={testImmediateNotification}>
          <Text style={styles.debugButtonText}>Test Now</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.debugButton} onPress={() => testEnhancedNotification()}>
          <Text style={styles.debugButtonText}>Test Enhanced</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.debugButton} onPress={runDiagnostics}>
          <Text style={styles.debugButtonText}>Diagnostics</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.debugButton} onPress={clearAllNotifications}>
          <Text style={styles.debugButtonText}>Clear All Data</Text>
        </TouchableOpacity>
      </View>

      {/* Edit Reminder Modal */}
      <Modal visible={showEditModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, dynamicStyles.modalBackground]}>
            <Text style={[styles.modalTitle, dynamicStyles.text]}>Edit Reminder</Text>
            
            <TextInput
              style={[styles.input, dynamicStyles.inputBackground, dynamicStyles.text, dynamicStyles.border]}
              placeholder="Enter your reminder"
              placeholderTextColor={darkMode ? '#888888' : '#666666'}
              value={reminder}
              onChangeText={setReminder}
            />

            <TouchableOpacity 
              style={styles.timeSelector}
              onPress={() => setShowTimeModal(true)}
            >
              <Text style={styles.timeSelectorText}>
                ⏰ {formatTimeDisplay(selectedTime)}
              </Text>
              <Text style={styles.arrow}>▼</Text>
            </TouchableOpacity>

            <View style={styles.modalButtonContainer}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowEditModal(false);
                  setEditingReminder(null);
                  setReminder('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.saveButton]}
                onPress={updateReminder}
              >
                <Text style={styles.saveButtonText}>Update</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Time Modal */}
      <Modal visible={showTimeModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, dynamicStyles.modalBackground]}>
            <Text style={[styles.modalTitle, dynamicStyles.text]}>Select Time</Text>
            {timeOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.timeOption, 
                  selectedTime === option.value && styles.selectedOption,
                  dynamicStyles.border
                ]}
                onPress={() => {
                  setSelectedTime(option.value);
                  setShowTimeModal(false);
                }}
              >
                <Text style={[styles.timeOptionText, dynamicStyles.text]}>{option.label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowTimeModal(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Recurring Modal */}
      <Modal visible={showRecurringModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, dynamicStyles.modalBackground]}>
            <Text style={[styles.modalTitle, dynamicStyles.text]}>🔄 Recurring Options</Text>
            {recurringOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.timeOption, 
                  recurringType === option.value && styles.selectedOption,
                  dynamicStyles.border
                ]}
                onPress={() => {
                  setRecurringType(option.value);
                  if (option.value !== 'custom') {
                    setShowRecurringModal(false);
                  }
                }}
              >
                <Text style={[styles.timeOptionText, dynamicStyles.text]}>{option.label}</Text>
              </TouchableOpacity>
            ))}
            
            {/* Custom Days Input */}
            {recurringType === 'custom' && (
              <View style={[styles.customDaysContainer, dynamicStyles.inputBackground, dynamicStyles.border]}>
                <Text style={[styles.customDaysLabel, dynamicStyles.text]}>Every how many days?</Text>
                <TextInput
                  style={[styles.customDaysInput, dynamicStyles.inputBackground, dynamicStyles.text, dynamicStyles.border]}
                  placeholder="Number of days"
                  placeholderTextColor={darkMode ? '#888888' : '#666666'}
                  value={customRecurringDays.toString()}
                  onChangeText={(text) => setCustomRecurringDays(Math.max(1, parseInt(text) || 1))}
                  keyboardType="numeric"
                />
              </View>
            )}
            
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowRecurringModal(false)}
            >
              <Text style={styles.closeButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Smart Suggestions Modal */}
      <Modal visible={showSuggestions} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, dynamicStyles.modalBackground]}>
            <Text style={[styles.modalTitle, dynamicStyles.text]}>💡 Smart Suggestions</Text>
            
            {suggestions.map((suggestion, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.suggestionItem, 
                  dynamicStyles.border,
                  dynamicStyles.cardBackground,
                  { borderLeftWidth: 4, borderLeftColor: getSuggestionColor(suggestion.type) }
                ]}
                onPress={() => applySuggestion(suggestion)}
              >
                <View style={styles.suggestionContent}>
                  <Text style={[styles.suggestionTitle, dynamicStyles.text]}>
                    {getSuggestionIcon(suggestion.type)} {suggestion.title}
                  </Text>
                  <Text style={[styles.suggestionDescription, { color: darkMode ? '#cccccc' : '#666666' }]}>
                    {suggestion.description}
                  </Text>
                  <View style={styles.suggestionFooter}>
                    <Text style={[styles.suggestionConfidence, { color: getSuggestionColor(suggestion.type) }]}>
                      {Math.round(suggestion.confidence)}% confidence
                    </Text>
                    <Text style={[styles.suggestionType, { color: darkMode ? '#999999' : '#888888' }]}>
                      {suggestion.type}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
            
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowSuggestions(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Dynamic styles based on theme
const getDynamicStyles = (darkMode) => ({
  container: {
    backgroundColor: darkMode ? '#1a1a1a' : '#f8f9fa'
  },
  text: {
    color: darkMode ? '#ffffff' : '#333333'
  },
  inputBackground: {
    backgroundColor: darkMode ? '#2d2d2d' : '#ffffff'
  },
  cardBackground: {
    backgroundColor: darkMode ? '#2d2d2d' : '#ffffff'
  },
  border: {
    borderColor: darkMode ? '#404040' : '#e0e0e0'
  },
  modalBackground: {
    backgroundColor: darkMode ? '#2d2d2d' : '#ffffff'
  }
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa'
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    fontSize: 18,
    color: '#666'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 10
  },
  headerLeft: {
    flex: 1
  },
  title: { 
    fontSize: 24, 
    fontWeight: 'bold',
    color: '#333'
  },
  statsText: {
    fontSize: 14,
    color: '#007AFF',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontWeight: '500'
  },
  searchInput: {
    marginHorizontal: 20,
    marginBottom: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e1e5e9'
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 15,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center'
  },
  activeTab: {
    backgroundColor: '#007AFF'
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666'
  },
  activeTabText: {
    color: 'white',
    fontWeight: '600'
  },
  formContainer: {
    paddingHorizontal: 20,
    marginBottom: 10
  },
  orText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 14,
    marginVertical: 10
  },
  timeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e1e5e9'
  },
  timeSelectorText: {
    fontSize: 16,
    color: '#333'
  },
  arrow: {
    fontSize: 12,
    color: '#999'
  },
  input: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    marginBottom: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e1e5e9'
  },
  addButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center'
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600'
  },
  list: { 
    flex: 1,
    paddingHorizontal: 20
  },
  reminderItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  reminderContent: {
    padding: 15
  },
  reminderHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8
  },
  reminderText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
    marginRight: 10
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8
  },
  completeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#34C759',
    alignItems: 'center',
    justifyContent: 'center'
  },
  completeButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold'
  },
  deleteButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center'
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold'
  },
  reminderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8
  },
  timeText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500'
  },
  completedAtText: {
    fontSize: 11,
    color: '#34C759',
    fontWeight: '500'
  },
  smartBadge: {
    fontSize: 10,
    color: '#007AFF',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    fontWeight: '500'
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
    fontWeight: '500'
  },
  emptySubtext: {
    fontSize: 14,
    color: '#bbb',
    marginTop: 8
  },
  debugContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#f0f0f0',
    gap: 10
  },
  debugButton: {
    backgroundColor: '#8E8E93',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center'
  },
  debugButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500'
  },
  warningBanner: {
    backgroundColor: '#FFF3CD',
    borderColor: '#FFE69C',
    borderWidth: 1,
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  warningText: {
    color: '#856404',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2
  },
  warningSubtext: {
    color: '#6C5706',
    fontSize: 12,
    textAlign: 'center'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    minWidth: width * 0.85,
    maxHeight: '80%'
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333'
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  cancelButton: {
    backgroundColor: '#8E8E93'
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500'
  },
  saveButton: {
    backgroundColor: '#007AFF'
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600'
  },
  timeOption: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 5
  },
  selectedOption: {
    backgroundColor: '#E3F2FD'
  },
  timeOptionText: {
    fontSize: 16,
    color: '#333'
  },
  closeButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    marginTop: 15,
    alignItems: 'center'
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600'
  },
  devWarning: {
    backgroundColor: '#FFF3CD',
    borderColor: '#FFE69C',
    borderWidth: 1,
    marginHorizontal: 20,
    marginBottom: 15,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center'
  },
  devWarningText: {
    color: '#856404',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2
  },
  devWarningSubtext: {
    color: '#6C5706',
    fontSize: 11,
    textAlign: 'center'
  },
  // Recurring reminder styles
  recurringToggle: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd'
  },
  recurringToggleActive: {
    backgroundColor: '#E3F2FD',
    borderColor: '#007AFF'
  },
  recurringToggleText: {
    fontSize: 16,
    color: '#666'
  },
  recurringToggleTextActive: {
    color: '#007AFF',
    fontWeight: '600'
  },
  recurringSelector: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#007AFF'
  },
  recurringSelectorText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600'
  },
  customDaysContainer: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginTop: 10
  },
  customDaysLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
    fontWeight: '600'
  },
  customDaysInput: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16
  },
  badgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 5
  },
  recurringBadge: {
    backgroundColor: '#4CAF50',
    color: 'white',
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontWeight: '600'
  },
  nextOccurrenceText: {
    fontSize: 12,
    color: '#4CAF50',
    fontStyle: 'italic',
    marginTop: 4
  },
  // Theme toggle styles
  themeToggle: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center'
  },
  themeToggleText: {
    fontSize: 20
  },
  // Smart suggestions styles
  suggestionsButton: {
    backgroundColor: '#9C27B0',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
    alignItems: 'center'
  },
  suggestionsButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600'
  },
  suggestionItem: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0'
  },
  suggestionContent: {
    flex: 1
  },
  suggestionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4
  },
  suggestionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4
  },
  suggestionConfidence: {
    fontSize: 12,
    color: '#9C27B0',
    fontWeight: '600'
  },
  suggestionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8
  },
  suggestionType: {
    fontSize: 11,
    color: '#888',
    textTransform: 'uppercase',
    fontWeight: '500'
  },
  snoozeBadge: {
    backgroundColor: '#FF9800',
    color: 'white',
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontWeight: '600'
  }
});