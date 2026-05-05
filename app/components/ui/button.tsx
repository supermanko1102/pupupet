import { StyleSheet, Text, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import { Brand, Surface } from '@/constants/theme';

import { Press } from './press';

type Variant = 'primary' | 'ghost' | 'secondary';
type Size = 'md' | 'lg';

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

/**
 * Standard text button.
 *   primary  - filled brand mint, white text (CTA)
 *   ghost    - light gray fill, dark text (cancel/dismiss)
 *   secondary- outline mint, brand text (secondary action)
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'lg',
  disabled,
  style,
  textStyle,
}: Props) {
  return (
    <Press
      onPress={onPress}
      disabled={disabled}
      tone={variant === 'primary' ? 'dark' : 'light'}
      style={[
        styles.base,
        size === 'lg' ? styles.sizeLg : styles.sizeMd,
        VARIANT_BG[variant],
        disabled && styles.disabled,
        style,
      ]}>
      <Text style={[styles.text, VARIANT_TEXT[variant], textStyle]}>{label}</Text>
    </Press>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', borderRadius: 16, justifyContent: 'center', overflow: 'hidden' },
  sizeMd: { minHeight: 44, paddingHorizontal: 16 },
  sizeLg: { height: 54, paddingHorizontal: 20 },
  disabled: { opacity: 0.4 },

  text: { fontSize: 17, fontWeight: '700' },

  primary:        { backgroundColor: Brand.primary },
  primaryText:    { color: '#ffffff' },
  ghost:          { backgroundColor: Surface.bgMuted },
  ghostText:      { color: Surface.inkSoft, fontWeight: '600' },
  secondary:      { backgroundColor: 'transparent', borderColor: Brand.primary, borderWidth: 1 },
  secondaryText:  { color: Brand.primary },
});

const VARIANT_BG = {
  primary: styles.primary,
  ghost: styles.ghost,
  secondary: styles.secondary,
} as const;

const VARIANT_TEXT = {
  primary: styles.primaryText,
  ghost: styles.ghostText,
  secondary: styles.secondaryText,
} as const;
