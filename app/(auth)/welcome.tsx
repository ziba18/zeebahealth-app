// Welcome: Apple's "Welcome to …" pattern. Wren + the promise, three feature rows (Record · Prove ·
// Reach), then sign-up anchored low: Sign in with Apple first (HIG), Google, email; then sign in.
import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, font, layout, radii, space, useColors } from '../../constants/zeebaUI';
import { Button, Txt } from '../../components/zeeba/kit';
import { SocialAuthButtons } from '../../components/auth/SocialAuthButtons';
import { Wren } from '../../components/zeeba/Wren';
import { Icon, type IconName } from '../../components/ui/Icon';
import { track } from '../../lib/analytics';

const FEATURES: { icon: IconName; title: string; line: string }[] = [
  { icon: 'mic', title: 'Record it', line: 'Say or type what happened, in your words. Every note is dated.' },
  { icon: 'bar-chart', title: 'Prove it', line: 'See how often and how bad, as clear counts and charts.' },
  { icon: 'file-text', title: 'Take it to your doctor', line: 'One page of evidence, ready for your appointment.' },
];

export default function WelcomeScreen() {
  const router = useRouter();
  const c = useColors();
  const win = useWindowDimensions();
  const short = win.height < 720;
  useEffect(() => track('Welcome Viewed'), []);

  return (
    <SafeAreaView role="main" edges={['top', 'bottom']} style={styles.screen}>
      <LinearGradient
        colors={[c.glow, 'rgba(0,0,0,0)']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.45 }}
        style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}
      />
      <ScrollView contentContainerStyle={styles.column} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Wren mood="happy" size={short ? 84 : 112} />
          <Txt style={styles.kicker} accessibilityRole="header" accessibilityLabel="Zeeba Health">Zeeba Health</Txt>
          <Txt variant="largeTitle" style={styles.center}>Your symptoms,{'\n'}on the record.</Txt>
        </View>

        <View style={styles.features}>
          {FEATURES.map((f) => (
            <View key={f.title} style={styles.feature} accessible accessibilityLabel={`${f.title}. ${f.line}`}>
              <View style={styles.featureIcon}><Icon name={f.icon} size={22} color={colors.accent} /></View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Txt variant="headline">{f.title}</Txt>
                <Txt variant="secondary">{f.line}</Txt>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.actions}>
          <SocialAuthButtons mode="signup" onEmail={() => router.push('/(auth)/register')} emailLabel="Sign up with email" />
          <Button label="I already have an account" variant="text" onPress={() => router.push('/(auth)/login')} />
          <Txt variant="caption" style={styles.center}>
            Evidence, never a diagnosis. Your notes stay private to your account.
          </Txt>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  column: {
    flexGrow: 1, width: '100%', maxWidth: layout.maxContentWidth, alignSelf: 'center',
    paddingHorizontal: layout.gutter + space.xs, paddingTop: space.xl, paddingBottom: space.lg, gap: space.xl,
  },
  hero: { alignItems: 'center', gap: space.xs },
  kicker: { ...font.semibold, fontSize: 15, letterSpacing: 0.2, color: colors.accent, marginTop: space.xs },
  center: { textAlign: 'center' },
  features: { gap: space.lg, paddingHorizontal: space.xxs },
  feature: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  featureIcon: { width: 44, height: 44, borderRadius: radii.row, backgroundColor: colors.accentTint, alignItems: 'center', justifyContent: 'center' },
  actions: { marginTop: 'auto', gap: space.xs },
});
