import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from './src/theme';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>COUNT TRAINER</Text>
      <Text style={styles.subtitle}>Phase 0 — engine foundation</Text>
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: theme.colors.text,
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 2,
  },
  subtitle: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    marginTop: 8,
  },
});
