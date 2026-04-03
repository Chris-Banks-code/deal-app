import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NetworkProvider } from './contexts/NetworkContext';
import { NotificationsProvider } from './contexts/NotificationsContext';
import LoginScreen from './screens/LoginScreen';
import MainNavigator from './navigation/MainNavigator';
import Colors from './constants/Colors';

function AppContent() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!session) return <LoginScreen />;

  return (
    <NetworkProvider>
      <NotificationsProvider>
        <MainNavigator />
      </NotificationsProvider>
    </NetworkProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
      <StatusBar style="dark" />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
});