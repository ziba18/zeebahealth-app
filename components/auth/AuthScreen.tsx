// The frame for the sign-in family (sign in, sign up with email, check your email, forgot password):
// Back at the top left, a large title with a short reason under it, a small Wren keeping company at the
// right, then the form. The form scrolls as one piece and makes room for the keyboard by itself.
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, space } from '../../constants/zeebaUI';
import { Txt } from '../zeeba/kit';
import { Rise } from '../zeeba/motion';
import { Wren, type WrenMood } from '../zeeba/Wren';
import { FlowScreen, useUsableHeight } from '../zeeba/onboarding/Scaffold';
import { usePageTitle } from '../../lib/usePageTitle';

export function AuthScreen({
  title, subtitle, mood = 'idle', back = true, backLabel, onBack, children,
}: {
  title: string;
  subtitle?: string;
  /** Wren's face: happy when the form is ready to send, thinking when something needs fixing. */
  mood?: WrenMood;
  back?: boolean;
  backLabel?: string;
  onBack?: () => void;
  children: React.ReactNode;
}) {
  usePageTitle(title);
  // Small phones: a smaller Wren and less air, so the main button of the sign-in form is on the first screen.
  const short = useUsableHeight() < 700;
  return (
    <FlowScreen back={back} backLabel={backLabel} onBack={onBack} role="main" contentStyle={styles.content}>
      <Rise style={[styles.head, short && styles.headShort]}>
        <View style={styles.words}>
          <Txt variant="largeTitle" accessibilityRole="header" style={styles.title}>{title}</Txt>
          {subtitle ? <Txt variant="body" color={colors.ink2}>{subtitle}</Txt> : null}
        </View>
        <Wren mood={mood} size={short ? 62 : 84} decorative />
      </Rise>
      {children}
    </FlowScreen>
  );
}

/** "or" between the Apple / Google buttons and the email form. */
export function OrLine({ label }: { label: string }) {
  return (
    <View style={styles.or} aria-hidden>
      <View style={styles.rule} />
      <Txt variant="caption">{label}</Txt>
      <View style={styles.rule} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: space.xxl },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginTop: space.xs, marginBottom: space.lg },
  headShort: { marginTop: 0, marginBottom: space.sm },
  words: { flex: 1, minWidth: 0, gap: space.xxs },
  title: { fontSize: 32, lineHeight: 38, letterSpacing: -0.4 },
  or: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginVertical: space.md },
  rule: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.borderStrong },
});
