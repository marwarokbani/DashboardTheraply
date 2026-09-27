/**
 * TasksSection — Saisie rapide, filtres et affichage Kanban / Liste des tâches
 * (checkpoints de test). Cocher une tâche la passe à « Terminé ».
 */
import { useMemo, useState } from 'react';
import { ListTodo, SearchX } from 'lucide-react';
import QuickAdd from './tasks/QuickAdd';
import TaskFilters from './tasks/TaskFilters';
import KanbanBoard from './tasks/KanbanBoard';
import TaskList from './tasks/TaskList';
import { EmptyState } from './charts/ChartCard';
import { EMPTY_FILTERS, filterTasks, hasActiveFilters } from '../utils/taskFilters';
import { getActiveSprint } from '../utils/sprints';

const VIEW_KEY = 'theraply-task-view';

/** Vue mémorisée pour ce navigateur (confort uniquement). */
function readStoredView() {
  try {
    return localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'kanban';
  } catch {
    return 'kanban';
  }
}

export default function TasksSection({ data, tasks, actions, onOpenTask }) {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [view, setView] = useState(readStoredView);
  const visible = useMemo(() => filterTasks(tasks, filters), [tasks, filters]);
  const activeSprint = getActiveSprint(data.sprints);

  const changeView = (next) => {
    setView(next);
    try {
      localStorage.setItem(VIEW_KEY, next);
    } catch {
      // vue non mémorisée : sans conséquence
    }
  };

  // Valeurs par défaut de la saisie rapide : moi, module filtré, sprint actif
  const quickDefaults = useMemo(() => ({
    assignee: data.settings.currentUserId,
    module: filters.module !== 'all' && filters.module !== 'none' ? filters.module : null,
    sprintId: activeSprint?.id || null,
  }), [data.settings.currentUserId, filters.module, activeSprint]);

  const add = (input, status) => actions.addQuickTask(input, { module: quickDefaults.module, status });

  const viewActions = {
    onOpen: onOpenTask,
    toggleDone: actions.toggleDone,
    editTask: actions.editTask,
    bulkEdit: actions.bulkEdit,
    deleteTasks: actions.deleteTasks,
  };

  return (
    <section className="space-y-4" aria-labelledby="tasks-title">
      <h2 id="tasks-title" className="sr-only">Liste des tâches</h2>

      <QuickAdd teamMembers={data.teamMembers} modules={data.modules} defaults={quickDefaults} onAdd={(input) => add(input)} />

      <TaskFilters
        filters={filters}
        onChange={setFilters}
        teamMembers={data.teamMembers}
        modules={data.modules}
        view={view}
        onViewChange={changeView}
      />

      {tasks.length === 0 && view === 'list' ? (
        <div className="card">
          <EmptyState icon={ListTodo} title="Aucune tâche ici" message="Ajoutez une tâche avec le champ ci-dessus." />
        </div>
      ) : visible.length === 0 && hasActiveFilters(filters) ? (
        <div className="card">
          <EmptyState
            icon={SearchX}
            title="Aucun résultat"
            message="Aucune tâche ne correspond à ces filtres."
            action={<button type="button" className="btn btn-secondary mt-2" onClick={() => setFilters(EMPTY_FILTERS)}>Effacer les filtres</button>}
          />
        </div>
      ) : view === 'kanban' ? (
        <KanbanBoard
          tasks={visible}
          teamMembers={data.teamMembers}
          modules={data.modules}
          onOpen={onOpenTask}
          onToggleDone={actions.toggleDone}
          onMove={(taskId, status) => actions.editTask(taskId, { status })}
          onAddInColumn={add}
        />
      ) : (
        <TaskList tasks={visible} teamMembers={data.teamMembers} modules={data.modules} actions={viewActions} />
      )}
    </section>
  );
}
