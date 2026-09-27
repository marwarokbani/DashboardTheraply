/**
 * Tests des statistiques (utils/stats.js).
 * Date de référence : samedi 26 septembre 2026 (semaine du lundi 21).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  calcProgress, calcCompletedThisWeek, calcOverdue, calcDueSoon, getTodayFocus,
  calcSprintTimeline, calcBurndown, calcVelocity, calcStatusDistribution,
  calcModuleProgress, calcWorkloadByMember, getScope, computeTrend,
} from '../src/utils/stats.js';
import { getDemoState } from '../src/data/demoData.js';

const NOW = new Date(2026, 8, 26, 15, 0);
const ts = (m, d, h = 12) => new Date(2026, m - 1, d, h).toISOString();

const SPRINT = { id: 's7', name: 'Sprint 7', startDate: '2026-09-21', endDate: '2026-09-27', status: 'active' };

/** Petit jeu de données : 5 tâches dans le sprint, 1 hors sprint. */
function fixture() {
  const base = { sprintId: 's7', createdAt: ts(9, 20), sprintAssignedAt: ts(9, 21, 8), priority: 'moyenne' };
  return [
    { ...base, id: 'a', status: 'done', completedAt: ts(9, 22), dueDate: '2026-09-22', estimate: 3, assignee: 'marwa', module: 'backend' },
    { ...base, id: 'b', status: 'done', completedAt: ts(9, 25), dueDate: '2026-09-25', estimate: 2, assignee: 'sahar', module: 'backend' },
    { ...base, id: 'c', status: 'in-progress', completedAt: null, dueDate: '2026-09-24', estimate: 5, assignee: 'sahar', module: 'patient', priority: 'haute' },
    { ...base, id: 'd', status: 'todo', completedAt: null, dueDate: '2026-09-26', estimate: null, assignee: 'marwa', module: 'patient' },
    // Ajoutée en cours de sprint (le 24)
    { ...base, id: 'e', status: 'todo', completedAt: null, dueDate: '2026-09-28', estimate: 1, assignee: null, module: null, sprintAssignedAt: ts(9, 24), createdAt: ts(9, 24) },
    // Hors sprint, terminée la semaine dernière
    { ...base, id: 'z', sprintId: null, sprintAssignedAt: null, status: 'done', completedAt: ts(9, 16), dueDate: null, assignee: 'marwa', module: 'backend' },
  ];
}

test('computeTrend : pourcentage seulement si la valeur précédente est non nulle', () => {
  assert.deepEqual(computeTrend(6, 4), { delta: 2, percent: 50 });
  assert.deepEqual(computeTrend(3, 0), { delta: 3, percent: null });
});

test('getScope : sprint actif, tout le projet, et repli sans sprint actif', () => {
  const data = { tasks: fixture(), sprints: [SPRINT] };
  assert.equal(getScope(data, 'active').tasks.length, 5);
  assert.equal(getScope(data, 'all').tasks.length, 6);
  assert.equal(getScope({ tasks: fixture(), sprints: [] }, 'active').scope, 'all');
});

test('avancement en tâches et en points, avec tendance sur 7 jours', () => {
  const tasks = fixture().filter((t) => t.sprintId === 's7');
  const byTasks = calcProgress(tasks, { now: NOW });
  assert.deepEqual([byTasks.done, byTasks.total, byTasks.percent], [2, 5, 40]);
  // Il y a 7 jours (le 19), aucune tâche n'existait → pas de tendance calculable
  assert.equal(byTasks.trend, null);

  const byPoints = calcProgress(tasks, { unit: 'points', now: NOW });
  assert.deepEqual([byPoints.done, byPoints.total, byPoints.percent], [5, 11, 45]);
});

test('avancement vide → percent null (pas un faux 0 %)', () => {
  assert.equal(calcProgress([], { now: NOW }).percent, null);
});

test('terminées cette semaine : basé sur completedAt, comparé à la semaine précédente', () => {
  const r = calcCompletedThisWeek(fixture(), { now: NOW });
  assert.equal(r.count, 2); // a (22/09) et b (25/09)
  assert.equal(r.previous, 1); // z (16/09)
  assert.deepEqual(r.trend, { delta: 1, percent: 100 });
});

test('en retard : dates comparées, pas des jours de la semaine', () => {
  const r = calcOverdue(fixture(), { now: NOW });
  assert.deepEqual(r.tasks.map((t) => t.id), ['c']); // d est due aujourd'hui : pas en retard
});

test('échéances : aujourd’hui et 3 prochains jours', () => {
  const r = calcDueSoon(fixture(), { now: NOW });
  assert.deepEqual(r.today.map((t) => t.id), ['d']);
  assert.deepEqual(r.upcoming.map((t) => t.id), ['e']);
  assert.deepEqual(getTodayFocus(fixture(), { now: NOW }).map((f) => `${f.task.id}:${f.reason}`), ['c:overdue', 'd:today']);
});

test('chronologie du sprint : jours restants et écart au planning', () => {
  const r = calcSprintTimeline(SPRINT, 40, { now: NOW });
  assert.equal(r.totalDays, 7);
  assert.equal(r.daysRemaining, 2); // samedi + dimanche
  assert.equal(r.elapsedPercent, 86); // 6 jours sur 7
  assert.equal(r.scheduleGap, 40 - 86);
  assert.equal(calcSprintTimeline(null).hasData, false);
});

test('burndown : idéal depuis l’engagement initial, réel reconstruit jour par jour', () => {
  const { hasData, points, planned } = calcBurndown(SPRINT, fixture(), { now: NOW });
  assert.equal(hasData, true);
  assert.equal(planned, 4); // e ajoutée le 24 : hors engagement
  assert.equal(points.length, 7);
  assert.equal(points[0].ideal, 4);
  assert.equal(points[6].ideal, 0);
  // Fin du 21 : 4 à faire ; 22 : a terminée → 3 ; 24 : e ajoutée → 4 ; 25 : b terminée → 3
  assert.deepEqual(points.map((p) => p.remaining), [4, 3, 3, 4, 3, 3, null]);
  assert.deepEqual(points.map((p) => p.scope), [4, 4, 4, 5, 5, 5, null]);
});

test('burndown sans sprint ou sans tâche → état vide', () => {
  assert.equal(calcBurndown(null, fixture()).hasData, false);
  assert.equal(calcBurndown(SPRINT, []).hasData, false);
});

test('vélocité : issue des photos de sprints clôturés, moyenne des 3 derniers', () => {
  const sprints = [
    { id: 's1', name: 'S1', startDate: '2026-08-01', endDate: '2026-08-14', status: 'closed', snapshot: { plannedTasks: 8, plannedPoints: 20, addedTasks: 1, addedPoints: 2, completedTasks: 6, completedPoints: 15 } },
    { id: 's2', name: 'S2', startDate: '2026-08-15', endDate: '2026-08-28', status: 'closed', snapshot: { plannedTasks: 7, plannedPoints: 18, addedTasks: 0, addedPoints: 0, completedTasks: 7, completedPoints: 18 } },
    SPRINT,
  ];
  const r = calcVelocity(sprints, [], { unit: 'tasks' });
  assert.deepEqual(r.rows.map((x) => [x.name, x.planned, x.completed]), [['S1', 8, 6], ['S2', 7, 7]]);
  assert.equal(r.average, 6.5);
  assert.equal(calcVelocity(sprints, [], { unit: 'points' }).rows[0].planned, 20);
  assert.equal(calcVelocity([SPRINT], []).hasData, false);
});

test('répartition des statuts', () => {
  const r = calcStatusDistribution(fixture().filter((t) => t.sprintId === 's7'));
  assert.deepEqual(r.items.map((i) => i.count), [2, 1, 0, 2]);
  assert.equal(calcStatusDistribution([]).hasData, false);
});

test('progression par module : mode tâches et mode jalons, avec « Sans module »', () => {
  const modules = [{ id: 'backend', name: 'Backend', color: '#000' }, { id: 'patient', name: 'Patient', color: '#111' }];
  const byTasks = calcModuleProgress(modules, { tasks: fixture().filter((t) => t.sprintId === 's7') });
  assert.deepEqual(byTasks.items.map((i) => [i.name, i.completed, i.total]), [['Backend', 2, 2], ['Patient', 0, 2], ['Sans module', 0, 1]]);

  const milestones = [{ module: 'patient', completed: true }, { module: 'patient', completed: false }];
  const byMilestones = calcModuleProgress(modules, { milestones, mode: 'milestones' });
  assert.equal(byMilestones.items[0].percent, null); // aucun jalon backend : pas 0 %
  assert.equal(byMilestones.items[1].percent, 50);
});

test('charge par membre : complétion, retards, non assignées', () => {
  const members = [{ id: 'marwa', name: 'Marwa', color: '#000' }, { id: 'sahar', name: 'Sahar', color: '#111' }];
  const r = calcWorkloadByMember(fixture().filter((t) => t.sprintId === 's7'), members, { now: NOW });
  const [marwa, sahar, none] = r.items;
  assert.deepEqual([marwa.total, marwa.done, marwa.completion], [2, 1, 50]);
  assert.deepEqual([sahar.inProgress, sahar.overdue], [1, 1]);
  assert.equal(none.name, 'Non assignée');
});

test('données de démo : toutes les stats se calculent sans erreur', () => {
  const demo = getDemoState(NOW);
  const { tasks, sprint } = getScope(demo, 'all');
  assert.equal(sprint, null);
  assert.ok(calcProgress(tasks, { now: NOW }).percent > 0);
  assert.ok(calcOverdue(tasks, { now: NOW }).count >= 1);
  assert.ok(calcModuleProgress(demo.modules, { tasks }).hasData);
  assert.equal(calcVelocity(demo.sprints, demo.tasks).hasData, false);
});

test('progression dans le temps : cumul des tâches créées et terminées', async () => {
  const { calcProgressOverTime } = await import('../src/utils/stats.js');
  const tasks = [
    { id: '1', status: 'done', createdAt: ts(9, 24), completedAt: ts(9, 25) },
    { id: '2', status: 'todo', createdAt: ts(9, 25), completedAt: null },
    { id: '3', status: 'done', createdAt: ts(9, 24), completedAt: ts(9, 26) },
  ];
  const { points } = calcProgressOverTime(tasks, { now: NOW });
  assert.deepEqual(points.map((p) => `${p.date}:${p.done}/${p.total}`), ['2026-09-24:0/2', '2026-09-25:1/3', '2026-09-26:2/3']);
  assert.equal(calcProgressOverTime([], { now: NOW }).hasData, false);
});

test('calendrier : tâche terminée au jour de fin, les autres à leur échéance', async () => {
  const { calcTasksByDate } = await import('../src/utils/stats.js');
  const tasks = [
    { id: 'fini-tot', status: 'done', dueDate: '2026-09-25', completedAt: ts(9, 22) },
    { id: 'a-faire', status: 'todo', dueDate: '2026-09-24', completedAt: null },
    { id: 'sans-date-fin', status: 'done', dueDate: '2026-09-23', completedAt: null },
    { id: 'fini-avant', status: 'done', dueDate: '2026-09-23', completedAt: ts(9, 18) },
  ];
  const week = calcTasksByDate(tasks, NOW);
  const ids = (date) => week[date].map((t) => t.id);
  assert.deepEqual(ids('2026-09-22'), ['fini-tot']);
  assert.deepEqual(ids('2026-09-25'), []);
  assert.deepEqual(ids('2026-09-24'), ['a-faire']);
  assert.deepEqual(ids('2026-09-23'), ['sans-date-fin']);
  // Terminée la semaine précédente : visible en reculant d'une semaine
  assert.deepEqual(calcTasksByDate(tasks, NOW, -1)['2026-09-18'].map((t) => t.id), ['fini-avant']);
});
