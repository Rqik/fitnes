import { useId, useRef, useState, type FormEvent } from 'react';
import { isCalendarDate, localDate } from '../domain/dates';
import { type Entry } from '../domain/journal';
import { metrics, parseMetricValue, type Metric } from '../domain/metrics';
import { Dialog } from './Dialogs';
import { NumericField } from './Fields';
import ui from '../styles/ui.module.scss';
import dialogStyles from './Dialogs.module.scss';

function formatInput(value: number | undefined) {
  return String(value ?? '').replace('.', ',');
}

export function MuscleMeasurementDialog({ metric, entries, onSave, onClose }: {
  metric: Metric;
  entries: readonly Entry[];
  onSave: (date: string, value: number, previousValue: number | undefined) => Promise<void>;
  onClose: () => void;
}) {
  const id = useId();
  const today = localDate();
  const [date, setDate] = useState(localDate);
  const [draft, setDraft] = useState<{ text: string; previousValue: number | undefined } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDiscardVisible, setIsDiscardVisible] = useState(false);
  const [error, setError] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const dateInput = useRef<HTMLInputElement>(null);
  const discardButton = useRef<HTMLButtonElement>(null);

  const savedValue = entries.find((entry) => entry.date === date)?.values[metric];
  const previousValue = draft ? draft.previousValue : savedValue;
  const text = draft?.text ?? formatInput(savedValue);
  const isDirty = text !== formatInput(previousValue);

  function canDismiss() {
    if (isSaving) return false;
    if (!isDirty) return true;
    setIsDiscardVisible(true);
    requestAnimationFrame(() => discardButton.current?.focus());
    return false;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving) return;
    if (!isCalendarDate(date) || date > today) {
      setError('Укажите сегодняшнюю или более раннюю дату.');
      return;
    }
    const value = parseMetricValue(metric, text);
    if (typeof value !== 'number') {
      setError('Проверьте значение замера.');
      return;
    }

    setError('');
    setIsSaving(true);
    try {
      await onSave(date, value, previousValue);
      dialog.current?.close();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Повторите попытку.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog dialogRef={dialog} initialFocus={dateInput} title={`Замер · ${metrics[metric].label}`} compact onClose={onClose} onRequestClose={canDismiss}>
      <form method="post" className={`${dialogStyles['dialog__body']} ${ui['form-layout']}`} onSubmit={handleSubmit}>
        <fieldset className={ui['form-layout']} disabled={isSaving}>
          <div className={`${ui.field} ${ui['field--date']}`}>
            <label htmlFor={id}>Дата</label>
            <input
              id={id}
              name="date"
              type="date"
              max={today}
              required
              value={date}
              ref={dateInput}
              onChange={(event) => {
                setDate(event.currentTarget.value);
                setDraft(null);
                setError('');
                setIsDiscardVisible(false);
              }}
            />
          </div>
          <NumericField
            key={date}
            metric={metric}
            value={text}
            required
            onChange={(nextText) => {
              setDraft({ text: nextText, previousValue });
              setError('');
              setIsDiscardVisible(false);
            }}
          />
        </fieldset>
        {error ? <p className={`${ui.message} ${ui['message--error']}`} role="alert">{error}</p> : null}
        {isDiscardVisible ? (
          <div className={`${ui.message} ${ui['message--discard']}`}>
            <span id={`${id}-discard`}>Замер содержит несохранённые изменения.</span>
            <button type="button" className={`${ui.button} ${ui['button--danger']}`} ref={discardButton} aria-describedby={`${id}-discard`} disabled={isSaving} onClick={() => dialog.current?.close()}>
              Не сохранять
            </button>
          </div>
        ) : null}
        <div className={dialogStyles['dialog__actions']}>
          <button type="button" className={`${ui.button} ${ui['button--secondary']}`} disabled={isSaving} onClick={() => { if (canDismiss()) dialog.current?.close(); }}>Отмена</button>
          <button type="submit" className={`${ui.button} ${ui['button--primary']}`} disabled={isSaving}>{isSaving ? 'Сохраняем…' : 'Сохранить замер'}</button>
        </div>
      </form>
    </Dialog>
  );
}
