/**
 * sprints.js — Gestion des sprints (fonctions pures).
 *
 * Schéma d'un sprint (format v3) :
 * {
 *   id, name, goal,
 *   startDate: 'YYYY-MM-DD', endDate: 'YYYY-MM-DD',
 *   status: 'planned'|'active'|'closed',  // un seul sprint actif à la fois
 *   createdAt: ISO, closedAt: ISO|null,
 *   snapshot: null | {                    // photo figée à la clôture (vélocité)
 *     plannedTasks, plannedPoints,        // engagées au début du sprint
 *     addedTasks, addedPoints,            // ajoutées en cours de sprint
 *     completedTasks, completedPoints,    // terminées pendant le sprint
 *     unfinishedTaskIds: string[],
 *   },
 *   carryOver: null | { mode: 'next'|'keep'|'backlog', toSprintId: string|null },
 * }
 *
 * « Planifiée » = tâche entrée dans le sprint au plus tard le jour de son début
 * (sprintAssignedAt, à défaut createdAt). Les tâches ajoutées ensuite sont
 * comptées à part, pour ne pas fausser l'engagement initial.
 */

import { generateId } from './ids.js';
import { addDays, diffDays, isISODate, isTimestampInRange, timestampToISODate, todayISO } from './dates.js';
import { taskWeight } from './tasks.js';

// ============================================
// Lecture
// ============================================

/** Sprint actif (au plus un), ou null. */
export function getActiveSprint(sprints = []) {
  return sprints.find((s) => s.status === 'active') || null;
}

/** Sprints clôturés, du plus ancien au plus récent. */
export function getClosedSprints(sprints = []) {
  return sprints
    .filter((s) => s.status === 'closed')
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
}

/** Sprints planifiés (pas encore démarrés), du plus proche au plus lointain. */
export function getPlannedSprints(sprints = []) {
  return sprints
    .filter((s) => s.status === 'planned')
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
}

/** Tâches rattachées à un sprint. */
export function getSprintTasks(tasks = [], sprintId) {
  return tasks.filter((t) => t.sprintId === sprintId);
}

// ============================================
// Validation et création
// ============================================

/**
 * Vérifie les champs d'un sprint. Retourne un message d'erreur ou null.
 * @param {{ name: string, startDate: string, endDate: string }} fields
 */
export function validateSprint(fields) {
  if (!fields.name?.trim()) return 'Le nom du sprint est obligatoire.';
  if (!isISODate(fields.startDate)) return 'La date de début est obligatoire.';
  if (!isISODate(fields.endDate)) return 'La date de fin est obligatoire.';
  if (fields.endDate < fields.startDate) return 'La date de fin doit être après la date de début.';
  return null;
}

/**
 * Crée un sprint. Il devient actif s'il n'y a pas déjà de sprint actif,
 * sinon il est planifié.
 */
export function createSprint(fields, { sprints = [], now = new Date() } = {}) {
  return {
    id: fields.id || generateId('sprint'),
    name: fields.name.trim(),
    goal: (fields.goal || '').trim(),
    startDate: fields.startDate,
    endDate: fields.endDate,
    status: getActiveSprint(sprints) ? 'planned' : 'active',
    createdAt: now.toISOString(),
    closedAt: null,
    snapshot: null,
    carryOver: null,
  };
}

/**
 * Propose les champs du sprint suivant : même durée, démarre le lendemain,
 * nom incrémenté (« Sprint 7 » → « Sprint 8 »).
 */
export function suggestNextSprint(sprint, now = new Date()) {
  if (!sprint) {
    const start = todayISO(now);
    return { name: 'Sprint 1', startDate: start, endDate: addDays(start, 13), goal: '' };
  }
  const length = Math.max(0, diffDays(sprint.startDate, sprint.endDate) ?? 13);
  const startDate = addDays(sprint.endDate, 1);
  const match = sprint.name.match(/^(.*?)(\d+)\s*$/);
  const name = match ? `${match[1]}${Number(match[2]) + 1}` : `${sprint.name} (suite)`;
  return { name, startDate, endDate: addDays(startDate, length), goal: '' };
}

/** Met à jour les champs éditables d'un sprint (nom, dates, objectif). */
export function updateSprint(sprints, sprintId, patch) {
  return sprints.map((s) => (s.id === sprintId ? { ...s, ...patch } : s));
}

/**
 * Démarre un sprint planifié. Refusé s'il y a déjà un sprint actif.
 * @returns {Array} sprints mis à jour (inchangés si refus)
 */
export function startSprint(sprints, sprintId) {
  if (getActiveSprint(sprints)) return sprints;
  return sprints.map((s) => (s.id === sprintId && s.status === 'planned' ? { ...s, status: 'active' } : s));
}

/**
 * Supprime un sprint non clôturé. Ses tâches retournent dans le backlog.
 * @returns {{ sprints: Array, tasks: Array }}
 */
export function deleteSprint({ sprints, tasks }, sprintId) {
  return {
    sprints: sprints.filter((s) => s.id !== sprintId),
    tasks: tasks.map((t) => (t.sprintId === sprintId ? { ...t, sprintId: null } : t)),
  };
}

// ============================================
// Photo du sprint (planifié / ajouté / réalisé)
// ============================================

/** Date calendaire d'entrée d'une tâche dans son sprint. */
function sprintEntryDate(task) {
  return timestampToISODate(task.sprintAssignedAt || task.createdAt);
}

/** true si la tâche faisait partie de l'engagement initial du sprint. */
export function isPlannedInSprint(task, sprint) {
  const entry = sprintEntryDate(task);
  return !entry || entry <= sprint.startDate;
}

/**
 * true si la tâche a été terminée pendant le sprint : entre sa date de début
 * et sa date de fin (ou le jour de clôture, si le sprint est clôturé en retard).
 * @param {object} task
 * @param {object} sprint
 * @param {string} [closingDate] — « YYYY-MM-DD » du jour de clôture
 */
export function isCompletedDuringSprint(task, sprint, closingDate = sprint.endDate) {
  if (task.status !== 'done') return false;
  // Tâche terminée sans date connue (données migrées) : comptée comme réalisée.
  if (!task.completedAt) return true;
  const end = closingDate > sprint.endDate ? closingDate : sprint.endDate;
  return isTimestampInRange(task.completedAt, sprint.startDate, end);
}

/**
 * Calcule la photo d'un sprint à partir des tâches qui y sont rattachées.
 * @param {object} sprint
 * @param {Array} tasks — toutes les tâches
 * @param {Date} [now] — moment de la clôture
 */
export function computeSprintSnapshot(sprint, tasks = [], now = new Date()) {
  const sprintTasks = getSprintTasks(tasks, sprint.id);
  const sum = (list, unit) => list.reduce((acc, t) => acc + taskWeight(t, unit), 0);
  const closingDate = todayISO(now);

  const planned = sprintTasks.filter((t) => isPlannedInSprint(t, sprint));
  const added = sprintTasks.filter((t) => !isPlannedInSprint(t, sprint));
  const completed = sprintTasks.filter((t) => isCompletedDuringSprint(t, sprint, closingDate));

  return {
    plannedTasks: planned.length,
    plannedPoints: sum(planned, 'points'),
    addedTasks: added.length,
    addedPoints: sum(added, 'points'),
    completedTasks: completed.length,
    completedPoints: sum(completed, 'points'),
    unfinishedTaskIds: sprintTasks.filter((t) => t.status !== 'done').map((t) => t.id),
  };
}

// ============================================
// Clôture
// ============================================

/**
 * Clôture un sprint et décide du sort des tâches non terminées.
 *
 * @param {{ sprints: Array, tasks: Array }} state
 * @param {object} options
 * @param {string} options.sprintId — sprint à clôturer
 * @param {'next'|'keep'|'backlog'} options.carryOver
 *   - 'next'    : reporter au sprint suivant (existant ou créé ici)
 *   - 'keep'    : les laisser dans le sprint clôturé
 *   - 'backlog' : les remettre dans le backlog (sans sprint)
 * @param {string} [options.nextSprintId] — sprint planifié qui reçoit le report
 * @param {object} [options.nextSprintFields] — champs d'un nouveau sprint à créer
 * @param {Date} [options.now]
 * @returns {{ sprints: Array, tasks: Array, nextSprintId: string|null }}
 */
export function closeSprint(state, { sprintId, carryOver = 'next', nextSprintId = null, nextSprintFields = null, now = new Date() }) {
  const sprint = state.sprints.find((s) => s.id === sprintId);
  if (!sprint || sprint.status === 'closed') return { ...state, nextSprintId: null };

  const nowIso = now.toISOString();
  const snapshot = computeSprintSnapshot(sprint, state.tasks, now);
  const unfinished = new Set(snapshot.unfinishedTaskIds);

  // 1. Clôturer le sprint (photo figée)
  let sprints = state.sprints.map((s) =>
    s.id === sprintId ? { ...s, status: 'closed', closedAt: nowIso, snapshot } : s
  );

  // 2. Préparer le sprint de destination si report
  let targetId = null;
  if (carryOver === 'next') {
    if (nextSprintFields) {
      const created = createSprint(nextSprintFields, { sprints, now });
      sprints = [...sprints, created];
      targetId = created.id;
    } else if (nextSprintId) {
      targetId = nextSprintId;
    } else {
      targetId = getPlannedSprints(sprints)[0]?.id || null;
    }
    // Le sprint de destination devient actif (le précédent vient d'être clôturé)
    if (targetId) {
      sprints = sprints.map((s) => (s.id === targetId ? { ...s, status: 'active' } : s));
    }
  }

  // 3. Déplacer les tâches non terminées
  const moveTo = carryOver === 'keep' ? sprintId : carryOver === 'next' ? targetId : null;
  const tasks = state.tasks.map((t) => {
    if (!unfinished.has(t.id) || moveTo === sprintId) return t;
    return { ...t, sprintId: moveTo, sprintAssignedAt: moveTo ? nowIso : null };
  });

  // 4. Mémoriser le choix sur le sprint clôturé
  sprints = sprints.map((s) =>
    s.id === sprintId ? { ...s, carryOver: { mode: carryOver, toSprintId: moveTo === sprintId ? null : moveTo } } : s
  );

  return { sprints, tasks, nextSprintId: targetId };
}
