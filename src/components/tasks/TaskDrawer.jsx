/**
 * TaskDrawer — Panneau latéral d'édition d'une tâche.
 *
 * Enregistrement immédiat, sans bouton « Sauvegarder » :
 * - listes et dates : à chaque changement ;
 * - titre et description : en quittant le champ (ou Entrée pour le titre).
 * Échap ferme le panneau. Chaque modification est annulable (Ctrl+Z).
 *
 * Le parent passe `key={task.id}` : l'état local est réinitialisé à chaque tâche.
 */
import { useEffect, useRef, useState } from 'react';
import { AlignLeft, CalendarDays, CircleDot, Flag, Gauge, IterationCw, Layers, Trash2, User, X } from 'lucide-react';
import { PRIORITIES, STATUSES } from '../../data/initialData';
import { formatTimestamp } from '../../utils/dates';
import { isOverdue } from '../../utils/tasks';
import { statusColor } from '../../theme/colors';

/** Ligne « libellé : champ » du panneau. */
function Field({ icon: Icon, label, htmlFor, children }) {
  return (
    <div className="drawer-field">
      <label htmlFor={htmlFor} className="drawer-label">
        <Icon className="w-3.5 h-3.5" aria-hidden /> {label}
      </label>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export default function TaskDrawer({ task, data, onClose, onChange, onDelete }) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [estimate, setEstimate] = useState(task.estimate ?? '');
  const titleRef = useRef(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // À l'ouverture : focus sur le titre. Échap ferme le panneau après avoir
  // enregistré le champ en cours (le blur déclenche son enregistrement).
  useEffect(() => {
    titleRef.current?.focus();
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      document.activeElement?.blur?.();
      onCloseRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /** Enregistre un champ s'il a changé. */
  const commit = (patch) => {
    const changed = Object.entries(patch).some(([key, value]) => (task[key] ?? null) !== (value ?? null));
    if (changed) onChange(task.id, patch);
  };

  const commitTitle = () => {
    const trimmed = title.trim();
    if (!trimmed) setTitle(task.title); // un titre vide n'est pas enregistré
    else commit({ title: trimmed });
  };

  const commitEstimate = () => {
    const value = estimate === '' ? null : Number(estimate);
    commit({ estimate: Number.isFinite(value) && value >= 0 ? value : null });
  };

  const handleDelete = () => {
    onDelete(task.id);
    onClose();
  };

  const select = (key, value) => commit({ [key]: value || null });
  const overdue = isOverdue(task);

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} aria-hidden />
      <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
        <header className="drawer-header">
          <span className="meta-tag" style={{ color: statusColor(task.status) }}>
            <CircleDot className="w-3.5 h-3.5" aria-hidden />
            {STATUSES.find((s) => s.id === task.status)?.label}
          </span>
          {overdue && <span className="meta-tag text-danger">En retard</span>}
          <div className="ml-auto flex items-center gap-1">
            <button type="button" className="btn-icon btn-icon-danger" onClick={handleDelete} aria-label="Supprimer la tâche">
              <Trash2 className="w-4 h-4" />
            </button>
            <button type="button" className="btn-icon" onClick={onClose} aria-label="Fermer le panneau">
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        <div className="drawer-body">
          <label htmlFor="drawer-title" className="sr-only">Titre</label>
          <textarea
            id="drawer-title"
            ref={titleRef}
            rows={2}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                e.currentTarget.blur();
              }
            }}
            className="drawer-title"
          />

          <div className="space-y-1 my-5">
            <Field icon={CircleDot} label="Statut" htmlFor="f-status">
              <select id="f-status" className="drawer-input" value={task.status} onChange={(e) => select('status', e.target.value)}>
                {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </Field>
            <Field icon={Flag} label="Priorité" htmlFor="f-priority">
              <select id="f-priority" className="drawer-input" value={task.priority} onChange={(e) => select('priority', e.target.value)}>
                {PRIORITIES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </Field>
            <Field icon={User} label="Assignée" htmlFor="f-assignee">
              <select id="f-assignee" className="drawer-input" value={task.assignee || ''} onChange={(e) => select('assignee', e.target.value)}>
                <option value="">Non assignée</option>
                {data.teamMembers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </Field>
            <Field icon={Layers} label="Catégorie" htmlFor="f-module">
              <select id="f-module" className="drawer-input" value={task.module || ''} onChange={(e) => select('module', e.target.value)}>
                <option value="">Sans catégorie</option>
                {data.modules.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </Field>
            {data.sprints.length > 0 && (
              <Field icon={IterationCw} label="Sprint" htmlFor="f-sprint">
                <select id="f-sprint" className="drawer-input" value={task.sprintId || ''} onChange={(e) => select('sprintId', e.target.value)}>
                  <option value="">Backlog (sans sprint)</option>
                  {data.sprints.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}{s.status === 'active' ? ' (actif)' : s.status === 'closed' ? ' (clôturé)' : ' (planifié)'}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <Field icon={CalendarDays} label="Échéance" htmlFor="f-due">
              <input id="f-due" type="date" className="drawer-input" value={task.dueDate || ''} onChange={(e) => select('dueDate', e.target.value)} />
            </Field>
            <Field icon={Gauge} label="Estimation" htmlFor="f-estimate">
              <input
                id="f-estimate"
                type="number"
                min="0"
                step="0.5"
                inputMode="decimal"
                placeholder="Points ou heures"
                className="drawer-input"
                value={estimate}
                onChange={(e) => setEstimate(e.target.value)}
                onBlur={commitEstimate}
              />
            </Field>
          </div>

          {task.legacyDeadline && !task.dueDate && (
            <p className="text-xs text-secondary mb-4 p-3 rounded-lg" style={{ background: 'var(--bg-subtle)' }}>
              Ancienne échéance importée : « {task.legacyDeadline} ». Choisissez une date ci-dessus.
            </p>
          )}

          <label htmlFor="drawer-description" className="drawer-label mb-2">
            <AlignLeft className="w-3.5 h-3.5" aria-hidden /> Description
          </label>
          <textarea
            id="drawer-description"
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() => commit({ description })}
            placeholder="Contexte, critères d'acceptation, liens…"
            className="input resize-y"
          />
        </div>

        <footer className="drawer-footer">
          <span>Créée le {formatTimestamp(task.createdAt)}</span>
          {task.completedAt && <span>Terminée le {formatTimestamp(task.completedAt)}</span>}
        </footer>
      </aside>
    </>
  );
}
