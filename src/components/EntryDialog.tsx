import { useId, useRef, useState, type FormEvent } from 'react';
import { isCalendarDate, localDate } from '../domain/dates';
import { type Entry } from '../domain/journal';
import { metricKeys, metrics, parseMetricValue, type Metric, type Values } from '../domain/metrics';
import { Dialog } from './Dialogs';
import { NumericField } from './Fields';
import ui from '../styles/ui.module.scss';
import dialogStyles from './Dialogs.module.scss';

export function EntryDialog({ entry, entries, onSave, onEdit, onClose }: {
  entry?: Entry;
  entries: readonly Entry[];
  onSave: (date: string, values: Values, previous?: Entry) => Promise<void>;
  onEdit: (entry: Entry) => void;
  onClose: () => void;
}) {
  const id = useId();
  const today = localDate();
  const [date, setDate] = useState(entry?.date ?? today);
  const [draft, setDraft] = useState<Partial<Record<Metric, string>>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showDiscard, setShowDiscard] = useState(false);
  const [error, setError] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const dateInput = useRef<HTMLInputElement>(null);
  const discardButton = useRef<HTMLButtonElement>(null);
  const duplicate = entries.find((item) => item.date === date && item.date !== entry?.date);

  function initialValue(metric: Metric) {
    return String(entry?.values[metric] ?? '').replace('.', ',');
  }

  const isDirty = date !== (entry?.date ?? today) || metricKeys.some((key) => {
    const value = draft[key];
    return value !== undefined && value !== initialValue(key);
  });

  function canDismiss() {
    if (isSaving) return false;
    if (!isDirty) return true;
    setShowDiscard(true);
    requestAnimationFrame(() => discardButton.current?.focus());
    return false;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving) return;
    if (!isCalendarDate(date) || date > today) {
      setError('Укажите сегодняшнюю или более раннюю дату.');
      return;
    }
    if (duplicate) {
      setError('На эту дату уже есть замер.');
      return;
    }
    const values: Values = {};
    for (const metric of metricKeys) {
      const value = parseMetricValue(metric, draft[metric] ?? initialValue(metric));
      if (value === null) {
        setError(`Проверьте поле «${metrics[metric].label}».`);
        return;
      }
      if (value !== undefined) values[metric] = value;
    }
    if (Object.keys(values).length === 0) {
      setError('Заполните хотя бы один показатель.');
      return;
    }
    setError('');
    setIsSaving(true);
    try {
      await onSave(date, values, entry);
      dialog.current?.close();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Повторите попытку.');
    } finally {
      setIsSaving(false);
    }
  }

  function fields(group: 'body' | 'tape' | 'reference') {
    return metricKeys.filter((key) => metrics[key].group === group).map((key) => (
      <NumericField
        key={key}
        metric={key}
        value={draft[key] ?? initialValue(key)}
        onChange={(value) => {
          setDraft((current) => ({ ...current, [key]: value }));
          setError('');
        }}
      />
    ));
  }

  return (
    <Dialog dialogRef={dialog} initialFocus={dateInput} title={entry ? 'Редактировать замер' : 'Новый замер'} onClose={onClose} onRequestClose={canDismiss}>
      <form method="post" className={`${dialogStyles['dialog__body']} ${ui['form-layout']}`} onSubmit={submit}>
        <div className={`${ui.field} ${ui['field--date']}`}>
          <label htmlFor={id}>Дата <span className={ui.muted}>(обязательно)</span></label>
          <input
            id={id}
            name="date"
            type="date"
            max={today}
            required
            value={date}
            ref={dateInput}
            aria-invalid={Boolean(duplicate)}
            aria-describedby={duplicate ? `${id}-duplicate` : undefined}
            onChange={(event) => { setDate(event.currentTarget.value); setError(''); }}
          />
        </div>
        {duplicate ? (
          <div className={ui.message} id={`${id}-duplicate`}>
            <p>На эту дату уже есть замер.</p>
            {entry ? null : <button type="button" className={`${ui.button} ${ui['button--secondary']}`} onClick={() => onEdit(duplicate)}>Открыть существующий замер</button>}
          </div>
        ) : null}
        <fieldset>
          <legend>Основные показатели</legend>
          <div className={ui['form-layout__grid']}>{fields('body')}</div>
        </fieldset>
        <fieldset>
          <legend>Обхваты</legend>
          <div className={ui['form-layout__grid']}>{fields('tape')}</div>
        </fieldset>
        <details className={ui.disclosure} open={entry?.values.waistNhanes !== undefined || Boolean(draft.waistNhanes) ? true : undefined}>
          <summary>Дополнительный замер для NHANES</summary>
          {fields('reference')}
        </details>
        {error ? <p className={`${ui.message} ${ui['message--error']}`} role="alert">{error}</p> : null}
        {showDiscard ? (
          <div className={`${ui.message} ${ui['message--discard']}`} id={`${id}-discard`}>
            <span>Замер содержит несохранённые изменения.</span>
            <button type="button" className={`${ui.button} ${ui['button--danger']}`} ref={discardButton} aria-describedby={`${id}-discard`} disabled={isSaving} onClick={() => dialog.current?.close()}>Не сохранять</button>
          </div>
        ) : null}
        <div className={dialogStyles['dialog__actions']}>
          <button type="button" className={`${ui.button} ${ui['button--secondary']}`} disabled={isSaving} onClick={() => { if (canDismiss()) dialog.current?.close(); }}>Отмена</button>
          <button type="submit" className={`${ui.button} ${ui['button--primary']}`} disabled={isSaving || Boolean(duplicate)}>{isSaving ? 'Сохраняем…' : 'Сохранить замер'}</button>
        </div>
      </form>
    </Dialog>
  );
}
