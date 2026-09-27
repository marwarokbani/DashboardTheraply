/**
 * WorkloadChart — Charge par membre (barres empilées par statut)
 * et taux de complétion de chacun.
 */
import { Users } from 'lucide-react';
import ChartCard from './ChartCard';
import Avatar from '../ui/Avatar';
import { statusColor } from '../../theme/colors';

const SEGMENTS = [
  { key: 'done', status: 'done', label: 'Terminé' },
  { key: 'inReview', status: 'in-review', label: 'En revue' },
  { key: 'inProgress', status: 'in-progress', label: 'En cours' },
  { key: 'todo', status: 'todo', label: 'À faire' },
];

export default function WorkloadChart({ workload, teamMembers }) {
  const max = Math.max(1, ...workload.items.map((m) => m.total));

  return (
    <ChartCard
      title="Charge par membre"
      icon={Users}
      isEmpty={!workload.hasData}
      empty={{ message: 'Assignez des tâches aux membres pour comparer leur charge.' }}
    >
      <ul className="space-y-4">
        {workload.items.map((m) => (
          <li key={m.id ?? 'none'}>
            <div className="flex items-center gap-2 mb-1.5">
              <Avatar member={teamMembers.find((t) => t.id === m.id)} size="xs" />
              <span className="text-sm text-primary font-medium truncate">{m.name}</span>
              {m.overdue > 0 && <span className="text-xs text-danger">{m.overdue} en retard</span>}
              <span className="ml-auto text-xs text-tertiary tabular-nums">
                {m.done}/{m.total} · {m.completion ?? 0}%
              </span>
            </div>
            {/* Barre proportionnelle à la charge totale du membre le plus chargé */}
            <div className="h-2 rounded-full overflow-hidden flex" style={{ width: `${(m.total / max) * 100}%`, background: 'var(--bg-tertiary)' }}
              role="img" aria-label={SEGMENTS.map((s) => `${s.label} ${m[s.key]}`).join(', ')}>
              {SEGMENTS.map((s) => m[s.key] > 0 && (
                <span key={s.key} className="h-full" style={{ width: `${(m[s.key] / m.total) * 100}%`, background: statusColor(s.status) }} title={`${s.label} : ${m[s.key]}`} />
              ))}
            </div>
          </li>
        ))}
      </ul>
      <ul className="chart-legend mt-4" aria-hidden>
        {SEGMENTS.map((s) => (
          <li key={s.key}><span className="w-2 h-2 rounded-full" style={{ background: statusColor(s.status) }} /> {s.label}</li>
        ))}
      </ul>
    </ChartCard>
  );
}
