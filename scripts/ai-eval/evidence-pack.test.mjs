// Evidence pack (18 Nov 2026): treatments tried, appointments and what pain stopped on page 1 of the report.
// Counts of her own entries only; never a score, flag or verdict; older notes keep their own words.
// Run: node --experimental-strip-types --import ./scripts/ai-eval/ts-register.mjs --test scripts/ai-eval/evidence-pack.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDoctorSummary, summaryToHtml, PACK_WORDS_TITLE } from '../../lib/records/summary.ts';

const RANGE = { from: '2026-08-01', to: '2026-11-24', today: '2026-11-24' };
let n = 0;
const rec = (data) => ({ id: `r${++n}`, createdAt: '2026-11-01T10:00:00Z', data });
const note = (date, impacts) => rec({ date, words: `Pain on ${date}`, where: '', duration: '', stopped: null, stoppedWords: '', worst: 7, score: 7, impacts });
const appt = (date, extra) => rec({ date, datePrecision: 'exact', who: '', why: '', told: '', tests: '', next: '', notes: '', ...extra });
const med = (extra) => rec({ name: '', started: '2025-01-10', startedPrecision: 'exact', stopped: '', stoppedPrecision: 'exact', happened: '', ...extra });

const input = () => ({
  name: 'Sam',
  symptoms: [
    note('2026-09-01', ['Missed work or study', 'Broken sleep']),
    note('2026-09-02', ['Missed work or study']),
    note('2026-09-03', ['Left work or study early', 'Cancelled plans']),
    note('2026-09-04', ['Work or study']), // older value: "got in the way", not a missed day
    note('2026-09-05', ['Nothing today']),
  ],
  periodDays: [],
  history: [],
  medicines: [
    med({ name: 'Naproxen', dose: '500 mg', category: 'Painkiller', helped: 'A little', sideEffects: 'Stomach ache', happened: 'Takes the edge off.' }),
    med({ name: 'Microgynon 30', category: 'The pill', started: '2024-03-01', startedPrecision: 'month', stopped: '2025-09-01', stoppedPrecision: 'month', helped: 'No' }),
  ],
  appointments: [
    appt('2024-03-12', { seenBy: 'GP', outcomes: ['New prescription'], said: 'Pain 8 every period.', told: 'Periods can be painful.' }),
    appt('2024-07-03', { seenBy: 'Practice nurse', outcomes: ['Nothing offered'] }),
    appt('2025-10-14', { seenBy: 'GP', who: 'Dr Patel', outcomes: ['New prescription', 'Come back if it gets worse'] }),
    appt('2026-09-02', { who: 'Walk-in centre', next: 'Wait and see' }), // older shape: free text only
  ],
});

test('what pain stopped: day counts of the new choices; older "got in the way" values are not relabelled', () => {
  const doc = buildDoctorSummary(input(), RANGE);
  const by = Object.fromEntries(doc.glance.map((g) => [g.id, g]));
  assert.equal(by.missed.value, '2');
  assert.equal(by.leftEarly.value, '1');
  assert.equal(by.cancelled.value, '1');
  assert.equal(by.sleep.value, '1');
  assert.equal(by.missed.label, 'Days off work or study');
  assert.ok(!by.impact, 'the general tile gives way to the specific counts');
  const affected = doc.sections.find((s) => s.id === 'impacts');
  assert.ok(affected.items.some((c) => c.label === 'Work or study' && c.days === 1), 'the older value still counts under its own words');
});

test('treatments: her category, dates, did it help and side effects as she gave them', () => {
  const doc = buildDoctorSummary(input(), RANGE);
  assert.equal(doc.sections[0].id, 'tried');
  const [first, second] = doc.sections[0].items;
  assert.equal(first.title, 'Naproxen · 500 mg');
  assert.equal(first.kind, 'painkiller');
  assert.match(first.dates, / – now$/);
  assert.equal(first.helpedAnswer, 'A little');
  assert.equal(first.sideEffects, 'Stomach ache');
  assert.equal(second.kind, 'the pill');
  assert.equal(second.helpedAnswer, 'No');
});

test('appointments: who, what happened next, and counts of her own ticks (never zeros)', () => {
  const doc = buildDoctorSummary(input(), RANGE);
  const a = doc.sections.find((s) => s.id === 'appointments');
  assert.equal(a.since, '4 since March 2024');
  assert.deepEqual(a.items.map((i) => i.title), ['Walk-in centre', 'GP · Dr Patel', 'Practice nurse', 'GP']);
  assert.equal(a.items[0].outcome, 'Wait and see', 'older records show her own words');
  assert.equal(a.items[1].outcome, 'New prescription · Come back if it gets worse');
  assert.equal(a.outcomes, 'New prescription 2 · Come back if it gets worse 1 · Nothing offered 1');
  assert.doesNotMatch(a.outcomes, /\b0\b|Referral|Scan/);
  const gp = a.items.find((i) => i.date.includes('2024') && i.title === 'GP');
  assert.deepEqual(gp.lines.map((l) => l.label), ['What I said', 'What they said']);
});

test('PDF: evidence pack on page 1, her words later, no score words, no Wren', () => {
  const doc = buildDoctorSummary(input(), RANGE);
  assert.equal(doc.title, 'Evidence pack — Sam');
  const html = summaryToHtml(doc);
  const mark = html.indexOf('class="pack-end"');
  assert.ok(mark > 0, 'page break after the pack');
  const cut = html.indexOf('</section>', mark) + '</section>'.length;
  const page1 = html.slice(0, cut), rest = html.slice(cut);
  assert.match(page1, /Treatments tried/);
  assert.match(page1, /Appointments · 4 since March 2024/);
  assert.match(page1, /Days off work or study/);
  assert.match(rest, new RegExp(PACK_WORDS_TITLE));
  assert.match(rest, /Periods can be painful\./);
  assert.match(rest, /Takes the edge off\./);
  assert.doesNotMatch(html, /score|likel|diagnos|dismiss|average|percent|Wren/i);
});

test('no pack without treatments, appointments or the new counts: the summary stays as it was', () => {
  const doc = buildDoctorSummary({ ...input(), medicines: [], appointments: [], symptoms: [note('2026-09-04', ['Work or study'])] }, RANGE);
  assert.equal(doc.title, 'Symptom summary — Sam');
  assert.doesNotMatch(summaryToHtml(doc), /class="pack-end"/);
});

test('switching a section off takes it off page 1 too', () => {
  const doc = buildDoctorSummary(input(), { ...RANGE, include: { tried: false, impacts: false } });
  assert.ok(!doc.sections.some((s) => s.id === 'tried'));
  assert.ok(!doc.glance.some((g) => g.id === 'missed'));
  assert.equal(doc.sections[0].id, 'appointments');
});
