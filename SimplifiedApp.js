/**
 * Simplified App Component - Testing Hooks Issue
 * Gradually adding features back to identify the problem
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useState } from 'react';
import { StatusBar, StyleSheet, Text, View } from 'react-native';
import calendarBackgroundService from './services/calendarBackgroundService';
import {
    initializeNotificationSystem,
    setupNotificationCategories
} from './services/notifications';
import smartSuggestionsService from './services/smartSuggestions';

export default function SimplifiedApp() {
  // Core state only
  const [isLoading, setIsLoading] = useState(true);
  const [reminders, setReminders] = useState([]);
  const [smartSuggestions, setSmartSuggestions] = useState([]);
  const [settings, setSettings] = useState({
    darkMode: false,
    soundEnabled: true,
  });

  // Theme
  const theme = useMemo(() => ({
    primary: settings.darkMode ? '#1a1a1a' : '#f8f9fa',
    text: settings.darkMode ? '#fff' : '#333',
  }), [settings.darkMode]);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    setIsLoading(true);
    try {
      // Add basic notification system
      await setupNotificationCategories();
      await initializeNotificationSystem();
      await loadReminders();
      
      // Test smart suggestions
      await updateSmartSuggestions();
      
      // Test calendar background service
      await calendarBackgroundService.initialize();
      
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error('App initialization error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateSmartSuggestions = async () => {
    try {
      const { patterns, suggestions } = await smartSuggestionsService.analyzeUserPatterns();
      setSmartSuggestions(suggestions);
    } catch (error) {
      console.error('Error updating smart suggestions:', error);
    }
  };

  const loadReminders = async () => {
    try {
      const data = await AsyncStorage.getItem('reminders');
      if (data) {
        setReminders(JSON.parse(data));
      }
    } catch (error) {
      console.error('Error loading reminders:', error);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.primary }]}>
      <StatusBar barStyle={settings.darkMode ? "light-content" : "dark-content"} />
      
      {/* Always render both, conditionally show */}
      {isLoading && (
        <View style={[StyleSheet.absoluteFill, styles.centerContent, { backgroundColor: theme.primary }]}>
          <Text style={[styles.loadingText, { color: theme.text }]}>
            Loading Blink Reminder...
          </Text>
        </View>
      )}
      
      {!isLoading && (
        <View style={styles.content}>
          <Text style={[styles.title, { color: theme.text }]}>
            Blink Reminder App
          </Text>
          <Text style={[styles.subtitle, { color: theme.text }]}>
            {reminders.length} reminders loaded
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
  },
});