/**
 * TaskMeta — Petits éléments d'information d'une tâche, réutilisés
 * par la carte Kanban, la liste et le calendrier.
 */
import { CalendarDays } from 'lucide-react';
import { PRIORITIES } from '../../data/initialData';
import { formatDueRelative } from '../../utils/dates';
import { isOverdue } from '../../utils/tasks';
import { priorityColor } from '../../theme/colors';

/** Priorité : pastille + libellé. */
export function PriorityTag({ priority, compact = false }) {
  const label = PRIORITIES.find((p) => p.id === priority)?.label ?? priority;
  return (
    <span className="meta-tag" title={`Priorité ${label.toLowerCase()}`}>
      <span className="priority-dot" style={{ background: priorityColor(priority) }} aria-hidden />
      {compact ? <span className="sr-only">Priorité {label}</span> : label}
    </span>
  );
}

/** Module : pastille colorée + nom. */
export function ModuleTag({ module }) {
  if (!module) return null;
  return (
    <span className="meta-tag max-w-[10rem]">
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: module.color }} aria-hidden />
      <span className="truncate">{module.name}</span>
    </span>
  );
}

/** Échéance relative (« Demain », « Il y a 2 j »…), en rouge si en retard. */
export function DueTag({ task }) {
  if (!task.dueDate) return null;
  const overdue = isOverdue(task);
  return (
    <span className={`meta-tag ${overdue ? 'text-danger' : ''}`} title={overdue ? 'En retard' : 'Échéance'}>
      <CalendarDays className="w-3 h-3" aria-hidden />
      {formatDueRelative(task.dueDate)}
    </span>
  );
}

/** Estimation (points ou heures). */
export function EstimateTag({ estimate }) {
  if (estimate === null || estimate === undefined) return null;
  return <span className="meta-tag tabular-nums" title="Estimation">{estimate} pt{estimate > 1 ? 's' : ''}</span>;
}
