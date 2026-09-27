/**
 * migrations.js — Migration des données sauvegardées vers le format courant.
 *
 * Historique des formats :
 *   v1 — `deadline` = nom de jour (« Lundi »…), membres/modules codés en dur,
 *        vélocité fictive, sprint unique optionnel.
 *   v2 — `dueDate` ISO, createdAt/completedAt, sprints, membres/modules dans les données.
 *   v3 — sprintAssignedAt, statut de sprint planned/active/closed,
 *        photo de sprint à la clôture, utilisateur courant dans les réglages.
 *   v4 — (actuel) catégories par défaut = phases du processus de test ISTQB.
 *
 * Principe : ne rien perdre. Les champs qui n'ont plus d'équivalent sont
 * conservés dans `legacy`, et l'ancien jour d'échéance dans `legacyDeadline`.
 */

import { DATA_VERSION, DEFAULT_MODULES, DEFAULT_SETTINGS, DEFAULT_TEAM_MEMBERS, LEGACY_DEFAULT_MODULE_IDS, PRIORITY_IDS, STATUS_IDS } from './initialData.js';
import { addDays, getWeekStart, isISODate, parseISODate, todayISO } from '../utils/dates.js';
import { normalizeEstimate } from '../utils/tasks.js';

/** Décalage depuis le lundi pour les anciens noms de jours (v1). */
const DAY_OFFSETS = {
  lundi: 0, mardi: 1, mercredi: 2, jeudi: 3, vendredi: 4, samedi: 5, dimanche: 6,
};

/** Anciens modules par défaut (v1 à v3) : les anciennes tâches y font référence. */
const LEGACY_DEFAULT_MODULES = [
  { id: 'patient', name: 'Application Patient', color: '#7c3aed' },
  { id: 'therapeute', name: 'Application Thérapeute', color: '#0284c7' },
  { id: 'ia', name: 'Services IA', color: '#c026d3' },
  { id: 'admin', name: 'Administration', color: '#d97706' },
  { id: 'backend', name: 'Backend (Spring Boot)', color: '#059669' },
];

/** Champs connus au niveau racine (le reste part dans `legacy`). */
const KNOWN_ROOT_KEYS = ['tasks', 'milestones', 'notes', 'sprints', 'teamMembers', 'modules', 'settings', 'legacy'];

// ============================================
// Détection de version
// ============================================

/**
 * Déduit la version d'une sauvegarde.
 * @param {object} payload — objet sauvegardé ({ data, version, lastSaved })
 * @returns {number}
 */
export function detectVersion(payload) {
  const declared = Number.parseFloat(payload?.version ?? payload?.data?.version);
  if (Number.isFinite(declared)) return Math.floor(declared);
  const tasks = payload?.data?.tasks || [];
  return tasks.some((t) => 'deadline' in t && !('dueDate' in t)) ? 1 : 2;
}

// ============================================
// Aides
// ============================================

/**
 * Convertit un ancien nom de jour en date réelle : le jour correspondant
 * dans la semaine où les données ont été enregistrées pour la dernière fois.
 */
export function legacyDeadlineToDueDate(deadline, referenceDate) {
  if (typeof deadline !== 'string') return null;
  if (isISODate(deadline)) return deadline;
  const offset = DAY_OFFSETS[deadline.trim().toLowerCase()];
  if (offset === undefined || !referenceDate) return null;
  return addDays(getWeekStart(referenceDate), offset);
}

/** Horodatage ISO correspondant à minuit (heure locale) d'une date « YYYY-MM-DD ». */
function startOfDayTimestamp(isoDate) {
  const d = parseISODate(isoDate);
  return d ? d.toISOString() : null;
}

/** Sépare les champs inconnus pour les ranger dans `legacy`. */
function splitLegacy(data) {
  const legacy = { ...(data.legacy || {}) };
  Object.keys(data).forEach((key) => {
    if (!KNOWN_ROOT_KEYS.includes(key) && key !== 'version') legacy[key] = data[key];
  });
  return legacy;
}

// ============================================
// v1 → v2
// ============================================

function migrateV1toV2(oldData, { savedAt, now }) {
  const referenceDate = savedAt ? todayISO(new Date(savedAt)) : todayISO(now);
  const nowIso = now.toISOString();

  // Ancien sprint unique (s'il avait des dates exploitables)
  const old = oldData.sprint;
  const sprint = old && isISODate(old.startDate) && isISODate(old.endDate)
    ? {
        id: old.id || 'sprint-migre',
        name: old.name || 'Sprint migré',
        goal: old.goal || '',
        startDate: old.startDate,
        endDate: old.endDate,
        status: 'active',
        createdAt: startOfDayTimestamp(old.startDate),
        closedAt: null,
      }
    : null;

  const tasks = (oldData.tasks || []).map((task) => {
    const { deadline, ...rest } = task;
    const migrated = {
      ...rest,
      description: task.description || '',
      dueDate: task.dueDate || legacyDeadlineToDueDate(deadline, referenceDate),
      createdAt: task.createdAt || (savedAt ? new Date(savedAt).toISOString() : nowIso),
      // Date de fin inconnue : on ne l'invente pas (sinon « terminées cette semaine » serait faux)
      completedAt: task.completedAt || null,
      estimate: task.estimate ?? null,
      sprintId: task.sprintId || sprint?.id || null,
    };
    if (deadline !== undefined) migrated.legacyDeadline = deadline;
    return migrated;
  });

  const legacy = splitLegacy(oldData);
  delete legacy.sprint; // converti en vrai sprint ci-dessus
  if (old && !sprint) legacy.sprint = old; // sprint sans dates : conservé tel quel

  return {
    tasks,
    milestones: oldData.milestones || [],
    notes: oldData.notes || [],
    sprints: sprint ? [sprint] : [],
    // En v1, membres et modules étaient codés en dur : on reprend cette configuration
    teamMembers: DEFAULT_TEAM_MEMBERS.map((m) => ({ ...m })),
    modules: LEGACY_DEFAULT_MODULES.map((m) => ({ ...m })),
    settings: { ...DEFAULT_SETTINGS, ...(oldData.settings || {}) },
    legacy,
  };
}

// ============================================
// v2 → v3
// ============================================

function migrateV2toV3(data, { savedAt, now }) {
  const referenceDate = savedAt ? todayISO(new Date(savedAt)) : todayISO(now);
  // Les anciens champs de sprint (ex. `plannedTaskIds`) sont conservés tels quels
  const sprints = (data.sprints || []).map((s) => ({
    snapshot: null,
    carryOver: null,
    ...s,
    status: s.status === 'closed' ? 'closed' : s.status || 'active',
  }));
  const sprintById = new Map(sprints.map((s) => [s.id, s]));

  const tasks = (data.tasks || []).map((task) => {
    const { deadline, ...rest } = task;
    const sprint = sprintById.get(task.sprintId);
    const migrated = {
      ...rest,
      dueDate: task.dueDate || legacyDeadlineToDueDate(deadline, referenceDate),
      // Entrée dans le sprint inconnue : on considère la tâche comme planifiée dès le début
      sprintAssignedAt: task.sprintAssignedAt || (sprint ? startOfDayTimestamp(sprint.startDate) : null),
    };
    if (deadline !== undefined && !task.legacyDeadline) migrated.legacyDeadline = deadline;
    return migrated;
  });

  return {
    ...data,
    tasks,
    sprints,
    // v1/v2 partiels sans membres ni modules : configuration de départ
    teamMembers: data.teamMembers || DEFAULT_TEAM_MEMBERS.map((m) => ({ ...m })),
    modules: data.modules || LEGACY_DEFAULT_MODULES.map((m) => ({ ...m })),
    settings: { ...DEFAULT_SETTINGS, ...(data.settings || {}) },
  };
}

// ============================================
// v3 → v4
// ============================================

/**
 * Remplace les anciens modules par défaut (applications Theraply) par les
 * phases de test ISTQB, UNIQUEMENT s'ils n'ont pas été modifiés et qu'aucune
 * tâche ni aucun jalon ne les utilise. Sinon, rien ne change.
 */
function migrateV3toV4(data) {
  const modules = data.modules || [];
  const ids = modules.map((m) => m.id);
  const untouched = ids.length === LEGACY_DEFAULT_MODULE_IDS.length && LEGACY_DEFAULT_MODULE_IDS.every((id) => ids.includes(id));
  const used = [...(data.tasks || []), ...(data.milestones || [])].some((item) => ids.includes(item.module));
  if (!untouched || used) return data;
  return { ...data, modules: DEFAULT_MODULES.map((m) => ({ ...m })) };
}

// ============================================
// Normalisation finale (toujours appliquée)
// ============================================

/**
 * Garantit la forme attendue du format courant, quelles que soient les
 * données reçues (import d'un fichier modifié à la main, etc.).
 */
export function normalizeData(data, now = new Date()) {
  const nowIso = now.toISOString();
  const legacy = splitLegacy(data);

  const tasks = (data.tasks || [])
    .filter((t) => t && t.id)
    .map((t) => ({
      ...t,
      title: String(t.title ?? ''),
      description: t.description || '',
      assignee: t.assignee || null,
      module: t.module || null,
      priority: PRIORITY_IDS.includes(t.priority) ? t.priority : 'moyenne',
      status: STATUS_IDS.includes(t.status) ? t.status : 'todo',
      dueDate: isISODate(t.dueDate) ? t.dueDate : null,
      estimate: normalizeEstimate(t.estimate),
      sprintId: t.sprintId || null,
      createdAt: t.createdAt || nowIso,
      completedAt: t.status === 'done' ? t.completedAt || null : null,
      sprintAssignedAt: t.sprintId ? t.sprintAssignedAt || null : null,
    }));

  // Un seul sprint actif : si plusieurs, on garde le plus récent actif
  const sprints = (data.sprints || []).filter((s) => s && s.id);
  const actives = sprints.filter((s) => s.status === 'active').sort((a, b) => b.startDate.localeCompare(a.startDate));
  const keepActiveId = actives[0]?.id;

  return {
    tasks,
    milestones: (data.milestones || []).map((ms) => ({
      completedAt: null,
      dueDate: null,
      ...ms,
      module: ms.module || null,
      completed: !!ms.completed,
    })),
    notes: data.notes || [],
    sprints: sprints.map((s) => ({
      goal: '',
      closedAt: null,
      snapshot: null,
      carryOver: null,
      ...s,
      status: s.status === 'active' && s.id !== keepActiveId ? 'planned' : s.status,
    })),
    teamMembers: data.teamMembers || [],
    modules: data.modules || [],
    settings: { ...DEFAULT_SETTINGS, ...(data.settings || {}) },
    ...(Object.keys(legacy).length > 0 ? { legacy } : {}),
  };
}

// ============================================
// Point d'entrée
// ============================================

/**
 * Migre une sauvegarde (quelle que soit sa version) vers le format courant.
 * @param {object} payload — { data, version, lastSaved | exportedAt }
 * @param {{ now?: Date }} options
 * @returns {{ data: object, fromVersion: number, migrated: boolean }}
 */
export function migratePayload(payload, { now = new Date() } = {}) {
  const fromVersion = detectVersion(payload);
  const savedAt = payload?.lastSaved || payload?.exportedAt || null;
  const ctx = { savedAt, now };

  let data = payload?.data || {};
  if (fromVersion < 2) data = migrateV1toV2(data, ctx);
  if (fromVersion < 3) data = migrateV2toV3(data, ctx);
  if (fromVersion < 4) data = migrateV3toV4(data);

  return {
    data: normalizeData(data, now),
    fromVersion,
    migrated: fromVersion < DATA_VERSION,
  };
}
