import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { useEffect, useState } from 'react';
import { Alert, FlatList, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import {
    addNotificationResponseReceivedListener,
    cancelAllReminders,
    cancelAllScheduledNotifications,
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
    testCalendarNotification,
    testImmediateNotification
} from './services/notifications';

export default function App() {
  const [reminder, setReminder] = useState('');
  const [reminders, setReminders] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('Personal');
  const [selectedTime, setSelectedTime] = useState(5); // seconds
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showTimeModal, setShowTimeModal] = useState(false);
  
  // Enhanced notification features
  const [reminderType, setReminderType] = useState('one-time'); // 'one-time', 'daily', 'weekly', 'interval'
  const [showReminderTypeModal, setShowReminderTypeModal] = useState(false);
  const [dailyTime, setDailyTime] = useState({ hour: 9, minute: 0 }); // For daily reminders
  const [weeklyTime, setWeeklyTime] = useState({ weekday: 2, hour: 9, minute: 0 }); // Monday at 9:00
  const [intervalMinutes, setIntervalMinutes] = useState(60); // For custom intervals
  const [showDailyTimeModal, setShowDailyTimeModal] = useState(false);
  const [showWeeklyTimeModal, setShowWeeklyTimeModal] = useState(false);
  const [showIntervalModal, setShowIntervalModal] = useState(false);
  const [notificationStats, setNotificationStats] = useState(null);

  const categories = {
    'Personal': { color: '#4A90E2', emoji: '👤' },
    'Work': { color: '#4A90E2', emoji: '💼' },
    'Health': { color: '#4A90E2', emoji: '🏥' },
    'Shopping': { color: '#4A90E2', emoji: '🛒' },
    'Exercise': { color: '#4A90E2', emoji: '🏃' },
    'Study': { color: '#4A90E2', emoji: '📚' }
  };

  const reminderTypes = {
    'one-time': { label: 'One-Time', emoji: '⏰', description: 'Notify once at a specific time' },
    'daily': { label: 'Daily', emoji: '📅', description: 'Repeat every day at a specific time' },
    'weekly': { label: 'Weekly', emoji: '📆', description: 'Repeat weekly on a specific day' },
    'interval': { label: 'Interval', emoji: '🔄', description: 'Repeat every X minutes/hours' }
  };

  const weekdays = [
    { value: 1, label: 'Sunday' },
    { value: 2, label: 'Monday' },
    { value: 3, label: 'Tuesday' },
    { value: 4, label: 'Wednesday' },
    { value: 5, label: 'Thursday' },
    { value: 6, label: 'Friday' },
    { value: 7, label: 'Saturday' }
  ];

  const intervalOptions = [
    { value: 5, label: '5 minutes' },
    { value: 15, label: '15 minutes' },
    { value: 30, label: '30 minutes' },
    { value: 60, label: '1 hour' },
    { value: 120, label: '2 hours' },
    { value: 240, label: '4 hours' },
    { value: 480, label: '8 hours' },
    { value: 720, label: '12 hours' }
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

  // Initialize the app with notification system
  const initializeApp = async () => {
    await loadReminders();
    await requestNotificationPermissions();
    await initializeNotificationSystem();
    await updateNotificationStats();
    
    // Set up notification response listener
    const subscription = addNotificationResponseReceivedListener(handleNotificationResponse);
    
    // Return cleanup function
    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  };

  // Request notification permissions
  const requestNotificationPermissions = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please enable notifications to receive reminders.');
    }
  };

  // Load reminders from storage
  const loadReminders = async () => {
    const data = await AsyncStorage.getItem('reminders');
    if (data) setReminders(JSON.parse(data));
  };

  // Save reminders to storage
  const saveReminders = async (newReminders) => {
    setReminders(newReminders);
    await AsyncStorage.setItem('reminders', JSON.stringify(newReminders));
  };

  // Add a reminder
  const addReminder = async () => {
    if (reminder.trim() === '') return;
    
    const reminderKey = `reminder_${Date.now()}`;
    const newReminder = { 
      id: Date.now().toString(), 
      text: reminder,
      category: selectedCategory,
      type: reminderType,
      createdAt: new Date().toISOString(),
      reminderKey,
      // Store different timing based on type
      ...(reminderType === 'one-time' && { time: selectedTime }),
      ...(reminderType === 'daily' && { dailyTime }),
      ...(reminderType === 'weekly' && { weeklyTime }),
      ...(reminderType === 'interval' && { intervalMinutes })
    };
    
    const newReminders = [...reminders, newReminder];
    await saveReminders(newReminders);
    
    // Schedule the appropriate notification type
    await scheduleReminderNotification(newReminder);
    setReminder('');
  };

  // Schedule notification based on reminder type
  const scheduleReminderNotification = async (reminderData) => {
    try {
      let notificationId;
      const { text, reminderKey, type } = reminderData;
      
      switch (type) {
        case 'one-time':
          console.log(`🔔 Scheduling one-time notification with time: ${reminderData.time} seconds`);
          notificationId = await scheduleLocalNotification('Blink Reminder', text, reminderData.time);
          const timeLabel = timeOptions.find(t => t.value === reminderData.time)?.label || `${reminderData.time} seconds`;
          const notificationTime = new Date(Date.now() + reminderData.time * 1000);
          const timeString = notificationTime.toLocaleTimeString();
          Alert.alert(
            'Reminder Set!', 
            `One-time notification will appear in ${timeLabel} at ${timeString}.\n\nNotification ID: ${notificationId}`
          );
          break;
          
        case 'daily':
          console.log(`🔔 Scheduling daily reminder at ${reminderData.dailyTime.hour}:${reminderData.dailyTime.minute}`);
          notificationId = await scheduleDailyReminder(
            'Daily Reminder',
            text,
            reminderData.dailyTime.hour,
            reminderData.dailyTime.minute,
            reminderKey
          );
          
          // Calculate next trigger time for display
          const now = new Date();
          const nextDaily = new Date();
          nextDaily.setHours(reminderData.dailyTime.hour, reminderData.dailyTime.minute, 0, 0);
          if (nextDaily <= now) {
            nextDaily.setDate(nextDaily.getDate() + 1);
          }
          
          Alert.alert(
            'Daily Reminder Set!',
            `Notification will appear daily at ${String(reminderData.dailyTime.hour).padStart(2, '0')}:${String(reminderData.dailyTime.minute).padStart(2, '0')}\n\nNext notification: ${nextDaily.toLocaleString()}\n\nNotification ID: ${notificationId}`
          );
          break;
          
        case 'weekly':
          console.log(`🔔 Scheduling weekly reminder on ${reminderData.weeklyTime.weekday} at ${reminderData.weeklyTime.hour}:${reminderData.weeklyTime.minute}`);
          notificationId = await scheduleWeeklyReminder(
            'Weekly Reminder',
            text,
            reminderData.weeklyTime.weekday,
            reminderData.weeklyTime.hour,
            reminderData.weeklyTime.minute,
            reminderKey
          );
          
          // Calculate next trigger time for display
          const weekdayName = weekdays.find(w => w.value === reminderData.weeklyTime.weekday)?.label;
          const currentTime = new Date();
          const nextWeekly = new Date();
          nextWeekly.setHours(reminderData.weeklyTime.hour, reminderData.weeklyTime.minute, 0, 0);
          
          const currentWeekday = currentTime.getDay() + 1;
          let daysUntilTarget = reminderData.weeklyTime.weekday - currentWeekday;
          if (daysUntilTarget < 0 || (daysUntilTarget === 0 && nextWeekly <= currentTime)) {
            daysUntilTarget += 7;
          }
          nextWeekly.setDate(nextWeekly.getDate() + daysUntilTarget);
          
          Alert.alert(
            'Weekly Reminder Set!',
            `Notification will appear every ${weekdayName} at ${String(reminderData.weeklyTime.hour).padStart(2, '0')}:${String(reminderData.weeklyTime.minute).padStart(2, '0')}\n\nNext notification: ${nextWeekly.toLocaleString()}\n\nNotification ID: ${notificationId}`
          );
          break;
          
        case 'interval':
          console.log(`🔔 Scheduling interval reminder every ${reminderData.intervalMinutes} minutes`);
          notificationId = await scheduleCustomIntervalReminder(
            'Interval Reminder',
            text,
            reminderData.intervalMinutes * 60, // Convert to seconds
            reminderKey
          );
          
          const intervalLabel = intervalOptions.find(i => i.value === reminderData.intervalMinutes)?.label || `${reminderData.intervalMinutes} minutes`;
          const nextInterval = new Date(Date.now() + (Math.max(reminderData.intervalMinutes * 60, 60) * 1000));
          
          Alert.alert(
            'Interval Reminder Set!',
            `Notification will repeat every ${intervalLabel}\n\nNext notification: ${nextInterval.toLocaleString()}\n\nNotification ID: ${notificationId}`
          );
          break;
          
        default:
          throw new Error(`Unknown reminder type: ${type}`);
      }
      
      // Update notification stats
      updateNotificationStats();
      
    } catch (error) {
      console.error('Error scheduling notification:', error);
      Alert.alert('Error', `Failed to schedule notification: ${error.message}`);
    }
  };

  // Create persistent notification
  const createPersistentReminder = async () => {
    if (reminder.trim() === '') {
      Alert.alert('Error', 'Please enter a reminder text first');
      return;
    }
    
    try {
      const persistentKey = `persistent_${Date.now()}`;
      const notificationId = await createPersistentNotification(
        'Persistent Reminder',
        reminder,
        persistentKey,
        true // ongoing = true
      );
      
      Alert.alert(
        'Persistent Reminder Created!',
        `Sticky notification created and will remain visible until dismissed.\n\nNotification ID: ${notificationId}`
      );
      
      setReminder('');
      updateNotificationStats();
    } catch (error) {
      console.error('Error creating persistent notification:', error);
      Alert.alert('Error', `Failed to create persistent notification: ${error.message}`);
    }
  };

  // Update notification statistics
  const updateNotificationStats = async () => {
    try {
      const stats = await getNotificationStats();
      setNotificationStats(stats);
    } catch (error) {
      console.error('Error updating notification stats:', error);
    }
  };

  // Delete a reminder
  const deleteReminder = async (id) => {
    Alert.alert(
      'Delete Reminder',
      'Are you sure you want to delete this reminder?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            const newReminders = reminders.filter(item => item.id !== id);
            await saveReminders(newReminders);
          }
        }
      ]
    );
  };

  // Debug: Show all scheduled notifications with enhanced stats
  const showScheduledNotifications = async () => {
    try {
      const scheduled = await getAllScheduledNotifications();
      const activeReminders = await getAllActiveReminders();
      const stats = await getNotificationStats();
      
      const statsText = stats ? 
        `📊 Statistics:\n` +
        `• Active Reminders: ${stats.activeReminders}\n` +
        `• Snoozed Notifications: ${stats.snoozedNotifications}\n` +
        `• Scheduled Notifications: ${stats.scheduledNotifications}\n` +
        `• Daily: ${stats.reminderTypes.daily}, Weekly: ${stats.reminderTypes.weekly}, Interval: ${stats.reminderTypes.interval}\n\n`
        : '';
      
      const reminderText = Object.keys(activeReminders).length > 0 ?
        `🔔 Active Reminders:\n${Object.entries(activeReminders).map(([key, data]) => 
          `• ${data.title}: ${data.type} (${data.active ? 'Active' : 'Inactive'})`
        ).join('\n')}\n\n` : '';
      
      const scheduledText = scheduled.length === 0 
        ? 'No notifications scheduled' 
        : `📅 Scheduled (${scheduled.length}):\n${scheduled.map(n => 
            `• ${n.content.title}: ${n.content.body}\n  Trigger: ${JSON.stringify(n.trigger)}`
          ).join('\n')}`;
          
      Alert.alert(
        'Notification Status',
        statsText + reminderText + scheduledText
      );
    } catch (error) {
      Alert.alert('Error', `Failed to get notification status: ${error.message}`);
    }
  };

  // Debug: Cancel all scheduled notifications and reminders
  const clearAllNotifications = async () => {
    try {
      // Cancel all scheduled notifications
      await cancelAllScheduledNotifications();
      // Cancel all active reminders
      await cancelAllReminders();
      
      // Update stats
      await updateNotificationStats();
      
      Alert.alert('Success', 'All scheduled notifications and reminders cleared');
    } catch (error) {
      Alert.alert('Error', `Failed to clear notifications: ${error.message}`);
    }
  };

  // Debug: Test immediate notification
  const testNotification = async () => {
    try {
      await testImmediateNotification();
      Alert.alert('Test Sent', 'Check if you received the immediate test notification');
    } catch (error) {
      Alert.alert('Error', `Failed to send test notification: ${error.message}`);
    }
  };

  // Debug: Test calendar notification
  const testCalendar = async () => {
    try {
      await testCalendarNotification(1); // 1 minute from now
      Alert.alert('Calendar Test Sent', 'Calendar notification scheduled for 1 minute from now. Check if it arrives at the correct time.');
    } catch (error) {
      Alert.alert('Error', `Failed to send calendar test: ${error.message}`);
    }
  };

  const renderReminder = ({ item }) => {
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

    const getTypeEmoji = () => {
      return reminderTypes[item.type || 'one-time']?.emoji || '⏰';
    };

    return (
      <TouchableOpacity 
        style={[styles.reminderItem, { borderLeftColor: categories[item.category]?.color || '#4A90E2' }]}
        onLongPress={() => deleteReminder(item.id)}
      >
        <View style={styles.reminderContent}>
          <View style={styles.reminderHeader}>
            <Text style={styles.categoryEmoji}>{categories[item.category]?.emoji || '👤'}</Text>
            <Text style={[styles.categoryText, { color: categories[item.category]?.color || '#4A90E2' }]}>
              {item.category || 'Personal'}
            </Text>
            <Text style={styles.typeEmoji}>{getTypeEmoji()}</Text>
            <TouchableOpacity 
              style={styles.deleteButton}
              onPress={() => deleteReminder(item.id)}
            >
              <Text style={styles.deleteButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.reminderText}>• {item.text}</Text>
          <Text style={styles.timeText}>
            {getTimeDisplay()}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Blink Reminder App</Text>

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
        style={styles.input}
        placeholder="Enter your reminder"
        value={reminder}
        onChangeText={setReminder}
      />
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.addButton} onPress={addReminder}>
          <Text style={styles.addButtonText}>Add Reminder</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.persistentButton} onPress={createPersistentReminder}>
          <Text style={styles.persistentButtonText}>📌 Sticky</Text>
        </TouchableOpacity>
      </View>

      {/* Notification Stats Display */}
      {notificationStats && (
        <View style={styles.statsContainer}>
          <Text style={styles.statsTitle}>📊 Notification Stats</Text>
          <View style={styles.statsRow}>
            <Text style={styles.statsText}>Active: {notificationStats.activeReminders}</Text>
            <Text style={styles.statsText}>Snoozed: {notificationStats.snoozedNotifications}</Text>
            <Text style={styles.statsText}>Scheduled: {notificationStats.scheduledNotifications}</Text>
          </View>
        </View>
      )}

      {/* Debug buttons */}
      <View style={styles.debugContainer}>
        <TouchableOpacity style={styles.debugButton} onPress={showScheduledNotifications}>
          <Text style={styles.debugButtonText}>Show Scheduled</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.debugButton} onPress={clearAllNotifications}>
          <Text style={styles.debugButtonText}>Clear All</Text>
        </TouchableOpacity>
      </View>
      
      {/* Test buttons */}
      <View style={styles.debugContainer}>
        <TouchableOpacity style={styles.testButton} onPress={testNotification}>
          <Text style={styles.debugButtonText}>🧪 Test Immediate</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.testButton} onPress={testCalendar}>
          <Text style={styles.debugButtonText}>📅 Test Calendar</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        style={styles.list}
        data={reminders}
        keyExtractor={(item) => item.id}
        renderItem={renderReminder}
        showsVerticalScrollIndicator={false}
      />

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
              onPress={() => setShowWeeklyTimeModal(false)}
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
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#f2f2f2'
  },
  title: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    marginBottom: 20, 
    textAlign: 'center' 
  },
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#ddd'
  },
  selectorEmoji: {
    fontSize: 20,
    marginRight: 10
  },
  selectorText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500'
  },
  arrow: {
    fontSize: 12,
    color: '#666'
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
    backgroundColor: 'white'
  },
  debugContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 10
  },
  debugButton: {
    backgroundColor: '#666',
    padding: 8,
    borderRadius: 5,
    flex: 0.48
  },
  debugButtonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 12
  },
  testButton: {
    backgroundColor: '#007AFF',
    padding: 8,
    borderRadius: 5,
    flex: 0.48
  },
  list: { 
    marginTop: 20 
  },
  reminderItem: {
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  reminderContent: {
    padding: 12
  },
  reminderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5
  },
  categoryEmoji: {
    fontSize: 16,
    marginRight: 8
  },
  typeEmoji: {
    fontSize: 14,
    marginRight: 8,
    opacity: 0.7
  },
  categoryText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase'
  },
  deleteButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ff4444',
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
    marginBottom: 5,
    color: '#333'
  },
  timeText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    minWidth: 280,
    maxHeight: '80%'
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20
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
    marginTop: 10
  },
  closeButtonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600'
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 10
  },
  addButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    flex: 0.7
  },
  addButtonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600'
  },
  persistentButton: {
    backgroundColor: '#FF6B6B',
    padding: 12,
    borderRadius: 8,
    flex: 0.25
  },
  persistentButtonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 14,
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
  },
  statsContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginTop: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  statsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center'
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around'
  },
  statsText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center'
  }
});
