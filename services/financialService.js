import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

/**
 * Financial Expense Tracking Service
 * Handles expense tracking, budget management, and financial alerts
 */

class FinancialService {
  constructor() {
    this.currentBudget = 0;
    this.expenseCategories = {
      'food': { color: '#FF6B6B', emoji: '🍔', label: 'Food & Dining' },
      'transport': { color: '#4ECDC4', emoji: '🚗', label: 'Transportation' },
      'shopping': { color: '#45B7D1', emoji: '🛍️', label: 'Shopping' },
      'bills': { color: '#96CEB4', emoji: '💡', label: 'Bills & Utilities' },
      'entertainment': { color: '#FFEAA7', emoji: '🎬', label: 'Entertainment' },
      'health': { color: '#DDA0DD', emoji: '🏥', label: 'Health & Medical' },
      'other': { color: '#B0B0B0', emoji: '📝', label: 'Other' }
    };
  }

  // Initialize financial service
  async initialize() {
    try {
      const budget = await AsyncStorage.getItem('monthly_budget');
      this.currentBudget = budget ? parseFloat(budget) : 0;
      
      // Clean up old data
      await this.cleanupOldData();
      
      console.log('💰 Financial service initialized');
      return true;
    } catch (error) {
      console.error('Error initializing financial service:', error);
      return false;
    }
  }

  // Add a new expense manually
  async addExpense(expenseData) {
    try {
      const expense = {
        id: `expense_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        amount: parseFloat(expenseData.amount),
        description: expenseData.description || '',
        category: expenseData.category || 'other',
        vendor: expenseData.vendor || '',
        date: expenseData.date || new Date().toISOString(),
        source: 'manual',
        tags: expenseData.tags || []
      };

      // Validate expense
      if (expense.amount <= 0) {
        throw new Error('Amount must be greater than 0');
      }

      // Get existing expenses
      const expenseData = await AsyncStorage.getItem('expense_data');
      const expenses = expenseData ? JSON.parse(expenseData) : [];

      // Add new expense
      expenses.push(expense);

      // Save updated expenses
      await AsyncStorage.setItem('expense_data', JSON.stringify(expenses));

      // Check for budget alerts
      await this.checkBudgetAlerts();

      console.log('💳 Expense added:', expense.description, '₹' + expense.amount);
      return expense;
    } catch (error) {
      console.error('Error adding expense:', error);
      throw error;
    }
  }

  // Get expenses for a specific period
  async getExpenses(days = 30, category = null) {
    try {
      const expenseData = await AsyncStorage.getItem('expense_data');
      if (!expenseData) return [];

      const expenses = JSON.parse(expenseData);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      let filteredExpenses = expenses.filter(expense => 
        new Date(expense.date) >= cutoffDate && expense.amount > 0
      );

      if (category) {
        filteredExpenses = filteredExpenses.filter(expense => 
          expense.category === category
        );
      }

      return filteredExpenses.sort((a, b) => new Date(b.date) - new Date(a.date));
    } catch (error) {
      console.error('Error getting expenses:', error);
      return [];
    }
  }

  // Get expense summary for current month
  async getMonthlyExpenseSummary() {
    try {
      const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM
      const expenseData = await AsyncStorage.getItem('expense_data');
      
      if (!expenseData) {
        return this.getEmptySummary();
      }

      const expenses = JSON.parse(expenseData);
      const monthlyExpenses = expenses.filter(expense => 
        expense.date.startsWith(currentMonth) && expense.amount > 0
      );

      const totalSpent = monthlyExpenses.reduce((sum, expense) => sum + expense.amount, 0);
      const budget = await this.getMonthlyBudget();
      const remaining = budget - totalSpent;
      const percentageUsed = budget > 0 ? (totalSpent / budget) * 100 : 0;

      // Category breakdown
      const categoryTotals = {};
      monthlyExpenses.forEach(expense => {
        const category = expense.category || 'other';
        categoryTotals[category] = (categoryTotals[category] || 0) + expense.amount;
      });

      // Top vendors
      const vendorTotals = {};
      monthlyExpenses.forEach(expense => {
        if (expense.vendor) {
          vendorTotals[expense.vendor] = (vendorTotals[expense.vendor] || 0) + expense.amount;
        }
      });

      const topVendors = Object.entries(vendorTotals)
        .map(([vendor, total]) => ({ vendor, total }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);

      return {
        totalSpent,
        budget,
        remaining,
        percentageUsed,
        categoryTotals,
        topVendors,
        expenseCount: monthlyExpenses.length,
        averagePerDay: totalSpent / new Date().getDate(),
        status: this.getBudgetStatus(percentageUsed)
      };
    } catch (error) {
      console.error('Error getting monthly summary:', error);
      return this.getEmptySummary();
    }
  }

  // Set monthly budget
  async setMonthlyBudget(amount) {
    try {
      const budget = parseFloat(amount);
      if (budget < 0) {
        throw new Error('Budget cannot be negative');
      }

      await AsyncStorage.setItem('monthly_budget', budget.toString());
      this.currentBudget = budget;

      // Check for immediate alerts
      await this.checkBudgetAlerts();

      console.log('💰 Monthly budget set to ₹' + budget);
      return budget;
    } catch (error) {
      console.error('Error setting budget:', error);
      throw error;
    }
  }

  // Get monthly budget
  async getMonthlyBudget() {
    try {
      const budget = await AsyncStorage.getItem('monthly_budget');
      return budget ? parseFloat(budget) : 0;
    } catch (error) {
      console.error('Error getting budget:', error);
      return 0;
    }
  }

  // Check and generate budget alerts
  async checkBudgetAlerts() {
    try {
      const summary = await this.getMonthlyExpenseSummary();
      const alerts = [];

      // Budget threshold alerts
      if (summary.percentageUsed >= 80 && summary.percentageUsed < 100) {
        alerts.push({
          id: `budget_warning_${Date.now()}`,
          type: 'budget_warning',
          title: 'Budget Alert',
          message: `You've used ${summary.percentageUsed.toFixed(1)}% of your monthly budget`,
          severity: 'medium',
          action: 'review_spending',
          data: summary
        });
      } else if (summary.percentageUsed >= 100) {
        alerts.push({
          id: `budget_exceeded_${Date.now()}`,
          type: 'budget_exceeded',
          title: 'Budget Exceeded',
          message: `You've exceeded your monthly budget by ₹${Math.abs(summary.remaining).toFixed(2)}`,
          severity: 'high',
          action: 'urgent_review',
          data: summary
        });
      }

      // Daily spending alerts
      const todaySpending = await this.getTodaySpending();
      const averageDaily = summary.averagePerDay;
      
      if (todaySpending > averageDaily * 2) {
        alerts.push({
          id: `high_spending_${Date.now()}`,
          type: 'high_daily_spending',
          title: 'High Spending Alert',
          message: `Today's spending (₹${todaySpending.toFixed(2)}) is unusually high`,
          severity: 'medium',
          action: 'review_today',
          data: { todaySpending, averageDaily }
        });
      }

      // Save alerts
      if (alerts.length > 0) {
        await this.saveAlerts(alerts);
        
        // Schedule notifications for high priority alerts
        for (const alert of alerts) {
          if (alert.severity === 'high') {
            await this.scheduleAlertNotification(alert);
          }
        }
      }

      return alerts;
    } catch (error) {
      console.error('Error checking budget alerts:', error);
      return [];
    }
  }

  // Get today's spending
  async getTodaySpending() {
    try {
      const today = new Date().toISOString().substring(0, 10); // YYYY-MM-DD
      const expenseData = await AsyncStorage.getItem('expense_data');
      
      if (!expenseData) return 0;

      const expenses = JSON.parse(expenseData);
      const todayExpenses = expenses.filter(expense => 
        expense.date.startsWith(today) && expense.amount > 0
      );

      return todayExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    } catch (error) {
      console.error('Error getting today spending:', error);
      return 0;
    }
  }

  // Get spending by category for charts
  async getCategorySpending(days = 30) {
    try {
      const expenses = await this.getExpenses(days);
      const categoryTotals = {};

      expenses.forEach(expense => {
        const category = expense.category || 'other';
        categoryTotals[category] = (categoryTotals[category] || 0) + expense.amount;
      });

      return Object.entries(categoryTotals).map(([category, total]) => ({
        category,
        total,
        color: this.expenseCategories[category]?.color || '#B0B0B0',
        emoji: this.expenseCategories[category]?.emoji || '📝',
        label: this.expenseCategories[category]?.label || category
      })).sort((a, b) => b.total - a.total);
    } catch (error) {
      console.error('Error getting category spending:', error);
      return [];
    }
  }

  // Delete an expense
  async deleteExpense(expenseId) {
    try {
      const expenseData = await AsyncStorage.getItem('expense_data');
      if (!expenseData) return false;

      const expenses = JSON.parse(expenseData);
      const updatedExpenses = expenses.filter(expense => expense.id !== expenseId);

      await AsyncStorage.setItem('expense_data', JSON.stringify(updatedExpenses));
      console.log('🗑️ Expense deleted:', expenseId);
      return true;
    } catch (error) {
      console.error('Error deleting expense:', error);
      return false;
    }
  }

  // Get financial alerts
  async getFinancialAlerts() {
    try {
      const alerts = await AsyncStorage.getItem('financial_alerts');
      return alerts ? JSON.parse(alerts) : [];
    } catch (error) {
      console.error('Error getting financial alerts:', error);
      return [];
    }
  }

  // Save alerts
  async saveAlerts(newAlerts) {
    try {
      const existingAlerts = await this.getFinancialAlerts();
      const allAlerts = [...existingAlerts, ...newAlerts];
      
      // Keep only recent alerts (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentAlerts = allAlerts.filter(alert => 
        new Date(alert.date || Date.now()) >= thirtyDaysAgo
      );

      await AsyncStorage.setItem('financial_alerts', JSON.stringify(recentAlerts));
      return recentAlerts;
    } catch (error) {
      console.error('Error saving alerts:', error);
      return [];
    }
  }

  // Schedule alert notification
  async scheduleAlertNotification(alert) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `💰 ${alert.title}`,
          body: alert.message,
          data: { type: 'financial_alert', alert }
        },
        trigger: null // Immediate notification
      });
    } catch (error) {
      console.error('Error scheduling alert notification:', error);
    }
  }

  // Helper methods
  getBudgetStatus(percentageUsed) {
    if (percentageUsed < 50) return 'good';
    if (percentageUsed < 80) return 'warning';
    return 'critical';
  }

  getEmptySummary() {
    return {
      totalSpent: 0,
      budget: 0,
      remaining: 0,
      percentageUsed: 0,
      categoryTotals: {},
      topVendors: [],
      expenseCount: 0,
      averagePerDay: 0,
      status: 'good'
    };
  }

  async cleanupOldData() {
    try {
      // Clean up expenses older than 90 days
      const expenseData = await AsyncStorage.getItem('expense_data');
      if (expenseData) {
        const expenses = JSON.parse(expenseData);
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

        const recentExpenses = expenses.filter(expense => 
          new Date(expense.date) >= ninetyDaysAgo
        );

        if (recentExpenses.length !== expenses.length) {
          await AsyncStorage.setItem('expense_data', JSON.stringify(recentExpenses));
          console.log(`🧹 Cleaned up ${expenses.length - recentExpenses.length} old expenses`);
        }
      }
    } catch (error) {
      console.error('Error cleaning up old data:', error);
    }
  }

  // Export financial data for backup
  async exportFinancialData() {
    try {
      const expenseData = await AsyncStorage.getItem('expense_data');
      const budget = await AsyncStorage.getItem('monthly_budget');
      const alerts = await AsyncStorage.getItem('financial_alerts');

      return {
        expenses: expenseData ? JSON.parse(expenseData) : [],
        budget: budget ? parseFloat(budget) : 0,
        alerts: alerts ? JSON.parse(alerts) : [],
        exportDate: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error exporting financial data:', error);
      return null;
    }
  }

  // Get expense categories
  getExpenseCategories() {
    return this.expenseCategories;
  }
}

// Export singleton instance
export default new FinancialService();