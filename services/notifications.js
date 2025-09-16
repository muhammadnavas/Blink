import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure how notifications are handled when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/**
 * Register for push notifications and get an Expo push token.
 * Must be called from a development build or production build - NOT Expo Go.
 */
export async function registerForPushNotificationsAsync() {
  let token = '';

  // Check if we're running on a physical device (required for push notifications)
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
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