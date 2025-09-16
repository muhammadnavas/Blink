import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { useEffect, useState } from 'react';
import { Alert, Button, FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { scheduleLocalNotification, getAllScheduledNotifications, cancelAllScheduledNotifications } from './services/notifications';

export default function App() {
  const [reminder, setReminder] = useState('');
  const [reminders, setReminders] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('Personal');
  const [selectedTime, setSelectedTime] = useState(5); // seconds
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showTimeModal, setShowTimeModal] = useState(false);

  const categories = {
    'Personal': { color: '#4A90E2', emoji: '👤' },
    'Work': { color: '#F5A623', emoji: '💼' },
    'Health': { color: '#7ED321', emoji: '🏥' },
    'Shopping': { color: '#D0021B', emoji: '🛒' },
    'Exercise': { color: '#9013FE', emoji: '🏃' },
    'Study': { color: '#50E3C2', emoji: '📚' }
  };

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
    loadReminders();
    requestNotificationPermissions();
  }, []);

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
    const newReminder = { 
      id: Date.now().toString(), 
      text: reminder,
      category: selectedCategory,
      time: selectedTime,
      createdAt: new Date().toISOString()
    };
    const newReminders = [...reminders, newReminder];
    await saveReminders(newReminders);
    scheduleNotification(reminder);
    setReminder('');
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

  // Schedule a simple notification in selected time
  const scheduleNotification = async (text) => {
    try {
      console.log(`🔔 Scheduling notification with time: ${selectedTime} seconds`);
      const notificationId = await scheduleLocalNotification('Blink Reminder', text, selectedTime);
      const timeLabel = timeOptions.find(t => t.value === selectedTime)?.label || `${selectedTime} seconds`;
      
      // Calculate the exact time when notification will appear
      const notificationTime = new Date(Date.now() + selectedTime * 1000);
      const timeString = notificationTime.toLocaleTimeString();
      
      Alert.alert(
        'Reminder Set!', 
        `Notification will appear in ${timeLabel} at ${timeString}.\n\nNotification ID: ${notificationId}`
      );
    } catch (error) {
      console.error('Error scheduling notification:', error);
      Alert.alert('Error', `Failed to schedule notification: ${error.message}`);
    }
  };

  // Debug: Show all scheduled notifications
  const showScheduledNotifications = async () => {
    try {
      const scheduled = await getAllScheduledNotifications();
      Alert.alert(
        'Scheduled Notifications',
        scheduled.length === 0 
          ? 'No notifications scheduled' 
          : `${scheduled.length} notifications scheduled:\n\n${scheduled.map(n => 
              `• ${n.content.title}: ${n.content.body}\n  Trigger: ${JSON.stringify(n.trigger)}`
            ).join('\n\n')}`
      );
    } catch (error) {
      Alert.alert('Error', `Failed to get scheduled notifications: ${error.message}`);
    }
  };

  // Debug: Cancel all scheduled notifications
  const clearAllNotifications = async () => {
    try {
      await cancelAllScheduledNotifications();
      Alert.alert('Success', 'All scheduled notifications cleared');
    } catch (error) {
      Alert.alert('Error', `Failed to clear notifications: ${error.message}`);
    }
  };

  const renderReminder = ({ item }) => (
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
          <TouchableOpacity 
            style={styles.deleteButton}
            onPress={() => deleteReminder(item.id)}
          >
            <Text style={styles.deleteButtonText}>✕</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.reminderText}>• {item.text}</Text>
        <Text style={styles.timeText}>
          {timeOptions.find(t => t.value === (item.time || 5))?.label || '5 seconds'}
        </Text>
      </View>
    </TouchableOpacity>
  );

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

      {/* Time Selector */}
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

      <TextInput
        style={styles.input}
        placeholder="Enter your reminder"
        value={reminder}
        onChangeText={setReminder}
      />
      <Button title="Add Reminder" onPress={addReminder} />

      <FlatList
        style={styles.list}
        data={reminders}
        keyExtractor={(item) => item.id}
        renderItem={renderReminder}
        showsVerticalScrollIndicator={false}
      />

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
  }
});
