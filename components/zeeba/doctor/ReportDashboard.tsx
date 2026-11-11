// The report as a live dashboard: the SAME DoctorDoc the PDF prints, drawn in the app's own cards
// (Native by day, Midnight by night) so it can be read at full size and changed in place. Each
// section card carries its own "in the report" switch; quotes can be swapped out; nothing she
// recorded can be re-worded here: the facts are counts of her notes, the words are hers.
import React, { useState } from 'react';
import { LayoutAnimation, Platform, Pressable, View } from 'react-native';
import { colors, font, radii, space, useColors } from '../../../constants/zeebaUI';
import { MONTH_NAMES, addDays, parseKey } from '../../../lib/records/dates';
import Svg, { Circle, Rect, Text as SvgText } from 'react-native-svg';
import { joinFacts } from '../../../lib/records/format';
import {
  APPT_AHEAD, APPT_PAST, FAMILY_HISTORY_LABEL, STRIP_BLEED_KEY, STRIP_SPOT_KEY, curly, quoteKey, sectionIncluded,
  type CountItem, type DatedItem, type DocQuote, type DocSection, type DoctorDoc, type FreqBar, type HeatStripModel, type SectionId,
} from '../../../lib/records/summary';
import { haptics } from '../../../lib/haptics';
import { Icon, type IconName } from '../../ui/Icon';
import { Tile, TileRow } from '../dash/Dash';
import { Button, Card, Quote, Toggle, Txt } from '../kit';
import type { StripPalette } from './HeatStrip';

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

const SECTION_ICON: Record<SectionId, IconName> = {
  words: 'message-circle', frequency: 'activity', periods: 'droplet', bowelBladder: 'list', impacts: 'calendar-days',
  tried: 'pill', appointments: 'stethoscope', history: 'clipboard-list', sex: 'heart', mood: 'brain', eating: 'leaf',
};

export const animateLayout = () => {
  if (Platform.OS !== 'web') LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
};

/** The strip in app colours: the pain ramp and the period colour of the current appearance. */
function useStripPalette(): StripPalette {
  const c = useColors();
  return {
    ink: c.ink, ink2: c.ink2, borderStrong: c.borderStrong, hairline: c.hairline, white: c.surface, clay: c.clay,
    sev: (n: number) => {
      const v = Math.max(0, Math.min(10, Math.round(n)));
      const step = v <= 2 ? 0 : v <= 4 ? 1 : v <= 6 ? 2 : v <= 8 ? 3 : 4;
      return { bg: c.ramp[step], fg: c.rampFg[step] };
    },
  };
}

// ---- small pieces ---------------------------------------------------------------------------

/** A labelled count with a thin meter: "Lower back · 5 of 91 days". */
function Meter({ label, days, total, sub }: { label: string; days: number; total: number; sub?: string }) {
  const pct = total ? Math.max(2, Math.min(100, (days / total) * 100)) : 0;
  return (
    <View accessible accessibilityLabel={joinFacts(`${label}: ${days} of ${plural(total, 'day')}`, sub ?? '')} style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space.xs }}>
        <Txt variant="body" style={{ flex: 1 }}>{label}</Txt>
        <Txt style={{ ...font.rounded, fontSize: 17, lineHeight: 22, color: colors.ink, fontVariant: ['tabular-nums'] }}>
          {String(days)}<Txt variant="caption">{` / ${total} days`}</Txt>
        </Txt>
      </View>
      <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.chartTrack, overflow: 'hidden' }}>
        <View style={{ height: '100%', width: `${pct}%`, borderRadius: 3, backgroundColor: colors.accent }} />
      </View>
      {sub ? <Txt variant="caption">{sub}</Txt> : null}
    </View>
  );
}

function FactPill({ text }: { text: string }) {
  return (
    <View style={{ backgroundColor: colors.sunken, borderRadius: radii.pill, paddingHorizontal: space.sm, paddingVertical: 6 }}>
      <Txt variant="secondary" style={{ color: colors.ink }}>{text}</Txt>
    </View>
  );
}

function QuoteRow({ q, onHide }: { q: DocQuote; onHide?: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.xs }}>
      <View style={{ width: 3, alignSelf: 'stretch', borderRadius: 2, backgroundColor: colors.accent, opacity: 0.5 }} aria-hidden />
      <View style={{ flex: 1, gap: 2, paddingVertical: 2 }}>
        <Quote>{q.text}</Quote>
        <Txt variant="caption">{joinFacts(q.dateLabel, q.facts)}</Txt>
      </View>
      {onHide ? (
        <Pressable
          onPress={onHide}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={`Leave out the note from ${q.dateLabel}`}
          accessibilityHint="The next note in your words takes its place"
          style={({ pressed }) => ({ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? colors.sunken : 'transparent' })}
        >
          <Icon name="eye-off" size={18} color={colors.ink2} />
        </Pressable>
      ) : null}
    </View>
  );
}

function DatedRow({ item, first }: { item: DatedItem; first: boolean }) {
  return (
    <View style={{ gap: 4, paddingTop: first ? 0 : space.sm, borderTopWidth: first ? 0 : 1, borderTopColor: colors.hairline }}>
      <Txt variant="eyebrow">{item.date}</Txt>
      {item.title ? <Txt variant="headline">{item.title}</Txt> : null}
      {item.lines.map((l) => (
        <Txt key={l.label} variant="secondary" style={{ color: colors.ink }}>
          <Txt variant="secondary">{`${l.label}: `}</Txt>{l.text}
        </Txt>
      ))}
    </View>
  );
}

/**
 * The day-by-day strip as a calendar heatmap: one column per week (Monday at the top), so 13 weeks fit
 * in one glance. Same rules as the printed strip: the highest number she gave inside the cell, a dot for
 * a note with no number, a solid period-colour bar under bleeding days and a dashed one under spotting.
 */
function CalendarHeat({ strip, width, palette: C }: { strip: HeatStripModel; width: number; palette: StripPalette }) {
  const c = useColors();
  const byDate = new Map(strip.days.map((d) => [d.date, d]));
  const { y, m0, d } = parseKey(strip.from);
  const dow = (new Date(y, m0, d).getDay() + 6) % 7; // Monday = 0
  const start = addDays(strip.from, -dow);
  const weeks = Math.ceil((dow + strip.days.length) / 7);
  const labelW = 18;
  const head = 18;
  const pitch = Math.min(34, (width - labelW - 2) / weeks);
  const cell = Math.max(12, pitch - 5);
  const rowPitch = cell + 5;
  const height = head + 4 + 7 * rowPitch;
  const digit = Math.max(9, Math.min(13, cell * 0.46));
  const count = (k: 'logged' | 'bleeding' | 'spotting') => strip.days.filter((x) => x[k]).length;
  const label = `Calendar of ${strip.label}. ${count('logged')} days with a note, ${count('bleeding')} days with bleeding logged` +
    (count('spotting') ? `, ${count('spotting')} days with spotting logged.` : '.');

  const out: React.ReactNode[] = [];
  let lastMonth = -1;
  for (let w = 0; w < weeks; w++) {
    const x = labelW + 2 + w * pitch;
    for (let r = 0; r < 7; r++) {
      const key = addDays(start, w * 7 + r);
      const day = byDate.get(key);
      if (day && parseKey(key).m0 !== lastMonth && (r === 0 || key === strip.from)) {
        lastMonth = parseKey(key).m0;
        out.push(<SvgText key={`m${key}`} x={x} y={11} fontSize={11} fontFamily={font.regular.fontFamily} fill={c.ink2}>{MONTH_NAMES[lastMonth].slice(0, 3)}</SvgText>);
      }
      if (!day) continue;
      const ty = head + 2 + r * rowPitch;
      if (day.logged && day.value != null) {
        const sv = C.sev(day.value);
        out.push(<Rect key={key} x={x} y={ty} width={cell} height={cell} rx={4} fill={sv.bg} />);
        out.push(
          <SvgText key={`t${key}`} x={x + cell / 2} y={ty + cell / 2 + digit * 0.36} fontSize={digit} fontWeight="600" fontFamily={font.semibold.fontFamily} fill={sv.fg} textAnchor="middle">
            {String(day.value)}
          </SvgText>,
        );
      } else if (day.logged) {
        out.push(<Rect key={key} x={x + 0.5} y={ty + 0.5} width={cell - 1} height={cell - 1} rx={4} fill={c.surface} stroke={c.borderStrong} strokeWidth={1} />);
        out.push(<Circle key={`d${key}`} cx={x + cell / 2} cy={ty + cell / 2} r={2} fill={c.ink} />);
      } else {
        out.push(<Rect key={key} x={x} y={ty} width={cell} height={cell} rx={4} fill={c.chartTrack} />);
      }
      // Bleeding: a solid ring in the period colour; spotting: a dashed one (shape, not tint, tells them apart).
      if (day.bleeding || day.spotting) {
        out.push(
          <Rect
            key={`b${key}`} x={x - 1.5} y={ty - 1.5} width={cell + 3} height={cell + 3} rx={5.5} fill="none"
            stroke={C.clay} strokeWidth={day.bleeding ? 2 : 1.5} strokeDasharray={day.bleeding ? undefined : [3, 2.5]}
          />,
        );
      }
    }
  }
  ['M', 'W', 'F'].forEach((l, i) => {
    out.push(<SvgText key={`r${l}`} x={0} y={head + i * 2 * rowPitch + cell / 2 + 4} fontSize={10} fontFamily={font.regular.fontFamily} fill={c.ink2}>{l}</SvgText>);
  });
  return (
    <View accessible accessibilityLabel={label}>
      <Svg width={width} height={height}>{out}</Svg>
    </View>
  );
}

// ---- section bodies -------------------------------------------------------------------------

function FrequencyBody({ s }: { s: Extract<DocSection, { id: 'frequency' }> }) {
  const [width, setWidth] = useState(0);
  const palette = useStripPalette();
  const c = useColors();
  const [all, ...areas] = s.bars;
  const bleed = s.strip.days.some((d) => d.bleeding);
  const spot = s.strip.days.some((d) => d.spotting);
  return (
    <View style={{ gap: space.md }}>
      <Txt variant="caption">{s.windowLabel}</Txt>
      {[all, ...areas].filter(Boolean).map((b: FreqBar) => (
        <Meter key={b.label} label={b.label} days={b.days} total={b.total} sub={b.strength} />
      ))}
      <View style={{ gap: space.xs }}>
        <Txt variant="groupLabel">Day by day</Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: space.sm, rowGap: 4 }} aria-hidden>
          {[1, 4, 6, 8, 10].map((n) => {
            const sv = palette.sev(n);
            return (
              <View key={n} style={{ width: 22, height: 22, borderRadius: 5, backgroundColor: sv.bg, alignItems: 'center', justifyContent: 'center' }}>
                <Txt style={{ ...font.semibold, fontSize: 11, lineHeight: 13, color: sv.fg }}>{String(n)}</Txt>
              </View>
            );
          })}
          <Txt variant="caption">highest number that day</Txt>
          {bleed ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ width: 16, height: 16, borderRadius: 5, borderWidth: 2, borderColor: c.clay }} />
              <Txt variant="caption">{STRIP_BLEED_KEY}</Txt>
            </View>
          ) : null}
          {spot ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ width: 16, height: 16, borderRadius: 5, borderWidth: 1.5, borderStyle: 'dashed', borderColor: c.clay }} />
              <Txt variant="caption">{STRIP_SPOT_KEY}</Txt>
            </View>
          ) : null}
        </View>
        <View onLayout={(e) => setWidth(Math.floor(e.nativeEvent.layout.width))} style={{ marginTop: space.xxs }}>
          {width > 0 ? <CalendarHeat strip={s.strip} width={width} palette={palette} /> : null}
        </View>
        <Txt variant="caption">{joinFacts(s.caption, s.strip.windowNote)}</Txt>
      </View>
    </View>
  );
}

function SectionBody({ s, total, onHideQuote }: { s: DocSection; total: number; onHideQuote: (key: string) => void }) {
  switch (s.id) {
    case 'frequency':
      return <FrequencyBody s={s} />;
    case 'words':
      return (
        <View style={{ gap: space.md }}>
          {s.quotes.map((q) => (
            <QuoteRow key={q.date + q.text} q={q} onHide={s.quotes.length > 1 || s.more ? () => { haptics.light(); animateLayout(); onHideQuote(quoteKey(q)); } : undefined} />
          ))}
          {s.more ? <Txt variant="caption">{s.more}</Txt> : null}
        </View>
      );
    case 'periods':
      return (
        <View style={{ gap: space.sm }}>
          {s.runs.map((r, i) => (
            <View key={r.range} style={{ gap: 4, paddingTop: i ? space.sm : 0, borderTopWidth: i ? 1 : 0, borderTopColor: colors.hairline }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space.xs }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.clay }} aria-hidden />
                <Txt variant="headline" style={{ flex: 1 }}>{r.range}</Txt>
                <Txt variant="secondary">{plural(r.days, 'day')}</Txt>
              </View>
              {r.flows ? <Txt variant="caption">{r.flows}</Txt> : null}
              {r.notes.map((q) => <QuoteRow key={q.date} q={q} />)}
            </View>
          ))}
          {s.spotting ? <Txt variant="secondary">{s.spotting}</Txt> : null}
          {s.details.length ? (
            <View style={{ gap: space.xs, marginTop: space.xxs }}>
              <Txt variant="groupLabel">From my notes</Txt>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xs }}>
                {s.details.map((d) => <FactPill key={d} text={d} />)}
              </View>
            </View>
          ) : null}
        </View>
      );
    case 'impacts': case 'sex': case 'mood': case 'eating': case 'bowelBladder':
      return (
        <View style={{ gap: space.md }}>
          {s.items.map((c: CountItem) => <Meter key={c.label} label={c.label} days={c.days} total={total} />)}
          {s.quotes.map((q) => <QuoteRow key={q.date + q.text} q={q} />)}
        </View>
      );
    case 'tried':
      return (
        <View style={{ gap: space.sm }}>
          {s.items.map((t, i) => (
            <View key={t.title + t.dates} style={{ gap: 4, paddingTop: i ? space.sm : 0, borderTopWidth: i ? 1 : 0, borderTopColor: colors.hairline }}>
              <Txt variant="headline">{t.title}</Txt>
              {t.dates ? <Txt variant="caption">{t.dates}</Txt> : null}
              {t.noticed ? <Quote>{t.noticed}</Quote> : null}
              {t.helped || t.sideEffects ? (
                <Txt variant="secondary">{joinFacts(t.helped, t.sideEffects ? `Side effects: ${t.sideEffects}` : '')}</Txt>
              ) : null}
            </View>
          ))}
          {s.quotes.map((q) => <QuoteRow key={q.date + q.text} q={q} />)}
        </View>
      );
    case 'appointments':
      return (
        <View style={{ gap: space.sm }}>
          {s.upcoming.length ? <Txt variant="groupLabel">{APPT_AHEAD}</Txt> : null}
          {s.upcoming.map((a, i) => <DatedRow key={`u${i}`} item={a} first={i === 0} />)}
          {s.upcoming.length && s.items.length ? <Txt variant="groupLabel" style={{ marginTop: space.xs }}>{APPT_PAST}</Txt> : null}
          {s.items.map((a, i) => <DatedRow key={`p${i}`} item={a} first={i === 0} />)}
          {s.more ? <Txt variant="caption">{s.more}</Txt> : null}
        </View>
      );
    case 'history':
      return (
        <View style={{ gap: space.sm }}>
          {s.items.map((a, i) => <DatedRow key={i} item={a} first={i === 0} />)}
          {s.more ? <Txt variant="caption">{s.more}</Txt> : null}
          {s.family ? (
            <View style={{ gap: 2 }}>
              <Txt variant="caption">{FAMILY_HISTORY_LABEL}</Txt>
              <Quote>{s.family}</Quote>
            </View>
          ) : null}
        </View>
      );
  }
}

// ---- the dashboard --------------------------------------------------------------------------

export function GlanceTiles({ doc }: { doc: DoctorDoc }) {
  if (!doc.glance.length) return null;
  const pairs: (typeof doc.glance)[] = [];
  for (let i = 0; i < doc.glance.length; i += 2) pairs.push(doc.glance.slice(i, i + 2));
  return (
    <View style={{ gap: space.sm }}>
      {pairs.map((p) => (
        <TileRow key={p[0].id}>
          {p.map((g) => (
            <Tile
              key={g.id}
              label={g.label}
              value={g.value}
              unit={g.unit}
              accessibilityLabel={`${g.label}: ${g.value}${g.unit}. ${g.sub}`}
            >
              <Txt variant="caption">{g.sub}</Txt>
            </Tile>
          ))}
          {p.length === 1 ? <View style={{ flex: 1 }} /> : null}
        </TileRow>
      ))}
    </View>
  );
}

export function SectionCards({
  doc, include, onToggle, onHideQuote, onShowAllQuotes,
}: {
  doc: DoctorDoc;
  include: Partial<Record<SectionId, boolean>>;
  onToggle: (id: SectionId, on: boolean) => void;
  onHideQuote: (key: string) => void;
  onShowAllQuotes: () => void;
}) {
  const total = doc.spanDays;
  return (
    <View style={{ gap: space.sm }}>
      {doc.available.map((meta) => {
        const on = sectionIncluded(meta.id, include);
        const sec = doc.sections.find((x) => x.id === meta.id);
        const toggle = (v: boolean) => { haptics.selection(); animateLayout(); onToggle(meta.id, v); };
        return (
          <Card key={meta.id} style={{ gap: space.md, opacity: on ? 1 : 0.92 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
              <View aria-hidden style={{
                width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
                backgroundColor: on ? colors.accentTint : colors.sunken,
              }}>
                <Icon name={meta.sensitive && !on ? 'lock' : SECTION_ICON[meta.id]} size={17} color={on ? colors.accent : colors.ink2} />
              </View>
              <View style={{ flex: 1 }}>
                <Txt variant="headline" accessibilityRole="header" style={{ color: on ? colors.ink : colors.ink2 }}>{meta.title}</Txt>
                {!on ? (
                  <Txt variant="caption">{meta.sensitive ? 'Private · only added if you turn it on' : 'Left out of the report'}</Txt>
                ) : null}
              </View>
              <Toggle value={on} onChange={toggle} label={`Include ${meta.title} in the report`} />
            </View>
            {on && sec ? <SectionBody s={sec} total={total} onHideQuote={onHideQuote} /> : null}
            {on && meta.id === 'words' && doc.wordsHidden ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
                <Txt variant="caption" style={{ flex: 1 }}>{`${plural(doc.wordsHidden, 'note')} left out by you`}</Txt>
                <Button label="Put back" variant="text" small onPress={() => { animateLayout(); onShowAllQuotes(); }} />
              </View>
            ) : null}
          </Card>
        );
      })}
    </View>
  );
}

/** What the report covers: "9 of 13 areas recorded" and the areas with nothing yet, so gaps are visible. */
export function CoverageCard({ doc, onAddNote }: { doc: DoctorDoc; onAddNote: () => void }) {
  const missing = doc.domains.filter((d) => d.state === 'not-recorded').map((d) => d.heading);
  const recorded = doc.domains.filter((d) => d.state === 'recorded').length;
  const pct = Math.round((recorded / Math.max(1, doc.domains.length)) * 100);
  return (
    <Card style={{ gap: space.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space.xs }}>
        <Txt variant="headline" style={{ flex: 1 }}>What this report covers</Txt>
        <Txt style={{ ...font.rounded, fontSize: 17, lineHeight: 22, color: colors.ink }}>
          {String(recorded)}<Txt variant="caption">{` of ${doc.domains.length} areas`}</Txt>
        </Txt>
      </View>
      <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.chartTrack, overflow: 'hidden' }} aria-hidden>
        <View style={{ height: '100%', width: `${pct}%`, borderRadius: 3, backgroundColor: colors.saved }} />
      </View>
      {missing.length ? (
        <>
          <Txt variant="secondary">Nothing recorded yet in this time span for:</Txt>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xs }}>
            {missing.map((m) => <FactPill key={m} text={m} />)}
          </View>
          <Txt variant="caption">The page says “Not recorded” for these, so a doctor can tell “not logged” from “left out”.</Txt>
          <Button label="Add a note" variant="text" icon="plus" align="start" onPress={onAddNote} />
        </>
      ) : (
        <Txt variant="secondary">Every area has at least one note in this time span.</Txt>
      )}
    </Card>
  );
}
