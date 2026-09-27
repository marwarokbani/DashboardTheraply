/**
 * Tests du rapport hebdomadaire et du filtrage des tâches.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { buildWeeklyReport, toMarkdown } from '../src/utils/report.js';
import { getScope } from '../src/utils/stats.js';
import { filterTasks, groupByStatus, sortTasks } from '../src/utils/taskFilters.js';
import { getDemoState } from '../src/data/demoData.js';
import { getEmptyState } from '../src/data/initialData.js';

const NOW = new Date(2026, 8, 26, 15, 0);

test('rapport de démo : sections, indicateurs et blocages', () => {
  const report = buildWeeklyReport(getDemoState(NOW), { scope: 'all', now: NOW });
  assert.equal(report.week.number, 39);
  assert.equal(report.sprint, null);
  assert.equal(report.completed.length, report.kpis.completedThisWeek.count);
  assert.ok(report.overdue.length >= 1);
  assert.equal(report.blockers.length, 1);

  const md = toMarkdown(report);
  assert.match(md, /^# Rapport hebdomadaire — Theraply, semaine 39/);
  assert.match(md, /\| Avancement \| \d+ %/);
  assert.match(md, /## En retard\n\n- Concevoir les cas de test : valeurs limites \(paiement\)/);
  assert.match(md, /- Retester les anomalies critiques/);
  assert.match(md, /## Blocages signalés/);
});

test('rapport d’un espace vide : messages vides, aucune erreur', () => {
  const md = toMarkdown(buildWeeklyReport(getEmptyState(), { now: NOW }));
  assert.match(md, /\| Avancement \| — /);
  assert.match(md, /_Aucune tâche terminée cette semaine\._/);
  assert.doesNotMatch(md, /## Vélocité/);
});

test('périmètre « Backlog » : tâches sans sprint', () => {
  const { tasks, sprint, label } = getScope(getDemoState(NOW), 'backlog');
  assert.equal(label, 'Backlog');
  assert.equal(sprint, null);
  assert.ok(tasks.length > 0 && tasks.every((t) => !t.sprintId));
});

test('filtres : recherche sans accents, non assignées, tri et colonnes', () => {
  const tasks = [
    { id: '1', title: 'Écran de connexion', assignee: 'a', module: 'm', priority: 'basse', status: 'todo', dueDate: '2026-10-02' },
    { id: '2', title: 'API rendez-vous', assignee: null, module: null, priority: 'haute', status: 'todo', dueDate: null },
    { id: '3', title: 'Tests', assignee: 'a', module: 'm', priority: 'haute', status: 'done', dueDate: '2026-09-28' },
  ];
  assert.deepEqual(filterTasks(tasks, { search: 'ecran', assignee: 'all', module: 'all', priority: 'all' }).map((t) => t.id), ['1']);
  assert.deepEqual(filterTasks(tasks, { search: '', assignee: 'none', module: 'all', priority: 'all' }).map((t) => t.id), ['2']);
  assert.deepEqual(sortTasks(tasks, 'dueDate').map((t) => t.id), ['3', '1', '2']);
  assert.deepEqual(groupByStatus(tasks).todo.map((t) => t.id), ['2', '1']); // haute avant basse
});
