import { useCallback, useEffect, useState } from 'react';
import { ConflictError, journalStore, type Snapshot } from './journalStore';

export function useJournal() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loadError, setLoadError] = useState(false);

  const accept = useCallback((next: Snapshot) => {
    setSnapshot((current) => !current || next.revision > current.revision ? next : current);
    setLoadError(false);
  }, []);

  const reload = useCallback(async () => {
    try {
      accept(await journalStore.load());
    } catch {
      setLoadError(true);
    }
  }, [accept]);

  useEffect(() => {
    void reload();
    const handleFocus = () => void reload();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [reload]);

  async function save(change: Parameters<typeof journalStore.update>[0]) {
    try {
      accept(await journalStore.update(change));
    } catch (error) {
      if (error instanceof ConflictError) {
        await reload();
        throw error;
      }
      throw new Error('Не удалось сохранить изменения. Проверьте, доступно ли хранилище браузера, и повторите попытку.');
    }
  }

  return { snapshot, loadError, reload, save };
}
