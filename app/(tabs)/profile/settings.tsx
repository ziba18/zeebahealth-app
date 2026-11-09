import React, { useCallback } from 'react';
import { View } from 'react-native';
import { space } from '../../../constants/zeebaUI';
import { ChipGroup, ScreenLarge } from '../../../components/zeeba/kit';
import { Group, GroupFooter, GroupHeading, GroupSwitchRow } from '../../../components/zeeba/records/GroupedRows';
import { useAuthStore } from '../../../stores/authStore';
import { api } from '../../../lib/api';
import { syncDailyLogReminder } from '../../../lib/notifications';
import { REMINDER_TIMES } from '../../../lib/reminderTimes';

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

  return (
    <ScreenLarge grouped title="Reminders" back={{ label: 'Profile' }}>
      <Group>
        <GroupSwitchRow
          label="Notifications"
          detail="Allow Zeeba Health to send you notifications"
          value={profile?.notifications_enabled ?? true}
          onChange={(v) => persist({ notifications_enabled: v })}
        />
        <GroupSwitchRow
          label="Daily reminder"
          detail="A daily nudge to note how you’re feeling"
          value={reminderOn}
          onChange={(v) => {
            persist({ daily_log_reminder_enabled: v });
            syncDailyLogReminder(v, reminderTime).catch(() => {});
          }}
        />
      </Group>
      {reminderOn ? (
        <>
          <GroupHeading title="Reminder time" style={{ marginTop: space.xxl }} />
          <Group>
            <View style={{ padding: space.md }}>
              <ChipGroup
                options={REMINDER_TIMES.map((t) => ({ value: t.value, label: t.label }))}
                ghosts={[]}
                value={reminderTime}
                accessibilityLabel="Reminder time"
                onChange={(v) => {
                  if (!v) return;
                  persist({ daily_log_reminder_time: v });
                  syncDailyLogReminder(true, v).catch(() => {});
                }}
              />
            </View>
          </Group>
          <GroupFooter>{'The reminder says: “If today’s worth noting, I’m here. Two minutes is plenty.”'}</GroupFooter>
        </>
      ) : null}
    </ScreenLarge>
  );
}
