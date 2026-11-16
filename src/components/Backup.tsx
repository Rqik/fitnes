import { Download, ShieldCheck, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { localDate } from '../domain/dates';
import { type Journal } from '../domain/journal';
import { downloadBackup, readBackup } from '../storage/journalStore';

export function Backup({ journal, onRestore }: { journal: Journal; onRestore: (backup: Journal) => void }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [isReading, setIsReading] = useState(false);
  const [error, setError] = useState('');
  return (
    <section className="panel backup-panel" aria-labelledby="backup-heading">
      <div className="panel-heading">
        <div>
          <h2 id="backup-heading">Резервная копия</h2>
          <p className="muted">JSON-файл содержит историю замеров, профиль и цели.</p>
        </div>
        <span className="metric-icon metric-icon--green"><ShieldCheck size={20} aria-hidden="true" /></span>
      </div>
      <div className="panel-body form-stack">
        <div className="toolbar">
          <button type="button" className="button button--primary" onClick={() => downloadBackup(journal, localDate())}>
            <Download size={18} aria-hidden="true" /> Скачать копию
          </button>
          <button type="button" className="button button--secondary" disabled={isReading} onClick={() => fileInput.current?.click()}>
            <Upload size={18} aria-hidden="true" /> {isReading ? 'Проверяем файл…' : 'Загрузить копию'}
          </button>
          <input
            ref={fileInput}
            type="file"
            accept=".json,application/json"
            aria-label="Файл резервной копии"
            hidden
            onChange={async (event) => {
              const input = event.currentTarget;
              const file = input.files?.[0];
              input.value = '';
              if (!file) return;
              setError('');
              setIsReading(true);
              try {
                const backup = await readBackup(file);
                onRestore(backup);
              } catch (failure) {
                setError(failure instanceof Error ? failure.message : 'Не удалось проверить файл.');
              } finally {
                setIsReading(false);
              }
            }}
          />
        </div>
        {error ? <p className="message message--error" role="alert">{error}</p> : null}
        <p className="muted">Сохраните копию, если меняете устройство, браузер или адрес приложения.</p>
      </div>
    </section>
  );
}
