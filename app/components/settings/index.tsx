import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AccountView } from './account-view';
import { LegalView } from './legal-view';
import { MenuView } from './menu-view';
import { PetsView } from './pets-view';
import type { Screen } from './_shared';

export function SettingsPanel() {
  const [screen, setScreen] = useState<Screen>('menu');
  const nav = (s: Screen) => setScreen(s);

  return (
    <View style={styles.panel}>
      {screen === 'menu'        && <MenuView onNavigate={nav} />}
      {screen === 'pets'        && <PetsView onBack={() => nav('menu')} />}
      {screen === 'account'     && <AccountView onBack={() => nav('menu')} />}
      {screen === 'terms'       && <LegalView page="terms" onBack={() => nav('menu')} />}
      {screen === 'privacy'     && <LegalView page="privacy" onBack={() => nav('menu')} />}
      {screen === 'disclaimer'  && <LegalView page="disclaimer" onBack={() => nav('menu')} />}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { flex: 1, backgroundColor: '#ffffff' },
});
