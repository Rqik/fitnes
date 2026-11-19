import { useState, type FormEvent } from 'react';
import { formatDate } from '../domain/dates';
import { ageGroups, isAdultGroup, type Profile } from '../domain/journal';
import { formatChange, formatValue, seriesLabels } from '../domain/metrics';
import { getReference, referenceMetrics } from '../domain/nhanes';
import { bmiCategory, waistCategory, type Series } from '../domain/statistics';
import ui from '../styles/ui.module.scss';
import styles from './Comparisons.module.scss';

function CohortForm({ profile, onSave }: {
  profile: Profile;
  onSave: (profile: Pick<Profile, 'ageGroup' | 'sex'>) => Promise<void>;
}) {
  const [ageGroup, setAgeGroup] = useState(profile.ageGroup);
  const [sex, setSex] = useState(profile.sex);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    setError('');
    try {
      await onSave({ ageGroup, sex });
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
          <h2 id="cohort-heading">Профиль для сравнения</h2>
          <p className={ui.muted}>Возраст открывает справочные ориентиры для взрослых. Возраст и пол определяют группу NHANES.</p>
        </div>
      </div>
      <form method="post" className={`${ui['panel__body']} ${ui['form-layout']}`} aria-labelledby="cohort-heading" onSubmit={submit}>
        <div className={`${ui['form-layout__grid']} ${ui['form-layout__grid--aligned']}`}>
          <div className={ui.field}>
            <label htmlFor="age-group">Возрастная группа</label>
            <select id="age-group" name="age-group" value={ageGroup ?? ''} onChange={(event) => setAgeGroup((event.currentTarget.value || null) as Profile['ageGroup'])}>
              <option value="">Не указана</option>
              <option value="under20">Младше 20 лет</option>
              {ageGroups.map((group) => <option key={group} value={group}>{group} лет</option>)}
            </select>
          </div>
          <div className={ui.field}>
            <label htmlFor="reference-sex">Пол в таблицах NHANES</label>
            <select id="reference-sex" name="reference-sex" value={sex ?? ''} onChange={(event) => setSex((event.currentTarget.value || null) as Profile['sex'])}>
              <option value="">Не указан</option>
              <option value="female">Женский</option>
              <option value="male">Мужской</option>
            </select>
          </div>
          <button type="submit" className={`${ui.button} ${ui['button--secondary']}`} disabled={isSaving || (ageGroup === profile.ageGroup && sex === profile.sex)}>Сохранить профиль</button>
        </div>
        {error ? <p className={`${ui.message} ${ui['message--error']}`} role="alert">{error}</p> : null}
      </form>
    </section>
  );
}

function ReferenceIndicators({ series, profile }: { series: Series; profile: Profile }) {
  const bmi = series.get('bmi')?.at(-1);
  const ratio = series.get('waistRatio')?.at(-1);
  const isAdult = isAdultGroup(profile.ageGroup);
  const bmiLabel = bmi && bmiCategory(bmi.value, profile.ageGroup);
  const ratioLabel = ratio && waistCategory(ratio, profile.ageGroup);

  return (
    <section aria-labelledby="reference-heading">
      <div className={styles['comparisons__heading']}>
        <h2 id="reference-heading">Справочные ориентиры</h2>
        <p className={ui.muted}>Скрининговые ориентиры для взрослых вне беременности.</p>
      </div>
      <div className={styles['comparisons__grid']}>
        <article className={`${ui.panel} ${styles['comparisons__card']}`}>
          <h3>Индекс массы тела</h3>
          <div className={ui.measurement}>{bmi && isAdult ? formatValue(Math.floor(bmi.value * 100) / 100) : '—'} <span>кг/м²</span></div>
          {bmiLabel && bmi ? <p><strong>{bmiLabel}</strong> <span className={ui.muted}>· {formatDate(bmi.date, 'short')}</span></p> : null}
          <p className={ui.muted}>{!isAdult ? 'Укажите возрастную группу 20+.' : bmi ? 'При высокой мышечной массе интерпретируйте ИМТ с осторожностью.' : 'Добавьте рост и вес. Рост должен быть записан на дату взвешивания или раньше.'}</p>
          <a className={ui['source-link']} href="https://www.cdc.gov/bmi/adult-calculator/bmi-categories.html" target="_blank" rel="noreferrer">Категории CDC</a>
        </article>
        <article className={`${ui.panel} ${styles['comparisons__card']}`}>
          <h3>Талия / рост</h3>
          <div className={ui.measurement}>{ratio && isAdult ? formatValue(Math.floor(ratio.value * 1000) / 1000, 'waistRatio') : '—'}</div>
          {ratioLabel && ratio ? <p><strong>{ratioLabel}</strong> <span className={ui.muted}>· {formatDate(ratio.date, 'short')}</span></p> : null}
          <p className={ui.muted}>{!isAdult ? 'Укажите возрастную группу 20+.' : ratio ? 'Категория NICE применима при ИМТ ниже 35 на дату замера талии.' : 'Добавьте талию и рост. Рост должен быть записан на дату замера талии или раньше.'}</p>
          <a className={ui['source-link']} href="https://www.nice.org.uk/guidance/ng246/chapter/Identifying-and-assessing-overweight-obesity-and-central-adiposity" target="_blank" rel="noreferrer">Ориентиры NICE</a>
        </article>
      </div>
    </section>
  );
}

function PopulationTable({ series, profile }: { series: Series; profile: Profile }) {
  const hasGroup = isAdultGroup(profile.ageGroup) && Boolean(profile.sex);
  return (
    <section className={ui.panel} aria-labelledby="nhanes-heading">
      <div className={ui['panel__heading']}>
        <div>
          <h2 id="nhanes-heading">Выборка NHANES</h2>
          <p className={ui.muted}>США, 2021–2023. P25–P75 охватывает средние 50% распределения.</p>
        </div>
      </div>
      {!hasGroup ? <p className={`${ui['panel__body']} ${ui.muted}`}>Укажите возрастную группу 20+ и пол, чтобы увидеть данные выборки.</p> : (
        <div className={styles['comparisons__scroll']} role="region" aria-label="Таблица сравнения с NHANES" tabIndex={0}>
          <table className={`${ui.table} ${styles['comparisons__table']}`}>
            <caption className={ui['sr-only']}>Группа {profile.ageGroup} лет, {profile.sex === 'female' ? 'женщины' : 'мужчины'}</caption>
            <thead>
              <tr><th scope="col">Показатель</th><th scope="col">Мой замер</th><th scope="col">Среднее</th><th scope="col">Разница</th><th scope="col">P25–P75</th></tr>
            </thead>
            <tbody>
              {referenceMetrics.map((metric) => {
                const reference = getReference(metric, profile);
                if (!reference) return null;
                const seriesPoint = series.get(metric)?.at(-1);
                const { label, unit } = seriesLabels[metric];
                return (
                  <tr key={metric}>
                    <th scope="row">{label}, {unit}</th>
                    <td>{seriesPoint ? <>{formatValue(seriesPoint.value, metric)} <small className={styles['comparisons__date']}>{formatDate(seriesPoint.date, 'short')}</small></> : '—'}</td>
                    <td>{formatValue(reference.mean, metric)}</td>
                    <td>{seriesPoint ? formatChange(seriesPoint.value - reference.mean, metric) : '—'}</td>
                    <td>{formatValue(reference.p25)}–{formatValue(reference.p75)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <div className={`${ui['panel__body']} ${styles['comparisons__note']}`}>
        <p className={ui.muted}>Данные описывают выборку США. Обхват талии сравнивается по отдельному замеру NHANES.</p>
        <a className={ui['source-link']} href="https://stacks.cdc.gov/view/cdc/174595" target="_blank" rel="noreferrer">Таблицы исследования</a>
        {' · '}
        <a className={ui['source-link']} href="https://stacks.cdc.gov/view/cdc/127207" target="_blank" rel="noreferrer">Протокол измерений</a>
      </div>
    </section>
  );
}

export function Comparisons({ series, profile, onSave }: {
  series: Series;
  profile: Profile;
  onSave: (profile: Pick<Profile, 'ageGroup' | 'sex'>) => Promise<void>;
}) {
  return (
    <div className={ui['page-stack']}>
      <CohortForm key={`${profile.ageGroup}-${profile.sex}`} profile={profile} onSave={onSave} />
      <ReferenceIndicators series={series} profile={profile} />
      <PopulationTable series={series} profile={profile} />
    </div>
  );
}
