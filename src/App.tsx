import { Activity, CalendarDays, ChartNoAxesCombined, ClipboardList, LayoutGrid, Menu, PersonStanding, Plus, ShieldCheck, Target, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Backup } from './components/Backup';
import { Comparisons } from './components/Comparisons';
import { ConfirmDialog } from './components/Dialogs';
import { EntryDialog } from './components/EntryDialog';
import { Goals, GoalEditorDialog } from './components/Goals';
import { History } from './components/HistoryTable';
import { MuscleMap } from './components/MuscleMap';
import { MuscleMeasurementDialog } from './components/MuscleMeasurementDialog';
import { Overview } from './components/Overview';
import { formatDate, localDate } from './domain/dates';
import { sameEntry, sortEntries, type Entry, type Goal, type Journal, type Profile } from './domain/journal';
import { type Metric, type Values } from './domain/metrics';
import { buildSeries } from './domain/statistics';
import { ConflictError } from './storage/journalStore';
import { useJournal } from './storage/useJournal';
import ui from './styles/ui.module.scss';
import styles from './App.module.scss';

const pages = {
  overview: { label: 'Обзор', title: 'Твои показатели', description: '', icon: LayoutGrid },
  muscles: { label: 'Карта мышц', title: 'Карта мышц', description: '', icon: PersonStanding },
  history: { label: 'История', title: 'История замеров', description: 'Все записи по датам. Откройте замер, чтобы дополнить или исправить его.', icon: ClipboardList },
  compare: { label: 'Сравнения', title: 'Сравнения', description: 'Справочные диапазоны и замеры из опубликованной выборки.', icon: ChartNoAxesCombined },
  goals: { label: 'Цели', title: 'Цели и фокус', description: 'Выберите направление и отслеживайте прогресс по своим целям.', icon: Target },
  backup: { label: 'Мои данные', title: 'Мои данные', description: 'Дневник хранится в этом браузере. Копию можно открыть на другом устройстве.', icon: ShieldCheck },
} as const;
type Page = keyof typeof pages;
const mainNav: Page[] = ['overview', 'muscles', 'history', 'compare', 'goals'];

type Overlay =
  | { kind: 'entry'; entry?: Entry }
  | { kind: 'muscle-measurement'; metric: Metric }
  | { kind: 'muscle-goal'; metric: Metric }
  | { kind: 'delete'; entry: Entry }
  | { kind: 'restore'; journal: Journal; revision: number };

function currentPage(): Page {
  const hash = window.location.hash.slice(1);
  return Object.hasOwn(pages, hash) ? hash as Page : 'overview';
}

function Navigation({ page }: { page: Page }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const MenuIcon = isMenuOpen ? X : Menu;

  return (
    <aside className={styles.sidebar} data-menu-open={isMenuOpen} onKeyDown={(event) => {
      if (event.key !== 'Escape' || !isMenuOpen || !menuButton.current?.getClientRects().length) return;
      setIsMenuOpen(false);
      menuButton.current.focus();
    }}>
      <a className={styles['sidebar__brand']} href="#overview" aria-label="Fitnes — обзор" onClick={() => setIsMenuOpen(false)}>
        <span className={styles['sidebar__mark']}><Activity size={21} strokeWidth={1.7} aria-hidden="true" /></span>
        <span><strong>Fitnes</strong><small>Дневник замеров</small></span>
      </a>
      <button type="button" className={`${ui.button} ${ui['button--icon']} ${styles['sidebar__toggle']}`} ref={menuButton} aria-controls="journal-navigation" aria-expanded={isMenuOpen} aria-label="Меню" onClick={() => setIsMenuOpen(!isMenuOpen)}>
        <MenuIcon size={22} strokeWidth={1.7} aria-hidden="true" />
      </button>
      <nav id="journal-navigation" className={styles['sidebar__navigation']} aria-label="Разделы дневника">
        <ul className={styles['sidebar__links']}>
          {mainNav.map((item) => {
            const { icon: Icon, label } = pages[item];
            return (
              <li key={item}>
                <a className={styles['sidebar__link']} href={`#${item}`} aria-current={page === item ? 'page' : undefined} onClick={() => setIsMenuOpen(false)}>
                  <Icon size={18} strokeWidth={1.7} aria-hidden="true" /><span>{label}</span>
                </a>
              </li>
            );
          })}
          <li className={styles['sidebar__backup']}>
            <a className={styles['sidebar__link']} href="#backup" aria-current={page === 'backup' ? 'page' : undefined} onClick={() => setIsMenuOpen(false)}>
              <ShieldCheck size={18} strokeWidth={1.7} aria-hidden="true" /><span>Мои данные</span>
            </a>
          </li>
        </ul>
      </nav>
    </aside>
  );
}

const noEntries: readonly Entry[] = [];

export default function App() {
  const { snapshot, loadError, reload, save } = useJournal();
  const [page, setPage] = useState(currentPage);
  const [overlay, setOverlay] = useState<Overlay | null>(null);
  const [notice, setNotice] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  const journal = snapshot?.journal;
  const entries = journal?.entries ?? noEntries;
  const series = useMemo(() => buildSeries(entries), [entries]);
  const today = localDate();

  useEffect(() => {
    function syncPage() {
      setPage(currentPage());
      setNotice('');
      window.scrollTo({ top: 0 });
      window.requestAnimationFrame(() => heading.current?.focus({ preventScroll: true }));
    }
    window.addEventListener('hashchange', syncPage);
    return () => window.removeEventListener('hashchange', syncPage);
  }, []);

  async function saveEntry(date: string, values: Values, previous?: Entry) {
    await save(({ journal: current }) => {
      if (previous && !sameEntry(current.entries.find((entry) => entry.date === previous.date), previous)) {
        throw new ConflictError('Замер обновился в другой вкладке. Откройте запись заново.');
      }
      const remaining = current.entries.filter((entry) => entry.date !== previous?.date);
      if (remaining.some((entry) => entry.date === date)) throw new ConflictError('На эту дату уже есть замер.');
      return { ...current, entries: sortEntries([...remaining, { date, values }]) };
    });
    setNotice('Замер сохранён.');
  }

  async function saveMuscleMeasurement(metric: Metric, date: string, value: number, previousValue: number | undefined) {
    await save(({ journal: current }) => {
      const existing = current.entries.find((entry) => entry.date === date);
      if (existing?.values[metric] !== previousValue) {
        throw new ConflictError('Этот показатель обновился в другой вкладке. Откройте форму заново.');
      }
      const updated = { date, values: { ...existing?.values, [metric]: value } };
      const nextEntries = existing
        ? current.entries.map((entry) => entry === existing ? updated : entry)
        : sortEntries([...current.entries, updated]);
      return { ...current, entries: nextEntries };
    });
    setNotice('Замер сохранён.');
  }

  async function deleteEntry(entry: Entry) {
    await save(({ journal: current }) => {
      if (!sameEntry(current.entries.find((item) => item.date === entry.date), entry)) {
        throw new ConflictError('Запись изменилась. Закройте подтверждение и проверьте историю.');
      }
      return { ...current, entries: current.entries.filter((item) => item.date !== entry.date) };
    });
    setNotice('Замер удалён.');
  }

  async function saveProfile(changes: Partial<Profile>, message: string) {
    await save(({ journal: current }) => ({ ...current, profile: { ...current.profile, ...changes } }));
    setNotice(message);
  }

  async function saveGoal(metric: Metric, goal: Goal | undefined) {
    await save(({ journal: current }) => {
      const goals = { ...current.goals };
      if (goal) goals[metric] = goal;
      else delete goals[metric];
      return { ...current, goals };
    });
    setNotice(goal ? 'Цель сохранена.' : 'Цель удалена.');
  }

  function openEntry(entry?: Entry) {
    setNotice('');
    setOverlay({ kind: 'entry', entry });
  }

  function closeOverlay() {
    setOverlay(null);
  }

  async function restore(backup: Journal, revision: number) {
    await save((current) => {
      if (current.revision !== revision) throw new ConflictError('Дневник обновился. Выберите файл заново, чтобы подтвердить замену.');
      return backup;
    });
    setNotice('Дневник восстановлен из копии.');
  }

  function renderPage() {
    if (!snapshot || !journal) return <p className={`${ui.panel} ${ui['panel__body']} ${ui.muted}`} role="status">Открываем дневник…</p>;
    switch (page) {
      case 'overview':
        return <Overview series={series} entries={entries} profile={journal.profile} />;
      case 'muscles':
        return <MuscleMap series={series} goals={journal.goals} onMeasure={(metric) => {
          setNotice('');
          setOverlay({ kind: 'muscle-measurement', metric });
        }} onEditGoal={(metric) => {
          setNotice('');
          setOverlay({ kind: 'muscle-goal', metric });
        }} />;
      case 'history':
        return <History entries={entries} onEdit={openEntry} onDelete={(entry) => setOverlay({ kind: 'delete', entry })} />;
      case 'compare':
        return <Comparisons series={series} profile={journal.profile} onSave={(profile) => saveProfile(profile, 'Профиль сохранён.')} />;
      case 'goals':
        return <Goals journal={journal} series={series} onSaveGoal={saveGoal} onSaveFocus={(focus) => saveProfile({ focus }, 'Фокус сохранён.')} />;
      case 'backup':
        return <Backup journal={journal} onRestore={(backup) => setOverlay({ kind: 'restore', journal: backup, revision: snapshot.revision })} />;
    }
  }

  return (
    <>
      <a className={styles['app__skip-link']} href="#main" onClick={(event) => { event.preventDefault(); heading.current?.focus(); }}>К содержимому</a>
      <div className={styles.app}>
        <Navigation page={page} />
        <main id="main" className={styles['app__main']}>
          <div className={styles['app__content']}>
            <header className={page === 'muscles' ? `${styles['page-header']} ${styles['page-header--map']}` : styles['page-header']}>
              <div>
                {page === 'overview' ? <div className={styles['page-header__today']}><CalendarDays size={15} aria-hidden="true" /><time dateTime={today}>{formatDate(today, 'heading')}</time></div> : null}
                <h1 ref={heading} tabIndex={-1}>{pages[page].title}</h1>
                {pages[page].description ? <p>{pages[page].description}</p> : null}
              </div>
              {page === 'muscles' ? null : <button type="button" className={`${ui.button} ${ui['button--primary']}`} disabled={!snapshot || loadError} onClick={() => openEntry()}>
                <Plus size={19} strokeWidth={2.5} aria-hidden="true" /> Добавить замер
              </button>}
            </header>
            <div className={styles['app__status']} role="status">{notice}</div>
            {loadError ? (
              <div className={`${ui.panel} ${ui['panel__body']} ${styles['app__load-error']}`}>
                <p role="alert">Не удалось открыть дневник. Проверьте, доступно ли хранилище браузера.</p>
                <button type="button" className={`${ui.button} ${ui['button--secondary']}`} onClick={() => void reload()}>Повторить</button>
              </div>
            ) : renderPage()}
          </div>
        </main>
      </div>
      {overlay?.kind === 'entry' ? <EntryDialog key={overlay.entry?.date ?? 'new'} entry={overlay.entry} entries={entries} onSave={saveEntry} onEdit={openEntry} onClose={closeOverlay} /> : null}
      {overlay?.kind === 'muscle-measurement' ? (
        <MuscleMeasurementDialog key={overlay.metric} metric={overlay.metric} entries={entries} onSave={(date, value, previous) => saveMuscleMeasurement(overlay.metric, date, value, previous)} onClose={closeOverlay} />
      ) : null}
      {overlay?.kind === 'muscle-goal' ? (
        <GoalEditorDialog key={overlay.metric} metric={overlay.metric} goal={journal?.goals[overlay.metric]} onSave={(goal) => saveGoal(overlay.metric, goal)} onClose={closeOverlay} />
      ) : null}
      {overlay?.kind === 'delete' ? (
        <ConfirmDialog
          title="Удалить замер?"
          description={`Запись от ${formatDate(overlay.entry.date)} будет удалена из истории и статистики.`}
          action="Удалить замер"
          onConfirm={() => deleteEntry(overlay.entry)}
          onClose={closeOverlay}
        />
      ) : null}
      {overlay?.kind === 'restore' ? (
        <ConfirmDialog
          title="Восстановить из копии?"
          description={`Файл содержит записей: ${overlay.journal.entries.length}. Он заменит текущие замеры, профиль и цели.`}
          action="Восстановить дневник"
          onConfirm={() => restore(overlay.journal, overlay.revision)}
          onClose={closeOverlay}
        />
      ) : null}
    </>
  );
}
