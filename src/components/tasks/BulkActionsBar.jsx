/**
 * BulkActionsBar — Actions groupées sur les tâches sélectionnées
 * (changer le statut, l'assignée, supprimer).
 */
import { Trash2, X } from 'lucide-react';
import { STATUSES } from '../../data/initialData';

export default function BulkActionsBar({ count, teamMembers, onStatus, onAssignee, onDelete, onClear }) {
  if (count === 0) return null;

  // Les <select> servent de menus d'action : on revient à l'option vide après chaque choix
  const handle = (callback) => (e) => {
    if (e.target.value) callback(e.target.value === 'none' ? null : e.target.value);
    e.target.value = '';
  };

  return (
    <div className="bulk-bar" role="toolbar" aria-label={`Actions sur ${count} tâche(s) sélectionnée(s)`}>
      <span className="text-sm font-medium tabular-nums">{count} sélectionnée{count > 1 ? 's' : ''}</span>

      <select className="bulk-select" defaultValue="" onChange={handle(onStatus)} aria-label="Changer le statut">
        <option value="" disabled>Statut…</option>
        {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
      </select>

      <select className="bulk-select" defaultValue="" onChange={handle(onAssignee)} aria-label="Changer l'assignée">
        <option value="" disabled>Assigner à…</option>
        {teamMembers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        <option value="none">Personne</option>
      </select>

      <button type="button" className="bulk-button bulk-danger" onClick={onDelete}>
        <Trash2 className="w-4 h-4" aria-hidden /> Supprimer
      </button>

      <button type="button" className="bulk-button ml-auto" onClick={onClear} aria-label="Annuler la sélection">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
