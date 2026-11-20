// "Before and after your appointment" (20 Nov 2026): fixed reading pages and common GP questions.
// Guards the rules in lib/learn/pages.ts: same content for everyone, no verdict words, every page sourced, and each
// common question survives the report's question splitter as exactly one question.
// Run: node --experimental-strip-types --import ./scripts/ai-eval/ts-register.mjs --test scripts/ai-eval/learn-pages.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { COMMON_QUESTIONS, LEARN_PAGES, learnPage } from '../../lib/learn/pages.ts';
import { agendaBlockOf } from '../../lib/records/summary.ts';

const allText = (p) => [p.title, p.blurb, ...p.blocks.flatMap((b) => [b.heading, b.lead, ...(b.bullets ?? []), ...(b.text ?? [])])]
  .filter(Boolean).join('\n');

test('each common question stays one question on the report', () => {
  for (const q of COMMON_QUESTIONS) {
    assert.ok(q.endsWith('?'), `ends with a question mark: ${q}`);
    const b = agendaBlockOf(q, '');
    assert.deepEqual(b?.questions, [q], `not split: ${q}`);
  }
  // All of them together still come back one per line, in order.
  const b = agendaBlockOf(['My main priority is pain.', ...COMMON_QUESTIONS.slice(0, 7)].join('\n'), '');
  assert.equal(b?.priority, 'My main priority is pain.');
  assert.deepEqual(b?.questions, COMMON_QUESTIONS.slice(0, 7));
});

test('no verdict, score or personal-risk wording on any page or question', () => {
  // "You think you might have endometriosis" is the NHS's own see-a-GP line about her concern, not a verdict.
  const banned = /\b((?<!think )you (may|might|probably|likely) have|your (risk|score|likelihood)|likelihood|percent|%|matches? your|based on your (records|entries|notes)|abnormal|diagnos(e|is) (you|your))\b/i;
  for (const p of LEARN_PAGES) assert.doesNotMatch(allText(p), banned, p.id);
  for (const q of COMMON_QUESTIONS) assert.doesNotMatch(q, banned, q);
});

test('every page has sources with https links, and pain is named plainly', () => {
  for (const p of LEARN_PAGES) {
    assert.ok(p.sources.length > 0, p.id);
    for (const s of [...p.sources, ...(p.links ?? [])]) assert.match(s.url, /^https:\/\//, `${p.id}: ${s.url}`);
  }
  assert.match(allText(learnPage('endometriosis')), /pain/i);
  assert.doesNotMatch(LEARN_PAGES.map(allText).join('\n'), /\bdiscomfort\b/i);
});

test('PMOS is introduced with its old name, and pages are found by id', () => {
  const pmos = learnPage('pmos');
  assert.ok(pmos && /PCOS/.test(pmos.title) && /PMOS/.test(pmos.title));
  assert.equal(learnPage('nope'), undefined);
  assert.deepEqual(LEARN_PAGES.map((p) => p.id), ['endometriosis', 'pmos', 'next-steps']);
});
