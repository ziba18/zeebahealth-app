// Last question: a daily reminder. She picks a time, sees what the reminder will look like, then chooses
// "Turn on reminder" (the iPhone asks its own permission question next) or "Not now".
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { space } from '../../../constants/zeebaUI';
import { InlineError, Txt } from '../../../components/zeeba/kit';
import { Rise } from '../../../components/zeeba/motion';
import { OnboardingScreen } from '../../../components/auth/OnboardingScreen';
import { ChoiceTile } from '../../../components/zeeba/onboarding/ChoiceCard';
import { NotificationPreview } from '../../../components/zeeba/onboarding/NotificationPreview';
import { BigButton } from '../../../components/zeeba/onboarding/Scaffold';
import { TimeArt, type TimeOfDay } from '../../../components/zeeba/onboarding/TimeArt';
import { useAuthStore } from '../../../stores/authStore';
import { api } from '../../../lib/api';
import { syncDailyLogReminder } from '../../../lib/notifications';
import { REMINDER_TIMES } from '../../../lib/reminderTimes';
import { isHumanName } from '../../../lib/humanName';
import { track } from '../../../lib/analytics';

// Stored when the reminder is off (as before), so Settings has a time ready if it's turned on.
const DEFAULT_TIME = '20:00';

const partOfDay = (value: string): TimeOfDay => {
  const hour = Number(value.split(':')[0]);
  return hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
};
/** "Morning · 9:00 AM" → ["Morning", "9:00 am"]. */
const split = (label: string): [string, string] => {
  const [name, clock = ''] = label.split(' · ');
  return [name, clock.toLowerCase()];
};

export default function OnboardingReminders() {
  const router = useRouter();
  const fetchProfile = useAuthStore((s) => s.fetchProfile);
  const displayName = useAuthStore((s) => s.profile?.display_name);
  const first = isHumanName(displayName) ? displayName!.trim().split(/\s+/)[0] : '';
  // Nothing pre-selected: choosing a time is the "yes"; "Not now" is the "no".
  const [time, setTime] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState<'on' | 'off' | null>(null);

  const finish = async (enabled: boolean) => {
    const at = enabled && time ? time : DEFAULT_TIME;
    setLoading(enabled ? 'on' : 'off');
    setError('');
    try {
      await api.patch('/me', {
        notifications_enabled: enabled,
        daily_log_reminder_enabled: enabled,
        daily_log_reminder_time: at,
        onboarding_complete: true,
      });
      // Asks for notification permission when turning the reminder on; not critical if refused.
      await syncDailyLogReminder(enabled, at).catch(() => {});
      await fetchProfile();
      track('Onboarding Completed', { reminder: enabled });
      router.replace('/(auth)/onboarding/ready' as any);
    } catch {
      setError('We couldn’t finish setting up. Check your connection and try again.');
      setLoading(null);
    }
  };

  const chosen = REMINDER_TIMES.find((t) => t.value === time);
  return (
    <OnboardingScreen
      question="reminder"
      ask={first ? `Shall I remind you once a day, ${first}?` : 'Shall I remind you once a day?'}
      hint={chosen ? 'Lovely. This is what you’ll see.' : 'Pick a time that suits you.'}
      mood={chosen ? 'happy' : 'thinking'}
      footer={
        <>
          <InlineError message={error} />
          <BigButton
            label={loading === 'on' ? 'Finishing…' : 'Turn on reminder'}
            icon="bell"
            loading={loading === 'on'}
            disabled={!time || loading !== null}
            onPress={() => finish(true)}
            accessibilityHint="Your iPhone will ask you to allow notifications."
          />
          <BigButton
            label={loading === 'off' ? 'Finishing…' : 'Not now'}
            variant="text"
            disabled={loading !== null}
            onPress={() => finish(false)}
          />
        </>
      }
    >
      <Rise index={1} style={styles.times}>
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
                selected={time === t.value}
                onPress={() => setTime(time === t.value ? null : t.value)}
              />
            );
          })}
        </View>
      </Rise>

      <Rise index={2} style={styles.preview}>
        <NotificationPreview when={chosen ? split(chosen.label)[1] : 'now'} />
        <Txt variant="caption" style={styles.note}>
          One short reminder a day. Your iPhone will ask you to allow it. You can change it any time in Settings.
        </Txt>
      </Rise>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  times: { marginTop: space.xxs },
  row: { flexDirection: 'row', gap: space.xs + 2 },
  preview: { marginTop: space.xl, gap: space.sm },
  note: { textAlign: 'center', paddingHorizontal: space.md },
});
