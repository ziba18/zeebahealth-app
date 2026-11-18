// REACH on Today: the way into her report, with the next appointment if she has one. The report itself (and
// everything on the Doctor tab) stays serious: a small sheet of paper here, never the mascot.
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, radii, space } from '../../../constants/zeebaUI';
import { addDays, todayKey } from '../../../lib/records/dates';
import { formatDay, noteCount, notesLabel } from '../../../lib/records/format';
import { useRecordsStore } from '../../../stores/recordsStore';
import { Icon } from '../../ui/Icon';
import { ClayIcon } from '../art/ClayIcon';
import { Button } from '../kit-parts/controls';
import { Txt } from '../kit-parts/Txt';
import { AddAppointmentSheet, nextAppointment } from './AppointmentCard';

export function ReportCard() {
  const router = useRouter();
  const appts = useRecordsStore((s) => s.records.appointment);
  const count = useRecordsStore((s) => noteCount(s.records.symptom));
  const [adding, setAdding] = useState(false);
  const next = nextAppointment(appts);
  const today = todayKey();
  const when = !next ? ''
    : next.data.date === today ? 'Today'
    : next.data.date === addDays(today, 1) ? 'Tomorrow'
    : formatDay(next.data.date);

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <ClayIcon name="reach" size={30} />
        <Txt variant="eyebrow" color={colors.accent}>Reach</Txt>
      </View>
      <Txt variant="headline" accessibilityRole="header" style={{ marginTop: space.sm }}>Your report for the doctor</Txt>
      <Txt variant="secondary" style={{ marginTop: 2 }}>
        {count > 0
          ? `${notesLabel(count)} ready to share, print or show on your phone.`
          : 'Everything you record goes into one page you can share, print or show.'}
      </Txt>

      {next ? (
        <View style={styles.appt} accessible accessibilityLabel={`${next.data.date === today ? 'Appointment today' : 'Next appointment'}: ${next.data.who.trim() || 'Appointment'}, ${when}`}>
          <View style={styles.apptIcon} aria-hidden><Icon name="calendar" size={20} color={colors.accent} /></View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Txt variant="caption">{next.data.date === today ? 'Appointment today' : 'Next appointment'}</Txt>
            <Txt variant="body" style={{ fontWeight: '600' }} numberOfLines={2}>{`${next.data.who.trim() || 'Appointment'} · ${when}`}</Txt>
          </View>
        </View>
      ) : null}

      <Button
        label="Open my report"
        icon="file-text"
        variant="secondary"
        onPress={() => router.push('/(tabs)/doctor' as any)}
        style={{ marginTop: space.md, minHeight: 52 }}
      />
      {next ? null : (
        <Button label="Add an appointment" icon="calendar" variant="text" onPress={() => setAdding(true)} style={{ marginTop: space.xxs, minHeight: 48 }} />
      )}
      <AddAppointmentSheet visible={adding} onClose={() => setAdding(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface, borderRadius: radii.card, borderWidth: 1, borderColor: colors.cardBorder, padding: space.md,
    boxShadow: '0 1px 2px rgba(16,18,40,0.04), 0 6px 18px rgba(16,18,40,0.06)',
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  appt: {
    flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.md, padding: space.sm,
    borderRadius: radii.row + 4, backgroundColor: colors.sunken,
  },
  apptIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accentTint, alignItems: 'center', justifyContent: 'center' },
});
