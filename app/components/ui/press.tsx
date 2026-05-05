import { forwardRef } from 'react';
import {
  Pressable,
  type PressableProps,
  type PressableStateCallbackType,
  type StyleProp,
  type View,
  type ViewStyle,
} from 'react-native';

import { Ripple } from '@/constants/theme';

type PressTone = 'light' | 'dark';

type Props = Omit<PressableProps, 'style' | 'android_ripple'> & {
  tone?: PressTone;
  /** Disable the default pressed-opacity feedback (e.g. when caller animates scale themselves). */
  disablePressedFeedback?: boolean;
  style?: StyleProp<ViewStyle> | ((state: PressableStateCallbackType) => StyleProp<ViewStyle>);
};

/**
 * Pressable with the app's default press feedback:
 *   - `opacity 0.72` while pressed (skip with `disablePressedFeedback`)
 *   - `android_ripple` matching the tone of the surface underneath
 *
 * Use this everywhere instead of bare `Pressable` to keep press behavior consistent.
 */
export const Press = forwardRef<View, Props>(function Press(
  { tone = 'light', disablePressedFeedback, style, ...rest },
  ref,
) {
  const ripple = tone === 'dark' ? Ripple.onDark : Ripple.onLight;

  return (
    <Pressable
      ref={ref}
      android_ripple={ripple}
      style={(state) => {
        const base = typeof style === 'function' ? style(state) : style;
        if (disablePressedFeedback || !state.pressed) return base;
        return [base, { opacity: 0.72 }];
      }}
      {...rest}
    />
  );
});
