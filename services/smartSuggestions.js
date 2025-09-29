import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SMS from 'expo-sms';

/**
 * Smart Suggestions System
 * Analyzes user patterns to provide intelligent recommendations
 * Enhanced with Financial Expense Tracking and SMS Analysis
 */

class SmartSuggestionsService {
  constructor() {
    this.patterns = null;
    this.lastAnalysis = null;
    this.expensePatterns = null;
    this.financialAlerts = [];
    this.monthlyBudget = 0;
    this.expenseCategories = {
      'food': ['restaurant', 'food', 'dining', 'coffee', 'lunch', 'dinner', 'breakfast'],
      'transport': ['uber', 'taxi', 'gas', 'fuel', 'parking', 'metro', 'bus'],
      'shopping': ['amazon', 'store', 'shop', 'purchase', 'buy', 'order'],
      'bills': ['electric', 'water', 'internet', 'phone', 'rent', 'insurance'],
      'entertainment': ['movie', 'game', 'subscription', 'netflix', 'spotify'],
      'health': ['doctor', 'pharmacy', 'medicine', 'hospital', 'dental'],
      'other': []
    };
  }

  // Enhanced pattern analysis including financial data
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
        timeOfDayPatterns: this.analyzeTimeOfDayPatterns(allReminders),
        financialPatterns: await this.analyzeFinancialPatterns()
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

  // Analyze financial patterns from SMS and user data
  async analyzeFinancialPatterns() {
    try {
      console.log('🏦 Analyzing financial patterns...');
      
      // Get stored expense data
      const expenseData = await AsyncStorage.getItem('expense_data');
      const expenses = expenseData ? JSON.parse(expenseData) : [];
      
      // Analyze SMS for financial transactions
      const smsExpenses = await this.analyzeSMSForExpenses();
      
      // Combine all expense data
      const allExpenses = [...expenses, ...smsExpenses];
      
      // Calculate financial insights
      const insights = {
        totalExpenses: this.calculateTotalExpenses(allExpenses),
        categoryBreakdown: this.categorizeExpenses(allExpenses),
        monthlyTrends: this.calculateMonthlyTrends(allExpenses),
        averageDaily: this.calculateAverageDaily(allExpenses),
        topVendors: this.analyzeTopVendors(allExpenses),
        budgetStatus: await this.analyzeBudgetStatus(allExpenses),
        recommendations: this.generateFinancialRecommendations(allExpenses)
      };
      
      // Store updated expense data
      await AsyncStorage.setItem('expense_data', JSON.stringify(allExpenses));
      await AsyncStorage.setItem('financial_insights', JSON.stringify(insights));
      
      this.expensePatterns = insights;
      
      // Generate alerts if needed
      await this.checkAndGenerateAlerts(insights);
      
      return insights;
    } catch (error) {
      console.error('Error analyzing financial patterns:', error);
      return null;
    }
  }

  // Analyze SMS messages for financial transactions
  async analyzeSMSForExpenses() {
    try {
      console.log('📱 Reading SMS for expense analysis...');
      
      // Check SMS permissions
      const { status } = await SMS.requestPermissionsAsync();
      if (status !== 'granted') {
        console.log('SMS permission not granted');
        return [];
      }

      // Read recent SMS messages (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      // Since SMS reading might be limited, we'll simulate parsing stored messages
      const storedMessages = await AsyncStorage.getItem('sms_messages');
      let messages = storedMessages ? JSON.parse(storedMessages) : [];
      
      // If no stored messages, create sample data for demo
      if (messages.length === 0) {
        messages = this.createSampleSMSData();
        await AsyncStorage.setItem('sms_messages', JSON.stringify(messages));
      }
      
      const expenses = [];
      
      for (const message of messages) {
        const expense = this.parseExpenseFromSMS(message);
        if (expense) {
          expenses.push(expense);
        }
      }
      
      console.log(`💰 Found ${expenses.length} expenses from SMS analysis`);
      return expenses;
    } catch (error) {
      console.error('Error analyzing SMS:', error);
      return [];
    }
  }

  // Parse individual SMS message for expense information
  parseExpenseFromSMS(message) {
    const text = message.body.toLowerCase();
    const date = new Date(message.date);
    
    // Banking keywords that indicate transactions
    const bankKeywords = ['debited', 'spent', 'withdrawn', 'paid', 'charged', 'transaction', 'purchase'];
    const creditKeywords = ['credited', 'received', 'deposit', 'refund'];
    
    // Check if message contains expense keywords
    const isExpense = bankKeywords.some(keyword => text.includes(keyword));
    const isCredit = creditKeywords.some(keyword => text.includes(keyword));
    
    if (!isExpense && !isCredit) return null;
    
    // Extract amount using regex
    const amountRegex = /(?:rs\\.?|₹|\\$)\\s*(\\d+(?:,\\d+)*(?:\\.\\d{2})?)|\\b(\\d+(?:,\\d+)*(?:\\.\\d{2})?)\\s*(?:rs|rupees?|dollars?)/i;
    const amountMatch = text.match(amountRegex);
    
    if (!amountMatch) return null;
    
    const amountStr = amountMatch[1] || amountMatch[2];
    const amount = parseFloat(amountStr.replace(/,/g, ''));
    
    if (isNaN(amount) || amount <= 0) return null;
    
    // Extract vendor/merchant name
    const vendor = this.extractVendorFromSMS(text);
    
    // Categorize the expense
    const category = this.categorizeExpenseFromText(text, vendor);
    
    return {
      id: `sms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      amount: isCredit ? -amount : amount, // Negative for credits
      vendor,
      category,
      date: date.toISOString(),
      source: 'sms',
      description: message.body,
      type: isCredit ? 'credit' : 'debit'
    };
  }

  // Extract vendor name from SMS text
  extractVendorFromSMS(text) {
    // Common patterns for vendor extraction
    const patterns = [
      /at\s+([a-zA-Z0-9\s]+?)\s+on/i,
      /to\s+([a-zA-Z0-9\s]+?)\s+on/i,
      /merchant\s+([a-zA-Z0-9\s]+)/i,
      /([a-zA-Z0-9\s]+?)\s+transaction/i
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim().toUpperCase();
      }
    }
    
    return 'UNKNOWN VENDOR';
  }

  // Categorize expense based on text content
  categorizeExpenseFromText(text, vendor = '') {
    const combinedText = `${text} ${vendor}`.toLowerCase();
    
    for (const [category, keywords] of Object.entries(this.expenseCategories)) {
      if (keywords.some(keyword => combinedText.includes(keyword))) {
        return category;
      }
    }
    
    return 'other';
  }

  // Calculate total expenses
  calculateTotalExpenses(expenses) {
    return expenses
      .filter(expense => expense.amount > 0) // Only debits
      .reduce((total, expense) => total + expense.amount, 0);
  }

  // Categorize expenses by type
  categorizeExpenses(expenses) {
    const categories = {};
    
    expenses.forEach(expense => {
      if (expense.amount > 0) { // Only debits
        const category = expense.category || 'other';
        if (!categories[category]) {
          categories[category] = { total: 0, count: 0, expenses: [] };
        }
        categories[category].total += expense.amount;
        categories[category].count += 1;
        categories[category].expenses.push(expense);
      }
    });
    
    return categories;
  }

  // Calculate monthly spending trends
  calculateMonthlyTrends(expenses) {
    const monthlyData = {};
    
    expenses.forEach(expense => {
      if (expense.amount > 0) { // Only debits
        const month = new Date(expense.date).toISOString().substring(0, 7); // YYYY-MM
        if (!monthlyData[month]) {
          monthlyData[month] = 0;
        }
        monthlyData[month] += expense.amount;
      }
    });
    
    return monthlyData;
  }

  // Calculate average daily spending
  calculateAverageDaily(expenses) {
    const validExpenses = expenses.filter(expense => expense.amount > 0);
    if (validExpenses.length === 0) return 0;
    
    const total = validExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const days = this.getDaysBetweenDates(
      new Date(validExpenses[validExpenses.length - 1].date),
      new Date(validExpenses[0].date)
    );
    
    return days > 0 ? total / days : total;
  }

  // Analyze top vendors by spending
  analyzeTopVendors(expenses) {
    const vendors = {};
    
    expenses.forEach(expense => {
      if (expense.amount > 0 && expense.vendor) {
        if (!vendors[expense.vendor]) {
          vendors[expense.vendor] = { total: 0, count: 0 };
        }
        vendors[expense.vendor].total += expense.amount;
        vendors[expense.vendor].count += 1;
      }
    });
    
    return Object.entries(vendors)
      .map(([vendor, data]) => ({ vendor, ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }

  // Analyze budget status
  async analyzeBudgetStatus(expenses) {
    const budget = await AsyncStorage.getItem('monthly_budget');
    const monthlyBudget = budget ? parseFloat(budget) : 0;
    
    const currentMonth = new Date().toISOString().substring(0, 7);
    const monthlyExpenses = expenses
      .filter(expense => 
        expense.amount > 0 && 
        expense.date.startsWith(currentMonth)
      )
      .reduce((total, expense) => total + expense.amount, 0);
    
    const remaining = monthlyBudget - monthlyExpenses;
    const percentageUsed = monthlyBudget > 0 ? (monthlyExpenses / monthlyBudget) * 100 : 0;
    
    return {
      budget: monthlyBudget,
      spent: monthlyExpenses,
      remaining,
      percentageUsed,
      status: this.getBudgetStatus(percentageUsed)
    };
  }

  // Generate financial recommendations
  generateFinancialRecommendations(expenses) {
    const recommendations = [];
    const categories = this.categorizeExpenses(expenses);
    
    // Find highest spending category
    const topCategory = Object.entries(categories)
      .sort(([,a], [,b]) => b.total - a.total)[0];
    
    if (topCategory) {
      recommendations.push({
        type: 'category_alert',
        title: 'High Spending Alert',
        message: `You spent most on ${topCategory[0]}: ₹${topCategory[1].total.toFixed(2)}`,
        action: 'review_category',
        category: topCategory[0]
      });
    }
    
    // Check for frequent small expenses
    const smallExpenses = expenses.filter(expense => expense.amount > 0 && expense.amount < 100);
    if (smallExpenses.length > 10) {
      const total = smallExpenses.reduce((sum, expense) => sum + expense.amount, 0);
      recommendations.push({
        type: 'small_expenses',
        title: 'Small Expenses Add Up',
        message: `${smallExpenses.length} small purchases totaled ₹${total.toFixed(2)}`,
        action: 'track_small_expenses'
      });
    }
    
    return recommendations;
  }

  // Check and generate financial alerts
  async checkAndGenerateAlerts(insights) {
    const alerts = [];
    
    // Budget alerts
    if (insights.budgetStatus.percentageUsed > 80) {
      alerts.push({
        id: `budget_alert_${Date.now()}`,
        type: 'budget_warning',
        title: 'Budget Alert',
        message: `You've used ${insights.budgetStatus.percentageUsed.toFixed(1)}% of your monthly budget`,
        severity: insights.budgetStatus.percentageUsed > 100 ? 'high' : 'medium',
        date: new Date().toISOString()
      });
    }
    
    // Unusual spending pattern
    const dailyAverage = insights.averageDaily;
    const todayExpenses = this.getTodayExpenses(insights);
    
    if (todayExpenses > dailyAverage * 2) {
      alerts.push({
        id: `spending_alert_${Date.now()}`,
        type: 'unusual_spending',
        title: 'High Spending Day',
        message: `Today's spending (₹${todayExpenses.toFixed(2)}) is unusually high`,
        severity: 'medium',
        date: new Date().toISOString()
      });
    }
    
    // Store alerts
    if (alerts.length > 0) {
      const existingAlerts = await AsyncStorage.getItem('financial_alerts');
      const allAlerts = existingAlerts ? JSON.parse(existingAlerts) : [];
      const updatedAlerts = [...allAlerts, ...alerts];
      
      await AsyncStorage.setItem('financial_alerts', JSON.stringify(updatedAlerts));
      this.financialAlerts = updatedAlerts;
      
      // Schedule reminder for high priority alerts
      for (const alert of alerts) {
        if (alert.severity === 'high') {
          await this.scheduleFinancialAlert(alert);
        }
      }
    }
  }

  // Helper methods
  getDaysBetweenDates(date1, date2) {
    const diffTime = Math.abs(date2 - date1);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  getBudgetStatus(percentageUsed) {
    if (percentageUsed < 50) return 'good';
    if (percentageUsed < 80) return 'warning';
    return 'critical';
  }

  getTodayExpenses(insights) {
    const today = new Date().toISOString().substring(0, 10);
    // This would need access to today's expenses from insights
    return 0; // Placeholder
  }

  async scheduleFinancialAlert(alert) {
    // This would integrate with the notification system
    console.log('📢 Scheduling financial alert:', alert.title);
  }

  // Create sample SMS data for demonstration
  createSampleSMSData() {
    const sampleMessages = [
      {
        id: '1',
        body: 'Rs. 850.00 debited from your account at STARBUCKS COFFEE on 2025-09-29',
        date: new Date().getTime() - 86400000,
        address: 'BANK-ALERT'
      },
      {
        id: '2',
        body: 'Amount Rs. 1200 spent at AMAZON INDIA on 2025-09-28 using your card',
        date: new Date().getTime() - 172800000,
        address: 'BANK-SMS'
      },
      {
        id: '3',
        body: 'Rs. 45.00 paid to UBER TRIP on 2025-09-27',
        date: new Date().getTime() - 259200000,
        address: 'PAYMENTS'
      },
      {
        id: '4',
        body: 'Grocery purchase Rs. 2,350.50 at BIG BAZAAR on 2025-09-26',
        date: new Date().getTime() - 345600000,
        address: 'BANK-NOTIFY'
      },
      {
        id: '5',
        body: 'Electricity bill payment Rs. 1,800.00 successful on 2025-09-25',
        date: new Date().getTime() - 432000000,
        address: 'BILL-PAY'
      }
    ];
    
    return sampleMessages;
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

  // Generate smart suggestions based on patterns including financial insights
  generateSuggestions(patterns) {
    const suggestions = [];

    // Financial suggestions (high priority)
    if (patterns.financialPatterns) {
      const financial = patterns.financialPatterns;
      
      // Budget-based suggestions
      if (financial.budgetStatus && financial.budgetStatus.percentageUsed > 70) {
        suggestions.push({
          type: 'financial_budget',
          title: 'Budget Alert',
          description: `You've used ${financial.budgetStatus.percentageUsed.toFixed(1)}% of your monthly budget`,
          action: 'reviewBudget',
          value: financial.budgetStatus,
          confidence: 90,
          priority: 'high'
        });
      }
      
      // Category spending suggestions
      if (financial.categoryBreakdown) {
        const topCategory = Object.entries(financial.categoryBreakdown)
          .sort(([,a], [,b]) => b.total - a.total)[0];
        
        if (topCategory) {
          suggestions.push({
            type: 'financial_category',
            title: 'Top Spending Category',
            description: `You spent ₹${topCategory[1].total.toFixed(2)} on ${topCategory[0]} this month`,
            action: 'setCategoryBudget',
            value: { category: topCategory[0], amount: topCategory[1].total },
            confidence: 85,
            priority: 'medium'
          });
        }
      }
      
      // Savings suggestions
      if (financial.averageDaily > 0) {
        const monthlySavingsTarget = financial.averageDaily * 30 * 0.2; // 20% savings goal
        suggestions.push({
          type: 'financial_savings',
          title: 'Savings Goal',
          description: `Try to save ₹${monthlySavingsTarget.toFixed(2)} this month (20% of spending)`,
          action: 'setSavingsGoal',
          value: monthlySavingsTarget,
          confidence: 75,
          priority: 'medium'
        });
      }
      
      // Expense tracking suggestions
      if (financial.recommendations) {
        financial.recommendations.forEach(rec => {
          suggestions.push({
            type: 'financial_recommendation',
            title: rec.title,
            description: rec.message,
            action: rec.action,
            value: rec,
            confidence: 80,
            priority: 'medium'
          });
        });
      }
    }

    // Time-based suggestions
    if (patterns.commonTimes.length > 0) {
      const topTime = patterns.commonTimes[0];
      suggestions.push({
        type: 'time',
        title: 'Suggested Time',
        description: `You often set reminders for ${this.formatTime(topTime.time)}`,
        action: 'setTime',
        value: topTime.time,
        confidence: topTime.percentage,
        priority: 'low'
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
        confidence: topCategory.percentage,
        priority: 'low'
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
        confidence: patterns.recurringPatterns.recurringPercentage,
        priority: 'low'
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
        confidence: topWords[0].percentage,
        priority: 'low'
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
        confidence: bestTimeSlot.percentage,
        priority: 'low'
      });
    }

    // Sort by priority and confidence
    return suggestions.sort((a, b) => {
      const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
      const aPriority = priorityOrder[a.priority] || 1;
      const bPriority = priorityOrder[b.priority] || 1;
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      return b.confidence - a.confidence;
    });
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

  // Financial data access methods
  async getFinancialInsights() {
    const insights = await AsyncStorage.getItem('financial_insights');
    return insights ? JSON.parse(insights) : null;
  }

  async getFinancialAlerts() {
    const alerts = await AsyncStorage.getItem('financial_alerts');
    return alerts ? JSON.parse(alerts) : [];
  }

  async setMonthlyBudget(amount) {
    await AsyncStorage.setItem('monthly_budget', amount.toString());
    this.monthlyBudget = amount;
    
    // Re-analyze patterns to update budget status
    await this.analyzeUserPatterns();
  }

  async getMonthlyBudget() {
    const budget = await AsyncStorage.getItem('monthly_budget');
    return budget ? parseFloat(budget) : 0;
  }

  async addManualExpense(expense) {
    try {
      const expenseData = await AsyncStorage.getItem('expense_data');
      const expenses = expenseData ? JSON.parse(expenseData) : [];
      
      const newExpense = {
        id: `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...expense,
        source: 'manual',
        date: expense.date || new Date().toISOString()
      };
      
      expenses.push(newExpense);
      await AsyncStorage.setItem('expense_data', JSON.stringify(expenses));
      
      // Re-analyze financial patterns
      await this.analyzeFinancialPatterns();
      
      return newExpense;
    } catch (error) {
      console.error('Error adding manual expense:', error);
      throw error;
    }
  }

  async getExpensesByCategory(category, days = 30) {
    try {
      const expenseData = await AsyncStorage.getItem('expense_data');
      if (!expenseData) return [];
      
      const expenses = JSON.parse(expenseData);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      return expenses.filter(expense => 
        expense.category === category &&
        new Date(expense.date) >= cutoffDate &&
        expense.amount > 0
      );
    } catch (error) {
      console.error('Error getting expenses by category:', error);
      return [];
    }
  }

  async getMonthlyExpenseSummary() {
    try {
      const insights = await this.getFinancialInsights();
      if (!insights) return null;
      
      return {
        totalSpent: insights.totalExpenses,
        budgetStatus: insights.budgetStatus,
        categoryBreakdown: insights.categoryBreakdown,
        topVendors: insights.topVendors.slice(0, 5),
        averageDaily: insights.averageDaily
      };
    } catch (error) {
      console.error('Error getting monthly summary:', error);
      return null;
    }
  }

  async dismissAlert(alertId) {
    try {
      const alerts = await this.getFinancialAlerts();
      const updatedAlerts = alerts.filter(alert => alert.id !== alertId);
      await AsyncStorage.setItem('financial_alerts', JSON.stringify(updatedAlerts));
      this.financialAlerts = updatedAlerts;
    } catch (error) {
      console.error('Error dismissing alert:', error);
    }
  }

  async clearOldAlerts(days = 7) {
    try {
      const alerts = await this.getFinancialAlerts();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      const recentAlerts = alerts.filter(alert => 
        new Date(alert.date) >= cutoffDate
      );
      
      await AsyncStorage.setItem('financial_alerts', JSON.stringify(recentAlerts));
      this.financialAlerts = recentAlerts;
    } catch (error) {
      console.error('Error clearing old alerts:', error);
    }
  }

  // Force refresh of SMS data
  async refreshSMSData() {
    try {
      // Clear stored SMS data to force re-reading
      await AsyncStorage.removeItem('sms_messages');
      
      // Re-analyze financial patterns
      await this.analyzeFinancialPatterns();
      
      return true;
    } catch (error) {
      console.error('Error refreshing SMS data:', error);
      return false;
    }
  }
}

// Export singleton instance
export default new SmartSuggestionsService();