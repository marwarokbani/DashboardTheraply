/**
 * TaskList — Vue liste : tableau triable avec sélection multiple
 * (actions groupées). Sur petit écran, chaque ligne devient une carte.
 */
import { useState } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { STATUSES } from '../../data/initialData';
import { sortTasks } from '../../utils/taskFilters';
import { findById } from '../../utils/team';
import { statusColor } from '../../theme/colors';
import Avatar from '../ui/Avatar';
import Checkbox from '../ui/Checkbox';
import BulkActionsBar from './BulkActionsBar';
import { DueTag, ModuleTag, PriorityTag } from './TaskMeta';

const COLUMNS = [
  { key: 'title', label: 'Tâche' },
  { key: 'status', label: 'Statut' },
  { key: 'priority', label: 'Priorité' },
  { key: 'dueDate', label: 'Échéance' },
];

/** En-tête de colonne cliquable pour trier. */
function SortHeader({ column, sort, onSort }) {
  const active = sort.key === column.key;
  const Icon = sort.direction === 'asc' ? ArrowUp : ArrowDown;
  return (
    <th scope="col" aria-sort={active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" className="sort-button" onClick={() => onSort(column.key)}>
        {column.label}
        {active && <Icon className="w-3 h-3" aria-hidden />}
      </button>
    </th>
  );
}

export default function TaskList({ tasks, teamMembers, modules, actions }) {
  const [sort, setSort] = useState({ key: 'priority', direction: 'asc' });
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  // La sélection ne garde que les tâches encore visibles (filtres, suppressions…)
  const visibleIds = new Set(tasks.map((t) => t.id));
  const selected = [...selectedIds].filter((id) => visibleIds.has(id));
  const allSelected = tasks.length > 0 && selected.length === tasks.length;
  const sorted = sortTasks(tasks, sort.key, sort.direction);

  const toggleSort = (key) =>
    setSort((s) => ({ key, direction: s.key === key && s.direction === 'asc' ? 'desc' : 'asc' }));

  const toggleOne = (id) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAll = () => setSelectedIds(allSelected ? new Set() : new Set(tasks.map((t) => t.id)));
  const clear = () => setSelectedIds(new Set());

  const bulk = {
    onStatus: (status) => { actions.bulkEdit(selected, { status }); },
    onAssignee: (assignee) => { actions.bulkEdit(selected, { assignee }); },
    onDelete: () => { actions.deleteTasks(selected); clear(); },
  };

  return (
    <div className="space-y-3">
      <BulkActionsBar count={selected.length} teamMembers={teamMembers} onClear={clear} {...bulk} />

      <div className="card overflow-hidden">
        <table className="task-table">
          <thead>
            <tr>
              <th scope="col" className="w-10">
                <input type="checkbox" className="toggle" checked={allSelected} onChange={toggleAll} aria-label="Tout sélectionner" />
              </th>
              {COLUMNS.map((c) => <SortHeader key={c.key} column={c} sort={sort} onSort={toggleSort} />)}
              <th scope="col">Assignée</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((task) => {
              const isSelected = selectedIds.has(task.id);
              const done = task.status === 'done';
              return (
                <tr key={task.id} className={isSelected ? 'is-selected' : ''} onClick={() => actions.onOpen(task.id)}>
                  <td data-cell="select" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" className="toggle" checked={isSelected} onChange={() => toggleOne(task.id)} aria-label={`Sélectionner ${task.title}`} />
                  </td>
                  <td data-cell="title">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Checkbox checked={done} onChange={() => actions.toggleDone(task.id)} label={done ? 'Marquer comme à faire' : 'Marquer comme terminée'} size="sm" />
                      <button
                        type="button"
                        className={`truncate text-left cursor-pointer hover:underline underline-offset-2 ${done ? 'line-through text-tertiary' : 'text-primary'}`}
                        onClick={(e) => { e.stopPropagation(); actions.onOpen(task.id); }}
                      >
                        {task.title}
                      </button>
                      <ModuleTag module={findById(modules, task.module)} />
                    </div>
                  </td>
                  <td data-cell="status" onClick={(e) => e.stopPropagation()}>
                    <select
                      className="status-select"
                      value={task.status}
                      onChange={(e) => actions.editTask(task.id, { status: e.target.value })}
                      aria-label={`Statut de ${task.title}`}
                      style={{ color: statusColor(task.status) }}
                    >
                      {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                  </td>
                  <td data-cell="priority"><PriorityTag priority={task.priority} /></td>
                  <td data-cell="due">{task.dueDate ? <DueTag task={task} /> : <span className="text-tertiary">—</span>}</td>
                  <td data-cell="assignee">
                    <span className="flex items-center gap-2">
                      <Avatar member={findById(teamMembers, task.assignee)} size="xs" />
                      <span className="text-xs text-secondary truncate">{findById(teamMembers, task.assignee)?.name || 'Non assignée'}</span>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
