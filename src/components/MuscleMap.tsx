import { List, Plus } from 'lucide-react';
import { useRef, useState } from 'react';
import { formatDate } from '../domain/dates';
import { type Journal } from '../domain/journal';
import { formatChange, formatValue, metrics, type Metric } from '../domain/metrics';
import { bodySummaryMetrics, distanceToGoal, type Series } from '../domain/statistics';
import ui from '../styles/ui.module.scss';
import { Dialog } from './Dialogs';
import { goalLabel } from './Goals';
import { MuscleFigure, type MuscleView, type ZoneStatus } from './MuscleFigure';
import styles from './MuscleMap.module.scss';

type Zone = { metric: Metric; label: string; measurement: string };

const shoulders: Zone = { metric: 'shoulders', label: 'Плечи', measurement: 'Обхват плечевого пояса' };
const forearms: Zone = { metric: 'forearm', label: 'Предплечья', measurement: 'Обхват предплечья' };
const calves: Zone = { metric: 'calf', label: 'Голени', measurement: 'Обхват голени' };
const zones: Record<MuscleView, readonly Zone[]> = {
  front: [
    shoulders,
    { metric: 'chest', label: 'Грудь', measurement: 'Обхват груди' },
    { metric: 'upperArm', label: 'Бицепсы', measurement: 'Обхват верхней части руки' },
    forearms,
    { metric: 'waist', label: 'Живот', measurement: 'Обхват талии' },
    { metric: 'thigh', label: 'Передняя часть бедра', measurement: 'Обхват бедра' },
    calves,
  ],
  back: [
    shoulders,
    { metric: 'chest', label: 'Верх спины', measurement: 'Обхват груди и спины' },
    { metric: 'upperArm', label: 'Трицепсы', measurement: 'Обхват верхней части руки' },
    forearms,
    { metric: 'waist', label: 'Поясница', measurement: 'Обхват талии' },
    { metric: 'hips', label: 'Ягодицы', measurement: 'Обхват по ягодицам' },
    { metric: 'thigh', label: 'Задняя часть бедра', measurement: 'Обхват бедра' },
    calves,
  ],
};

const statusLabels = {
  reached: 'Цель достигнута',
  outside: 'Вне цели',
  measured: 'Без цели',
  none: 'Нет замера',
} as const;
type ZoneStatuses = Partial<Record<Metric, ZoneStatus>>;
const legendOrder: readonly ZoneStatus[] = ['reached', 'outside', 'measured', 'none'];

function ZonePicker({ options, selected, statuses, onSelect, onClose }: {
  options: readonly Zone[];
  selected: Metric;
  statuses: ZoneStatuses;
  onSelect: (metric: Metric) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const selectedButton = useRef<HTMLButtonElement>(null);
  return (
    <Dialog dialogRef={dialog} initialFocus={selectedButton} title="Список зон" compact onClose={onClose}>
      <ul className={styles['zone-picker']}>
        {options.map(({ metric, label }) => {
          const status = statuses[metric] ?? 'none';
          const isSelected = metric === selected;
          return (
            <li key={metric}>
              <button type="button" className={styles['zone-picker__option']} ref={isSelected ? selectedButton : undefined} aria-pressed={isSelected} onClick={() => {
                onSelect(metric);
                dialog.current?.close();
              }}>
                <span>{label}</span><small className={styles['zone-picker__status']}><i className={styles['muscle-map__swatch']} data-status={status} aria-hidden="true" />{statusLabels[status]}</small>
              </button>
            </li>
          );
        })}
      </ul>
    </Dialog>
  );
}

function BodySummary({ series }: { series: Series }) {
  return (
    <section className={styles['body-summary']} aria-labelledby="body-summary-heading">
      <h2 id="body-summary-heading">Основные замеры</h2>
      <dl className={styles['body-summary__metrics']}>
        {bodySummaryMetrics(series).map((metric) => {
          const latest = series.get(metric)?.at(-1);
          const { label, unit } = metrics[metric];
          return (
            <div key={metric} className={styles['body-summary__metric']}>
              <dt>{label}</dt>
              <dd>
                <strong>{latest ? <>{formatValue(latest.value)} <span>{unit}</span></> : '—'}</strong>
                {latest ? <time dateTime={latest.date}>{formatDate(latest.date)}</time> : null}
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}

export function MuscleMap({ series, goals, onMeasure, onEditGoal }: {
  series: Series;
  goals: Journal['goals'];
  onMeasure: (metric: Metric) => void;
  onEditGoal: (metric: Metric) => void;
}) {
  const [view, setView] = useState<MuscleView>('front');
  const [selection, setSelection] = useState<Metric>(shoulders.metric);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const options = zones[view];
  const zone = options.find(({ metric }) => metric === selection) ?? shoulders;
  const points = series.get(zone.metric);
  const current = points?.at(-1);
  const previous = points?.at(-2);
  const goal = goals[zone.metric];
  const statuses: ZoneStatuses = {};
  for (const { metric } of options) {
    const latest = series.get(metric)?.at(-1);
    const target = goals[metric];
    statuses[metric] = !latest ? 'none' : !target ? 'measured' : distanceToGoal(target, latest.value) === 0 ? 'reached' : 'outside';
  }
  const status = statuses[zone.metric] ?? 'none';

  function changeView(next: MuscleView) {
    setView(next);
    setSelection((metric) => zones[next].some((option) => option.metric === metric) ? metric : shoulders.metric);
  }

  return (
    <div className={styles['muscle-map']}>
      <BodySummary series={series} />
      <section className={styles['muscle-map__plate']} aria-label="Расположение мышц">
        <div className={styles['muscle-map__toolbar']}>
          <fieldset className={styles['muscle-map__views']}>
            <legend className={ui['sr-only']}>Ракурс тела</legend>
            <label><input type="radio" name="muscle-view" checked={view === 'front'} onChange={() => changeView('front')} /><span>Спереди</span></label>
            <label><input type="radio" name="muscle-view" checked={view === 'back'} onChange={() => changeView('back')} /><span>Сзади</span></label>
          </fieldset>
          <button type="button" className={`${ui.button} ${styles['muscle-map__picker']}`} aria-haspopup="dialog" onClick={() => setIsPickerOpen(true)}>
            <List size={16} strokeWidth={1.7} aria-hidden="true" />Список зон
          </button>
        </div>
        <div className={styles['muscle-map__stage']}>
          <MuscleFigure view={view} selected={zone.metric} statuses={statuses} onSelect={setSelection} />
        </div>
        <ul className={styles['muscle-map__legend']} aria-label="Цвета карты">
          {legendOrder.map((item) => <li key={item}><i className={styles['muscle-map__swatch']} data-status={item} aria-hidden="true" />{statusLabels[item]}</li>)}
        </ul>
      </section>
      <section className={styles['muscle-reading']} aria-labelledby="muscle-reading-heading">
        <div className={styles['muscle-reading__summary']} aria-live="polite">
          <div className={styles['muscle-reading__label']}>
            <h2 id="muscle-reading-heading">{zone.label}</h2>
            <p className={ui.muted}>{zone.measurement}</p>
            <p className={styles['muscle-reading__status']} data-zone-status={status}><i className={styles['muscle-map__swatch']} data-status={status} aria-hidden="true" />{statusLabels[status]}</p>
          </div>
          {current ? (
            <div className={styles['muscle-reading__latest']}>
              <strong>{formatValue(current.value)} <span>см</span></strong>
              <p className={ui.muted}>Замер от <time dateTime={current.date}>{formatDate(current.date)}</time></p>
            </div>
          ) : null}
        </div>
        <dl className={styles['muscle-reading__rows']}>
          {current && previous ? <div><dt>К прошлому замеру</dt><dd>{formatChange(current.value - previous.value, zone.metric)}</dd></div> : null}
          {goal ? <div><dt>Личная цель</dt><dd>{goalLabel(goal, zone.metric)}</dd></div> : null}
        </dl>
        <div className={styles['muscle-reading__actions']}>
          <button type="button" className={`${ui.button} ${ui['button--primary']}`} onClick={() => onMeasure(zone.metric)}>
            <Plus size={18} strokeWidth={1.8} aria-hidden="true" />Добавить замер
          </button>
          <button type="button" className={`${ui.button} ${styles['muscle-reading__goal-button']}`} onClick={() => onEditGoal(zone.metric)}>{goal ? 'Изменить цель' : 'Задать цель'}</button>
        </div>
      </section>
      {isPickerOpen ? <ZonePicker options={options} selected={zone.metric} statuses={statuses} onSelect={setSelection} onClose={() => setIsPickerOpen(false)} /> : null}
    </div>
  );
}
