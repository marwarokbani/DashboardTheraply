/**
 * tasks.js — Règles métier des tâches (fonctions pures).
 *
 * Schéma d'une tâche (format v3) :
 * {
 *   id, title, description,
 *   assignee: string|null,      // id d'un membre
 *   module: string|null,        // id d'un module
 *   priority: 'haute'|'moyenne'|'basse',
 *   status: 'todo'|'in-progress'|'in-review'|'done',
 *   dueDate: 'YYYY-MM-DD'|null, // échéance (date calendaire)
 *   estimate: number|null,      // points ou heures
 *   sprintId: string|null,      // null = backlog
 *   createdAt: ISO,
 *   completedAt: ISO|null,      // rempli automatiquement au passage à « Terminé »
 *   sprintAssignedAt: ISO|null, // date d'entrée dans le sprint (sert au burndown / vélocité)
 *   legacyDeadline?: string,    // ancien jour (« Lundi »…) conservé après migration v1
 * }
 */

import { generateId } from './ids.js';
import { todayISO } from './dates.js';
import { STATUS_IDS, PRIORITY_IDS } from '../data/initialData.js';

// ============================================
// Création
// ============================================

/**
 * Construit une tâche complète à partir de champs partiels.
 * @param {object} fields — champs saisis (au minimum `title`)
 * @param {{ now?: Date }} options
 */
export function createTask(fields, { now = new Date() } = {}) {
  const nowIso = now.toISOString();
  const status = STATUS_IDS.includes(fields.status) ? fields.status : 'todo';
  const sprintId = fields.sprintId || null;
  return {
    id: fields.id || generateId('task'),
    title: String(fields.title || '').trim(),
    description: fields.description || '',
    assignee: fields.assignee || null,
    module: fields.module || null,
    priority: PRIORITY_IDS.includes(fields.priority) ? fields.priority : 'moyenne',
    status,
    dueDate: fields.dueDate || null,
    estimate: normalizeEstimate(fields.estimate),
    sprintId,
    createdAt: fields.createdAt || nowIso,
    completedAt: status === 'done' ? fields.completedAt || nowIso : null,
    sprintAssignedAt: sprintId ? fields.sprintAssignedAt || nowIso : null,
  };
}

/** Convertit une estimation saisie en nombre positif, ou null. */
export function normalizeEstimate(value) {
  if (value === '' || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

// ============================================
// Règles automatiques appliquées à chaque modification
// ============================================

/**
 * Compare l'ancienne et la nouvelle liste de tâches et applique les règles :
 * - passage à « Terminé » → completedAt = maintenant
 * - retour depuis « Terminé » → completedAt = null
 * - changement de sprint → sprintAssignedAt = maintenant (null si backlog)
 * - nouvelle tâche sans createdAt → createdAt = maintenant
 *
 * Ne modifie pas les tableaux reçus (retourne une nouvelle liste si nécessaire).
 * @param {Array} prevTasks
 * @param {Array} nextTasks
 * @param {Date} now
 */
export function applyTaskRules(prevTasks = [], nextTasks = [], now = new Date()) {
  const nowIso = now.toISOString();
  const prevById = new Map(prevTasks.map((t) => [t.id, t]));
  let changed = false;

  const result = nextTasks.map((task) => {
    const prev = prevById.get(task.id);
    const patch = {};

    if (!task.createdAt) patch.createdAt = nowIso;

    // completedAt suit le statut
    const isDone = task.status === 'done';
    const justCompleted = isDone && prev && prev.status !== 'done';
    const createdDone = isDone && !prev && !task.completedAt;
    if (justCompleted || createdDone) patch.completedAt = nowIso;
    if (!isDone && task.completedAt) patch.completedAt = null;

    // sprintAssignedAt suit le sprint
    const sprintChanged = prev ? prev.sprintId !== task.sprintId : false;
    if (task.sprintId && (sprintChanged || (!prev && !task.sprintAssignedAt))) {
      patch.sprintAssignedAt = nowIso;
    }
    if (!task.sprintId && task.sprintAssignedAt) patch.sprintAssignedAt = null;

    if (Object.keys(patch).length === 0) return task;
    changed = true;
    return { ...task, ...patch };
  });

  return changed ? result : nextTasks;
}

// ============================================
// Opérations sur la liste de tâches
// ============================================

/** Ajoute une tâche. */
export function addTask(tasks, task) {
  return [...tasks, task];
}

/** Applique un patch partiel à une tâche. */
export function updateTask(tasks, taskId, patch) {
  return tasks.map((t) => (t.id === taskId ? { ...t, ...patch } : t));
}

/** Applique un même patch à plusieurs tâches (actions groupées). */
export function updateTasks(tasks, taskIds, patch) {
  const ids = new Set(taskIds);
  return tasks.map((t) => (ids.has(t.id) ? { ...t, ...patch } : t));
}

/** Supprime une ou plusieurs tâches. */
export function removeTasks(tasks, taskIds) {
  const ids = new Set(Array.isArray(taskIds) ? taskIds : [taskIds]);
  return tasks.filter((t) => !ids.has(t.id));
}

/** Bascule une tâche entre « Terminé » et « À faire ». */
export function toggleTaskDone(tasks, taskId) {
  return tasks.map((t) =>
    t.id === taskId ? { ...t, status: t.status === 'done' ? 'todo' : 'done' } : t
  );
}

// ============================================
// Prédicats
// ============================================

export function isDone(task) {
  return task.status === 'done';
}

/** En retard : échéance strictement passée ET tâche non terminée. */
export function isOverdue(task, now = new Date()) {
  return !isDone(task) && !!task.dueDate && task.dueDate < todayISO(now);
}

/** Échéance aujourd'hui et tâche non terminée. */
export function isDueToday(task, now = new Date()) {
  return !isDone(task) && task.dueDate === todayISO(now);
}

/** Poids d'une tâche selon l'unité choisie : 1 (tâches) ou son estimation (points). */
export function taskWeight(task, unit = 'tasks') {
  if (unit === 'points') return Number(task.estimate) || 0;
  return 1;
}
