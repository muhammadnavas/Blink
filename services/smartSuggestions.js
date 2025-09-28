import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Smart Suggestions System
 * Analyzes user patterns to provide intelligent recommendations
 */

class SmartSuggestionsService {
  constructor() {
    this.patterns = null;
    this.lastAnalysis = null;
  }

  // Analyze user patterns from completed reminders
  async analyzeUserPatterns() {
    try {
      const completedReminders = await AsyncStorage.getItem('completed_reminders');
      const activeReminders = await AsyncStorage.getItem('reminders');
      
      if (!completedReminders && !activeReminders) {
        return { patterns: [], suggestions: [] };
      }

      const completed = completedReminders ? JSON.parse(completedReminders) : [];
      const active = activeReminders ? JSON.parse(activeReminders) : [];
      const allReminders = [...completed, ...active];

      // Analyze patterns
      const patterns = {
        commonTimes: this.analyzeCommonTimes(allReminders),
        frequentWords: this.analyzeFrequentWords(allReminders),
        categoryPreferences: this.analyzeCategoryPreferences(allReminders),
        recurringPatterns: this.analyzeRecurringPatterns(allReminders),
        completionRates: this.analyzeCompletionRates(completed, active),
        timeOfDayPatterns: this.analyzeTimeOfDayPatterns(allReminders)
      };

      this.patterns = patterns;
      this.lastAnalysis = new Date().toISOString();

      // Generate suggestions based on patterns
      const suggestions = this.generateSuggestions(patterns);

      return { patterns, suggestions };
    } catch (error) {
      console.error('Error analyzing user patterns:', error);
      return { patterns: [], suggestions: [] };
    }
  }

  // Analyze most common reminder times
  analyzeCommonTimes(reminders) {
    const timeMap = {};
    
    reminders.forEach(reminder => {
      const time = reminder.time;
      if (time) {
        timeMap[time] = (timeMap[time] || 0) + 1;
      }
    });

    return Object.entries(timeMap)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([time, count]) => ({
        time: parseInt(time),
        count,
        percentage: (count / reminders.length * 100).toFixed(1)
      }));
  }

  // Analyze frequently used words/phrases
  analyzeFrequentWords(reminders) {
    const wordMap = {};
    const commonWords = ['the', 'to', 'and', 'a', 'in', 'is', 'it', 'with', 'for', 'as', 'of', 'on', 'at', 'by'];
    
    reminders.forEach(reminder => {
      const words = reminder.text.toLowerCase()
        .split(/\W+/)
        .filter(word => word.length > 2 && !commonWords.includes(word));
      
      words.forEach(word => {
        wordMap[word] = (wordMap[word] || 0) + 1;
      });
    });

    return Object.entries(wordMap)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([word, count]) => ({
        word,
        count,
        percentage: (count / reminders.length * 100).toFixed(1)
      }));
  }

  // Analyze category preferences
  analyzeCategoryPreferences(reminders) {
    const categoryMap = {};
    
    reminders.forEach(reminder => {
      const category = reminder.category || 'Personal';
      categoryMap[category] = (categoryMap[category] || 0) + 1;
    });

    return Object.entries(categoryMap)
      .sort(([,a], [,b]) => b - a)
      .map(([category, count]) => ({
        category,
        count,
        percentage: (count / reminders.length * 100).toFixed(1)
      }));
  }

  // Analyze recurring patterns
  analyzeRecurringPatterns(reminders) {
    const recurringReminders = reminders.filter(r => r.isRecurring);
    const recurringMap = {};
    
    recurringReminders.forEach(reminder => {
      const type = reminder.recurringType || 'daily';
      recurringMap[type] = (recurringMap[type] || 0) + 1;
    });

    return {
      totalRecurring: recurringReminders.length,
      recurringPercentage: (recurringReminders.length / reminders.length * 100).toFixed(1),
      types: Object.entries(recurringMap).map(([type, count]) => ({
        type,
        count,
        percentage: (count / recurringReminders.length * 100).toFixed(1)
      }))
    };
  }

  // Analyze completion rates
  analyzeCompletionRates(completed, active) {
    const total = completed.length + active.length;
    const completionRate = total > 0 ? (completed.length / total * 100).toFixed(1) : 0;
    
    return {
      total,
      completed: completed.length,
      active: active.length,
      completionRate
    };
  }

  // Analyze time of day patterns
  analyzeTimeOfDayPatterns(reminders) {
    const timeSlots = {
      morning: { start: 6, end: 12, count: 0 },
      afternoon: { start: 12, end: 17, count: 0 },
      evening: { start: 17, end: 21, count: 0 },
      night: { start: 21, end: 6, count: 0 }
    };

    reminders.forEach(reminder => {
      if (reminder.scheduledDate) {
        const hour = new Date(reminder.scheduledDate).getHours();
        
        if (hour >= 6 && hour < 12) timeSlots.morning.count++;
        else if (hour >= 12 && hour < 17) timeSlots.afternoon.count++;
        else if (hour >= 17 && hour < 21) timeSlots.evening.count++;
        else timeSlots.night.count++;
      }
    });

    return Object.entries(timeSlots).map(([period, data]) => ({
      period,
      count: data.count,
      percentage: reminders.length > 0 ? (data.count / reminders.length * 100).toFixed(1) : 0
    }));
  }

  // Generate smart suggestions based on patterns
  generateSuggestions(patterns) {
    const suggestions = [];

    // Time-based suggestions
    if (patterns.commonTimes.length > 0) {
      const topTime = patterns.commonTimes[0];
      suggestions.push({
        type: 'time',
        title: 'Suggested Time',
        description: `You often set reminders for ${this.formatTime(topTime.time)}`,
        action: 'setTime',
        value: topTime.time,
        confidence: topTime.percentage
      });
    }

    // Category suggestions
    if (patterns.categoryPreferences.length > 0) {
      const topCategory = patterns.categoryPreferences[0];
      suggestions.push({
        type: 'category',
        title: 'Preferred Category',
        description: `${topCategory.percentage}% of your reminders are ${topCategory.category}`,
        action: 'setCategory',
        value: topCategory.category,
        confidence: topCategory.percentage
      });
    }

    // Recurring suggestions
    if (patterns.recurringPatterns.recurringPercentage > 20) {
      suggestions.push({
        type: 'recurring',
        title: 'Consider Making Recurring',
        description: `${patterns.recurringPatterns.recurringPercentage}% of your reminders repeat`,
        action: 'enableRecurring',
        value: true,
        confidence: patterns.recurringPatterns.recurringPercentage
      });
    }

    // Word-based suggestions
    if (patterns.frequentWords.length > 0) {
      const topWords = patterns.frequentWords.slice(0, 3);
      suggestions.push({
        type: 'words',
        title: 'Common Tasks',
        description: `You often remind yourself about: ${topWords.map(w => w.word).join(', ')}`,
        action: 'suggestWords',
        value: topWords.map(w => w.word),
        confidence: topWords[0].percentage
      });
    }

    // Time of day suggestions
    const bestTimeSlot = patterns.timeOfDayPatterns.reduce((best, slot) => 
      slot.count > best.count ? slot : best
    );
    
    if (bestTimeSlot.count > 0) {
      suggestions.push({
        type: 'timeOfDay',
        title: 'Best Time of Day',
        description: `You're most active with reminders in the ${bestTimeSlot.period}`,
        action: 'suggestTimeOfDay',
        value: bestTimeSlot.period,
        confidence: bestTimeSlot.percentage
      });
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }

  // Get suggestions for a specific context
  async getSuggestionsForInput(inputText) {
    if (!this.patterns) {
      await this.analyzeUserPatterns();
    }

    const suggestions = [];
    
    // Suggest similar past reminders
    const completedReminders = await AsyncStorage.getItem('completed_reminders');
    if (completedReminders) {
      const completed = JSON.parse(completedReminders);
      const similar = this.findSimilarReminders(inputText, completed);
      
      similar.forEach(reminder => {
        suggestions.push({
          type: 'similar',
          title: 'Similar Reminder',
          description: `You previously set: "${reminder.text}"`,
          action: 'useSimilar',
          value: reminder,
          confidence: reminder.similarity * 100
        });
      });
    }

    return suggestions;
  }

  // Find similar reminders based on text similarity
  findSimilarReminders(inputText, reminders) {
    const inputWords = inputText.toLowerCase().split(/\W+/).filter(word => word.length > 2);
    
    const similarities = reminders.map(reminder => {
      const reminderWords = reminder.text.toLowerCase().split(/\W+/).filter(word => word.length > 2);
      const commonWords = inputWords.filter(word => reminderWords.includes(word));
      const similarity = commonWords.length / Math.max(inputWords.length, reminderWords.length);
      
      return { ...reminder, similarity };
    });

    return similarities
      .filter(r => r.similarity > 0.3)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 3);
  }

  // Helper method to format time
  formatTime(seconds) {
    if (seconds < 60) return `${seconds} seconds`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours`;
    return `${Math.floor(seconds / 86400)} days`;
  }

  // Get cached patterns if available
  getCachedPatterns() {
    return this.patterns;
  }

  // Check if analysis is stale (older than 1 hour)
  isAnalysisStale() {
    if (!this.lastAnalysis) return true;
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    return new Date(this.lastAnalysis) < oneHourAgo;
  }
}

// Export singleton instance
export default new SmartSuggestionsService();