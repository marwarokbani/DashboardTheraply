/**
 * report.js — Rapport hebdomadaire (fonctions pures).
 *
 * buildWeeklyReport() rassemble les données du rapport ; toMarkdown() le met
 * en forme pour être collé dans un message ou un document. La version PDF
 * utilise les mêmes données (composant WeeklyReport + impression du navigateur).
 */

import { STATUSES } from '../data/initialData.js';
import { formatDateLong, formatDateShort, getISOWeekNumber, getWeekRange, todayISO } from './dates.js';
import { findById } from './team.js';
import {
  calcBurndown, calcCompletedThisWeek, calcDueSoon, calcModuleProgress, calcOverdue,
  calcProgress, calcSprintTimeline, calcVelocity, calcWorkloadByMember, getScope,
} from './stats.js';

/**
 * Données du rapport de la semaine courante.
 * @param {object} data
 * @param {{ scope?: string, now?: Date }} options
 */
export function buildWeeklyReport(data, { scope = 'active', now = new Date() } = {}) {
  const scoped = getScope(data, scope);
  const { tasks, sprint } = scoped;
  const progress = calcProgress(tasks, { now });
  const nameOf = (id) => findById(data.teamMembers, id)?.name || 'Non assignée';

  const describe = (task) => ({
    id: task.id,
    title: task.title,
    assignee: nameOf(task.assignee),
    dueDate: task.dueDate,
    status: STATUSES.find((s) => s.id === task.status)?.label,
  });

  return {
    generatedOn: todayISO(now),
    week: { number: getISOWeekNumber(now), ...getWeekRange(now, 0) },
    scopeLabel: scoped.label,
    sprint: sprint ? { name: sprint.name, goal: sprint.goal, startDate: sprint.startDate, endDate: sprint.endDate } : null,
    kpis: {
      progress,
      completedThisWeek: calcCompletedThisWeek(tasks, { now }),
      overdue: calcOverdue(tasks, { now }),
      timeline: calcSprintTimeline(sprint, progress.percent, { now }),
    },
    completed: calcCompletedThisWeek(tasks, { now }).tasks.map(describe),
    overdue: calcOverdue(tasks, { now }).tasks.map(describe),
    upcoming: calcDueSoon(tasks, { now, days: 7 }).upcoming.map(describe),
    inProgress: tasks.filter((t) => t.status === 'in-progress' || t.status === 'in-review').map(describe),
    workload: calcWorkloadByMember(tasks, data.teamMembers, { now }).items,
    modules: calcModuleProgress(data.modules, { tasks, milestones: data.milestones }).items.filter((m) => m.total > 0),
    burndown: calcBurndown(sprint, data.tasks, { now }),
    velocity: calcVelocity(data.sprints, data.tasks),
    blockers: data.notes.filter((n) => n.type === 'blocage').map((n) => ({ text: n.text, author: nameOf(n.author) })),
  };
}

// ============================================
// Markdown
// ============================================

/** Ligne de liste « - Titre (Assignée, échéance) ». */
function taskLine(task) {
  const details = [task.assignee, task.dueDate && `échéance ${formatDateShort(task.dueDate)}`].filter(Boolean).join(', ');
  return `- ${task.title}${details ? ` _(${details})_` : ''}`;
}

/** Section Markdown avec message si la liste est vide. */
function section(title, items, empty) {
  return [`## ${title}`, '', ...(items.length ? items.map(taskLine) : [`_${empty}_`]), ''];
}

/** Met le rapport en forme Markdown. */
export function toMarkdown(report) {
  const { kpis, sprint } = report;
  const trend = (t) => (t && t.delta !== 0 ? ` (${t.delta > 0 ? '+' : ''}${t.delta} vs semaine précédente)` : '');
  const lines = [
    `# Rapport hebdomadaire — Theraply, semaine ${report.week.number}`,
    '',
    `Du ${formatDateLong(report.week.start)} au ${formatDateLong(report.week.end)} · Périmètre : ${report.scopeLabel}`,
    '',
  ];

  if (sprint) {
    lines.push(`**${sprint.name}** (${formatDateShort(sprint.startDate)} → ${formatDateShort(sprint.endDate)})${sprint.goal ? ` — ${sprint.goal}` : ''}`, '');
  }

  lines.push(
    '## Indicateurs',
    '',
    '| Indicateur | Valeur |',
    '| --- | --- |',
    `| Avancement | ${kpis.progress.percent === null ? '—' : `${kpis.progress.percent} %`} (${kpis.progress.done}/${kpis.progress.total} tâches) |`,
    `| Terminées cette semaine | ${kpis.completedThisWeek.count}${trend(kpis.completedThisWeek.trend)} |`,
    `| En retard | ${kpis.overdue.count}${trend(kpis.overdue.trend)} |`,
    `| Jours restants | ${kpis.timeline.hasData ? `${kpis.timeline.daysRemaining} (${kpis.timeline.elapsedPercent} % du sprint écoulé)` : '—'} |`,
    ''
  );

  if (kpis.timeline.scheduleGap !== null) {
    const gap = kpis.timeline.scheduleGap;
    lines.push(gap >= 0 ? `> En avance de ${gap} points sur le rythme idéal.` : `> En retard de ${-gap} points sur le rythme idéal.`, '');
  }

  lines.push(
    ...section('Terminées cette semaine', report.completed, 'Aucune tâche terminée cette semaine.'),
    ...section('En retard', report.overdue, 'Aucune tâche en retard.'),
    ...section('En cours / en revue', report.inProgress, 'Aucune tâche en cours.'),
    ...section('Échéances des 7 prochains jours', report.upcoming, 'Aucune échéance à venir.')
  );

  if (report.workload.length) {
    lines.push('## Charge par membre', '', '| Membre | Ouvertes | Terminées | Complétion | En retard |', '| --- | --- | --- | --- | --- |');
    report.workload.forEach((m) => lines.push(`| ${m.name} | ${m.open} | ${m.done} | ${m.completion === null ? '—' : `${m.completion} %`} | ${m.overdue} |`));
    lines.push('');
  }

  if (report.modules.length) {
    lines.push('## Progression par module', '');
    report.modules.forEach((m) => lines.push(`- ${m.name} : ${m.percent} % (${m.completed}/${m.total})`));
    lines.push('');
  }

  if (report.velocity.hasData) {
    lines.push('## Vélocité (sprints clôturés)', '');
    report.velocity.rows.forEach((r) => lines.push(`- ${r.name} : ${r.completed} réalisées / ${r.planned} planifiées`));
    lines.push(`- Moyenne des 3 derniers sprints : ${report.velocity.average}`, '');
  }

  if (report.blockers.length) {
    lines.push('## Blocages signalés', '');
    report.blockers.forEach((b) => lines.push(`- ${b.text} _(${b.author})_`));
    lines.push('');
  }

  lines.push(`---`, `_Généré le ${formatDateLong(report.generatedOn)} depuis le dashboard Theraply._`, '');
  return lines.join('\n');
}
