// For my doctor dashboard (10 Nov 2026): GP / gynaecology order, At a glance figures, quotes she
// leaves out, the bleeding answers on the periods section, bowel and bladder, and sex staying private.
// Run: node --experimental-strip-types --import ./scripts/ai-eval/ts-register.mjs --test scripts/ai-eval/doctor-dashboard.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDoctorSummary, coverageLine, quoteKey, sectionOrder, summaryToHtml, summaryToText,
} from '../../lib/records/summary.ts';
import { sampleBuckets } from '../../lib/preview/seed.ts';

const RANGE = { from: '2026-06-25', to: '2026-09-24', today: '2026-09-24' };
const sam = () => {
  const b = sampleBuckets();
  return { symptoms: b.symptom, periodDays: b.period_day, medicines: b.medicine, history: b.history, appointments: b.appointment };
};
const note = (date, extra = {}) => ({ id: `n${date}${Math.random()}`, createdAt: `${date}T10:00:00Z`, data: { date, source: 'full', words: `Note on ${date}`, ...extra } });
const EMPTY = { symptoms: [], periodDays: [], medicines: [], history: [], appointments: [] };
const REDLINE = /%|percent|score|average|trend|severe|moderate|mild|likely|suggest|diagnos|or more|or worse/i;

test('gynaecology puts periods first; GP keeps the standard order; same sections either way', () => {
  const gp = buildDoctorSummary(sam(), RANGE);
  const gy = buildDoctorSummary(sam(), { ...RANGE, audience: 'gynae' });
  assert.equal(gy.sections[0].id, 'periods');
  assert.equal(gp.sections[0].id, 'frequency');
  assert.deepEqual([...gp.sections.map((s) => s.id)].sort(), [...gy.sections.map((s) => s.id)].sort());
  assert.match(gy.meta, /For a gynaecology appointment/);
  assert.match(gp.meta, /For a GP appointment/);
  assert.equal(new Set(sectionOrder('gynae')).size, sectionOrder('gp').length, 'both orders list every section once');
  assert.equal(gy.glance[0].id, 'periods', 'gynaecology leads the glance with periods');
});

test('At a glance: counts and her highest number only, no thresholds or averages, on page/text/PDF', () => {
  const doc = buildDoctorSummary(sam(), RANGE);
  assert.ok(doc.glance.length >= 3);
  for (const g of doc.glance) {
    assert.doesNotMatch(`${g.label} ${g.value}${g.unit} ${g.sub}`, REDLINE, g.id);
    assert.match(g.value, /^\d+$/);
  }
  const days = doc.glance.find((g) => g.id === 'days');
  assert.equal(days.unit, ` / ${doc.spanDays}`, 'glance and section meters share one day span');
  const peak = doc.glance.find((g) => g.id === 'peak');
  const entered = new Set(sam().symptoms.flatMap((r) => [r.data.typical, r.data.worst, r.data.strength]).filter((n) => n != null).map(String));
  assert.ok(entered.has(peak.value), 'highest number is one she entered');
  assert.ok(summaryToHtml(doc).includes('class="glance"'));
  const text = summaryToText(doc);
  assert.ok(text.indexOf('AT A GLANCE') > 0 && text.indexOf('AT A GLANCE') < text.indexOf('AREAS ('));
});

test('agenda still prints before At a glance', () => {
  const doc = buildDoctorSummary(sam(), { ...RANGE, agenda: 'My main priority is pain.\nCan we talk about scans?' });
  const html = summaryToHtml(doc);
  assert.ok(html.indexOf('My main priority') < html.indexOf('class="glance"'));
});

test('a quote she leaves out is replaced by the next one and counted', () => {
  const doc = buildDoctorSummary(sam(), RANGE);
  const words = doc.sections.find((s) => s.id === 'words');
  const first = words.quotes[0];
  const after = buildDoctorSummary(sam(), { ...RANGE, hiddenQuotes: [quoteKey(first)] });
  const w2 = after.sections.find((s) => s.id === 'words');
  assert.ok(!w2.quotes.some((q) => quoteKey(q) === quoteKey(first)));
  assert.equal(after.wordsHidden, 1);
  assert.equal(w2.quotes.length, words.quotes.length, 'the next note fills the space');
});

test('bleeding answers sit on Periods; bowel/bladder get a section; anything about sex stays private', () => {
  const input = {
    ...EMPTY,
    symptoms: [
      note('2026-09-01', { flooding: true, clots: true, products: '6+' }),
      note('2026-09-02', { flooding: true, bowelPain: true }),
      note('2026-09-03', { bleedingAfterSex: true, urinePain: true, impacts: ['Sex'] }),
    ],
  };
  const doc = buildDoctorSummary(input, RANGE);
  const periods = doc.sections.find((s) => s.id === 'periods');
  assert.deepEqual(periods.details, ['6+ pads or tampons a day on 1 day', 'Flooding on 2 days', 'Clots on 1 day']);
  const bb = doc.sections.find((s) => s.id === 'bowelBladder');
  assert.deepEqual(bb.items, [{ label: 'Pain opening bowels', days: 1 }, { label: 'Pain passing urine', days: 1 }]);
  // Off by default: nothing about sex on the page, text or PDF.
  for (const out of [summaryToText(doc), summaryToHtml(doc)]) assert.doesNotMatch(out, /after sex|of sex/i);
  assert.ok(doc.available.some((s) => s.id === 'sex'), 'the switch is offered');
  const on = buildDoctorSummary(input, { ...RANGE, include: { sex: true } });
  assert.deepEqual(on.sections.find((s) => s.id === 'sex').items.map((i) => i.label), ['Got in the way of sex', 'Bleeding after sex']);
});

test('coverage line names the areas with nothing recorded', () => {
  const doc = buildDoctorSummary(sam(), RANGE);
  const line = coverageLine(doc);
  assert.match(line, /^\d+ of 13 areas recorded\./);
  for (const d of doc.domains.filter((x) => x.state === 'not-recorded')) assert.ok(line.includes(d.heading));
  assert.ok(summaryToHtml(doc).includes('class="meta cover"'));
});
