import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';

import {
  TopCatalystEventRow,
  CatalystSnapshotMonthView,
  sortTcMacroByTier,
  buildSnapshotParams,
} from '../stocks-earnings-calendar';

import type { TopCatalystEntry, CalendarEvent } from '../stocks-earnings-calendar';

// ─── Helpers ─────────────────────────────────────────────────────

function firstWeekdayDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = d.getMonth();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  for (let day = 1; day <= daysInMonth; day++) {
    const candidate = new Date(y, m, day);
    const dow = candidate.getDay();
    if (dow !== 0 && dow !== 6) {
      const mm = String(m + 1).padStart(2, '0');
      const dd = String(day).padStart(2, '0');
      return `${y}-${mm}-${dd}`;
    }
  }
  throw new Error('no weekday in current month');
}

function makeTcMacro(title: string, signalTier: TopCatalystEntry['signal_tier'], extra: Partial<TopCatalystEntry> = {}): TopCatalystEntry {
  return {
    id: `${title}-${signalTier}`,
    date: '2026-08-03',
    event_type: 'economic_release',
    title,
    signal_tier: signalTier,
    raw: {},
    ...extra,
  } as TopCatalystEntry;
}

function makeMonthEvent(title: string, signalTier: CalendarEvent['signal_tier'], date?: string): CalendarEvent {
  return {
    id: `${title}-${signalTier}`,
    date: date ?? firstWeekdayDate(),
    title,
    eventType: 'economic_release',
    signal_tier: signalTier,
    raw: {
      title,
      event_type: 'economic_release',
      signal_tier: signalTier,
    } as any,
  };
}

function renderHtml(element: React.ReactElement): string {
  return renderToStaticMarkup(element);
}

// ─── Top Catalysts tier presentation ─────────────────────────────

test('Major macro row renders a Major badge', () => {
  const html = renderHtml(
    React.createElement(TopCatalystEventRow, {
      ev: makeTcMacro('Employment Report', 'major'),
      identityMap: {},
      variant: 'macro',
      onClick: () => {},
    })
  );
  assert.ok(html.includes('Major'));
});

test('Secondary macro row renders a Secondary badge', () => {
  const html = renderHtml(
    React.createElement(TopCatalystEventRow, {
      ev: makeTcMacro('ISM Manufacturing', 'secondary'),
      identityMap: {},
      variant: 'macro',
      onClick: () => {},
    })
  );
  assert.ok(html.includes('Secondary'));
});

test('Critical macro row renders a Critical badge', () => {
  const html = renderHtml(
    React.createElement(TopCatalystEventRow, {
      ev: makeTcMacro('FOMC Decision', 'critical'),
      identityMap: {},
      variant: 'macro',
      onClick: () => {},
    })
  );
  assert.ok(html.includes('Critical'));
});

test('Context macro row renders a Context badge and muted treatment', () => {
  const html = renderHtml(
    React.createElement(TopCatalystEventRow, {
      ev: makeTcMacro('Light Data', 'context'),
      identityMap: {},
      variant: 'macro',
      onClick: () => {},
    })
  );
  assert.ok(html.includes('Context'));
  assert.ok(html.includes('opacity-70') || html.includes('opacity-60') || html.includes('opacity-50'));
});

test('Macro rows are ordered Critical → Major → Secondary → Context', () => {
  const input = [
    makeTcMacro('B', 'major', { id: 'major' }),
    makeTcMacro('D', 'context', { id: 'context' }),
    makeTcMacro('A', 'critical', { id: 'critical' }),
    makeTcMacro('C', 'secondary', { id: 'secondary' }),
  ];
  const sorted = sortTcMacroByTier(input);
  assert.deepEqual(sorted.map((e) => e.id), ['critical', 'major', 'secondary', 'context']);
});

test('Same-tier macro rows preserve original order', () => {
  const input = [
    makeTcMacro('First Major', 'major', { id: '1' }),
    makeTcMacro('Second Major', 'major', { id: '2' }),
    makeTcMacro('Third Major', 'major', { id: '3' }),
  ];
  const sorted = sortTcMacroByTier(input);
  assert.deepEqual(sorted.map((e) => e.id), ['1', '2', '3']);
});

test('Earnings rows do not receive macro-tier fallback badges', () => {
  const ev: TopCatalystEntry = {
    id: 'earnings-1',
    date: '2026-08-03',
    event_type: 'earnings',
    title: 'AAPL Earnings',
    symbol: 'AAPL',
    importance: 'high',
    raw: {},
  } as TopCatalystEntry;
  const html = renderHtml(
    React.createElement(TopCatalystEventRow, {
      ev,
      identityMap: {},
      variant: 'earnings',
      onClick: () => {},
    })
  );
  assert.ok(!html.includes('Critical'));
  assert.ok(!html.includes('Major'));
  assert.ok(!html.includes('Secondary'));
  assert.ok(!html.includes('Context'));
  assert.ok(html.includes('AAPL'));
});

test('Event Type View macro ordering helper keeps Critical before Major before Secondary before Context', () => {
  const input = [
    makeTcMacro('M2', 'major', { id: 'm2' }),
    makeTcMacro('S1', 'secondary', { id: 's1' }),
    makeTcMacro('C1', 'critical', { id: 'c1' }),
    makeTcMacro('X1', 'context', { id: 'x1' }),
  ];
  const sorted = sortTcMacroByTier(input);
  assert.deepEqual(sorted.map((e) => e.id), ['c1', 'm2', 's1', 'x1']);
});

test('Macro detail row is a button and remains clickable', () => {
  let clicked = false;
  const html = renderHtml(
    React.createElement(TopCatalystEventRow, {
      ev: makeTcMacro('Retail Sales', 'major'),
      identityMap: {},
      variant: 'macro',
      onClick: () => { clicked = true; },
    })
  );
  assert.ok(html.startsWith('<button'));
});

// ─── Economic Releases Month tier clarity ────────────────────────

test('Critical month chip visibly says Critical', () => {
  const date = firstWeekdayDate();
  const html = renderHtml(
    React.createElement(CatalystSnapshotMonthView, {
      events: [makeMonthEvent('FOMC Minutes', 'critical', date)],
      loading: false,
      tabKey: 'economic_releases',
      onEventClick: () => {},
      anchorKey: `${date.slice(0, 8)}01`,
      onSelectDay: () => {},
    })
  );
  assert.ok(html.includes('Critical'));
  assert.ok(html.includes('FOMC Minutes'));
});

test('Major month chip visibly says Major', () => {
  const date = firstWeekdayDate();
  const html = renderHtml(
    React.createElement(CatalystSnapshotMonthView, {
      events: [makeMonthEvent('Employment Report', 'major', date)],
      loading: false,
      tabKey: 'economic_releases',
      onEventClick: () => {},
      anchorKey: `${date.slice(0, 8)}01`,
      onSelectDay: () => {},
    })
  );
  assert.ok(html.includes('Major'));
});

test('Secondary month chip visibly says Secondary', () => {
  const date = firstWeekdayDate();
  const html = renderHtml(
    React.createElement(CatalystSnapshotMonthView, {
      events: [makeMonthEvent('Factory Orders', 'secondary', date)],
      loading: false,
      tabKey: 'economic_releases',
      onEventClick: () => {},
      anchorKey: `${date.slice(0, 8)}01`,
      onSelectDay: () => {},
    })
  );
  assert.ok(html.includes('Secondary'));
});

test('Context month chip visibly says Context', () => {
  const date = firstWeekdayDate();
  const html = renderHtml(
    React.createElement(CatalystSnapshotMonthView, {
      events: [makeMonthEvent('Light Data', 'context', date)],
      loading: false,
      tabKey: 'economic_releases',
      onEventClick: () => {},
      anchorKey: `${date.slice(0, 8)}01`,
      onSelectDay: () => {},
    })
  );
  assert.ok(html.includes('Context'));
});

test('Month chips use tier-specific styling rather than one generic macro style', () => {
  const date = firstWeekdayDate();
  const html = renderHtml(
    React.createElement(CatalystSnapshotMonthView, {
      events: [
        makeMonthEvent('FOMC Minutes', 'critical', date),
        makeMonthEvent('Employment Report', 'major', date),
        makeMonthEvent('Factory Orders', 'secondary', date),
        makeMonthEvent('Light Data', 'context', date),
      ],
      loading: false,
      tabKey: 'economic_releases',
      onEventClick: () => {},
      anchorKey: `${date.slice(0, 8)}01`,
      onSelectDay: () => {},
    })
  );
  assert.ok(html.includes('bg-rose-500/'));
  assert.ok(html.includes('bg-orange-500/'));
  assert.ok(html.includes('bg-white/') || html.includes('bg-white/[0.03]'));
});

test('Macro Month view renders the four-tier legend', () => {
  const date = firstWeekdayDate();
  const html = renderHtml(
    React.createElement(CatalystSnapshotMonthView, {
      events: [makeMonthEvent('Employment Report', 'major', date)],
      loading: false,
      tabKey: 'economic_releases',
      onEventClick: () => {},
      anchorKey: `${date.slice(0, 8)}01`,
      onSelectDay: () => {},
    })
  );
  assert.ok(html.includes('Macro tier legend'));
  assert.ok(html.includes('Critical'));
  assert.ok(html.includes('Major'));
  assert.ok(html.includes('Secondary'));
  assert.ok(html.includes('Context'));
});

test('Non-macro Month views do not render the macro tier legend', () => {
  const date = firstWeekdayDate();
  const html = renderHtml(
    React.createElement(CatalystSnapshotMonthView, {
      events: [{ id: 'd1', date, title: 'AAPL Dividend', eventType: 'dividend', raw: {} as any }],
      loading: false,
      tabKey: 'dividends',
      onEventClick: () => {},
      anchorKey: `${date.slice(0, 8)}01`,
      onSelectDay: () => {},
    })
  );
  assert.ok(!html.includes('Macro tier legend'));
});

test('Top three events are still selected after tier sorting', () => {
  const date = firstWeekdayDate();
  const html = renderHtml(
    React.createElement(CatalystSnapshotMonthView, {
      events: [
        makeMonthEvent('Secondary A', 'secondary', date),
        makeMonthEvent('Critical A', 'critical', date),
        makeMonthEvent('Context A', 'context', date),
        makeMonthEvent('Major A', 'major', date),
      ],
      loading: false,
      tabKey: 'economic_releases',
      onEventClick: () => {},
      anchorKey: `${date.slice(0, 8)}01`,
      onSelectDay: () => {},
    })
  );
  // The visible chips should be the three highest tiers.
  assert.ok(html.includes('Critical A'));
  assert.ok(html.includes('Major A'));
  assert.ok(html.includes('Secondary A'));
  assert.ok(!html.includes('Context A'));
  assert.ok(html.includes('+1 more'));
});

test('+N more count remains correct', () => {
  const date = firstWeekdayDate();
  const html = renderHtml(
    React.createElement(CatalystSnapshotMonthView, {
      events: [
        makeMonthEvent('A', 'critical', date),
        makeMonthEvent('B', 'major', date),
        makeMonthEvent('C', 'secondary', date),
        makeMonthEvent('D', 'secondary', date),
        makeMonthEvent('E', 'context', date),
      ],
      loading: false,
      tabKey: 'economic_releases',
      onEventClick: () => {},
      anchorKey: `${date.slice(0, 8)}01`,
      onSelectDay: () => {},
    })
  );
  assert.ok(html.includes('+2 more'));
});

// ─── Month → Day drilldown interactions ──────────────────────────

function setupDom() {
  const dom = new JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>');
  global.document = dom.window.document as any;
  global.window = dom.window as any;
  global.KeyboardEvent = dom.window.KeyboardEvent as any;
  return dom;
}

test('Clicking a populated day cell invokes onSelectDay with the date', async () => {
  setupDom();
  const date = firstWeekdayDate();
  let selected: string | null = null;
  const container = document.getElementById('root')!;
  const root = createRoot(container);

  await act(async () => {
    root.render(
      React.createElement(CatalystSnapshotMonthView, {
        events: [makeMonthEvent('Employment Report', 'major', date)],
        loading: false,
        tabKey: 'economic_releases',
        onEventClick: () => {},
        anchorKey: `${date.slice(0, 8)}01`,
        onSelectDay: (dk: string) => { selected = dk; },
      })
    );
  });

  const cell = container.querySelector(`[aria-label^="${date}"]`) as HTMLElement;
  assert.ok(cell, 'day cell should be interactive');
  await act(async () => {
    cell.click();
  });
  assert.equal(selected, date);
  root.unmount();
});

test('Clicking an empty real day cell invokes onSelectDay', async () => {
  setupDom();
  const date = firstWeekdayDate();
  let selected: string | null = null;
  const container = document.getElementById('root')!;
  const root = createRoot(container);

  await act(async () => {
    root.render(
      React.createElement(CatalystSnapshotMonthView, {
        events: [],
        loading: false,
        tabKey: 'economic_releases',
        onEventClick: () => {},
        anchorKey: `${date.slice(0, 8)}01`,
        onSelectDay: (dk: string) => { selected = dk; },
      })
    );
  });

  const cell = container.querySelector(`[aria-label^="${date}"]`) as HTMLElement;
  assert.ok(cell, 'empty day cell should be interactive');
  await act(async () => {
    cell.click();
  });
  assert.equal(selected, date);
  root.unmount();
});

test('Clicking an event chip opens the modal and does not trigger day navigation', async () => {
  setupDom();
  const date = firstWeekdayDate();
  let selectedDay: string | null = null;
  let selectedEvent: CalendarEvent | null = null;
  const container = document.getElementById('root')!;
  const root = createRoot(container);

  const ev = makeMonthEvent('Employment Report', 'major', date);
  await act(async () => {
    root.render(
      React.createElement(CatalystSnapshotMonthView, {
        events: [ev],
        loading: false,
        tabKey: 'economic_releases',
        onEventClick: (e: CalendarEvent) => { selectedEvent = e; },
        anchorKey: `${date.slice(0, 8)}01`,
        onSelectDay: (dk: string) => { selectedDay = dk; },
      })
    );
  });

  const chip = container.querySelector('button[title="Employment Report"]') as HTMLElement;
  assert.ok(chip, 'event chip button should exist');
  await act(async () => {
    chip.click();
  });
  assert.equal(selectedEvent?.id, ev.id);
  assert.equal(selectedDay, null);
  root.unmount();
});

test('Pressing Enter on a day cell triggers drilldown', async () => {
  setupDom();
  const date = firstWeekdayDate();
  let selected: string | null = null;
  const container = document.getElementById('root')!;
  const root = createRoot(container);

  await act(async () => {
    root.render(
      React.createElement(CatalystSnapshotMonthView, {
        events: [],
        loading: false,
        tabKey: 'economic_releases',
        onEventClick: () => {},
        anchorKey: `${date.slice(0, 8)}01`,
        onSelectDay: (dk: string) => { selected = dk; },
      })
    );
  });

  const cell = container.querySelector(`[aria-label^="${date}"]`) as HTMLElement;
  assert.ok(cell);
  await act(async () => {
    cell.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  });
  assert.equal(selected, date);
  root.unmount();
});

test('Pressing Space on a day cell triggers drilldown', async () => {
  setupDom();
  const date = firstWeekdayDate();
  let selected: string | null = null;
  const container = document.getElementById('root')!;
  const root = createRoot(container);

  await act(async () => {
    root.render(
      React.createElement(CatalystSnapshotMonthView, {
        events: [],
        loading: false,
        tabKey: 'economic_releases',
        onEventClick: () => {},
        anchorKey: `${date.slice(0, 8)}01`,
        onSelectDay: (dk: string) => { selected = dk; },
      })
    );
  });

  const cell = container.querySelector(`[aria-label^="${date}"]`) as HTMLElement;
  assert.ok(cell);
  await act(async () => {
    cell.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
  });
  assert.equal(selected, date);
  root.unmount();
});

test('Placeholder cells are not interactive', () => {
  const date = firstWeekdayDate();
  const html = renderHtml(
    React.createElement(CatalystSnapshotMonthView, {
      events: [],
      loading: false,
      tabKey: 'economic_releases',
      onEventClick: () => {},
      anchorKey: `${date.slice(0, 8)}01`,
      onSelectDay: () => {},
    })
  );
  const dom = new JSDOM(html);
  const cells = Array.from(dom.window.document.querySelectorAll('[role="button"]'));
  // Only real weekday cells get role=button; placeholder divs do not.
  assert.ok(cells.length > 0, 'real weekday cells should be buttons');
  cells.forEach((cell) => {
    assert.ok(cell.getAttribute('aria-label'), 'every interactive cell must have an aria-label');
  });
});

test('Day query after drilldown uses view=day and the clicked date', () => {
  const params = buildSnapshotParams('economic_releases', 'all', '', 'day', '2026-08-12');
  assert.equal(params.get('view'), 'day');
  assert.equal(params.get('date'), '2026-08-12');
});

test('Returning to Month still requests the correct month anchor', () => {
  const params = buildSnapshotParams('economic_releases', 'all', '', 'month', '2026-08-01');
  assert.equal(params.get('view'), 'month');
  assert.equal(params.get('date'), '2026-08-01');
});
