/**
 * QuickAdd — Ajout rapide en une ligne, avec aperçu en direct de ce qui a été compris.
 *
 * « Écrire l'API RDV @sahar #backend !haute 30/09 » → titre, assignée, module,
 * priorité, échéance. Sans jeton : assignée à moi, catégorie du filtre actif,
 * pas d'échéance.
 */
import { forwardRef, useMemo, useState } from 'react';
import { CornerDownLeft, Plus } from 'lucide-react';
import { parseQuickTask } from '../../utils/parseQuickTask';
import { findById } from '../../utils/team';
import { formatDueRelative } from '../../utils/dates';
import { PRIORITIES } from '../../data/initialData';

const QuickAdd = forwardRef(function QuickAdd({ teamMembers, modules, defaults, onAdd }, ref) {
  const [draft, setDraft] = useState('');
  const preview = useMemo(
    () => (draft.trim() ? parseQuickTask(draft, { teamMembers, modules, defaults }) : null),
    [draft, teamMembers, modules, defaults]
  );

  const submit = (e) => {
    e.preventDefault();
    if (preview?.title && onAdd(draft)) setDraft('');
  };

  const assignee = preview && findById(teamMembers, preview.assignee);
  const module = preview && findById(modules, preview.module);
  const priority = preview && PRIORITIES.find((p) => p.id === preview.priority);

  return (
    <form onSubmit={submit} className="space-y-2">
      <div className="quick-add">
        <Plus className="w-4 h-4 text-tertiary shrink-0" aria-hidden />
        <input
          ref={ref}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ajouter un checkpoint…  @membre  #catégorie  !haute  30/09"
          aria-label="Ajouter une tâche (saisie rapide)"
          aria-describedby="quick-add-preview"
          className="flex-1 min-w-0 bg-transparent outline-none text-sm text-primary placeholder:text-[var(--text-tertiary)] py-1.5"
        />
        <button type="submit" className="btn btn-primary h-8" disabled={!preview?.title}>
          <span className="hidden sm:inline">Ajouter</span>
          <CornerDownLeft className="w-3.5 h-3.5" aria-hidden />
        </button>
      </div>

      {/* Aperçu de l'analyse */}
      <div id="quick-add-preview" aria-live="polite" className="flex flex-wrap items-center gap-1.5 min-h-[1.5rem] px-1 text-xs">
        {preview?.title && (
          <>
            <span className="text-tertiary">Sera créée :</span>
            <span className="chip">{assignee ? assignee.name : 'Non assignée'}</span>
            {module && <span className="chip">{module.name}</span>}
            <span className="chip">Priorité {priority?.label.toLowerCase()}</span>
            {preview.dueDate && <span className="chip">{formatDueRelative(preview.dueDate)}</span>}
            {preview.estimate !== null && <span className="chip">{preview.estimate} pts</span>}
            {preview.warnings.map((w) => <span key={w} className="chip chip-warning">{w}</span>)}
          </>
        )}
      </div>
    </form>
  );
});

export default QuickAdd;
