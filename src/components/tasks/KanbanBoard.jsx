/**
 * KanbanBoard — Colonnes par statut avec glisser-déposer (@dnd-kit).
 *
 * - Chaque colonne est une zone de dépôt (useDroppable) : on peut déposer
 *   une tâche dans une colonne VIDE.
 * - Le statut n'est modifié qu'au dépôt (une seule entrée Ctrl+Z par déplacement).
 * - Clavier : Tab jusqu'à une carte, Espace pour la saisir, flèches, Espace pour déposer.
 */
import { useState } from 'react';
import {
  DndContext, DragOverlay, KeyboardSensor, PointerSensor,
  pointerWithin, rectIntersection, useDraggable, useDroppable, useSensor, useSensors,
} from '@dnd-kit/core';
import { Plus } from 'lucide-react';
import TaskCard from './TaskCard';
import { STATUSES } from '../../data/initialData';
import { groupByStatus } from '../../utils/taskFilters';
import { findById } from '../../utils/team';
import { statusColor } from '../../theme/colors';

/** Détection de collision : d'abord sous le pointeur, sinon par recouvrement (clavier). */
function collisionDetection(args) {
  const hits = pointerWithin(args);
  return hits.length > 0 ? hits : rectIntersection(args);
}

/** Libellés lus par les lecteurs d'écran pendant le glisser-déposer. */
const ANNOUNCEMENTS = {
  onDragStart: ({ active }) => `Tâche « ${active.data.current?.title} » saisie.`,
  onDragOver: ({ over }) => (over ? `Au-dessus de la colonne ${over.data.current?.label}.` : 'Hors des colonnes.'),
  onDragEnd: ({ over }) => (over ? `Déposée dans ${over.data.current?.label}.` : 'Déplacement annulé.'),
  onDragCancel: () => 'Déplacement annulé.',
};

function DraggableCard({ task, lookups, actions }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id, data: { title: task.title } });
  return (
    <TaskCard
      ref={setNodeRef}
      task={task}
      assignee={findById(lookups.teamMembers, task.assignee)}
      module={findById(lookups.modules, task.module)}
      onOpen={actions.onOpen}
      onToggleDone={actions.onToggleDone}
      isDragging={isDragging}
      {...attributes}
      {...listeners}
    />
  );
}

/** Champ d'ajout rapide affiché en haut d'une colonne. */
function ColumnQuickAdd({ statusLabel, onSubmit, onClose }) {
  const [draft, setDraft] = useState('');
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (draft.trim() && onSubmit(draft)) setDraft('');
      }}
    >
      <input
        className="input text-sm"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
        onBlur={() => !draft.trim() && onClose()}
        placeholder="Titre… @membre !haute 30/09"
        aria-label={`Nouvelle tâche dans ${statusLabel}`}
        autoFocus
      />
    </form>
  );
}

function KanbanColumn({ status, tasks, lookups, actions, onAddInColumn }) {
  const { setNodeRef, isOver } = useDroppable({ id: status.id, data: { label: status.label } });
  const [adding, setAdding] = useState(false);

  return (
    <section className="kanban-column" aria-label={`${status.label}, ${tasks.length} tâche${tasks.length > 1 ? 's' : ''}`}>
      <header className="flex items-center gap-2 px-1 mb-2">
        <span className="w-2 h-2 rounded-full" style={{ background: statusColor(status.id) }} aria-hidden />
        <h3 className="text-sm font-medium text-primary">{status.label}</h3>
        <span className="text-xs text-tertiary tabular-nums">{tasks.length}</span>
        <button type="button" className="btn-icon ml-auto w-7 h-7" onClick={() => setAdding(true)} aria-label={`Ajouter une tâche dans ${status.label}`}>
          <Plus className="w-4 h-4" />
        </button>
      </header>
      <div ref={setNodeRef} className={`kanban-dropzone ${isOver ? 'is-over' : ''}`}>
        {adding && (
          <ColumnQuickAdd statusLabel={status.label} onSubmit={(input) => onAddInColumn(input, status.id)} onClose={() => setAdding(false)} />
        )}
        {tasks.map((task) => (
          <DraggableCard key={task.id} task={task} lookups={lookups} actions={actions} />
        ))}
        {tasks.length === 0 && !adding && <p className="kanban-empty">Déposer une tâche ici</p>}
      </div>
    </section>
  );
}

export default function KanbanBoard({ tasks, teamMembers, modules, onOpen, onToggleDone, onMove, onAddInColumn }) {
  const [activeId, setActiveId] = useState(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space'] } })
  );
  const columns = groupByStatus(tasks);
  const lookups = { teamMembers, modules };
  const actions = { onOpen, onToggleDone };
  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : null;

  const handleDragEnd = ({ active, over }) => {
    setActiveId(null);
    const task = tasks.find((t) => t.id === active.id);
    if (task && over && over.id !== task.status) onMove(task.id, over.id);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      accessibility={{ announcements: ANNOUNCEMENTS }}
      onDragStart={({ active }) => setActiveId(active.id)}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="kanban-board">
        {STATUSES.map((status) => (
          <KanbanColumn key={status.id} status={status} tasks={columns[status.id]} lookups={lookups} actions={actions} onAddInColumn={onAddInColumn} />
        ))}
      </div>
      <DragOverlay dropAnimation={{ duration: 180, easing: 'ease-out' }}>
        {activeTask && (
          <TaskCard
            task={activeTask}
            assignee={findById(teamMembers, activeTask.assignee)}
            module={findById(modules, activeTask.module)}
            isOverlay
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}
