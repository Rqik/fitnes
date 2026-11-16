import { Chart, LineController, LineElement, LinearScale, PointElement, Tooltip } from 'chart.js';
import { useEffect, useRef } from 'react';
import { calendarDay, formatAxisDay, formatDate } from '../domain/dates';
import { formatValue, seriesLabels, type SeriesMetric } from '../domain/metrics';
import { type Point } from '../domain/statistics';

Chart.register(LineController, LineElement, LinearScale, PointElement, Tooltip);

const accent = '#36556e';
const axisTicks = {
  color: '#526171',
  font: { family: 'Consolas, ui-monospace, monospace', size: 11 },
};

export default function LineChart({ points, metric }: { points: readonly Point[]; metric: SeriesMetric }) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const first = points[0];
    const last = points.at(-1);
    if (!canvas.current || !first || !last) return;
    const xMin = calendarDay(first.date);
    const xMax = calendarDay(last.date);
    const xPadding = Math.max(1, (xMax - xMin) * 0.035);
    const lastIndex = points.length - 1;
    const showYear = first.date.slice(0, 4) !== last.date.slice(0, 4);
    const unit = seriesLabels[metric].unit;

    const chart = new Chart(canvas.current, {
      type: 'line',
      data: {
        datasets: [{
          data: points.map((point) => ({ x: calendarDay(point.date), y: point.value })),
          borderColor: accent,
          borderWidth: 2,
          pointBorderColor: accent,
          pointBackgroundColor: ({ dataIndex }) => dataIndex === lastIndex ? '#fff' : accent,
          pointBorderWidth: ({ dataIndex }) => dataIndex === lastIndex ? 2 : 0,
          pointRadius: ({ dataIndex }) => dataIndex === lastIndex ? 5 : points.length > 45 ? 0 : 2.5,
          pointHoverRadius: 6,
          pointHitRadius: 12,
          tension: 0,
        }],
      },
      options: {
        animation: false,
        maintainAspectRatio: false,
        parsing: false,
        normalized: true,
        interaction: { mode: 'nearest', intersect: false, axis: 'x' },
        scales: {
          x: {
            type: 'linear',
            min: xMin - xPadding,
            max: xMax + xPadding,
            grid: { drawOnChartArea: false, drawTicks: false },
            border: { color: '#d6dee6' },
            ticks: {
              ...axisTicks,
              maxTicksLimit: 6,
              includeBounds: false,
              precision: 0,
              maxRotation: 0,
              padding: 8,
              callback: (day) => formatAxisDay(Number(day), showYear),
            },
          },
          y: {
            grace: '12%',
            grid: { color: '#e4ebf1', drawTicks: false },
            border: { display: false },
            ticks: { ...axisTicks, maxTicksLimit: 5, padding: 8, callback: (value) => formatValue(Number(value), metric) },
          },
        },
        plugins: {
          tooltip: {
            callbacks: {
              title: (items) => {
                const point = points[items[0]?.dataIndex ?? -1];
                return point ? formatDate(point.date) : '';
              },
              label: (item) => `${formatValue(item.parsed.y ?? 0, metric)}${unit ? ` ${unit}` : ''}`,
            },
          },
        },
      },
    });
    return () => chart.destroy();
  }, [points, metric]);

  return <canvas ref={canvas} aria-hidden="true" />;
}
