import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Storage keys for notification tracking
const STORAGE_KEYS = {
  SCHEDULED_REMINDERS: 'scheduled_reminders',
  SNOOZED_NOTIFICATIONS: 'snoozed_notifications',
};

// Configure how notifications are handled when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

// Set up notification categories with actions
export async function setupNotificationCategories() {
  try {
    // Reminder category with snooze and dismiss actions
    await Notifications.setNotificationCategoryAsync('reminder', [
      {
        identifier: 'snooze_5',
        buttonTitle: 'Snooze 5min',
        options: {
          opensAppToForeground: false,
        },
      },
      {
        identifier: 'snooze_15',
        buttonTitle: 'Snooze 15min',
        options: {
          opensAppToForeground: false,
        },
      },
      {
        identifier: 'dismiss',
        buttonTitle: 'Dismiss',
        options: {
          opensAppToForeground: false,
        },
      },
    ]);

    // Persistent category with limited actions
    await Notifications.setNotificationCategoryAsync('persistent', [
      {
        identifier: 'dismiss_persistent',
        buttonTitle: 'Dismiss',
        options: {
          opensAppToForeground: false,
        },
      },
    ]);

    console.log('✅ Notification categories set up successfully');
  } catch (error) {
    console.error('❌ Error setting up notification categories:', error);
  }
}

/**
 * Register for push notifications and get an Expo push token.
 * Must be called from a development build or production build - NOT Expo Go.
 */
export async function registerForPushNotificationsAsync() {
  let token = '';

  // Check if we're running on a physical device (required for push notifications)
  if (Platform.OS === 'android') {
    // Default channel
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });

    // Persistent notifications channel
    await Notifications.setNotificationChannelAsync('persistent', {
      name: 'Persistent Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
      showBadge: true,
      enableLights: true,
      enableVibration: true,
    });

    // Reminder notifications channel
    await Notifications.setNotificationChannelAsync('reminder', {
      name: 'Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
      showBadge: true,
      enableLights: true,
      enableVibration: true,
    });
  }

  // Request permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') {
    throw new Error('Failed to get push token for push notification!');
  }

  // Get the token that uniquely identifies this device
  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: 'your-project-id', // Replace with your actual Expo project ID
    });
    token = tokenData.data;
    console.log('📱 Expo Push Token:', token);
  } catch (error) {
    console.error('❌ Error getting push token:', error);
    throw error;
  }

  return token;
}

/**
 * Schedule a local notification (works in Expo Go and dev builds)
 */
export async function scheduleLocalNotification(title, body, seconds = 5) {
  try {
    console.log(`📅 Scheduling notification "${title}" for ${seconds} seconds from now`);
    
    // First, let's try the simpler format that works in Expo Go
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { timestamp: Date.now() },
      },
      trigger: { seconds },
    });
    
    console.log(`✅ Notification scheduled with ID: ${identifier}`);
    return identifier;
  } catch (error) {
    console.error('❌ Error scheduling notification:', error);
    // Try alternative format if first fails
    try {
      console.log('🔄 Trying alternative trigger format...');
      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: { timestamp: Date.now() },
        },
        trigger: {
          type: 'timeInterval',
          seconds: seconds,
        },
      });
      console.log(`✅ Alternative format worked. ID: ${identifier}`);
      return identifier;
    } catch (altError) {
      console.error('❌ Alternative format also failed:', altError);
      throw error;
    }
  }
}

/**
 * Send a push notification using Expo's push service
 * You would typically call this from your backend server
 */
export async function sendPushNotification(expoPushToken, title, body) {
  const message = {
    to: expoPushToken,
    sound: 'default',
    title,
    body,
    data: { withSome: 'data' },
  };

  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });

  const result = await response.json();
  console.log('Push notification result:', result);
  return result;
}

/**
 * Listen for notifications received while the app is in the foreground
 */
export function addNotificationReceivedListener(listener) {
  return Notifications.addNotificationReceivedListener(listener);
}

/**
 * Listen for notification interactions (user taps notification)
 */
export function addNotificationResponseReceivedListener(listener) {
  return Notifications.addNotificationResponseReceivedListener(listener);
}

/**
 * Get all scheduled notifications (for debugging)
 */
export async function getAllScheduledNotifications() {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    console.log('📋 All scheduled notifications:', scheduled);
    console.log('📋 Number of scheduled notifications:', scheduled.length);
    return scheduled;
  } catch (error) {
    console.error('❌ Error getting scheduled notifications:', error);
    throw error;
  }
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllScheduledNotifications() {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('🗑️ All scheduled notifications cancelled');
    return true;
  } catch (error) {
    console.error('❌ Error cancelling notifications:', error);
    throw error;
  }
}

/**
 * Test immediate notification (for debugging)
 */
export async function testImmediateNotification() {
  try {
    console.log('🧪 Testing immediate notification...');
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Test Notification',
        body: 'This is a test notification sent immediately',
        data: { test: true },
        categoryIdentifier: 'reminder',
      },
      trigger: null, // Immediate notification
    });
    console.log(`✅ Immediate notification sent with ID: ${identifier}`);
    return identifier;
  } catch (error) {
    console.error('❌ Error sending immediate notification:', error);
    throw error;
  }
}

/**
 * Test calendar notification (for debugging daily/weekly issues)
 */
export async function testCalendarNotification(delayMinutes = 1) {
  try {
    console.log(`🧪 Testing calendar notification ${delayMinutes} minute(s) from now...`);
    
    const now = new Date();
    const targetTime = new Date(now.getTime() + delayMinutes * 60000);
    
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Calendar Test',
        body: `This notification was scheduled for ${targetTime.toLocaleTimeString()}`,
        data: { test: true, scheduledFor: targetTime.getTime() },
        categoryIdentifier: 'reminder',
      },
      trigger: {
        type: 'calendar',
        hour: targetTime.getHours(),
        minute: targetTime.getMinutes(),
        repeats: false,
      },
    });
    
    console.log(`✅ Calendar test notification scheduled with ID: ${identifier} for ${targetTime.toLocaleString()}`);
    return identifier;
  } catch (error) {
    console.error('❌ Error sending calendar test notification:', error);
    throw error;
  }
}

// ===== REPEAT REMINDER FUNCTIONS =====

/**
 * Schedule a daily reminder at a specific time
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {number} hour - Hour (0-23)
 * @param {number} minute - Minute (0-59)
 * @param {string} reminderKey - Unique key for this reminder
 */
export async function scheduleDailyReminder(title, body, hour, minute, reminderKey) {
  try {
    console.log(`📅 Scheduling daily reminder "${title}" at ${hour}:${minute}`);
    
    // Calculate next occurrence of this time
    const now = new Date();
    const targetTime = new Date();
    targetTime.setHours(hour, minute, 0, 0);
    
    // If the time has already passed today, schedule for tomorrow
    if (targetTime <= now) {
      targetTime.setDate(targetTime.getDate() + 1);
    }
    
    // Use calendar trigger with specific date for first occurrence, then repeat
    const trigger = {
      type: 'calendar',
      repeats: true,
      hour,
      minute,
      // Ensure we don't trigger immediately
      date: targetTime,
    };

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { 
          reminderKey,
          type: 'daily',
          hour,
          minute,
          originalTime: Date.now(),
          nextTrigger: targetTime.getTime()
        },
        categoryIdentifier: 'reminder',
      },
      trigger,
    });

    // Store reminder info for management
    await storeReminderInfo(reminderKey, {
      identifier,
      type: 'daily',
      title,
      body,
      hour,
      minute,
      active: true,
      createdAt: Date.now(),
      nextTrigger: targetTime.getTime(),
    });

    console.log(`✅ Daily reminder scheduled with ID: ${identifier}, next trigger: ${targetTime.toLocaleString()}`);
    return identifier;
  } catch (error) {
    console.error('❌ Error scheduling daily reminder:', error);
    throw error;
  }
}

/**
 * Schedule a weekly reminder on specific days at a specific time
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {number} weekday - Day of week (1=Sunday, 2=Monday, etc.)
 * @param {number} hour - Hour (0-23)
 * @param {number} minute - Minute (0-59)
 * @param {string} reminderKey - Unique key for this reminder
 */
export async function scheduleWeeklyReminder(title, body, weekday, hour, minute, reminderKey) {
  try {
    console.log(`📅 Scheduling weekly reminder "${title}" on weekday ${weekday} at ${hour}:${minute}`);
    
    // Calculate next occurrence of this weekday and time
    const now = new Date();
    const targetTime = new Date();
    
    // Set to the desired time
    targetTime.setHours(hour, minute, 0, 0);
    
    // Calculate days until the target weekday
    const currentWeekday = now.getDay() + 1; // Convert to 1-7 format (1=Sunday)
    let daysUntilTarget = weekday - currentWeekday;
    
    // If target day is today but time has passed, or target day is in the past, add a week
    if (daysUntilTarget < 0 || (daysUntilTarget === 0 && targetTime <= now)) {
      daysUntilTarget += 7;
    }
    
    targetTime.setDate(targetTime.getDate() + daysUntilTarget);
    
    const trigger = {
      type: 'calendar',
      repeats: true,
      weekday,
      hour,
      minute,
      // Set initial date to prevent immediate trigger
      date: targetTime,
    };

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { 
          reminderKey,
          type: 'weekly',
          weekday,
          hour,
          minute,
          originalTime: Date.now(),
          nextTrigger: targetTime.getTime()
        },
        categoryIdentifier: 'reminder',
      },
      trigger,
    });

    await storeReminderInfo(reminderKey, {
      identifier,
      type: 'weekly',
      title,
      body,
      weekday,
      hour,
      minute,
      active: true,
      createdAt: Date.now(),
      nextTrigger: targetTime.getTime(),
    });

    console.log(`✅ Weekly reminder scheduled with ID: ${identifier}, next trigger: ${targetTime.toLocaleString()}`);
    return identifier;
  } catch (error) {
    console.error('❌ Error scheduling weekly reminder:', error);
    throw error;
  }
}

/**
 * Schedule a custom interval reminder (every N seconds/minutes/hours)
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {number} intervalSeconds - Interval in seconds
 * @param {string} reminderKey - Unique key for this reminder
 */
export async function scheduleCustomIntervalReminder(title, body, intervalSeconds, reminderKey) {
  try {
    console.log(`📅 Scheduling custom interval reminder "${title}" every ${intervalSeconds} seconds`);
    
    // Ensure minimum interval of 60 seconds to prevent immediate triggers
    const safeInterval = Math.max(intervalSeconds, 60);
    
    const trigger = {
      type: 'timeInterval',
      seconds: safeInterval,
      repeats: true,
    };

    const nextTrigger = Date.now() + (safeInterval * 1000);

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { 
          reminderKey,
          type: 'interval',
          intervalSeconds: safeInterval,
          originalTime: Date.now(),
          nextTrigger
        },
        categoryIdentifier: 'reminder',
      },
      trigger,
    });

    await storeReminderInfo(reminderKey, {
      identifier,
      type: 'interval',
      title,
      body,
      intervalSeconds: safeInterval,
      active: true,
      createdAt: Date.now(),
      nextTrigger,
    });

    console.log(`✅ Custom interval reminder scheduled with ID: ${identifier}, next trigger: ${new Date(nextTrigger).toLocaleString()}`);
    return identifier;
  } catch (error) {
    console.error('❌ Error scheduling custom interval reminder:', error);
    throw error;
  }
}

// ===== PERSISTENT NOTIFICATION FUNCTIONS =====

/**
 * Create a persistent notification (sticky, like Android alarms)
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {string} persistentKey - Unique key for this persistent notification
 * @param {boolean} ongoing - Whether the notification should be ongoing (non-dismissible)
 */
export async function createPersistentNotification(title, body, persistentKey, ongoing = true) {
  try {
    console.log(`📌 Creating persistent notification "${title}"`);
    
    const content = {
      title,
      body,
      data: { 
        persistentKey,
        type: 'persistent',
        createdAt: Date.now()
      },
      categoryIdentifier: 'persistent',
      sticky: true,
    };

    // For Android, set specific properties for persistent notifications
    if (Platform.OS === 'android') {
      content.android = {
        channelId: 'persistent',
        importance: Notifications.AndroidImportance.HIGH,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        autoCancel: !ongoing,
        ongoing: ongoing,
        showWhen: true,
        when: Date.now(),
      };
    }

    const identifier = await Notifications.scheduleNotificationAsync({
      content,
      trigger: null, // Immediate notification
    });

    console.log(`✅ Persistent notification created with ID: ${identifier}`);
    return identifier;
  } catch (error) {
    console.error('❌ Error creating persistent notification:', error);
    throw error;
  }
}

/**
 * Update an existing persistent notification
 * @param {string} persistentKey - Key of the persistent notification to update
 * @param {string} newTitle - New title
 * @param {string} newBody - New body
 */
export async function updatePersistentNotification(persistentKey, newTitle, newBody) {
  try {
    console.log(`🔄 Updating persistent notification "${persistentKey}"`);
    
    // Cancel the old notification
    await cancelNotificationByKey(persistentKey);
    
    // Create a new one with updated content
    return await createPersistentNotification(newTitle, newBody, persistentKey);
  } catch (error) {
    console.error('❌ Error updating persistent notification:', error);
    throw error;
  }
}

// ===== SNOOZE & DISMISS FUNCTIONS =====

/**
 * Snooze a notification for a specified number of minutes
 * @param {string} notificationKey - Key of the notification to snooze
 * @param {number} minutes - Minutes to snooze for
 * @param {object} originalNotification - Original notification data
 */
export async function snoozeNotification(notificationKey, minutes, originalNotification) {
  try {
    console.log(`😴 Snoozing notification "${notificationKey}" for ${minutes} minutes`);
    
    const snoozeData = {
      originalKey: notificationKey,
      snoozedAt: Date.now(),
      snoozeMinutes: minutes,
      wakeUpTime: Date.now() + (minutes * 60 * 1000),
      originalNotification,
    };

    // Store snooze info
    await storeSnoozedNotification(notificationKey, snoozeData);

    // Schedule the snoozed notification
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: `⏰ ${originalNotification.title || 'Reminder'}`,
        body: originalNotification.body || 'Snoozed reminder',
        data: { 
          ...originalNotification.data,
          snoozed: true,
          originalKey: notificationKey,
          snoozeCount: (originalNotification.data?.snoozeCount || 0) + 1
        },
        categoryIdentifier: 'reminder',
      },
      trigger: { seconds: minutes * 60 },
    });

    console.log(`✅ Notification snoozed with new ID: ${identifier}`);
    return identifier;
  } catch (error) {
    console.error('❌ Error snoozing notification:', error);
    throw error;
  }
}

/**
 * Dismiss a notification permanently
 * @param {string} notificationKey - Key of the notification to dismiss
 */
export async function dismissNotification(notificationKey) {
  try {
    console.log(`🗑️ Dismissing notification "${notificationKey}"`);
    
    // Cancel the notification
    await cancelNotificationByKey(notificationKey);
    
    // Remove from snooze storage if it exists
    await removeSnoozedNotification(notificationKey);
    
    console.log(`✅ Notification "${notificationKey}" dismissed`);
    return true;
  } catch (error) {
    console.error('❌ Error dismissing notification:', error);
    throw error;
  }
}

/**
 * Handle notification response (when user taps action buttons)
 * @param {object} response - Notification response object
 */
export async function handleNotificationResponse(response) {
  try {
    const { actionIdentifier, notification } = response;
    const notificationData = notification.request.content.data;
    const notificationKey = notificationData.reminderKey || notificationData.persistentKey;
    
    console.log(`📱 Handling notification response: ${actionIdentifier} for key: ${notificationKey}`);

    switch (actionIdentifier) {
      case 'snooze_5':
        await snoozeNotification(notificationKey, 5, notification.request.content);
        break;
      
      case 'snooze_15':
        await snoozeNotification(notificationKey, 15, notification.request.content);
        break;
      
      case 'dismiss':
      case 'dismiss_persistent':
        await dismissNotification(notificationKey);
        break;
      
      default:
        console.log(`🤷 Unknown action identifier: ${actionIdentifier}`);
        break;
    }

    return true;
  } catch (error) {
    console.error('❌ Error handling notification response:', error);
    throw error;
  }
}

// ===== STORAGE & TRACKING FUNCTIONS =====

/**
 * Store reminder information for tracking and management
 * @param {string} reminderKey - Unique key for the reminder
 * @param {object} reminderData - Reminder data to store
 */
async function storeReminderInfo(reminderKey, reminderData) {
  try {
    const existingReminders = await getStoredReminders();
    existingReminders[reminderKey] = reminderData;
    await AsyncStorage.setItem(STORAGE_KEYS.SCHEDULED_REMINDERS, JSON.stringify(existingReminders));
    console.log(`💾 Stored reminder info for key: ${reminderKey}`);
  } catch (error) {
    console.error('❌ Error storing reminder info:', error);
  }
}

/**
 * Get all stored reminders
 */
async function getStoredReminders() {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.SCHEDULED_REMINDERS);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('❌ Error getting stored reminders:', error);
    return {};
  }
}

/**
 * Store snoozed notification information
 * @param {string} notificationKey - Key of the snoozed notification
 * @param {object} snoozeData - Snooze data to store
 */
async function storeSnoozedNotification(notificationKey, snoozeData) {
  try {
    const existingSnoozed = await getSnoozedNotifications();
    existingSnoozed[notificationKey] = snoozeData;
    await AsyncStorage.setItem(STORAGE_KEYS.SNOOZED_NOTIFICATIONS, JSON.stringify(existingSnoozed));
    console.log(`💾 Stored snoozed notification for key: ${notificationKey}`);
  } catch (error) {
    console.error('❌ Error storing snoozed notification:', error);
  }
}

/**
 * Get all snoozed notifications
 */
async function getSnoozedNotifications() {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.SNOOZED_NOTIFICATIONS);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('❌ Error getting snoozed notifications:', error);
    return {};
  }
}

/**
 * Remove a snoozed notification from storage
 * @param {string} notificationKey - Key of the notification to remove
 */
async function removeSnoozedNotification(notificationKey) {
  try {
    const existingSnoozed = await getSnoozedNotifications();
    delete existingSnoozed[notificationKey];
    await AsyncStorage.setItem(STORAGE_KEYS.SNOOZED_NOTIFICATIONS, JSON.stringify(existingSnoozed));
    console.log(`🗑️ Removed snoozed notification for key: ${notificationKey}`);
  } catch (error) {
    console.error('❌ Error removing snoozed notification:', error);
  }
}

/**
 * Get reminder info by key
 * @param {string} reminderKey - Key of the reminder to get
 */
export async function getReminderInfo(reminderKey) {
  try {
    const reminders = await getStoredReminders();
    return reminders[reminderKey] || null;
  } catch (error) {
    console.error('❌ Error getting reminder info:', error);
    return null;
  }
}

/**
 * Get all active reminders
 */
export async function getAllActiveReminders() {
  try {
    const reminders = await getStoredReminders();
    const activeReminders = Object.entries(reminders)
      .filter(([key, data]) => data.active)
      .reduce((acc, [key, data]) => {
        acc[key] = data;
        return acc;
      }, {});
    
    console.log(`📋 Found ${Object.keys(activeReminders).length} active reminders`);
    return activeReminders;
  } catch (error) {
    console.error('❌ Error getting active reminders:', error);
    return {};
  }
}

// ===== MANAGEMENT HELPER FUNCTIONS =====

/**
 * Cancel a notification by its reminder/persistent key
 * @param {string} notificationKey - Key of the notification to cancel
 */
async function cancelNotificationByKey(notificationKey) {
  try {
    const reminderInfo = await getReminderInfo(notificationKey);
    if (reminderInfo && reminderInfo.identifier) {
      await Notifications.cancelScheduledNotificationAsync(reminderInfo.identifier);
      console.log(`🗑️ Cancelled notification with identifier: ${reminderInfo.identifier}`);
      
      // Mark as inactive in storage
      const reminders = await getStoredReminders();
      if (reminders[notificationKey]) {
        reminders[notificationKey].active = false;
        reminders[notificationKey].cancelledAt = Date.now();
        await AsyncStorage.setItem(STORAGE_KEYS.SCHEDULED_REMINDERS, JSON.stringify(reminders));
      }
    }
  } catch (error) {
    console.error('❌ Error canceling notification by key:', error);
  }
}

/**
 * Cancel a reminder by key
 * @param {string} reminderKey - Key of the reminder to cancel
 */
export async function cancelReminder(reminderKey) {
  try {
    console.log(`🗑️ Cancelling reminder: ${reminderKey}`);
    await cancelNotificationByKey(reminderKey);
    console.log(`✅ Reminder "${reminderKey}" cancelled`);
    return true;
  } catch (error) {
    console.error('❌ Error cancelling reminder:', error);
    throw error;
  }
}

/**
 * Cancel all active reminders
 */
export async function cancelAllReminders() {
  try {
    console.log('🗑️ Cancelling all active reminders...');
    const activeReminders = await getAllActiveReminders();
    
    for (const reminderKey in activeReminders) {
      await cancelReminder(reminderKey);
    }
    
    console.log(`✅ Cancelled ${Object.keys(activeReminders).length} reminders`);
    return true;
  } catch (error) {
    console.error('❌ Error cancelling all reminders:', error);
    throw error;
  }
}

/**
 * Clean up expired snoozed notifications
 */
export async function cleanupExpiredSnoozed() {
  try {
    console.log('🧹 Cleaning up expired snoozed notifications...');
    const snoozed = await getSnoozedNotifications();
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [key, data] of Object.entries(snoozed)) {
      if (now > data.wakeUpTime + (24 * 60 * 60 * 1000)) { // Older than 24 hours past wake time
        await removeSnoozedNotification(key);
        cleanedCount++;
      }
    }
    
    console.log(`✅ Cleaned up ${cleanedCount} expired snoozed notifications`);
    return cleanedCount;
  } catch (error) {
    console.error('❌ Error cleaning up expired snoozed notifications:', error);
    return 0;
  }
}

/**
 * Get notification statistics
 */
export async function getNotificationStats() {
  try {
    const activeReminders = await getAllActiveReminders();
    const snoozedNotifications = await getSnoozedNotifications();
    const scheduledNotifications = await getAllScheduledNotifications();
    
    const stats = {
      activeReminders: Object.keys(activeReminders).length,
      snoozedNotifications: Object.keys(snoozedNotifications).length,
      scheduledNotifications: scheduledNotifications.length,
      reminderTypes: {
        daily: Object.values(activeReminders).filter(r => r.type === 'daily').length,
        weekly: Object.values(activeReminders).filter(r => r.type === 'weekly').length,
        interval: Object.values(activeReminders).filter(r => r.type === 'interval').length,
      }
    };
    
    console.log('📊 Notification Statistics:', stats);
    return stats;
  } catch (error) {
    console.error('❌ Error getting notification stats:', error);
    return null;
  }
}

/**
 * Initialize notification system (call this when app starts)
 */
export async function initializeNotificationSystem() {
  try {
    console.log('🚀 Initializing notification system...');
    
    // Set up notification categories
    await setupNotificationCategories();
    
    // Clean up expired snoozed notifications
    await cleanupExpiredSnoozed();
    
    // Log current stats
    await getNotificationStats();
    
    console.log('✅ Notification system initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Error initializing notification system:', error);
    return false;
  }
}