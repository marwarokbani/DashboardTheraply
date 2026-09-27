/**
 * Tests du modèle de données : dates locales, règles des tâches,
 * sprints (clôture + report), migration v1/v2 → v3, saisie rapide.
 * Lancer avec : npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { todayISO, addDays, getWeekStart, getWeekRange, timestampToISODate, diffDays, isISODate } from '../src/utils/dates.js';
import { applyTaskRules, createTask, isOverdue } from '../src/utils/tasks.js';
import { closeSprint, computeSprintSnapshot, createSprint, suggestNextSprint, validateSprint } from '../src/utils/sprints.js';
import { removeMember, removeModule } from '../src/utils/team.js';
import { migratePayload, detectVersion, legacyDeadlineToDueDate } from '../src/data/migrations.js';
import { parseQuickTask } from '../src/utils/parseQuickTask.js';
import { getDemoState } from '../src/data/demoData.js';

// Samedi 26 septembre 2026, 00:30 heure locale (cas piège UTC+1)
const NOW = new Date(2026, 8, 26, 0, 30);
const at = (y, m, d, h = 12) => new Date(y, m - 1, d, h).toISOString();

// ============================================
// Dates
// ============================================

test('todayISO utilise la date locale, pas UTC', () => {
  assert.equal(todayISO(NOW), '2026-09-26');
});

test('addDays, diffDays et getWeekStart', () => {
  assert.equal(addDays('2026-09-30', 1), '2026-10-01');
  assert.equal(diffDays('2026-09-21', '2026-10-04'), 13);
  assert.equal(getWeekStart('2026-09-27'), '2026-09-21'); // dimanche → lundi précédent
  assert.deepEqual(getWeekRange(NOW, -1), { start: '2026-09-14', end: '2026-09-20' });
  assert.equal(isISODate('2026-02-30'), false);
});

test('timestampToISODate convertit en date locale', () => {
  assert.equal(timestampToISODate(new Date(2026, 8, 26, 0, 10).toISOString()), '2026-09-26');
});

// ============================================
// Tâches
// ============================================

test('completedAt est rempli au passage à Terminé et vidé au retour', () => {
  const t = createTask({ title: 'A' }, { now: NOW });
  const done = applyTaskRules([t], [{ ...t, status: 'done' }], NOW);
  assert.equal(done[0].completedAt, NOW.toISOString());
  const back = applyTaskRules(done, [{ ...done[0], status: 'in-progress' }], NOW);
  assert.equal(back[0].completedAt, null);
});

test('changer de sprint met à jour sprintAssignedAt', () => {
  const t = createTask({ title: 'A' }, { now: NOW });
  const moved = applyTaskRules([t], [{ ...t, sprintId: 's1' }], NOW);
  assert.equal(moved[0].sprintAssignedAt, NOW.toISOString());
  const backlog = applyTaskRules(moved, [{ ...moved[0], sprintId: null }], NOW);
  assert.equal(backlog[0].sprintAssignedAt, null);
});

test('applyTaskRules renvoie la même liste si rien ne change', () => {
  const tasks = [createTask({ title: 'A' }, { now: NOW })];
  assert.equal(applyTaskRules(tasks, tasks, NOW), tasks);
});

test('en retard = échéance passée et non terminée', () => {
  assert.equal(isOverdue({ status: 'todo', dueDate: '2026-09-25' }, NOW), true);
  assert.equal(isOverdue({ status: 'todo', dueDate: '2026-09-26' }, NOW), false);
  assert.equal(isOverdue({ status: 'done', dueDate: '2026-09-01' }, NOW), false);
});

// ============================================
// Sprints
// ============================================

function sprintFixture() {
  const sprint = { ...createSprint({ name: 'Sprint 7', startDate: '2026-09-21', endDate: '2026-10-04' }, { now: NOW }), id: 's7' };
  const tasks = [
    { id: 'a', status: 'done', sprintId: 's7', estimate: 3, sprintAssignedAt: at(2026, 9, 21, 9), completedAt: at(2026, 9, 23) },
    { id: 'b', status: 'todo', sprintId: 's7', estimate: 5, sprintAssignedAt: at(2026, 9, 21, 9), completedAt: null },
    { id: 'c', status: 'in-progress', sprintId: 's7', estimate: 2, sprintAssignedAt: at(2026, 9, 24), completedAt: null },
    { id: 'z', status: 'todo', sprintId: null },
  ];
  return { sprint, tasks };
}

test('validateSprint refuse une fin avant le début', () => {
  assert.match(validateSprint({ name: 'X', startDate: '2026-10-01', endDate: '2026-09-01' }), /après/);
  assert.equal(validateSprint({ name: 'X', startDate: '2026-09-01', endDate: '2026-09-14' }), null);
});

test('suggestNextSprint incrémente le nom et garde la durée', () => {
  const next = suggestNextSprint({ name: 'Sprint 7', startDate: '2026-09-21', endDate: '2026-10-04' });
  assert.deepEqual(next, { name: 'Sprint 8', startDate: '2026-10-05', endDate: '2026-10-18', goal: '' });
});

test('photo de sprint : planifiées vs ajoutées vs réalisées', () => {
  const { sprint, tasks } = sprintFixture();
  const snap = computeSprintSnapshot(sprint, tasks, new Date(2026, 9, 4, 18));
  assert.equal(snap.plannedTasks, 2);
  assert.equal(snap.plannedPoints, 8);
  assert.equal(snap.addedTasks, 1);
  assert.equal(snap.completedTasks, 1);
  assert.equal(snap.completedPoints, 3);
  assert.deepEqual(snap.unfinishedTaskIds, ['b', 'c']);
});

test('clôture avec report : les tâches non terminées rejoignent le nouveau sprint actif', () => {
  const { sprint, tasks } = sprintFixture();
  const now = new Date(2026, 9, 4, 18);
  const result = closeSprint(
    { sprints: [sprint], tasks },
    { sprintId: 's7', carryOver: 'next', nextSprintFields: suggestNextSprint(sprint), now }
  );
  const closed = result.sprints.find((s) => s.id === 's7');
  const next = result.sprints.find((s) => s.id === result.nextSprintId);
  assert.equal(closed.status, 'closed');
  assert.equal(closed.snapshot.plannedTasks, 2); // la photo survit au report
  assert.equal(next.status, 'active');
  assert.equal(result.tasks.find((t) => t.id === 'b').sprintId, next.id);
  assert.equal(result.tasks.find((t) => t.id === 'a').sprintId, 's7'); // terminée : reste
  assert.equal(result.tasks.find((t) => t.id === 'z').sprintId, null); // backlog intact
});

test('clôture en laissant les tâches : rien ne bouge', () => {
  const { sprint, tasks } = sprintFixture();
  const result = closeSprint({ sprints: [sprint], tasks }, { sprintId: 's7', carryOver: 'keep', now: NOW });
  assert.equal(result.tasks.find((t) => t.id === 'b').sprintId, 's7');
  assert.equal(result.nextSprintId, null);
});

// ============================================
// Membres et modules
// ============================================

test('supprimer un membre désassigne ses tâches et change « moi » si besoin', () => {
  const state = {
    teamMembers: [{ id: 'm1', name: 'A' }, { id: 'm2', name: 'B' }],
    tasks: [{ id: 't', assignee: 'm1' }],
    settings: { currentUserId: 'm1' },
  };
  const r = removeMember(state, 'm1');
  assert.equal(r.tasks[0].assignee, null);
  assert.equal(r.settings.currentUserId, 'm2');
});

test('supprimer un module retire la référence des tâches et jalons', () => {
  const r = removeModule({ modules: [{ id: 'x' }], tasks: [{ id: 't', module: 'x' }], milestones: [{ id: 'j', module: 'x' }] }, 'x');
  assert.equal(r.tasks[0].module, null);
  assert.equal(r.milestones[0].module, null);
});

// ============================================
// Migration
// ============================================

const V1_PAYLOAD = {
  lastSaved: at(2026, 9, 24), // jeudi de la semaine du 21/09
  data: {
    tasks: [
      { id: 't1', title: 'API RDV', assignee: 'sahar', module: 'backend', priority: 'haute', deadline: 'Mercredi', status: 'done' },
      { id: 't2', title: 'Maquettes', assignee: 'marwa', module: 'patient', priority: 'basse', deadline: 'Vendredi', status: 'todo' },
      { id: 't3', title: 'Sans jour', deadline: 'Bientôt', status: 'todo' },
    ],
    milestones: [{ id: 'm1', module: 'patient', title: 'Auth', completed: true }],
    notes: [{ id: 'n1', author: 'marwa', text: 'Note', timestamp: at(2026, 9, 22), type: 'note' }],
    velocity: [{ sprint: 'S1', planifie: 10, realise: 8 }],
  },
};

test('détection de version', () => {
  assert.equal(detectVersion(V1_PAYLOAD), 1);
  assert.equal(detectVersion({ version: '2.0', data: {} }), 2);
  assert.equal(detectVersion({ version: 3, data: {} }), 3);
});

test('ancien jour → date de la semaine de dernière sauvegarde', () => {
  assert.equal(legacyDeadlineToDueDate('Mercredi', '2026-09-24'), '2026-09-23');
  assert.equal(legacyDeadlineToDueDate('Bientôt', '2026-09-24'), null);
});

test('migration v1 → v3 sans perte', () => {
  const { data, fromVersion, migrated } = migratePayload(V1_PAYLOAD, { now: NOW });
  assert.equal(fromVersion, 1);
  assert.equal(migrated, true);
  assert.equal(data.tasks.length, 3);
  const [t1, t2, t3] = data.tasks;
  assert.equal(t1.dueDate, '2026-09-23');
  assert.equal(t1.legacyDeadline, 'Mercredi');
  assert.equal(t1.completedAt, null); // date de fin inconnue : pas inventée
  assert.equal(t2.dueDate, '2026-09-25');
  assert.equal(t3.dueDate, null);
  assert.equal(t3.legacyDeadline, 'Bientôt'); // conservé pour correction manuelle
  assert.equal(data.teamMembers.length, 2);
  assert.equal(data.modules.length, 5);
  assert.deepEqual(data.legacy.velocity, V1_PAYLOAD.data.velocity); // rien n'est perdu
  assert.equal(data.notes.length, 1);
  assert.equal(data.milestones[0].completed, true);
});

test('migration v2 → v3 : sprintAssignedAt, statut et réglages', () => {
  const payload = {
    version: '2.0',
    data: {
      tasks: [{ id: 't', title: 'X', status: 'todo', sprintId: 's7', dueDate: '2026-09-30', createdAt: at(2026, 9, 22) }],
      sprints: [{ id: 's7', name: 'Sprint 7', startDate: '2026-09-21', endDate: '2026-10-04', status: 'active', plannedTaskIds: ['t'] }],
      teamMembers: [{ id: 'marwa', name: 'Marwa', role: '', color: '#000', avatar: 'M' }],
      modules: [],
      settings: { autoSave: false },
    },
  };
  const { data } = migratePayload(payload, { now: NOW });
  assert.equal(timestampToISODate(data.tasks[0].sprintAssignedAt), '2026-09-21');
  assert.equal(data.sprints[0].status, 'active');
  assert.deepEqual(data.sprints[0].plannedTaskIds, ['t']); // ancien champ conservé
  assert.equal(data.settings.autoSave, false);
  assert.equal(data.settings.currentUserId, 'marwa');
});

test('les données v4 restent identiques après migration', () => {
  const demo = getDemoState(NOW);
  const { data, migrated } = migratePayload({ version: 4, data: demo }, { now: NOW });
  assert.equal(migrated, false);
  assert.deepEqual(data, demo);
});

// ============================================
// Saisie rapide
// ============================================

const CONTEXT = {
  teamMembers: [{ id: 'marwa', name: 'Marwa' }, { id: 'sahar', name: 'Sahar' }],
  modules: [{ id: 'backend', name: 'Backend (Spring Boot)' }, { id: 'therapeute', name: 'Application Thérapeute' }],
  defaults: { assignee: 'marwa', module: null, sprintId: 's7' },
  now: NOW,
};

test("saisie rapide complète : « Écrire l'API RDV @sahar #backend !haute 30/09 »", () => {
  const r = parseQuickTask("Écrire l'API RDV @sahar #backend !haute 30/09", CONTEXT);
  assert.equal(r.title, "Écrire l'API RDV");
  assert.equal(r.assignee, 'sahar');
  assert.equal(r.module, 'backend');
  assert.equal(r.priority, 'haute');
  assert.equal(r.dueDate, '2026-09-30'); // pas de décalage UTC
  assert.equal(r.sprintId, 's7');
  assert.deepEqual(r.warnings, []);
});

test('saisie rapide : valeurs par défaut, accents, estimation et « demain »', () => {
  const r = parseQuickTask('Revoir maquettes #therapeute ~3 demain', CONTEXT);
  assert.equal(r.assignee, 'marwa');
  assert.equal(r.module, 'therapeute');
  assert.equal(r.estimate, 3);
  assert.equal(r.dueDate, '2026-09-27');
  assert.equal(r.title, 'Revoir maquettes');
});

test('saisie rapide : jeton inconnu signalé et date passée → année suivante', () => {
  const r = parseQuickTask('Préparer soutenance @inconnu 15/01', CONTEXT);
  assert.equal(r.assignee, 'marwa');
  assert.equal(r.dueDate, '2027-01-15');
  assert.equal(r.warnings.length, 1);
});

test('v3 → v4 : anciens modules par défaut inutilisés remplacés par les phases ISTQB', () => {
  const legacy = ['patient', 'therapeute', 'ia', 'admin', 'backend'].map((id) => ({ id, name: id, color: '#000' }));
  const unused = migratePayload({ version: 3, data: { tasks: [], modules: legacy } }, { now: NOW }).data;
  assert.equal(unused.modules[0].id, 'planification');
  assert.equal(unused.modules.length, 7);
  // Modules utilisés par une tâche : on ne touche à rien
  const used = migratePayload({ version: 3, data: { tasks: [{ id: 't', title: 'X', module: 'ia' }], modules: legacy } }, { now: NOW }).data;
  assert.equal(used.modules.length, 5);
});
