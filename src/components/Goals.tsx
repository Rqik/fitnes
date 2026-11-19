import { Crosshair, Pencil, Target } from 'lucide-react';
import { useId, useRef, useState, type FormEvent } from 'react';
import { formatDate } from '../domain/dates';
import { type Goal, type Journal } from '../domain/journal';
import { focusOptions, formatChange, formatValue, metricKeys, metrics, parseMetricValue, type Focus, type Metric } from '../domain/metrics';
import { distanceToGoal, goalTrend, type Point, type Series } from '../domain/statistics';
import { Dialog } from './Dialogs';
import { NumericField } from './Fields';
import ui from '../styles/ui.module.scss';
import styles from './Goals.module.scss';
import dialogStyles from './Dialogs.module.scss';

function FocusPanel({ focus, series, onSave }: { focus: Focus | null; series: Series; onSave: (focus: Focus | null) => Promise<void> }) {
  const [draft, setDraft] = useState(focus);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const active = focus ? focusOptions[focus] : null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    setError('');
    try {
      await onSave(draft);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Повторите попытку.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className={ui.panel}>
      <div className={ui['panel__heading']}>
        <div>
          <h2 id="focus-heading">Мой фокус</h2>
          <p className={ui.muted}>Выбранное направление выделяет показатели, за которыми стоит следить.</p>
        </div>
        <span className={`${ui['metric-icon']} ${ui['metric-icon--accent']}`}><Crosshair size={20} aria-hidden="true" /></span>
      </div>
      <div className={`${ui['panel__body']} ${ui['form-layout']}`}>
        <form method="post" className={ui['form-layout']} aria-labelledby="focus-heading" onSubmit={submit}>
          <fieldset className={`${ui['choice-group']} ${styles['goals__options']}`}>
            <legend className={ui['sr-only']}>Направление</legend>
            {Object.entries(focusOptions).map(([key, option]) => (
              <label key={key}><input type="radio" name="focus" value={key} checked={draft === key} onChange={() => setDraft(key as Focus)} /><span>{option.label}</span></label>
            ))}
            <label><input type="radio" name="focus" value="" checked={draft === null} onChange={() => setDraft(null)} /><span>Без фокуса</span></label>
          </fieldset>
          <button type="submit" className={`${ui.button} ${ui['button--secondary']} ${ui['button--fit']}`} disabled={isSaving || draft === focus}>Сохранить фокус</button>
          {error ? <p className={`${ui.message} ${ui['message--error']}`} role="alert">{error}</p> : null}
        </form>
        {active ? (
          <ul className={styles['goals__readings']}>
            {active.metrics.map((metric) => {
              const points = series.get(metric);
              const current = points?.at(-1);
              const previous = points?.at(-2);
              return (
                <li key={metric}>
                  <span>{metrics[metric].label}</span>
                  <strong>{current ? `${formatValue(current.value)} ${metrics[metric].unit}` : 'Добавьте замер'}</strong>
                  {current && previous ? <small>За последний замер {formatChange(current.value - previous.value, metric)}</small> : null}
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </section>
  );
}

export function goalLabel(goal: Goal, metric: Metric) {
  const unit = metrics[metric].unit;
  if (goal.kind === 'range') return `${formatValue(goal.min)}–${formatValue(goal.max)} ${unit}`;
  return `${goal.kind === 'min' ? 'От' : 'До'} ${formatValue(goal.target)} ${unit}`;
}

function goalStatus(goal: Goal, point: Point, metric: Metric) {
  const distance = distanceToGoal(goal, point.value);
  if (distance === 0) return 'Цель достигнута';
  const unit = metric === 'muscleShare' ? 'п. п.' : metrics[metric].unit;
  return `${distance > 0 ? 'Прибавить' : 'Снизить на'} ${formatValue(Math.abs(distance))} ${unit}`;
}

function GoalFields({ metric, goal, labelledBy, onSave }: {
  metric: Metric;
  goal?: Goal;
  labelledBy: string;
  onSave: (goal: Goal | undefined) => Promise<void>;
}) {
  const [kind, setKind] = useState<Goal['kind']>(goal?.kind ?? 'min');
  const [target, setTarget] = useState(String(goal && goal.kind !== 'range' ? goal.target : '').replace('.', ','));
  const [min, setMin] = useState(String(goal?.kind === 'range' ? goal.min : '').replace('.', ','));
  const [max, setMax] = useState(String(goal?.kind === 'range' ? goal.max : '').replace('.', ','));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  async function save(next?: Goal) {
    if (isSaving) return;
    setIsSaving(true);
    setError('');
    try {
      await onSave(next);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Повторите попытку.');
    } finally {
      setIsSaving(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (kind === 'range') {
      const lower = parseMetricValue(metric, min);
      const upper = parseMetricValue(metric, max);
      if (typeof lower !== 'number' || typeof upper !== 'number' || lower > upper) {
        setError('Введите обе границы диапазона. Минимум должен быть меньше максимума или равен ему.');
        return;
      }
      void save({ kind, min: lower, max: upper });
    } else {
      const value = parseMetricValue(metric, target);
      if (typeof value !== 'number') {
        setError('Введите целевое значение.');
        return;
      }
      void save({ kind, target: value });
    }
  }

  return (
    <form method="post" className={ui['form-layout']} aria-labelledby={labelledBy} onSubmit={submit} onChange={() => setError('')}>
      <fieldset className={`${ui['choice-group']} ${styles['goals__options']}`}>
        <legend>Тип цели</legend>
        {([{ key: 'min', title: 'Минимум' }, { key: 'max', title: 'Максимум' }, { key: 'range', title: 'Диапазон' }] as const).map(({ key, title }) => (
          <label key={key}><input type="radio" name="goal-type" value={key} checked={kind === key} onChange={() => setKind(key)} /><span>{title}</span></label>
        ))}
      </fieldset>
      {kind === 'range' ? (
        <div className={ui['form-layout__grid']}>
          <NumericField metric={metric} name="target-min" label="От" value={min} required onChange={setMin} />
          <NumericField metric={metric} name="target-max" label="До" value={max} required onChange={setMax} />
        </div>
      ) : <NumericField metric={metric} name="target" label="Целевое значение" value={target} required onChange={setTarget} />}
      {error ? <p className={`${ui.message} ${ui['message--error']}`} role="alert">{error}</p> : null}
      <div className={ui.toolbar}>
        <button type="submit" className={`${ui.button} ${ui['button--primary']}`} disabled={isSaving}>Сохранить цель</button>
        {goal ? <button type="button" className={`${ui.button} ${ui['button--secondary']} ${ui['button--delete']}`} disabled={isSaving} onClick={() => void save()}>Удалить цель</button> : null}
      </div>
    </form>
  );
}

export function GoalEditorDialog({ metric, goal, onSave, onClose }: {
  metric: Metric;
  goal?: Goal;
  onSave: (goal: Goal | undefined) => Promise<void>;
  onClose: () => void;
}) {
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const intro = useRef<HTMLParagraphElement>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function save(next: Goal | undefined) {
    setIsSaving(true);
    try {
      await onSave(next);
      dialog.current?.close();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog dialogRef={dialog} initialFocus={intro} title={goal ? 'Изменить цель' : 'Задать цель'} compact onClose={onClose} onRequestClose={() => !isSaving}>
      <div className={`${dialogStyles['dialog__body']} ${ui['form-layout']}`}>
        <p className={ui.muted} id={id} ref={intro} tabIndex={-1}>{metrics[metric].label}</p>
        <GoalFields metric={metric} goal={goal} labelledBy={id} onSave={save} />
      </div>
    </Dialog>
  );
}

export function Goals({ journal, series, onSaveFocus, onSaveGoal }: {
  journal: Journal;
  series: Series;
  onSaveFocus: (focus: Focus | null) => Promise<void>;
  onSaveGoal: (metric: Metric, goal: Goal | undefined) => Promise<void>;
}) {
  const [metric, setMetric] = useState<Metric>('weight');
  const { goals, profile } = journal;
  const saved = metricKeys.filter((key) => goals[key]);

  return (
    <div className={ui['page-stack']}>
      <FocusPanel key={profile.focus ?? 'none'} focus={profile.focus} series={series} onSave={onSaveFocus} />
      <div className={styles['goals__grid']}>
        <section className={`${ui.panel} ${styles['goals__list']}`}>
          <div className={ui['panel__heading']}><h2>Мои цели</h2><span className={`${ui['metric-icon']} ${ui['metric-icon--sand']}`}><Target size={20} aria-hidden="true" /></span></div>
          {saved.length === 0 ? <p className={`${ui['panel__body']} ${ui.muted}`}>Целей пока нет. Выберите показатель и задайте значение.</p> : (
            <ul>
              {saved.map((key) => {
                const goal = goals[key];
                if (!goal) return null;
                const points = series.get(key) ?? [];
                const current = points.at(-1);
                const trend = goalTrend(goal, points);
                const status = current ? goalStatus(goal, current, key) : 'Добавьте замер';
                return (
                  <li key={key}>
                    <div>
                      <h3>{metrics[key].label}</h3>
                      <p className={ui.muted}>{goalLabel(goal, key)}{current ? ` · Сейчас ${formatValue(current.value)} ${metrics[key].unit}` : ''}</p>
                      <p><strong>{status}</strong>{current ? <span className={ui.muted}> · {formatDate(current.date, 'short')}</span> : null}</p>
                      {trend !== undefined ? <small className={ui.muted}>{trend > 0 ? 'Последний замер приблизил к цели' : trend < 0 ? 'Последний замер увеличил расстояние до цели' : 'Расстояние до цели без изменений'}</small> : null}
                    </div>
                    <button type="button" className={`${ui.button} ${ui['button--icon']}`} aria-label={`Редактировать цель «${metrics[key].label}»`} onClick={() => {
                      setMetric(key);
                      document.getElementById('goal-metric')?.focus();
                    }}><Pencil size={17} aria-hidden="true" /></button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
        <section className={ui.panel}>
          <div className={ui['panel__heading']}><h2 id="goal-editor-heading">Настроить цель</h2></div>
          <div className={`${ui['panel__body']} ${ui['form-layout']}`}>
            <div className={ui.field}>
              <label htmlFor="goal-metric">Показатель</label>
              <select id="goal-metric" name="goal-metric" value={metric} onChange={(event) => setMetric(event.currentTarget.value as Metric)}>
                {metricKeys.map((key) => <option key={key} value={key}>{metrics[key].label}, {metrics[key].unit}</option>)}
              </select>
            </div>
            <GoalFields key={`${metric}-${JSON.stringify(goals[metric])}`} metric={metric} goal={goals[metric]} labelledBy="goal-editor-heading" onSave={(goal) => onSaveGoal(metric, goal)} />
          </div>
        </section>
      </div>
    </div>
  );
}
