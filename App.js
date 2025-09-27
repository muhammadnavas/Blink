import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { useEffect, useState } from 'react';
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
import SmartInput from './components/SmartInput';
import { speakText as voiceSpeakText } from './components/VoiceInput';
import {
    addNotificationResponseReceivedListener,
    cancelAllReminders,
    cancelAllScheduledNotifications,
    cancelReminder,
    createPersistentNotification,
    getAllActiveReminders,
    getAllScheduledNotifications,
    getNotificationStats,
    handleNotificationResponse,
    initializeNotificationSystem,
    scheduleCustomIntervalReminder,
    scheduleDailyReminder,
    scheduleLocalNotification,
    scheduleWeeklyReminder,
    testAndroidNotification,
    testImmediateNotification
} from './services/notifications';

const { width } = Dimensions.get('window');

export default function App() {
  const [reminder, setReminder] = useState('');
  const [reminders, setReminders] = useState([]);
  const [completedReminders, setCompletedReminders] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('Personal');
  const [selectedTime, setSelectedTime] = useState(5);
  const [selectedPriority, setSelectedPriority] = useState('medium');
  const [reminderNote, setReminderNote] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState('active'); // 'active', 'completed', 'stats'
  
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
  const [editingReminder, setEditingReminder] = useState(null);
  
  // Smart input states
  const [smartInputMode, setSmartInputMode] = useState(true);
  const [lastParsedReminder, setLastParsedReminder] = useState(null);
  
  // Enhanced reminder features
  const [reminderType, setReminderType] = useState('one-time');
  const [dailyTime, setDailyTime] = useState({ hour: 9, minute: 0 });
  const [weeklyTime, setWeeklyTime] = useState({ weekday: 2, hour: 9, minute: 0 });
  const [intervalMinutes, setIntervalMinutes] = useState(60);
  const [notificationStats, setNotificationStats] = useState(null);
  const [settings, setSettings] = useState({
    soundEnabled: true,
    vibrationEnabled: true,
    darkMode: false,
    autoCleanup: true,
    showCompletedCount: true
  });

  // Enhanced categories with more options
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
    { label: '1 day', value: 86400 }
  ];

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    setIsLoading(true);
    await loadReminders();
    await loadCompletedReminders();
    await loadSettings();
    await requestNotificationPermissions();
    await initializeNotificationSystem();
    await updateNotificationStats();
    
    const subscription = addNotificationResponseReceivedListener(handleNotificationResponse);
    setIsLoading(false);
    
    return () => {
      if (subscription) subscription.remove();
    };
  };

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('app_settings');
      if (savedSettings) {
        setSettings({ ...settings, ...JSON.parse(savedSettings) });
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

  // Handle smart parsed reminder
  const handleSmartReminderParsed = async (parsedResult) => {
    try {
      console.log('🧠 Processing smart reminder:', parsedResult);
      
      const { reminder: smartReminder } = parsedResult;
      setLastParsedReminder(parsedResult);
      
      // Convert smart reminder to app format
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
    
    setIsLoading(false);
  };

  const scheduleReminderNotification = async (reminderData) => {
    try {
      let notificationId;
      const { text, reminderKey, type, priority } = reminderData;
      const priorityEmoji = priorities[priority].emoji;
      
      switch (type) {
        case 'one-time':
          notificationId = await scheduleLocalNotification(
            `${priorityEmoji} Reminder`, 
            text, 
            reminderData.time
          );
          break;
          
        case 'daily':
          notificationId = await scheduleDailyReminder(
            `${priorityEmoji} Daily Reminder`,
            text,
            reminderData.dailyTime.hour,
            reminderData.dailyTime.minute,
            reminderKey
          );
          break;
          
        case 'weekly':
          notificationId = await scheduleWeeklyReminder(
            `${priorityEmoji} Weekly Reminder`,
            text,
            reminderData.weeklyTime.weekday,
            reminderData.weeklyTime.hour,
            reminderData.weeklyTime.minute,
            reminderKey
          );
          break;
          
        case 'interval':
          notificationId = await scheduleCustomIntervalReminder(
            `${priorityEmoji} Interval Reminder`,
            text,
            reminderData.intervalMinutes * 60,
            reminderKey
          );
          break;
      }
      
      await updateNotificationStats();
      Alert.alert('Reminder Set!', `Notification scheduled successfully\nID: ${notificationId}`);
      
    } catch (error) {
      console.error('Error scheduling notification:', error);
      Alert.alert('Error', `Failed to schedule notification: ${error.message}`);
    }
  };

  const completeReminder = async (reminderId) => {
    const reminder = reminders.find(r => r.id === reminderId);
    if (!reminder) return;

    // Cancel the notification if it's a recurring reminder
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
    
    // Clean up old completed reminders if auto-cleanup is enabled
    if (settings.autoCleanup) {
      await cleanupOldCompletedReminders();
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
  };

  const cleanupOldCompletedReminders = async () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const filteredCompleted = completedReminders.filter(reminder => {
      const completedDate = new Date(reminder.completedAt);
      return completedDate > thirtyDaysAgo;
    });
    
    if (filteredCompleted.length !== completedReminders.length) {
      await saveCompletedReminders(filteredCompleted);
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
    await loadReminders();
    await loadCompletedReminders();
    await updateNotificationStats();
    setRefreshing(false);
  };

  // Filter reminders based on search query
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

  const createPersistentReminder = async () => {
    if (reminder.trim() === '') {
      Alert.alert('Error', 'Please enter a reminder text first');
      return;
    }
    
    try {
      const persistentKey = `persistent_${Date.now()}`;
      const priorityEmoji = priorities[selectedPriority].emoji;
      const notificationId = await createPersistentNotification(
        `${priorityEmoji} Persistent Reminder`,
        reminder,
        persistentKey,
        true
      );
      
      Alert.alert('Persistent Reminder Created!', `ID: ${notificationId}`);
      setReminder('');
      updateNotificationStats();
    } catch (error) {
      Alert.alert('Error', `Failed to create persistent notification: ${error.message}`);
    }
  };

  const showScheduledNotifications = async () => {
    try {
      const scheduled = await getAllScheduledNotifications();
      const activeReminders = await getAllActiveReminders();
      const stats = await getNotificationStats();
      
      const statsText = stats ? 
        `📊 Statistics:\n` +
        `• Active Reminders: ${stats.activeReminders}\n` +
        `• Scheduled Notifications: ${stats.scheduledNotifications}\n` +
        `• Daily: ${stats.reminderTypes.daily}, Weekly: ${stats.reminderTypes.weekly}\n\n`
        : '';
      
      Alert.alert('Notification Status', statsText + `Total Scheduled: ${scheduled.length}`);
    } catch (error) {
      Alert.alert('Error', `Failed to get notification status: ${error.message}`);
    }
  };

  const clearAllNotifications = async () => {
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
              await cancelAllReminders();
              await updateNotificationStats();
              Alert.alert('Success', 'All notifications cleared');
            } catch (error) {
              Alert.alert('Error', `Failed to clear notifications: ${error.message}`);
            }
          }
        }
      ]
    );
  };

  const renderTabBar = () => (
    <View style={styles.tabBar}>
      <TouchableOpacity 
        style={[styles.tabButton, selectedTab === 'active' && styles.activeTab]}
        onPress={() => setSelectedTab('active')}
      >
        <Text style={[styles.tabText, selectedTab === 'active' && styles.activeTabText]}>
          Active ({reminders.length})
        </Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.tabButton, selectedTab === 'completed' && styles.activeTab]}
        onPress={() => setSelectedTab('completed')}
      >
        <Text style={[styles.tabText, selectedTab === 'completed' && styles.activeTabText]}>
          Completed ({completedReminders.length})
        </Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.tabButton, selectedTab === 'stats' && styles.activeTab]}
        onPress={() => setSelectedTab('stats')}
      >
        <Text style={[styles.tabText, selectedTab === 'stats' && styles.activeTabText]}>
          Stats
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderReminder = ({ item }) => {
    const isCompleted = item.completed;
    const category = categories[item.category] || categories['Personal'];
    const priority = priorities[item.priority] || priorities['medium'];
    
    const getTimeDisplay = () => {
      switch (item.type) {
        case 'daily':
          return item.dailyTime ? 
            `Daily at ${String(item.dailyTime.hour).padStart(2, '0')}:${String(item.dailyTime.minute).padStart(2, '0')}` 
            : 'Daily';
        case 'weekly':
          return item.weeklyTime ? 
            `${weekdays.find(w => w.value === item.weeklyTime.weekday)?.label} at ${String(item.weeklyTime.hour).padStart(2, '0')}:${String(item.weeklyTime.minute).padStart(2, '0')}` 
            : 'Weekly';
        case 'interval':
          return item.intervalMinutes ? 
            `Every ${intervalOptions.find(i => i.value === item.intervalMinutes)?.label || `${item.intervalMinutes} minutes`}` 
            : 'Interval';
        default:
          return timeOptions.find(t => t.value === (item.time || 5))?.label || '5 seconds';
      }
    };

    return (
      <TouchableOpacity 
        style={[
          styles.reminderItem, 
          { 
            borderLeftColor: category.color,
            opacity: isCompleted ? 0.7 : 1
          }
        ]}
        onPress={() => isCompleted ? null : editReminder(item)}
        onLongPress={() => deleteReminder(item.id, isCompleted)}
      >
        <View style={styles.reminderContent}>
          <View style={styles.reminderHeader}>
            <Text style={styles.categoryEmoji}>{category.emoji}</Text>
            <Text style={[styles.categoryText, { color: category.color }]}>
              {item.category}
            </Text>
            <Text style={styles.priorityEmoji}>{priority.emoji}</Text>
            <View style={styles.headerActions}>
              {!isCompleted && (
                <TouchableOpacity 
                  style={[styles.completeButton, { backgroundColor: '#4CAF50' }]}
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
          
          <Text style={[styles.reminderText, isCompleted && styles.completedText]}>
            {item.text}
          </Text>
          
          {item.note && (
            <Text style={styles.noteText}>Note: {item.note}</Text>
          )}
          
          <View style={styles.reminderFooter}>
            <Text style={styles.timeText}>{getTimeDisplay()}</Text>
            {isCompleted && item.completedAt && (
              <Text style={styles.completedAtText}>
                Completed: {new Date(item.completedAt).toLocaleDateString()}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderStatsView = () => (
    <ScrollView style={styles.statsView} refreshControl={
      <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
    }>
      {notificationStats && (
        <View style={styles.statsContainer}>
          <Text style={styles.statsTitle}>📊 Notification Statistics</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{notificationStats.activeReminders}</Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{completedReminders.length}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{notificationStats.scheduledNotifications}</Text>
              <Text style={styles.statLabel}>Scheduled</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{notificationStats.snoozedNotifications}</Text>
              <Text style={styles.statLabel}>Snoozed</Text>
            </View>
          </View>
          <Text style={styles.compatibilityNote}>
            🤖 Android Compatible: Daily/Weekly reminders use one-time notifications for compatibility
          </Text>
        </View>
      )}

      <View style={styles.categoryStatsContainer}>
        <Text style={styles.statsTitle}>📈 Category Breakdown</Text>
        {Object.entries(categories).map(([name, info]) => {
          const count = reminders.filter(r => r.category === name).length;
          const completedCount = completedReminders.filter(r => r.category === name).length;
          if (count === 0 && completedCount === 0) return null;
          
          return (
            <View key={name} style={styles.categoryStatItem}>
              <Text style={styles.categoryEmoji}>{info.emoji}</Text>
              <Text style={[styles.categoryStatName, { color: info.color }]}>{name}</Text>
              <Text style={styles.categoryStatCount}>Active: {count} | Done: {completedCount}</Text>
            </View>
          );
        })}
      </View>

      <View style={styles.debugContainer}>
        <TouchableOpacity style={styles.debugButton} onPress={showScheduledNotifications}>
          <Text style={styles.debugButtonText}>View Scheduled</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.debugButton} onPress={clearAllNotifications}>
          <Text style={styles.debugButtonText}>Clear All</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.debugContainer}>
        <TouchableOpacity style={styles.testButton} onPress={testImmediateNotification}>
          <Text style={styles.debugButtonText}>🧪 Test Now</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.testButton} onPress={() => testAndroidNotification(1)}>
          <Text style={styles.debugButtonText}>🤖 Android 1min</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.debugContainer}>
        <TouchableOpacity 
          style={styles.testButton} 
          onPress={() => voiceSpeakText('Smart reminders are working perfectly! You can now use voice input and natural language.')}
        >
          <Text style={styles.debugButtonText}>🔊 Test Voice</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.testButton} 
          onPress={() => voiceSpeakText(`You have ${reminders.length} active reminders and ${completedReminders.length} completed tasks.`)}
        >
          <Text style={styles.debugButtonText}>📊 Speak Stats</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.loadingText}>Loading Blink Reminder...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, settings.darkMode && styles.darkContainer]}>
      <StatusBar barStyle={settings.darkMode ? "light-content" : "dark-content"} />
      
      <View style={styles.header}>
        <Text style={[styles.title, settings.darkMode && styles.darkText]}>
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
        style={[styles.searchInput, settings.darkMode && styles.darkInput]}
        placeholder="Search reminders..."
        placeholderTextColor={settings.darkMode ? '#999' : '#666'}
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      {/* Tab Bar */}
      {renderTabBar()}

      {/* Add Reminder Form - only show on active tab */}
      {selectedTab === 'active' && (
        <View style={styles.formContainer}>
          {/* Smart Input Toggle */}
          <View style={styles.inputToggleContainer}>
            <Text style={[styles.inputToggleLabel, settings.darkMode && styles.darkText]}>🧠 Smart Input</Text>
            <Switch
              value={smartInputMode}
              onValueChange={setSmartInputMode}
              trackColor={{ false: '#767577', true: '#007AFF' }}
              thumbColor={smartInputMode ? '#ffffff' : '#f4f3f4'}
            />
          </View>
          
          {/* Smart Input Component */}
          {smartInputMode ? (
            <SmartInput
              onReminderParsed={handleSmartReminderParsed}
              onError={(error) => Alert.alert('Smart Input Error', error)}
              darkMode={settings.darkMode}
              placeholder="Try: 'Remind me to call mom at 7 PM'"
            />
          ) : (
          <View>
          {/* Category Selector */}
          <TouchableOpacity 
            style={[styles.selectorButton, { borderColor: categories[selectedCategory].color }]}
            onPress={() => setShowCategoryModal(true)}
          >
            <Text style={styles.selectorEmoji}>{categories[selectedCategory].emoji}</Text>
            <Text style={[styles.selectorText, { color: categories[selectedCategory].color }]}>
              {selectedCategory}
            </Text>
            <Text style={styles.arrow}>▼</Text>
          </TouchableOpacity>

          {/* Priority Selector */}
          <TouchableOpacity 
            style={[styles.selectorButton, { borderColor: priorities[selectedPriority].color }]}
            onPress={() => setShowPriorityModal(true)}
          >
            <Text style={styles.selectorEmoji}>{priorities[selectedPriority].emoji}</Text>
            <Text style={[styles.selectorText, { color: priorities[selectedPriority].color }]}>
              {priorities[selectedPriority].label}
            </Text>
            <Text style={styles.arrow}>▼</Text>
          </TouchableOpacity>

          {/* Reminder Type Selector */}
          <TouchableOpacity 
            style={[styles.selectorButton, { borderColor: '#FF6B6B' }]}
            onPress={() => setShowReminderTypeModal(true)}
          >
            <Text style={styles.selectorEmoji}>{reminderTypes[reminderType].emoji}</Text>
            <Text style={[styles.selectorText, { color: '#FF6B6B' }]}>
              {reminderTypes[reminderType].label}
            </Text>
            <Text style={styles.arrow}>▼</Text>
          </TouchableOpacity>

          {/* Conditional Time/Schedule Selectors */}
          {reminderType === 'one-time' && (
            <TouchableOpacity 
              style={styles.selectorButton}
              onPress={() => setShowTimeModal(true)}
            >
              <Text style={styles.selectorEmoji}>⏰</Text>
              <Text style={styles.selectorText}>
                {timeOptions.find(t => t.value === selectedTime)?.label}
              </Text>
              <Text style={styles.arrow}>▼</Text>
            </TouchableOpacity>
          )}

          {reminderType === 'daily' && (
            <TouchableOpacity 
              style={styles.selectorButton}
              onPress={() => setShowDailyTimeModal(true)}
            >
              <Text style={styles.selectorEmoji}>🕘</Text>
              <Text style={styles.selectorText}>
                Daily at {String(dailyTime.hour).padStart(2, '0')}:{String(dailyTime.minute).padStart(2, '0')}
              </Text>
              <Text style={styles.arrow}>▼</Text>
            </TouchableOpacity>
          )}

          {reminderType === 'weekly' && (
            <TouchableOpacity 
              style={styles.selectorButton}
              onPress={() => setShowWeeklyTimeModal(true)}
            >
              <Text style={styles.selectorEmoji}>📆</Text>
              <Text style={styles.selectorText}>
                {weekdays.find(w => w.value === weeklyTime.weekday)?.label} at {String(weeklyTime.hour).padStart(2, '0')}:{String(weeklyTime.minute).padStart(2, '0')}
              </Text>
              <Text style={styles.arrow}>▼</Text>
            </TouchableOpacity>
          )}

          {reminderType === 'interval' && (
            <TouchableOpacity 
              style={styles.selectorButton}
              onPress={() => setShowIntervalModal(true)}
            >
              <Text style={styles.selectorEmoji}>🔄</Text>
              <Text style={styles.selectorText}>
                Every {intervalOptions.find(i => i.value === intervalMinutes)?.label || `${intervalMinutes} minutes`}
              </Text>
              <Text style={styles.arrow}>▼</Text>
            </TouchableOpacity>
          )}

          <TextInput
            style={[styles.input, settings.darkMode && styles.darkInput]}
            placeholder="Enter your reminder"
            placeholderTextColor={settings.darkMode ? '#999' : '#666'}
            value={reminder}
            onChangeText={setReminder}
          />
          
          <TextInput
            style={[styles.noteInput, settings.darkMode && styles.darkInput]}
            placeholder="Add a note (optional)"
            placeholderTextColor={settings.darkMode ? '#999' : '#666'}
            value={reminderNote}
            onChangeText={setReminderNote}
            multiline={true}
            numberOfLines={2}
          />
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.addButton} onPress={addReminder}>
              <Text style={styles.addButtonText}>Add Reminder</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.persistentButton} onPress={createPersistentReminder}>
              <Text style={styles.persistentButtonText}>📌 Sticky</Text>
            </TouchableOpacity>
          </View>
          </View>
          )}
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
              <Text style={styles.emptyText}>No active reminders</Text>
              <Text style={styles.emptySubtext}>Add a reminder to get started!</Text>
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
              <Text style={styles.emptyText}>No completed reminders</Text>
              <Text style={styles.emptySubtext}>Complete some reminders to see them here!</Text>
            </View>
          }
        />
      )}

      {selectedTab === 'stats' && renderStatsView()}

      {/* All Modals */}
      
      {/* Settings Modal */}
      <Modal visible={showSettingsModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Settings</Text>
            
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Sound Notifications</Text>
              <Switch
                value={settings.soundEnabled}
                onValueChange={(value) => saveSettings({ ...settings, soundEnabled: value })}
              />
            </View>
            
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Vibration</Text>
              <Switch
                value={settings.vibrationEnabled}
                onValueChange={(value) => saveSettings({ ...settings, vibrationEnabled: value })}
              />
            </View>
            
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Dark Mode</Text>
              <Switch
                value={settings.darkMode}
                onValueChange={(value) => saveSettings({ ...settings, darkMode: value })}
              />
            </View>
            
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Auto Cleanup (30 days)</Text>
              <Switch
                value={settings.autoCleanup}
                onValueChange={(value) => saveSettings({ ...settings, autoCleanup: value })}
              />
            </View>

            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowSettingsModal(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Reminder Modal */}
      <Modal visible={showEditModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Reminder</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Enter your reminder"
              value={reminder}
              onChangeText={setReminder}
            />
            
            <TextInput
              style={styles.noteInput}
              placeholder="Add a note (optional)"
              value={reminderNote}
              onChangeText={setReminderNote}
              multiline={true}
              numberOfLines={2}
            />

            <View style={styles.modalButtonContainer}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowEditModal(false);
                  setEditingReminder(null);
                  setReminder('');
                  setReminderNote('');
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

      {/* Priority Modal */}
      <Modal visible={showPriorityModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Priority</Text>
            {Object.entries(priorities).map(([key, priority]) => (
              <TouchableOpacity
                key={key}
                style={[styles.categoryOption, selectedPriority === key && styles.selectedOption]}
                onPress={() => {
                  setSelectedPriority(key);
                  setShowPriorityModal(false);
                }}
              >
                <Text style={styles.categoryEmoji}>{priority.emoji}</Text>
                <Text style={[styles.categoryOptionText, { color: priority.color }]}>
                  {priority.label}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity 
              style={styles.closeButton}
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
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Reminder Type</Text>
            {Object.entries(reminderTypes).map(([key, info]) => (
              <TouchableOpacity
                key={key}
                style={[styles.reminderTypeOption, reminderType === key && styles.selectedOption]}
                onPress={() => {
                  setReminderType(key);
                  setShowReminderTypeModal(false);
                }}
              >
                <Text style={styles.categoryEmoji}>{info.emoji}</Text>
                <View style={styles.reminderTypeText}>
                  <Text style={styles.reminderTypeLabel}>{info.label}</Text>
                  <Text style={styles.reminderTypeDescription}>{info.description}</Text>
                </View>
              </TouchableOpacity>
            ))}
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowReminderTypeModal(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Daily Time Modal */}
      <Modal visible={showDailyTimeModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Set Daily Time</Text>
            <View style={styles.timePickerContainer}>
              <View style={styles.timePicker}>
                <Text style={styles.timeLabel}>Hour</Text>
                <ScrollView style={styles.timeScrollView} showsVerticalScrollIndicator={false}>
                  {Array.from({length: 24}, (_, i) => (
                    <TouchableOpacity
                      key={i}
                      style={[styles.timeOption, dailyTime.hour === i && styles.selectedTimeOption]}
                      onPress={() => setDailyTime(prev => ({...prev, hour: i}))}
                    >
                      <Text style={[styles.timeOptionText, dailyTime.hour === i && styles.selectedTimeText]}>
                        {String(i).padStart(2, '0')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              <View style={styles.timePicker}>
                <Text style={styles.timeLabel}>Minute</Text>
                <ScrollView style={styles.timeScrollView} showsVerticalScrollIndicator={false}>
                  {Array.from({length: 60}, (_, i) => (
                    <TouchableOpacity
                      key={i}
                      style={[styles.timeOption, dailyTime.minute === i && styles.selectedTimeOption]}
                      onPress={() => setDailyTime(prev => ({...prev, minute: i}))}
                    >
                      <Text style={[styles.timeOptionText, dailyTime.minute === i && styles.selectedTimeText]}>
                        {String(i).padStart(2, '0')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowDailyTimeModal(false)}
            >
              <Text style={styles.closeButtonText}>Set Time</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Weekly Time Modal */}
      <Modal visible={showWeeklyTimeModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Set Weekly Schedule</Text>
            <Text style={styles.subTitle}>Day of Week</Text>
            {weekdays.map((day) => (
              <TouchableOpacity
                key={day.value}
                style={[styles.timeOption, weeklyTime.weekday === day.value && styles.selectedOption]}
                onPress={() => setWeeklyTime(prev => ({...prev, weekday: day.value}))}
              >
                <Text style={styles.timeOptionText}>{day.label}</Text>
              </TouchableOpacity>
            ))}
            <Text style={styles.subTitle}>Time</Text>
            <View style={styles.timePickerContainer}>
              <View style={styles.timePicker}>
                <Text style={styles.timeLabel}>Hour</Text>
                <ScrollView style={styles.timeScrollView} showsVerticalScrollIndicator={false}>
                  {Array.from({length: 24}, (_, i) => (
                    <TouchableOpacity
                      key={i}
                      style={[styles.timeOption, weeklyTime.hour === i && styles.selectedTimeOption]}
                      onPress={() => setWeeklyTime(prev => ({...prev, hour: i}))}
                    >
                      <Text style={[styles.timeOptionText, weeklyTime.hour === i && styles.selectedTimeText]}>
                        {String(i).padStart(2, '0')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              <View style={styles.timePicker}>
                <Text style={styles.timeLabel}>Minute</Text>
                <ScrollView style={styles.timeScrollView} showsVerticalScrollIndicator={false}>
                  {Array.from({length: 60}, (_, i) => (
                    <TouchableOpacity
                      key={i}
                      style={[styles.timeOption, weeklyTime.minute === i && styles.selectedTimeOption]}
                      onPress={() => setWeeklyTime(prev => ({...prev, minute: i}))}
                    >
                      <Text style={[styles.timeOptionText, weeklyTime.minute === i && styles.selectedTimeText]}>
                        {String(i).padStart(2, '0')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setWeeklyTimeModal(false)}
            >
              <Text style={styles.closeButtonText}>Set Schedule</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Interval Modal */}
      <Modal visible={showIntervalModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Interval</Text>
            {intervalOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[styles.timeOption, intervalMinutes === option.value && styles.selectedOption]}
                onPress={() => {
                  setIntervalMinutes(option.value);
                  setShowIntervalModal(false);
                }}
              >
                <Text style={styles.timeOptionText}>{option.label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowIntervalModal(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Category Modal */}
      <Modal visible={showCategoryModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Category</Text>
            {Object.entries(categories).map(([name, info]) => (
              <TouchableOpacity
                key={name}
                style={[styles.categoryOption, selectedCategory === name && styles.selectedOption]}
                onPress={() => {
                  setSelectedCategory(name);
                  setShowCategoryModal(false);
                }}
              >
                <Text style={styles.categoryEmoji}>{info.emoji}</Text>
                <Text style={[styles.categoryOptionText, { color: info.color }]}>{name}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowCategoryModal(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Time Modal */}
      <Modal visible={showTimeModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Time</Text>
            {timeOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[styles.timeOption, selectedTime === option.value && styles.selectedOption]}
                onPress={() => {
                  setSelectedTime(option.value);
                  setShowTimeModal(false);
                }}
              >
                <Text style={styles.timeOptionText}>{option.label}</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa'
  },
  darkContainer: {
    backgroundColor: '#1a1a1a'
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
  title: { 
    fontSize: 24, 
    fontWeight: 'bold',
    color: '#333'
  },
  darkText: {
    color: '#fff'
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
    backgroundColor: 'white',
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e1e5e9'
  },
  darkInput: {
    backgroundColor: '#333',
    borderColor: '#555',
    color: '#fff'
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
  inputToggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e1e5e9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1
  },
  inputToggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#e1e5e9',
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
  noteInput: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#e1e5e9',
    minHeight: 60,
    textAlignVertical: 'top'
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12
  },
  addButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 12,
    flex: 0.7,
    alignItems: 'center'
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600'
  },
  persistentButton: {
    backgroundColor: '#FF6B6B',
    padding: 15,
    borderRadius: 12,
    flex: 0.25,
    alignItems: 'center'
  },
  persistentButtonText: {
    color: 'white',
    fontSize: 14,
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
    borderLeftWidth: 4,
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
    alignItems: 'center',
    marginBottom: 8
  },
  categoryEmoji: {
    fontSize: 16,
    marginRight: 8
  },
  categoryText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  priorityEmoji: {
    fontSize: 14,
    marginRight: 8
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8
  },
  completeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
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
    backgroundColor: '#ff4757',
    alignItems: 'center',
    justifyContent: 'center'
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold'
  },
  reminderText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 6,
    lineHeight: 22
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: '#999'
  },
  noteText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 8,
    lineHeight: 18
  },
  reminderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  timeText: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500'
  },
  completedAtText: {
    fontSize: 11,
    color: '#4CAF50',
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
  statsView: {
    flex: 1,
    paddingHorizontal: 20
  },
  statsContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  compatibilityNote: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic'
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
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
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 10
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF'
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4
  },
  categoryStatsContainer: {
    backgroundColor: 'white',
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
  categoryStatName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 10
  },
  categoryStatCount: {
    fontSize: 12,
    color: '#666'
  },
  debugContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    gap: 10
  },
  debugButton: {
    backgroundColor: '#6c757d',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center'
  },
  testButton: {
    backgroundColor: '#007AFF',
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
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  settingLabel: {
    fontSize: 16,
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
    backgroundColor: '#6c757d'
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
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 5
  },
  selectedOption: {
    backgroundColor: '#e3f2fd'
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
    fontWeight: '500',
    color: '#333'
  },
  reminderTypeDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 2
  },
  timePickerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 20
  },
  timePicker: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 10
  },
  timeLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333'
  },
  timeScrollView: {
    maxHeight: 150,
    borderRadius: 8,
    backgroundColor: '#f5f5f5'
  },
  selectedTimeOption: {
    backgroundColor: '#007AFF'
  },
  selectedTimeText: {
    color: 'white',
    fontWeight: '600'
  },
  subTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 15,
    marginBottom: 10
  }
});