/**
 * MembersSettings — Membres de l'équipe : ajouter, renommer, changer la couleur,
 * supprimer, et choisir qui est « moi » (assignée par défaut des nouvelles tâches).
 */
import { useState } from 'react';
import { Pencil, Plus, Trash2, UserCheck } from 'lucide-react';
import EntityEditor from './EntityEditor';
import Avatar from '../ui/Avatar';
import { addMember, countReferences, nextPresetColor, removeMember, updateMember } from '../../utils/team';

export default function MembersSettings({ data, updateData, showToast }) {
  const [editing, setEditing] = useState(null); // id | 'new' | null
  const { teamMembers, tasks, settings } = data;

  const handleAdd = (fields) => {
    updateData((prev) => ({ ...prev, teamMembers: addMember(prev.teamMembers, fields) }));
    setEditing(null);
  };

  const handleUpdate = (memberId, fields) => {
    updateData((prev) => ({ ...prev, teamMembers: updateMember(prev.teamMembers, memberId, fields) }));
    setEditing(null);
  };

  const handleRemove = (member) => {
    const count = countReferences(tasks, 'assignee', member.id);
    const detail = count ? ` Ses ${count} tâche(s) deviendront non assignées.` : '';
    if (!confirm(`Supprimer ${member.name} ?${detail}`)) return;
    updateData((prev) => ({ ...prev, ...removeMember(prev, member.id) }));
    showToast(`${member.name} supprimé·e`, 'success', { label: 'Annuler', undo: true });
  };

  const setCurrentUser = (memberId) => {
    updateData((prev) => ({ ...prev, settings: { ...prev.settings, currentUserId: memberId } }));
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-tertiary mb-3">
        « Moi » est la personne assignée par défaut aux tâches créées en saisie rapide.
      </p>

      {teamMembers.map((member) =>
        editing === member.id ? (
          <EntityEditor key={member.id} withRole initial={member} namePlaceholder="Nom" submitLabel="Enregistrer" onSubmit={(f) => handleUpdate(member.id, f)} onCancel={() => setEditing(null)} />
        ) : (
          <div key={member.id} className="settings-row">
            <Avatar member={member} size="md" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-primary flex items-center gap-2">
                {member.name}
                {settings.currentUserId === member.id && <span className="badge">Moi</span>}
              </p>
              {member.role && <p className="text-xs text-tertiary truncate">{member.role}</p>}
            </div>
            {settings.currentUserId !== member.id && (
              <button type="button" className="btn-icon" onClick={() => setCurrentUser(member.id)} aria-label={`Définir ${member.name} comme « moi »`} title="C'est moi">
                <UserCheck className="w-4 h-4" />
              </button>
            )}
            <button type="button" className="btn-icon" onClick={() => setEditing(member.id)} aria-label={`Modifier ${member.name}`}>
              <Pencil className="w-4 h-4" />
            </button>
            <button type="button" className="btn-icon btn-icon-danger" onClick={() => handleRemove(member)} aria-label={`Supprimer ${member.name}`}>
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )
      )}

      {editing === 'new' ? (
        <EntityEditor withRole initial={{ name: '', role: '', color: nextPresetColor(teamMembers) }} namePlaceholder="Nom du membre" submitLabel="Ajouter" onSubmit={handleAdd} onCancel={() => setEditing(null)} />
      ) : (
        <button type="button" className="btn-dashed" onClick={() => setEditing('new')}>
          <Plus className="w-4 h-4" /> Ajouter un membre
        </button>
      )}
    </div>
  );
}
