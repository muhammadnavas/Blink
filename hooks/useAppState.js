/**
 * Custom hook for main app state management
 * Extracts core state from App.js to prevent hooks overload
 */
import { useState } from 'react';

export const useAppState = () => {
  // Core state
  const [reminder, setReminder] = useState('');
  const [reminders, setReminders] = useState([]);
  const [completedReminders, setCompletedReminders] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Modal states
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingReminder, setEditingReminder] = useState(null);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [statsModalVisible, setStatsModalVisible] = useState(false);
  const [smartSuggestionsModalVisible, setSmartSuggestionsModalVisible] = useState(false);
  const [completedModalVisible, setCompletedModalVisible] = useState(false);

  // Feature states
  const [activeTab, setActiveTab] = useState('reminders');
  const [currentView, setCurrentView] = useState('reminders');
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [bulkSelectMode, setBulkSelectMode] = useState(false);
  const [selectedReminders, setSelectedReminders] = useState(new Set());

  return {
    // Core state
    reminder,
    setReminder,
    reminders,
    setReminders,
    completedReminders,
    setCompletedReminders,
    searchQuery,
    setSearchQuery,
    isRefreshing,
    setIsRefreshing,
    isLoading,
    setIsLoading,

    // Modal states
    editModalVisible,
    setEditModalVisible,
    editingReminder,
    setEditingReminder,
    settingsModalVisible,
    setSettingsModalVisible,
    sortModalVisible,
    setSortModalVisible,
    statsModalVisible,
    setStatsModalVisible,
    smartSuggestionsModalVisible,
    setSmartSuggestionsModalVisible,
    completedModalVisible,
    setCompletedModalVisible,

    // Feature states
    activeTab,
    setActiveTab,
    currentView,
    setCurrentView,
    categoryModalVisible,
    setCategoryModalVisible,
    selectedCategories,
    setSelectedCategories,
    bulkSelectMode,
    setBulkSelectMode,
    selectedReminders,
    setSelectedReminders,
  };
};