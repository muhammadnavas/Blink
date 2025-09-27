// Debug script to test notification timing
// Run this in the console to debug the timing issue

async function debugTiming() {
  console.log('🔍 Testing notification timing...');
  
  // Test 1: Direct scheduleLocalNotification call
  console.log('Test 1: Direct call with 1 hour (3600 seconds)');
  try {
    const id = await scheduleLocalNotification('Test 1 Hour', 'This should trigger in 1 hour', 3600);
    console.log('✅ Direct call scheduled with ID:', id);
  } catch (error) {
    console.error('❌ Direct call failed:', error);
  }
  
  // Test 2: Check what value selectedTime has for 1 hour
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
  console.log('Time option for 1 hour:', oneHourOption);
  
  // Test 3: NLP parsing of "1 hour"
  const parseResult = await parseNaturalLanguage('remind me to test in 1 hour');
  console.log('NLP parse result for "remind me to test in 1 hour":', parseResult.reminder.time);
}

// Call this in the app console
debugTiming();