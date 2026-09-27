/**
 * EntityEditor — Formulaire commun d'ajout / modification d'un membre ou d'un module
 * (nom, rôle optionnel, couleur).
 */
import { useState } from 'react';
import ColorPicker from '../ui/ColorPicker';

export default function EntityEditor({ initial, withRole = false, namePlaceholder, submitLabel, onSubmit, onCancel }) {
  const [fields, setFields] = useState(initial);
  const canSubmit = fields.name.trim().length > 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (canSubmit) onSubmit({ ...fields, name: fields.name.trim(), role: (fields.role || '').trim() });
  };

  return (
    <form onSubmit={handleSubmit} className="settings-card space-y-3">
      <div className={`grid gap-2 ${withRole ? 'sm:grid-cols-2' : ''}`}>
        <input
          className="input"
          aria-label="Nom"
          placeholder={namePlaceholder}
          value={fields.name}
          onChange={(e) => setFields((f) => ({ ...f, name: e.target.value }))}
          autoFocus
        />
        {withRole && (
          <input
            className="input"
            aria-label="Rôle"
            placeholder="Rôle (optionnel)"
            value={fields.role || ''}
            onChange={(e) => setFields((f) => ({ ...f, role: e.target.value }))}
          />
        )}
      </div>
      <ColorPicker value={fields.color} onChange={(color) => setFields((f) => ({ ...f, color }))} />
      <div className="flex gap-2">
        <button type="submit" className="btn btn-primary flex-1" disabled={!canSubmit}>{submitLabel}</button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Annuler</button>
      </div>
    </form>
  );
}
