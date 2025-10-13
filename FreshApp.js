/**
 * Fresh App Component - Testing Hooks Issue
 * Absolute minimum to identify the exact problem
 */

import { useEffect, useState } from 'react';
import { StatusBar, StyleSheet, Text, View } from 'react-native';

export default function FreshApp() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setLoading(false);
    };
    init();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      {loading ? (
        <Text style={styles.text}>Loading Fresh App...</Text>
      ) : (
        <Text style={styles.text}>Fresh App Loaded Successfully!</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  text: {
    fontSize: 18,
    textAlign: 'center',
  },
});