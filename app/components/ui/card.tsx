import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Surface } from '@/constants/theme';

type CardVariant = 'outline' | 'tinted';

type Props = PropsWithChildren<{
  variant?: CardVariant;
  style?: StyleProp<ViewStyle>;
}>;

/**
 * Standard surface used for grouped content blocks across the app.
 *   - `outline` (default): white background, hairline border
 *   - `tinted`:           soft mint background, no border (used for hero/summary blocks)
 */
export function Card({ children, style, variant = 'outline' }: Props) {
  return (
    <View style={[styles.base, variant === 'tinted' ? styles.tinted : styles.outline, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: 16, gap: 12, padding: 14 },
  outline: {
    backgroundColor: '#ffffff',
    borderColor: Surface.border,
    borderWidth: 1,
  },
  tinted: {
    backgroundColor: Surface.bgSoft,
    borderColor: '#d9e7e5',
    borderWidth: 1,
  },
});
