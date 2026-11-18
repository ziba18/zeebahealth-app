import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { space } from '../../../constants/zeebaUI';
import { ScreenLarge } from '../../../components/zeeba/kit';
import { Group, GroupFooter, GroupHeading, GroupSwitchRow } from '../../../components/zeeba/records/GroupedRows';
import { ChoiceTile } from '../../../components/zeeba/onboarding/ChoiceCard';
import { NotificationPreview } from '../../../components/zeeba/onboarding/NotificationPreview';
import { TimeArt, type TimeOfDay } from '../../../components/zeeba/onboarding/TimeArt';
import { useAuthStore } from '../../../stores/authStore';
import { api } from '../../../lib/api';
import { syncDailyLogReminder } from '../../../lib/notifications';
import { REMINDER_TIMES } from '../../../lib/reminderTimes';

// The same three pictures and words as the reminder question in onboarding, so she recognises them here.
const partOfDay = (value: string): TimeOfDay => {
  const hour = Number(value.split(':')[0]);
  return hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
};
/** "Morning · 9:00 AM" → ["Morning", "9:00 am"]. */
const split = (label: string): [string, string] => {
  const [name, clock = ''] = label.split(' · ');
  return [name, clock.toLowerCase()];
};

export default function SettingsScreen() {
  const profile = useAuthStore((s) => s.profile);
  const setProfile = useAuthStore((s) => s.setProfile);

  // Update the screen straight away and save in the background.
  const persist = useCallback(
    (updates: Record<string, unknown>) => {
      const current = useAuthStore.getState().profile;
      if (current) setProfile({ ...current, ...updates } as typeof current);
      api.patch('/me', updates).catch(() => {});
    },
    [setProfile],
  );

  const reminderOn = profile?.daily_log_reminder_enabled ?? true;
  const reminderTime = profile?.daily_log_reminder_time ?? '20:00';
  const chosen = REMINDER_TIMES.find((t) => t.value === reminderTime);

  return (
    <ScreenLarge grouped title="Reminders" back={{ label: 'Profile' }}>
      <Group>
        <GroupSwitchRow
          icon="bell"
          label="Notifications"
          detail="Let Zeeba Health send you notifications"
          value={profile?.notifications_enabled ?? true}
          onChange={(v) => persist({ notifications_enabled: v })}
        />
        <GroupSwitchRow
          icon="clock"
          label="Daily reminder"
          detail="One short reminder a day"
          value={reminderOn}
          onChange={(v) => {
            persist({ daily_log_reminder_enabled: v });
            syncDailyLogReminder(v, reminderTime).catch(() => {});
          }}
        />
      </Group>
      {reminderOn ? (
        <>
          <GroupHeading title="When should it arrive?" style={{ marginTop: space.xxl }} />
          <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel="Reminder time">
            {REMINDER_TIMES.map((t) => {
              const [name, clock] = split(t.label);
              return (
                <ChoiceTile
                  key={t.value}
                  center
                  role="radio"
                  label={name}
                  detail={clock}
                  art={<TimeArt time={partOfDay(t.value)} size={46} />}
                  selected={reminderTime === t.value}
                  onPress={() => {
                    if (reminderTime === t.value) return;
                    persist({ daily_log_reminder_time: t.value });
                    syncDailyLogReminder(true, t.value).catch(() => {});
                  }}
                />
              );
            })}
          </View>
          <GroupHeading title="What you’ll see" style={{ marginTop: space.xl }} />
          <NotificationPreview when={chosen ? split(chosen.label)[1] : 'now'} />
          <GroupFooter style={{ marginTop: space.sm }}>You can turn it off here at any time.</GroupFooter>
        </>
      ) : null}
    </ScreenLarge>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.xs + 2 },
});
