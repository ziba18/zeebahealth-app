// "Questions to ask your GP": a fixed list, the same for everyone and in the same order (lib/learn/pages.ts).
// She taps the ones she wants; they join her own questions ("What I'd like from this appointment") word for word
// and print on the report. Nothing is pre-ticked or suggested from her records.
import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, radii, space } from '../../../constants/zeebaUI';
import { Card, InlineError, SafetyLine, ScreenLarge, Txt } from '../../../components/zeeba/kit';
import { Icon } from '../../../components/ui/Icon';
import { useDoctorBuilder } from '../../../components/zeeba/doctor/useDoctorDoc';
import { haptics } from '../../../lib/haptics';
import { COMMON_QUESTIONS } from '../../../lib/learn/pages';
import { agendaBlockOf } from '../../../lib/records/summary';
import { usePageTitle } from '../../../lib/usePageTitle';
import { useRecordsStore } from '../../../stores/recordsStore';

/** Same limit as the editor on the For my doctor tab. */
const MAX_QUESTIONS = 8;

export default function QuestionsScreen() {
  usePageTitle('Questions to ask your GP');
  const router = useRouter();
  const savedNote = useRecordsStore((s) => s.records.doctor_note[0]?.data.text ?? '');
  const saveDoctorNote = useRecordsStore((s) => s.saveDoctorNote);
  const agenda = useDoctorBuilder((s) => s.agenda);
  const setAgenda = useDoctorBuilder((s) => s.setAgenda);
  const loadAgenda = useDoctorBuilder((s) => s.loadAgenda);
  const [error, setError] = useState('');

  // Opened before the tab loaded her saved list: start from it (unless she has edited this session).
  useEffect(() => { loadAgenda(savedNote); }, [savedNote, loadAgenda]);

  const block = agendaBlockOf(agenda, '');
  const priority = block?.priority ?? '';
  const questions = block?.questions ?? [];
  const full = questions.length >= MAX_QUESTIONS;

  const toggle = async (q: string) => {
    const has = questions.includes(q);
    if (!has && full) {
      setError(`Your list holds up to ${MAX_QUESTIONS} questions. Remove one to add another.`);
      return;
    }
    haptics.light();
    setError('');
    const next = [priority, ...(has ? questions.filter((x) => x !== q) : [...questions, q])].filter(Boolean).join('\n');
    setAgenda(next);
    try {
      await saveDoctorNote(next);
    } catch {
      setError('Your questions couldn’t be saved just now. They’re still in this report.');
    }
  };

  const back = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/doctor' as any);
  };

  return (
    <ScreenLarge title="Questions to ask your GP" back={{ label: 'For my doctor', onPress: back }}>
      <Txt variant="secondary" style={{ marginTop: space.xs }}>
        The same list for everyone. Tap the ones that fit you and they’re added to your questions on the report. You can
        edit or remove them on the For my doctor page.
      </Txt>

      <Card style={{ marginTop: space.lg, paddingVertical: space.xxs, paddingHorizontal: 0 }}>
        {COMMON_QUESTIONS.map((q, i) => {
          const on = questions.includes(q);
          return (
            <Pressable
              key={q}
              onPress={() => toggle(q)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={q}
              accessibilityHint={on ? 'Removes it from your report' : 'Adds it to your report'}
              style={({ pressed }) => ({
                flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 56,
                paddingVertical: space.sm, paddingHorizontal: space.md,
                backgroundColor: pressed ? colors.sunken : 'transparent',
                borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.hairline,
              })}
            >
              <View
                aria-hidden
                style={{
                  width: 26, height: 26, borderRadius: radii.pill, borderWidth: on ? 0 : 1.5,
                  borderColor: colors.borderStrong, backgroundColor: on ? colors.accent : 'transparent',
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                {on ? <Icon name="check" size={16} color={colors.onAccent} /> : null}
              </View>
              <Txt variant="body" style={{ flex: 1 }}>{q}</Txt>
            </Pressable>
          );
        })}
      </Card>

      <View style={{ marginTop: space.sm, minHeight: 24 }}>
        {error ? <InlineError message={error} /> : (
          <Txt variant="caption">{questions.length} of {MAX_QUESTIONS} questions on your report.</Txt>
        )}
      </View>

      <SafetyLine style={{ marginTop: space.xl, marginBottom: space.xl }} />
    </ScreenLarge>
  );
}
