/**
 * StatusDonut — Répartition des tâches par statut.
 */
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { PieChart as PieIcon } from 'lucide-react';
import ChartCard, { ChartTooltip } from './ChartCard';
import { statusColor } from '../../theme/colors';

export default function StatusDonut({ distribution, unit }) {
  const slices = distribution.items.filter((s) => s.count > 0);
  const done = distribution.items.find((s) => s.id === 'done');
  const unitLabel = unit === 'points' ? ' pts' : '';

  return (
    <ChartCard
      title="Répartition des statuts"
      icon={PieIcon}
      isEmpty={!distribution.hasData}
      empty={{ message: 'Ajoutez des tâches pour voir leur répartition par statut.' }}
    >
      <div className="relative h-44" role="img" aria-label={distribution.items.map((s) => `${s.label} : ${s.count}`).join(', ')}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={slices} dataKey="count" nameKey="label" innerRadius="68%" outerRadius="95%" paddingAngle={2} stroke="none" isAnimationActive={false}>
              {slices.map((s) => <Cell key={s.id} fill={statusColor(s.id)} />)}
            </Pie>
            <Tooltip content={<ChartTooltip unitLabel={unitLabel} />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-semibold tabular-nums text-primary">{done?.percent ?? 0}%</span>
          <span className="text-xs text-tertiary">terminé</span>
        </div>
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5">
        {distribution.items.map((s) => (
          <li key={s.id} className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: statusColor(s.id) }} aria-hidden />
            <span className="text-secondary">{s.label}</span>
            <span className="ml-auto tabular-nums text-primary font-medium">{s.count}</span>
          </li>
        ))}
      </ul>
    </ChartCard>
  );
}
