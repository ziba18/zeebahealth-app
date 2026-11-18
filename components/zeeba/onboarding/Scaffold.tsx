// The frame every first-run screen shares: a top bar (Back on the left), the content, and a bottom bar that
// never scrolls away, so the main button is always in the same place and always reachable.
// When the keyboard opens (name question) the bottom bar rides up with it.
import React, { useEffect, useState } from 'react';
import {
  Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, useWindowDimensions,
  type StyleProp, type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, font, layout, space, useColors } from '../../../constants/zeebaUI';
import { Icon, type IconName } from '../../ui/Icon';
import { Button, Txt, type ButtonVariant } from '../kit';
import { PressScale } from '../motion';
import { GlowBackdrop } from './Backdrop';

/** Main buttons on these screens are 56 tall (the audience needs big targets); plain ones 48. */
export const BIG = 56;
export const PLAIN = 48;

/**
 * The height left for a screen once the status bar and the home indicator are taken off. Layout choices
 * ("is this a short phone?") use this, not the raw window height: an iPhone 15 is 852 tall but only about
 * 760 of that is ours. In the web preview there are no insets, so `--h=754` there matches a standard iPhone.
 */
export function useUsableHeight(): number {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  return height - insets.top - insets.bottom;
}

export function useKeyboardOpen(): boolean {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const a = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setOpen(true));
    const b = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setOpen(false));
    return () => { a.remove(); b.remove(); };
  }, []);
  return open;
}

/** The kit Button at first-run size. `variant="text"` is the plain alternative under a main button. */
export function BigButton({
  label, onPress, variant = 'primary', icon, disabled, loading, style, accessibilityLabel, accessibilityHint, small,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  /** Plain variant only: a quieter 15 pt label, for two links side by side. */
  small?: boolean;
}) {
  return (
    <Button
      label={label}
      small={small}
      onPress={onPress}
      variant={variant}
      icon={icon}
      disabled={disabled}
      loading={loading}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      style={[{ minHeight: variant === 'primary' || variant === 'secondary' ? BIG : PLAIN }, style]}
    />
  );
}

/** "‹ Back": a word as well as an arrow, on a soft pill, 48 tall. */
export function BackButton({ label = 'Back', onPress }: { label?: string; onPress?: () => void }) {
  const router = useRouter();
  return (
    <PressScale
      onPress={onPress ?? (() => { if (router.canGoBack()) router.back(); else router.replace('/(auth)/welcome' as any); })}
      haptic="none"
      accessibilityLabel={label === 'Back' ? 'Go back' : `Back to ${label}`}
      style={styles.back}
    >
      <Icon name="chevron-left" size={22} color={colors.ink} />
      <Txt style={styles.backText}>{label}</Txt>
    </PressScale>
  );
}

/**
 * `top`: what sits in the top bar after Back (the progress bar on question screens).
 * `right`: the top-right corner ("Skip", or "2 of 4").
 * `footer`: pinned to the bottom, above the keyboard when it is open.
 * `scroll={false}`: the content fills the space instead (welcome, celebration).
 */
export function FlowScreen({
  back, backLabel, onBack, top, right, children, footer, glow = 'soft', scroll = true, contentStyle, footerStyle, role,
}: {
  back?: boolean;
  backLabel?: string;
  onBack?: () => void;
  top?: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  glow?: 'full' | 'soft' | 'none';
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  footerStyle?: StyleProp<ViewStyle>;
  role?: 'main';
}) {
  const insets = useSafeAreaInsets();
  const c = useColors();
  const keyboardOpen = useKeyboardOpen();
  const hasBar = back || top || right;
  // A scrolling screen fades its content out just above the bottom bar; a still screen lets the glow show through.
  const solidFooter = scroll && !!footer;

  return (
    <View style={styles.screen} role={role}>
      {glow === 'none' ? null : <GlowBackdrop strength={glow} />}
      {/* With a pinned bottom bar the whole frame shrinks above the keyboard; without one the scroll view
          makes room for it by itself (never both, or the gap would be doubled). */}
      <KeyboardAvoidingView style={styles.fill} behavior={footer && Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.fill, { paddingTop: insets.top }]}>
          {hasBar ? (
            <View style={styles.bar}>
              {back ? <BackButton label={backLabel} onPress={onBack} /> : null}
              <View style={styles.barMiddle}>{top}</View>
              {right}
            </View>
          ) : null}

          {scroll ? (
            <ScrollView
              style={styles.fill}
              contentContainerStyle={[styles.column, styles.scrollPad, !hasBar && styles.noBarPad, contentStyle]}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              automaticallyAdjustKeyboardInsets={!footer}
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
          ) : (
            <View style={[styles.column, styles.fill, contentStyle]}>{children}</View>
          )}

          {footer ? (
            <View style={solidFooter ? styles.footerSolid : null}>
              {solidFooter ? (
                <LinearGradient
                  colors={[`${c.canvas}00`, c.canvas]}
                  style={[styles.fade, { pointerEvents: 'none' }]}
                />
              ) : null}
              <View
                style={[
                  styles.column, styles.footer,
                  { paddingBottom: keyboardOpen ? space.sm : Math.max(insets.bottom, space.md) },
                  footerStyle,
                ]}
              >
                {footer}
              </View>
            </View>
          ) : <View style={{ height: insets.bottom }} />}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  fill: { flex: 1 },
  column: { width: '100%', maxWidth: layout.maxContentWidth, alignSelf: 'center', paddingHorizontal: layout.gutter + space.xxs },
  scrollPad: { paddingTop: space.xs, paddingBottom: space.xl, flexGrow: 1 },
  // No top bar (email code, consent): the title still needs air above it.
  noBarPad: { paddingTop: space.xl },
  bar: {
    width: '100%', maxWidth: layout.maxContentWidth, alignSelf: 'center', minHeight: 56,
    flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: layout.gutter, paddingTop: space.xxs,
  },
  barMiddle: { flex: 1, minWidth: 0, justifyContent: 'center' },
  back: {
    height: PLAIN, flexDirection: 'row', alignItems: 'center', gap: 2, paddingLeft: space.xs, paddingRight: space.md,
    borderRadius: 999, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline,
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  },
  backText: { ...font.semibold, fontSize: 16, lineHeight: 21, color: colors.ink },
  footerSolid: { backgroundColor: colors.canvas },
  fade: { position: 'absolute', left: 0, right: 0, top: -28, height: 28 },
  footer: { paddingTop: space.xs, gap: space.xxs },
});
