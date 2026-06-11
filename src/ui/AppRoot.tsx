import { useEffect } from 'react';
import { View } from 'react-native';
import { theme } from '../theme';
import { appStore, useApp } from './appStore';
import { DrillScreen } from './screens/DrillScreen';
import { HomeScreen } from './screens/HomeScreen';
import { NameGateScreen } from './screens/NameGateScreen';
import { PlacementScreen } from './screens/PlacementScreen';
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
    case 'namegate':
      return <NameGateScreen />;
    case 'placement':
      return <PlacementScreen />;
    case 'home':
      return <HomeScreen />;
    case 'drill':
      return <DrillScreen />;
    case 'results':
      return <ResultsScreen />;
  }
}
