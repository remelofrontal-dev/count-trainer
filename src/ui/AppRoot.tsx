import { useEffect } from 'react';
import { View } from 'react-native';
import { theme } from '../theme';
import { appStore, useApp } from './appStore';
import type { Screen } from '../app/store';
import { NavBar } from './NavBar';
import { DrillScreen } from './screens/DrillScreen';
import { HomeScreen } from './screens/HomeScreen';
import { InfoScreen } from './screens/InfoScreen';
import { ModesScreen } from './screens/ModesScreen';
import { NameGateScreen } from './screens/NameGateScreen';
import { PlacementScreen } from './screens/PlacementScreen';
import { PlayScreen } from './screens/PlayScreen';
import { ResultsScreen } from './screens/ResultsScreen';

/** Navigation root — Zustand-driven screen switch with a persistent hub nav. */
export function AppRoot() {
  const screen = useApp((s) => s.screen);
  const ready = useApp((s) => s.ready);

  useEffect(() => {
    void appStore.getState().init();
  }, []);

  if (!ready) {
    return <View style={{ flex: 1, backgroundColor: theme.colors.background }} />;
  }

  // Bottom nav appears on the hub screens; focused flows stay clean.
  const showNav = screen === 'home' || screen === 'modes' || screen === 'info';

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={{ flex: 1 }}>{renderScreen(screen)}</View>
      {showNav && <NavBar active={screen} />}
    </View>
  );
}

function renderScreen(screen: Screen) {
  switch (screen) {
    case 'namegate':
      return <NameGateScreen />;
    case 'placement':
      return <PlacementScreen />;
    case 'home':
      return <HomeScreen />;
    case 'modes':
      return <ModesScreen />;
    case 'info':
      return <InfoScreen />;
    case 'drill':
      return <DrillScreen />;
    case 'results':
      return <ResultsScreen />;
    case 'play':
      return <PlayScreen />;
    default:
      return <HomeScreen />;
  }
}
