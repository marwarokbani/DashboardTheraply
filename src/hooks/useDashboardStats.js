/**
 * useDashboardStats — Calcule toutes les statistiques en une fois.
 *
 * Recalcul instantané à chaque modification de `data` (useMemo).
 * Les composants ne font qu'afficher le résultat.
 *
 * @param {object} data
 * @param {{ scope?: 'active'|'all'|'backlog'|string }} options — périmètre (tout le projet par défaut)
 */
import { useMemo } from 'react';
import {
  getScope, calcProgress, calcCompletedThisWeek, calcOverdue, calcDueSoon, getTodayFocus,
  calcSprintTimeline, calcStatusDistribution, calcModuleProgress, calcWorkloadByMember,
  calcProgressOverTime,
} from '../utils/stats';

export function useDashboardStats(data, { scope = 'all' } = {}) {
  return useMemo(() => {
    const now = new Date();
    const scoped = getScope(data, scope);
    const { tasks, sprint } = scoped;
    const unit = 'tasks';
    const progress = calcProgress(tasks, { unit, now });

    return {
      scope: scoped,
      unit,
      kpis: {
        progress,
        completedThisWeek: calcCompletedThisWeek(tasks, { now }),
        overdue: calcOverdue(tasks, { now }),
        timeline: calcSprintTimeline(sprint, progress.percent, { now }),
        remaining: {
          count: tasks.filter((t) => t.status !== 'done').length,
          inProgress: tasks.filter((t) => t.status === 'in-progress' || t.status === 'in-review').length,
        },
      },
      dueSoon: calcDueSoon(tasks, { now }),
      todayFocus: getTodayFocus(tasks, { now }),
      progressOverTime: calcProgressOverTime(tasks, { now }),
      statusDistribution: calcStatusDistribution(tasks, { unit }),
      moduleProgress: calcModuleProgress(data.modules, { tasks, unit }),
      workload: calcWorkloadByMember(tasks, data.teamMembers, { unit, now }),
    };
  }, [data, scope]);
}
