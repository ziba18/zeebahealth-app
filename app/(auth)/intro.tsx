// Three light pages before sign-up: Record · Prove · Reach. One picture, one line, one big "Next" each.
// Tapping is all it needs (no swiping); "Skip" is always visible; Back steps back a page.
import React, { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, font, radii, space } from '../../constants/zeebaUI';
import { Txt } from '../../components/zeeba/kit';
import { Pop, PressScale, Rise } from '../../components/zeeba/motion';
import { Wren } from '../../components/zeeba/Wren';
import { ClayIcon, type ClayIconName } from '../../components/zeeba/art/ClayIcon';
import { Halo } from '../../components/zeeba/onboarding/Backdrop';
import { BigButton, FlowScreen, useUsableHeight } from '../../components/zeeba/onboarding/Scaffold';
import { usePageTitle } from '../../lib/usePageTitle';

const PAGES: { icon: ClayIconName; word: string; line: string }[] = [
  { icon: 'record', word: 'Record', line: 'Say or type how you feel. We add the date.' },
  { icon: 'prove', word: 'Prove', line: 'See how often, and how bad, in clear charts.' },
  { icon: 'reach', word: 'Reach', line: 'Take one clear page to your doctor.' },
];

const REACH_PHOTO = require('../../assets/photos/report-waiting-room.jpg');

export default function IntroScreen() {
  const router = useRouter();
  const [page, setPage] = useState(0);
  const height = useUsableHeight();
  const art = height < 700 ? 132 : 168;
  const p = PAGES[page];
  const last = page === PAGES.length - 1;
  usePageTitle(p.word);

  const signUp = () => router.push('/(auth)/register');

  return (
    <FlowScreen
      glow="full"
      scroll={false}
      role="main"
      back
      onBack={() => (page > 0 ? setPage(page - 1) : router.back())}
      right={
        <PressScale onPress={signUp} haptic="none" accessibilityLabel="Skip the introduction" style={styles.skip}>
          <Txt style={styles.skipText}>Skip</Txt>
        </PressScale>
      }
      footer={
        <>
          <View
            style={styles.dots}
            accessible
            accessibilityRole="progressbar"
            accessibilityLabel={`Page ${page + 1} of ${PAGES.length}`}
          >
            {PAGES.map((_, i) => <View key={i} style={[styles.dot, i === page && styles.dotOn]} />)}
          </View>
          <BigButton label={last ? 'Continue' : 'Next'} onPress={() => (last ? signUp() : setPage(page + 1))} />
        </>
      }
    >
      <View style={styles.middle}>
        <View style={[styles.stage, { height: art * 1.25 }]}>
          <Halo size={art * 2.1} />
          <View style={styles.pair}>
            {/* Wren stays put and points; only the picture changes with the page. */}
            <Wren mood="point" pointAt="right" size={art * 0.74} decorative style={styles.wren} />
            {/* The last page shows the photograph (owner, 23 Nov 2026) in place of the drawn icon. */}
            <Pop key={page}>
              {p.icon === 'reach'
                ? <Image source={REACH_PHOTO} resizeMode="cover" accessible={false} aria-hidden style={{ width: art * 1.1, height: art * 1.25, borderRadius: radii.card }} />
                : <ClayIcon name={p.icon} size={art} />}
            </Pop>
          </View>
        </View>
        <Rise key={`words${page}`} delay={90} style={styles.words}>
          <Txt style={styles.word}>{p.word}</Txt>
          <Txt style={styles.line} accessibilityRole="header">{p.line}</Txt>
        </Rise>
      </View>
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  middle: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.xl, paddingBottom: space.lg },
  stage: { alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' },
  pair: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', marginLeft: -space.md },
  wren: { marginRight: -space.sm, marginBottom: -space.xxs },
  words: { alignItems: 'center', gap: space.xs, paddingHorizontal: space.xs },
  word: { ...font.bold, fontSize: 15, lineHeight: 20, letterSpacing: 1.6, textTransform: 'uppercase', color: colors.accent },
  line: { ...font.bold, fontSize: 30, lineHeight: 36, letterSpacing: -0.6, color: colors.ink, textAlign: 'center' },
  skip: { minHeight: 48, minWidth: 64, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.sm },
  skipText: { ...font.semibold, fontSize: 17, lineHeight: 22, color: colors.accent },
  dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 7, height: 28, marginBottom: space.xs },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.borderStrong, opacity: 0.45 },
  dotOn: { width: 24, backgroundColor: colors.accent, opacity: 1 },
});
