// The end of onboarding: "your record is ready" with Wren, what happens next in three lines
// (Record · Prove · Reach, Apple "what's new" style), and the one next action: the first note.
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, layout, radii, space } from '../../../constants/zeebaUI';
import { Button, Txt } from '../../../components/zeeba/kit';
import { Wren } from '../../../components/zeeba/Wren';
import { Icon, type IconName } from '../../../components/ui/Icon';
import { openCapture } from '../../../lib/captureStore';
import { useAuthStore } from '../../../stores/authStore';
import { isHumanName } from '../../../lib/humanName';
import { usePageTitle } from '../../../lib/usePageTitle';

const NEXT: { icon: IconName; title: string; line: string }[] = [
  { icon: 'mic', title: 'Record', line: 'Say or type what your body is doing. Each note is dated.' },
  { icon: 'bar-chart', title: 'Prove', line: 'Evidence turns your notes into counts and charts over weeks.' },
  { icon: 'file-text', title: 'Reach', line: 'One clear report for your doctor, in your own words.' },
];

export default function OnboardingReady() {
  const router = useRouter();
  usePageTitle('You’re ready');
  const name = useAuthStore((s) => s.profile?.display_name);
  const first = isHumanName(name) ? name!.trim().split(/\s+/)[0] : '';

  const go = (note: boolean) => {
    router.replace('/(tabs)/today' as any);
    if (note) setTimeout(() => openCapture({ mode: 'type' }), 350);
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.column} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Wren mood="proud" size={120} />
          <Txt variant="largeTitle" accessibilityRole="header" style={styles.center}>
            {first ? `You’re set, ${first}.` : 'You’re set.'}
          </Txt>
          <Txt variant="body" color={colors.ink2} style={styles.center}>
            Your record starts with today. The more days it holds, the harder it is to dismiss.
          </Txt>
        </View>
        <View style={styles.list}>
          {NEXT.map((n) => (
            <View key={n.title} style={styles.row} accessible accessibilityLabel={`${n.title}. ${n.line}`}>
              <View style={styles.icon}><Icon name={n.icon} size={22} color={colors.accent} /></View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Txt variant="headline">{n.title}</Txt>
                <Txt variant="secondary">{n.line}</Txt>
              </View>
            </View>
          ))}
        </View>
        <View style={styles.actions}>
          <Button label="Write my first note" icon="pencil" onPress={() => go(true)} />
          <Button label="Go to Today" variant="text" onPress={() => go(false)} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  column: {
    flexGrow: 1, width: '100%', maxWidth: layout.maxContentWidth, alignSelf: 'center',
    paddingHorizontal: layout.gutter + space.xs, paddingTop: space.xxl, paddingBottom: space.xl, gap: space.xxl,
  },
  hero: { alignItems: 'center', gap: space.sm },
  center: { textAlign: 'center' },
  list: { gap: space.lg },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  icon: { width: 44, height: 44, borderRadius: radii.row, backgroundColor: colors.accentTint, alignItems: 'center', justifyContent: 'center' },
  actions: { marginTop: 'auto', gap: space.xs },
});
