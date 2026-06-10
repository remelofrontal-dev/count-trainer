import { useEffect } from 'react';
import { View } from 'react-native';
import { theme } from '../theme';
import { appStore, useApp } from './appStore';
import { DrillScreen } from './screens/DrillScreen';
import { HomeScreen } from './screens/HomeScreen';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { ResultsScreen } from './screens/ResultsScreen';

/** Navigation root — Zustand-driven screen switch (see ISA Decisions). */
export function AppRoot() {
  const screen = useApp((s) => s.screen);
  const ready = useApp((s) => s.ready);

  useEffect(() => {
    void appStore.getState().init();
  }, []);

  if (!ready) {
    return <View style={{ flex: 1, backgroundColor: theme.colors.background }} />;
  }
  switch (screen) {
    case 'onboarding':
      return <OnboardingScreen />;
    case 'home':
      return <HomeScreen />;
    case 'drill':
      return <DrillScreen />;
    case 'results':
      return <ResultsScreen />;
  }
}
