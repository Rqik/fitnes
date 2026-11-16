import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { emptyJournal, parseJournal, type Journal } from '../domain/journal';

export type Snapshot = { revision: number; journal: Journal };
type Change = (current: Snapshot) => Journal;

interface JournalDatabase extends DBSchema {
  journal: { key: 'current'; value: Snapshot };
}

let database: Promise<IDBPDatabase<JournalDatabase>> | undefined;

function connect() {
  database ??= openDB<JournalDatabase>(`fitnes-journal:${import.meta.env.BASE_URL}`, 1, {
    upgrade(db) {
      db.createObjectStore('journal');
    },
    blocking(_currentVersion, _blockedVersion, event) {
      (event.target as IDBDatabase).close();
      database = undefined;
    },
    terminated() {
      database = undefined;
    },
  }).catch((error: unknown) => {
    database = undefined;
    throw error;
  });
  return database;
}

function decode(data: Snapshot | undefined): Snapshot {
  return data
    ? { revision: data.revision, journal: parseJournal(data.journal) }
    : { revision: 0, journal: emptyJournal() };
}

export class ConflictError extends Error {}

export const journalStore = {
  async load() {
    const db = await connect();
    return decode(await db.get('journal', 'current'));
  },

  async update(change: Change): Promise<Snapshot> {
    const db = await connect();
    const transaction = db.transaction('journal', 'readwrite');
    void transaction.done.catch(() => undefined);
    const current = decode(await transaction.store.get('current'));
    const journal = change(current);
    const next = { revision: current.revision + 1, journal };
    await Promise.all([transaction.store.put(next, 'current'), transaction.done]);
    return next;
  },
};

export function downloadBackup(journal: Journal, date: string) {
  const file = new Blob([JSON.stringify(journal, null, 2) + '\n'], { type: 'application/json' });
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = `fitnes-${date}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function readBackup(file: File) {
  let data: unknown;
  try {
    data = JSON.parse(await file.text());
  } catch {
    throw new Error('Файл не удалось прочитать как JSON.');
  }
  return parseJournal(data);
}
