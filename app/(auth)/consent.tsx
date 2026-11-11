import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { space } from '../../constants/zeebaUI';
import { CONSENT_VERSION } from '../../constants/config';
import { Button, InlineError, ScreenLarge, Txt } from '../../components/zeeba/kit';
import { Group, GroupFooter, GroupSwitchRow } from '../../components/zeeba/records/GroupedRows';
import { openLegal } from '../../components/auth/LegalLinks';
import { useAuthStore, type AuthUser } from '../../stores/authStore';
import { api } from '../../lib/api';
import { routeAfterSignIn } from '../../lib/authRouting';

const POINTS = [
  'What you record here (symptoms, period days, medicines, health history, notes) is health information.',
  'We store it so the app can show it back to you and build the summary for your doctor. Nothing else.',
  'It is kept in the EU and is private to your account. We never sell it or use it for adverts.',
  'You can change your mind at any time: Profile, then Delete account, removes all of it straight away.',
];

/**
 * Explicit consent to store health information (UK GDPR Article 9), asked once before anything is
 * recorded. Both switches start off, nothing is pre-ticked, and the server will not save a record
 * until this has been agreed. Changing CONSENT_VERSION asks everyone again.
 */
export default function ConsentScreen() {
  const router = useRouter();
  const signOut = useAuthStore((s) => s.signOut);
  const [adult, setAdult] = useState(false);
  const [agree, setAgree] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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
    <ScreenLarge brand grouped title="Your health information" subtitle="Before you record anything, we need your clear yes.">
      <View style={{ gap: space.sm, marginBottom: space.xl }}>
        {POINTS.map((p) => <Txt key={p} variant="body">{p}</Txt>)}
      </View>

      <Group>
        <GroupSwitchRow label="I am 16 or over" value={adult} onChange={setAdult} />
        <GroupSwitchRow
          label="I agree to Zeeba Health storing the health information I record"
          value={agree}
          onChange={setAgree}
        />
      </Group>
      <GroupFooter>Zeeba Health keeps a record of what you noted. It never diagnoses and is not a medical service.</GroupFooter>

      <View style={{ marginTop: space.xxl, gap: space.xs }}>
        <InlineError message={error} style={{ marginBottom: space.xs }} />
        <Button label={saving ? 'Saving…' : 'Agree and continue'} loading={saving} disabled={!adult || !agree} onPress={accept} />
        <Button label="Read the privacy policy" variant="text" onPress={() => openLegal('privacy')} />
        <Button label="Not now, sign me out" variant="text" onPress={decline} />
      </View>
    </ScreenLarge>
  );
}
