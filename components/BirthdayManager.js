import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    FlatList,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import calendarService from '../services/calendarService';

const BirthdayManager = ({ isDarkMode, onClose, presetDate = null }) => {
  const [birthdays, setBirthdays] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBirthday, setEditingBirthday] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    date: presetDate || '',
    year: '',
    relationship: 'Friend',
    phone: '',
    email: '',
    notes: '',
    reminders: [0, 1, 7] // Days before to remind
  });

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
    card: isDarkMode ? '#2D2D2D' : '#FFFFFF',
    birthday: '#FF6B9D'
  };

  const relationships = [
    'Family', 'Friend', 'Colleague', 'Partner', 'Neighbor', 
    'Acquaintance', 'Contact', 'Other'
  ];

  const reminderOptions = [
    { days: 0, label: 'On the day' },
    { days: 1, label: '1 day before' },
    { days: 3, label: '3 days before' },
    { days: 7, label: '1 week before' },
    { days: 14, label: '2 weeks before' },
    { days: 30, label: '1 month before' }
  ];

  const loadBirthdays = useCallback(async () => {
    try {
      setLoading(true);
      await calendarService.initialize();
      
      const birthdayData = await calendarService.loadBirthdays();
      setBirthdays(birthdayData);
      
      const birthdayStats = await calendarService.getBirthdayStats();
      setStats(birthdayStats);
      
    } catch (error) {
      console.error('Error loading birthdays:', error);
      Alert.alert('Error', 'Failed to load birthdays');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBirthdays();
  }, [loadBirthdays]);

  useEffect(() => {
    if (presetDate) {
      setFormData(prev => ({ ...prev, date: presetDate }));
      setShowAddModal(true);
    }
  }, [presetDate]);

  const resetForm = () => {
    setFormData({
      name: '',
      date: presetDate || '',
      year: '',
      relationship: 'Friend',
      phone: '',
      email: '',
      notes: '',
      reminders: [0, 1, 7]
    });
    setEditingBirthday(null);
  };

  const handleSaveBirthday = async () => {
    try {
      // Validate required fields
      if (!formData.name.trim()) {
        Alert.alert('Error', 'Please enter a name');
        return;
      }
      
      if (!formData.date.trim()) {
        Alert.alert('Error', 'Please enter a date (MM-DD format)');
        return;
      }

      // Validate date format
      const dateRegex = /^\d{2}-\d{2}$/;
      if (!dateRegex.test(formData.date)) {
        Alert.alert('Error', 'Please use MM-DD format for date (e.g., 03-15)');
        return;
      }

      // Validate month and day
      const [month, day] = formData.date.split('-').map(Number);
      if (month < 1 || month > 12 || day < 1 || day > 31) {
        Alert.alert('Error', 'Please enter a valid date');
        return;
      }

      const birthdayData = {
        ...formData,
        name: formData.name.trim(),
        year: formData.year ? parseInt(formData.year) : null
      };

      if (editingBirthday) {
        await calendarService.updateBirthday(editingBirthday.id, birthdayData);
        Alert.alert('Success', 'Birthday updated successfully');
      } else {
        await calendarService.addBirthday(birthdayData);
        Alert.alert('Success', 'Birthday added successfully');
      }

      // Reload data
      await loadBirthdays();
      
      // Reset form and close modal
      resetForm();
      setShowAddModal(false);
      
    } catch (error) {
      console.error('Error saving birthday:', error);
      Alert.alert('Error', error.message || 'Failed to save birthday');
    }
  };

  const handleEditBirthday = (birthday) => {
    setFormData({
      name: birthday.name,
      date: birthday.date,
      year: birthday.year?.toString() || '',
      relationship: birthday.relationship,
      phone: birthday.phone || '',
      email: birthday.email || '',
      notes: birthday.notes || '',
      reminders: birthday.reminders || [0, 1, 7]
    });
    setEditingBirthday(birthday);
    setShowAddModal(true);
  };

  const handleDeleteBirthday = (birthday) => {
    Alert.alert(
      'Delete Birthday',
      `Are you sure you want to delete ${birthday.name}'s birthday?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await calendarService.deleteBirthday(birthday.id);
              await loadBirthdays();
              Alert.alert('Success', 'Birthday deleted successfully');
            } catch (error) {
              console.error('Error deleting birthday:', error);
              Alert.alert('Error', 'Failed to delete birthday');
            }
          }
        }
      ]
    );
  };

  const handleImportFromContacts = async () => {
    try {
      Alert.alert(
        'Import from Contacts',
        'This will import birthdays from your device contacts. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Import',
            onPress: async () => {
              try {
                const importedBirthdays = await calendarService.importBirthdaysFromContacts();
                await loadBirthdays();
                Alert.alert(
                  'Import Complete', 
                  `Imported ${importedBirthdays.length} birthdays from contacts`
                );
              } catch (error) {
                console.error('Error importing contacts:', error);
                Alert.alert('Error', error.message || 'Failed to import contacts');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error with contact import:', error);
    }
  };

  const toggleReminder = (days) => {
    const currentReminders = formData.reminders || [];
    const newReminders = currentReminders.includes(days)
      ? currentReminders.filter(d => d !== days)
      : [...currentReminders, days].sort((a, b) => a - b);
    
    setFormData(prev => ({ ...prev, reminders: newReminders }));
  };

  const formatBirthdayDisplay = (birthday) => {
    const [month, day] = birthday.date.split('-');
    const date = new Date(2000, parseInt(month) - 1, parseInt(day));
    const dateStr = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    
    if (birthday.year) {
      const currentYear = new Date().getFullYear();
      const age = currentYear - birthday.year;
      return `${dateStr} (${age} years old)`;
    }
    
    return dateStr;
  };

  const renderBirthdayItem = ({ item: birthday }) => (
    <View style={[styles.birthdayItem, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.birthdayHeader}>
        <View style={styles.birthdayInfo}>
          <Text style={[styles.birthdayName, { color: theme.text }]}>
            {birthday.name}
          </Text>
          <Text style={[styles.birthdayDate, { color: theme.textSecondary }]}>
            {formatBirthdayDisplay(birthday)}
          </Text>
          <Text style={[styles.birthdayRelation, { color: theme.birthday }]}>
            {birthday.relationship}
          </Text>
        </View>
        
        <View style={styles.birthdayActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleEditBirthday(birthday)}
          >
            <Ionicons name="pencil" size={18} color={theme.accent} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDeleteBirthday(birthday)}
          >
            <Ionicons name="trash" size={18} color={theme.error} />
          </TouchableOpacity>
        </View>
      </View>
      
      {birthday.notes && (
        <Text style={[styles.birthdayNotes, { color: theme.textSecondary }]}>
          "{birthday.notes}"
        </Text>
      )}
      
      <View style={styles.reminderInfo}>
        <Text style={[styles.reminderText, { color: theme.textSecondary }]}>
          Reminders: {birthday.reminders?.map(d => 
            d === 0 ? 'same day' : `${d}d before`
          ).join(', ') || 'none'}
        </Text>
      </View>
    </View>
  );

  const renderStats = () => {
    if (!stats) return null;
    
    return (
      <View style={[styles.statsContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.statsTitle, { color: theme.text }]}>📊 Birthday Stats</Text>
        
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.accent }]}>{stats.totalBirthdays}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Total</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.warning }]}>{stats.thisMonth}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>This Month</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.success }]}>{stats.upcoming}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Upcoming</Text>
          </View>
          
          {stats.averageAge > 0 && (
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.birthday }]}>{stats.averageAge}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Avg Age</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer, { backgroundColor: theme.background }]}>
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
          Loading birthdays...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>🎂 Birthday Manager</Text>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={24} color={theme.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Stats */}
        {renderStats()}

        {/* Action Buttons */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: theme.accent }]}
            onPress={() => {
              resetForm();
              setShowAddModal(true);
            }}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Add Birthday</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.secondaryButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={handleImportFromContacts}
          >
            <Ionicons name="people" size={20} color={theme.accent} />
            <Text style={[styles.secondaryButtonText, { color: theme.accent }]}>Import Contacts</Text>
          </TouchableOpacity>
        </View>

        {/* Birthday List */}
        <FlatList
          data={birthdays.filter(b => b.isActive)}
          keyExtractor={(item) => item.id}
          renderItem={renderBirthdayItem}
          scrollEnabled={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                No birthdays added yet
              </Text>
              <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>
                Add birthdays to get yearly reminders!
              </Text>
            </View>
          }
        />
      </ScrollView>

      {/* Add/Edit Birthday Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                {editingBirthday ? 'Edit Birthday' : 'Add Birthday'}
              </Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              {/* Name */}
              <TextInput
                style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                placeholder="Name *"
                placeholderTextColor={theme.textSecondary}
                value={formData.name}
                onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
              />

              {/* Date */}
              <TextInput
                style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                placeholder="Date (MM-DD) *"
                placeholderTextColor={theme.textSecondary}
                value={formData.date}
                onChangeText={(text) => setFormData(prev => ({ ...prev, date: text }))}
                maxLength={5}
              />

              {/* Birth Year */}
              <TextInput
                style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                placeholder="Birth Year (optional)"
                placeholderTextColor={theme.textSecondary}
                value={formData.year}
                onChangeText={(text) => setFormData(prev => ({ ...prev, year: text }))}
                keyboardType="numeric"
                maxLength={4}
              />

              {/* Relationship */}
              <Text style={[styles.sectionLabel, { color: theme.text }]}>Relationship</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.relationshipSelector}>
                {relationships.map((rel) => (
                  <TouchableOpacity
                    key={rel}
                    style={[
                      styles.relationshipOption,
                      {
                        backgroundColor: formData.relationship === rel ? theme.accent + '30' : theme.surface,
                        borderColor: formData.relationship === rel ? theme.accent : theme.border
                      }
                    ]}
                    onPress={() => setFormData(prev => ({ ...prev, relationship: rel }))}
                  >
                    <Text style={[
                      styles.relationshipText,
                      { color: formData.relationship === rel ? theme.accent : theme.text }
                    ]}>
                      {rel}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Contact Info */}
              <TextInput
                style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                placeholder="Phone (optional)"
                placeholderTextColor={theme.textSecondary}
                value={formData.phone}
                onChangeText={(text) => setFormData(prev => ({ ...prev, phone: text }))}
                keyboardType="phone-pad"
              />

              <TextInput
                style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                placeholder="Email (optional)"
                placeholderTextColor={theme.textSecondary}
                value={formData.email}
                onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
                keyboardType="email-address"
              />

              {/* Notes */}
              <TextInput
                style={[styles.input, styles.notesInput, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                placeholder="Notes (optional)"
                placeholderTextColor={theme.textSecondary}
                value={formData.notes}
                onChangeText={(text) => setFormData(prev => ({ ...prev, notes: text }))}
                multiline
                numberOfLines={3}
              />

              {/* Reminder Settings */}
              <Text style={[styles.sectionLabel, { color: theme.text }]}>Reminder Times</Text>
              <View style={styles.reminderOptions}>
                {reminderOptions.map((option) => (
                  <TouchableOpacity
                    key={option.days}
                    style={[
                      styles.reminderOption,
                      {
                        backgroundColor: formData.reminders?.includes(option.days) 
                          ? theme.accent + '30' : theme.surface,
                        borderColor: formData.reminders?.includes(option.days) 
                          ? theme.accent : theme.border
                      }
                    ]}
                    onPress={() => toggleReminder(option.days)}
                  >
                    <Text style={[
                      styles.reminderOptionText,
                      { 
                        color: formData.reminders?.includes(option.days) 
                          ? theme.accent : theme.text 
                      }
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { backgroundColor: theme.surface }]}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: theme.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton, { backgroundColor: theme.accent }]}
                onPress={handleSaveBirthday}
              >
                <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>
                  {editingBirthday ? 'Update' : 'Save'}
                </Text>
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
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
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
  statsContainer: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  birthdayItem: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  birthdayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  birthdayInfo: {
    flex: 1,
  },
  birthdayName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  birthdayDate: {
    fontSize: 14,
    marginBottom: 4,
  },
  birthdayRelation: {
    fontSize: 12,
    fontWeight: '600',
  },
  birthdayActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  birthdayNotes: {
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 8,
  },
  reminderInfo: {
    marginTop: 8,
  },
  reminderText: {
    fontSize: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
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
  notesInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  relationshipSelector: {
    marginBottom: 20,
  },
  relationshipOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  relationshipText: {
    fontSize: 14,
  },
  reminderOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  reminderOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  reminderOptionText: {
    fontSize: 12,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  saveButton: {
    // backgroundColor set dynamically
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default BirthdayManager;