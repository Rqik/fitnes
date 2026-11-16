import { List, Plus } from 'lucide-react';
import { useRef, useState } from 'react';
import { formatDate } from '../domain/dates';
import { type Journal } from '../domain/journal';
import { formatChange, formatValue, type Metric } from '../domain/metrics';
import { distanceToGoal, type Series } from '../domain/statistics';
import { Dialog } from './Dialogs';
import { goalLabel } from './Goals';
import { MuscleFigure } from './MuscleFigure';

type View = 'front' | 'back';
type Zone = { metric: Metric; label: string; measurement: string };

const shoulders: Zone = { metric: 'shoulders', label: 'Плечи', measurement: 'Обхват плечевого пояса' };
const forearms: Zone = { metric: 'forearm', label: 'Предплечья', measurement: 'Обхват предплечья' };
const calves: Zone = { metric: 'calf', label: 'Голени', measurement: 'Обхват голени' };
const zones: Record<View, readonly Zone[]> = {
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
type ZoneStatus = keyof typeof statusLabels;
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
      <ul className="zone-list">
        {options.map(({ metric, label }) => {
          const status = statuses[metric] ?? 'none';
          const isSelected = metric === selected;
          return (
            <li key={metric}>
              <button type="button" ref={isSelected ? selectedButton : undefined} aria-pressed={isSelected} onClick={() => {
                onSelect(metric);
                dialog.current?.close();
              }}>
                <span>{label}</span><small><i className="zone-swatch" data-status={status} aria-hidden="true" />{statusLabels[status]}</small>
              </button>
            </li>
          );
        })}
      </ul>
    </Dialog>
  );
}

export function MuscleMap({ series, goals, onMeasure, onEditGoal }: {
  series: Series;
  goals: Journal['goals'];
  onMeasure: (metric: Metric) => void;
  onEditGoal: (metric: Metric) => void;
}) {
  const [view, setView] = useState<View>('front');
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

  return (
    <div className="muscle-map">
      <section className="muscle-map-figure" aria-label="Расположение мышц">
        <div className="muscle-map-toolbar">
          <fieldset className="muscle-views">
            <legend className="sr-only">Ракурс тела</legend>
            <label><input type="radio" name="muscle-view" checked={view === 'front'} onChange={() => setView('front')} /><span>Спереди</span></label>
            <label><input type="radio" name="muscle-view" checked={view === 'back'} onChange={() => setView('back')} /><span>Сзади</span></label>
          </fieldset>
          <button type="button" className="button muscle-picker" aria-haspopup="dialog" onClick={() => setIsPickerOpen(true)}>
            <List size={16} strokeWidth={1.7} aria-hidden="true" />Список зон
          </button>
        </div>
        <div className="muscle-stage">
          <MuscleFigure view={view} selected={zone.metric} statuses={statuses} onSelect={setSelection} />
        </div>
        <ul className="muscle-legend" aria-label="Цвета карты">
          {legendOrder.map((item) => <li key={item}><i className="zone-swatch" data-status={item} aria-hidden="true" />{statusLabels[item]}</li>)}
        </ul>
      </section>
      <section className="muscle-reading" aria-labelledby="muscle-reading-heading">
        <div className="muscle-reading-summary" aria-live="polite">
          <h2 id="muscle-reading-heading">{zone.label}</h2>
          <p className="muted">{zone.measurement}</p>
          <p className="muscle-reading-status" data-zone-status={status}><i className="zone-swatch" data-status={status} aria-hidden="true" />{statusLabels[status]}</p>
          {current ? (
            <div className="muscle-reading-latest">
              <strong>{formatValue(current.value)} <span>см</span></strong>
              <p className="muted">Замер от <time dateTime={current.date}>{formatDate(current.date)}</time></p>
            </div>
          ) : null}
        </div>
        <dl className="muscle-reading-rows">
          {current && previous ? <div><dt>К прошлому замеру</dt><dd>{formatChange(current.value - previous.value, zone.metric)}</dd></div> : null}
          {goal ? <div><dt>Личная цель</dt><dd>{goalLabel(goal, zone.metric)}</dd></div> : null}
        </dl>
        <div className="muscle-reading-actions">
          <button type="button" className="button button--primary" onClick={() => onMeasure(zone.metric)}>
            <Plus size={18} strokeWidth={1.8} aria-hidden="true" />Добавить замер
          </button>
          <button type="button" className="button muscle-goal-button" onClick={() => onEditGoal(zone.metric)}>{goal ? 'Изменить цель' : 'Задать цель'}</button>
        </div>
      </section>
      {isPickerOpen ? <ZonePicker options={options} selected={zone.metric} statuses={statuses} onSelect={setSelection} onClose={() => setIsPickerOpen(false)} /> : null}
    </div>
  );
}
