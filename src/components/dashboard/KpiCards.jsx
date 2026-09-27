/**
 * KpiCards — Les 4 indicateurs clés, chacun avec sa tendance
 * par rapport à la semaine précédente.
 */
import { AlertTriangle, CalendarClock, CheckCircle2, ListTodo, Target, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { formatDateShort } from '../../utils/dates';

/**
 * Badge de tendance.
 * @param {number} delta — variation absolue
 * @param {number|null} percent — variation relative (null si non calculable)
 * @param {'up'|'down'} goodWhen — sens favorable (moins de retards = mieux)
 * @param {string} suffix — unité affichée quand on montre le delta (ex. « pts »)
 */
function Trend({ delta, percent, goodWhen = 'up', suffix = '', context = 'vs sem. dernière' }) {
  if (delta === undefined || delta === null) return null;
  const Icon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  const favorable = delta === 0 ? null : (delta > 0) === (goodWhen === 'up');
  const tone = favorable === null ? 'neutral' : favorable ? 'positive' : 'negative';
  const value = percent !== null && percent !== undefined ? `${Math.abs(percent)} %` : `${Math.abs(delta)}${suffix}`;
  const sign = delta > 0 ? '+' : delta < 0 ? '−' : '';

  return (
    <span className={`trend trend-${tone}`}>
      <Icon className="w-3 h-3" aria-hidden />
      <span className="tabular-nums">{delta === 0 ? 'stable' : `${sign}${value}`}</span>
      <span className="text-tertiary font-normal">{context}</span>
    </span>
  );
}

function KpiCard({ icon: Icon, label, value, detail, trend, tone }) {
  return (
    <article className={`card kpi-card ${tone === 'alert' ? 'kpi-alert' : ''}`}>
      <div className="flex items-center justify-between">
        <p className="kpi-label">{label}</p>
        <Icon className="w-4 h-4 text-tertiary" aria-hidden />
      </div>
      <p className="kpi-value">{value}</p>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-h-[1.25rem]">
        {trend}
        {detail && <span className="text-xs text-tertiary">{detail}</span>}
      </div>
    </article>
  );
}

export default function KpiCards({ kpis, scope, unit }) {
  const { progress, completedThisWeek, overdue, timeline, remaining } = kpis;
  const unitWord = unit === 'points' ? 'pts' : 'tâches';
  const sprint = scope.sprint;

  // Écart avec le rythme idéal du sprint (avancement − temps écoulé)
  const gap = timeline.scheduleGap;
  const scheduleText = gap === null ? null : gap >= 0 ? `en avance de ${gap} pts` : `en retard de ${-gap} pts`;

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
      <KpiCard
        icon={Target}
        label={sprint ? 'Avancement du sprint' : 'Avancement global'}
        value={progress.percent === null ? '—' : `${progress.percent} %`}
        detail={progress.total > 0 ? `${progress.done}/${progress.total} ${unitWord}` : 'aucune tâche'}
        trend={progress.trend && <Trend delta={progress.trend.delta} percent={null} suffix=" pts" />}
      />
      <KpiCard
        icon={CheckCircle2}
        label="Terminées cette semaine"
        value={completedThisWeek.count}
        detail={completedThisWeek.previous === 0 && completedThisWeek.count === 0 ? 'lundi → dimanche' : null}
        trend={(completedThisWeek.count > 0 || completedThisWeek.previous > 0) && (
          <Trend delta={completedThisWeek.trend.delta} percent={completedThisWeek.trend.percent} />
        )}
      />
      <KpiCard
        icon={AlertTriangle}
        label="En retard"
        value={overdue.count}
        tone={overdue.count > 0 ? 'alert' : null}
        detail={overdue.count === 0 && overdue.previous === 0 ? 'tout est à jour' : null}
        trend={(overdue.count > 0 || overdue.previous > 0) && (
          <Trend delta={overdue.trend.delta} percent={overdue.trend.percent} goodWhen="down" />
        )}
      />
      {sprint ? (
        <KpiCard
          icon={CalendarClock}
          label="Jours restants"
          value={timeline.daysRemaining}
          detail={timeline.phase === 'upcoming' ? `démarre le ${formatDateShort(sprint.startDate)}` : `fin le ${formatDateShort(sprint.endDate)} · ${timeline.elapsedPercent} % écoulé`}
          trend={scheduleText && <span className={`trend ${gap >= 0 ? 'trend-positive' : 'trend-negative'}`}>{scheduleText}</span>}
        />
      ) : (
        <KpiCard
          icon={ListTodo}
          label="Restantes"
          value={remaining.count}
          detail={remaining.count === 0 ? (progress.total > 0 ? 'tout est validé' : 'aucune tâche') : `dont ${remaining.inProgress} en cours ou en revue`}
        />
      )}
    </div>
  );
}
