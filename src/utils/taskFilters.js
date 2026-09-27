/**
 * taskFilters.js — Filtrage, tri et regroupement des tâches (fonctions pures).
 */

import { PRIORITY_IDS, STATUSES } from '../data/initialData.js';

/** Minuscule sans accents, pour une recherche tolérante. */
function fold(text = '') {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** Filtres vides (tout afficher). */
export const EMPTY_FILTERS = { search: '', assignee: 'all', module: 'all', priority: 'all' };

/** true si au moins un filtre est actif. */
export function hasActiveFilters(filters) {
  return Object.keys(EMPTY_FILTERS).some((key) => filters[key] !== EMPTY_FILTERS[key]);
}

/**
 * Filtre les tâches.
 * @param {Array} tasks
 * @param {{ search?: string, assignee?: string, module?: string, priority?: string }} filters
 *   'all' = pas de filtre ; 'none' = non assignée / sans module
 */
export function filterTasks(tasks, filters = EMPTY_FILTERS) {
  const query = fold(filters.search?.trim());
  const matches = (value, filter) => filter === 'all' || (filter === 'none' ? !value : value === filter);

  return tasks.filter((t) =>
    matches(t.assignee, filters.assignee ?? 'all')
    && matches(t.module, filters.module ?? 'all')
    && matches(t.priority, filters.priority ?? 'all')
    && (!query || fold(t.title).includes(query) || fold(t.description).includes(query))
  );
}

/**
 * Tri par défaut dans une colonne : priorité (haute d'abord), puis échéance
 * la plus proche (sans échéance à la fin), puis date de création.
 */
export function compareTasks(a, b) {
  return (
    PRIORITY_IDS.indexOf(a.priority) - PRIORITY_IDS.indexOf(b.priority)
    || (a.dueDate || '9999-12-31').localeCompare(b.dueDate || '9999-12-31')
    || (a.createdAt || '').localeCompare(b.createdAt || '')
  );
}

/**
 * Tri de la vue liste selon une colonne.
 * @param {'title'|'priority'|'dueDate'|'status'} key
 * @param {'asc'|'desc'} direction
 */
export function sortTasks(tasks, key = 'priority', direction = 'asc') {
  const statusOrder = STATUSES.map((s) => s.id);
  const comparators = {
    title: (a, b) => a.title.localeCompare(b.title, 'fr'),
    priority: compareTasks,
    dueDate: (a, b) => (a.dueDate || '9999-12-31').localeCompare(b.dueDate || '9999-12-31') || compareTasks(a, b),
    status: (a, b) => statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status) || compareTasks(a, b),
  };
  const sorted = [...tasks].sort(comparators[key] || compareTasks);
  return direction === 'desc' ? sorted.reverse() : sorted;
}

/** Regroupe les tâches par statut (colonnes du Kanban), triées dans chaque colonne. */
export function groupByStatus(tasks) {
  const groups = Object.fromEntries(STATUSES.map((s) => [s.id, []]));
  tasks.forEach((t) => groups[t.status]?.push(t));
  Object.values(groups).forEach((list) => list.sort(compareTasks));
  return groups;
}
