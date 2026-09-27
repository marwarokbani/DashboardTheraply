/**
 * TodayFocus — « À traiter aujourd'hui » : tâches en retard puis échéances du jour.
 * Clic sur une tâche → ouverture du panneau d'édition.
 */
import { CalendarCheck2, CircleAlert, Clock } from 'lucide-react';
import Avatar from '../ui/Avatar';
import { findById } from '../../utils/team';
import { formatDueRelative } from '../../utils/dates';
import { priorityColor } from '../../theme/colors';

const MAX_VISIBLE = 6;

export default function TodayFocus({ items, teamMembers, upcomingCount, onOpenTask }) {
  if (items.length === 0) {
    return (
      <section className="card px-5 py-4 flex items-center gap-3" aria-label="À traiter aujourd'hui">
        <CalendarCheck2 className="w-5 h-5 text-[var(--status-done)]" aria-hidden />
        <p className="text-sm text-secondary">
          Rien d’urgent aujourd’hui.
          {upcomingCount > 0 && <span className="text-tertiary"> {upcomingCount} échéance{upcomingCount > 1 ? 's' : ''} dans les 3 prochains jours.</span>}
        </p>
      </section>
    );
  }

  const visible = items.slice(0, MAX_VISIBLE);
  const overdueCount = items.filter((i) => i.reason === 'overdue').length;

  return (
    <section className="card overflow-hidden" aria-labelledby="today-focus-title">
      <header className="flex items-center gap-2 px-5 pt-4 pb-3">
        <CircleAlert className="w-4 h-4 text-danger" aria-hidden />
        <h2 id="today-focus-title" className="card-title">À traiter aujourd’hui</h2>
        <span className="text-xs text-tertiary">
          {overdueCount > 0 && `${overdueCount} en retard`}
          {overdueCount > 0 && items.length > overdueCount && ' · '}
          {items.length > overdueCount && `${items.length - overdueCount} pour aujourd’hui`}
        </span>
      </header>
      <ul className="divide-y divide-[var(--border-light)] border-t border-[var(--border-light)]">
        {visible.map(({ task, reason }) => (
          <li key={task.id}>
            <button type="button" onClick={() => onOpenTask(task.id)} className="list-row w-full text-left">
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: priorityColor(task.priority) }} title={`Priorité ${task.priority}`} aria-hidden />
              <span className="flex-1 min-w-0 truncate text-sm text-primary">{task.title}</span>
              <Avatar member={findById(teamMembers, task.assignee)} size="xs" />
              <span className={`flex items-center gap-1 text-xs shrink-0 w-24 justify-end ${reason === 'overdue' ? 'text-danger' : 'text-secondary'}`}>
                <Clock className="w-3 h-3" aria-hidden />
                {formatDueRelative(task.dueDate)}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {items.length > MAX_VISIBLE && (
        <p className="px-5 py-2.5 text-xs text-tertiary border-t" style={{ borderColor: 'var(--border-light)' }}>
          + {items.length - MAX_VISIBLE} autre{items.length - MAX_VISIBLE > 1 ? 's' : ''}
        </p>
      )}
    </section>
  );
}
