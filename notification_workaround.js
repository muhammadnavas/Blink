// Emergency timing fix for Blink app
// This implements a workaround for Expo Go notification timing issues

import * as Notifications from 'expo-notifications';

/**
 * Alternative notification scheduling that works around Expo Go timing issues
 * Uses multiple approaches to ensure proper timing
 */
export async function scheduleNotificationWithWorkaround(title, body, seconds = 5) {
  console.log(`🚨 WORKAROUND: Scheduling "${title}" for ${seconds} seconds`);
  
  try {
    // Method 1: Try with explicit date calculation
    const targetDate = new Date();
    targetDate.setSeconds(targetDate.getSeconds() + seconds);
    
    console.log(`🕐 Target time: ${targetDate.toLocaleString()}`);
    console.log(`🕐 Current time: ${new Date().toLocaleString()}`);
    console.log(`🕐 Difference: ${seconds} seconds`);
    
    // Use calendar trigger with explicit date (more reliable in Expo Go)
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: `🔔 ${title}`,
        body,
        data: { 
          scheduledFor: targetDate.toISOString(),
          originalSeconds: seconds,
          workaround: true
        },
      },
      trigger: {
        type: 'calendar',
        date: targetDate,
      },
    });
    
    console.log(`✅ WORKAROUND: Scheduled with ID ${identifier}`);
    return identifier;
    
  } catch (calendarError) {
    console.warn('📅 Calendar trigger failed, trying timeInterval:', calendarError.message);
    
    // Fallback to timeInterval with extra validation
    try {
      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: `⏰ ${title}`,
          body,
          data: { 
            scheduledFor: new Date(Date.now() + seconds * 1000).toISOString(),
            originalSeconds: seconds,
            fallback: true
          },
        },
        trigger: {
          type: 'timeInterval',
          seconds: Math.max(5, seconds), // Minimum 5 seconds
        },
      });
      
      console.log(`✅ FALLBACK: Scheduled with ID ${identifier}`);
      return identifier;
      
    } catch (intervalError) {
      console.error('❌ Both methods failed:', intervalError);
      throw intervalError;
    }
  }
}

/**
 * Test function to verify timing works
 */
export async function testNotificationTiming() {
  console.log('🧪 TESTING NOTIFICATION TIMING...');
  
  const tests = [
    { name: '30 seconds', seconds: 30 },
    { name: '1 minute', seconds: 60 },
    { name: '5 minutes', seconds: 300 },
  ];
  
  for (const test of tests) {
    try {
      console.log(`\n🧪 Testing ${test.name} (${test.seconds}s)...`);
      const id = await scheduleNotificationWithWorkaround(
        `Test ${test.name}`,
        `This should appear in ${test.name}`,
        test.seconds
      );
      console.log(`✅ ${test.name} test scheduled: ${id}`);
    } catch (error) {
      console.error(`❌ ${test.name} test failed:`, error);
    }
  }
  
  console.log('🧪 All tests scheduled. Check if they appear at correct times.');
}