/**
 * Tests de la campagne de test Theraply (data/campaignData.js)
 * et de la vue « période du projet » du calendrier.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { CAMPAIGN_ID, getCampaignState, hasCampaign } from '../src/data/campaignData.js';
import { getDemoState } from '../src/data/demoData.js';
import { getEmptyState } from '../src/data/initialData.js';
import { migratePayload } from '../src/data/migrations.js';
import { calcOverdue, calcProgress, calcProjectCalendar, getScope } from '../src/utils/stats.js';
import { timestampToISODate } from '../src/utils/dates.js';

const NOW = new Date('2026-10-19T10:00:00+01:00');

test('campagne : format v4 inchangé par la migration', () => {
  const campaign = getCampaignState();
  const { data, migrated } = migratePayload({ version: 4, data: campaign }, { now: NOW });
  assert.equal(migrated, false);
  assert.deepEqual(data, campaign);
});

test('campagne : 46 tâches terminées du 15/09 au 15/10, 23 par personne', () => {
  const { tasks, teamMembers, modules } = getCampaignState();
  assert.equal(tasks.length, 46);
  assert.ok(tasks.every((t) => t.status === 'done' && t.completedAt));
  assert.ok(tasks.every((t) => t.dueDate >= '2026-09-15' && t.dueDate <= '2026-10-15'));
  assert.ok(tasks.every((t) => timestampToISODate(t.completedAt) === t.dueDate));
  assert.equal(new Set(tasks.map((t) => t.id)).size, tasks.length);
  assert.equal(tasks.filter((t) => t.assignee === 'marwa').length, 23);
  assert.equal(tasks.filter((t) => t.assignee === 'sahar').length, 23);

  const memberIds = teamMembers.map((m) => m.id);
  const moduleIds = modules.map((m) => m.id);
  assert.ok(tasks.every((t) => memberIds.includes(t.assignee) && moduleIds.includes(t.module)));
  assert.ok(moduleIds.every((id) => tasks.some((t) => t.module === id)), 'chaque étape a au moins une tâche');
});

test('campagne : chaque jour ouvré, une tâche pour chacune', () => {
  const { tasks } = getCampaignState();
  const byDay = Map.groupBy(tasks, (t) => t.dueDate);
  assert.equal(byDay.size, 23);
  for (const [day, list] of byDay) {
    assert.deepEqual(list.map((t) => t.assignee).sort(), ['marwa', 'sahar'], day);
    assert.ok(![0, 6].includes(new Date(`${day}T12:00:00`).getDay()), `${day} n'est pas un week-end`);
  }
});

test('campagne : 100 % terminé, aucune tâche en retard au 19/10', () => {
  const { tasks } = getScope(getCampaignState(), 'all');
  assert.equal(calcOverdue(tasks, { now: NOW }).count, 0);
  assert.equal(calcProgress(tasks, { now: NOW }).percent, 100);
});

test('campagne : repère de chargement unique conservé par la migration', () => {
  const campaign = getCampaignState();
  assert.equal(campaign.settings.campaign, CAMPAIGN_ID);
  assert.ok(hasCampaign(migratePayload({ version: 4, data: campaign }).data));
  assert.equal(hasCampaign(getEmptyState()), false);
  assert.equal(hasCampaign(getDemoState()), false);
});

test('calendrier « période du projet » : 5 semaines du lundi au vendredi', () => {
  const project = calcProjectCalendar(getCampaignState().tasks);
  assert.equal(project.hasData, true);
  assert.equal(project.start, '2026-09-15');
  assert.equal(project.end, '2026-10-15');
  assert.equal(project.workingDays, 23);
  assert.equal(project.showWeekend, false);
  assert.deepEqual(project.weeks.map((w) => [w.start, w.end, w.taskCount]), [
    ['2026-09-15', '2026-09-18', 8],
    ['2026-09-21', '2026-09-25', 10],
    ['2026-09-28', '2026-10-02', 10],
    ['2026-10-05', '2026-10-09', 10],
    ['2026-10-12', '2026-10-15', 8],
  ]);
  assert.ok(project.weeks.every((w) => w.days.length === 5));
  // Le lundi 14 sept. et le vendredi 16 oct. sont affichés grisés, hors période
  assert.equal(project.weeks[0].days[0].inPeriod, false);
  assert.equal(project.weeks[4].days[4].inPeriod, false);
});

test('calendrier « période du projet » : vide sans tâche datée, week-end affiché si utilisé', () => {
  assert.equal(calcProjectCalendar([]).hasData, false);
  const project = calcProjectCalendar([{ id: 'a', status: 'todo', dueDate: '2026-09-19' }]);
  assert.equal(project.showWeekend, true);
  assert.equal(project.weeks[0].days.length, 7);
});
