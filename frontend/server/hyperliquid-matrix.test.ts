import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeHyperliquidMatrixTabs } from './hyperliquid-matrix';

const EQUITIES = [
  'CRDO', 'VST', 'TER', 'SOFI', 'SMCI', 'AVGO', 'AAOI', 'IREN',
  'NBIS', 'CRWD', 'RDDT', 'UNITREE', 'NET',
];

test('moves known equity markets out of Crypto without changing row metrics', () => {
  const assets = EQUITIES.map((coin, index) => ({
    coin,
    canonical_coin_id: `para:${coin}`,
    dex: 'hl-para',
    tags: ['perp', 'crypto'],
    score: index,
    agent_rank: index + 1,
    funding: 0.001 * index,
    open_interest_usd: 1000 + index,
    volume_24h_usd: 2000 + index,
    signal: 'long',
  }));
  const original = structuredClone(assets);
  const result = normalizeHyperliquidMatrixTabs({
    tabs: {
      stocks_etfs: { label: 'Stocks & ETFs', assets: [], count: 0 },
      crypto: { label: 'Crypto', assets, count: assets.length },
      commodities: { label: 'Commodities', assets: [], count: 0 },
      indices: { label: 'Indices', assets: [], count: 0 },
      pre_ipo: { label: 'Pre-IPO', assets: [], count: 0 },
      themes: { label: 'Themes', assets: [], count: 0 },
    },
  });

  assert.deepEqual(result.tabs?.stocks_etfs.assets, original);
  assert.equal(result.tabs?.stocks_etfs.count, EQUITIES.length);
  assert.equal(result.tabs?.crypto.count, 0);
});

test('deduplicates a true canonical duplicate by classification evidence', () => {
  const equity = {
    coin: 'AVGO',
    canonical_coin_id: 'xyz:AVGO',
    tags: ['perp', 'equity'],
    volume_24h_usd: 10,
    agent_score: 91,
  };
  const wronglyAnnotated = {
    coin: 'AVGO',
    canonical_coin_id: 'xyz:AVGO',
    tags: ['perp', 'crypto'],
    volume_24h_usd: 10_000_000,
    agent_score: 2,
  };
  const result = normalizeHyperliquidMatrixTabs({
    tabs: {
      stocks_etfs: { assets: [equity], count: 1 },
      crypto: { assets: [wronglyAnnotated], count: 1 },
    },
  });

  assert.deepEqual(result.tabs?.stocks_etfs.assets, [equity]);
  assert.equal(result.tabs?.crypto.count, 0);
});

test('preserves distinct canonical markets that share the same display symbol', () => {
  const xyz = {
    coin: 'IREN',
    display_name: 'IREN',
    canonical_coin_id: 'xyz:IREN',
    tags: ['perp', 'equity'],
  };
  const para = {
    coin: 'IREN',
    display_name: 'IREN',
    canonical_coin_id: 'para:IREN',
    tags: ['perp', 'crypto'],
  };
  const result = normalizeHyperliquidMatrixTabs({
    tabs: {
      stocks_etfs: { assets: [xyz], count: 1 },
      crypto: { assets: [para], count: 1 },
    },
    all_assets_count: 1,
  });

  assert.deepEqual(result.tabs?.stocks_etfs.assets, [xyz, para]);
  assert.equal(result.tabs?.stocks_etfs.count, 2);
  assert.equal(result.tabs?.crypto.count, 0);
  assert.equal(result.all_assets_count, 2);
});

test('collapses true canonical duplicates within one tab using evidence ranking', () => {
  const weak = {
    coin: 'IREN',
    canonical_coin_id: 'xyz:IREN',
    tags: ['perp'],
  };
  const strong = {
    coin: 'IREN',
    canonical_coin_id: 'XYZ:IREN',
    tags: ['perp', 'equity'],
  };
  const result = normalizeHyperliquidMatrixTabs({
    tabs: {
      stocks_etfs: { assets: [weak, strong], count: 2 },
      crypto: { assets: [], count: 0 },
    },
  });

  assert.deepEqual(result.tabs?.stocks_etfs.assets, [strong]);
  assert.equal(result.tabs?.stocks_etfs.count, 1);
  assert.equal(result.all_assets_count, 1);
});

test('preserves crypto and specialty tabs even when specialty rows carry equity tags', () => {
  const crypto = { coin: 'BTCD', canonical_coin_id: 'io:BTCD', tags: ['perp', 'crypto'] };
  const commodity = { coin: 'GOLD', canonical_coin_id: 'xyz:GOLD', tags: ['perp', 'equity'] };
  const index = { coin: 'SP500', canonical_coin_id: 'xyz:SP500', tags: ['perp', 'equity'] };
  const preIpo = { coin: 'CBRS', canonical_coin_id: 'xyz:CBRS', tags: ['perp', 'equity'] };
  const theme = { coin: 'DRAM', canonical_coin_id: 'xyz:DRAM', tags: ['perp', 'equity'] };
  const result = normalizeHyperliquidMatrixTabs({
    tabs: {
      stocks_etfs: { assets: [], count: 0 },
      crypto: { assets: [crypto], count: 1 },
      commodities: { assets: [commodity], count: 1 },
      indices: { assets: [index], count: 1 },
      pre_ipo: { assets: [preIpo], count: 1 },
      themes: { assets: [theme], count: 1 },
    },
  });

  assert.deepEqual(result.tabs?.crypto.assets, [crypto]);
  assert.deepEqual(result.tabs?.commodities.assets, [commodity]);
  assert.deepEqual(result.tabs?.indices.assets, [index]);
  assert.deepEqual(result.tabs?.pre_ipo.assets, [preIpo]);
  assert.deepEqual(result.tabs?.themes.assets, [theme]);
});

test('preserves distinct canonical markets and rows without a canonical identity', () => {
  const first = { coin: 'SAME', canonical_coin_id: 'one:SAME', score: 1 };
  const second = { coin: 'SAME', canonical_coin_id: 'two:SAME', score: 2 };
  const unknown = { coin: 'SAME', score: 3 };
  const result = normalizeHyperliquidMatrixTabs({
    tabs: {
      stocks_etfs: { assets: [first, second, unknown], count: 3 },
      crypto: { assets: [], count: 0 },
    },
  });

  const preserved = result.tabs?.stocks_etfs.assets ?? [];
  assert.equal(preserved.length, 3);
  assert.deepEqual(
    preserved.map(asset => asset.canonical_coin_id ?? null).sort(),
    [null, 'one:SAME', 'two:SAME'],
  );
  assert.ok(preserved.includes(first));
  assert.ok(preserved.includes(second));
  assert.ok(preserved.includes(unknown));
});

test('specialty rows win true canonical conflicts against equity-tagged duplicates', () => {
  for (const specialtyTab of ['commodities', 'indices', 'pre_ipo', 'themes']) {
    const specialty = {
      coin: 'CONFLICT',
      canonical_coin_id: `${specialtyTab}:CONFLICT`,
      tags: ['perp'],
      volume_24h_usd: 1,
    };
    const equity = {
      coin: 'CONFLICT',
      canonical_coin_id: `${specialtyTab}:CONFLICT`,
      tags: ['perp', 'equity'],
      volume_24h_usd: 99_000_000,
    };
    const result = normalizeHyperliquidMatrixTabs({
      tabs: {
        stocks_etfs: { assets: [equity], count: 1 },
        crypto: { assets: [], count: 0 },
        commodities: { assets: specialtyTab === 'commodities' ? [specialty] : [], count: 0 },
        indices: { assets: specialtyTab === 'indices' ? [specialty] : [], count: 0 },
        pre_ipo: { assets: specialtyTab === 'pre_ipo' ? [specialty] : [], count: 0 },
        themes: { assets: specialtyTab === 'themes' ? [specialty] : [], count: 0 },
      },
    });

    assert.deepEqual(result.tabs?.[specialtyTab].assets, [specialty]);
    assert.equal(result.tabs?.stocks_etfs.count, 0);
  }
});