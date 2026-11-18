// The end of the questions, in two beats on one screen:
//   1. "Making your record": Wren thinks while three lines tick off (about two seconds).
//   2. "You're all set": Wren is proud, one burst of confetti, one success tap, and ONE next action:
//      her first note, which goes straight onto her report.
// Under Reduce Motion the first beat is skipped and everything is simply shown.
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, font, space } from '../../../constants/zeebaUI';
import { Txt } from '../../../components/zeeba/kit';
import { Confetti, Pop, Rise, useReduceMotion } from '../../../components/zeeba/motion';
import { Wren } from '../../../components/zeeba/Wren';
import { ClayIcon, type ClayIconName } from '../../../components/zeeba/art/ClayIcon';
import { Tick } from '../../../components/zeeba/onboarding/ChoiceCard';
import { BigButton, FlowScreen, useUsableHeight } from '../../../components/zeeba/onboarding/Scaffold';
import { openCapture } from '../../../lib/captureStore';
import { useAuthStore } from '../../../stores/authStore';
import { isHumanName } from '../../../lib/humanName';
import { haptics } from '../../../lib/haptics';
import { usePageTitle } from '../../../lib/usePageTitle';

const LINES: { icon: ClayIconName; label: string }[] = [
  { icon: 'record', label: 'Record ready' },
  { icon: 'prove', label: 'Charts ready' },
  { icon: 'reach', label: 'Report ready' },
];
const STEP_MS = 620;
const HOLD_MS = 420;

export default function OnboardingReady() {
  const router = useRouter();
  usePageTitle('You’re ready');
  const name = useAuthStore((s) => s.profile?.display_name);
  const first = isHumanName(name) ? name!.trim().split(/\s+/)[0] : '';
  const reduce = useReduceMotion();
  const short = useUsableHeight() < 700;

  // 0..3 = how many lines are ticked; `done` flips after the last one.
  const [ticked, setTicked] = useState(0);
  const [done, setDone] = useState(false);
  const [fire, setFire] = useState(0);
  const celebrated = useRef(false);

  useEffect(() => {
    if (done) return;
    if (reduce) { setTicked(LINES.length); setDone(true); return; }
    const timers = [
      ...LINES.map((_, i) => setTimeout(() => setTicked(i + 1), STEP_MS * (i + 1))),
      setTimeout(() => setDone(true), STEP_MS * LINES.length + HOLD_MS),
    ];
    return () => timers.forEach(clearTimeout);
  }, [reduce, done]);

  // One celebration, once.
  useEffect(() => {
    if (!done || celebrated.current) return;
    celebrated.current = true;
    haptics.success();
    setFire(1);
  }, [done]);

  const go = (note: boolean) => {
    router.replace('/(tabs)/today' as any);
    if (note) setTimeout(() => openCapture({ mode: 'type' }), 350);
  };

  return (
    <FlowScreen
      glow="full"
      scroll={false}
      role="main"
      footerStyle={styles.footer}
      footer={
        done ? (
          <Rise delay={260} style={styles.actions}>
            <BigButton label="Write my first note" icon="pencil" onPress={() => go(true)} />
            <BigButton label="Look around first" variant="text" onPress={() => go(false)} />
          </Rise>
        ) : <View />
      }
    >
      <View style={styles.middle}>
        <Wren mood={done ? 'proud' : 'thinking'} size={short ? 132 : 176} decorative />

        <View style={styles.words} accessibilityLiveRegion="polite">
          {done ? (
            <Pop key="done" style={styles.wordsInner}>
              <Txt variant="largeTitle" accessibilityRole="header" style={styles.center}>
                {first ? `You’re all set, ${first}.` : 'You’re all set.'}
              </Txt>
              <Txt style={styles.lede}>Your first note goes straight onto your report.</Txt>
            </Pop>
          ) : (
            <View style={styles.wordsInner}>
              <Txt variant="title" accessibilityRole="header" style={styles.center}>Making your record…</Txt>
            </View>
          )}
        </View>

        <View style={styles.card}>
          {LINES.map((l, i) => {
            const on = ticked > i;
            return (
              <View key={l.label} style={[styles.line, i > 0 && styles.lineRule]}>
                <ClayIcon name={l.icon} size={36} />
                <Txt style={[styles.lineText, !on && { color: colors.ink2 }]}>{l.label}</Txt>
                <Tick on={on} size={24} />
              </View>
            );
          })}
        </View>
      </View>
      <Confetti fire={fire} originY={0.3} />
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  middle: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.lg, paddingBottom: space.md },
  words: { alignSelf: 'stretch', minHeight: 100, justifyContent: 'center' },
  wordsInner: { alignItems: 'center', gap: space.xs },
  center: { textAlign: 'center' },
  lede: { ...font.regular, fontSize: 19, lineHeight: 25, letterSpacing: -0.3, color: colors.ink2, textAlign: 'center', maxWidth: 300 },
  card: {
    alignSelf: 'stretch', backgroundColor: colors.surface, borderRadius: 24, paddingHorizontal: space.md,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline,
    boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 10px 28px rgba(0,0,0,0.07)',
  },
  line: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 56 },
  lineRule: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.hairline },
  lineText: { ...font.semibold, fontSize: 17, lineHeight: 22, color: colors.ink, flex: 1 },
  actions: { gap: space.xxs },
  footer: { minHeight: 56 + 48 + space.xs + space.md },
});
