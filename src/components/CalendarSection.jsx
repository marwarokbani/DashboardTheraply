/**
 * CalendarSection — Deux vues :
 * - « Période du projet » : toutes les semaines du projet d'un coup, semaine par semaine ;
 * - « Semaine » : une semaine (lundi → dimanche), navigable.
 * Les tâches terminées sont placées le jour où elles ont été terminées
 * (completedAt), les autres à leur échéance (dueDate).
 */
import { useState } from 'react';
import { Calendar, CalendarDays, CalendarRange, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { PRIORITIES } from '../data/initialData';
import { calcProjectCalendar, calcTasksByDate } from '../utils/stats';
import { findById } from '../utils/team';
import { formatDateMedium, parseISODate, todayISO } from '../utils/dates';
import { statusColor } from '../theme/colors';
import Avatar from './ui/Avatar';
import SegmentedControl from './ui/SegmentedControl';

const VIEWS = [
  { value: 'project', label: 'Période du projet', icon: CalendarRange },
  { value: 'week', label: 'Semaine', icon: CalendarDays },
];

/** « 15 sept. → 15 oct. 2026 » */
function formatPeriod(start, end) {
  return `${formatDateMedium(start)} → ${formatDateMedium(end)} ${parseISODate(end).getFullYear()}`;
}

/** Vue « Période du projet » : une carte par semaine, une colonne par jour. */
function ProjectCalendar({ data, project }) {
  const members = data.teamMembers.map((member) => ({
    member,
    count: data.tasks.filter((t) => t.assignee === member.id).length,
  }));

  return (
    <div className="space-y-4">
      <div className="card p-4 flex flex-wrap items-center gap-x-6 gap-y-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-tertiary">Période du projet</p>
          <p className="text-lg font-bold text-primary">{formatPeriod(project.start, project.end)}</p>
        </div>
        <p className="text-sm text-secondary">
          <strong className="text-primary">{project.weeks.length}</strong> semaines ·{' '}
          <strong className="text-primary">{project.workingDays}</strong> jours de travail ·{' '}
          <strong className="text-primary">{data.tasks.length}</strong> tâches
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-2 sm:ml-auto">
          {members.map(({ member, count }) => (
            <span key={member.id} className="flex items-center gap-2 text-sm">
              <Avatar member={member} size="sm" />
              <span>
                <span className="font-medium text-primary">{member.name}</span>
                <span className="text-tertiary"> · {count} tâches{member.role ? ` · ${member.role}` : ''}</span>
              </span>
            </span>
          ))}
        </div>
      </div>

      {project.weeks.map((week) => (
        <article key={week.start} className="card" aria-label={`Semaine ${week.number}`}>
          <header className="px-4 py-3 border-b flex flex-wrap items-center gap-x-3 gap-y-2" style={{ borderColor: 'var(--border-light)' }}>
            <h3 className="font-semibold text-primary">
              Semaine {week.number}
              <span className="font-normal text-tertiary"> · du {formatDateMedium(week.start)} au {formatDateMedium(week.end)} · {week.taskCount} tâches</span>
            </h3>
            <div className="flex flex-wrap gap-1.5 sm:ml-auto">
              {data.modules.filter((mod) => week.modules.includes(mod.id)).map((mod) => (
                <span key={mod.id} className="chip" style={{ background: `color-mix(in srgb, ${mod.color} 14%, transparent)`, color: mod.color }}>
                  {mod.name}
                </span>
              ))}
            </div>
          </header>
          <div className="scroll-x">
            <div className="grid min-w-[720px]" style={{ gridTemplateColumns: `repeat(${week.days.length}, minmax(0, 1fr))` }}>
              {week.days.map(({ date, inPeriod, tasks }) => (
                <div key={date} className={`border-r last:border-r-0 ${inPeriod ? '' : 'opacity-40'}`} style={{ borderColor: 'var(--border-light)' }}>
                  <p className="px-2 pt-2 text-xs font-semibold text-tertiary capitalize">
                    {parseISODate(date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })}
                  </p>
                  <div className="p-2 space-y-1.5">
                    {tasks.map((task) => {
                      const member = findById(data.teamMembers, task.assignee);
                      return (
                        <div key={task.id} className="px-2 py-1.5 rounded-lg border text-[0.72rem] leading-snug" style={{ borderColor: 'var(--border-color)', borderLeft: `3px solid ${member?.color || 'var(--border-strong)'}` }} title={task.description || task.title}>
                          <p className="font-medium text-primary line-clamp-3">
                            {task.status === 'done' && <Check className="inline w-3 h-3 mr-0.5 -mt-0.5 text-[var(--status-done)]" aria-label="Terminée" />}
                            {task.title}
                          </p>
                          <p className="mt-1 flex items-center gap-1 text-tertiary">
                            <Avatar member={member} size="xs" />
                            {member?.name || 'Non assignée'}
                          </p>
                        </div>
                      );
                    })}
                    {inPeriod && tasks.length === 0 && <p className="text-xs text-center py-4 text-tertiary" aria-label="Aucune tâche">—</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

/** Titre de la semaine affichée. */
function weekTitle(weekOffset, dates) {
  if (weekOffset === 0) return 'Cette semaine';
  if (weekOffset === -1) return 'Semaine dernière';
  if (weekOffset === 1) return 'Semaine prochaine';
  return `Du ${formatDateMedium(dates[0])} au ${formatDateMedium(dates[dates.length - 1])}`;
}

export default function CalendarSection({ data }) {
  const project = calcProjectCalendar(data.tasks);
  const [view, setView] = useState('project');
  const [weekOffset, setWeekOffset] = useState(0);
  const tasksByDate = calcTasksByDate(data.tasks, new Date(), weekOffset);
  const today = todayISO();
  const showProject = view === 'project' && project.hasData;

  return (
    <section className="space-y-4" aria-labelledby="calendar-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="calendar-title" className="section-title flex items-center gap-2">
          <Calendar className="w-5 h-5 text-accent" aria-hidden />
          {showProject ? 'Planning du projet' : weekTitle(weekOffset, Object.keys(tasksByDate))}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          {project.hasData && <SegmentedControl label="Vue du calendrier" options={VIEWS} value={view} onChange={setView} size="sm" />}
          {!showProject && (
            <div className="flex items-center gap-1.5">
              <button type="button" className="btn-icon" onClick={() => setWeekOffset((w) => w - 1)} aria-label="Semaine précédente">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setWeekOffset(0)} disabled={weekOffset === 0}>
                Aujourd'hui
              </button>
              <button type="button" className="btn-icon" onClick={() => setWeekOffset((w) => w + 1)} aria-label="Semaine suivante">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
      <p className="text-xs text-tertiary">
        Les tâches terminées apparaissent le jour où elles ont été terminées, les autres à leur échéance.
        {showProject && ' La couleur à gauche de chaque tâche indique la personne qui l’a réalisée.'}
      </p>

      {showProject ? <ProjectCalendar data={data} project={project} /> : (
      <div className="card scroll-x">
        <div className="grid grid-cols-7 min-w-[720px]">
          {Object.entries(tasksByDate).map(([date, tasks]) => {
            const d = parseISODate(date);
            const isToday = date === today;
            return (
              <div key={date} className={`min-h-[200px] border-r last:border-r-0 ${isToday ? 'bg-[var(--accent-soft)]' : ''}`} style={{ borderColor: 'var(--border-light)' }}>
                <div className="px-3 py-2.5 text-center border-b" style={{ borderColor: 'var(--border-light)' }}>
                  <p className={`text-xs font-semibold uppercase tracking-wider ${isToday ? 'text-accent' : 'text-tertiary'}`}>
                    {d.toLocaleDateString('fr-FR', { weekday: 'short' })}
                  </p>
                  <p className={`text-lg font-bold mt-0.5 ${isToday ? 'text-accent' : 'text-primary'}`}>{d.getDate()}</p>
                </div>
                <div className="p-2 space-y-1.5">
                  {tasks.map((task) => (
                    <div key={task.id} className="px-2 py-1.5 rounded-lg border text-[0.7rem] leading-tight" style={{ borderColor: 'var(--border-color)', borderLeft: `3px solid ${statusColor(task.status)}` }}>
                      <p className={`font-medium line-clamp-2 ${task.status === 'done' ? 'text-secondary' : 'text-primary'}`}>
                        {task.status === 'done' && <Check className="inline w-3 h-3 mr-0.5 -mt-0.5 text-[var(--status-done)]" aria-label="Terminée" />}
                        {task.title}
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        <Avatar member={findById(data.teamMembers, task.assignee)} size="xs" />
                        <span className="text-tertiary">{PRIORITIES.find((p) => p.id === task.priority)?.label}</span>
                      </div>
                    </div>
                  ))}
                  {tasks.length === 0 && <p className="text-xs text-center py-6 text-tertiary" aria-label="Aucune tâche">—</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      )}
    </section>
  );
}
