// Test script to debug 1-hour reminder timing issue
// This will help isolate where the timing gets corrupted

export async function testOneHourReminder() {
  console.log('🔍 === TESTING 1-HOUR REMINDER TIMING ===');
  
  // Test 1: Check time options array
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
  
  const oneHourOption = timeOptions.find(t => t.label === '1 hour');
  console.log('1️⃣ Time option for "1 hour":', oneHourOption);
  
  // Test 2: Test direct scheduleLocalNotification call with 3600 seconds
  console.log('2️⃣ Testing direct scheduleLocalNotification with 3600 seconds');
  try {
    const directId = await scheduleLocalNotification(
      'Direct 1 Hour Test', 
      'This should trigger in exactly 1 hour', 
      3600
    );
    console.log('✅ Direct test scheduled with ID:', directId);
  } catch (error) {
    console.error('❌ Direct test failed:', error);
  }
  
  // Test 3: Simulate the reminder creation process
  console.log('3️⃣ Simulating reminder creation process');
  const mockReminderData = {
    id: 'test-123',
    text: 'Test 1 hour reminder',
    type: 'one-time',
    time: 3600, // 1 hour in seconds
    priority: 'medium',
    smartParsed: false
  };
  
  console.log('Mock reminder data:', mockReminderData);
  
  // Test 4: Check if the scheduleReminderNotification would work correctly
  console.log('4️⃣ Testing scheduleReminderNotification flow');
  const priorities = {
    low: { emoji: '🔵' },
    medium: { emoji: '🟡' },
    high: { emoji: '🔴' },
    urgent: { emoji: '🚨' }
  };
  
  const priorityEmoji = priorities[mockReminderData.priority].emoji;
  console.log('Priority emoji:', priorityEmoji);
  
  try {
    const flowId = await scheduleLocalNotification(
      `${priorityEmoji} Reminder`, 
      mockReminderData.text, 
      mockReminderData.time
    );
    console.log('✅ Flow test scheduled with ID:', flowId);
  } catch (error) {
    console.error('❌ Flow test failed:', error);
  }
  
  // Test 5: Current time for reference
  const now = new Date();
  const oneHourLater = new Date(now.getTime() + 3600 * 1000);
  console.log('5️⃣ Current time:', now.toLocaleString());
  console.log('5️⃣ Expected 1-hour notification time:', oneHourLater.toLocaleString());
  
  console.log('🔍 === END OF 1-HOUR REMINDER TEST ===');
}

// Also export a quick test for immediate execution
export function quickTimeTest() {
  console.log('⚡ Quick time test:');
  console.log('- 3600 seconds =', 3600 / 60, 'minutes =', 3600 / 3600, 'hours');
  console.log('- Current timestamp:', Date.now());
  console.log('- 1 hour from now timestamp:', Date.now() + 3600 * 1000);
}