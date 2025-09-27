# 📁 Data Storage Architecture - Blink Reminder App

## 🏗️ Storage Overview

Your Blink reminder app uses **React Native AsyncStorage** for all local data persistence. AsyncStorage is a simple, asynchronous, encrypted key-value storage system that stores data locally on the device.

## 📊 Storage Structure

### **Location**: Device Local Storage
- **Platform**: Cross-platform (iOS, Android, Web)
- **Type**: Key-Value pairs stored as JSON strings
- **Encryption**: Automatically encrypted by the platform
- **Persistence**: Data survives app restarts and updates

---

## 🗃️ Storage Keys & Data Types

### 1. **Main Reminder Data**
```javascript
Key: 'reminders'
Location: App.js lines 188, 207
Data Type: Array of reminder objects
```

**Structure:**
```json
[
  {
    "id": "1695825600000",
    "text": "Call mom",
    "note": "Don't forget to ask about dinner plans",
    "category": "Personal",
    "priority": "medium",
    "type": "one-time",
    "completed": false,
    "createdAt": "2025-09-27T10:00:00.000Z",
    "reminderKey": "reminder_1695825600000",
    "smartParsed": true,
    "confidence": 85,
    "time": 1800,
    "scheduledDate": "2025-09-27T19:00:00.000Z"
  }
]
```

### 2. **Completed Reminders**
```javascript
Key: 'completed_reminders'
Location: App.js lines 197, 216
Data Type: Array of completed reminder objects
```

**Structure:**
```json
[
  {
    "id": "1695825600001",
    "text": "Buy groceries",
    "category": "Shopping",
    "completed": true,
    "completedAt": "2025-09-27T15:30:00.000Z",
    "createdAt": "2025-09-27T09:00:00.000Z"
  }
]
```

### 3. **App Settings**
```javascript
Key: 'app_settings'
Location: App.js lines 161, 173
Data Type: Settings object
```

**Structure:**
```json
{
  "soundEnabled": true,
  "vibrationEnabled": true,
  "darkMode": false,
  "autoCleanup": true,
  "showCompletedCount": true
}
```

### 4. **Scheduled Reminders Metadata**
```javascript
Key: 'scheduled_reminders'
Location: services/notifications.js line 798, 810
Data Type: Object with reminder keys as properties
```

**Structure:**
```json
{
  "reminder_1695825600000": {
    "identifier": "notification_uuid_123",
    "repeatingIdentifier": "notification_uuid_456",
    "type": "daily",
    "title": "Daily Exercise",
    "body": "Time for your workout",
    "hour": 8,
    "minute": 0,
    "active": true,
    "createdAt": 1695825600000,
    "nextTrigger": 1695912000000
  }
}
```

### 5. **Snoozed Notifications**
```javascript
Key: 'snoozed_notifications'
Location: services/notifications.js lines 827, 839, 855
Data Type: Object with notification keys as properties
```

**Structure:**
```json
{
  "reminder_1695825600000": {
    "originalKey": "reminder_1695825600000",
    "snoozedAt": 1695825600000,
    "snoozeMinutes": 15,
    "wakeUpTime": 1695826500000,
    "originalNotification": {
      "title": "Reminder",
      "body": "Call mom"
    }
  }
}
```

---

## 🔧 Storage Operations

### **Read Operations**
```javascript
// Load reminders
const data = await AsyncStorage.getItem('reminders');
const reminders = data ? JSON.parse(data) : [];

// Load settings
const savedSettings = await AsyncStorage.getItem('app_settings');
const settings = savedSettings ? JSON.parse(savedSettings) : defaultSettings;
```

### **Write Operations**
```javascript
// Save reminders
await AsyncStorage.setItem('reminders', JSON.stringify(newReminders));

// Save settings
await AsyncStorage.setItem('app_settings', JSON.stringify(newSettings));
```

### **Update Operations**
```javascript
// Update existing data
const existingData = await AsyncStorage.getItem('reminders');
const reminders = existingData ? JSON.parse(existingData) : [];
reminders.push(newReminder);
await AsyncStorage.setItem('reminders', JSON.stringify(reminders));
```

---

## 📱 Platform Storage Locations

### **iOS**
```
Path: ~/Library/Developer/CoreSimulator/Devices/[DEVICE_ID]/data/Containers/Data/Application/[APP_ID]/Documents/RCTAsyncLocalStorage_V1/
Format: Individual files per key
```

### **Android**
```
Path: /data/data/[PACKAGE_NAME]/databases/RKStorage
Format: SQLite database
```

### **Web**
```
Location: Browser LocalStorage
Format: localStorage API
```

---

## 🔄 Data Flow

### **App Startup**
1. `initializeApp()` loads all stored data
2. `loadReminders()` → AsyncStorage('reminders')
3. `loadCompletedReminders()` → AsyncStorage('completed_reminders')  
4. `loadSettings()` → AsyncStorage('app_settings')
5. Notification system loads → AsyncStorage('scheduled_reminders')

### **Creating New Reminder**
1. User input → Smart parsing (in-memory)
2. Create reminder object → `saveReminders()`
3. Schedule notification → Store in 'scheduled_reminders'
4. Update UI state

### **Completing Reminder**
1. Move from 'reminders' to 'completed_reminders'
2. Cancel notification → Update 'scheduled_reminders'
3. Update UI state

---

## 💾 Storage Capacity & Limits

### **AsyncStorage Limits**
- **iOS**: ~6MB typical limit (varies by device)
- **Android**: ~6MB typical limit (varies by device)  
- **Web**: ~5-10MB (browser dependent)

### **Estimated Usage**
- **Single reminder**: ~500 bytes
- **1000 reminders**: ~500KB
- **Settings**: ~200 bytes
- **Notification metadata**: ~300 bytes per reminder

**Total for heavy usage**: ~1-2MB (well within limits)

---

## 🔐 Security & Privacy

### **Encryption**
- AsyncStorage is **automatically encrypted** on iOS
- Android uses **encrypted shared preferences**
- Data is **device-local only** (not synced to cloud)

### **Data Access**
- Only your app can access its AsyncStorage data
- Data is **sandboxed** per application
- Uninstalling app **deletes all data**

---

## 🧹 Data Management

### **Auto-Cleanup Features**
```javascript
// Clean up old completed reminders (30 days)
const cleanupOldCompletedReminders = async () => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  // Filter and save...
}

// Clean up expired snoozed notifications
export async function cleanupExpiredSnoozed() {
  // Remove notifications older than 24 hours past wake time
}
```

### **Data Backup & Migration**
Currently **no automatic backup**. Data exists only on device:
- **Pros**: Privacy, speed, offline access
- **Cons**: Lost if device is damaged/reset

---

## 🔍 Debugging Storage

### **View All Stored Data**
```javascript
const getAllStorageData = async () => {
  const keys = ['reminders', 'completed_reminders', 'app_settings', 
                'scheduled_reminders', 'snoozed_notifications'];
  
  for (const key of keys) {
    const data = await AsyncStorage.getItem(key);
    console.log(`${key}:`, data ? JSON.parse(data) : null);
  }
};
```

### **Clear All Data** (for testing)
```javascript
const clearAllData = async () => {
  await AsyncStorage.multiRemove([
    'reminders', 'completed_reminders', 'app_settings',
    'scheduled_reminders', 'snoozed_notifications'
  ]);
};
```

---

## 📊 Storage Summary

| Data Type | Storage Key | Size (Est.) | Auto-Cleanup |
|-----------|-------------|-------------|--------------|
| Active Reminders | 'reminders' | ~500KB | No |
| Completed Reminders | 'completed_reminders' | ~300KB | Yes (30 days) |
| App Settings | 'app_settings' | ~200 bytes | No |
| Notification Metadata | 'scheduled_reminders' | ~200KB | Manual |
| Snoozed Notifications | 'snoozed_notifications' | ~50KB | Yes (24 hours) |

**Total Storage Used**: ~1-2MB for heavy usage

Your Blink app uses efficient local storage that's secure, fast, and privacy-focused! 🚀