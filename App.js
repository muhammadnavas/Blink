/**
 * Blink Reminder App
 * A comprehensive reminder app with smart suggestions, financial tracking, and calendar features
 * Version: 2.1 - Hooks Fixed
 */

import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Dimensions,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
// Re-enable complex components
import BirthdayManager from './components/BirthdayManager';
import CalendarView from './components/CalendarView';
import FinancialDashboard from './components/FinancialDashboard';
import QuickExpenseTracker from './components/QuickExpenseTracker';
import SmartInput from './components/SmartInput';
import SwipeableReminder from './components/SwipeableReminder';
import { speakText as voiceSpeakText } from './components/VoiceInput';
import calendarBackgroundService from './services/calendarBackgroundService';
import {
  addNotificationResponseReceivedListener,
  cancelAllScheduledNotifications,
  cancelReminder,
  getAllScheduledNotifications,
  getNotificationStats,
  handleNotificationResponse,
  initializeNotificationSystem,
  scheduleLocalNotification,
  testImmediateNotification
} from './services/notifications';

const { width } = Dimensions.get('window');

// Responsive scale factor based on screen width to avoid overflow on small devices
const UI_SCALE = width < 360 ? 0.82 : width < 420 ? 0.92 : 1;
const HEADER_PADDING_TOP = Math.round(50 * UI_SCALE);
const TITLE_FONT_SIZE = Math.round(24 * UI_SCALE);
const LARGE_FONT_SIZE = Math.round(24 * UI_SCALE);
const TIME_VALUE_MIN_WIDTH = Math.round(40 * UI_SCALE);
const TIME_BUTTON_SIZE = Math.round(40 * UI_SCALE);
const SUGGESTION_CHIP_MIN_WIDTH = Math.round(120 * UI_SCALE);
const SUGGESTION_CHIP_MAX_WIDTH = Math.round(150 * UI_SCALE);
const FAB_SIZE = Math.round(56 * UI_SCALE);

export default function App() {
  // Core state
  const [reminder, setReminder] = useState('');
  const [reminders, setReminders] = useState([]);
  const [completedReminders, setCompletedReminders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState('active');
  
  // Reminder configuration
  const [selectedCategory, setSelectedCategory] = useState('Personal');
  const [selectedTime, setSelectedTime] = useState(5);
  const [selectedPriority, setSelectedPriority] = useState('medium');
  const [reminderNote, setReminderNote] = useState('');
  const [reminderType, setReminderType] = useState('one-time');
  const [dailyTime, setDailyTime] = useState({ hour: 9, minute: 0 });
  const [weeklyTime, setWeeklyTime] = useState({ weekday: 2, hour: 9, minute: 0 });
  const [intervalMinutes, setIntervalMinutes] = useState(60);
  
  // Modal states
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [showPriorityModal, setShowPriorityModal] = useState(false);
  const [showReminderTypeModal, setShowReminderTypeModal] = useState(false);
  const [showDailyTimeModal, setShowDailyTimeModal] = useState(false);
  const [showWeeklyTimeModal, setShowWeeklyTimeModal] = useState(false);
  const [showIntervalModal, setShowIntervalModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCustomTimeModal, setShowCustomTimeModal] = useState(false);
  const [showFinancialModal, setShowFinancialModal] = useState(false);
  const [showQuickExpense, setShowQuickExpense] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showBirthdayManager, setShowBirthdayManager] = useState(false);
  const [selectedBirthdayDate, setSelectedBirthdayDate] = useState(null);
  
  // Edit state
  const [editingReminder, setEditingReminder] = useState(null);
  
  // Custom timing
  const [customHours, setCustomHours] = useState(0);
  const [customMinutes, setCustomMinutes] = useState(5);
  const [customSeconds, setCustomSeconds] = useState(0);
  
  // Smart features
  const [smartInputMode, setSmartInputMode] = useState(true);
  const [lastParsedReminder, setLastParsedReminder] = useState(null);
  const [smartSuggestions, setSmartSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // Stats and settings
  const [notificationStats, setNotificationStats] = useState(null);
  const [settings, setSettings] = useState({
    soundEnabled: true,
    vibrationEnabled: true,
    darkMode: false,
    autoCleanup: true,
    showCompletedCount: true,
    smartSuggestionsEnabled: true,
    voiceFeedbackEnabled: true
  });

  // Theme styles - memoized for performance
  const theme = useMemo(() => ({
    primary: settings.darkMode ? '#1a1a1a' : '#f8f9fa',
    secondary: settings.darkMode ? '#333' : '#fff',
    text: settings.darkMode ? '#fff' : '#333',
    textSecondary: settings.darkMode ? '#999' : '#666',
    border: settings.darkMode ? '#555' : '#e1e5e9',
    accent: '#007AFF'
  }), [settings.darkMode]);

  // Enhanced categories
  const categories = {
    'Personal': { color: '#4A90E2', emoji: '👤', description: 'Personal tasks and reminders' },
    'Work': { color: '#50C878', emoji: '💼', description: 'Work-related tasks' },
    'Health': { color: '#FF6B6B', emoji: '🏥', description: 'Health and medical reminders' },
    'Shopping': { color: '#FFD93D', emoji: '🛒', description: 'Shopping lists and errands' },
    'Exercise': { color: '#6BCF7F', emoji: '🏃', description: 'Fitness and exercise' },
    'Study': { color: '#9B59B6', emoji: '📚', description: 'Education and learning' },
    'Social': { color: '#FF9500', emoji: '👥', description: 'Social events and meetings' },
    'Finance': { color: '#34C759', emoji: '💰', description: 'Bills and financial tasks' },
    'Travel': { color: '#007AFF', emoji: '✈️', description: 'Travel and vacation' },
    'Family': { color: '#FF69B4', emoji: '👨‍👩‍👧‍👦', description: 'Family activities' }
  };

  const priorities = {
    'low': { label: 'Low', color: '#95A5A6', emoji: '🔵' },
    'medium': { label: 'Medium', color: '#F39C12', emoji: '🟡' },
    'high': { label: 'High', color: '#E74C3C', emoji: '🔴' },
    'urgent': { label: 'Urgent', color: '#8E44AD', emoji: '🟣' }
  };

  const reminderTypes = {
    'one-time': { label: 'One-Time', emoji: '⏰', description: 'Notify once at a specific time' },
    'daily': { label: 'Daily', emoji: '📅', description: 'Repeat every day at a specific time' },
    'weekly': { label: 'Weekly', emoji: '📆', description: 'Repeat weekly on a specific day' },
    'interval': { label: 'Interval', emoji: '🔄', description: 'Repeat every X minutes/hours' }
  };

  const weekdays = [
    { value: 1, label: 'Sunday' }, { value: 2, label: 'Monday' },
    { value: 3, label: 'Tuesday' }, { value: 4, label: 'Wednesday' },
    { value: 5, label: 'Thursday' }, { value: 6, label: 'Friday' },
    { value: 7, label: 'Saturday' }
  ];

  const intervalOptions = [
    { value: 5, label: '5 minutes' }, { value: 15, label: '15 minutes' },
    { value: 30, label: '30 minutes' }, { value: 60, label: '1 hour' },
    { value: 120, label: '2 hours' }, { value: 240, label: '4 hours' },
    { value: 480, label: '8 hours' }, { value: 720, label: '12 hours' }
  ];

  const timeOptions = [
    { label: '5 seconds (Demo)', value: 5 },
    { label: '1 minute', value: 60 },
    { label: '5 minutes', value: 300 },
    { label: '10 minutes', value: 600 },
    { label: '30 minutes', value: 1800 },
    { label: '1 hour', value: 3600 },
    { label: '2 hours', value: 7200 },
    { label: '1 day', value: 86400 },
    { label: 'Custom...', value: 'custom' }
  ];

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    setIsLoading(true);
    try {
      await loadReminders();
      await loadCompletedReminders();
      await loadSettings();
      await requestNotificationPermissions();
      await initializeNotificationSystem();
      await updateNotificationStats();
      
      // Initialize calendar background service for yearly notifications
      await calendarBackgroundService.initialize();
      
      // Set up notification listeners
      const responseSubscription = addNotificationResponseReceivedListener(handleNotificationResponse);
      
      const receivedSubscription = Notifications.addNotificationReceivedListener(notification => {
        console.log('🔔 Notification received:', notification.request.content.title);
      });
      
      return () => {
        if (responseSubscription) responseSubscription.remove();
        if (receivedSubscription) receivedSubscription.remove();
      };
    } catch (error) {
      console.error('App initialization error:', error);
      Alert.alert('Error', 'Failed to initialize app. Please restart.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('app_settings');
      if (savedSettings) {
        setSettings(prev => ({ ...prev, ...JSON.parse(savedSettings) }));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async (newSettings) => {
    try {
      setSettings(newSettings);
      await AsyncStorage.setItem('app_settings', JSON.stringify(newSettings));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const requestNotificationPermissions = async () => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required', 
          'Please enable notifications to receive reminders.',
          [{ text: 'OK', style: 'default' }]
        );
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
    }
  };

  const loadReminders = async () => {
    try {
      const data = await AsyncStorage.getItem('reminders');
      if (data) {
        const loadedReminders = JSON.parse(data);
        setReminders(loadedReminders);
        
        // Update smart suggestions based on loaded data
        if (settings.smartSuggestionsEnabled) {
          await updateSmartSuggestions(loadedReminders);
        }
      }
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
      
      // Update smart suggestions
      if (settings.smartSuggestionsEnabled) {
        await updateSmartSuggestions(newReminders);
      }
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

  const updateSmartSuggestions = async (currentReminders = reminders) => {
    try {
      // Temporarily disabled to fix hooks error
      // const { patterns, suggestions } = await smartSuggestionsService.analyzeUserPatterns();
      // setSmartSuggestions(suggestions);
      setSmartSuggestions([]);
    } catch (error) {
      console.error('Error updating smart suggestions:', error);
    }
  };

  const handleSmartReminderParsed = async (parsedResult) => {
    try {
      console.log('🧠 Processing smart reminder:', parsedResult);
      
      const { reminder: smartReminder } = parsedResult;
      setLastParsedReminder(parsedResult);
      
      const reminderKey = `reminder_${Date.now()}`;
      const newReminder = {
        id: Date.now().toString(),
        text: smartReminder.text,
        note: smartReminder.note || '',
        category: smartReminder.category,
        priority: smartReminder.priority,
        type: smartReminder.type,
        completed: false,
        createdAt: new Date().toISOString(),
        reminderKey,
        smartParsed: true,
        confidence: smartReminder.confidence,
        ...(smartReminder.type === 'one-time' && { time: smartReminder.time }),
        ...(smartReminder.type === 'daily' && smartReminder.recurringDetails && { 
          dailyTime: smartReminder.recurringDetails 
        }),
        ...(smartReminder.type === 'weekly' && smartReminder.recurringDetails && { 
          weeklyTime: smartReminder.recurringDetails 
        }),
        ...(smartReminder.scheduledDate && { scheduledDate: smartReminder.scheduledDate.toISOString() })
      };
      
      const newReminders = [...reminders, newReminder];
      await saveReminders(newReminders);
      await scheduleReminderNotification(newReminder);
      
      if (settings.voiceFeedbackEnabled) {
        await voiceSpeakText(`Reminder created: ${smartReminder.text}`);
      }
      
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
    
    try {
      const reminderKey = `reminder_${Date.now()}`;
      const newReminder = { 
        id: Date.now().toString(), 
        text: reminder,
        note: reminderNote,
        category: selectedCategory,
        priority: selectedPriority,
        type: reminderType,
        completed: false,
        createdAt: new Date().toISOString(),
        reminderKey,
        ...(reminderType === 'one-time' && { time: selectedTime }),
        ...(reminderType === 'daily' && { dailyTime }),
        ...(reminderType === 'weekly' && { weeklyTime }),
        ...(reminderType === 'interval' && { intervalMinutes })
      };
      
      const newReminders = [...reminders, newReminder];
      await saveReminders(newReminders);
      await scheduleReminderNotification(newReminder);
      
      // Reset form
      setReminder('');
      setReminderNote('');
      setSelectedPriority('medium');
      setReminderType('one-time');
      
      if (settings.voiceFeedbackEnabled) {
        await voiceSpeakText('Reminder added successfully');
      }
    } catch (error) {
      console.error('Error adding reminder:', error);
      Alert.alert('Error', 'Failed to add reminder');
    } finally {
      setIsLoading(false);
    }
  };

  const scheduleReminderNotification = async (reminderData) => {
    try {
      const { text, type, priority } = reminderData;
      const priorityEmoji = priorities[priority].emoji;
      
      let notificationId;
      // Compute seconds delay robustly.
      // reminderData.time may be a seconds offset (number) or scheduledDate may be an ISO timestamp.
      const MIN_SECONDS = 5;
      let secondsToTrigger = null;

      if (reminderData.scheduledDate) {
        try {
          const target = new Date(reminderData.scheduledDate).getTime();
          const now = Date.now();
          const diffSec = Math.floor((target - now) / 1000);
          secondsToTrigger = Math.max(MIN_SECONDS, diffSec);
          console.log(`Scheduling from scheduledDate: target=${new Date(target).toLocaleString()}, seconds=${secondsToTrigger}`);
        } catch (err) {
          console.warn('Invalid scheduledDate on reminder, falling back to time field', err);
        }
      }

      // If no scheduledDate, check numeric time field
      if (secondsToTrigger === null) {
        if (typeof reminderData.time === 'number' && !isNaN(reminderData.time)) {
          secondsToTrigger = Math.max(MIN_SECONDS, Math.floor(reminderData.time));
          console.log(`Scheduling from numeric time field: seconds=${secondsToTrigger}`);
        }
      }

      // Fallback defaults for recurring/demo types
      if (secondsToTrigger === null) {
        if (type === 'daily' || type === 'weekly' || type === 'interval') {
          secondsToTrigger = 60; // default 1 minute for demo
        } else {
          secondsToTrigger = MIN_SECONDS;
        }
      }

      switch (type) {
        case 'one-time':
          notificationId = await scheduleLocalNotification(
            `${priorityEmoji} Reminder`,
            text,
            secondsToTrigger
          );
          break;

        case 'daily':
        case 'weekly':
        case 'interval':
          // For demo purposes, schedule as one-time notifications using computed seconds
          notificationId = await scheduleLocalNotification(
            `${priorityEmoji} ${type.charAt(0).toUpperCase() + type.slice(1)} Reminder`,
            text,
            secondsToTrigger
          );
          break;
      }
      
      await updateNotificationStats();
      
      if (notificationId) {
        Alert.alert(
          'Reminder Set!', 
          `Notification scheduled successfully\nID: ${notificationId}`,
          [{ text: 'OK', style: 'default' }]
        );
      }
      
    } catch (error) {
      console.error('Error scheduling notification:', error);
      Alert.alert('Error', `Failed to schedule notification: ${error.message}`);
    }
  };

  const completeReminder = async (reminderId) => {
    try {
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
      
      if (settings.voiceFeedbackEnabled) {
        await voiceSpeakText('Reminder completed');
      }
      
      // Clean up old completed reminders if auto-cleanup is enabled
      if (settings.autoCleanup) {
        await cleanupOldCompletedReminders();
      }
    } catch (error) {
      console.error('Error completing reminder:', error);
      Alert.alert('Error', 'Failed to complete reminder');
    }
  };

  const snoozeReminder = async (reminderId, snoozeMinutes = 10) => {
    try {
      const reminder = reminders.find(r => r.id === reminderId);
      if (!reminder) return;

      // Schedule new notification for snooze time
      const snoozeTime = snoozeMinutes * 60; // Convert to seconds
      await scheduleLocalNotification(
        `🔔 Snoozed: ${reminder.text}`,
        `Snoozed for ${snoozeMinutes} minutes`,
        snoozeTime
      );

      if (settings.voiceFeedbackEnabled) {
        await voiceSpeakText(`Reminder snoozed for ${snoozeMinutes} minutes`);
      }

      Alert.alert(
        'Reminder Snoozed',
        `Will remind you again in ${snoozeMinutes} minutes`,
        [{ text: 'OK', style: 'default' }]
      );
    } catch (error) {
      console.error('Error snoozing reminder:', error);
      Alert.alert('Error', 'Failed to snooze reminder');
    }
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
            try {
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
              
              if (settings.voiceFeedbackEnabled) {
                await voiceSpeakText('Reminder deleted');
              }
            } catch (error) {
              console.error('Error deleting reminder:', error);
              Alert.alert('Error', 'Failed to delete reminder');
            }
          }
        }
      ]
    );
  };

  const editReminder = (reminder) => {
    setEditingReminder(reminder);
    setReminder(reminder.text);
    setReminderNote(reminder.note || '');
    setSelectedCategory(reminder.category);
    setSelectedPriority(reminder.priority);
    setReminderType(reminder.type);
    if (reminder.dailyTime) setDailyTime(reminder.dailyTime);
    if (reminder.weeklyTime) setWeeklyTime(reminder.weeklyTime);
    if (reminder.intervalMinutes) setIntervalMinutes(reminder.intervalMinutes);
    if (reminder.time) setSelectedTime(reminder.time);
    setShowEditModal(true);
  };

  const updateReminder = async () => {
    if (!editingReminder || reminder.trim() === '') return;

    try {
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
        note: reminderNote,
        category: selectedCategory,
        priority: selectedPriority,
        type: reminderType,
        updatedAt: new Date().toISOString(),
        ...(reminderType === 'one-time' && { time: selectedTime }),
        ...(reminderType === 'daily' && { dailyTime }),
        ...(reminderType === 'weekly' && { weeklyTime }),
        ...(reminderType === 'interval' && { intervalMinutes })
      };

      const newReminders = reminders.map(r => 
        r.id === editingReminder.id ? updatedReminder : r
      );
      
      await saveReminders(newReminders);
      await scheduleReminderNotification(updatedReminder);
      
      setShowEditModal(false);
      setEditingReminder(null);
      setReminder('');
      setReminderNote('');
      
      if (settings.voiceFeedbackEnabled) {
        await voiceSpeakText('Reminder updated');
      }
    } catch (error) {
      console.error('Error updating reminder:', error);
      Alert.alert('Error', 'Failed to update reminder');
    }
  };

  const cleanupOldCompletedReminders = async () => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const filteredCompleted = completedReminders.filter(reminder => {
        const completedDate = new Date(reminder.completedAt);
        return completedDate > thirtyDaysAgo;
      });
      
      if (filteredCompleted.length !== completedReminders.length) {
        await saveCompletedReminders(filteredCompleted);
      }
    } catch (error) {
      console.error('Error cleaning up old reminders:', error);
    }
  };

  const updateNotificationStats = async () => {
    try {
      const stats = await getNotificationStats();
      setNotificationStats(stats);
    } catch (error) {
      console.error('Error updating notification stats:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadReminders();
      await loadCompletedReminders();
      await updateNotificationStats();
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const getFilteredReminders = () => {
    if (!searchQuery) return reminders;
    return reminders.filter(reminder =>
      reminder.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reminder.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (reminder.note && reminder.note.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  };

  const getFilteredCompletedReminders = () => {
    if (!searchQuery) return completedReminders;
    return completedReminders.filter(reminder =>
      reminder.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reminder.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  // Memoize filtered lists at top-level so hooks are called consistently
  const filteredRemindersMemo = useMemo(() => getFilteredReminders(), [reminders, searchQuery]);
  const filteredCompletedRemindersMemo = useMemo(() => getFilteredCompletedReminders(), [completedReminders, searchQuery]);

  const formatTimeDisplay = (timeValue) => {
    const standardOption = timeOptions.find(t => t.value === timeValue);
    if (standardOption && standardOption.value !== 'custom') {
      return standardOption.label;
    }
    
    if (typeof timeValue === 'number' && timeValue > 0) {
      const hours = Math.floor(timeValue / 3600);
      const minutes = Math.floor((timeValue % 3600) / 60);
      const seconds = timeValue % 60;
      
      if (hours > 0) {
        return `${hours}h ${minutes}m ${seconds}s`;
      } else if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
      } else {
        return `${seconds}s`;
      }
    }
    
    return '5 seconds';
  };

  const renderTabBar = () => (
    <View style={[styles.tabBar, { backgroundColor: theme.secondary }]}>
      <TouchableOpacity 
        style={[
          styles.tabButton, 
          selectedTab === 'active' && styles.activeTab
        ]}
        onPress={() => setSelectedTab('active')}
      >
        <Text style={[
          styles.tabText, 
          { color: theme.textSecondary },
          selectedTab === 'active' && styles.activeTabText
        ]}>
          Active ({reminders.length})
        </Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[
          styles.tabButton, 
          selectedTab === 'completed' && styles.activeTab
        ]}
        onPress={() => setSelectedTab('completed')}
      >
        <Text style={[
          styles.tabText, 
          { color: theme.textSecondary },
          selectedTab === 'completed' && styles.activeTabText
        ]}>
          Completed ({completedReminders.length})
        </Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[
          styles.tabButton, 
          selectedTab === 'stats' && styles.activeTab
        ]}
        onPress={() => setSelectedTab('stats')}
      >
        <Text style={[
          styles.tabText, 
          { color: theme.textSecondary },
          selectedTab === 'stats' && styles.activeTabText
        ]}>
          Stats
        </Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[
          styles.tabButton, 
          selectedTab === 'finance' && styles.activeTab
        ]}
        onPress={() => setSelectedTab('finance')}
      >
        <Text style={[
          styles.tabText, 
          { color: theme.textSecondary },
          selectedTab === 'finance' && styles.activeTabText
        ]}>
          💰 Finance
        </Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[
          styles.tabButton, 
          selectedTab === 'calendar' && styles.activeTab
        ]}
        onPress={() => setSelectedTab('calendar')}
      >
        <Text style={[
          styles.tabText, 
          { color: theme.textSecondary },
          selectedTab === 'calendar' && styles.activeTabText
        ]}>
          📅 Calendar
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderSmartSuggestions = () => {
    if (!settings.smartSuggestionsEnabled || smartSuggestions.length === 0) return null;

    return (
      <View style={[styles.suggestionsContainer, { backgroundColor: theme.secondary }]}>
        <TouchableOpacity 
          style={styles.suggestionsHeader}
          onPress={() => setShowSuggestions(!showSuggestions)}
        >
          <Text style={[styles.suggestionsTitle, { color: theme.text }]}>
            💡 Smart Suggestions ({smartSuggestions.length})
          </Text>
          <Text style={[styles.arrow, { color: theme.textSecondary }]}>
            {showSuggestions ? '▲' : '▼'}
          </Text>
        </TouchableOpacity>
        
        {showSuggestions && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestionsList}>
            {smartSuggestions.slice(0, 5).map((suggestion, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.suggestionChip, { borderColor: categories[suggestion.category]?.color || theme.accent }]}
                onPress={() => {
                  setReminder(suggestion.text);
                  setSelectedCategory(suggestion.category);
                  setSelectedPriority(suggestion.priority);
                  setShowSuggestions(false);
                }}
              >
                <Text style={styles.suggestionEmoji}>
                  {categories[suggestion.category]?.emoji || '💡'}
                </Text>
                <Text style={[styles.suggestionText, { color: theme.text }]} numberOfLines={2}>
                  {suggestion.text}
                </Text>
                <Text style={[styles.suggestionConfidence, { color: theme.textSecondary }]}>
                  {suggestion.confidence}%
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
    );
  };

  const renderReminder = ({ item }) => (
    <SwipeableReminder
      reminder={item}
      category={categories[item.category] || categories['Personal']}
      priority={priorities[item.priority] || priorities['medium']}
      onComplete={() => completeReminder(item.id)}
      onSnooze={(minutes) => snoozeReminder(item.id, minutes)}
      onDelete={() => deleteReminder(item.id, item.completed)}
      onEdit={() => editReminder(item)}
      theme={theme}
      weekdays={weekdays}
      intervalOptions={intervalOptions}
      formatTimeDisplay={formatTimeDisplay}
    />
  );

  const renderStatsView = () => (
    <ScrollView 
      style={[styles.statsView, { backgroundColor: theme.primary }]} 
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {notificationStats && (
        <View style={[styles.statsContainer, { backgroundColor: theme.secondary }]}>
          <Text style={[styles.statsTitle, { color: theme.text }]}>📊 Notification Statistics</Text>
          <View style={styles.statsGrid}>
            <View style={[styles.statItem, { backgroundColor: theme.primary }]}>
              <Text style={[styles.statNumber, { color: theme.accent }]}>
                {notificationStats.activeReminders}
              </Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Active</Text>
            </View>
            <View style={[styles.statItem, { backgroundColor: theme.primary }]}>
              <Text style={[styles.statNumber, { color: theme.accent }]}>
                {completedReminders.length}
              </Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Completed</Text>
            </View>
            <View style={[styles.statItem, { backgroundColor: theme.primary }]}>
              <Text style={[styles.statNumber, { color: theme.accent }]}>
                {notificationStats.scheduledNotifications}
              </Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Scheduled</Text>
            </View>
            <View style={[styles.statItem, { backgroundColor: theme.primary }]}>
              <Text style={[styles.statNumber, { color: theme.accent }]}>
                {smartSuggestions.length}
              </Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Suggestions</Text>
            </View>
          </View>
        </View>
      )}

      <View style={[styles.categoryStatsContainer, { backgroundColor: theme.secondary }]}>
        <Text style={[styles.statsTitle, { color: theme.text }]}>📈 Category Breakdown</Text>
        {Object.entries(categories).map(([name, info]) => {
          const count = reminders.filter(r => r.category === name).length;
          const completedCount = completedReminders.filter(r => r.category === name).length;
          if (count === 0 && completedCount === 0) return null;
          
          return (
            <View key={name} style={styles.categoryStatItem}>
              <Text style={styles.categoryEmoji}>{info.emoji}</Text>
              <Text style={[styles.categoryStatName, { color: info.color }]}>{name}</Text>
              <Text style={[styles.categoryStatCount, { color: theme.textSecondary }]}>
                Active: {count} | Done: {completedCount}
              </Text>
            </View>
          );
        })}
      </View>

      <View style={styles.debugContainer}>
        <TouchableOpacity 
          style={[styles.testButton, { backgroundColor: theme.accent }]} 
          onPress={testImmediateNotification}
        >
          <Text style={styles.debugButtonText}>🧪 Test Now</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.testButton, { backgroundColor: theme.accent }]} 
          onPress={async () => {
            const scheduled = await getAllScheduledNotifications();
            Alert.alert('Scheduled Notifications', `Total: ${scheduled.length}`);
          }}
        >
          <Text style={styles.debugButtonText}>📋 View All</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.testButton, { backgroundColor: '#ff4757' }]} 
          onPress={() => {
            Alert.alert(
              'Clear All Notifications',
              'This will cancel all scheduled reminders. Are you sure?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Clear All',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await cancelAllScheduledNotifications();
                      await updateNotificationStats();
                      Alert.alert('Success', 'All notifications cleared');
                    } catch (error) {
                      Alert.alert('Error', 'Failed to clear notifications');
                    }
                  }
                }
              ]
            );
          }}
        >
          <Text style={styles.debugButtonText}>🗑️ Clear All</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.primary }]}>
      <StatusBar barStyle={settings.darkMode ? "light-content" : "dark-content"} />
      
      {/* Loading Screen */}
      {isLoading && (
        <View style={[StyleSheet.absoluteFill, styles.centerContent, { backgroundColor: theme.primary }]}>
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            Loading Blink Reminder...
          </Text>
        </View>
      )}
      
      {/* Main Content */}
      {!isLoading && (
        <>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>
          Blink Reminder App
        </Text>
        <TouchableOpacity 
          style={styles.settingsButton}
          onPress={() => setShowSettingsModal(true)}
        >
          <Text style={styles.settingsButtonText}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <TextInput
        style={[
          styles.searchInput, 
          { 
            backgroundColor: theme.secondary, 
            borderColor: theme.border,
            color: theme.text 
          }
        ]}
        placeholder="Search reminders..."
        placeholderTextColor={theme.textSecondary}
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      {/* Tab Bar */}
      {renderTabBar()}

      {/* Smart Suggestions */}
      {selectedTab === 'active' && renderSmartSuggestions()}

      {/* Add Reminder Form - only show on active tab */}
      {selectedTab === 'active' && (
        <View style={styles.formContainer}>
          {/* Smart Input Toggle */}
          <View style={[styles.inputToggleContainer, { backgroundColor: theme.secondary, borderColor: theme.border }]}>
            <Text style={[styles.inputToggleLabel, { color: theme.text }]}>🧠 Smart Input</Text>
            <Switch
              value={smartInputMode}
              onValueChange={setSmartInputMode}
              trackColor={{ false: '#767577', true: theme.accent }}
              thumbColor={smartInputMode ? '#ffffff' : '#f4f3f4'}
            />
          </View>
          
          {smartInputMode ? (
            <SmartInput
              onReminderParsed={handleSmartReminderParsed}
              onError={(err) => console.warn('SmartInput error:', err)}
              darkMode={settings.darkMode}
              initialValue={reminder}
              placeholder="Try: 'Remind me to call mom at 7 PM'"
            />
          ) : (
            <View>
              {/* Category Selector */}
              <TouchableOpacity 
                style={[
                  styles.selectorButton, 
                  { 
                    backgroundColor: theme.secondary,
                    borderColor: categories[selectedCategory].color 
                  }
                ]}
                onPress={() => setShowCategoryModal(true)}
              >
                <Text style={styles.selectorEmoji}>{categories[selectedCategory].emoji}</Text>
                <Text style={[styles.selectorText, { color: categories[selectedCategory].color }]}>
                  {selectedCategory}
                </Text>
                <Text style={[styles.arrow, { color: theme.textSecondary }]}>▼</Text>
              </TouchableOpacity>

              {/* Priority Selector */}
              <TouchableOpacity 
                style={[
                  styles.selectorButton, 
                  { 
                    backgroundColor: theme.secondary,
                    borderColor: priorities[selectedPriority].color 
                  }
                ]}
                onPress={() => setShowPriorityModal(true)}
              >
                <Text style={styles.selectorEmoji}>{priorities[selectedPriority].emoji}</Text>
                <Text style={[styles.selectorText, { color: priorities[selectedPriority].color }]}>
                  {priorities[selectedPriority].label}
                </Text>
                <Text style={[styles.arrow, { color: theme.textSecondary }]}>▼</Text>
              </TouchableOpacity>

              {/* Reminder Type Selector */}
              <TouchableOpacity 
                style={[
                  styles.selectorButton, 
                  { 
                    backgroundColor: theme.secondary,
                    borderColor: theme.accent
                  }
                ]}
                onPress={() => setShowReminderTypeModal(true)}
              >
                <Text style={styles.selectorEmoji}>{reminderTypes[reminderType].emoji}</Text>
                <Text style={[styles.selectorText, { color: theme.accent }]}>
                  {reminderTypes[reminderType].label}
                </Text>
                <Text style={[styles.arrow, { color: theme.textSecondary }]}>▼</Text>
              </TouchableOpacity>

              {/* Time Selector */}
              {reminderType === 'one-time' && (
                <TouchableOpacity 
                  style={[
                    styles.selectorButton,
                    { 
                      backgroundColor: theme.secondary,
                      borderColor: theme.border
                    }
                  ]}
                  onPress={() => setShowTimeModal(true)}
                >
                  <Text style={styles.selectorEmoji}>⏰</Text>
                  <Text style={[styles.selectorText, { color: theme.text }]}>
                    {formatTimeDisplay(selectedTime)}
                  </Text>
                  <Text style={[styles.arrow, { color: theme.textSecondary }]}>▼</Text>
                </TouchableOpacity>
              )}

              <TextInput
                style={[
                  styles.input, 
                  { 
                    backgroundColor: theme.secondary, 
                    borderColor: theme.border,
                    color: theme.text 
                  }
                ]}
                placeholder="Enter your reminder"
                placeholderTextColor={theme.textSecondary}
                value={reminder}
                onChangeText={setReminder}
              />
              
              <TextInput
                style={[
                  styles.noteInput, 
                  { 
                    backgroundColor: theme.secondary, 
                    borderColor: theme.border,
                    color: theme.text 
                  }
                ]}
                placeholder="Add a note (optional)"
                placeholderTextColor={theme.textSecondary}
                value={reminderNote}
                onChangeText={setReminderNote}
                multiline={true}
                numberOfLines={2}
              />
              
              <TouchableOpacity 
                style={[styles.addButton, { backgroundColor: theme.accent }]} 
                onPress={addReminder}
              >
                <Text style={styles.addButtonText}>Add Reminder</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Content based on selected tab */}
      {selectedTab === 'active' && (
        <FlatList
          style={styles.list}
          data={filteredRemindersMemo}
          keyExtractor={(item) => item.id}
          renderItem={renderReminder}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                No active reminders
              </Text>
              <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>
                Add a reminder to get started!
              </Text>
            </View>
          }
        />
      )}

      {selectedTab === 'completed' && (
        <FlatList
          style={styles.list}
          data={filteredCompletedRemindersMemo}
          keyExtractor={(item) => item.id}
          renderItem={renderReminder}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                No completed reminders
              </Text>
              <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>
                Complete some reminders to see them here!
              </Text>
            </View>
          }
        />
      )}

      {selectedTab === 'stats' && renderStatsView()}

      {selectedTab === 'finance' && (
        <FinancialDashboard
          isDarkMode={settings.darkMode}
          onClose={() => setSelectedTab('active')}
        />
      )}

      {selectedTab === 'calendar' && (
        <CalendarView
          isDarkMode={settings.darkMode}
          onDateSelect={(date) => {
            // When a date is selected, open birthday manager for that date
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const day = date.getDate().toString().padStart(2, '0');
            setSelectedBirthdayDate(`${month}-${day}`);
            setShowBirthdayManager(true);
          }}
          onAddBirthday={(dateStr) => {
            setSelectedBirthdayDate(dateStr);
            setShowBirthdayManager(true);
          }}
        />
      )}

      {/* Settings Modal */}
      <Modal visible={showSettingsModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.secondary }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Settings</Text>
            
            <View style={[styles.settingItem, { borderBottomColor: theme.border }]}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>Sound Notifications</Text>
              <Switch
                value={settings.soundEnabled}
                onValueChange={(value) => saveSettings({ ...settings, soundEnabled: value })}
                trackColor={{ false: '#767577', true: theme.accent }}
              />
            </View>
            
            <View style={[styles.settingItem, { borderBottomColor: theme.border }]}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>Vibration</Text>
              <Switch
                value={settings.vibrationEnabled}
                onValueChange={(value) => saveSettings({ ...settings, vibrationEnabled: value })}
                trackColor={{ false: '#767577', true: theme.accent }}
              />
            </View>
            
            <View style={[styles.settingItem, { borderBottomColor: theme.border }]}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>Dark Mode</Text>
              <Switch
                value={settings.darkMode}
                onValueChange={(value) => saveSettings({ ...settings, darkMode: value })}
                trackColor={{ false: '#767577', true: theme.accent }}
              />
            </View>
            
            <View style={[styles.settingItem, { borderBottomColor: theme.border }]}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>Smart Suggestions</Text>
              <Switch
                value={settings.smartSuggestionsEnabled}
                onValueChange={(value) => saveSettings({ ...settings, smartSuggestionsEnabled: value })}
                trackColor={{ false: '#767577', true: theme.accent }}
              />
            </View>
            
            <View style={[styles.settingItem, { borderBottomColor: theme.border }]}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>Voice Feedback</Text>
              <Switch
                value={settings.voiceFeedbackEnabled}
                onValueChange={(value) => saveSettings({ ...settings, voiceFeedbackEnabled: value })}
                trackColor={{ false: '#767577', true: theme.accent }}
              />
            </View>
            
            <View style={[styles.settingItem, { borderBottomColor: theme.border }]}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>Auto Cleanup (30 days)</Text>
              <Switch
                value={settings.autoCleanup}
                onValueChange={(value) => saveSettings({ ...settings, autoCleanup: value })}
                trackColor={{ false: '#767577', true: theme.accent }}
              />
            </View>

            <TouchableOpacity 
              style={[styles.closeButton, { backgroundColor: theme.accent }]}
              onPress={() => setShowSettingsModal(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Category Modal */}
      <Modal visible={showCategoryModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.secondary }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Select Category</Text>
            {Object.entries(categories).map(([name, info]) => (
              <TouchableOpacity
                key={name}
                style={[
                  styles.categoryOption, 
                  selectedCategory === name && { backgroundColor: 'rgba(0,122,255,0.1)' }
                ]}
                onPress={() => {
                  setSelectedCategory(name);
                  setShowCategoryModal(false);
                }}
              >
                <Text style={styles.categoryEmoji}>{info.emoji}</Text>
                <Text style={[
                  styles.categoryOptionText, 
                  { color: info.color }
                ]}>
                  {name}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity 
              style={[styles.closeButton, { backgroundColor: theme.accent }]}
              onPress={() => setShowCategoryModal(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Priority Modal */}
      <Modal visible={showPriorityModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.secondary }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Select Priority</Text>
            {Object.entries(priorities).map(([key, priority]) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.categoryOption, 
                  selectedPriority === key && { backgroundColor: 'rgba(0,122,255,0.1)' }
                ]}
                onPress={() => {
                  setSelectedPriority(key);
                  setShowPriorityModal(false);
                }}
              >
                <Text style={styles.categoryEmoji}>{priority.emoji}</Text>
                <Text style={[
                  styles.categoryOptionText, 
                  { color: priority.color }
                ]}>
                  {priority.label}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity 
              style={[styles.closeButton, { backgroundColor: theme.accent }]}
              onPress={() => setShowPriorityModal(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Reminder Type Modal */}
      <Modal visible={showReminderTypeModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.secondary }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Select Reminder Type</Text>
            {Object.entries(reminderTypes).map(([key, info]) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.reminderTypeOption, 
                  reminderType === key && { backgroundColor: 'rgba(0,122,255,0.1)' }
                ]}
                onPress={() => {
                  setReminderType(key);
                  setShowReminderTypeModal(false);
                }}
              >
                <Text style={styles.categoryEmoji}>{info.emoji}</Text>
                <View style={styles.reminderTypeText}>
                  <Text style={[styles.reminderTypeLabel, { color: theme.text }]}>
                    {info.label}
                  </Text>
                  <Text style={[styles.reminderTypeDescription, { color: theme.textSecondary }]}>
                    {info.description}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
            <TouchableOpacity 
              style={[styles.closeButton, { backgroundColor: theme.accent }]}
              onPress={() => setShowReminderTypeModal(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Time Modal */}
      <Modal visible={showTimeModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.secondary }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Select Time</Text>
            {timeOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.timeOption, 
                  selectedTime === option.value && { backgroundColor: 'rgba(0,122,255,0.1)' }
                ]}
                onPress={() => {
                  if (option.value === 'custom') {
                    setShowTimeModal(false);
                    setShowCustomTimeModal(true);
                  } else {
                    setSelectedTime(option.value);
                    setShowTimeModal(false);
                  }
                }}
              >
                <Text style={[styles.timeOptionText, { color: theme.text }]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity 
              style={[styles.closeButton, { backgroundColor: theme.accent }]}
              onPress={() => setShowTimeModal(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Custom Time Modal */}
      <Modal visible={showCustomTimeModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.secondary }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Custom Time</Text>
            
            <View style={styles.customTimeContainer}>
              <View style={styles.timeInputGroup}>
                <Text style={[styles.timeInputLabel, { color: theme.text }]}>Hours</Text>
                <View style={styles.timeInputContainer}>
                  <TouchableOpacity 
                    style={[styles.timeButton, { backgroundColor: theme.accent }]}
                    onPress={() => setCustomHours(Math.max(0, customHours - 1))}
                  >
                    <Text style={styles.timeButtonText}>-</Text>
                  </TouchableOpacity>
                  <Text style={[styles.timeValue, { color: theme.text }]}>{customHours}</Text>
                  <TouchableOpacity 
                    style={[styles.timeButton, { backgroundColor: theme.accent }]}
                    onPress={() => setCustomHours(Math.min(23, customHours + 1))}
                  >
                    <Text style={styles.timeButtonText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.timeInputGroup}>
                <Text style={[styles.timeInputLabel, { color: theme.text }]}>Minutes</Text>
                <View style={styles.timeInputContainer}>
                  <TouchableOpacity 
                    style={[styles.timeButton, { backgroundColor: theme.accent }]}
                    onPress={() => setCustomMinutes(Math.max(0, customMinutes - 1))}
                  >
                    <Text style={styles.timeButtonText}>-</Text>
                  </TouchableOpacity>
                  <Text style={[styles.timeValue, { color: theme.text }]}>{customMinutes}</Text>
                  <TouchableOpacity 
                    style={[styles.timeButton, { backgroundColor: theme.accent }]}
                    onPress={() => setCustomMinutes(Math.min(59, customMinutes + 1))}
                  >
                    <Text style={styles.timeButtonText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.timeInputGroup}>
                <Text style={[styles.timeInputLabel, { color: theme.text }]}>Seconds</Text>
                <View style={styles.timeInputContainer}>
                  <TouchableOpacity 
                    style={[styles.timeButton, { backgroundColor: theme.accent }]}
                    onPress={() => setCustomSeconds(Math.max(0, customSeconds - 1))}
                  >
                    <Text style={styles.timeButtonText}>-</Text>
                  </TouchableOpacity>
                  <Text style={[styles.timeValue, { color: theme.text }]}>{customSeconds}</Text>
                  <TouchableOpacity 
                    style={[styles.timeButton, { backgroundColor: theme.accent }]}
                    onPress={() => setCustomSeconds(Math.min(59, customSeconds + 1))}
                  >
                    <Text style={styles.timeButtonText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={[styles.customTimePreview, { backgroundColor: theme.primary }]}>
              <Text style={[styles.customTimePreviewText, { color: theme.accent }]}>
                Total: {customHours}h {customMinutes}m {customSeconds}s
              </Text>
              <Text style={[styles.customTimePreviewSubtext, { color: theme.textSecondary }]}>
                ({customHours * 3600 + customMinutes * 60 + customSeconds} seconds)
              </Text>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, { backgroundColor: theme.primary }]}
                onPress={() => setShowCustomTimeModal(false)}
              >
                <Text style={[styles.cancelButtonText, { color: theme.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, { backgroundColor: theme.accent }]}
                onPress={() => {
                  const totalSeconds = customHours * 3600 + customMinutes * 60 + customSeconds;
                  if (totalSeconds > 0) {
                    setSelectedTime(totalSeconds);
                    setShowCustomTimeModal(false);
                  } else {
                    Alert.alert('Invalid Time', 'Please set a time greater than 0 seconds');
                  }
                }}
              >
                <Text style={styles.confirmButtonText}>Set Time</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Modal */}
      <Modal visible={showEditModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.secondary }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Edit Reminder</Text>
            
            <TextInput
              style={[
                styles.input, 
                { 
                  backgroundColor: theme.primary, 
                  borderColor: theme.border,
                  color: theme.text 
                }
              ]}
              placeholder="Enter your reminder"
              placeholderTextColor={theme.textSecondary}
              value={reminder}
              onChangeText={setReminder}
            />
            
            <TextInput
              style={[
                styles.noteInput, 
                { 
                  backgroundColor: theme.primary, 
                  borderColor: theme.border,
                  color: theme.text 
                }
              ]}
              placeholder="Add a note (optional)"
              placeholderTextColor={theme.textSecondary}
              value={reminderNote}
              onChangeText={setReminderNote}
              multiline={true}
              numberOfLines={2}
            />

            <View style={styles.modalButtonContainer}>
              <TouchableOpacity 
                style={[styles.modalButton, { backgroundColor: theme.primary }]}
                onPress={() => {
                  setShowEditModal(false);
                  setEditingReminder(null);
                  setReminder('');
                  setReminderNote('');
                }}
              >
                <Text style={[styles.cancelButtonText, { color: theme.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, { backgroundColor: theme.accent }]}
                onPress={updateReminder}
              >
                <Text style={styles.saveButtonText}>Update</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Quick Expense Tracker (modal component handles its own Modal) */}
      {showQuickExpense && (
        <QuickExpenseTracker
          isDarkMode={settings.darkMode}
          onClose={() => setShowQuickExpense(false)}
          onExpenseAdded={async () => {
            setShowQuickExpense(false);
            // refresh relevant data if needed
            await updateNotificationStats();
          }}
        />
      )}

      {/* Birthday Manager (component renders its own UI/modal) */}
      {showBirthdayManager && (
        <BirthdayManager
          isDarkMode={settings.darkMode}
          onClose={() => {
            setShowBirthdayManager(false);
            setSelectedBirthdayDate(null);
          }}
          presetDate={selectedBirthdayDate}
        />
      )}

      {/* Floating Action Buttons */}
      {selectedTab === 'active' && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: theme.accent }]}
          onPress={() => setShowQuickExpense(true)}
        >
          <Ionicons name="card-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {selectedTab === 'calendar' && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: theme.birthday || '#FF6B9D' }]}
          onPress={() => setShowBirthdayManager(true)}
        >
          <Ionicons name="gift-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      )}
      </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    fontSize: 18,
    fontWeight: 'bold'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: HEADER_PADDING_TOP,
    paddingBottom: 10
  },
  title: { 
    fontSize: TITLE_FONT_SIZE, 
    fontWeight: 'bold'
  },
  settingsButton: {
    padding: 8
  },
  settingsButtonText: {
    fontSize: 20
  },
  searchInput: {
    marginHorizontal: 20,
    marginBottom: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 15,
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
    fontWeight: '500'
  },
  activeTabText: {
    color: 'white',
    fontWeight: '600'
  },
  formContainer: {
    paddingHorizontal: 20,
    marginBottom: 10
  },
  inputToggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1
  },
  inputToggleLabel: {
    fontSize: 16,
    fontWeight: '600'
  },
  suggestionsContainer: {
    marginHorizontal: 20,
    marginBottom: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1
  },
  suggestionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15
  },
  suggestionsTitle: {
    fontSize: 16,
    fontWeight: '600'
  },
  suggestionsList: {
    paddingHorizontal: 15,
    paddingBottom: 15
  },
  suggestionChip: {
    backgroundColor: 'rgba(0,122,255,0.1)',
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
    marginRight: 10,
    minWidth: SUGGESTION_CHIP_MIN_WIDTH,
    maxWidth: SUGGESTION_CHIP_MAX_WIDTH,
    alignItems: 'center'
  },
  suggestionEmoji: {
    fontSize: 16,
    marginBottom: 4
  },
  suggestionText: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 4
  },
  suggestionConfidence: {
    fontSize: 10,
    fontWeight: '600'
  },
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1
  },
  selectorEmoji: {
    fontSize: 20,
    marginRight: 12
  },
  selectorText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500'
  },
  arrow: {
    fontSize: 12
  },
  input: {
    padding: 15,
    borderRadius: 12,
    marginBottom: 8,
    fontSize: 16,
    borderWidth: 1
  },
  noteInput: {
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    fontSize: 14,
    borderWidth: 1,
    minHeight: 60,
    textAlignVertical: 'top'
  },
  addButton: {
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
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500'
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8
  },
  statsView: {
    flex: 1,
    paddingHorizontal: 20
  },
  statsContainer: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    textAlign: 'center'
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  statItem: {
    width: '48%',
    alignItems: 'center',
    paddingVertical: 15,
    borderRadius: 8,
    marginBottom: 10
  },
  statNumber: {
    fontSize: LARGE_FONT_SIZE,
    fontWeight: 'bold'
  },
  statLabel: {
    fontSize: 14,
    marginTop: 4
  },
  categoryStatsContainer: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  categoryStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  categoryEmoji: {
    fontSize: 16,
    marginRight: 8
  },
  categoryStatName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 10
  },
  categoryStatCount: {
    fontSize: 12
  },
  debugContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    gap: 10
  },
  testButton: {
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    borderRadius: 16,
    padding: 24,
    minWidth: Math.min(width * 0.95, width * 0.98),
    maxHeight: '80%'
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1
  },
  settingLabel: {
    fontSize: 16
  },
  closeButton: {
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
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 5
  },
  categoryOptionText: {
    fontSize: 16,
    fontWeight: '500'
  },
  timeOption: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 5
  },
  timeOptionText: {
    fontSize: 16
  },
  reminderTypeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 5
  },
  reminderTypeText: {
    flex: 1,
    marginLeft: 10
  },
  reminderTypeLabel: {
    fontSize: 16,
    fontWeight: '500'
  },
  reminderTypeDescription: {
    fontSize: 12,
    marginTop: 2
  },
  customTimeContainer: {
    marginVertical: 20
  },
  timeInputGroup: {
    marginBottom: 20,
    alignItems: 'center'
  },
  timeInputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10
  },
  timeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  timeButton: {
    width: TIME_BUTTON_SIZE,
    height: TIME_BUTTON_SIZE,
    borderRadius: Math.round(TIME_BUTTON_SIZE / 2),
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 15
  },
  timeButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600'
  },
  timeValue: {
    fontSize: LARGE_FONT_SIZE,
    fontWeight: '600',
    minWidth: TIME_VALUE_MIN_WIDTH,
    textAlign: 'center'
  },
  customTimePreview: {
    padding: 15,
    borderRadius: 12,
    marginVertical: 20,
    alignItems: 'center'
  },
  customTimePreviewText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 5
  },
  customTimePreviewSubtext: {
    fontSize: 14
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center'
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600'
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600'
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600'
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: Math.round(FAB_SIZE / 2),
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  }
});