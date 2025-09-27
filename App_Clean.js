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
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import SmartInput from './components/SmartInput';
import { speakText as voiceSpeakText } from './components/VoiceInput';
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

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    setIsLoading(true);
    await requestNotificationPermissions();
    await initializeNotificationSystem();
    await loadReminders();
    await loadCompletedReminders();
    await updateNotificationStats();
    
    // Add notification listeners
    const responseSubscription = addNotificationResponseReceivedListener(handleNotificationResponse);
    const receivedSubscription = Notifications.addNotificationReceivedListener(notification => {
      console.log(`🔔 Notification received: ${notification.request.content.title}`);
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
        timeDescription: smartReminder.timeDescription
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
      reminderKey
    };
    
    const newReminders = [...reminders, newReminder];
    await saveReminders(newReminders);
    
    await scheduleReminderNotification(newReminder);
    
    // Reset form
    setReminder('');
    setIsLoading(false);
  };

  const scheduleReminderNotification = async (reminderData) => {
    try {
      const { text, time } = reminderData;
      
      console.log('🔧 Scheduling notification for:', text, 'in', time, 'seconds');
      
      const notificationId = await scheduleLocalNotification(
        '⏰ Reminder', 
        text, 
        time
      );
      
      await updateNotificationStats();
      Alert.alert('Reminder Set!', `Notification scheduled for ${formatTimeDisplay(time)}`);
      
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
              Alert.alert('Error', `Failed to clear notifications: ${error.message}`);
            }
          }
        }
      ]
    );
  };

  // Helper function to format time display
  const formatTimeDisplay = (timeValue) => {
    const standardOption = timeOptions.find(t => t.value === timeValue);
    if (standardOption) {
      return standardOption.label;
    }
    
    // Format custom time
    if (typeof timeValue === 'number' && timeValue > 0) {
      const hours = Math.floor(timeValue / 3600);
      const minutes = Math.floor((timeValue % 3600) / 60);
      const seconds = timeValue % 60;
      
      if (hours > 0) {
        return `${hours}h ${minutes}m`;
      } else if (minutes > 0) {
        return `${minutes}m`;
      } else {
        return `${seconds}s`;
      }
    }
    
    return '5 minutes';
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
    </View>
  );

  const renderReminder = ({ item }) => {
    const isCompleted = item.completed;
    
    return (
      <TouchableOpacity 
        style={[styles.reminderItem, { opacity: isCompleted ? 0.7 : 1 }]}
        onPress={() => isCompleted ? null : editReminder(item)}
        onLongPress={() => deleteReminder(item.id, isCompleted)}
      >
        <View style={styles.reminderContent}>
          <View style={styles.reminderHeader}>
            <Text style={styles.reminderText}>
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
            <Text style={styles.timeText}>
              {item.timeDescription || formatTimeDisplay(item.time)}
            </Text>
            {isCompleted && item.completedAt && (
              <Text style={styles.completedAtText}>
                Completed: {new Date(item.completedAt).toLocaleDateString()}
              </Text>
            )}
            {item.smartParsed && (
              <Text style={styles.smartBadge}>🧠 Smart</Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.loadingText}>Loading Blink Reminder...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.header}>
        <Text style={styles.title}>Blink Reminder</Text>
        {notificationStats && (
          <Text style={styles.statsText}>
            {notificationStats.activeReminders} active
          </Text>
        )}
      </View>

      {/* Search Bar */}
      <TextInput
        style={styles.searchInput}
        placeholder="Search reminders..."
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      {/* Tab Bar */}
      {renderTabBar()}

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
            style={styles.input}
            placeholder="Enter reminder manually"
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

      {/* Debug/Test Section at bottom */}
      <View style={styles.debugContainer}>
        <TouchableOpacity style={styles.debugButton} onPress={testImmediateNotification}>
          <Text style={styles.debugButtonText}>Test Now</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.debugButton} onPress={clearAllNotifications}>
          <Text style={styles.debugButtonText}>Clear All</Text>
        </TouchableOpacity>
      </View>

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
  statsText: {
    fontSize: 14,
    color: '#666',
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
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
    backgroundColor: '#4CAF50',
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
    color: '#4CAF50',
    fontWeight: '500'
  },
  smartBadge: {
    fontSize: 10,
    color: '#007AFF',
    backgroundColor: '#e3f2fd',
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
    backgroundColor: '#6c757d',
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
  timeOption: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 5
  },
  selectedOption: {
    backgroundColor: '#e3f2fd'
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
  }
});