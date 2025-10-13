/**
 * Minimal App Component - Debugging Hooks Issue
 * This strips down to bare essentials to find the hook issue
 */

import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function MinimalApp() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    const init = async () => {
      try {
        // Simulate initialization
        await new Promise(resolve => setTimeout(resolve, 1000));
        setData({ message: 'App initialized successfully!' });
      } catch (error) {
        console.error('Init error:', error);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  return (
    <View style={styles.container}>
      {loading ? (
        <Text style={styles.text}>Loading...</Text>
      ) : (
        <Text style={styles.text}>{data?.message || 'Ready!'}</Text>
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