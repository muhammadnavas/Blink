import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
    Alert,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import financialService from '../services/financialService';

const QuickExpenseTracker = ({ isDarkMode, onClose, onExpenseAdded }) => {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('other');
  const [loading, setLoading] = useState(false);
  const [todaySpending, setTodaySpending] = useState(0);

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
  };

  useEffect(() => {
    loadTodaySpending();
  }, []);

  const loadTodaySpending = async () => {
    try {
      const spending = await financialService.getTodaySpending();
      setTodaySpending(spending);
    } catch (error) {
      console.error('Error loading today spending:', error);
    }
  };

  const handleAddExpense = async () => {
    try {
      if (!amount || !description) {
        Alert.alert('Error', 'Please fill in amount and description');
        return;
      }

      const expenseAmount = parseFloat(amount);
      if (isNaN(expenseAmount) || expenseAmount <= 0) {
        Alert.alert('Error', 'Please enter a valid amount');
        return;
      }

      setLoading(true);

      await financialService.addExpense({
        amount: expenseAmount,
        description,
        category
      });

      // Reset form
      setAmount('');
      setDescription('');
      setCategory('other');

      // Update today's spending
      await loadTodaySpending();

      // Notify parent
      if (onExpenseAdded) {
        onExpenseAdded();
      }

      Alert.alert('Success', 'Expense added successfully', [
        { text: 'Add Another', style: 'default' },
        { text: 'Close', onPress: onClose, style: 'cancel' }
      ]);
    } catch (error) {
      console.error('Error adding expense:', error);
      Alert.alert('Error', 'Failed to add expense');
    } finally {
      setLoading(false);
    }
  };

  const categories = financialService.getExpenseCategories();
  const quickAmounts = ['50', '100', '200', '500', '1000'];

  return (
    <Modal
      visible={true}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]}>Quick Expense</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          {/* Today's spending display */}
          <View style={[styles.todaySpending, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <Text style={[styles.todayLabel, { color: theme.textSecondary }]}>Today's Spending</Text>
            <Text style={[styles.todayAmount, { color: theme.error }]}>₹{todaySpending.toFixed(2)}</Text>
          </View>

          {/* Quick amount buttons */}
          <View style={styles.quickAmounts}>
            <Text style={[styles.sectionLabel, { color: theme.text }]}>Quick Amount</Text>
            <View style={styles.amountButtons}>
              {quickAmounts.map((quickAmount) => (
                <TouchableOpacity
                  key={quickAmount}
                  style={[
                    styles.amountButton,
                    { 
                      backgroundColor: amount === quickAmount ? theme.accent : theme.background,
                      borderColor: theme.border
                    }
                  ]}
                  onPress={() => setAmount(quickAmount)}
                >
                  <Text style={[
                    styles.amountButtonText,
                    { color: amount === quickAmount ? '#FFFFFF' : theme.text }
                  ]}>
                    ₹{quickAmount}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Custom amount input */}
          <TextInput
            style={[
              styles.input,
              { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }
            ]}
            placeholder="Custom amount (₹)"
            placeholderTextColor={theme.textSecondary}
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
          />

          {/* Description input */}
          <TextInput
            style={[
              styles.input,
              { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }
            ]}
            placeholder="What did you spend on?"
            placeholderTextColor={theme.textSecondary}
            value={description}
            onChangeText={setDescription}
          />

          {/* Category selection */}
          <View style={styles.categories}>
            <Text style={[styles.sectionLabel, { color: theme.text }]}>Category</Text>
            <View style={styles.categoryGrid}>
              {Object.entries(categories).slice(0, 6).map(([key, cat]) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.categoryButton,
                    {
                      backgroundColor: category === key ? cat.color + '30' : theme.background,
                      borderColor: category === key ? cat.color : theme.border
                    }
                  ]}
                  onPress={() => setCategory(key)}
                >
                  <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                  <Text style={[styles.categoryText, { color: theme.text }]}>{key}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Action buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton, { backgroundColor: theme.background }]}
              onPress={onClose}
            >
              <Text style={[styles.buttonText, { color: theme.text }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.button,
                styles.addButton,
                { backgroundColor: theme.accent, opacity: loading ? 0.6 : 1 }
              ]}
              onPress={handleAddExpense}
              disabled={loading}
            >
              <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>
                {loading ? 'Adding...' : 'Add Expense'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    borderRadius: 16,
    padding: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  todaySpending: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 20,
    alignItems: 'center',
  },
  todayLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  todayAmount: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  quickAmounts: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  amountButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  amountButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  amountButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  categories: {
    marginBottom: 20,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryButton: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    width: '30%',
  },
  categoryEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  categoryText: {
    fontSize: 12,
    textAlign: 'center',
    textTransform: 'capitalize',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  addButton: {
    // backgroundColor set dynamically
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default QuickExpenseTracker;