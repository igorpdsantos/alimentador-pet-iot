import { openDB } from 'idb';
import { describe, expect, it } from 'vitest';
import { fixture } from '../test/fixtures';
import type { FeedRecord } from '../protocol/schemas';
import * as db from './history';

describe('histórico local', () => {
  it('grava, deduplica por seq e lembra o último seq', async () => {
    await db.openHistory('pf-test01');
    const items = (fixture('resp_history_feeds.json') as { data: { items: FeedRecord[] } }).data.items;
    await db.putRecords('feeds', items);
    await db.putRecords('feeds', items);
    expect(await db.feedsSince(0)).toHaveLength(2);
    expect(await db.feedsSince(1760370000)).toHaveLength(1);
    expect(await db.lastSeq('feeds')).toBe(0);
    await db.setLastSeq('feeds', 124);
    expect(await db.lastSeq('feeds')).toBe(124);
    await db.deleteHistory('pf-test01');
    await db.openHistory('pf-test01');
    expect(await db.feedsSince(0)).toHaveLength(0);
  });

  it('esvazia o banco mesmo com outra conexão aberta (o app em outra aba)', async () => {
    const other = await openDB('alimentador-pf-test02', 1, {
      upgrade(d) {
        d.createObjectStore('feeds', { keyPath: 'seq' }).createIndex('ts', 'ts');
        d.createObjectStore('consumption', { keyPath: 'seq' }).createIndex('ts', 'ts');
        d.createObjectStore('meta');
      },
    });
    await db.openHistory('pf-test02');
    const items = (fixture('resp_history_feeds.json') as { data: { items: FeedRecord[] } }).data.items;
    await db.putRecords('feeds', items);
    await db.setLastSeq('feeds', 124);
    await db.clearHistory();
    expect(await db.feedsSince(0)).toHaveLength(0);
    expect(await db.lastSeq('feeds')).toBe(0);
    other.close();
  });
});
