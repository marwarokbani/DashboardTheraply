/**
 * WeeklyReport — Version imprimable (PDF) du rapport hebdomadaire.
 * Affichée uniquement à l'impression (.print-only) ; le burndown est dessiné
 * en SVG simple pour rester net sur papier.
 */
import { formatDateLong, formatDateShort } from '../../utils/dates';

/** Mini burndown SVG (idéal pointillé, réel plein). */
function BurndownSvg({ points }) {
  const width = 640;
  const height = 180;
  const pad = 24;
  const max = Math.max(1, ...points.flatMap((p) => [p.ideal, p.remaining ?? 0, p.scope ?? 0]));
  const x = (i) => pad + (i / Math.max(1, points.length - 1)) * (width - pad * 2);
  const y = (v) => height - pad - (v / max) * (height - pad * 2);
  const path = (key) =>
    points
      .map((p, i) => (p[key] === null ? null : `${x(i)},${y(p[key])}`))
      .filter(Boolean)
      .join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" role="img" aria-label="Burndown du sprint">
      <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke="#cdc8d8" />
      <polyline points={path('ideal')} fill="none" stroke="#6f6882" strokeDasharray="4 4" strokeWidth="1.5" />
      <polyline points={path('remaining')} fill="none" stroke="#6d28d9" strokeWidth="2.5" />
      <text x={pad} y={height - 6} fontSize="10" fill="#6f6882">{points[0]?.label}</text>
      <text x={width - pad} y={height - 6} fontSize="10" fill="#6f6882" textAnchor="end">{points.at(-1)?.label}</text>
      <text x={pad} y={pad - 8} fontSize="10" fill="#6f6882">{max}</text>
    </svg>
  );
}

function TaskTable({ title, tasks, empty }) {
  return (
    <section className="report-section">
      <h2>{title} <span>({tasks.length})</span></h2>
      {tasks.length === 0 ? (
        <p className="report-empty">{empty}</p>
      ) : (
        <table>
          <thead><tr><th>Tâche</th><th>Assignée</th><th>Échéance</th><th>Statut</th></tr></thead>
          <tbody>
            {tasks.map((t) => (
              <tr key={t.id}><td>{t.title}</td><td>{t.assignee}</td><td>{t.dueDate ? formatDateShort(t.dueDate) : '—'}</td><td>{t.status}</td></tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

export default function WeeklyReport({ report }) {
  const { kpis, sprint } = report;
  const kpiItems = [
    ['Avancement', kpis.progress.percent === null ? '—' : `${kpis.progress.percent} %`, `${kpis.progress.done}/${kpis.progress.total} tâches`],
    ['Terminées cette semaine', kpis.completedThisWeek.count, `semaine précédente : ${kpis.completedThisWeek.previous}`],
    ['En retard', kpis.overdue.count, `il y a 7 jours : ${kpis.overdue.previous}`],
    ['Jours restants', kpis.timeline.hasData ? kpis.timeline.daysRemaining : '—', kpis.timeline.hasData ? `${kpis.timeline.elapsedPercent} % du sprint écoulé` : ''],
  ];

  return (
    <article className="weekly-report">
      <header>
        <img src="/LogoTheraply.png" alt="" width="36" height="36" />
        <div>
          <h1>Rapport hebdomadaire — semaine {report.week.number}</h1>
          <p>
            Du {formatDateLong(report.week.start)} au {formatDateLong(report.week.end)} · {report.scopeLabel}
            {sprint && ` (${formatDateShort(sprint.startDate)} → ${formatDateShort(sprint.endDate)})`}
          </p>
          {sprint?.goal && <p><strong>Objectif :</strong> {sprint.goal}</p>}
        </div>
      </header>

      <div className="report-kpis">
        {kpiItems.map(([label, value, detail]) => (
          <div key={label}><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>
        ))}
      </div>

      {report.burndown.hasData && (
        <section className="report-section">
          <h2>Burndown</h2>
          <BurndownSvg points={report.burndown.points} />
        </section>
      )}

      <TaskTable title="Terminées cette semaine" tasks={report.completed} empty="Aucune tâche terminée cette semaine." />
      <TaskTable title="En retard" tasks={report.overdue} empty="Aucune tâche en retard." />
      <TaskTable title="En cours / en revue" tasks={report.inProgress} empty="Aucune tâche en cours." />
      <TaskTable title="Échéances des 7 prochains jours" tasks={report.upcoming} empty="Aucune échéance à venir." />

      {report.workload.length > 0 && (
        <section className="report-section">
          <h2>Charge par membre</h2>
          <table>
            <thead><tr><th>Membre</th><th>Ouvertes</th><th>Terminées</th><th>Complétion</th><th>En retard</th></tr></thead>
            <tbody>
              {report.workload.map((m) => (
                <tr key={m.id ?? 'none'}><td>{m.name}</td><td>{m.open}</td><td>{m.done}</td><td>{m.completion === null ? '—' : `${m.completion} %`}</td><td>{m.overdue}</td></tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {report.blockers.length > 0 && (
        <section className="report-section">
          <h2>Blocages signalés</h2>
          <ul>{report.blockers.map((b, i) => <li key={i}>{b.text} — <em>{b.author}</em></li>)}</ul>
        </section>
      )}

      <footer>Généré le {formatDateLong(report.generatedOn)} depuis le dashboard Theraply.</footer>
    </article>
  );
}
