import React, { useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, font, space } from '../../constants/zeebaUI';
import { CONSENT_VERSION } from '../../constants/config';
import { InlineError, Txt } from '../../components/zeeba/kit';
import { PressScale, Rise } from '../../components/zeeba/motion';
import { ClayIcon, type ClayIconName } from '../../components/zeeba/art/ClayIcon';
import { openLegal } from '../../components/auth/LegalLinks';
import { BigButton, FlowScreen } from '../../components/zeeba/onboarding/Scaffold';
import { useAuthStore, type AuthUser } from '../../stores/authStore';
import { api } from '../../lib/api';
import { routeAfterSignIn } from '../../lib/authRouting';
import { haptics } from '../../lib/haptics';
import { usePageTitle } from '../../lib/usePageTitle';

// THE WORDING ON THIS SCREEN IS VERSIONED (CONSENT_VERSION). Layout and motion may change; the strings may not.
const POINTS: { icon: ClayIconName; text: string }[] = [
  { icon: 'heart', text: 'What you record here (symptoms, period days, medicines, health history, notes) is health information.' },
  { icon: 'reach', text: 'We store it so the app can show it back to you and build the summary for your doctor. Nothing else.' },
  { icon: 'lock', text: 'It is kept in the EU and is private to your account. We never sell it or use it for adverts.' },
  { icon: 'pencil', text: 'You can change your mind at any time: Profile, then Delete account, removes all of it straight away.' },
];

/** One yes/no row: the whole row is the target (56 pt or taller), not only the small switch. */
function SwitchRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <PressScale
      onPress={() => onChange(!value)}
      haptic="selection"
      to={0.985}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      style={styles.switchRow}
    >
      <Txt variant="body" style={styles.switchLabel}>{label}</Txt>
      {/* The row handles the tap; the switch only shows the state (so one tap never counts twice). */}
      <View style={{ pointerEvents: 'none' }} accessible={false} importantForAccessibility="no-hide-descendants" aria-hidden>
        <Switch
          value={value}
          onValueChange={(v) => { haptics.selection(); onChange(v); }}
          trackColor={{ false: colors.borderStrong, true: colors.accent }}
          thumbColor={colors.white}
          ios_backgroundColor={colors.borderStrong}
          // react-native-web only (the design preview): its "on" thumb is teal unless told otherwise.
          {...({ activeThumbColor: '#FFFFFF' } as object)}
        />
      </View>
    </PressScale>
  );
}

/**
 * Explicit consent to store health information (UK GDPR Article 9), asked once before anything is
 * recorded. Both switches start off, nothing is pre-ticked, and the server will not save a record
 * until this has been agreed. Changing CONSENT_VERSION asks everyone again.
 *
 * Layout: what we do with her information scrolls at the top; her decision (the two switches and the
 * button) is pinned at the bottom, so it is always visible, however small the phone.
 */
export default function ConsentScreen() {
  const router = useRouter();
  const signOut = useAuthStore((s) => s.signOut);
  const [adult, setAdult] = useState(false);
  const [agree, setAgree] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  usePageTitle('Your health information');

  const accept = async () => {
    setSaving(true);
    setError('');
    try {
      const user = await api.post<AuthUser>('/auth/consent', { version: CONSENT_VERSION });
      useAuthStore.getState().setUser(user);
      router.replace(routeAfterSignIn(useAuthStore.getState().profile, user) as any);
    } catch {
      setSaving(false);
      setError('We couldn’t save that. Check your connection and try again.');
    }
  };

  const decline = async () => {
    await signOut();
    router.replace('/(auth)/welcome');
  };

  return (
    <FlowScreen
      role="main"
      contentStyle={styles.content}
      footer={
        <>
          <View style={styles.group}>
            <SwitchRow label="I am 16 or over" value={adult} onChange={setAdult} />
            <View style={styles.rule} />
            <SwitchRow
              label="I agree to Zeeba Health storing the health information I record"
              value={agree}
              onChange={setAgree}
            />
          </View>
          <Txt variant="caption" style={styles.groupFooter}>Zeeba Health keeps a record of what you noted. It never diagnoses and is not a medical service.</Txt>
          <InlineError message={error} />
          <BigButton label={saving ? 'Saving…' : 'Agree and continue'} loading={saving} disabled={!adult || !agree} onPress={accept} />
          <View style={styles.links}>
            <BigButton label="Read the privacy policy" variant="text" small onPress={() => openLegal('privacy')} style={styles.link} />
            <BigButton label="Not now, sign me out" variant="text" small onPress={decline} style={styles.link} />
          </View>
        </>
      }
    >
      <Rise style={styles.head}>
        <Txt variant="largeTitle" accessibilityRole="header" style={styles.title}>Your health information</Txt>
        <Txt variant="body" color={colors.ink2} style={styles.sub}>Before you record anything, we need your clear yes.</Txt>
      </Rise>

      <View style={styles.points}>
        {POINTS.map((p, i) => (
          <Rise key={p.text} index={i + 1} style={[styles.point, i > 0 && styles.pointRule]}>
            <ClayIcon name={p.icon} size={34} />
            <Txt style={styles.pointText}>{p.text}</Txt>
          </Rise>
        ))}
      </View>
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: space.md, paddingBottom: space.sm },
  head: { gap: space.xxs, marginBottom: space.sm },
  title: { fontSize: 32, lineHeight: 38, letterSpacing: -0.4 },
  sub: { fontSize: 16, letterSpacing: -0.5 },
  points: {
    backgroundColor: colors.surface, borderRadius: 24, paddingHorizontal: space.md,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline,
    boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 6px 18px rgba(0,0,0,0.05)',
  },
  point: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm, paddingVertical: space.sm },
  pointRule: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.hairline },
  pointText: { ...font.regular, fontSize: 16, lineHeight: 21, letterSpacing: -0.3, color: colors.ink, flex: 1, minWidth: 0 },

  group: {
    backgroundColor: colors.surface, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline,
    boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 6px 18px rgba(0,0,0,0.05)', overflow: 'hidden',
  },
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: colors.hairline, marginLeft: space.md },
  switchRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.md, paddingVertical: space.sm },
  switchLabel: { flex: 1, minWidth: 0 },
  groupFooter: { paddingHorizontal: space.md, marginTop: space.xxs, marginBottom: space.xxs },
  links: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-evenly' },
  link: { minHeight: 48, paddingHorizontal: space.xxs },
});
