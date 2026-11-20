// For my doctor — the report as a live, editable dashboard. Everything on this tab only repeats
// what Sam entered. One model (lib/records/summary.ts) feeds this dashboard, the page preview,
// Show on screen, the plain-text share and the PDF, so they can never say different things.
//
// Order (11 Nov 2026 review): the report itself comes first ("Read my report"), so the tab opens on the thing
// she came for and not on a form. Simplified 20 Nov 2026 (owner): the choices fold into one "Report for … Change"
// line, then her questions, then "Before and after your appointment" (fixed reading pages, lib/learn/pages.ts).
// Then (research, 10 Nov 2026 — design/HANDOVER.md §7): who it's for + time span → At a glance
// (counts first: clinicians read numbers before prose) → her agenda (printed first on the page) →
// each section as a card she can switch off in place → what the report covers (gaps made visible).
import { usePageTitle } from '../../../lib/usePageTitle';
import React, { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, heights, radii, space } from '../../../constants/zeebaUI';
import {
  Button, Card, ChipGroup, EmptyState, HeaderAvatar, InlineError, PressableCard, SafetyLine, ScreenLarge, SegmentedControl, SkeletonCards, Txt, showToast,
} from '../../../components/zeeba/kit';
import { SectionHeader } from '../../../components/zeeba/dash/Dash';
import { Icon, type IconName } from '../../../components/ui/Icon';
import { openCapture } from '../../../lib/captureStore';
import { AgendaEditor } from '../../../components/zeeba/doctor/AgendaEditor';
import { DocumentPreview } from '../../../components/zeeba/doctor/DocumentPreview';
import { CoverageCard, SectionCards, animateLayout } from '../../../components/zeeba/doctor/ReportDashboard';
import { printSummary, shareSummaryPdf } from '../../../components/zeeba/doctor/share';
import { useDoctorBuilder, useDoctorDoc } from '../../../components/zeeba/doctor/useDoctorDoc';
import { haptics } from '../../../lib/haptics';
import { reportShared } from '../../../lib/milestones';
import { Rise } from '../../../components/zeeba/motion';
import { formatDay, joinFacts, notesLabel } from '../../../lib/records/format';
import { todayKey } from '../../../lib/records/dates';
import { LEARN_PAGES } from '../../../lib/learn/pages';
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
 * Print and Show in the share bar: an icon WITH its word under it (an icon alone is a guess), 56 tall to match
 * the main button beside it. `label` is the full spoken name; `word` is the short one shown.
 * Disabled: ink-3 on a sunken fill, so it can't be mistaken for an active button.
 */
function BarIconButton({
  icon, label, word, onPress, disabled, busy,
}: { icon: IconName; label: string; word: string; onPress: () => void; disabled?: boolean; busy?: boolean }) {
  const inactive = disabled || busy;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!inactive, busy: !!busy }}
      style={({ pressed }) => ({
        minWidth: 64, height: 56, paddingHorizontal: space.xs, borderRadius: 18, borderWidth: 1, gap: 1,
        borderColor: inactive ? colors.hairline : colors.borderStrong, alignItems: 'center', justifyContent: 'center',
        backgroundColor: inactive || pressed ? colors.sunken : colors.surface,
      })}
    >
      <Icon name={icon} size={22} color={inactive ? colors.ink3 : colors.ink} />
      <Txt maxFontSizeMultiplier={1.3} style={{ fontSize: 12, lineHeight: 15, fontWeight: '600', color: inactive ? colors.ink3 : colors.ink }}>{word}</Txt>
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
  const [showOptions, setShowOptions] = useState(false);
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
      // The first report to leave the app is a milestone of the record. It is celebrated later, away from this
      // tab: nothing here ever shows the mascot.
      void reportShared();
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
          style={{ flex: 1, minWidth: winWidth < 280 ? 64 : 120, minHeight: 56 }}
          accessibilityHint={doc.empty ? 'Nothing to share yet' : Platform.OS === 'web' ? 'Opens the print window; choose Save as PDF' : 'Makes a PDF and opens the share sheet'}
        />
        <BarIconButton icon="printer" label="Print" word="Print" onPress={print} disabled={off} busy={busy === 'print'} />
        <BarIconButton
          icon="monitor" label="Show on screen" word="Show" disabled={doc.empty}
          onPress={() => router.push('/(tabs)/doctor/show' as any)}
        />
      </View>
    </View>
  );

  const settings = (
    <Card style={{ gap: space.sm }}>
      <Txt variant="groupLabel">Who is it for?</Txt>
      <SegmentedControl<Audience>
        accessibilityLabel="Who the report is for"
        options={(['gp', 'gynae'] as const).map((a) => ({ value: a, label: AUDIENCE_LABEL[a] }))}
        value={audience}
        onChange={(a) => { animateLayout(); setAudience(a); }}
      />
      <Txt variant="caption">{AUDIENCE_HINT[audience]}</Txt>
      {nothingYet && !olderData ? null : (
        <>
          <Txt variant="groupLabel" style={{ marginTop: space.xs }}>How far back?</Txt>
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
          <Txt variant="groupLabel" style={{ marginTop: space.xs }}>This visit is…</Txt>
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

  // Simpler page (owner, 20 Nov 2026): the report's options fold into one line with "Change"; what the report
  // contains is already in the paper preview above, so the glance tiles no longer repeat here.
  const optionsLine = (
    <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.sm }}>
      <View style={{ flex: 1 }}>
        <Txt variant="caption">Report for</Txt>
        <Txt variant="body">{joinFacts(AUDIENCE_LABEL[audience], rangeNote || doc.rangeLabel, notesLabel(doc.entries))}</Txt>
      </View>
      <Button
        label={showOptions ? 'Done' : 'Change'}
        variant="text"
        small
        onPress={() => { animateLayout(); setShowOptions((v) => !v); }}
        accessibilityLabel={showOptions ? 'Close report options' : 'Change who it is for, how far back and what is in it'}
      />
    </Card>
  );

  const options = (
    <>
      {settings}
      <Rise index={3} style={{ marginTop: space.xl }}>
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
      </Rise>
      <Rise index={4} style={{ marginTop: space.lg }}>
        <CoverageCard doc={doc} onAddNote={() => openCapture()} />
      </Rise>
    </>
  );

  const dashboard = nothingYet ? (
    <Card style={{ marginTop: space.lg }}>
      <EmptyState
        message={olderData
          ? 'Nothing recorded in this time. Choose a longer time above, or add a note.'
          : 'Your report fills in as you add notes.'}
        action={{ label: 'Add a note', onPress: () => openCapture() }}
        style={{ paddingVertical: space.xl }} />
    </Card>
  ) : (
    <Rise index={3} style={{ marginTop: space.xxl }}>
      <AgendaEditor value={agenda} onChange={setAgenda} onCommit={saveAgenda} title={agendaTitle} error={noteError} />
      <Button
        label="Choose from common questions"
        variant="text"
        icon="list"
        align="start"
        onPress={() => router.push('/(tabs)/doctor/questions' as any)}
        style={{ marginTop: space.xxs }}
      />
    </Rise>
  );

  // "Before and after your appointment": the same rows, in the same order, for everyone (lib/learn/pages.ts).
  const learn = (
    <Rise index={5} style={{ marginTop: space.xxl }}>
      <SectionHeader title="Before and after your appointment" />
      <View style={{ gap: space.xs }}>
        <PressableCard onPress={() => router.push('/(tabs)/doctor/questions' as any)} accessibilityLabel="Questions to ask your GP">
          <Txt variant="headline">Questions to ask your GP</Txt>
          <Txt variant="secondary">Pick the ones that fit and add them to your report</Txt>
        </PressableCard>
        {LEARN_PAGES.map((p) => (
          <PressableCard key={p.id} onPress={() => router.push(`/(tabs)/doctor/learn/${p.id}` as any)} accessibilityLabel={p.title}>
            <Txt variant="headline">{p.title}</Txt>
            <Txt variant="secondary">{p.blurb}</Txt>
          </PressableCard>
        ))}
      </View>
    </Rise>
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
      {/* Motion only on this tab, and never the mascot: sections arrive one after another, the paper slides up. */}
      {appointment ? <Rise index={0}>{appointment}</Rise> : null}
      {/* Nothing recorded at all: the empty state alone, no settings to choose between. */}
      {doc.empty ? null : (
        <Rise index={1} distance={36} style={{ marginTop: upcoming ? space.sm : space.xl }}>
          <DocumentPreview doc={doc} compact onPrint={print} />
        </Rise>
      )}
      {nothingYet && !olderData ? null : (
        <Rise index={2} style={{ marginTop: doc.empty && !upcoming ? space.xl : space.sm }}>
          {/* With nothing in this time span, the options stay open so she can choose a longer one. */}
          {nothingYet ? settings : showOptions ? <>{optionsLine}<View style={{ marginTop: space.sm }}>{options}</View></> : optionsLine}
        </Rise>
      )}
      {dashboard}
      {learn}
      <SafetyLine style={{ marginTop: space.xxl }} />
    </ScreenLarge>
  );
}
