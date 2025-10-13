/**
 * Custom hook for settings and preferences
 */
import { useState } from 'react';

export const useSettings = () => {
  const [darkMode, setDarkMode] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [autoCompleteEnabled, setAutoCompleteEnabled] = useState(true);
  const [smartSuggestionsEnabled, setSmartSuggestionsEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  // Sort and filter settings
  const [sortBy, setSortBy] = useState('newest');
  const [filterBy, setFilterBy] = useState('all');

  return {
    darkMode,
    setDarkMode,
    voiceEnabled,
    setVoiceEnabled,
    autoCompleteEnabled,
    setAutoCompleteEnabled,
    smartSuggestionsEnabled,
    setSmartSuggestionsEnabled,
    vibrationEnabled,
    setVibrationEnabled,
    soundEnabled,
    setSoundEnabled,
    sortBy,
    setSortBy,
    filterBy,
    setFilterBy,
  };
};