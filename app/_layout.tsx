import 'react-native-gesture-handler';
import 'react-native-reanimated';

import { ThemeProvider, type Theme as NavigationTheme } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { getCombinedTheme } from '@/theme/combinedTheme';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

const RootLayout = () => {
  const theme = getCombinedTheme(true);

  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <ThemeProvider value={theme as unknown as NavigationTheme}>
          <StatusBar style="light" />
          <Stack>
            <Stack.Screen name="index" options={{ title: 'Pick12' }} />
            <Stack.Screen name="draft" options={{ title: 'Draft', headerBackVisible: false }} />
            <Stack.Screen name="board" options={{ title: 'Board' }} />
            <Stack.Screen name="settings" options={{ title: 'Settings' }} />
            <Stack.Screen name="player/[id]" options={{ title: 'Player' }} />
          </Stack>
        </ThemeProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
};

export default RootLayout;
