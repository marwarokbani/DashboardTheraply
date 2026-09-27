/**
 * ids.js — Génération d'identifiants uniques.
 */

/**
 * Génère un identifiant unique préfixé (ex : "task-1f3a…").
 * Utilise crypto.randomUUID quand il est disponible (navigateurs récents, Node 19+).
 * @param {string} prefix
 */
export function generateId(prefix = 'item') {
  const random = globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
  return `${prefix}-${random}`;
}
