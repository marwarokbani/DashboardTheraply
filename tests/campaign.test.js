/**
 * Tests de la campagne de test Theraply (data/campaignData.js).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { getCampaignState } from '../src/data/campaignData.js';
import { migratePayload } from '../src/data/migrations.js';
import { calcOverdue, calcProgress, getScope } from '../src/utils/stats.js';

const NOW = new Date('2026-10-19T10:00:00+01:00');

test('campagne : format v4 inchangé par la migration', () => {
  const campaign = getCampaignState();
  const { data, migrated } = migratePayload({ version: 4, data: campaign }, { now: NOW });
  assert.equal(migrated, false);
  assert.deepEqual(data, campaign);
});

test('campagne : 43 tâches terminées du 15/09 au 15/10, 5 suites ouvertes', () => {
  const { tasks, teamMembers, modules } = getCampaignState();
  const done = tasks.filter((t) => t.status === 'done');
  const open = tasks.filter((t) => t.status !== 'done');
  assert.equal(done.length, 43);
  assert.equal(open.length, 5);
  assert.ok(done.every((t) => t.dueDate >= '2026-09-15' && t.dueDate <= '2026-10-15' && t.completedAt));
  assert.ok(open.every((t) => t.dueDate > '2026-10-15' && t.completedAt === null));
  assert.equal(new Set(tasks.map((t) => t.id)).size, tasks.length);

  const memberIds = teamMembers.map((m) => m.id);
  const moduleIds = modules.map((m) => m.id);
  assert.ok(tasks.every((t) => memberIds.includes(t.assignee) && moduleIds.includes(t.module)));
});

test('campagne : aucune tâche en retard au 19/10', () => {
  const { tasks } = getScope(getCampaignState(), 'all');
  assert.equal(calcOverdue(tasks, { now: NOW }).count, 0);
  assert.equal(calcProgress(tasks, { now: NOW }).percent, 90);
});
