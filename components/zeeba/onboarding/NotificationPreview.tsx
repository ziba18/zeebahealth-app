// A picture of the daily reminder as it will arrive on her lock screen, so the permission question that
// follows makes sense. The words are the real ones the app schedules (lib/notifications.ts): keep them the same.
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, font, space } from '../../../constants/zeebaUI';
import { Txt } from '../kit';
import { Wren } from '../Wren';

export const REMINDER_TITLE = 'Zeeba Health';
export const REMINDER_BODY = 'If today’s worth noting, I’m here. Two minutes is plenty.';

export function NotificationPreview({ when = 'now' }: { when?: string }) {
  return (
    <View
      style={styles.banner}
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Example reminder. ${REMINDER_TITLE}. ${REMINDER_BODY}`}
    >
      <View style={styles.icon}>
        <Wren mood="idle" size={34} animated={false} decorative />
      </View>
      <View style={styles.text}>
        <View style={styles.top}>
          <Txt style={styles.title} numberOfLines={1}>{REMINDER_TITLE}</Txt>
          <Txt style={styles.when}>{when}</Txt>
        </View>
        <Txt style={styles.body}>{REMINDER_BODY}</Txt>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.sm, paddingRight: space.md,
    borderRadius: 24, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline,
    boxShadow: '0 2px 6px rgba(0,0,0,0.06), 0 14px 34px rgba(0,0,0,0.12)',
  },
  // The app icon: Wren on bone, in both appearances (an icon does not change with the theme).
  icon: { width: 44, height: 44, borderRadius: 11, backgroundColor: '#FBF0EC', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  text: { flex: 1, minWidth: 0, gap: 1 },
  top: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: space.xs },
  title: { ...font.semibold, fontSize: 15, lineHeight: 20, color: colors.ink, flexShrink: 1 },
  when: { ...font.regular, fontSize: 13, lineHeight: 18, color: colors.ink2, fontVariant: ['tabular-nums'] },
  body: { ...font.regular, fontSize: 15, lineHeight: 20, color: colors.ink },
});
