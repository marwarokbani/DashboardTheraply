/**
 * TaskFilters — Recherche, filtres (membre, catégorie, priorité) et bascule Kanban / Liste.
 */
import { LayoutGrid, List, Search, X } from 'lucide-react';
import { PRIORITIES } from '../../data/initialData';
import { EMPTY_FILTERS, hasActiveFilters } from '../../utils/taskFilters';
import SegmentedControl from '../ui/SegmentedControl';

const VIEWS = [
  { value: 'kanban', icon: LayoutGrid, title: 'Vue Kanban' },
  { value: 'list', icon: List, title: 'Vue liste' },
];

export default function TaskFilters({ filters, onChange, teamMembers, modules, view, onViewChange }) {
  const set = (key) => (e) => onChange({ ...filters, [key]: e.target.value });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="filter-search">
        <Search className="w-3.5 h-3.5 text-tertiary" aria-hidden />
        <input value={filters.search} onChange={set('search')} placeholder="Rechercher…" aria-label="Rechercher une tâche" />
      </label>

      <select className="filter-select" value={filters.assignee} onChange={set('assignee')} aria-label="Filtrer par membre">
        <option value="all">Tous les membres</option>
        {teamMembers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        <option value="none">Non assignées</option>
      </select>

      <select className="filter-select" value={filters.module} onChange={set('module')} aria-label="Filtrer par catégorie">
        <option value="all">Toutes les catégories</option>
        {modules.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        <option value="none">Sans catégorie</option>
      </select>

      <select className="filter-select" value={filters.priority} onChange={set('priority')} aria-label="Filtrer par priorité">
        <option value="all">Toutes priorités</option>
        {PRIORITIES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
      </select>

      {hasActiveFilters(filters) && (
        <button type="button" className="btn btn-ghost h-8 px-2" onClick={() => onChange(EMPTY_FILTERS)}>
          <X className="w-3.5 h-3.5" aria-hidden /> Effacer
        </button>
      )}

      <div className="ml-auto">
        <SegmentedControl label="Affichage" options={VIEWS} value={view} onChange={onViewChange} size="sm" />
      </div>
    </div>
  );
}
