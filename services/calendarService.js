import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Contacts from 'expo-contacts';
import * as Notifications from 'expo-notifications';

/**
 * Calendar Service for Birthday Events and Yearly Recurring Notifications
 * Manages birthday events, anniversary reminders, and yearly notifications
 */

class CalendarService {
  constructor() {
    this.events = [];
    this.birthdays = [];
    this.notifications = [];
    
    // Birthday notification times (days before)
    this.reminderTimes = [
      { days: 7, label: '1 week before' },
      { days: 3, label: '3 days before' },
      { days: 1, label: '1 day before' },
      { days: 0, label: 'On the day' }
    ];
  }

  // Initialize calendar service
  async initialize() {
    try {
      await this.loadEvents();
      await this.loadBirthdays();
      await this.scheduleUpcomingNotifications();
      console.log('📅 Calendar service initialized');
      return true;
    } catch (error) {
      console.error('Error initializing calendar service:', error);
      return false;
    }
  }

  // Load events from storage
  async loadEvents() {
    try {
      const eventsData = await AsyncStorage.getItem('calendar_events');
      this.events = eventsData ? JSON.parse(eventsData) : [];
      return this.events;
    } catch (error) {
      console.error('Error loading events:', error);
      return [];
    }
  }

  // Load birthdays from storage
  async loadBirthdays() {
    try {
      const birthdaysData = await AsyncStorage.getItem('birthday_events');
      this.birthdays = birthdaysData ? JSON.parse(birthdaysData) : [];
      return this.birthdays;
    } catch (error) {
      console.error('Error loading birthdays:', error);
      return [];
    }
  }

  // Add a new birthday event
  async addBirthday(birthdayData) {
    try {
      const birthday = {
        id: `birthday_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: birthdayData.name || 'Unknown',
        date: birthdayData.date, // MM-DD format
        year: birthdayData.year || null, // Birth year (optional)
        phone: birthdayData.phone || '',
        email: birthdayData.email || '',
        photo: birthdayData.photo || null,
        relationship: birthdayData.relationship || 'Friend',
        reminders: birthdayData.reminders || [0, 1, 7], // Days before to remind
        notes: birthdayData.notes || '',
        created: new Date().toISOString(),
        lastNotified: null,
        isActive: true
      };

      // Validate date format
      if (!this.isValidDate(birthday.date)) {
        throw new Error('Invalid date format. Use MM-DD format.');
      }

      this.birthdays.push(birthday);
      await this.saveBirthdays();
      
      // Schedule notifications for this birthday
      await this.scheduleBirthdayNotifications(birthday);
      
      console.log(`🎂 Birthday added for ${birthday.name} on ${birthday.date}`);
      return birthday;
    } catch (error) {
      console.error('Error adding birthday:', error);
      throw error;
    }
  }

  // Update a birthday event
  async updateBirthday(birthdayId, updateData) {
    try {
      const index = this.birthdays.findIndex(b => b.id === birthdayId);
      if (index === -1) {
        throw new Error('Birthday not found');
      }

      // Cancel existing notifications for this birthday
      await this.cancelBirthdayNotifications(birthdayId);

      // Update birthday data
      this.birthdays[index] = {
        ...this.birthdays[index],
        ...updateData,
        updated: new Date().toISOString()
      };

      await this.saveBirthdays();
      
      // Reschedule notifications
      await this.scheduleBirthdayNotifications(this.birthdays[index]);
      
      console.log(`🎂 Birthday updated for ${this.birthdays[index].name}`);
      return this.birthdays[index];
    } catch (error) {
      console.error('Error updating birthday:', error);
      throw error;
    }
  }

  // Delete a birthday event
  async deleteBirthday(birthdayId) {
    try {
      const index = this.birthdays.findIndex(b => b.id === birthdayId);
      if (index === -1) {
        throw new Error('Birthday not found');
      }

      // Cancel notifications
      await this.cancelBirthdayNotifications(birthdayId);

      // Remove birthday
      const deletedBirthday = this.birthdays.splice(index, 1)[0];
      await this.saveBirthdays();
      
      console.log(`🗑️ Birthday deleted for ${deletedBirthday.name}`);
      return true;
    } catch (error) {
      console.error('Error deleting birthday:', error);
      return false;
    }
  }

  // Get birthdays for a specific month
  getBirthdaysForMonth(month, year = null) {
    const monthStr = month.toString().padStart(2, '0');
    
    return this.birthdays.filter(birthday => {
      if (!birthday.isActive) return false;
      
      const [birthMonth] = birthday.date.split('-');
      return birthMonth === monthStr;
    }).map(birthday => {
      const age = year && birthday.year ? year - birthday.year : null;
      return {
        ...birthday,
        age,
        fullDate: year ? `${year}-${birthday.date}` : birthday.date
      };
    });
  }

  // Get upcoming birthdays (next 30 days)
  getUpcomingBirthdays(days = 30) {
    const today = new Date();
    const upcoming = [];

    for (let i = 0; i <= days; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() + i);
      
      const month = (checkDate.getMonth() + 1).toString().padStart(2, '0');
      const day = checkDate.getDate().toString().padStart(2, '0');
      const dateStr = `${month}-${day}`;

      const dayBirthdays = this.birthdays.filter(birthday => 
        birthday.isActive && birthday.date === dateStr
      );

      dayBirthdays.forEach(birthday => {
        const age = birthday.year ? checkDate.getFullYear() - birthday.year : null;
        upcoming.push({
          ...birthday,
          daysUntil: i,
          age,
          fullDate: checkDate.toISOString().split('T')[0]
        });
      });
    }

    return upcoming.sort((a, b) => a.daysUntil - b.daysUntil);
  }

  // Schedule birthday notifications for the next year
  async scheduleBirthdayNotifications(birthday) {
    try {
      const currentYear = new Date().getFullYear();
      const nextYear = currentYear + 1;
      
      // Schedule for current year and next year
      for (const year of [currentYear, nextYear]) {
        const [month, day] = birthday.date.split('-');
        const birthdayDate = new Date(year, parseInt(month) - 1, parseInt(day));
        
        // Skip if birthday already passed this year
        if (birthdayDate < new Date() && year === currentYear) continue;

        // Schedule reminders for each configured reminder time
        for (const reminderDay of birthday.reminders) {
          const notificationDate = new Date(birthdayDate);
          notificationDate.setDate(birthdayDate.getDate() - reminderDay);
          
          // Skip if notification date is in the past
          if (notificationDate < new Date()) continue;

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
          this.notifications.push({
            id: notificationId,
            birthdayId: birthday.id,
            scheduledFor: notificationDate.toISOString(),
            reminderDays: reminderDay,
            year: year
          });
        }
      }

      await this.saveNotifications();
      console.log(`📅 Scheduled ${birthday.reminders.length * 2} notifications for ${birthday.name}`);
    } catch (error) {
      console.error('Error scheduling birthday notifications:', error);
    }
  }

  // Cancel all notifications for a birthday
  async cancelBirthdayNotifications(birthdayId) {
    try {
      const birthdayNotifications = this.notifications.filter(n => n.birthdayId === birthdayId);
      
      for (const notification of birthdayNotifications) {
        await Notifications.cancelScheduledNotificationAsync(notification.id);
      }

      // Remove from our tracking
      this.notifications = this.notifications.filter(n => n.birthdayId !== birthdayId);
      await this.saveNotifications();
      
      console.log(`🚫 Cancelled ${birthdayNotifications.length} notifications for birthday ${birthdayId}`);
    } catch (error) {
      console.error('Error cancelling birthday notifications:', error);
    }
  }

  // Schedule upcoming notifications (call this periodically)
  async scheduleUpcomingNotifications() {
    try {
      // Cancel expired notifications
      await this.cleanupExpiredNotifications();
      
      // Schedule notifications for birthdays that don't have them scheduled
      for (const birthday of this.birthdays) {
        if (!birthday.isActive) continue;
        
        const hasScheduledNotifications = this.notifications.some(n => 
          n.birthdayId === birthday.id && 
          new Date(n.scheduledFor) > new Date()
        );

        if (!hasScheduledNotifications) {
          await this.scheduleBirthdayNotifications(birthday);
        }
      }
    } catch (error) {
      console.error('Error scheduling upcoming notifications:', error);
    }
  }

  // Import birthdays from device contacts
  async importBirthdaysFromContacts() {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Contacts permission not granted');
      }

      const { data } = await Contacts.getContactsAsync({
        fields: [
          Contacts.Fields.Name,
          Contacts.Fields.Birthday,
          Contacts.Fields.PhoneNumbers,
          Contacts.Fields.Emails,
          Contacts.Fields.Image
        ],
      });

      const importedBirthdays = [];
      
      for (const contact of data) {
        if (contact.birthday) {
          const birthday = new Date(contact.birthday);
          const month = (birthday.getMonth() + 1).toString().padStart(2, '0');
          const day = birthday.getDate().toString().padStart(2, '0');
          const year = birthday.getFullYear();

          // Check if birthday already exists
          const exists = this.birthdays.some(b => 
            b.name.toLowerCase() === contact.name.toLowerCase() &&
            b.date === `${month}-${day}`
          );

          if (!exists) {
            const birthdayData = {
              name: contact.name,
              date: `${month}-${day}`,
              year: year,
              phone: contact.phoneNumbers?.[0]?.number || '',
              email: contact.emails?.[0]?.email || '',
              photo: contact.imageAvailable ? contact.image?.uri : null,
              relationship: 'Contact',
              reminders: [0, 1, 7],
              notes: 'Imported from contacts'
            };

            const addedBirthday = await this.addBirthday(birthdayData);
            importedBirthdays.push(addedBirthday);
          }
        }
      }

      console.log(`📱 Imported ${importedBirthdays.length} birthdays from contacts`);
      return importedBirthdays;
    } catch (error) {
      console.error('Error importing birthdays from contacts:', error);
      throw error;
    }
  }

  // Get calendar data for a specific month
  getCalendarMonth(year, month) {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const daysInMonth = lastDay.getDate();
    const startDay = firstDay.getDay(); // 0 = Sunday

    const calendarDays = [];

    // Add empty days for padding
    for (let i = 0; i < startDay; i++) {
      calendarDays.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      const dayBirthdays = this.birthdays.filter(b => 
        b.isActive && b.date === dateStr
      );

      calendarDays.push({
        day,
        date: new Date(year, month - 1, day),
        birthdays: dayBirthdays,
        isToday: this.isToday(year, month - 1, day),
        hasBirthdays: dayBirthdays.length > 0
      });
    }

    return {
      year,
      month,
      monthName: firstDay.toLocaleString('default', { month: 'long' }),
      days: calendarDays,
      totalBirthdays: this.getBirthdaysForMonth(month, year).length
    };
  }

  // Get birthday statistics
  async getBirthdayStats() {
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    
    const thisMonthBirthdays = this.getBirthdaysForMonth(currentMonth, currentYear);
    const upcomingBirthdays = this.getUpcomingBirthdays(30);
    
    // Age statistics
    const birthdaysWithAge = this.birthdays.filter(b => b.year && b.isActive);
    const ages = birthdaysWithAge.map(b => currentYear - b.year);
    const averageAge = ages.length > 0 ? ages.reduce((a, b) => a + b, 0) / ages.length : 0;

    // Relationship breakdown
    const relationships = {};
    this.birthdays.forEach(b => {
      if (b.isActive) {
        relationships[b.relationship] = (relationships[b.relationship] || 0) + 1;
      }
    });

    return {
      totalBirthdays: this.birthdays.filter(b => b.isActive).length,
      thisMonth: thisMonthBirthdays.length,
      upcoming: upcomingBirthdays.length,
      averageAge: Math.round(averageAge),
      relationships,
      scheduledNotifications: this.notifications.filter(n => 
        new Date(n.scheduledFor) > new Date()
      ).length
    };
  }

  // Helper methods
  isValidDate(dateStr) {
    const regex = /^\d{2}-\d{2}$/;
    if (!regex.test(dateStr)) return false;
    
    const [month, day] = dateStr.split('-').map(Number);
    return month >= 1 && month <= 12 && day >= 1 && day <= 31;
  }

  isToday(year, month, day) {
    const today = new Date();
    return today.getFullYear() === year && 
           today.getMonth() === month && 
           today.getDate() === day;
  }

  async cleanupExpiredNotifications() {
    const now = new Date();
    const expiredNotifications = this.notifications.filter(n => 
      new Date(n.scheduledFor) < now
    );

    for (const notification of expiredNotifications) {
      await Notifications.cancelScheduledNotificationAsync(notification.id);
    }

    this.notifications = this.notifications.filter(n => 
      new Date(n.scheduledFor) >= now
    );

    if (expiredNotifications.length > 0) {
      await this.saveNotifications();
      console.log(`🧹 Cleaned up ${expiredNotifications.length} expired notifications`);
    }
  }

  // Storage methods
  async saveBirthdays() {
    try {
      await AsyncStorage.setItem('birthday_events', JSON.stringify(this.birthdays));
    } catch (error) {
      console.error('Error saving birthdays:', error);
    }
  }

  async saveEvents() {
    try {
      await AsyncStorage.setItem('calendar_events', JSON.stringify(this.events));
    } catch (error) {
      console.error('Error saving events:', error);
    }
  }

  async saveNotifications() {
    try {
      await AsyncStorage.setItem('calendar_notifications', JSON.stringify(this.notifications));
    } catch (error) {
      console.error('Error saving notifications:', error);
    }
  }

  async loadNotifications() {
    try {
      const notificationsData = await AsyncStorage.getItem('calendar_notifications');
      this.notifications = notificationsData ? JSON.parse(notificationsData) : [];
      return this.notifications;
    } catch (error) {
      console.error('Error loading notifications:', error);
      return [];
    }
  }

  // Export birthday data for backup
  async exportBirthdays() {
    try {
      return {
        birthdays: this.birthdays,
        notifications: this.notifications,
        exportDate: new Date().toISOString(),
        version: '1.0'
      };
    } catch (error) {
      console.error('Error exporting birthdays:', error);
      return null;
    }
  }
}

// Export singleton instance
export default new CalendarService();