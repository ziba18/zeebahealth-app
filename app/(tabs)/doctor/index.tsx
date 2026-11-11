// For my doctor — the report as a live, editable dashboard. Everything on this tab only repeats
// what Sam entered. One model (lib/records/summary.ts) feeds this dashboard, the page preview,
// Show on screen, the plain-text share and the PDF, so they can never say different things.
//
// Order (research, 10 Nov 2026 — design/HANDOVER.md §7): who it's for + time span → At a glance
// (counts first: clinicians read numbers before prose) → her agenda (printed first on the page) →
// each section as a card she can switch off in place → what the report covers (gaps made visible).
import { usePageTitle } from '../../../lib/usePageTitle';
import React, { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, heights, radii, space } from '../../../constants/zeebaUI';
import {
  Button, Card, ChipGroup, EmptyState, HeaderAvatar, InlineError, SafetyLine, ScreenLarge, SegmentedControl, SkeletonCards, Txt, showToast,
} from '../../../components/zeeba/kit';
import { SectionHeader } from '../../../components/zeeba/dash/Dash';
import { Icon, type IconName } from '../../../components/ui/Icon';
import { openCapture } from '../../../lib/captureStore';
import { AgendaEditor } from '../../../components/zeeba/doctor/AgendaEditor';
import { DocumentPreview } from '../../../components/zeeba/doctor/DocumentPreview';
import { CoverageCard, GlanceTiles, SectionCards, animateLayout } from '../../../components/zeeba/doctor/ReportDashboard';
import { printSummary, shareSummaryPdf } from '../../../components/zeeba/doctor/share';
import { useDoctorBuilder, useDoctorDoc } from '../../../components/zeeba/doctor/useDoctorDoc';
import { haptics } from '../../../lib/haptics';
import { formatDay, joinFacts, notesLabel } from '../../../lib/records/format';
import { todayKey } from '../../../lib/records/dates';
import {
  AUDIENCE_LABEL, RANGE_LABEL, VISIT_TYPES, agendaTitleFor, summaryToHtml, type Audience, type RangeChoice, type VisitType,
} from '../../../lib/records/summary';
import { useAuthStore } from '../../../stores/authStore';
import { useRecordsStore } from '../../../stores/recordsStore';

const isCancel = (e: unknown) => /cancel|did not complete|dismiss/i.test(String((e as Error)?.message ?? e));

const AUDIENCE_HINT: Record<Audience, string> = {
  gp: 'Your notes, questions and how often first.',
  gynae: 'Periods and bleeding first, then pain, sex, bowel and bladder.',
};

/**
 * 48 outlined circle with an icon — Print and Show on screen in the share bar (labelled for screen
 * readers). Disabled: an ink-3 glyph on a sunken disc, so it can't be mistaken for an active button.
 */
function BarIconButton({
  icon, label, onPress, disabled, busy,
}: { icon: IconName; label: string; onPress: () => void; disabled?: boolean; busy?: boolean }) {
  const inactive = disabled || busy;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!inactive, busy: !!busy }}
      hitSlop={4}
      style={({ pressed }) => ({
        width: heights.secondary, height: heights.secondary, borderRadius: radii.pill, borderWidth: 1,
        borderColor: inactive ? colors.hairline : colors.borderStrong, alignItems: 'center', justifyContent: 'center',
        backgroundColor: inactive || pressed ? colors.sunken : 'transparent',
      })}
    >
      <Icon name={icon} size={24} color={inactive ? colors.ink3 : colors.ink} />
    </Pressable>
  );
}

export default function DoctorScreen() {
  const { width: winWidth } = useWindowDimensions();
  usePageTitle('For my doctor');
  const router = useRouter();
  const userId = useAuthStore((s) => s.user?.id);
  const loading = useRecordsStore((s) => s.loading);
  const loadedFor = useRecordsStore((s) => s.loadedFor);
  const loadError = useRecordsStore((s) => s.error);
  const load = useRecordsStore((s) => s.load);
  const savedNote = useRecordsStore((s) => s.records.doctor_note[0]?.data.text ?? '');
  const saveDoctorNote = useRecordsStore((s) => s.saveDoctorNote);
  const symptomRecs = useRecordsStore((s) => s.records.symptom);
  const periodRecs = useRecordsStore((s) => s.records.period_day);

  const {
    visitType, agenda, include, audience, setVisitType, setRange, setAgenda, loadAgenda, setInclude, setAudience, hideQuote, showAllQuotes,
  } = useDoctorBuilder();
  const { doc, range, hasLast, rangeNote, upcoming } = useDoctorDoc();

  const [busy, setBusy] = useState<'share' | 'print' | null>(null);
  const [actionError, setActionError] = useState('');
  const [noteError, setNoteError] = useState('');
  const lastSaved = useRef(savedNote);

  // Show the saved agenda once loaded, unless Sam already typed this session.
  useEffect(() => {
    lastSaved.current = savedNote;
    loadAgenda(savedNote);
  }, [savedNote, loadAgenda]);

  const saveAgenda = async () => {
    const text = useDoctorBuilder.getState().agenda.trim();
    if (text === lastSaved.current.trim()) return;
    setNoteError('');
    try {
      await saveDoctorNote(text);
      lastSaved.current = text;
    } catch {
      setNoteError('Your questions couldn’t be saved just now. They’re still in this report.');
    }
  };

  const share = async () => {
    setBusy('share');
    setActionError('');
    try {
      await shareSummaryPdf(summaryToHtml(doc), 'Share your report', () => {
        haptics.success();
        // On web the browser's print window is the confirmation; a toast would outlive a cancelled dialog.
        if (Platform.OS !== 'web') showToast('Report ready to share.');
      });
    } catch (e) {
      if (!isCancel(e)) setActionError('The report couldn’t be made into a PDF. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  const print = async () => {
    setBusy('print');
    setActionError('');
    try {
      await printSummary(summaryToHtml(doc));
    } catch (e) {
      if (!isCancel(e)) setActionError('The report couldn’t be sent to a printer. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  if (loadedFor === null && (loading || loadError)) {
    return (
      <ScreenLarge title="For my doctor" right={<HeaderAvatar />}>
        {loadError ? (
          <InlineError message={loadError} onRetry={userId ? () => load(userId) : undefined} />
        ) : (
          <SkeletonCards count={3} label="Loading your information" />
        )}
      </ScreenLarge>
    );
  }

  const today = todayKey();
  const rangeOptions: { value: RangeChoice; label: string }[] = [
    ...(hasLast ? [{ value: 'since' as const, label: 'Since last visit' }] : []),
    { value: '3m', label: hasLast ? '3 months' : RANGE_LABEL['3m'] },
    { value: '6m', label: hasLast ? '6 months' : RANGE_LABEL['6m'] },
  ];
  const agendaTitle = agendaTitleFor(upcoming?.data.date === today);
  const nothingYet = doc.empty && doc.available.length === 0;
  const olderData = symptomRecs.some((r) => r.data.date < doc.from) || periodRecs.some((r) => r.data.date < doc.from);
  const off = doc.empty || busy !== null;

  // One slim row: Share PDF (primary) + Print and Show on screen as labelled 48 icon buttons.
  const footer = (
    <View style={{ gap: space.xs }}>
      <InlineError message={actionError} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.xs }}>
        <Button
          label={winWidth < 280 ? 'Save' : Platform.OS === 'web' ? 'Save PDF' : 'Share PDF'}
          accessibilityLabel={Platform.OS === 'web' ? 'Save PDF' : 'Share PDF'}
          icon="share-2"
          onPress={share}
          loading={busy === 'share'}
          disabled={off}
          style={{ flex: 1, minWidth: winWidth < 280 ? 64 : 120 }}
          accessibilityHint={doc.empty ? 'Nothing to share yet' : Platform.OS === 'web' ? 'Opens the print window; choose Save as PDF' : 'Makes a PDF and opens the share sheet'}
        />
        <BarIconButton icon="printer" label="Print" onPress={print} disabled={off} busy={busy === 'print'} />
        <BarIconButton
          icon="monitor" label="Show on screen" disabled={doc.empty}
          onPress={() => router.push('/(tabs)/doctor/show' as any)}
        />
      </View>
    </View>
  );

  const settings = (
    <Card style={{ gap: space.sm }}>
      <Txt variant="groupLabel">Report for</Txt>
      <SegmentedControl<Audience>
        accessibilityLabel="Who the report is for"
        options={(['gp', 'gynae'] as const).map((a) => ({ value: a, label: AUDIENCE_LABEL[a] }))}
        value={audience}
        onChange={(a) => { animateLayout(); setAudience(a); }}
      />
      <Txt variant="caption">{AUDIENCE_HINT[audience]}</Txt>
      {nothingYet && !olderData ? null : (
        <>
          <Txt variant="groupLabel" style={{ marginTop: space.xs }}>Time span</Txt>
          <SegmentedControl<RangeChoice>
            accessibilityLabel="How far back"
            options={rangeOptions}
            value={range}
            onChange={(v: RangeChoice) => { animateLayout(); setRange(v); }}
          />
          <Txt variant="caption">{joinFacts(rangeNote || doc.rangeLabel, notesLabel(doc.entries))}</Txt>
        </>
      )}
      {nothingYet ? null : (
        <>
          <Txt variant="groupLabel" style={{ marginTop: space.xs }}>This visit is</Txt>
          <ChipGroup
            mode="single"
            options={[...VISIT_TYPES]}
            value={visitType}
            onChange={(v) => setVisitType(v as VisitType | null)}
            allowDeselect
            accessibilityLabel="What this visit is"
          />
        </>
      )}
    </Card>
  );

  const dashboard = nothingYet ? (
    <Card style={{ marginTop: space.lg }}>
      <EmptyState
        message={olderData
          ? 'Nothing logged in this time span. Choose a longer one above, or add a note.'
          : 'Your report fills in as you add notes.'}
        action={{ label: 'Add a note', onPress: () => openCapture() }}
        style={{ paddingVertical: space.xl }} />
    </Card>
  ) : (
    <>
      {doc.glance.length ? (
        <View style={{ marginTop: space.xxl }}>
          <SectionHeader title="At a glance" />
          <GlanceTiles doc={doc} />
        </View>
      ) : null}

      <View style={{ marginTop: space.xxl }}>
        <AgendaEditor value={agenda} onChange={setAgenda} onCommit={saveAgenda} title={agendaTitle} error={noteError} />
      </View>

      <View style={{ marginTop: space.xxl }}>
        <SectionHeader title="In the report" />
        <Txt variant="caption" style={{ marginBottom: space.sm, paddingHorizontal: space.xxs }}>
          Switch a section off to leave it out. Your notes stay saved.
        </Txt>
        {doc.empty ? (
          <Card tone="sunken" style={{ marginBottom: space.sm }}>
            <Txt variant="secondary">Every section is off. Turn one on to make the report.</Txt>
          </Card>
        ) : null}
        <SectionCards doc={doc} include={include} onToggle={setInclude} onHideQuote={hideQuote} onShowAllQuotes={showAllQuotes} />
      </View>

      <View style={{ marginTop: space.lg }}>
        <CoverageCard doc={doc} onAddNote={() => openCapture()} />
      </View>
    </>
  );

  const appointment = upcoming ? (
    <Card style={{ marginTop: space.xl, flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
      {winWidth < 240 ? null : (
        <View aria-hidden style={{
          width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accentTint,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name="calendar" size={22} color={colors.accent} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Txt variant="caption">{upcoming.data.date === today ? 'Appointment today' : 'Next appointment'}</Txt>
        <Txt variant="headline">
          {joinFacts(upcoming.data.who.trim(), formatDay(upcoming.data.date).replace(/ /g, ' '))}
        </Txt>
      </View>
    </Card>
  ) : null;

  return (
    <ScreenLarge title="For my doctor" right={<HeaderAvatar />} footer={footer}>
      {appointment}
      {/* Nothing recorded at all: the empty state alone, no settings to choose between. */}
      {nothingYet && !olderData ? null : <View style={{ marginTop: upcoming ? space.sm : space.xl }}>{settings}</View>}
      {doc.empty ? null : (
        <View style={{ marginTop: space.sm }}>
          <DocumentPreview doc={doc} compact onPrint={print} />
        </View>
      )}
      {dashboard}
      <SafetyLine style={{ marginTop: space.xxl }} />
    </ScreenLarge>
  );
}
