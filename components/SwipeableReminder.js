import React from 'react';
import {
  Animated,
  Dimensions,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

const { width: screenWidth } = Dimensions.get('window');
const SWIPE_THRESHOLD = screenWidth * 0.3;

export default function SwipeableReminder({ 
  children, 
  onSwipeLeft, 
  onSwipeRight, 
  leftAction, 
  rightAction,
  darkMode = false
}) {
  const translateX = new Animated.Value(0);
  const opacity = new Animated.Value(1);

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dy) < 50;
    },
    onPanResponderGrant: () => {
      translateX.setOffset(translateX._value);
    },
    onPanResponderMove: (evt, gestureState) => {
      translateX.setValue(gestureState.dx);
    },
    onPanResponderRelease: (evt, gestureState) => {
      translateX.flattenOffset();
      
      if (gestureState.dx > SWIPE_THRESHOLD) {
        // Swipe right
        Animated.timing(translateX, {
          toValue: screenWidth,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          if (onSwipeRight) onSwipeRight();
        });
      } else if (gestureState.dx < -SWIPE_THRESHOLD) {
        // Swipe left
        Animated.timing(translateX, {
          toValue: -screenWidth,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          if (onSwipeLeft) onSwipeLeft();
        });
      } else {
        // Snap back
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }
    },
  });

  const renderAction = (action, side) => {
    if (!action) return null;
    
    const backgroundColor = action.color || (side === 'left' ? '#4CAF50' : '#f44336');
    
    return (
      <View style={[
        styles.actionContainer,
        { backgroundColor },
        side === 'left' ? styles.leftAction : styles.rightAction
      ]}>
        <Text style={styles.actionIcon}>{action.icon}</Text>
        <Text style={styles.actionText}>{action.text}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Background Actions */}
      {renderAction(leftAction, 'left')}
      {renderAction(rightAction, 'right')}
      
      {/* Swipeable Content */}
      <Animated.View
        style={[
          styles.swipeableContent,
          {
            transform: [{ translateX }],
            opacity,
          },
        ]}
        {...panResponder.panHandlers}
      >
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    marginVertical: 4,
  },
  swipeableContent: {
    zIndex: 1,
  },
  actionContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 0,
  },
  leftAction: {
    left: 0,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  rightAction: {
    right: 0,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  actionIcon: {
    fontSize: 20,
    color: 'white',
    marginBottom: 4,
  },
  actionText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
    textAlign: 'center',
  },
});