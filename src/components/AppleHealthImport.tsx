import { Upload } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { mergeAppleHealthMeasurements, type AppleHealthMeasurement } from '../domain/appleHealth';
import type { Entry } from '../domain/journal';
import type { AppleHealthWorkerResult } from '../import/appleHealth.worker';
import { ConflictError } from '../storage/journalStore';
import ui from '../styles/ui.module.scss';
import styles from './AppleHealthImport.module.scss';

type ReadState =
  | { kind: 'idle' }
  | { kind: 'reading' }
  | { kind: 'error'; message: string }
  | { kind: 'preview'; measurements: AppleHealthMeasurement[]; revision: number };

const readError = 'Не удалось прочитать файл Apple Health. Попробуйте экспортировать данные заново.';
const changedNotice = 'Дневник обновился. Проверьте новый предпросмотр и подтвердите импорт ещё раз.';

export function AppleHealthImport({ entries, revision, onImport }: {
  entries: Entry[];
  revision: number;
  onImport: (measurements: readonly AppleHealthMeasurement[], revision: number) => Promise<void>;
}) {
  const input = useRef<HTMLInputElement>(null);
  const chooseFile = useRef<HTMLButtonElement>(null);
  const worker = useRef<Worker | null>(null);
  const [state, setState] = useState<ReadState>({ kind: 'idle' });
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const counts = useMemo(() => state.kind === 'preview'
    ? mergeAppleHealthMeasurements(entries, state.measurements).counts
    : null, [entries, state]);

  useEffect(() => () => worker.current?.terminate(), []);

  function stopReading() {
    worker.current?.terminate();
    worker.current = null;
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file || isSaving) return;
    stopReading();
    setSaveError('');
    setState({ kind: 'reading' });
    try {
      const reader = new Worker(new URL('../import/appleHealth.worker.ts', import.meta.url), { type: 'module' });
      worker.current = reader;
      reader.onmessage = ({ data }: MessageEvent<AppleHealthWorkerResult>) => {
        if (worker.current !== reader) return;
        stopReading();
        setState(data.kind === 'ready'
          ? { kind: 'preview', measurements: data.measurements, revision }
          : data);
      };
      reader.onerror = () => {
        if (worker.current !== reader) return;
        stopReading();
        setState({ kind: 'error', message: readError });
      };
      reader.postMessage(file);
    } catch {
      stopReading();
      setState({ kind: 'error', message: readError });
    }
  }

  async function handleImport() {
    if (state.kind !== 'preview' || !counts?.added || isSaving) return;
    setIsSaving(true);
    setSaveError('');
    try {
      await onImport(state.measurements, revision);
      setState({ kind: 'idle' });
      window.requestAnimationFrame(() => chooseFile.current?.focus());
    } catch (error) {
      if (!(error instanceof ConflictError)) {
        setSaveError(error instanceof Error ? error.message : 'Не удалось сохранить замеры Apple Health.');
      }
    } finally {
      setIsSaving(false);
    }
  }

  function handleCancel() {
    stopReading();
    setSaveError('');
    setState({ kind: 'idle' });
    chooseFile.current?.focus();
  }

  return (
    <section className={`${ui.panel} ${styles['apple-health-import']}`} aria-labelledby="apple-health-heading">
      <div className={ui['panel__heading']}>
        <div>
          <h2 id="apple-health-heading">Импорт из Apple Health</h2>
          <p className={ui.muted}>Перенесите вес и рост из экспорта приложения «Здоровье» на iPhone. Файл обрабатывается в браузере.</p>
        </div>
      </div>
      <div className={`${ui['panel__body']} ${styles['apple-health-import__body']}`}>
        <div className={ui.toolbar}>
          <button ref={chooseFile} type="button" className={`${ui.button} ${ui['button--secondary']}`} disabled={isSaving} onClick={() => input.current?.click()}>
            <Upload size={18} aria-hidden="true" /> Выбрать XML или ZIP
          </button>
          {state.kind === 'reading' || state.kind === 'preview' ? (
            <button type="button" className={`${ui.button} ${ui['button--secondary']}`} disabled={isSaving} onClick={handleCancel}>Отменить импорт</button>
          ) : null}
        </div>
        <input ref={input} type="file" accept=".xml,.zip,application/xml,text/xml,application/zip,application/x-zip-compressed" aria-label="Файл Apple Health" hidden onChange={handleFileChange} />
        {state.kind === 'reading' ? <p role="status" className={ui.muted}>Читаем замеры…</p> : null}
        {state.kind === 'error' ? <p className={`${ui.message} ${ui['message--error']}`} role="alert">{state.message}</p> : null}
        {state.kind === 'preview' && counts ? (
          <div className={styles['apple-health-import__preview']}>
            <h3>Предпросмотр импорта</h3>
            <div aria-live="polite">
              {state.revision !== revision ? <p className={ui.message}>{changedNotice}</p> : null}
              <dl className={styles['apple-health-import__counts']}>
                <div><dt>Новые значения</dt><dd>{counts.added}</dd></div>
                <div><dt>Совпадения</dt><dd>{counts.matched}</dd></div>
                <div><dt>Конфликты</dt><dd>{counts.conflicts}</dd></div>
              </dl>
              <p className={ui.muted}>{state.measurements.length === 0 ? 'В файле нет подходящих записей веса и роста.' : 'При конфликте сохраняется значение из дневника.'}</p>
            </div>
            {saveError ? <p className={`${ui.message} ${ui['message--error']}`} role="alert">{saveError}</p> : null}
            {counts.added > 0 ? (
              <button type="button" className={`${ui.button} ${ui['button--primary']} ${styles['apple-health-import__confirm']}`} disabled={isSaving} onClick={() => void handleImport()}>
                {isSaving ? 'Сохраняем замеры…' : 'Импортировать замеры'}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
