import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    Dimensions,
    FlatList,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import financialService from '../services/financialService';

const { width } = Dimensions.get('window');

const FinancialDashboard = ({ isDarkMode, onClose }) => {
  const [summary, setSummary] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState(30);

  // Add expense form
  const [newExpense, setNewExpense] = useState({
    amount: '',
    description: '',
    category: 'other',
    vendor: ''
  });

  const [budgetInput, setBudgetInput] = useState('');

  const theme = {
    background: isDarkMode ? '#121212' : '#FFFFFF',
    surface: isDarkMode ? '#1E1E1E' : '#F5F5F5',
    text: isDarkMode ? '#FFFFFF' : '#000000',
    textSecondary: isDarkMode ? '#B0B0B0' : '#666666',
    accent: '#4A90E2',
    success: '#4CAF50',
    warning: '#FF9800',
    error: '#F44336',
    border: isDarkMode ? '#333333' : '#E0E0E0',
    card: isDarkMode ? '#2D2D2D' : '#FFFFFF'
  };

  const loadFinancialData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Initialize service
      await financialService.initialize();
      
      // Load all data
      const [summaryData, expenseData, categorySpending, alertData] = await Promise.all([
        financialService.getMonthlyExpenseSummary(),
        financialService.getExpenses(selectedPeriod),
        financialService.getCategorySpending(selectedPeriod),
        financialService.getFinancialAlerts()
      ]);

      setSummary(summaryData);
      setExpenses(expenseData);
      setCategoryData(categorySpending);
      setAlerts(alertData);
      
      // Set budget input to current budget
      setBudgetInput(summaryData.budget.toString());
      
    } catch (error) {
      console.error('Error loading financial data:', error);
      Alert.alert('Error', 'Failed to load financial data');
    } finally {
      setLoading(false);
    }
  }, [selectedPeriod]);

  useEffect(() => {
    loadFinancialData();
  }, [loadFinancialData]);

  const handleAddExpense = async () => {
    try {
      if (!newExpense.amount || !newExpense.description) {
        Alert.alert('Error', 'Please fill in amount and description');
        return;
      }

      const amount = parseFloat(newExpense.amount);
      if (isNaN(amount) || amount <= 0) {
        Alert.alert('Error', 'Please enter a valid amount');
        return;
      }

      await financialService.addExpense({
        ...newExpense,
        amount
      });

      // Reset form
      setNewExpense({
        amount: '',
        description: '',
        category: 'other',
        vendor: ''
      });

      setShowAddExpense(false);
      await loadFinancialData();
      
      Alert.alert('Success', 'Expense added successfully');
    } catch (error) {
      console.error('Error adding expense:', error);
      Alert.alert('Error', 'Failed to add expense');
    }
  };

  const handleSetBudget = async () => {
    try {
      const budget = parseFloat(budgetInput);
      if (isNaN(budget) || budget < 0) {
        Alert.alert('Error', 'Please enter a valid budget amount');
        return;
      }

      await financialService.setMonthlyBudget(budget);
      setShowBudgetModal(false);
      await loadFinancialData();
      
      Alert.alert('Success', 'Budget updated successfully');
    } catch (error) {
      console.error('Error setting budget:', error);
      Alert.alert('Error', 'Failed to update budget');
    }
  };

  const handleDeleteExpense = async (expenseId) => {
    Alert.alert(
      'Delete Expense',
      'Are you sure you want to delete this expense?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await financialService.deleteExpense(expenseId);
            await loadFinancialData();
          }
        }
      ]
    );
  };

  const getBudgetColor = (status) => {
    switch (status) {
      case 'good': return theme.success;
      case 'warning': return theme.warning;
      case 'critical': return theme.error;
      default: return theme.textSecondary;
    }
  };

  const formatCurrency = (amount) => {
    return `₹${amount.toFixed(2)}`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderExpenseItem = ({ item }) => (
    <View style={[styles.expenseItem, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.expenseHeader}>
        <View style={styles.expenseInfo}>
          <Text style={[styles.expenseDescription, { color: theme.text }]}>
            {item.description}
          </Text>
          <Text style={[styles.expenseDetails, { color: theme.textSecondary }]}>
            {item.vendor && `${item.vendor} • `}
            {formatDate(item.date)}
          </Text>
        </View>
        <View style={styles.expenseActions}>
          <Text style={[styles.expenseAmount, { color: theme.error }]}>
            -{formatCurrency(item.amount)}
          </Text>
          <TouchableOpacity
            onPress={() => handleDeleteExpense(item.id)}
            style={styles.deleteButton}
          >
            <Ionicons name="trash-outline" size={16} color={theme.error} />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.expenseCategory}>
        <Text style={[styles.categoryTag, { 
          backgroundColor: financialService.getExpenseCategories()[item.category]?.color + '20',
          color: financialService.getExpenseCategories()[item.category]?.color || theme.textSecondary
        }]}>
          {financialService.getExpenseCategories()[item.category]?.emoji || '📝'} {financialService.getExpenseCategories()[item.category]?.label || item.category}
        </Text>
      </View>
    </View>
  );

  const renderCategoryItem = ({ item }) => (
    <View style={[styles.categoryItem, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.categoryHeader}>
        <Text style={styles.categoryEmoji}>{item.emoji}</Text>
        <View style={styles.categoryInfo}>
          <Text style={[styles.categoryLabel, { color: theme.text }]}>{item.label}</Text>
          <Text style={[styles.categoryAmount, { color: theme.text }]}>{formatCurrency(item.total)}</Text>
        </View>
      </View>
      <View style={[styles.categoryBar, { backgroundColor: theme.border }]}>
        <View 
          style={[
            styles.categoryProgress, 
            { 
              backgroundColor: item.color,
              width: `${Math.min((item.total / (summary?.totalSpent || 1)) * 100, 100)}%`
            }
          ]} 
        />
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>Financial Dashboard</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading financial data...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Financial Dashboard</Text>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={24} color={theme.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Budget Overview */}
        <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Monthly Budget</Text>
            <TouchableOpacity onPress={() => setShowBudgetModal(true)}>
              <Ionicons name="settings-outline" size={20} color={theme.accent} />
            </TouchableOpacity>
          </View>
          
          {summary && (
            <>
              <View style={styles.budgetOverview}>
                <View style={styles.budgetItem}>
                  <Text style={[styles.budgetLabel, { color: theme.textSecondary }]}>Budget</Text>
                  <Text style={[styles.budgetValue, { color: theme.text }]}>{formatCurrency(summary.budget)}</Text>
                </View>
                <View style={styles.budgetItem}>
                  <Text style={[styles.budgetLabel, { color: theme.textSecondary }]}>Spent</Text>
                  <Text style={[styles.budgetValue, { color: theme.error }]}>{formatCurrency(summary.totalSpent)}</Text>
                </View>
                <View style={styles.budgetItem}>
                  <Text style={[styles.budgetLabel, { color: theme.textSecondary }]}>Remaining</Text>
                  <Text style={[styles.budgetValue, { color: getBudgetColor(summary.status) }]}>{formatCurrency(summary.remaining)}</Text>
                </View>
              </View>
              
              <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
                <View 
                  style={[
                    styles.progressFill, 
                    { 
                      backgroundColor: getBudgetColor(summary.status),
                      width: `${Math.min(summary.percentageUsed, 100)}%`
                    }
                  ]} 
                />
              </View>
              <Text style={[styles.progressText, { color: theme.textSecondary }]}>
                {summary.percentageUsed.toFixed(1)}% used
              </Text>
            </>
          )}
        </View>

        {/* Quick Stats */}
        <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Quick Stats</Text>
          {summary && (
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.accent }]}>{summary.expenseCount}</Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Transactions</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.warning }]}>{formatCurrency(summary.averagePerDay)}</Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Daily Avg</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.success }]}>{categoryData.length}</Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Categories</Text>
              </View>
            </View>
          )}
        </View>

        {/* Alerts */}
        {alerts.length > 0 && (
          <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Alerts</Text>
            {alerts.slice(0, 3).map((alert, index) => (
              <View key={index} style={[styles.alertItem, { borderColor: theme.error + '30' }]}>
                <Ionicons name="warning" size={16} color={theme.error} />
                <Text style={[styles.alertText, { color: theme.text }]}>{alert.message}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Category Spending */}
        <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Spending by Category</Text>
          <FlatList
            data={categoryData.slice(0, 5)}
            keyExtractor={(item) => item.category}
            renderItem={renderCategoryItem}
            scrollEnabled={false}
          />
        </View>

        {/* Recent Expenses */}
        <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent Expenses</Text>
            <TouchableOpacity onPress={() => setShowAddExpense(true)}>
              <Ionicons name="add-circle-outline" size={20} color={theme.accent} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={expenses.slice(0, 10)}
            keyExtractor={(item) => item.id}
            renderItem={renderExpenseItem}
            scrollEnabled={false}
            ListEmptyComponent={
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                No expenses found. Add your first expense!
              </Text>
            }
          />
        </View>
      </ScrollView>

      {/* Add Expense Modal */}
      <Modal
        visible={showAddExpense}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddExpense(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Add Expense</Text>
              <TouchableOpacity onPress={() => setShowAddExpense(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                placeholder="Amount (₹)"
                placeholderTextColor={theme.textSecondary}
                value={newExpense.amount}
                onChangeText={(text) => setNewExpense({...newExpense, amount: text})}
                keyboardType="numeric"
              />

              <TextInput
                style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                placeholder="Description"
                placeholderTextColor={theme.textSecondary}
                value={newExpense.description}
                onChangeText={(text) => setNewExpense({...newExpense, description: text})}
              />

              <TextInput
                style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                placeholder="Vendor (optional)"
                placeholderTextColor={theme.textSecondary}
                value={newExpense.vendor}
                onChangeText={(text) => setNewExpense({...newExpense, vendor: text})}
              />

              <Text style={[styles.inputLabel, { color: theme.text }]}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categorySelector}>
                {Object.entries(financialService.getExpenseCategories()).map(([key, category]) => (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.categoryOption,
                      { 
                        backgroundColor: newExpense.category === key ? category.color + '30' : theme.surface,
                        borderColor: newExpense.category === key ? category.color : theme.border
                      }
                    ]}
                    onPress={() => setNewExpense({...newExpense, category: key})}
                  >
                    <Text style={styles.categoryEmoji}>{category.emoji}</Text>
                    <Text style={[styles.categoryOptionText, { color: theme.text }]}>{category.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { backgroundColor: theme.surface }]}
                onPress={() => setShowAddExpense(false)}
              >
                <Text style={[styles.modalButtonText, { color: theme.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton, { backgroundColor: theme.accent }]}
                onPress={handleAddExpense}
              >
                <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Budget Modal */}
      <Modal
        visible={showBudgetModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowBudgetModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Set Monthly Budget</Text>
              <TouchableOpacity onPress={() => setShowBudgetModal(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
              placeholder="Budget Amount (₹)"
              placeholderTextColor={theme.textSecondary}
              value={budgetInput}
              onChangeText={setBudgetInput}
              keyboardType="numeric"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { backgroundColor: theme.surface }]}
                onPress={() => setShowBudgetModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: theme.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton, { backgroundColor: theme.accent }]}
                onPress={handleSetBudget}
              >
                <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  budgetOverview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  budgetItem: {
    alignItems: 'center',
  },
  budgetLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  budgetValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    textAlign: 'center',
    fontSize: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  alertText: {
    marginLeft: 8,
    flex: 1,
    fontSize: 14,
  },
  categoryItem: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryEmoji: {
    fontSize: 20,
    marginRight: 12,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  categoryAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 2,
  },
  categoryBar: {
    height: 4,
    borderRadius: 2,
  },
  categoryProgress: {
    height: '100%',
    borderRadius: 2,
  },
  expenseItem: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  expenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  expenseInfo: {
    flex: 1,
  },
  expenseDescription: {
    fontSize: 16,
    fontWeight: '500',
  },
  expenseDetails: {
    fontSize: 12,
    marginTop: 2,
  },
  expenseActions: {
    alignItems: 'flex-end',
  },
  expenseAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  deleteButton: {
    marginTop: 4,
    padding: 4,
  },
  expenseCategory: {
    marginTop: 8,
  },
  categoryTag: {
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
    fontStyle: 'italic',
    padding: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width * 0.9,
    maxHeight: '80%',
    borderRadius: 16,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalScroll: {
    maxHeight: 400,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  categorySelector: {
    marginBottom: 20,
  },
  categoryOption: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 12,
    minWidth: 80,
  },
  categoryOptionText: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    marginRight: 8,
  },
  saveButton: {
    marginLeft: 8,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default FinancialDashboard;