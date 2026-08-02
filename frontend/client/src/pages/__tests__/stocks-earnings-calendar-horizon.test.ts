import assert from 'node:assert/strict';
import test from 'node:test';

import {
  addDaysKey,
  addMonthsKey,
  snapToMondayKey,
  snapToFirstOfMonthKey,
  canonicalAnchorForMode,
  resolveWeekMonday,
  buildSnapshotParams,
  buildSnapshotQueryKey,
  extractHorizonMeta,
  classifyHorizonEmpty,
  formatWindowLabel,
  selectSnapshotEvents,
  weekNavDisabled,
} from '../stocks-earnings-calendar';

type AnyEvent = {
  id?: string;
  date: string;
  symbol?: string;
  title?: string;
  event_type: string;
  [k: string]: unknown;
};

function ev(date: string, title: string, extra: Record<string, unknown> = {}): AnyEvent {
  return { id: `${date}-${title}`, date, event_type: 'economic_releases', title, ...extra };
}

// ─── Date movement ─────────────────────────────────────────────────

test('next week advances the anchor by 7 calendar days', () => {
  assert.equal(addDaysKey('2026-08-03', 7), '2026-08-10');
});

test('previous week subtracts 7 calendar days', () => {
  assert.equal(addDaysKey('2026-08-03', -7), '2026-07-27');
});

test('a date inside a week snaps to that week Monday', () => {
  assert.equal(snapToMondayKey('2026-08-04'), '2026-08-03');
  assert.equal(snapToMondayKey('2026-08-03'), '2026-08-03');
  assert.equal(snapToMondayKey('2026-08-07'), '2026-08-03');
});

test('anchor snaps to the first of its month', () => {
  assert.equal(snapToFirstOfMonthKey('2026-08-15'), '2026-08-01');
});

// ─── Week request construction ─────────────────────────────────────

test('week request includes view=week and the selected date', () => {
  const p = buildSnapshotParams('economic_releases', 'all', '', 'week', '2026-08-03');
  assert.equal(p.get('tab'), 'economic_releases');
  assert.equal(p.get('view'), 'week');
  assert.equal(p.get('date'), '2026-08-03');
  assert.equal(p.get('scope'), 'all');
});

test('month request includes view=month and the selected date', () => {
  const p = buildSnapshotParams('economic_releases', 'all', '', 'month', '2026-08-01');
  assert.equal(p.get('view'), 'month');
  assert.equal(p.get('date'), '2026-08-01');
});

test('day request includes view=day and the selected date', () => {
  const p = buildSnapshotParams('economic_releases', 'all', '', 'day', '2026-08-04');
  assert.equal(p.get('view'), 'day');
  assert.equal(p.get('date'), '2026-08-04');
});

test('recent request sends view=recent', () => {
  const p = buildSnapshotParams('economic_releases', 'all', '', 'recent');
  assert.equal(p.get('view'), 'recent');
  assert.equal(p.get('date'), null);
});

test('search is preserved alongside view/date and values are encoded', () => {
  const p = buildSnapshotParams('economic_releases', 'watchlist', 'inflation cpi', 'week', '2026-08-03');
  assert.equal(p.get('search'), 'inflation cpi');
  assert.equal(p.toString().includes('view=week'), true);
});

// ─── Month boundaries ──────────────────────────────────────────────

test('December → January boundary works', () => {
  assert.equal(addMonthsKey('2026-12-01', 1), '2027-01-01');
});

test('January → December boundary works', () => {
  assert.equal(addMonthsKey('2026-01-01', -1), '2025-12-01');
});

test('next/previous month moves the anchor', () => {
  assert.equal(addMonthsKey('2026-08-01', 1), '2026-09-01');
  assert.equal(addMonthsKey('2026-08-01', -1), '2026-07-01');
});

// ─── Week label ────────────────────────────────────────────────────

test('week label uses backend window_start/window_end', () => {
  assert.equal(formatWindowLabel('2026-08-03', '2026-08-07'), 'Aug 3 – Aug 7, 2026');
  assert.equal(formatWindowLabel('2026-07-27', '2026-07-31'), 'Jul 27 – Jul 31, 2026');
});

test('week label falls back to the requested Monday when backend bounds are absent', () => {
  assert.equal(formatWindowLabel(undefined, undefined, '2026-08-03'), 'Aug 3 – Aug 7, 2026');
});

// ─── Selected response collection ──────────────────────────────────

test('future week response renders response.events only', () => {
  const events = [ev('2026-09-07', 'Future Release A'), ev('2026-09-09', 'Future Release B')];
  const data = {
    view: 'week',
    requested_date: '2026-09-07',
    window_start: '2026-09-07',
    window_end: '2026-09-11',
    events,
    event_count: events.length,
    coverage_complete: true,
    horizon_start: '2026-01-01',
    horizon_end: '2026-12-31',
    current_week: [ev('2026-08-03', 'Snapshot Week Event')],
  };
  assert.deepEqual(selectSnapshotEvents(data, 'week', { currentWeek: data.current_week, previousWeek: [] }), events);
});

test('historical week response renders response.events', () => {
  const events = [ev('2026-03-02', 'Historic Release')];
  const data = { view: 'week', requested_date: '2026-03-02', window_start: '2026-03-02', window_end: '2026-03-06', events, event_count: 1, coverage_complete: true };
  assert.deepEqual(selectSnapshotEvents(data, 'week', { currentWeek: [], previousWeek: [] }), events);
});

test('week does not merge response.events with current_week', () => {
  const windowEvents = [ev('2026-08-10', 'Window Event')];
  const currentWeek = [ev('2026-08-03', 'Snapshot Current Week Event')];
  const data = { view: 'week', events: windowEvents, event_count: 1, coverage_complete: true, current_week: currentWeek };
  const selected = selectSnapshotEvents(data, 'week', { currentWeek, previousWeek: [] });
  assert.equal(selected.length, 1);
  assert.deepEqual(selected, windowEvents);
  assert.equal(selected.some((e) => e.title === 'Snapshot Current Week Event'), false);
});

test('month renders events across multiple weeks and is not restricted to current_week', () => {
  const monthEvents = [
    ev('2026-08-03', 'Aug 3'),
    ev('2026-08-10', 'Aug 10'),
    ev('2026-08-24', 'Aug 24'),
  ];
  const currentWeek = [ev('2026-08-03', 'Current Week Only')];
  const data = { view: 'month', requested_date: '2026-08-01', events: monthEvents, event_count: 3, coverage_complete: true, current_week: currentWeek };
  const selected = selectSnapshotEvents(data, 'month', { currentWeek, previousWeek: [] });
  assert.equal(selected.length, 3);
  assert.deepEqual(selected, monthEvents);
});

test('old response without events uses the legacy snapshot fallback', () => {
  const legacy = { current_week: [ev('2026-08-03', 'Legacy Current')], previous_week: [ev('2026-07-27', 'Legacy Prev')] };
  assert.equal(extractHorizonMeta(legacy), null);
  assert.deepEqual(selectSnapshotEvents(legacy, 'week', { currentWeek: legacy.current_week, previousWeek: legacy.previous_week }), legacy.current_week);
  assert.deepEqual(selectSnapshotEvents(legacy, 'recent', { currentWeek: legacy.current_week, previousWeek: legacy.previous_week }), legacy.previous_week);
});

test('no duplicate events: the selected collection is exactly response.events', () => {
  const windowEvents = [ev('2026-08-10', 'A'), ev('2026-08-11', 'B')];
  const data = { view: 'week', events: windowEvents, event_count: 2, coverage_complete: true };
  const selected = selectSnapshotEvents(data, 'week', { currentWeek: windowEvents, previousWeek: [] });
  assert.equal(selected.length, 2);
  assert.deepEqual(new Set(selected.map((e) => e.id)).size, 2);
});

// ─── React Query keys ──────────────────────────────────────────────

test('query key changes with view', () => {
  const base = { tabKey: 'economic_releases', scope: 'all', search: '', currentWeekId: '2026-08-03', horizon: true, anchor: '2026-08-03' };
  const week = buildSnapshotQueryKey({ ...base, view: 'week' as const });
  const month = buildSnapshotQueryKey({ ...base, view: 'month' as const });
  const day = buildSnapshotQueryKey({ ...base, view: 'day' as const });
  const recent = buildSnapshotQueryKey({ ...base, view: 'recent' as const });
  assert.notDeepEqual(week, month);
  assert.notDeepEqual(week, day);
  assert.notDeepEqual(week, recent);
});

test('query key changes with the anchor date', () => {
  const base = { tabKey: 'economic_releases', scope: 'all', search: '', currentWeekId: '2026-08-03', horizon: true, view: 'week' as const };
  const current = buildSnapshotQueryKey({ ...base, anchor: '2026-08-03' });
  const future = buildSnapshotQueryKey({ ...base, anchor: '2026-08-10' });
  assert.notDeepEqual(current, future);
});

test('returning to a cached window never shares a key with another window', () => {
  const base = { tabKey: 'economic_releases', scope: 'all', search: '', currentWeekId: '2026-08-03', horizon: true };
  const weekA = buildSnapshotQueryKey({ ...base, view: 'week' as const, anchor: '2026-08-03' });
  const weekB = buildSnapshotQueryKey({ ...base, view: 'week' as const, anchor: '2026-08-10' });
  const monthA = buildSnapshotQueryKey({ ...base, view: 'month' as const, anchor: '2026-08-01' });
  assert.notDeepEqual(weekA, weekB);
  assert.notDeepEqual(weekA, monthA);
  assert.notDeepEqual(weekB, monthA);
});

test('legacy (non-horizon) tabs keep the original query key shape', () => {
  const key = buildSnapshotQueryKey({ tabKey: 'treasury_macro', scope: 'all', search: '', currentWeekId: '2026-08-03', horizon: false, view: 'week' as const, anchor: '2026-08-03' });
  assert.deepEqual(key, ['catalysts', 'snapshot', 'treasury_macro', 'all', '', '2026-08-03']);
});

// ─── Empty-state classification ────────────────────────────────────

test('coverage_complete=true with zero events shows the genuine empty state', () => {
  assert.equal(classifyHorizonEmpty({ coverage_complete: true, event_count: 0, empty_reason: 'no_events_in_window' }), 'no-events');
});

test('outside_horizon is reported as an uncovered range, not a confirmed empty', () => {
  assert.equal(classifyHorizonEmpty({ coverage_complete: false, event_count: 0, empty_reason: 'outside_horizon' }), 'outside-horizon');
});

test('legacy snapshot without horizon / snapshot_empty map to incomplete', () => {
  assert.equal(classifyHorizonEmpty({ empty_reason: 'legacy_snapshot_without_horizon' }), 'incomplete');
  assert.equal(classifyHorizonEmpty({ empty_reason: 'snapshot_empty' }), 'incomplete');
});

test('incomplete coverage with no events maps to incomplete', () => {
  assert.equal(classifyHorizonEmpty({ coverage_complete: false, event_count: 0 }), 'incomplete');
});

test('a populated covered window is not classified as empty', () => {
  assert.equal(classifyHorizonEmpty({ coverage_complete: true, event_count: 3, events: [ev('2026-08-03', 'x')] }), null);
});

// ─── Week navigation disabled state ────────────────────────────────

test('week prev is disabled only when the prior week is entirely before the horizon', () => {
  assert.deepEqual(weekNavDisabled('2026-08-03', '2026-08-03', undefined), { prevDisabled: true, nextDisabled: false });
  assert.deepEqual(weekNavDisabled('2026-08-10', '2026-08-03', undefined), { prevDisabled: false, nextDisabled: false });
});

test('week next is disabled only when the next week is entirely after the horizon', () => {
  assert.deepEqual(weekNavDisabled('2026-12-14', undefined, '2026-12-18'), { prevDisabled: false, nextDisabled: true });
  assert.deepEqual(weekNavDisabled('2026-12-07', undefined, '2026-12-18'), { prevDisabled: false, nextDisabled: false });
});

test('unknown horizon bounds keep navigation enabled', () => {
  assert.deepEqual(weekNavDisabled('2026-08-03', undefined, undefined), { prevDisabled: false, nextDisabled: false });
});

// ─── Weekend anchor canonicalisation ────────────────────────────────
// Proves a raw Sunday/Saturday never enters a Week request.
// All dates are explicit — no Date.now() or fixed-clock mocking needed
// because the helpers are pure.

test('Sunday Aug 2 initial Week canonical anchor is Aug 3', () => {
  assert.equal(canonicalAnchorForMode('2026-08-02', 'week'), '2026-08-03');
});

test('Sunday Aug 2 Week API request sends date=2026-08-03', () => {
  const canonical = canonicalAnchorForMode('2026-08-02', 'week');
  const p = buildSnapshotParams('economic_releases', 'all', '', 'week', canonical);
  assert.equal(p.get('date'), '2026-08-03');
});

test('Sunday Aug 2 Week query key contains 2026-08-03', () => {
  const canonical = canonicalAnchorForMode('2026-08-02', 'week');
  const key = buildSnapshotQueryKey({ tabKey: 'economic_releases', scope: 'all', search: '', currentWeekId: '2026-08-03', horizon: true, view: 'week' as const, anchor: canonical });
  assert.ok(key.includes('2026-08-03'));
  assert.ok(!key.includes('2026-08-02'));
});

test('Sunday Aug 2 Week label renders Aug 3\u20137', () => {
  assert.equal(formatWindowLabel('2026-08-03', '2026-08-07'), 'Aug 3 \u2013 Aug 7, 2026');
});

test('Sunday Now in Week mode returns Aug 3', () => {
  assert.equal(snapToMondayKey('2026-08-02'), '2026-08-03');
});

test('Saturday Aug 1 Week mode returns Aug 3', () => {
  assert.equal(canonicalAnchorForMode('2026-08-01', 'week'), '2026-08-03');
});

test('Monday Aug 3 Week mode remains Aug 3', () => {
  assert.equal(canonicalAnchorForMode('2026-08-03', 'week'), '2026-08-03');
});

test('Friday Aug 7 Week mode remains Aug 3', () => {
  assert.equal(canonicalAnchorForMode('2026-08-07', 'week'), '2026-08-03');
});

test('Week Prev from canonical Aug 3 returns Jul 27', () => {
  const canonical = canonicalAnchorForMode('2026-08-03', 'week');
  assert.equal(addDaysKey(canonical, -7), '2026-07-27');
});

test('Week Next from canonical Aug 3 returns Aug 10', () => {
  const canonical = canonicalAnchorForMode('2026-08-03', 'week');
  assert.equal(addDaysKey(canonical, 7), '2026-08-10');
});

test('Day Now on Sunday remains Aug 2 (no Monday jump in Day mode)', () => {
  assert.equal(canonicalAnchorForMode('2026-08-02', 'day'), '2026-08-02');
});

test('Month Now on Sunday remains Aug 1', () => {
  assert.equal(canonicalAnchorForMode('2026-08-02', 'month'), '2026-08-01');
});

test('switching Month \u2192 Week produces Aug 3 without changing API/render contract', () => {
  const monthAnchor = canonicalAnchorForMode('2026-08-02', 'month'); // 2026-08-01
  const weekAnchor = canonicalAnchorForMode(monthAnchor, 'week');    // 2026-08-03
  assert.equal(weekAnchor, '2026-08-03');
});

// ─── Week board column / label coherence ──────────────────────────
// The rendered columns must follow the backend's reported window so
// a Jul 27–31 response never drives Aug 3–7 columns.

test('resolveWeekMonday prefers windowStart over all other sources', () => {
  const d = resolveWeekMonday('2026-08-03', '2026-07-20', '2026-07-13');
  assert.ok(d);
  const dk = (dt: Date) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  assert.equal(dk(d!), '2026-08-03');
});

test('resolveWeekMonday falls back to anchorKey when windowStart is absent', () => {
  const d = resolveWeekMonday(undefined, '2026-08-03', undefined);
  assert.ok(d);
  const dk = (dt: Date) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  assert.equal(dk(d!), '2026-08-03');
});

test('resolveWeekMonday falls back to windowFrom when anchorKey is absent', () => {
  const d = resolveWeekMonday(undefined, undefined, '2026-08-03');
  assert.ok(d);
  const dk = (dt: Date) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  assert.equal(dk(d!), '2026-08-03');
});

test('resolveWeekMonday returns null when nothing resolves', () => {
  assert.equal(resolveWeekMonday(undefined, undefined, undefined), null);
});

test('a response for Jul 27\u201331 cannot render Aug 3\u20137 columns', () => {
  const d = resolveWeekMonday('2026-07-27', '2026-08-03');
  assert.ok(d);
  const dk = (dt: Date) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  assert.equal(dk(d!), '2026-07-27');
  const label = formatWindowLabel('2026-07-27', '2026-07-31');
  assert.ok(label.includes('Jul 27'));
  assert.ok(!label.includes('Aug 3'));
});

// ─── Regression: screenshot failure from Sunday Aug 2 ────────────
// Models exactly the mismatch the user observed.

test('regression: Sunday initial Week \u2014 label, columns, and events all agree on Aug 3\u20137', () => {
  const rawBrowserDate = '2026-08-02';   // Sunday
  const canonical = canonicalAnchorForMode(rawBrowserDate, 'week');
  assert.equal(canonical, '2026-08-03');

  // API request
  const params = buildSnapshotParams('economic_releases', 'all', '', 'week', canonical);
  assert.equal(params.get('date'), '2026-08-03');

  // Query key
  const key = buildSnapshotQueryKey({ tabKey: 'economic_releases', scope: 'all', search: '', currentWeekId: '2026-08-03', horizon: true, view: 'week' as const, anchor: canonical });
  assert.ok(key.includes('2026-08-03'));

  // Simulated backend response
  const responseWindowStart = '2026-08-03';
  const responseWindowEnd   = '2026-08-07';
  const responseEvents = [ev('2026-08-03', 'FOMC Minutes'), ev('2026-08-05', 'PMI')];
  const data = {
    view: 'week',
    requested_date: '2026-08-03',
    window_start: responseWindowStart,
    window_end: responseWindowEnd,
    events: responseEvents,
    event_count: 2,
    coverage_complete: true,
    horizon_start: '2026-01-01',
    horizon_end: '2026-12-31',
  };

  // Label
  const label = formatWindowLabel(data.window_start, data.window_end);
  assert.ok(label.includes('Aug 3'));
  assert.ok(label.includes('Aug 7'));
  assert.ok(!label.includes('Jul'));

  // Columns anchor
  const anchorMonday = resolveWeekMonday(data.window_start, canonical);
  assert.ok(anchorMonday);
  const amd = `${anchorMonday!.getFullYear()}-${String(anchorMonday!.getMonth() + 1).padStart(2, '0')}-${String(anchorMonday!.getDate()).padStart(2, '0')}`;
  assert.equal(amd, '2026-08-03');

  // Events render
  const selected = selectSnapshotEvents(data, 'week', { currentWeek: [], previousWeek: [] });
  assert.equal(selected.length, 2);
  assert.equal(selected.some((e) => e.date === '2026-08-03'), true);
  assert.equal(selected.some((e) => e.date === '2026-08-05'), true);
});

// ─── Confirm existing navigation / horizon tests remain passing ────
// (the tests above share pure helpers; re-running the suite validates this)
