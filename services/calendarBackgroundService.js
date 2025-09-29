import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import calendarService from './calendarService';

/**
 * Background Calendar Tasks
 * Handles yearly notification renewal and birthday maintenance
 */

class CalendarBackgroundService {
  constructor() {
    this.isRunning = false;
    this.checkInterval = null;
    this.lastCheck = null;
  }

  // Initialize background service
  async initialize() {
    try {
      // Load last check time
      const lastCheckData = await AsyncStorage.getItem('calendar_last_check');
      this.lastCheck = lastCheckData ? new Date(lastCheckData) : null;
      
      // Start periodic checks
      this.startPeriodicChecks();
      
      console.log('📅 Calendar background service initialized');
      return true;
    } catch (error) {
      console.error('Error initializing calendar background service:', error);
      return false;
    }
  }

  // Start periodic checks for yearly notification renewal
  startPeriodicChecks() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    // Check every 24 hours
    this.checkInterval = setInterval(() => {
      this.performYearlyMaintenanceCheck();
    }, 24 * 60 * 60 * 1000); // 24 hours

    // Perform initial check if not done today
    this.performYearlyMaintenanceCheck();
  }

  // Stop background service
  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.isRunning = false;
    console.log('📅 Calendar background service stopped');
  }

  // Main yearly maintenance check
  async performYearlyMaintenanceCheck() {
    try {
      if (this.isRunning) return; // Prevent multiple runs
      
      const now = new Date();
      
      // Check if we already ran today
      if (this.lastCheck && this.isSameDay(this.lastCheck, now)) {
        return; // Already checked today
      }

      this.isRunning = true;
      console.log('📅 Starting yearly maintenance check...');

      // Initialize calendar service
      await calendarService.initialize();

      // Perform various maintenance tasks
      await this.renewYearlyNotifications();
      await this.cleanupExpiredData();
      await this.updateBirthdayAges();
      await this.generateYearlyStats();

      // Update last check time
      this.lastCheck = now;
      await AsyncStorage.setItem('calendar_last_check', now.toISOString());

      console.log('✅ Yearly maintenance check completed');
    } catch (error) {
      console.error('Error in yearly maintenance check:', error);
    } finally {
      this.isRunning = false;
    }
  }

  // Renew yearly notifications for next year
  async renewYearlyNotifications() {
    try {
      const currentYear = new Date().getFullYear();
      const nextYear = currentYear + 1;
      
      // Load current notifications
      await calendarService.loadNotifications();
      
      // Check which birthdays need notifications for next year
      const birthdays = await calendarService.loadBirthdays();
      const activeBirthdays = birthdays.filter(b => b.isActive);

      let renewedCount = 0;

      for (const birthday of activeBirthdays) {
        // Check if birthday has notifications scheduled for next year
        const hasNextYearNotifications = calendarService.notifications.some(n => 
          n.birthdayId === birthday.id && 
          n.year === nextYear
        );

        if (!hasNextYearNotifications) {
          // Schedule notifications for next year
          await this.scheduleNextYearNotifications(birthday, nextYear);
          renewedCount++;
        }
      }

      if (renewedCount > 0) {
        console.log(`🔄 Renewed notifications for ${renewedCount} birthdays for ${nextYear}`);
      }

      return renewedCount;
    } catch (error) {
      console.error('Error renewing yearly notifications:', error);
      return 0;
    }
  }

  // Schedule notifications for a specific birthday for next year
  async scheduleNextYearNotifications(birthday, year) {
    try {
      const [month, day] = birthday.date.split('-');
      const birthdayDate = new Date(year, parseInt(month) - 1, parseInt(day));
      
      // Don't schedule if the date already passed this year and we're scheduling for current year
      const now = new Date();
      if (year === now.getFullYear() && birthdayDate < now) {
        return;
      }

      // Schedule reminders for each configured reminder time
      for (const reminderDay of birthday.reminders || [0, 1, 7]) {
        const notificationDate = new Date(birthdayDate);
        notificationDate.setDate(birthdayDate.getDate() - reminderDay);
        
        // Skip if notification date is in the past
        if (notificationDate < now) continue;

        const age = birthday.year ? year - birthday.year : null;
        const ageText = age ? ` (turning ${age})` : '';
        
        let title, body;
        
        if (reminderDay === 0) {
          title = `🎉 Happy Birthday!`;
          body = `Today is ${birthday.name}'s birthday${ageText}! 🎂`;
        } else if (reminderDay === 1) {
          title = `🎂 Birthday Tomorrow`;
          body = `${birthday.name}'s birthday is tomorrow${ageText}!`;
        } else {
          title = `🎂 Birthday Reminder`;
          body = `${birthday.name}'s birthday is in ${reminderDay} days${ageText}!`;
        }

        const notificationId = await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            data: {
              type: 'birthday',
              birthdayId: birthday.id,
              name: birthday.name,
              date: birthday.date,
              year: year,
              reminderDays: reminderDay
            },
            sound: true,
          },
          trigger: {
            date: notificationDate,
          },
        });

        // Store notification reference
        calendarService.notifications.push({
          id: notificationId,
          birthdayId: birthday.id,
          scheduledFor: notificationDate.toISOString(),
          reminderDays: reminderDay,
          year: year
        });
      }

      await calendarService.saveNotifications();
    } catch (error) {
      console.error('Error scheduling next year notifications:', error);
    }
  }

  // Clean up expired data
  async cleanupExpiredData() {
    try {
      // Clean up old notifications (older than 1 year)
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      const notifications = await calendarService.loadNotifications();
      const validNotifications = notifications.filter(n => 
        new Date(n.scheduledFor) >= oneYearAgo
      );

      if (validNotifications.length !== notifications.length) {
        calendarService.notifications = validNotifications;
        await calendarService.saveNotifications();
        console.log(`🧹 Cleaned up ${notifications.length - validNotifications.length} old notifications`);
      }

      return true;
    } catch (error) {
      console.error('Error cleaning up expired data:', error);
      return false;
    }
  }

  // Update birthday ages for current year
  async updateBirthdayAges() {
    try {
      const currentYear = new Date().getFullYear();
      const birthdays = await calendarService.loadBirthdays();
      
      // This is mainly for caching purposes - ages are calculated dynamically
      // but we can update any metadata here if needed
      
      const birthdaysWithAge = birthdays.filter(b => b.year && b.isActive);
      console.log(`📊 ${birthdaysWithAge.length} birthdays have age information for ${currentYear}`);
      
      return birthdaysWithAge.length;
    } catch (error) {
      console.error('Error updating birthday ages:', error);
      return 0;
    }
  }

  // Generate yearly statistics
  async generateYearlyStats() {
    try {
      const stats = await calendarService.getBirthdayStats();
      
      // Store yearly snapshot
      const yearlyStats = {
        year: new Date().getFullYear(),
        totalBirthdays: stats.totalBirthdays,
        averageAge: stats.averageAge,
        relationships: stats.relationships,
        generatedAt: new Date().toISOString()
      };

      // Store in yearly stats array
      const existingStatsData = await AsyncStorage.getItem('yearly_birthday_stats');
      const existingStats = existingStatsData ? JSON.parse(existingStatsData) : [];
      
      // Update or add current year stats
      const currentYearIndex = existingStats.findIndex(s => s.year === yearlyStats.year);
      if (currentYearIndex >= 0) {
        existingStats[currentYearIndex] = yearlyStats;
      } else {
        existingStats.push(yearlyStats);
      }

      // Keep only last 5 years of stats
      const recentStats = existingStats
        .sort((a, b) => b.year - a.year)
        .slice(0, 5);

      await AsyncStorage.setItem('yearly_birthday_stats', JSON.stringify(recentStats));
      
      console.log(`📈 Generated yearly stats for ${yearlyStats.year}`);
      return yearlyStats;
    } catch (error) {
      console.error('Error generating yearly stats:', error);
      return null;
    }
  }

  // Check for birthdays happening today
  async checkTodaysBirthdays() {
    try {
      const today = new Date();
      const month = (today.getMonth() + 1).toString().padStart(2, '0');
      const day = today.getDate().toString().padStart(2, '0');
      const todayStr = `${month}-${day}`;

      const birthdays = await calendarService.loadBirthdays();
      const todaysBirthdays = birthdays.filter(b => 
        b.isActive && b.date === todayStr
      );

      if (todaysBirthdays.length > 0) {
        console.log(`🎉 ${todaysBirthdays.length} birthday(s) today:`, 
          todaysBirthdays.map(b => b.name).join(', '));
      }

      return todaysBirthdays;
    } catch (error) {
      console.error('Error checking today\'s birthdays:', error);
      return [];
    }
  }

  // Get yearly statistics history
  async getYearlyStatsHistory() {
    try {
      const statsData = await AsyncStorage.getItem('yearly_birthday_stats');
      return statsData ? JSON.parse(statsData) : [];
    } catch (error) {
      console.error('Error getting yearly stats history:', error);
      return [];
    }
  }

  // Manual trigger for yearly maintenance (for testing)
  async forceYearlyMaintenance() {
    console.log('🔧 Forcing yearly maintenance check...');
    this.lastCheck = null; // Reset last check to force run
    await this.performYearlyMaintenanceCheck();
  }

  // Helper methods
  isSameDay(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }

  // Get service status
  getStatus() {
    return {
      isRunning: this.isRunning,
      hasInterval: !!this.checkInterval,
      lastCheck: this.lastCheck,
      nextCheck: this.lastCheck ? new Date(this.lastCheck.getTime() + 24 * 60 * 60 * 1000) : null
    };
  }
}

// Export singleton instance
export default new CalendarBackgroundService();