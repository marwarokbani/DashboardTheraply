/**
 * ProgressOverTimeChart — Évolution de l'avancement jour par jour :
 * checkpoints validés (cumul) face au nombre total de checkpoints.
 */
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { TrendingUp } from 'lucide-react';
import ChartCard, { ChartTooltip } from './ChartCard';
import { AXIS_PROPS } from './chartTheme';

export default function ProgressOverTimeChart({ progress, className }) {
  const last = progress.points.at(-1);

  return (
    <ChartCard
      title="Progression dans le temps"
      subtitle={last ? `Aujourd'hui : ${last.done} validés sur ${last.total} (${last.percent} %)` : undefined}
      icon={TrendingUp}
      className={className}
      isEmpty={!progress.hasData || progress.points.length < 2}
      empty={{
        title: 'Pas encore d’historique',
        message: 'La courbe apparaîtra dès le deuxième jour de suivi : cochez vos checkpoints au fil de l’eau.',
      }}
    >
      <div className="h-64" role="img" aria-label={`Progression : ${last?.done ?? 0} tâches validées sur ${last?.total ?? 0}.`}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={progress.points} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <defs>
              <linearGradient id="done-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--status-done)" stopOpacity={0.25} />
                <stop offset="100%" stopColor="var(--status-done)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--border-light)" />
            <XAxis dataKey="label" {...AXIS_PROPS} interval="preserveStartEnd" minTickGap={16} />
            <YAxis {...AXIS_PROPS} allowDecimals={false} width={40} />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--border-strong)' }} />
            <Line type="stepAfter" dataKey="total" name="Total" stroke="var(--text-tertiary)" strokeWidth={1.5} strokeDasharray="4 4" dot={false} isAnimationActive={false} />
            <Area type="stepAfter" dataKey="done" name="Validés" stroke="var(--status-done)" strokeWidth={2} fill="url(#done-fill)" dot={false} activeDot={{ r: 4 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <ul className="chart-legend" aria-hidden>
        <li><span className="legend-line" style={{ borderColor: 'var(--status-done)' }} /> Validés (cumul)</li>
        <li><span className="legend-line legend-dashed" style={{ borderColor: 'var(--text-tertiary)' }} /> Total</li>
      </ul>
    </ChartCard>
  );
}
