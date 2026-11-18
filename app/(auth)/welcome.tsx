// Welcome: one character, one line, two buttons (the pattern Duolingo, Finch and Noom share).
// Wren waves in the middle of a calm, slowly drifting glow; the wordmark and the promise sit under it;
// "Get started" and "I already have an account" are stacked at the bottom. Nothing else competes.
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, font, space } from '../../constants/zeebaUI';
import { Txt } from '../../components/zeeba/kit';
import { Pop, Rise } from '../../components/zeeba/motion';
import { Wren, WREN_ASPECT } from '../../components/zeeba/Wren';
import { Halo } from '../../components/zeeba/onboarding/Backdrop';
import { BigButton, FlowScreen, useUsableHeight } from '../../components/zeeba/onboarding/Scaffold';
import { track } from '../../lib/analytics';

export default function WelcomeScreen() {
  const router = useRouter();
  const height = useUsableHeight();
  const wren = height < 700 ? 176 : height < 800 ? 208 : 236;
  useEffect(() => track('Welcome Viewed'), []);

  return (
    <FlowScreen
      glow="full"
      scroll={false}
      role="main"
      footer={
        <Rise delay={420} style={styles.actions}>
          <BigButton label="Get started" onPress={() => router.push('/(auth)/intro' as any)} />
          <BigButton label="I already have an account" variant="text" onPress={() => router.push('/(auth)/login')} />
        </Rise>
      }
    >
      <View style={styles.middle}>
        <Pop style={[styles.hero, { height: wren * WREN_ASPECT }]}>
          <Halo size={wren * 1.75} />
          <Wren mood="wave" size={wren} interactive />
        </Pop>
        <Rise delay={180} style={styles.words}>
          <Txt style={styles.wordmark} accessibilityRole="header" accessibilityLabel="Zeeba Health">Zeeba Health</Txt>
          <Txt style={styles.headline}>Your symptoms,{'\n'}on the record.</Txt>
        </Rise>
      </View>
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  middle: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.xl, paddingBottom: space.md },
  hero: { alignItems: 'center', justifyContent: 'center' },
  words: { alignItems: 'center', gap: space.xs },
  wordmark: { ...font.bold, fontSize: 17, lineHeight: 22, letterSpacing: 0.3, color: colors.accent },
  headline: { ...font.bold, fontSize: 38, lineHeight: 44, letterSpacing: -0.8, color: colors.ink, textAlign: 'center' },
  actions: { gap: space.xxs },
});
