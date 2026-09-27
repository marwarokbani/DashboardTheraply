/**
 * colors.js — Couleurs sémantiques (statuts, priorités, séries de graphiques).
 *
 * Les valeurs pointent vers des variables CSS définies dans index.css, pour
 * que le mode clair/sombre s'applique partout (y compris dans les SVG Recharts).
 */

export const STATUS_COLORS = {
  todo: 'var(--status-todo)',
  'in-progress': 'var(--status-progress)',
  'in-review': 'var(--status-review)',
  done: 'var(--status-done)',
};

export const PRIORITY_COLORS = {
  haute: 'var(--priority-high)',
  moyenne: 'var(--priority-medium)',
  basse: 'var(--priority-low)',
};

/** Couleur d'un statut (gris neutre si inconnu). */
export function statusColor(statusId) {
  return STATUS_COLORS[statusId] || 'var(--status-todo)';
}

/** Couleur d'une priorité (gris neutre si inconnue). */
export function priorityColor(priorityId) {
  return PRIORITY_COLORS[priorityId] || 'var(--status-todo)';
}
