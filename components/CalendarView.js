import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    Dimensions,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import calendarService from '../services/calendarService';

const { width } = Dimensions.get('window');
const CELL_SIZE = (width - 40) / 7;

const CalendarView = ({ isDarkMode, onDateSelect, onAddBirthday }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarData, setCalendarData] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [upcomingBirthdays, setUpcomingBirthdays] = useState([]);
  const [showDayModal, setShowDayModal] = useState(false);
  const [selectedDayData, setSelectedDayData] = useState(null);
  const [loading, setLoading] = useState(true);

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
    birthday: '#FF6B9D',
    today: '#4A90E2'
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const loadCalendarData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Initialize calendar service
      await calendarService.initialize();
      
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      
      // Get calendar data for current month
      const monthData = calendarService.getCalendarMonth(year, month);
      setCalendarData(monthData);
      
      // Get upcoming birthdays
      const upcoming = calendarService.getUpcomingBirthdays(30);
      setUpcomingBirthdays(upcoming);
      
    } catch (error) {
      console.error('Error loading calendar data:', error);
      Alert.alert('Error', 'Failed to load calendar data');
    } finally {
      setLoading(false);
    }
  }, [currentDate]);

  useEffect(() => {
    loadCalendarData();
  }, [loadCalendarData]);

  const navigateMonth = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const handleDatePress = (dayData) => {
    if (!dayData) return;
    
    setSelectedDate(dayData.date);
    setSelectedDayData(dayData);
    
    if (dayData.hasBirthdays) {
      setShowDayModal(true);
    } else if (onDateSelect) {
      onDateSelect(dayData.date);
    }
  };

  const handleAddBirthdayForDate = () => {
    if (selectedDayData && onAddBirthday) {
      const month = (selectedDayData.date.getMonth() + 1).toString().padStart(2, '0');
      const day = selectedDayData.date.getDate().toString().padStart(2, '0');
      onAddBirthday(`${month}-${day}`);
    }
    setShowDayModal(false);
  };

  const renderCalendarHeader = () => (
    <View style={[styles.calendarHeader, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <TouchableOpacity 
        style={styles.navButton}
        onPress={() => navigateMonth(-1)}
      >
        <Ionicons name="chevron-back" size={24} color={theme.text} />
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.monthYearButton}>
        <Text style={[styles.monthYearText, { color: theme.text }]}>
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.navButton}
        onPress={() => navigateMonth(1)}
      >
        <Ionicons name="chevron-forward" size={24} color={theme.text} />
      </TouchableOpacity>
    </View>
  );

  const renderDayNames = () => (
    <View style={styles.dayNamesRow}>
      {dayNames.map((dayName) => (
        <View key={dayName} style={[styles.dayNameCell, { width: CELL_SIZE }]}>
          <Text style={[styles.dayNameText, { color: theme.textSecondary }]}>
            {dayName}
          </Text>
        </View>
      ))}
    </View>
  );

  const renderCalendarDay = (dayData, index) => {
    if (!dayData) {
      return (
        <View 
          key={`empty-${index}`} 
          style={[styles.dayCell, { width: CELL_SIZE, height: CELL_SIZE }]} 
        />
      );
    }

    const isSelected = selectedDate && 
      dayData.date.toDateString() === selectedDate.toDateString();

    return (
      <TouchableOpacity
        key={dayData.day}
        style={[
          styles.dayCell,
          { 
            width: CELL_SIZE, 
            height: CELL_SIZE,
            backgroundColor: isSelected ? theme.accent + '30' : 'transparent'
          },
          dayData.isToday && { backgroundColor: theme.today + '20' },
          dayData.hasBirthdays && { borderColor: theme.birthday, borderWidth: 2 }
        ]}
        onPress={() => handleDatePress(dayData)}
      >
        <Text style={[
          styles.dayText,
          { color: theme.text },
          dayData.isToday && { color: theme.today, fontWeight: 'bold' },
          isSelected && { color: theme.accent, fontWeight: 'bold' }
        ]}>
          {dayData.day}
        </Text>
        
        {dayData.hasBirthdays && (
          <View style={styles.birthdayIndicators}>
            {dayData.birthdays.slice(0, 3).map((birthday, idx) => (
              <View 
                key={birthday.id}
                style={[styles.birthdayDot, { backgroundColor: theme.birthday }]} 
              />
            ))}
            {dayData.birthdays.length > 3 && (
              <Text style={[styles.moreIndicator, { color: theme.birthday }]}>
                +{dayData.birthdays.length - 3}
              </Text>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderCalendarGrid = () => {
    if (!calendarData) return null;

    const rows = [];
    const days = calendarData.days;
    
    for (let i = 0; i < days.length; i += 7) {
      const weekDays = days.slice(i, i + 7);
      rows.push(
        <View key={i} style={styles.weekRow}>
          {weekDays.map((dayData, index) => renderCalendarDay(dayData, i + index))}
        </View>
      );
    }

    return <View style={styles.calendarGrid}>{rows}</View>;
  };

  const renderUpcomingBirthdays = () => (
    <View style={[styles.upcomingSection, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>
        🎂 Upcoming Birthdays
      </Text>
      
      {upcomingBirthdays.length === 0 ? (
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
          No upcoming birthdays
        </Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {upcomingBirthdays.slice(0, 10).map((birthday) => (
            <View 
              key={birthday.id} 
              style={[styles.birthdayCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
            >
              <Text style={[styles.birthdayName, { color: theme.text }]}>
                {birthday.name}
              </Text>
              <Text style={[styles.birthdayDate, { color: theme.textSecondary }]}>
                {formatBirthdayDate(birthday)}
              </Text>
              {birthday.age && (
                <Text style={[styles.birthdayAge, { color: theme.birthday }]}>
                  Turning {birthday.age}
                </Text>
              )}
              <Text style={[styles.daysUntil, { color: theme.accent }]}>
                {birthday.daysUntil === 0 ? 'Today!' : 
                 birthday.daysUntil === 1 ? 'Tomorrow' : 
                 `${birthday.daysUntil} days`}
              </Text>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );

  const formatBirthdayDate = (birthday) => {
    const [month, day] = birthday.date.split('-');
    const date = new Date(2000, parseInt(month) - 1, parseInt(day));
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer, { backgroundColor: theme.background }]}>
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
          Loading calendar...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Calendar Header */}
        {renderCalendarHeader()}
        
        {/* Day Names */}
        {renderDayNames()}
        
        {/* Calendar Grid */}
        {renderCalendarGrid()}
        
        {/* Calendar Stats */}
        {calendarData && (
          <View style={[styles.statsSection, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.statsText, { color: theme.textSecondary }]}>
              {calendarData.totalBirthdays} birthdays this month
            </Text>
          </View>
        )}
        
        {/* Upcoming Birthdays */}
        {renderUpcomingBirthdays()}
      </ScrollView>

      {/* Day Detail Modal */}
      <Modal
        visible={showDayModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDayModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                {selectedDayData?.date.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </Text>
              <TouchableOpacity onPress={() => setShowDayModal(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            {selectedDayData?.birthdays && selectedDayData.birthdays.length > 0 && (
              <ScrollView style={styles.modalBirthdayList}>
                {selectedDayData.birthdays.map((birthday) => (
                  <View 
                    key={birthday.id} 
                    style={[styles.modalBirthdayItem, { backgroundColor: theme.surface, borderColor: theme.border }]}
                  >
                    <View style={styles.birthdayItemHeader}>
                      <Text style={[styles.birthdayItemName, { color: theme.text }]}>
                        {birthday.name}
                      </Text>
                      {birthday.year && (
                        <Text style={[styles.birthdayItemAge, { color: theme.birthday }]}>
                          {birthday.age ? `${birthday.age} years old` : ''}
                        </Text>
                      )}
                    </View>
                    
                    <Text style={[styles.birthdayItemRelation, { color: theme.textSecondary }]}>
                      {birthday.relationship}
                    </Text>
                    
                    {birthday.notes && (
                      <Text style={[styles.birthdayItemNotes, { color: theme.textSecondary }]}>
                        {birthday.notes}
                      </Text>
                    )}
                  </View>
                ))}
              </ScrollView>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.accent }]}
                onPress={handleAddBirthdayForDate}
              >
                <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>
                  Add Birthday
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
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  navButton: {
    padding: 8,
  },
  monthYearButton: {
    flex: 1,
    alignItems: 'center',
  },
  monthYearText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  dayNamesRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  dayNameCell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNameText: {
    fontSize: 12,
    fontWeight: '600',
  },
  calendarGrid: {
    paddingHorizontal: 20,
  },
  weekRow: {
    flexDirection: 'row',
  },
  dayCell: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    margin: 1,
    position: 'relative',
  },
  dayText: {
    fontSize: 16,
    fontWeight: '500',
  },
  birthdayIndicators: {
    position: 'absolute',
    bottom: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  birthdayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginHorizontal: 1,
  },
  moreIndicator: {
    fontSize: 8,
    fontWeight: 'bold',
    marginLeft: 2,
  },
  statsSection: {
    margin: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  statsText: {
    fontSize: 14,
  },
  upcomingSection: {
    margin: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  birthdayCard: {
    width: 120,
    padding: 12,
    marginRight: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  birthdayName: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  birthdayDate: {
    fontSize: 12,
    marginBottom: 4,
  },
  birthdayAge: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  daysUntil: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '70%',
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
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  modalBirthdayList: {
    maxHeight: 300,
  },
  modalBirthdayItem: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  birthdayItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  birthdayItemName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  birthdayItemAge: {
    fontSize: 14,
    fontWeight: '600',
  },
  birthdayItemRelation: {
    fontSize: 14,
    marginBottom: 4,
  },
  birthdayItemNotes: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  modalActions: {
    marginTop: 20,
  },
  modalButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CalendarView;