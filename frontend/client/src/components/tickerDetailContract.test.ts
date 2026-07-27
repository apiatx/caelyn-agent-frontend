import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { hasCompanyProfile, isEarningsSupported, type TickerDetailResponse } from './tickerDetailContract';

const complete: TickerDetailResponse = {
  symbol: 'AMKR',
  company: { company_name: 'Amkor Technology, Inc.', sector: 'Technology', industry: 'Semiconductors', market_cap: 14_715_571_712, country: 'US', beta: 2.214, ceo: 'Kevin K. Engel', exchange: 'NASDAQ', website: 'https://amkor.com', description: 'Packaging and testing.' },
  earnings_eligible: true,
  earnings_intelligence: { earnings_history: [{}], materials: { recent_filings: [] } },
};

test('AMKR exposes its profile and Earnings tab through the backend contract', () => {
  assert.equal(hasCompanyProfile(complete), true);
  assert.equal(isEarningsSupported(complete), true);
});

test('a missing description leaves independently available profile metadata visible', () => {
  assert.equal(hasCompanyProfile({ ...complete, company: { sector: 'Technology', description: null } }), true);
});

test('missing upcoming earnings, SEC materials, and historical reactions do not hide Earnings', () => {
  for (const earnings_intelligence of [
    { earnings_history: [], materials: null },
    { earnings_history: [], materials: { recent_filings: [] } },
    { earnings_history: [{ price_reaction: null }], reaction_summary: null },
  ]) assert.equal(isEarningsSupported({ ...complete, earnings_intelligence }), true);
});

test('explicitly unsupported ETF and foreign instruments hide Earnings', () => {
  assert.equal(isEarningsSupported({ earnings_eligibility: { eligible: false, security_type: 'etf' } }), false);
  assert.equal(isEarningsSupported({ earnings_eligible: false, security_type: 'foreign_equity' }), false);
});

test('complete existing ticker payloads stay eligible', () => {
  assert.equal(isEarningsSupported(complete), true);
});

test('switching modal tabs cannot create a second ticker-detail request path', () => {
  const source = readFileSync(new URL('./StockDetailModal.tsx', import.meta.url), 'utf8');
  assert.equal((source.match(/fetch\(`\/api\/watchlist\/ticker-detail\//g) ?? []).length, 1);
  const queryBlock = source.slice(source.indexOf("queryKey: ['ticker-detail'"), source.indexOf('const confluenceRow'));
  assert.equal(queryBlock.includes('activeTab'), false);
});
