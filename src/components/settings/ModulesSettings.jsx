/**
 * ModulesSettings — Catégories des checkpoints (phases de test ISTQB par défaut) :
 * ajouter, renommer, changer la couleur, supprimer.
 */
import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import EntityEditor from './EntityEditor';
import { addModule, countReferences, nextPresetColor, removeModule, updateModule } from '../../utils/team';

export default function ModulesSettings({ data, updateData, showToast }) {
  const [editing, setEditing] = useState(null); // id | 'new' | null
  const { modules, tasks } = data;

  const handleAdd = (fields) => {
    updateData((prev) => ({ ...prev, modules: addModule(prev.modules, fields) }));
    setEditing(null);
  };

  const handleUpdate = (moduleId, { name, color }) => {
    updateData((prev) => ({ ...prev, modules: updateModule(prev.modules, moduleId, { name, color }) }));
    setEditing(null);
  };

  const handleRemove = (mod) => {
    const count = countReferences(tasks, 'module', mod.id);
    const detail = count ? ` ${count} tâche(s) passeront « sans catégorie ».` : '';
    if (!confirm(`Supprimer la catégorie ${mod.name} ?${detail}`)) return;
    updateData((prev) => ({ ...prev, ...removeModule(prev, mod.id) }));
    showToast(`Catégorie ${mod.name} supprimée`, 'success', { label: 'Annuler', undo: true });
  };

  return (
    <div className="space-y-2">
      {modules.map((mod) =>
        editing === mod.id ? (
          <EntityEditor key={mod.id} initial={mod} namePlaceholder="Nom de la catégorie" submitLabel="Enregistrer" onSubmit={(f) => handleUpdate(mod.id, f)} onCancel={() => setEditing(null)} />
        ) : (
          <div key={mod.id} className="settings-row">
            <span className="w-3 h-3 rounded-full shrink-0" style={{ background: mod.color }} aria-hidden />
            <p className="flex-1 text-sm font-medium text-primary truncate">{mod.name}</p>
            <span className="text-xs text-tertiary tabular-nums">{countReferences(tasks, 'module', mod.id)} tâches</span>
            <button type="button" className="btn-icon" onClick={() => setEditing(mod.id)} aria-label={`Modifier ${mod.name}`}>
              <Pencil className="w-4 h-4" />
            </button>
            <button type="button" className="btn-icon btn-icon-danger" onClick={() => handleRemove(mod)} aria-label={`Supprimer ${mod.name}`}>
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )
      )}

      {editing === 'new' ? (
        <EntityEditor initial={{ name: '', color: nextPresetColor(modules) }} namePlaceholder="Nom de la catégorie" submitLabel="Ajouter" onSubmit={handleAdd} onCancel={() => setEditing(null)} />
      ) : (
        <button type="button" className="btn-dashed" onClick={() => setEditing('new')}>
          <Plus className="w-4 h-4" /> Ajouter une catégorie
        </button>
      )}
    </div>
  );
}
