/**
 * parseQuickTask.js — Saisie rapide d'une tâche en une ligne.
 *
 * Exemple : « Écrire l'API RDV @sahar #backend !haute 30/09 »
 *
 * Jetons reconnus (tous optionnels) :
 *   @nom        → assignée (début du prénom ou id, sans tenir compte des accents)
 *   #catégorie  → catégorie (id ou morceau du nom : #analyse, #execution…)
 *   !priorité   → haute / moyenne / basse (ou !h, !m, !b)
 *   JJ/MM ou JJ/MM/AAAA → échéance ; aussi « aujourd'hui », « demain »
 *   ~N          → estimation (points ou heures)
 *
 * Tout le reste forme le titre. Un jeton non reconnu (ex. @inconnu) reste
 * dans le titre et est signalé dans `warnings`.
 */

import { addDays, isISODate, todayISO } from './dates.js';

/** Minuscule sans accents ni espaces, pour comparer « Thérapeute » et « therapeute ». */
function normalize(text) {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, '');
}

/**
 * Convertit JJ/MM[/AAAA] en « YYYY-MM-DD ».
 * Sans année : année courante, ou la suivante si la date est passée depuis plus de 2 mois
 * (« 05/01 » saisi en septembre = janvier prochain).
 */
export function parseDayMonth(day, month, year, now = new Date()) {
  let y = year ? Number(year) : now.getFullYear();
  if (year && year.length === 2) y += 2000;
  const iso = `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  if (!isISODate(iso)) return null; // ex. 31/02
  if (!year && iso < addDays(todayISO(now), -60)) {
    const nextYear = `${y + 1}${iso.slice(4)}`;
    return isISODate(nextYear) ? nextYear : null; // 29/02 d'une année non bissextile
  }
  return iso;
}

/**
 * Analyse une saisie rapide.
 * @param {string} input
 * @param {object} context
 * @param {Array} context.teamMembers
 * @param {Array} context.modules
 * @param {{ assignee?: string|null, module?: string|null, sprintId?: string|null }} context.defaults
 * @param {Date} [context.now]
 * @returns {{ title, assignee, module, priority, dueDate, estimate, sprintId, warnings: string[] }}
 */
export function parseQuickTask(input, { teamMembers = [], modules = [], defaults = {}, now = new Date() } = {}) {
  let text = ` ${String(input || '')} `;
  const warnings = [];
  const result = {
    assignee: defaults.assignee ?? null,
    module: defaults.module ?? null,
    priority: 'moyenne',
    dueDate: null,
    estimate: null,
    sprintId: defaults.sprintId ?? null,
  };

  /** Retire un jeton du texte. */
  const consume = (token) => {
    text = text.replace(token, ' ');
  };

  // @membre
  for (const match of text.matchAll(/\s@([^\s@#!~]+)/g)) {
    const query = normalize(match[1]);
    const found = teamMembers.find((m) => normalize(m.id) === query || normalize(m.name).startsWith(query));
    if (found) {
      result.assignee = found.id;
      consume(match[0]);
    } else {
      warnings.push(`Membre « ${match[1]} » introuvable`);
    }
  }

  // #module
  for (const match of text.matchAll(/\s#([^\s@#!~]+)/g)) {
    const query = normalize(match[1]);
    const found = modules.find((m) => normalize(m.id) === query)
      || modules.find((m) => normalize(m.name).includes(query));
    if (found) {
      result.module = found.id;
      consume(match[0]);
    } else {
      warnings.push(`Catégorie « ${match[1]} » introuvable`);
    }
  }

  // !priorité
  const priorityMatch = text.match(/\s!(haute|haut|h|moyenne|moy|m|basse|bas|b)(?=\s)/i);
  if (priorityMatch) {
    const p = priorityMatch[1][0].toLowerCase();
    result.priority = p === 'h' ? 'haute' : p === 'b' ? 'basse' : 'moyenne';
    consume(priorityMatch[0]);
  }

  // ~estimation
  const estimateMatch = text.match(/\s~(\d+(?:[.,]\d+)?)(?=\s)/);
  if (estimateMatch) {
    result.estimate = Number(estimateMatch[1].replace(',', '.'));
    consume(estimateMatch[0]);
  }

  // Échéance : JJ/MM[/AAAA]
  const dateMatch = text.match(/\s(\d{1,2})\/(\d{1,2})(?:\/(\d{2}|\d{4}))?(?=\s)/);
  if (dateMatch) {
    const iso = parseDayMonth(dateMatch[1], dateMatch[2], dateMatch[3], now);
    if (iso) {
      result.dueDate = iso;
      consume(dateMatch[0]);
    } else {
      warnings.push(`Date « ${dateMatch[0].trim()} » invalide`);
    }
  } else {
    // Mots-clés relatifs
    const relative = text.match(/\s(aujourd'hui|aujourd’hui|demain)(?=\s)/i);
    if (relative) {
      result.dueDate = addDays(todayISO(now), relative[1].toLowerCase() === 'demain' ? 1 : 0);
      consume(relative[0]);
    }
  }

  return { ...result, title: text.replace(/\s+/g, ' ').trim(), warnings };
}
