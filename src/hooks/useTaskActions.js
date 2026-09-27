/**
 * useTaskActions — Actions sur les tâches partagées par tous les composants
 * (saisie rapide, Kanban, liste, panneau d'édition, palette de commandes…).
 *
 * Aucune logique métier ici : on délègue aux fonctions pures de utils/.
 * Chaque action crée UNE entrée dans l'historique (Ctrl+Z).
 */
import { useCallback, useMemo } from 'react';
import { parseQuickTask } from '../utils/parseQuickTask';
import { createTask, removeTasks, toggleTaskDone, updateTask, updateTasks } from '../utils/tasks';
import { getActiveSprint } from '../utils/sprints';

export function useTaskActions(data, updateData, showToast) {
  const { teamMembers, modules, sprints, settings, tasks } = data;

  /**
   * Crée une tâche depuis une saisie rapide.
   * @param {string} input — ex. « Écrire l'API @sahar #backend !haute 30/09 »
   * @param {{ module?: string|null, status?: string }} context — valeurs par défaut du contexte
   * @returns {object|null} la tâche créée
   */
  const addQuickTask = useCallback((input, context = {}) => {
    const parsed = parseQuickTask(input, {
      teamMembers,
      modules,
      defaults: {
        assignee: settings.currentUserId,
        module: context.module ?? null,
        sprintId: getActiveSprint(sprints)?.id || null,
      },
    });
    if (!parsed.title) return null;
    const task = createTask({ ...parsed, status: context.status });
    updateData((prev) => ({ ...prev, tasks: [...prev.tasks, task] }));
    if (parsed.warnings.length > 0) showToast(`Tâche ajoutée. ${parsed.warnings.join(' · ')}`, 'info');
    return task;
  }, [teamMembers, modules, settings.currentUserId, sprints, updateData, showToast]);

  /** Modifie une tâche (patch partiel). */
  const editTask = useCallback((taskId, patch) => {
    updateData((prev) => ({ ...prev, tasks: updateTask(prev.tasks, taskId, patch) }));
  }, [updateData]);

  /** Coche / décoche une tâche (Terminé ↔ À faire). */
  const toggleDone = useCallback((taskId) => {
    updateData((prev) => ({ ...prev, tasks: toggleTaskDone(prev.tasks, taskId) }));
  }, [updateData]);

  /** Modifie plusieurs tâches d'un coup (actions groupées). */
  const bulkEdit = useCallback((taskIds, patch) => {
    if (taskIds.length === 0) return;
    updateData((prev) => ({ ...prev, tasks: updateTasks(prev.tasks, taskIds, patch) }));
    showToast(`${taskIds.length} tâche${taskIds.length > 1 ? 's' : ''} modifiée${taskIds.length > 1 ? 's' : ''}`, 'success', { label: 'Annuler', undo: true });
  }, [updateData, showToast]);

  /** Supprime une ou plusieurs tâches, avec « Annuler » dans le toast. */
  const deleteTasks = useCallback((taskIds) => {
    const ids = Array.isArray(taskIds) ? taskIds : [taskIds];
    if (ids.length === 0) return;
    const message = ids.length === 1
      ? `Tâche « ${tasks.find((t) => t.id === ids[0])?.title ?? ''} » supprimée`
      : `${ids.length} tâches supprimées`;
    updateData((prev) => ({ ...prev, tasks: removeTasks(prev.tasks, ids) }));
    showToast(message, 'success', { label: 'Annuler', undo: true });
  }, [tasks, updateData, showToast]);

  return useMemo(
    () => ({ addQuickTask, editTask, toggleDone, bulkEdit, deleteTasks }),
    [addQuickTask, editTask, toggleDone, bulkEdit, deleteTasks]
  );
}
