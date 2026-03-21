import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginScreen from './screens/LoginScreen';
import MainNavigator from './navigation/MainNavigator';

function AppContent() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#D4472D" />
      </View>
    );
  }

  if (!session) {
    return <LoginScreen />;
  }

  return <MainNavigator />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
      <StatusBar style="light" />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0A0F0D',
    justifyContent: 'center',
    alignItems: 'center',
  },
});