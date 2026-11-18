import React from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { colors, font, space } from '../../constants/zeebaUI';
import { LegalUrls } from '../../constants/config';
import { Txt } from '../zeeba/kit';
import { PressScale } from '../zeeba/motion';

export const openLegal = (page: keyof typeof LegalUrls) => Linking.openURL(LegalUrls[page]).catch(() => {});

function Link({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <PressScale onPress={onPress} haptic="none" accessibilityRole="link" accessibilityLabel={label} style={styles.link}>
      <Txt style={styles.linkText}>{label}</Txt>
    </PressScale>
  );
}

/** The sign-up agreement line, with the two pages as real (44 pt) links beneath it. */
export function LegalLinks() {
  return (
    <View style={styles.wrap}>
      <Txt variant="caption" style={styles.line}>
        By creating an account, you agree to our terms of use and privacy policy.
      </Txt>
      <View style={styles.row}>
        <Link label="Terms of use" onPress={() => openLegal('terms')} />
        <View style={styles.dot} />
        <Link label="Privacy policy" onPress={() => openLegal('privacy')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  line: { textAlign: 'center', paddingHorizontal: space.md },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.xs },
  link: { minHeight: 44, justifyContent: 'center', paddingHorizontal: space.xs },
  linkText: { ...font.semibold, fontSize: 14, lineHeight: 19, color: colors.accent },
  dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: colors.ink3 },
});
