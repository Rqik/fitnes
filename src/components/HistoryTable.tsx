import { CalendarDays, Pencil, Trash2 } from 'lucide-react';
import { formatDate } from '../domain/dates';
import { type Entry } from '../domain/journal';
import { formatValue, metricKeys, metrics } from '../domain/metrics';
import ui from '../styles/ui.module.scss';
import styles from './HistoryTable.module.scss';

export function HistoryTable({ entries, compact, onEdit, onDelete }: {
  entries: readonly Entry[];
  compact?: boolean;
  onEdit?: (entry: Entry) => void;
  onDelete?: (entry: Entry) => void;
}) {
  const hasActions = Boolean(onEdit || onDelete);
  return (
    <table className={[styles['history-table'], ui.table, compact && styles['history-table--compact']].filter(Boolean).join(' ')}>
      <caption className={ui['sr-only']}>Замеры по датам</caption>
      <thead><tr><th scope="col">Дата</th><th scope="col">Показатели</th>{hasActions ? <th scope="col"><span className={ui['sr-only']}>Действия</span></th> : null}</tr></thead>
      <tbody>
        {entries.map((entry) => {
          const day = formatDate(entry.date);
          return (
            <tr key={entry.date}>
              <th scope="row"><time dateTime={entry.date}>{day}</time></th>
              <td>
                <ul className={styles['history-table__values']}>
                  {metricKeys.map((metric) => {
                    const value = entry.values[metric];
                    if (value === undefined) return null;
                    return <li key={metric}>{metrics[metric].label} <strong>{formatValue(value)} {metrics[metric].unit}</strong></li>;
                  })}
                </ul>
              </td>
              {hasActions ? (
                <td className={styles['history-table__actions']}>
                  {onEdit ? <button type="button" className={`${ui.button} ${ui['button--icon']}`} aria-label={`Редактировать замер за ${day}`} onClick={() => onEdit(entry)}><Pencil size={17} aria-hidden="true" /></button> : null}
                  {onDelete ? <button type="button" className={`${ui.button} ${ui['button--icon']} ${ui['button--delete']}`} aria-label={`Удалить замер за ${day}`} onClick={() => onDelete(entry)}><Trash2 size={17} aria-hidden="true" /></button> : null}
                </td>
              ) : null}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function History({ entries, onEdit, onDelete }: {
  entries: readonly Entry[];
  onEdit: (entry: Entry) => void;
  onDelete: (entry: Entry) => void;
}) {
  return (
    <section className={ui.panel} aria-label="История замеров">
      {entries.length > 0 ? <HistoryTable entries={[...entries].reverse()} onEdit={onEdit} onDelete={onDelete} /> : (
        <div className={styles['history__empty']}>
          <span className={`${ui['metric-icon']} ${ui['metric-icon--empty']}`}><CalendarDays size={24} aria-hidden="true" /></span>
          <h2>Замеров ещё нет</h2>
          <p className={ui.muted}>Добавьте первый замер. Записи появятся здесь в порядке дат.</p>
        </div>
      )}
    </section>
  );
}
