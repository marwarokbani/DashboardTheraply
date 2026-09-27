/**
 * ChartCard — Cadre commun des graphiques : titre, action optionnelle
 * (bascule d'unité…), et état vide illustré quand les données manquent.
 */
import { BarChart3 } from 'lucide-react';

export function EmptyState({ icon: Icon = BarChart3, title, message, action }) {
  return (
    <div className="empty-state">
      <span className="empty-state-icon" aria-hidden>
        <Icon className="w-5 h-5" />
      </span>
      {title && <p className="text-sm font-medium text-primary">{title}</p>}
      <p className="text-xs text-tertiary max-w-[16rem]">{message}</p>
      {action}
    </div>
  );
}

export default function ChartCard({ title, subtitle, icon, actions, isEmpty, empty, className = '', children }) {
  const Icon = icon;
  return (
    <section className={`card p-5 flex flex-col ${className}`} aria-label={title}>
      <header className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h3 className="card-title flex items-center gap-2">
            {Icon && <Icon className="w-4 h-4 text-tertiary" aria-hidden />}
            {title}
          </h3>
          {subtitle && <p className="text-xs text-tertiary mt-0.5">{subtitle}</p>}
        </div>
        {actions}
      </header>
      <div className="flex-1 min-h-0">{isEmpty ? <EmptyState icon={Icon} {...empty} /> : children}</div>
    </section>
  );
}

/** Info-bulle commune à tous les graphiques Recharts. */
export function ChartTooltip({ active, payload, label, unitLabel = '' }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      {label && <p className="font-medium mb-1">{label}</p>}
      {payload
        .filter((entry) => entry.value !== null && entry.value !== undefined)
        .map((entry) => (
          <p key={entry.dataKey} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: entry.color || entry.stroke || entry.fill }} aria-hidden />
            <span className="text-tertiary">{entry.name}</span>
            <span className="ml-auto font-medium tabular-nums">{entry.value}{unitLabel}</span>
          </p>
        ))}
    </div>
  );
}
