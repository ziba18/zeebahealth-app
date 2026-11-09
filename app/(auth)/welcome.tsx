import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts, layout, space } from '../../constants/zeebaUI';
import { Button, Card, Quote, Txt } from '../../components/zeeba/kit';
import { SocialAuthButtons } from '../../components/auth/SocialAuthButtons';
import { track } from '../../lib/analytics';
import { Wren } from '../../components/zeeba/Wren';

const STEPS = [
  { word: 'Record', line: 'In your words, dated' },
  { word: 'Prove', line: 'Charts and counts over time' },
  { word: 'Reach', line: 'A report for your doctor' },
];

/**
 * One calm screen: upright wordmark + Wren, one authoritative hero line, one plain sentence,
 * the three pillars (Record · Prove · Reach), then the actions anchored low. Copy: design/BRAND.md.
 */
export default function WelcomeScreen() {
  const router = useRouter();
  // Short phones (iPhone SE class): keep the buttons on the first screen, drop the step strip.
  const win = useWindowDimensions();
  const short = win.height < 700;
  const narrow = win.width < 300; // 200% text on a small phone: three columns would break words
  useEffect(() => track('Welcome Viewed'), []);

  return (
    <SafeAreaView role="main" edges={['top', 'bottom']} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.column} showsVerticalScrollIndicator={false}>
        <View style={styles.band}>
          <LinearGradient
            colors={[colors.burgundyTint, colors.canvas]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}
          />
          <View style={styles.brandRow}>
            <Txt variant="headline" color={colors.burgundy} accessibilityRole="header" accessibilityLabel="Zeeba Health" style={styles.wordmark}>Zeeba Health</Txt>
            <Wren mood="happy" size={short ? 64 : 96} />
          </View>
        </View>

        <View style={styles.hero}>
          <Txt variant="title" accessibilityRole="header" style={[styles.heroUpright, short || win.width < 380 ? undefined : styles.heroLine]}>Your symptoms, on the record.</Txt>
          <Txt variant="body" color={colors.ink2}>
            Log what your body is doing, in your own words. Zeeba Health turns it into dated evidence your doctor can read in a minute.
          </Txt>
          <Card style={styles.example}>
            <Txt variant="caption" color={colors.ink2}>What you say</Txt>
            <Quote>Sharp low belly pain since Tuesday, worse in the evening, missed work.</Quote>
            <Txt variant="caption" color={colors.ink2}>What your doctor sees</Txt>
            <View style={styles.tags}>
              {['Lower belly', '7/10 at worst', '3 days'].map((t) => (
                <View key={t} style={styles.tag}>
                  <Txt variant="caption" color={colors.burgundy} style={styles.tagText}>{t}</Txt>
                </View>
              ))}
            </View>
          </Card>
        </View>

        {short || narrow ? null : <View style={styles.steps} accessibilityLabel="How it works. One, record. Two, prove. Three, reach your doctor.">
          {STEPS.map((st, i) => (
            <View key={st.word} style={styles.step}>
              <View style={styles.stepNum}><Txt variant="caption" color={colors.burgundy} style={styles.tagText}>{i + 1}</Txt></View>
              <Txt variant="headline">{st.word}</Txt>
              <Txt variant="caption" color={colors.ink2} style={{ textAlign: 'center' }}>{st.line}</Txt>
            </View>
          ))}
        </View>}

        {short ? null : <Txt variant="caption" color={colors.ink2} style={{ textAlign: 'center', marginBottom: space.sm }}>
          Evidence, not a diagnosis. Your words, your dates, your record.
        </Txt>}

        <View style={styles.actions}>
          <Button label="Create an account" onPress={() => router.push('/(auth)/register')} />
          <Button label="I already have an account" variant="text" onPress={() => router.push('/(auth)/login')} />
          <SocialAuthButtons mode="signup" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  column: {
    flexGrow: 1, width: '100%', maxWidth: layout.maxContentWidth, alignSelf: 'center',
    paddingHorizontal: layout.gutter, paddingBottom: space.xl,
  },
  // Full-bleed band: the column's gutter is cancelled so the wash runs to the screen edges.
  band: { marginHorizontal: -layout.gutter, paddingHorizontal: layout.gutter, paddingTop: space.md, paddingBottom: space.sm, gap: space.xs },
  brandRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  wordmark: { fontFamily: fonts.semibold, fontSize: 22, lineHeight: 28, letterSpacing: -0.2, paddingBottom: space.xs },
  heroLine: { fontSize: 36, lineHeight: 42 },
  // Upright Inter = the app's own authoritative voice; serif stays reserved for her words (BRAND.md).
  heroUpright: { fontSize: 30, lineHeight: 36, letterSpacing: -0.4 },
  steps: { flexDirection: 'row', gap: space.sm, marginBottom: space.md },
  step: { flex: 1, alignItems: 'center', gap: 4 },
  stepNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.burgundyTint, alignItems: 'center', justifyContent: 'center' },
  // Top-weighted: the promise sits in the upper third, the spare room falls between the card and the
  // anchored actions (not above the headline).
  hero: { flexGrow: 1, justifyContent: 'flex-start', gap: space.sm, paddingTop: space.sm, paddingBottom: space.lg },
  example: { gap: space.xs, marginTop: space.sm },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  tag: { backgroundColor: colors.burgundyTint, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  tagText: { fontWeight: '600' },
  actions: { gap: space.xs },
});
