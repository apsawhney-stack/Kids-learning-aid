import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { HomeworkCoachScreen } from './src/screens/Student/HomeworkCoachScreen';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <HomeworkCoachScreen />
    </SafeAreaProvider>
  );
}
