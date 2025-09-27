/**
 * Device Time Utilities
 * Handles device time synchronization and formatting consistently
 */

/**
 * Get current device time with timezone info
 */
export function getDeviceTime() {
  const now = new Date();
  return {
    timestamp: now.getTime(),
    date: now,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    offset: now.getTimezoneOffset(),
    formatted: now.toLocaleString(),
    iso: now.toISOString()
  };
}

/**
 * Get device time info for debugging
 */
export function getDeviceTimeInfo() {
  const deviceTime = getDeviceTime();
  const systemTime = Date.now();
  
  console.log('🕐 DEVICE TIME INFO:');
  console.log(`  Current Time: ${deviceTime.formatted}`);
  console.log(`  Timezone: ${deviceTime.timezone}`);
  console.log(`  UTC Offset: ${deviceTime.offset} minutes`);
  console.log(`  Timestamp: ${deviceTime.timestamp}`);
  console.log(`  System Time: ${systemTime}`);
  console.log(`  Time Diff: ${deviceTime.timestamp - systemTime}ms`);
  
  return deviceTime;
}

/**
 * Format time consistently across the app
 */
export function formatTime(date, options = {}) {
  const defaultOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  };
  
  const formatOptions = { ...defaultOptions, ...options };
  
  try {
    return new Intl.DateTimeFormat('en-GB', formatOptions).format(date);
  } catch (error) {
    console.warn('Time formatting error:', error);
    return date.toLocaleString();
  }
}

/**
 * Calculate time difference accounting for device timezone
 */
export function calculateTimeDelay(targetTime, currentTime = null) {
  const now = currentTime || getDeviceTime().timestamp;
  const target = typeof targetTime === 'number' ? targetTime : targetTime.getTime();
  
  return {
    delayMs: target - now,
    delaySeconds: Math.floor((target - now) / 1000),
    delayMinutes: Math.floor((target - now) / 60000),
    isPast: target < now,
    formatted: {
      current: formatTime(new Date(now)),
      target: formatTime(new Date(target))
    }
  };
}

/**
 * Create a future time with proper device time sync
 */
export function createFutureTime(secondsFromNow) {
  const deviceTime = getDeviceTime();
  const futureTime = new Date(deviceTime.timestamp + (secondsFromNow * 1000));
  
  return {
    timestamp: futureTime.getTime(),
    date: futureTime,
    formatted: formatTime(futureTime),
    delay: calculateTimeDelay(futureTime, deviceTime.timestamp)
  };
}

/**
 * Validate device time is reasonable
 */
export function validateDeviceTime() {
  const deviceTime = getDeviceTime();
  const now = deviceTime.timestamp;
  
  // Check if time is reasonable (not in distant past/future)
  const year2020 = new Date('2020-01-01').getTime();
  const year2030 = new Date('2030-01-01').getTime();
  
  const isValid = now > year2020 && now < year2030;
  
  if (!isValid) {
    console.warn('⚠️ Device time seems incorrect:', deviceTime.formatted);
  }
  
  return {
    isValid,
    deviceTime,
    warning: !isValid ? 'Device time appears to be incorrect' : null
  };
}

/**
 * Sync and log device time for debugging
 */
export function debugDeviceTime(context = '') {
  const validation = validateDeviceTime();
  const timeInfo = getDeviceTimeInfo();
  
  console.log(`\n🕐 === DEVICE TIME DEBUG ${context} ===`);
  console.log(`Valid: ${validation.isValid}`);
  if (validation.warning) {
    console.warn(`Warning: ${validation.warning}`);
  }
  console.log(`=== END DEVICE TIME DEBUG ===\n`);
  
  return timeInfo;
}