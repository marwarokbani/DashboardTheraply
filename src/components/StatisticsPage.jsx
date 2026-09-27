/**
 * StatisticsPage — Avancement des checkpoints de test :
 * indicateurs clés, « à traiter aujourd'hui », progression dans le temps,
 * statuts, avancement par catégorie (phase ISTQB) et par membre.
 * Toutes les valeurs viennent de useDashboardStats (aucun calcul ici).
 */
import KpiCards from './dashboard/KpiCards';
import TodayFocus from './dashboard/TodayFocus';
import ProgressOverTimeChart from './charts/ProgressOverTimeChart';
import StatusDonut from './charts/StatusDonut';
import ModuleProgress from './charts/ModuleProgress';
import WorkloadChart from './charts/WorkloadChart';

export default function StatisticsPage({ stats, data, onOpenTask }) {
  return (
    <div className="space-y-6">
      <KpiCards kpis={stats.kpis} scope={stats.scope} unit={stats.unit} />
      <TodayFocus items={stats.todayFocus} teamMembers={data.teamMembers} upcomingCount={stats.dueSoon.upcoming.length} onOpenTask={onOpenTask} />
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <ProgressOverTimeChart progress={stats.progressOverTime} className="xl:col-span-2" />
        <StatusDonut distribution={stats.statusDistribution} unit={stats.unit} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ModuleProgress progress={stats.moduleProgress} />
        <WorkloadChart workload={stats.workload} teamMembers={data.teamMembers} />
      </div>
    </div>
  );
}
