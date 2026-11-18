import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, type ScrollViewInstance } from 'react-native';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { colors, font, radii, space } from '../../../constants/zeebaUI';
import { DATA_LINES } from '../../../constants/dataLocation';
import {
  Button, Card, ConfirmCard, SafetyLine, ScreenLarge, Txt, showToast,
} from '../../../components/zeeba/kit';
import { Icon, type IconName } from '../../../components/ui/Icon';
import { PressScale, Rise } from '../../../components/zeeba/motion';
import { replayTour } from '../../../lib/tour';
import { REMINDER_TIMES } from '../../../lib/reminderTimes';
import { Group, GroupHeading, GroupRow, GroupSwitchRow } from '../../../components/zeeba/records/GroupedRows';
import { savedLabel } from '../../../components/zeeba/records/RecordsList';
import { KIND_INFO, firstParam, type RecordDataKind } from '../../../components/zeeba/records/recordKinds';
import { useAuthStore } from '../../../stores/authStore';
import { useRecordsStore } from '../../../stores/recordsStore';
import { isHumanName } from '../../../lib/humanName';
import { IS_PREVIEW } from '../../../lib/preview/flag';
import { FRIENDS_ENABLED } from '../../../lib/features';
import { canAppLock, isAppLockOn, setAppLock } from '../../../lib/appLock';
import { cancelAllScheduledNotifications } from '../../../lib/notifications';
import { openLegal } from '../../../components/auth/LegalLinks';

/** Visible tab title (the `from` param HeaderAvatar passes) → tab route name. */
const TAB_ROUTES: Record<string, string> = { Today: 'today', Evidence: 'timeline', Timeline: 'timeline', 'For my doctor': 'doctor' };

const RECORD_KINDS: RecordDataKind[] = ['medicine', 'appointment', 'history'];
const RECORD_ICONS: Record<RecordDataKind, IconName> = { medicine: 'pill', appointment: 'calendar', history: 'file-text' };

/** Preview mode only: whether Sam's sample data has been cleared this session. */
let previewCleared = false;

export default function ProfileScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { from: rawFrom } = useLocalSearchParams<{ from?: string }>();
  const from = TAB_ROUTES[firstParam(rawFrom)] ? firstParam(rawFrom) : 'Today';

  const profile = useAuthStore((s) => s.profile);
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const deleteAccount = useAuthStore((s) => s.deleteAccount);
  const records = useRecordsStore((s) => s.records);
  const clearSampleData = useRecordsStore((s) => s.clearSampleData);
  const restoreSampleData = useRecordsStore((s) => s.restoreSampleData);

  const [confirmingSignOut, setConfirmingSignOut] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [lockAvailable, setLockAvailable] = useState(false);
  const [lockOn, setLockOn] = useState(false);
  useEffect(() => {
    canAppLock().then(setLockAvailable);
    isAppLockOn().then(setLockOn);
  }, []);
  const scrollRef = useRef<ScrollViewInstance | null>(null);

  const name = isHumanName(profile?.display_name) ? profile!.display_name!.trim() : '';
  const counts: Record<RecordDataKind, number> = {
    medicine: records.medicine.length,
    appointment: records.appointment.length,
    history: records.history.length,
  };
  // Preview only: Restore follows an explicit "cleared" flag (module-level so it survives the
  // screen remounting), not "are there any records" — adding one after clearing must not hide it.
  const [sampleCleared, setSampleClearedState] = useState(previewCleared);
  const setSampleCleared = (v: boolean) => { previewCleared = v; setSampleClearedState(v); };

  // Profile is a hidden tab: jump straight back to the tab it was opened from (keeping that
  // tab's own stack), rather than the Tabs default of always returning to the first tab.
  const goBack = () => {
    const tabs = navigation.getParent();
    if (tabs) (tabs as any).navigate(TAB_ROUTES[from]);
    else router.navigate(`/(tabs)/${TAB_ROUTES[from]}` as any);
  };

  const openList = (kind: RecordDataKind) =>
    router.push({ pathname: '/(tabs)/profile/records/[kind]', params: { kind: KIND_INFO[kind].slug } } as any);

  const onSampleData = () => {
    if (sampleCleared) {
      restoreSampleData();
      setSampleCleared(false);
      showToast('Sample data restored.');
    } else {
      clearSampleData();
      setSampleCleared(true);
      showToast('Sample data cleared.');
    }
  };

  const onDeleteAccount = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await deleteAccount();
      await cancelAllScheduledNotifications();
      router.replace('/(auth)/welcome' as any);
    } catch {
      setDeleting(false);
      showToast('We couldn’t delete your account. Check your connection and try again.');
    }
  };

  // Settings → "Show me around again": back to Today, where Wren's tour starts by itself.
  const showAround = () => {
    replayTour();
    const tabs = navigation.getParent();
    if (tabs) (tabs as any).navigate('today');
    else router.navigate('/(tabs)/today' as any);
  };

  // Scrolls an in-page confirm card into view once it has laid out.
  const scrollToCard = (y: number) =>
    setTimeout(() => scrollRef.current?.scrollTo({ y: Math.max(0, y - space.xxl), animated: true }), 50);

  const reminderOn = profile?.daily_log_reminder_enabled ?? false;
  const reminderLabel = reminderOn
    ? (REMINDER_TIMES.find((t) => t.value === profile?.daily_log_reminder_time)?.label.split(' · ')[0] ?? 'On')
    : 'Off';
  const initial = ((name || user?.email || 'A')[0] ?? 'A').toUpperCase();

  return (
    <ScreenLarge grouped title="Profile" back={{ label: from, onPress: goBack }} scrollRef={scrollRef}>
      {/* Who is signed in: one big, obvious card. */}
      <Rise index={0}>
        <PressScale
          onPress={() => router.push('/(tabs)/profile/edit-profile' as any)}
          haptic="selection"
          to={0.98}
          accessibilityLabel={`${name || 'Your details'}${user?.email ? `, ${user.email}` : ''}. Edit your details`}
          style={styles.me}
        >
          <View style={styles.meAvatar} aria-hidden><Txt style={styles.meInitial}>{initial}</Txt></View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Txt variant="title" numberOfLines={1}>{name || 'Your details'}</Txt>
            {user?.email ? <Txt variant="secondary" numberOfLines={1}>{user.email}</Txt> : null}
            <Txt variant="secondary" color={colors.accent} style={{ fontWeight: '600', marginTop: 2 }}>Edit my details</Txt>
          </View>
          <Icon name="chevron-right" size={20} color={colors.ink3} />
        </PressScale>
      </Rise>

      {/* Settings: where every other app keeps them, named and marked with the gear. */}
      <Rise index={1}>
        <GroupHeading icon="settings" title="Settings" style={{ marginTop: space.xl }} />
        <Group>
          <GroupRow
            icon="bell"
            label="Reminders"
            value={reminderLabel}
            onPress={() => router.push('/(tabs)/profile/settings' as any)}
            accessibilityLabel={`Reminders and notifications. ${reminderOn ? `On, ${reminderLabel}` : 'Off'}`}
          />
          {lockAvailable ? (
            <GroupSwitchRow
              icon="lock"
              label="App lock"
              detail="Ask for Face ID, Touch ID or your passcode when Zeeba Health opens"
              value={lockOn}
              onChange={async (v) => { setLockOn(await setAppLock(v)); }}
            />
          ) : null}
          {FRIENDS_ENABLED ? (
            <GroupRow
              icon="users"
              label="Friends"
              detail="Share only your cycle phase with people you invite"
              onPress={() => router.push('/(tabs)/profile/friends' as any)}
            />
          ) : null}
          <GroupRow
            icon="play"
            label="Show me around again"
            detail="Wren points out where things are"
            chevron={false}
            onPress={showAround}
          />
        </Group>
      </Rise>

      <Rise index={2}>
        <GroupHeading icon="clipboard-list" title="My records" style={{ marginTop: space.xl }} />
        <Group>
          {RECORD_KINDS.map((kind) => (
            <GroupRow
              key={kind}
              icon={RECORD_ICONS[kind]}
              label={KIND_INFO[kind].listTitle}
              value={counts[kind] ? String(counts[kind]) : 'None'}
              onPress={() => openList(kind)}
              accessibilityLabel={`${KIND_INFO[kind].listTitle}. ${savedLabel(counts[kind])}`}
            />
          ))}
        </Group>
      </Rise>

      <Rise index={3}>
        <GroupHeading icon="shield" title="Privacy" style={{ marginTop: space.xl }} />
        <Group>
          <View style={{ gap: space.xs, padding: space.md }}>
            <Txt variant="headline">Where your notes are kept</Txt>
            {DATA_LINES.map((line) => <Txt key={line} variant="secondary">{line}</Txt>)}
          </View>
          <GroupRow icon="file-text" label="Privacy policy" onPress={() => openLegal('privacy')} />
          <GroupRow icon="file-text" label="Terms of use" onPress={() => openLegal('terms')} />
        </Group>
      </Rise>

      <Rise index={4}>
        <GroupHeading icon="user" title="Account" style={{ marginTop: space.xl }} />
        <Group>
          <GroupRow
            icon="log-out"
            label="Sign out"
            chevron={false}
            onPress={() => { setConfirmingDelete(false); setConfirmingSignOut(true); }}
          />
          {IS_PREVIEW ? null : (
            <GroupRow
              icon="trash-2"
              tone="danger"
              label="Delete account"
              chevron={false}
              onPress={() => { setConfirmingSignOut(false); setConfirmingDelete(true); }}
            />
          )}
        </Group>
      </Rise>

      {confirmingSignOut ? (
        <ConfirmCard
          title="Sign out of Zeeba Health?"
          message="Your information stays saved. You can sign in again any time."
          style={{ marginTop: space.xl }}
          onLayout={(e) => scrollToCard(e.nativeEvent.layout.y)}
          actions={[
            { label: 'Sign out', variant: 'primary', onPress: async () => { await signOut(); router.replace('/(auth)/welcome' as any); } },
            { label: 'Cancel', variant: 'text', onPress: () => setConfirmingSignOut(false) },
          ]}
        />
      ) : null}

      {confirmingDelete ? (
        <ConfirmCard
          tone="destructive"
          title="Delete your account?"
          message="This permanently deletes your account and everything you’ve saved in Zeeba Health: symptoms, periods, appointments, treatments, history and friend connections. It can’t be undone."
          style={{ marginTop: space.xl }}
          onLayout={(e) => scrollToCard(e.nativeEvent.layout.y)}
          actions={[
            { label: deleting ? 'Deleting…' : 'Delete account', variant: 'destructive', onPress: onDeleteAccount },
            { label: 'Cancel', variant: 'text', onPress: () => setConfirmingDelete(false) },
          ]}
        />
      ) : null}

      <SafetyLine style={{ marginTop: space.xxl }} />
      <Txt variant="secondary" style={{ textAlign: 'center', marginTop: space.sm }}>
        Your information is private to your account.
      </Txt>

      {IS_PREVIEW ? (
        <Button
          label={sampleCleared ? 'Restore sample data' : 'Clear sample data'}
          variant="text"
          style={{ marginTop: space.xl }}
          onPress={onSampleData}
        />
      ) : null}
    </ScreenLarge>
  );
}

const styles = StyleSheet.create({
  me: {
    flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, backgroundColor: colors.surface,
    borderRadius: radii.card, borderWidth: 1, borderColor: colors.cardBorder,
    boxShadow: '0 1px 2px rgba(16,18,40,0.04), 0 6px 18px rgba(16,18,40,0.06)',
  },
  meAvatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.accentTint, alignItems: 'center', justifyContent: 'center' },
  meInitial: { ...font.roundedBold, fontSize: 28, lineHeight: 34, color: colors.accent },
});
