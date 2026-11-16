import { ArrowRight } from 'lucide-react';
import { lazy, Suspense, useState } from 'react';
import { formatDate } from '../domain/dates';
import { type Entry, type Profile } from '../domain/journal';
import { focusOptions, formatChange, formatValue, metrics, seriesLabels, seriesMetrics, type Metric, type SeriesMetric } from '../domain/metrics';
import { filterPeriod, periodChange, type Period, type Series } from '../domain/statistics';
import { HistoryTable } from './HistoryTable';

const LineChart = lazy(() => import('./LineChart'));
const periods = [{ value: 30, label: '30 дней' }, { value: 90, label: '90 дней' }, { value: 'all', label: 'Всё время' }] as const;

function SummaryCards({ series, selected, onSelect }: { series: Series; selected: SeriesMetric; onSelect: (metric: Metric) => void }) {
  const muscleMetric = series.has('muscleMass') || !series.has('muscleShare') ? 'muscleMass' : 'muscleShare';
  const cards: Metric[] = ['weight', 'height', muscleMetric, 'waist'];

  return (
    <section aria-label="Последние показатели" className="panel summary-grid">
      {cards.map((metric) => {
        const point = series.get(metric)?.at(-1);
        const { label, unit } = metrics[metric];
        const readingId = `overview-reading-${metric}`;
        return (
          <button
            key={metric}
            type="button"
            className="summary-metric"
            aria-label={`График «${label}»`}
            aria-describedby={readingId}
            aria-pressed={selected === metric}
            onClick={() => onSelect(metric)}
          >
            <span className="summary-label">{label}</span>
            <span className="summary-reading" id={readingId}>
              <span className="summary-value">{point ? formatValue(point.value) : '—'} <span>{unit}</span></span>
              <span className="summary-date">{point ? <time dateTime={point.date} title={formatDate(point.date)}>{formatDate(point.date, 'short')}</time> : 'Нет замера'}</span>
            </span>
          </button>
        );
      })}
    </section>
  );
}

function TrendPanel({ series, metric, onMetricChange }: { series: Series; metric: SeriesMetric; onMetricChange: (metric: SeriesMetric) => void }) {
  const [period, setPeriod] = useState<Period>('all');
  const points = filterPeriod(series.get(metric) ?? [], period);
  const first = points[0];
  const last = points.at(-1);
  const change = periodChange(points);
  const { label, unit } = seriesLabels[metric];
  const dateStyle = first?.date.slice(0, 4) === last?.date.slice(0, 4) ? 'short' : 'normal';

  return (
    <section className="panel trend-panel" aria-labelledby="trend-title">
      <div className="panel-heading">
        <div>
          <h2 id="trend-title">Динамика</h2>
          {first && last && change !== undefined ? (
            <p className="trend-summary">
              <strong>{formatChange(change, metric)}</strong>
              <span>{formatDate(first.date, dateStyle)} — {formatDate(last.date, dateStyle)}</span>
            </p>
          ) : last ? <p className="muted">Один замер · {formatDate(last.date, 'short')}</p> : null}
        </div>
      </div>
      <div className="trend-controls">
        <div className="trend-metric">
          <label className="inline-label" htmlFor="chart-metric">Показатель</label>
          <select id="chart-metric" name="chart-metric" value={metric} onChange={(event) => onMetricChange(event.currentTarget.value as SeriesMetric)}>
            {seriesMetrics.map((key) => <option key={key} value={key}>{seriesLabels[key].label}{seriesLabels[key].unit ? `, ${seriesLabels[key].unit}` : ''}</option>)}
          </select>
        </div>
        <fieldset className="segmented">
          <legend className="sr-only">Период</legend>
          {periods.map((option) => (
            <label key={option.value}>
              <input type="radio" name="period" checked={period === option.value} onChange={() => setPeriod(option.value)} />
              <span>{option.label}</span>
            </label>
          ))}
        </fieldset>
      </div>
      {points.length > 0 ? (
        <>
          <div className="chart-frame">
            <Suspense fallback={<p className="chart-loading muted">Загружаем график…</p>}>
              <LineChart points={points} metric={metric} />
            </Suspense>
          </div>
          <details className="disclosure chart-data">
            <summary>Данные графика</summary>
            <table className="simple-table">
              <caption className="sr-only">{label} за выбранный период</caption>
              <thead><tr><th scope="col">Дата</th><th scope="col">{label}{unit ? `, ${unit}` : ''}</th></tr></thead>
              <tbody>{points.map((point) => <tr key={point.date}><td>{formatDate(point.date)}</td><td>{formatValue(point.value, metric)}</td></tr>)}</tbody>
            </table>
          </details>
        </>
      ) : (
        <div className="chart-empty">
          <strong>{series.has(metric) ? 'За этот период нет замеров' : 'Здесь появится график'}</strong>
          <p className="muted">{series.has(metric) ? 'Выберите другой период' : 'Добавьте замер для выбранного показателя'}</p>
        </div>
      )}
    </section>
  );
}

function FocusPreview({ profile }: { profile: Profile }) {
  const focus = profile.focus ? focusOptions[profile.focus] : undefined;
  return (
    <section className="panel focus-preview">
      <h2>Мой фокус</h2>
      {focus ? (
        <>
          <strong>{focus.label}</strong>
          <ul className="focus-metrics">
            {focus.metrics.map((metric) => <li key={metric}>{metrics[metric].label}</li>)}
          </ul>
        </>
      ) : <p className="muted">Выберите, какие показатели отслеживать</p>}
      <a href="#goals" className="text-link">{focus ? 'Открыть цели' : 'Выбрать фокус'} <ArrowRight size={16} strokeWidth={1.5} aria-hidden="true" /></a>
    </section>
  );
}

export function Overview({ series, entries, profile }: { series: Series; entries: readonly Entry[]; profile: Profile }) {
  const [metric, setMetric] = useState<SeriesMetric>('weight');
  return (
    <div className="page-stack overview-page">
      <SummaryCards series={series} selected={metric} onSelect={(next) => {
        setMetric(next);
        document.getElementById('chart-metric')?.focus();
      }} />
      <div className="overview-grid">
        <TrendPanel series={series} metric={metric} onMetricChange={setMetric} />
        <FocusPreview profile={profile} />
      </div>
      <section className="panel" aria-labelledby="recent-title">
        <div className="panel-heading">
          <h2 id="recent-title">Последние замеры</h2>
          <a href="#history" className="text-link">Вся история <ArrowRight size={16} strokeWidth={1.5} aria-hidden="true" /></a>
        </div>
        {entries.length > 0 ? <HistoryTable entries={entries.slice(-3).reverse()} /> : (
          <div className="empty-row">
            <p>Записей пока нет</p>
          </div>
        )}
      </section>
    </div>
  );
}
