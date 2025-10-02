import { registerRootComponent } from 'expo';

import App from './App';

// Wrapper to force fresh component mounting and fix hooks error
function AppWrapper() {
  return <App key="app-v2" />;
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(AppWrapper);
