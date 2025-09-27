import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { parseNaturalLanguage } from '../services/nlpParser';

/**
 * Demo component to showcase natural language parsing capabilities
 * This can be used for testing or as an educational tool
 */

export default function SmartReminderDemo({ darkMode = false }) {
  const [selectedExample, setSelectedExample] = useState(null);
  const [parseResult, setParseResult] = useState(null);

  const examples = [
    {
      category: "🕐 Time-based",
      items: [
        "Remind me to call mom at 7 PM",
        "Take medicine in 30 minutes",
        "Meeting tomorrow at 2 PM",
        "Buy groceries this evening",
        "Water plants in 2 hours"
      ]
    },
    {
      category: "🔄 Recurring",
      items: [
        "Daily reminder to exercise at 8 AM",
        "Weekly reminder to clean house on Sunday",
        "Take vitamin every morning",
        "Team meeting every Monday at 10 AM",
        "Check emails every 2 hours"
      ]
    },
    {
      category: "🚨 Priority",
      items: [
        "Urgent: Submit report today",
        "Important meeting with boss tomorrow",
        "ASAP: Call doctor about appointment",
        "High priority: Review contract by Friday",
        "Low priority: organize desk sometime"
      ]
    },
    {
      category: "📂 Category Detection",
      items: [
        "Work meeting tomorrow at 10 AM",
        "Doctor appointment next Tuesday",
        "Pay rent by the 1st",
        "Birthday party this Saturday",
        "Buy milk and bread tonight"
      ]
    },
    {
      category: "🤖 Complex",
      items: [
        "Urgent work meeting about the project tomorrow at 9 AM",
        "Don't forget to call the doctor about test results this afternoon",
        "Weekly high priority reminder to backup files every Friday",
        "Remember to buy birthday gift for mom by next Saturday",
        "Important: Submit tax documents to accountant by April 15th"
      ]
    }
  ];

  const handleExampleTap = async (example) => {
    setSelectedExample(example);
    
    try {
      const result = parseNaturalLanguage(example);
      setParseResult(result);
    } catch (error) {
      console.error('Demo parsing error:', error);
      setParseResult({ error: error.message });
    }
  };

  const renderParseResult = () => {
    if (!parseResult) return null;

    if (parseResult.error) {
      return (
        <View style={[styles.resultContainer, styles.errorContainer, darkMode && styles.darkResult]}>
          <Text style={[styles.errorText, darkMode && styles.darkText]}>
            Error: {parseResult.error}
          </Text>
        </View>
      );
    }

    const { reminder, parseDetails } = parseResult;
    const confidenceColor = reminder.confidence > 70 ? '#4CAF50' : 
                           reminder.confidence > 50 ? '#FF9800' : '#F44336';

    return (
      <View style={[styles.resultContainer, darkMode && styles.darkResult]}>
        <View style={styles.resultHeader}>
          <Text style={[styles.resultTitle, darkMode && styles.darkText]}>
            🧠 Parse Result
          </Text>
          <View style={[styles.confidenceBadge, { backgroundColor: confidenceColor }]}>
            <Text style={styles.confidenceText}>{reminder.confidence}%</Text>
          </View>
        </View>

        <View style={styles.resultGrid}>
          <View style={styles.resultItem}>
            <Text style={[styles.resultLabel, darkMode && styles.darkText]}>📝 Task:</Text>
            <Text style={[styles.resultValue, darkMode && styles.darkText]}>{reminder.text}</Text>
          </View>

          <View style={styles.resultItem}>
            <Text style={[styles.resultLabel, darkMode && styles.darkText]}>⏰ Time:</Text>
            <Text style={[styles.resultValue, darkMode && styles.darkText]}>
              {reminder.timeDescription || `${reminder.time} seconds`}
            </Text>
          </View>

          <View style={styles.resultItem}>
            <Text style={[styles.resultLabel, darkMode && styles.darkText]}>📂 Category:</Text>
            <Text style={[styles.resultValue, darkMode && styles.darkText]}>{reminder.category}</Text>
          </View>

          <View style={styles.resultItem}>
            <Text style={[styles.resultLabel, darkMode && styles.darkText]}>🎯 Priority:</Text>
            <Text style={[styles.resultValue, darkMode && styles.darkText]}>{reminder.priority}</Text>
          </View>

          <View style={styles.resultItem}>
            <Text style={[styles.resultLabel, darkMode && styles.darkText]}>🔄 Type:</Text>
            <Text style={[styles.resultValue, darkMode && styles.darkText]}>{reminder.type}</Text>
          </View>
        </View>

        <View style={styles.detectionInfo}>
          <Text style={[styles.detectionTitle, darkMode && styles.darkText]}>Detection Status:</Text>
          <View style={styles.detectionGrid}>
            <Text style={[styles.detectionItem, parseDetails.actionFound && styles.detected]}>
              {parseDetails.actionFound ? '✅' : '❌'} Action
            </Text>
            <Text style={[styles.detectionItem, parseDetails.timeFound && styles.detected]}>
              {parseDetails.timeFound ? '✅' : '❌'} Time
            </Text>
            <Text style={[styles.detectionItem, parseDetails.categoryDetected && styles.detected]}>
              {parseDetails.categoryDetected ? '✅' : '❌'} Category
            </Text>
            <Text style={[styles.detectionItem, parseDetails.priorityDetected && styles.detected]}>
              {parseDetails.priorityDetected ? '✅' : '❌'} Priority
            </Text>
            <Text style={[styles.detectionItem, parseDetails.recurringDetected && styles.detected]}>
              {parseDetails.recurringDetected ? '✅' : '❌'} Recurring
            </Text>
          </View>
        </View>

        {reminder.note && (
          <View style={styles.noteContainer}>
            <Text style={[styles.noteLabel, darkMode && styles.darkText]}>💡 Parse Note:</Text>
            <Text style={[styles.noteText, darkMode && styles.darkText]}>{reminder.note}</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <ScrollView style={[styles.container, darkMode && styles.darkContainer]}>
      <View style={styles.header}>
        <Text style={[styles.title, darkMode && styles.darkText]}>
          🧠 Smart Reminder Demo
        </Text>
        <Text style={[styles.subtitle, darkMode && styles.darkText]}>
          Tap any example to see how natural language is parsed
        </Text>
      </View>

      {examples.map((category, categoryIndex) => (
        <View key={categoryIndex} style={[styles.categoryContainer, darkMode && styles.darkCategory]}>
          <Text style={[styles.categoryTitle, darkMode && styles.darkText]}>
            {category.category}
          </Text>
          
          {category.items.map((example, exampleIndex) => (
            <TouchableOpacity
              key={exampleIndex}
              style={[
                styles.exampleItem,
                selectedExample === example && styles.selectedExample,
                darkMode && styles.darkExample
              ]}
              onPress={() => handleExampleTap(example)}
            >
              <Text style={[
                styles.exampleText,
                selectedExample === example && styles.selectedText,
                darkMode && styles.darkText
              ]}>
                "{example}"
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ))}

      {renderParseResult()}

      <View style={styles.footer}>
        <Text style={[styles.footerText, darkMode && styles.darkText]}>
          💡 Try typing these examples in the Smart Input field to create actual reminders!
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  darkContainer: {
    backgroundColor: '#1a1a1a',
  },
  header: {
    marginBottom: 25,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  darkText: {
    color: '#fff',
  },
  categoryContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  darkCategory: {
    backgroundColor: '#333',
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  exampleItem: {
    padding: 12,
    borderRadius: 8,
    marginVertical: 3,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  darkExample: {
    backgroundColor: '#444',
  },
  selectedExample: {
    backgroundColor: '#e3f2fd',
    borderColor: '#2196F3',
  },
  exampleText: {
    fontSize: 16,
    color: '#333',
    fontStyle: 'italic',
  },
  selectedText: {
    color: '#1976D2',
    fontWeight: '500',
  },
  resultContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginVertical: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
  },
  darkResult: {
    backgroundColor: '#333',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
  },
  errorText: {
    color: '#c62828',
    fontSize: 16,
    fontWeight: '500',
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  confidenceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  confidenceText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  resultGrid: {
    marginBottom: 15,
  },
  resultItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  resultLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    minWidth: 80,
  },
  resultValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  detectionInfo: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  detectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  detectionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  detectionItem: {
    fontSize: 12,
    color: '#999',
    backgroundColor: 'white',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  detected: {
    color: '#4CAF50',
    fontWeight: '500',
  },
  noteContainer: {
    backgroundColor: '#fff3e0',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#ff9800',
  },
  noteLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#f57c00',
    marginBottom: 4,
  },
  noteText: {
    fontSize: 12,
    color: '#ef6c00',
    fontStyle: 'italic',
  },
  footer: {
    backgroundColor: '#e8f5e8',
    borderRadius: 8,
    padding: 15,
    marginTop: 10,
    marginBottom: 30,
  },
  footerText: {
    fontSize: 14,
    color: '#2e7d32',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});