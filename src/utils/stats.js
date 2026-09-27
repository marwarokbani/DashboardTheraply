/**
 * stats.js — Statistiques du dashboard, 100 % dérivées des données saisies.
 *
 * Principes :
 * - fonctions pures : mêmes entrées → mêmes sorties, aucune valeur codée en dur ;
 * - chaque fonction qui dépend du jour reçoit `now` (testable) ;
 * - quand les données ne suffisent pas, on renvoie un état vide explicite
 *   (`hasData: false`, `percent: null`, `trend: null`…) plutôt qu'un faux zéro.
 *
 * Unité de mesure (`unit`) : 'tasks' (nombre de tâches) ou 'points'
 * (somme des estimations). Voir taskWeight() dans tasks.js.
 */

import { STATUSES, PRIORITY_IDS } from '../data/initialData.js';
import {
  addDays, diffDays, eachDay, formatDateShort, getWeekRange, isTimestampInRange,
  timestampToISODate, todayISO,
} from './dates.js';
import { isDone, isOverdue, taskWeight } from './tasks.js';
import { computeSprintSnapshot, getActiveSprint, getClosedSprints, getSprintTasks } from './sprints.js';

// ============================================
// Aides internes
// ============================================

/** Somme des poids d'une liste de tâches. */
function sumWeight(tasks, unit) {
  return tasks.reduce((acc, t) => acc + taskWeight(t, unit), 0);
}

/** Pourcentage arrondi, ou null si le total est nul. */
function percentOf(part, total) {
  return total > 0 ? Math.round((part / total) * 100) : null;
}

/**
 * Tendance entre deux valeurs.
 * @returns {{ delta: number, percent: number|null }} percent = null si la valeur précédente est 0
 */
export function computeTrend(current, previous) {
  return {
    delta: current - previous,
    percent: previous > 0 ? Math.round(((current - previous) / previous) * 100) : null,
  };
}

/** Date calendaire à laquelle une tâche est devenue « Terminé » (null si inconnue ou non terminée). */
function completionDate(task) {
  return isDone(task) ? timestampToISODate(task.completedAt) : null;
}

/**
 * La tâche était-elle terminée à la fin du jour `day` ?
 * Une tâche terminée sans date connue (données migrées) est considérée
 * terminée depuis toujours.
 */
function wasDoneBy(task, day) {
  if (!isDone(task)) return false;
  const done = completionDate(task);
  return !done || done <= day;
}

/** La tâche existait-elle à la fin du jour `day` ? */
function existedBy(task, day) {
  const created = timestampToISODate(task.createdAt);
  return !created || created <= day;
}

/** Ordre de tri « urgence » : échéance la plus ancienne puis priorité la plus haute. */
function byUrgency(a, b) {
  const dateOrder = (a.dueDate || '9999').localeCompare(b.dueDate || '9999');
  return dateOrder || PRIORITY_IDS.indexOf(a.priority) - PRIORITY_IDS.indexOf(b.priority);
}

// ============================================
// Périmètre (filtre global par sprint)
// ============================================

/**
 * Sélectionne les tâches du périmètre choisi.
 * @param {object} data
 * @param {'active'|'all'|'backlog'|string} scope — sprint actif, tout le projet, backlog, ou id d'un sprint
 * @returns {{ tasks: Array, sprint: object|null, scope: string, label: string }}
 */
export function getScope(data, scope = 'active') {
  const { tasks = [], sprints = [] } = data;
  if (scope === 'all') return { tasks, sprint: null, scope: 'all', label: 'Tout le projet' };
  if (scope === 'backlog') return { tasks: tasks.filter((t) => !t.sprintId), sprint: null, scope: 'backlog', label: 'Backlog' };

  const sprint = scope === 'active' ? getActiveSprint(sprints) : sprints.find((s) => s.id === scope) || null;
  // Pas de sprint actif : on retombe sur tout le projet
  if (!sprint) return { tasks, sprint: null, scope: 'all', label: 'Tout le projet' };
  return { tasks: getSprintTasks(tasks, sprint.id), sprint, scope: sprint.id, label: sprint.name };
}

// ============================================
// KPI 1 — Avancement
// ============================================

/**
 * Avancement = terminées / total, avec tendance vs il y a 7 jours
 * (avancement reconstitué à la fin du même jour la semaine précédente).
 * @returns {{ done, total, percent: number|null, trend: {delta, percent}|null }}
 */
export function calcProgress(tasks = [], { unit = 'tasks', now = new Date() } = {}) {
  const total = sumWeight(tasks, unit);
  const done = sumWeight(tasks.filter(isDone), unit);
  const percent = percentOf(done, total);

  const lastWeek = addDays(todayISO(now), -7);
  const existing = tasks.filter((t) => existedBy(t, lastWeek));
  const previousPercent = percentOf(sumWeight(existing.filter((t) => wasDoneBy(t, lastWeek)), unit), sumWeight(existing, unit));

  return {
    done,
    total,
    percent,
    // Tendance en points de pourcentage (ex. 40 % → 55 % = +15)
    trend: percent !== null && previousPercent !== null ? { delta: percent - previousPercent, percent: null } : null,
  };
}

// ============================================
// KPI 2 — Terminées cette semaine
// ============================================

/**
 * Tâches passées à « Terminé » cette semaine (lundi → dimanche, selon completedAt),
 * comparées à la semaine précédente.
 * @returns {{ count, previous, tasks: Array, trend: {delta, percent} }}
 */
export function calcCompletedThisWeek(tasks = [], { now = new Date() } = {}) {
  const thisWeek = getWeekRange(now, 0);
  const lastWeek = getWeekRange(now, -1);
  const completedIn = (range) => tasks.filter((t) => isDone(t) && isTimestampInRange(t.completedAt, range.start, range.end));

  const current = completedIn(thisWeek);
  const previous = completedIn(lastWeek).length;
  return { count: current.length, previous, tasks: current, trend: computeTrend(current.length, previous) };
}

// ============================================
// KPI 3 — En retard
// ============================================

/**
 * Tâches en retard : échéance < aujourd'hui ET non terminées.
 * Tendance : nombre de tâches qui étaient en retard il y a 7 jours.
 * @returns {{ count, tasks: Array (triées par urgence), previous, trend }}
 */
export function calcOverdue(tasks = [], { now = new Date() } = {}) {
  const overdue = tasks.filter((t) => isOverdue(t, now)).sort(byUrgency);

  const lastWeek = addDays(todayISO(now), -7);
  const previous = tasks.filter(
    (t) => t.dueDate && t.dueDate < lastWeek && existedBy(t, lastWeek) && !wasDoneBy(t, lastWeek)
  ).length;

  return { count: overdue.length, tasks: overdue, previous, trend: computeTrend(overdue.length, previous) };
}

// ============================================
// Échéances proches
// ============================================

/**
 * Tâches non terminées à échéance aujourd'hui, et dans les N jours suivants.
 * @returns {{ today: Array, upcoming: Array }}
 */
export function calcDueSoon(tasks = [], { now = new Date(), days = 3 } = {}) {
  const today = todayISO(now);
  const limit = addDays(today, days);
  const open = tasks.filter((t) => !isDone(t) && t.dueDate);
  return {
    today: open.filter((t) => t.dueDate === today).sort(byUrgency),
    upcoming: open.filter((t) => t.dueDate > today && t.dueDate <= limit).sort(byUrgency),
  };
}

/**
 * « À traiter aujourd'hui » : tâches en retard puis échéances du jour.
 * @returns {Array<{ task, reason: 'overdue'|'today' }>}
 */
export function getTodayFocus(tasks = [], { now = new Date() } = {}) {
  const overdue = calcOverdue(tasks, { now }).tasks.map((task) => ({ task, reason: 'overdue' }));
  const today = calcDueSoon(tasks, { now, days: 0 }).today.map((task) => ({ task, reason: 'today' }));
  return [...overdue, ...today];
}

// ============================================
// KPI 4 — Jours restants
// ============================================

/**
 * Chronologie du sprint : jours restants, part du temps écoulé,
 * et écart avec l'avancement (en avance / en retard sur le planning).
 * @param {object|null} sprint
 * @param {number|null} progressPercent — avancement du sprint
 * @returns {{ hasData, daysRemaining, totalDays, elapsedPercent, phase, scheduleGap }}
 */
export function calcSprintTimeline(sprint, progressPercent = null, { now = new Date() } = {}) {
  if (!sprint) return { hasData: false, daysRemaining: null, totalDays: null, elapsedPercent: null, phase: null, scheduleGap: null };

  const today = todayISO(now);
  const totalDays = diffDays(sprint.startDate, sprint.endDate) + 1;
  const elapsedDays = Math.min(totalDays, Math.max(0, diffDays(sprint.startDate, today) + 1));
  const phase = today < sprint.startDate ? 'upcoming' : today > sprint.endDate ? 'ended' : 'running';
  const elapsedPercent = phase === 'upcoming' ? 0 : Math.round((elapsedDays / totalDays) * 100);

  return {
    hasData: true,
    // Jours restants en comptant aujourd'hui (le dernier jour du sprint compte pour 1)
    daysRemaining: phase === 'ended' ? 0 : phase === 'upcoming' ? totalDays : diffDays(today, sprint.endDate) + 1,
    totalDays,
    elapsedPercent,
    phase,
    // > 0 : en avance sur le rythme idéal ; < 0 : en retard
    scheduleGap: progressPercent !== null && phase === 'running' ? progressPercent - elapsedPercent : null,
  };
}

// ============================================
// Burndown
// ============================================

/**
 * Burndown d'un sprint, jour par jour (jours calendaires).
 *
 * - `ideal`     : droite de l'engagement initial (tâches entrées au plus tard
 *                 le premier jour) jusqu'à 0 le dernier jour ;
 * - `remaining` : reste à faire réel à la fin de chaque jour, reconstruit à
 *                 partir de sprintAssignedAt et completedAt (null dans le futur) ;
 * - `scope`     : périmètre total du sprint ce jour-là (montre les ajouts).
 *
 * @returns {{ hasData: boolean, points: Array<{ date, label, ideal, remaining, scope }>, planned: number }}
 */
export function calcBurndown(sprint, tasks = [], { unit = 'tasks', now = new Date() } = {}) {
  const empty = { hasData: false, points: [], planned: 0 };
  if (!sprint?.startDate || !sprint?.endDate) return empty;

  const sprintTasks = getSprintTasks(tasks, sprint.id);
  if (sprintTasks.length === 0) return empty;

  const days = eachDay(sprint.startDate, sprint.endDate);
  const today = todayISO(now);
  const entryDate = (t) => timestampToISODate(t.sprintAssignedAt || t.createdAt) || sprint.startDate;
  const planned = sumWeight(sprintTasks.filter((t) => entryDate(t) <= sprint.startDate), unit);
  const steps = Math.max(1, days.length - 1);

  const points = days.map((day, index) => {
    const inScope = sprintTasks.filter((t) => entryDate(t) <= day);
    const scope = sumWeight(inScope, unit);
    const remaining = sumWeight(inScope.filter((t) => !wasDoneBy(t, day)), unit);
    return {
      date: day,
      label: formatDateShort(day),
      ideal: Math.round((planned - (planned / steps) * index) * 10) / 10,
      remaining: day <= today ? remaining : null,
      scope: day <= today ? scope : null,
    };
  });

  return { hasData: planned > 0 || points.some((p) => p.scope > 0), points, planned };
}

// ============================================
// Vélocité
// ============================================

/**
 * Vélocité des sprints clôturés : planifié (engagement au début du sprint)
 * vs réalisé (terminées pendant le sprint). Utilise la photo figée à la
 * clôture ; la recalcule pour les anciens sprints qui n'en ont pas.
 *
 * @returns {{ hasData, rows: Array<{ sprintId, name, planned, added, completed }>, average: number|null }}
 */
export function calcVelocity(sprints = [], tasks = [], { unit = 'tasks', lastN = 3 } = {}) {
  const closed = getClosedSprints(sprints);
  if (closed.length === 0) return { hasData: false, rows: [], average: null };

  const key = unit === 'points' ? 'Points' : 'Tasks';
  const rows = closed.map((sprint) => {
    const snap = sprint.snapshot || computeSprintSnapshot(sprint, tasks, new Date(sprint.closedAt || `${sprint.endDate}T23:59:59`));
    return {
      sprintId: sprint.id,
      name: sprint.name,
      planned: snap[`planned${key}`],
      added: snap[`added${key}`],
      completed: snap[`completed${key}`],
    };
  });

  const recent = rows.slice(-lastN);
  const average = Math.round((recent.reduce((acc, r) => acc + r.completed, 0) / recent.length) * 10) / 10;
  return { hasData: true, rows, average };
}

// ============================================
// Répartition des statuts
// ============================================

/** @returns {{ hasData, items: Array<{ id, label, count, percent }> }} */
export function calcStatusDistribution(tasks = [], { unit = 'tasks' } = {}) {
  const total = sumWeight(tasks, unit);
  const items = STATUSES.map((status) => {
    const count = sumWeight(tasks.filter((t) => t.status === status.id), unit);
    return { id: status.id, label: status.label, count, percent: percentOf(count, total) ?? 0 };
  });
  return { hasData: total > 0, items, total };
}

// ============================================
// Progression par module
// ============================================

/**
 * Progression de chaque module, selon les tâches terminées ou les jalons cochés.
 * Une ligne « Sans module » est ajoutée s'il existe des éléments orphelins.
 * @param {'tasks'|'milestones'} mode
 * @returns {{ hasData, items: Array<{ id, name, color, completed, total, percent: number|null }> }}
 */
export function calcModuleProgress(modules = [], { tasks = [], milestones = [], mode = 'tasks', unit = 'tasks' } = {}) {
  const items = mode === 'milestones' ? milestones : tasks;
  const isComplete = mode === 'milestones' ? (ms) => ms.completed : isDone;
  const weight = mode === 'milestones' ? () => 1 : (t) => taskWeight(t, unit);
  const known = new Set(modules.map((m) => m.id));

  const row = (id, name, color, list) => {
    const total = list.reduce((acc, item) => acc + weight(item), 0);
    const completed = list.filter(isComplete).reduce((acc, item) => acc + weight(item), 0);
    return { id, name, color, completed, total, percent: percentOf(completed, total) };
  };

  const rows = modules.map((m) => row(m.id, m.name, m.color, items.filter((i) => i.module === m.id)));
  const orphans = items.filter((i) => !known.has(i.module));
  if (orphans.length > 0) rows.push(row(null, 'Sans module', 'var(--status-todo)', orphans));

  return { hasData: rows.some((r) => r.total > 0), items: rows };
}

// ============================================
// Charge et complétion par membre
// ============================================

/**
 * Pour chaque membre : répartition par statut, tâches ouvertes, en retard,
 * taux de complétion. Une ligne « Non assignée » s'ajoute si besoin.
 * @returns {{ hasData, items: Array<{ id, name, color, total, todo, inProgress, inReview, done, open, overdue, completion, currentTasks }> }}
 */
export function calcWorkloadByMember(tasks = [], teamMembers = [], { unit = 'tasks', now = new Date() } = {}) {
  const known = new Set(teamMembers.map((m) => m.id));

  const row = (id, name, color, list) => {
    const count = (status) => sumWeight(list.filter((t) => t.status === status), unit);
    const total = sumWeight(list, unit);
    const done = count('done');
    return {
      id,
      name,
      color,
      total,
      todo: count('todo'),
      inProgress: count('in-progress'),
      inReview: count('in-review'),
      done,
      open: total - done,
      overdue: list.filter((t) => isOverdue(t, now)).length,
      completion: percentOf(done, total),
      currentTasks: list.filter((t) => t.status === 'in-progress'),
    };
  };

  const items = teamMembers.map((m) => row(m.id, m.name, m.color, tasks.filter((t) => t.assignee === m.id)));
  const unassigned = tasks.filter((t) => !known.has(t.assignee));
  if (unassigned.length > 0) items.push(row(null, 'Non assignée', 'var(--status-todo)', unassigned));

  return { hasData: tasks.length > 0 && items.some((i) => i.total > 0), items };
}

// ============================================
// Calendrier
// ============================================

/**
 * Tâches d'une semaine réparties par jour (lundi → dimanche) :
 * une tâche terminée apparaît le jour où elle a été terminée (completedAt),
 * les autres à leur échéance (dueDate).
 * @param {number} weekOffset — 0 = semaine courante, -1 = précédente, 1 = suivante
 * @returns {Object<string, Array>} { "YYYY-MM-DD": [tâches] }
 */
export function calcTasksByDate(tasks = [], now = new Date(), weekOffset = 0) {
  const { start, end } = getWeekRange(now, weekOffset);
  const byDate = Object.fromEntries(eachDay(start, end).map((d) => [d, []]));
  tasks.forEach((task) => {
    const date = isDone(task) ? timestampToISODate(task.completedAt) || task.dueDate : task.dueDate;
    if (date && byDate[date]) byDate[date].push(task);
  });
  return byDate;
}

// ============================================
// Progression dans le temps
// ============================================

/**
 * Évolution jour par jour sur les N derniers jours : nombre de tâches
 * existantes (total) et terminées (cumul), reconstruit à partir de
 * createdAt et completedAt.
 * @returns {{ hasData: boolean, points: Array<{ date, label, total, done, percent }> }}
 */
export function calcProgressOverTime(tasks = [], { days = 30, now = new Date() } = {}) {
  if (tasks.length === 0) return { hasData: false, points: [] };
  const today = todayISO(now);
  // On démarre au plus tôt à la création de la première tâche
  const firstCreated = tasks.map((t) => timestampToISODate(t.createdAt)).filter(Boolean).sort()[0] || today;
  const windowStart = addDays(today, -(days - 1));
  const start = firstCreated > windowStart ? firstCreated : windowStart;

  const points = eachDay(start, today).map((day) => {
    const existing = tasks.filter((t) => existedBy(t, day));
    const done = existing.filter((t) => wasDoneBy(t, day)).length;
    return { date: day, label: formatDateShort(day), total: existing.length, done, percent: percentOf(done, existing.length) ?? 0 };
  });
  return { hasData: true, points };
}
