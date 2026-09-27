/**
 * ModuleProgress — Avancement de chaque catégorie (phase de test ISTQB par défaut)
 * selon les checkpoints validés.
 */
import { Layers } from 'lucide-react';
import ChartCard from './ChartCard';

export default function ModuleProgress({ progress }) {
  return (
    <ChartCard
      title="Avancement par catégorie"
      icon={Layers}
      isEmpty={!progress.hasData}
      empty={{ message: 'Rattachez vos checkpoints à une catégorie (#planification, #execution…) pour suivre chaque phase.' }}
    >
      <ul className="space-y-3.5">
        {progress.items.map((m) => (
          <li key={m.id ?? 'none'}>
            <div className="flex items-center gap-2 mb-1.5 text-sm">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: m.color }} aria-hidden />
              <span className="text-primary truncate">{m.name}</span>
              <span className="ml-auto text-xs tabular-nums text-tertiary">
                {m.total > 0 ? `${m.completed}/${m.total} · ${m.percent}%` : 'aucune tâche'}
              </span>
            </div>
            <div
              className="h-1.5 rounded-full overflow-hidden"
              style={{ background: 'var(--bg-tertiary)' }}
              role="progressbar"
              aria-label={m.name}
              aria-valuenow={m.percent ?? 0}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${m.percent ?? 0}%`, background: m.color }} />
            </div>
          </li>
        ))}
      </ul>
    </ChartCard>
  );
}
