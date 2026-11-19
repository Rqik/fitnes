import { ArrowRight } from 'lucide-react';
import { lazy, Suspense, useState } from 'react';
import { formatDate } from '../domain/dates';
import { type Entry, type Profile } from '../domain/journal';
import { focusOptions, formatChange, formatValue, metrics, seriesLabels, seriesMetrics, type Metric, type SeriesMetric } from '../domain/metrics';
import { bodySummaryMetrics, filterPeriod, periodChange, type Period, type Series } from '../domain/statistics';
import { HistoryTable } from './HistoryTable';
import ui from '../styles/ui.module.scss';
import styles from './Overview.module.scss';

const LineChart = lazy(() => import('./LineChart'));
const periods = [{ value: 30, label: '30 дней' }, { value: 90, label: '90 дней' }, { value: 'all', label: 'Всё время' }] as const;

function SummaryCards({ series, selected, onSelect }: { series: Series; selected: SeriesMetric; onSelect: (metric: Metric) => void }) {
  return (
    <section aria-label="Последние показатели" className={`${ui.panel} ${styles['overview__summary']}`}>
      {bodySummaryMetrics(series).map((metric) => {
        const point = series.get(metric)?.at(-1);
        const { label, unit } = metrics[metric];
        const readingId = `overview-reading-${metric}`;
        return (
          <button
            key={metric}
            type="button"
            className={styles['overview__metric']}
            aria-label={`График «${label}»`}
            aria-describedby={readingId}
            aria-pressed={selected === metric}
            onClick={() => onSelect(metric)}
          >
            <span className={styles['overview__label']}>{label}</span>
            <span className={styles['overview__reading']} id={readingId}>
              <span className={`${ui.measurement} ${styles['overview__value']}`}>{point ? formatValue(point.value) : '—'} <span>{unit}</span></span>
              <span className={styles['overview__date']}>{point ? <time dateTime={point.date} title={formatDate(point.date)}>{formatDate(point.date, 'short')}</time> : 'Нет замера'}</span>
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
    <section className={ui.panel} aria-labelledby="trend-title">
      <div className={`${ui['panel__heading']} ${ui['panel__heading--compact']}`}>
        <div>
          <h2 id="trend-title">Динамика</h2>
          {first && last && change !== undefined ? (
            <p className={styles['overview__trend-summary']}>
              <strong>{formatChange(change, metric)}</strong>
              <span>{formatDate(first.date, dateStyle)} — {formatDate(last.date, dateStyle)}</span>
            </p>
          ) : last ? <p className={ui.muted}>Один замер · {formatDate(last.date, 'short')}</p> : null}
        </div>
      </div>
      <div className={styles['overview__trend-controls']}>
        <div className={styles['overview__trend-metric']}>
          <label htmlFor="chart-metric">Показатель</label>
          <select id="chart-metric" name="chart-metric" value={metric} onChange={(event) => onMetricChange(event.currentTarget.value as SeriesMetric)}>
            {seriesMetrics.map((key) => <option key={key} value={key}>{seriesLabels[key].label}{seriesLabels[key].unit ? `, ${seriesLabels[key].unit}` : ''}</option>)}
          </select>
        </div>
        <fieldset className={`${ui['choice-group']} ${styles['overview__periods']}`}>
          <legend className={ui['sr-only']}>Период</legend>
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
          <div className={styles['overview__chart']}>
            <Suspense fallback={<p className={`${styles['overview__chart-loading']} ${ui.muted}`}>Загружаем график…</p>}>
              <LineChart points={points} metric={metric} />
            </Suspense>
          </div>
          <details className={`${ui.disclosure} ${styles['overview__chart-data']}`}>
            <summary>Данные графика</summary>
            <table className={ui.table}>
              <caption className={ui['sr-only']}>{label} за выбранный период</caption>
              <thead><tr><th scope="col">Дата</th><th scope="col">{label}{unit ? `, ${unit}` : ''}</th></tr></thead>
              <tbody>{points.map((point) => <tr key={point.date}><td>{formatDate(point.date)}</td><td>{formatValue(point.value, metric)}</td></tr>)}</tbody>
            </table>
          </details>
        </>
      ) : (
        <div className={styles['overview__chart-empty']}>
          <strong>{series.has(metric) ? 'За этот период нет замеров' : 'Здесь появится график'}</strong>
          <p className={ui.muted}>{series.has(metric) ? 'Выберите другой период' : 'Добавьте замер для выбранного показателя'}</p>
        </div>
      )}
    </section>
  );
}

function FocusPreview({ profile }: { profile: Profile }) {
  const focus = profile.focus ? focusOptions[profile.focus] : undefined;
  return (
    <section className={`${ui.panel} ${styles['overview__focus']}`}>
      <h2>Мой фокус</h2>
      {focus ? (
        <>
          <strong>{focus.label}</strong>
          <ul className={styles['overview__focus-metrics']}>
            {focus.metrics.map((metric) => <li key={metric}>{metrics[metric].label}</li>)}
          </ul>
        </>
      ) : <p className={ui.muted}>Выберите, какие показатели отслеживать</p>}
      <a href="#goals" className={ui['text-link']}>{focus ? 'Открыть цели' : 'Выбрать фокус'} <ArrowRight size={16} strokeWidth={1.5} aria-hidden="true" /></a>
    </section>
  );
}

export function Overview({ series, entries, profile }: { series: Series; entries: readonly Entry[]; profile: Profile }) {
  const [metric, setMetric] = useState<SeriesMetric>('weight');
  return (
    <div className={styles.overview}>
      <SummaryCards series={series} selected={metric} onSelect={(next) => {
        setMetric(next);
        document.getElementById('chart-metric')?.focus();
      }} />
      <div className={styles['overview__grid']}>
        <TrendPanel series={series} metric={metric} onMetricChange={setMetric} />
        <FocusPreview profile={profile} />
      </div>
      <section className={ui.panel} aria-labelledby="recent-title">
        <div className={`${ui['panel__heading']} ${ui['panel__heading--compact']}`}>
          <h2 id="recent-title">Последние замеры</h2>
          <a href="#history" className={ui['text-link']}>Вся история <ArrowRight size={16} strokeWidth={1.5} aria-hidden="true" /></a>
        </div>
        {entries.length > 0 ? <HistoryTable entries={entries.slice(-3).reverse()} compact /> : (
          <div className={styles['overview__history-empty']}>
            <p>Записей пока нет</p>
          </div>
        )}
      </section>
    </div>
  );
}
