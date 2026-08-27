import 'react-native-gesture-handler';
import 'react-native-reanimated';

import { ThemeProvider, type Theme as NavigationTheme } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState, type ReactNode } from 'react';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useDraftStore } from '@/lib/state/draftStore';
import { useSnapshotStore } from '@/lib/state/snapshotStore';
import { getCombinedTheme } from '@/theme/combinedTheme';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

const BootGate = ({ children }: { children: ReactNode }) => {
  const hydrateDraft = useDraftStore((s) => s.hydrate);
  const hydrateSnapshot = useSnapshotStore((s) => s.hydrate);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await hydrateDraft();
      await hydrateSnapshot();
      if (cancelled) return;
      setReady(true);
      await SplashScreen.hideAsync();
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrateDraft, hydrateSnapshot]);

  if (!ready) return null;
  return children;
};

const RootLayout = () => {
  const theme = getCombinedTheme(true);

  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <ThemeProvider value={theme as unknown as NavigationTheme}>
          <StatusBar style="light" />
          <BootGate>
            <Stack>
              <Stack.Screen name="index" options={{ title: 'Pick12' }} />
              <Stack.Screen name="draft" options={{ title: 'Draft', headerBackVisible: false }} />
              <Stack.Screen name="board" options={{ title: 'Board' }} />
              <Stack.Screen name="settings" options={{ title: 'Settings' }} />
              <Stack.Screen name="player/[id]" options={{ title: 'Player' }} />
            </Stack>
          </BootGate>
        </ThemeProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
};

export default RootLayout;
