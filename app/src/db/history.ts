// Cópia local do histórico (IndexedDB) para gráficos e uso offline. Um banco por alimentador.
import { openDB, type IDBPDatabase } from 'idb';
import type { ConsumptionRecord, FeedRecord } from '../protocol/schemas';

type Kind = 'feeds' | 'consumption';
let db: IDBPDatabase | null = null;
let dbName = '';

export async function openHistory(deviceId: string) {
  const name = `alimentador-${deviceId}`;
  if (db && dbName === name) return db;
  db?.close();
  db = await openDB(name, 1, {
    upgrade(d) {
      d.createObjectStore('feeds', { keyPath: 'seq' }).createIndex('ts', 'ts');
      d.createObjectStore('consumption', { keyPath: 'seq' }).createIndex('ts', 'ts');
      d.createObjectStore('meta');
    },
  });
  dbName = name;
  return db;
}

function need() {
  if (!db) throw new Error('histórico não aberto');
  return db;
}

export async function putRecords(kind: Kind, items: (FeedRecord | ConsumptionRecord)[]) {
  if (!items.length) return;
  const tx = need().transaction(kind, 'readwrite');
  await Promise.all([...items.map((i) => tx.store.put(i)), tx.done]);
}

export async function lastSeq(kind: Kind): Promise<number> {
  return ((await need().get('meta', `last_seq_${kind}`)) as number | undefined) ?? 0;
}

export async function setLastSeq(kind: Kind, seq: number) {
  await need().put('meta', seq, `last_seq_${kind}`);
}

export async function feedsSince(ts: number): Promise<FeedRecord[]> {
  return need().getAllFromIndex('feeds', 'ts', IDBKeyRange.lowerBound(ts)) as Promise<FeedRecord[]>;
}

export async function consumptionSince(ts: number): Promise<ConsumptionRecord[]> {
  return need().getAllFromIndex('consumption', 'ts', IDBKeyRange.lowerBound(ts)) as Promise<ConsumptionRecord[]>;
}

export async function deleteHistory(deviceId: string) {
  const name = `alimentador-${deviceId}`;
  if (dbName === name) {
    db?.close();
    db = null;
    dbName = '';
  }
  await new Promise<void>((resolve) => {
    const r = indexedDB.deleteDatabase(name);
    r.onsuccess = r.onerror = r.onblocked = () => resolve();
  });
}
