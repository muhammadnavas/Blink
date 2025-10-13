# Blink - Smart Reminder & Life Management App

Blink is a comprehensive React Native application built with Expo that serves as an intelligent personal assistant for managing reminders, finances, calendar events, and daily tasks. The app leverages machine learning-like smart suggestions and provides a unified interface for life management.

## 🚀 Features

### Core Functionality
- **Smart Notifications**: Advanced notification system with snoozing, repeating, and intelligent scheduling
- **Voice Integration**: Voice input for creating reminders and text-to-speech for notifications
- **Calendar Management**: Integration with device calendar and custom event tracking
- **Financial Dashboard**: Expense tracking, budget management, and financial insights
- **Birthday Manager**: Automatic birthday reminders and gift suggestions
- **Adaptive AI Suggestions**: Context-aware recommendations for reminders and tasks

### Advanced Features
- **Swipeable Interface**: Intuitive gesture-based reminder management
- **Cross-Platform Notifications**: Works on iOS, Android, and Web
- **Background Services**: Calendar sync and notification processing
- **Smart Time Recognition**: Natural language processing for time and date parsing
- **Haptic Feedback**: Enhanced user experience with vibration feedback
- **Dark/Light Theme**: Adaptive UI theming

## 🏗️ Architecture & Project Structure

```
Blink/
├── App.js                          # Main application component (2100+ lines)
├── index.js                        # Entry point and app registration
├── package.json                    # Dependencies and scripts
├── app.json                        # Expo configuration
├── assets/                         # Static resources
│   ├── adaptive-icon.png           # Android adaptive icon
│   ├── favicon.png                 # Web favicon
│   ├── icon.png                    # App icon
│   └── splash-icon.png            # Splash screen icon
├── services/                       # Core business logic
│   ├── notifications.js            # Notification management (1200+ lines)
│   ├── smartSuggestions.js         # AI-powered suggestions
│   └── calendarBackgroundService.js # Calendar synchronization
├── components/                     # Reusable UI components
│   ├── SwipeableReminder.js        # Gesture-based reminder interface
│   ├── VoiceInput.js              # Voice recognition component
│   ├── FinancialDashboard.js      # Financial tracking UI
│   ├── CalendarView.js            # Calendar display component
│   ├── BirthdayManager.js         # Birthday management interface
│   └── QuickExpenseTracker.js     # Expense logging component
├── hooks/                          # Custom React hooks
│   ├── useSettings.js             # App settings management
│   └── useAppState.js             # Application state management
└── utils/                          # Utility functions
    └── deviceTime.js              # Time and date utilities
```

## 🛠️ Technology Stack

### Core Technologies
- **React Native**: `0.81.4` - Cross-platform mobile development
- **Expo SDK**: `^54.0.12` - Development platform and build tools
- **React**: `19.1.0` - UI library
- **TypeScript**: `~5.9.2` - Type safety and development tools

### Key Dependencies
- **@react-native-async-storage/async-storage**: `^2.2.0` - Local data persistence
- **expo-notifications**: `^0.32.12` - Push and local notifications
- **expo-contacts**: `^15.0.9` - Device contacts integration
- **expo-sms**: `^14.0.7` - SMS functionality
- **expo-audio**: `^1.0.13` - Audio playback and recording
- **expo-speech**: `^14.0.7` - Text-to-speech functionality
- **expo-haptics**: `^15.0.7` - Haptic feedback
- **chrono-node**: `^2.9.0` - Natural language date parsing
- **react-native-gesture-handler**: `^2.28.0` - Advanced gesture handling

## 🚀 Getting Started

### Prerequisites
- **Node.js**: Version 18+ recommended
- **npm** or **yarn**: Package manager
- **Expo CLI**: `npm install -g @expo/cli`
- **Mobile Device** with Expo Go app, or **Emulator** (Android Studio/Xcode)

### Installation Steps

1. **Clone the repository:**
   ```bash
   git clone https://github.com/muhammadnavas/Blink.git
   cd Blink
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npx expo start
   ```
   or
   ```bash
   npm start
   ```

4. **Run on specific platform:**
   ```bash
   # Android
   npm run android
   
   # iOS
   npm run ios
   
   # Web
   npm run web
   ```

### Development Setup

1. **Configure Expo account** (optional but recommended):
   ```bash
   npx expo login
   ```

2. **Install Expo Go** on your mobile device from:
   - [iOS App Store](https://apps.apple.com/app/expo-go/id982107779)
   - [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)

3. **Scan QR code** from the development server to run on device

## ⚙️ Configuration

### Notification Permissions
The app requires notification permissions for core functionality. Permissions are requested automatically on first launch.

### Platform-Specific Notes
- **Android**: Calendar triggers are not supported; uses time intervals instead
- **iOS**: Full notification and calendar integration available
- **Web**: Limited notification support, primarily for testing

## 📚 Usage Guide

### Creating Reminders
1. **Text Input**: Type reminder in the main input field
2. **Voice Input**: Tap microphone icon and speak your reminder
3. **Time Selection**: Choose from quick time options or set custom time
4. **Smart Suggestions**: Use AI-generated suggestions for common tasks

### Managing Reminders
- **Swipe Right**: Mark as complete
- **Swipe Left**: Delete reminder
- **Tap**: Edit or reschedule
- **Long Press**: Access additional options

### Financial Tracking
1. Navigate to Financial Dashboard
2. Add income/expense entries
3. Set budget categories
4. View spending analytics and trends

### Calendar Integration
- Sync with device calendar
- View upcoming events
- Set birthday reminders
- Create recurring events

## 🐛 Troubleshooting

### Common Issues

**"Rendered fewer hooks than expected" Error:**
- Ensure all React hooks are called in the same order on every render
- Check for conditional hook calls
- Verify component structure and state management

**Missing Dependencies:**
```bash
npm install
# or force reinstall
rm -rf node_modules package-lock.json
npm install
```

**Notification Issues:**
- Verify device permissions are granted
- Check notification settings in device settings
- Ensure app is not in battery optimization (Android)

**Performance Issues:**
- Clear AsyncStorage: Go to Settings > Clear All Data
- Restart Metro bundler: `npx expo start --clear`
- Check for memory leaks in components

### Debug Commands
```bash
# Clear Metro cache
npx expo start --clear

# View logs
npx expo logs

# Check bundle
npx expo export

# Analyze bundle size
npx expo bundle-analyzer
```

## 🧪 Testing

### Manual Testing
1. Test notification scheduling and delivery
2. Verify voice input functionality
3. Check calendar synchronization
4. Test financial calculations
5. Validate cross-platform behavior

### Automated Testing (Future Implementation)
- Unit tests with Jest
- Integration tests with Detox
- E2E testing with Appium

## 📦 Building for Production

### Development Build
```bash
npx expo build:android
npx expo build:ios
```

### EAS Build (Recommended)
```bash
# Install EAS CLI
npm install -g @expo/eas-cli

# Configure build
eas build:configure

# Build for Android
eas build --platform android

# Build for iOS
eas build --platform ios
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -m 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Submit a pull request

### Development Guidelines
- Follow React Native best practices
- Use TypeScript for new components
- Add proper error handling
- Test on both platforms
- Update documentation

## 📋 Roadmap

### Upcoming Features
- [ ] Machine Learning integration for smarter suggestions
- [ ] Cloud synchronization across devices
- [ ] Advanced analytics and insights
- [ ] Integration with popular calendar apps
- [ ] Collaborative reminders and sharing
- [ ] Widget support for home screen
- [ ] Wear OS and Apple Watch support

### Performance Improvements
- [ ] Code splitting and lazy loading
- [ ] Database optimization
- [ ] Background task optimization
- [ ] Memory usage optimization

## 👨‍💻 Author

**Muhammad Navas**
- GitHub: [@muhammadnavas](https://github.com/muhammadnavas)
- Project Link: [https://github.com/muhammadnavas/Blink](https://github.com/muhammadnavas/Blink)
