/**
 * TaskCard — Carte d'une tâche dans le Kanban.
 * Clic → panneau d'édition ; case ronde → Terminé en un clic ;
 * glisser (après 6 px de mouvement) → changer de colonne.
 */
import { forwardRef } from 'react';
import Checkbox from '../ui/Checkbox';
import Avatar from '../ui/Avatar';
import { DueTag, EstimateTag, ModuleTag, PriorityTag } from './TaskMeta';

const TaskCard = forwardRef(function TaskCard(
  { task, assignee, module, onOpen, onToggleDone, isDragging = false, isOverlay = false, style, ...dragProps },
  ref
) {
  const done = task.status === 'done';

  return (
    <article
      ref={ref}
      style={style}
      {...dragProps}
      onClick={() => onOpen?.(task.id)}
      onKeyDown={(e) => {
        dragProps.onKeyDown?.(e); // Espace : saisir / déposer au clavier (dnd-kit)
        if (e.key === 'Enter' && !e.defaultPrevented) onOpen?.(task.id);
      }}
      tabIndex={0}
      aria-label={`${task.title}${done ? ' (terminée)' : ''}`}
      className={`task-card ${isDragging ? 'is-dragging' : ''} ${isOverlay ? 'is-overlay' : ''} ${done ? 'is-done' : ''}`}
    >
      <div className="flex items-start gap-2.5">
        <Checkbox checked={done} onChange={() => onToggleDone?.(task.id)} label={done ? 'Marquer comme à faire' : 'Marquer comme terminée'} size="sm" />
        <p className="task-card-title">{task.title}</p>
      </div>
      <div className="flex items-center gap-1.5 mt-2.5 pl-7">
        <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
          <PriorityTag priority={task.priority} compact />
          <DueTag task={task} />
          <ModuleTag module={module} />
          <EstimateTag estimate={task.estimate} />
        </div>
        <Avatar member={assignee} size="xs" />
      </div>
    </article>
  );
});

export default TaskCard;
