/**
 * CalendarSection — Semaine courante (lundi → dimanche), tâches placées
 * selon leur échéance réelle (dueDate).
 */
import { Calendar } from 'lucide-react';
import { PRIORITIES } from '../data/initialData';
import { calcTasksByDate } from '../utils/stats';
import { findById } from '../utils/team';
import { parseISODate, todayISO } from '../utils/dates';
import { statusColor } from '../theme/colors';
import Avatar from './ui/Avatar';

export default function CalendarSection({ data }) {
  const tasksByDate = calcTasksByDate(data.tasks);
  const today = todayISO();

  return (
    <section className="space-y-4" aria-labelledby="calendar-title">
      <h2 id="calendar-title" className="section-title flex items-center gap-2">
        <Calendar className="w-5 h-5 text-accent" aria-hidden />
        Cette semaine
      </h2>

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
                      <p className={`font-medium line-clamp-2 ${task.status === 'done' ? 'line-through text-tertiary' : 'text-primary'}`}>{task.title}</p>
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
    </section>
  );
}
