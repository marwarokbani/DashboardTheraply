/**
 * dates.js — Utilitaires de dates en HEURE LOCALE.
 *
 * Les échéances et dates de sprint sont stockées au format « YYYY-MM-DD »
 * (date calendaire, sans heure). Les horodatages (createdAt, completedAt…)
 * sont des ISO complets.
 *
 * Important : ne jamais utiliser `toISOString().split('T')[0]` pour obtenir
 * « aujourd'hui » : cela donne la date UTC, décalée d'un jour entre minuit
 * et 1 h en Tunisie (UTC+1). Toutes les fonctions ci-dessous travaillent
 * en heure locale.
 *
 * Chaque fonction qui dépend de « maintenant » accepte un paramètre `now`
 * pour rester pure et testable.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Complète un nombre sur 2 chiffres (3 → "03"). */
function pad2(n) {
  return String(n).padStart(2, '0');
}

/** Convertit une Date en « YYYY-MM-DD » selon l'heure locale. */
export function toISODate(date) {
  const d = date instanceof Date ? date : new Date(date);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Date calendaire du jour (« YYYY-MM-DD »), en heure locale. */
export function todayISO(now = new Date()) {
  return toISODate(now);
}

/** Vérifie qu'une chaîne est une date calendaire valide « YYYY-MM-DD ». */
export function isISODate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

/**
 * Transforme « YYYY-MM-DD » (ou un ISO complet) en Date locale à 00:00.
 * Retourne null si la valeur est vide ou invalide.
 */
export function parseISODate(value) {
  if (!value) return null;
  const datePart = String(value).slice(0, 10);
  if (!isISODate(datePart)) return null;
  const [y, m, d] = datePart.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Date calendaire locale (« YYYY-MM-DD ») d'un horodatage ISO complet.
 * Ex : "2026-09-25T23:30:00.000Z" → "2026-09-26" en Tunisie.
 */
export function timestampToISODate(timestamp) {
  if (!timestamp) return null;
  const d = new Date(timestamp);
  return Number.isNaN(d.getTime()) ? null : toISODate(d);
}

/** Ajoute (ou retire) des jours à une date « YYYY-MM-DD ». */
export function addDays(isoDate, days) {
  const d = parseISODate(isoDate);
  if (!d) return null;
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

/** Nombre de jours calendaires entre deux dates « YYYY-MM-DD » (b - a). */
export function diffDays(a, b) {
  const da = parseISODate(a);
  const db = parseISODate(b);
  if (!da || !db) return null;
  // Math.round absorbe les changements d'heure été/hiver
  return Math.round((db - da) / MS_PER_DAY);
}

/** Liste de toutes les dates entre start et end inclus. */
export function eachDay(startISO, endISO) {
  const total = diffDays(startISO, endISO);
  if (total === null || total < 0) return [];
  return Array.from({ length: total + 1 }, (_, i) => addDays(startISO, i));
}

/** Lundi de la semaine contenant la date (« YYYY-MM-DD »). */
export function getWeekStart(isoDate) {
  const d = parseISODate(isoDate);
  if (!d) return null;
  const day = d.getDay(); // 0 = dimanche
  const offset = day === 0 ? -6 : 1 - day;
  return addDays(isoDate, offset);
}

/**
 * Bornes d'une semaine (lundi → dimanche).
 * @param {Date} now
 * @param {number} weekOffset — 0 = semaine courante, -1 = semaine précédente
 * @returns {{ start: string, end: string }}
 */
export function getWeekRange(now = new Date(), weekOffset = 0) {
  const start = addDays(getWeekStart(todayISO(now)), weekOffset * 7);
  return { start, end: addDays(start, 6) };
}

/** true si la date « YYYY-MM-DD » est comprise entre start et end (inclus). */
export function isDateInRange(isoDate, start, end) {
  if (!isoDate || !start || !end) return false;
  return isoDate >= start && isoDate <= end; // le format ISO se compare comme une chaîne
}

/** true si l'horodatage tombe (en heure locale) entre start et end inclus. */
export function isTimestampInRange(timestamp, start, end) {
  return isDateInRange(timestampToISODate(timestamp), start, end);
}

// ============================================
// Formatage (français)
// ============================================

/** « 26/09 » */
export function formatDateShort(isoDate) {
  const d = parseISODate(isoDate);
  return d ? d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) : '';
}

/** « 26 sept. » */
export function formatDateMedium(isoDate) {
  const d = parseISODate(isoDate);
  return d ? d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '';
}

/** « samedi 26 septembre » */
export function formatDateLong(isoDate) {
  const d = parseISODate(isoDate);
  return d ? d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) : '';
}

/** « 26 septembre 2026 » à partir d'un horodatage ISO complet. */
export function formatTimestamp(timestamp) {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Libellé relatif d'une échéance : « Aujourd'hui », « Demain », « Hier »,
 * « Dans 3 j », « Il y a 2 j », sinon « 26/09 ».
 */
export function formatDueRelative(isoDate, now = new Date()) {
  const delta = diffDays(todayISO(now), isoDate);
  if (delta === null) return '';
  if (delta === 0) return "Aujourd'hui";
  if (delta === 1) return 'Demain';
  if (delta === -1) return 'Hier';
  if (delta > 1 && delta <= 6) return `Dans ${delta} j`;
  if (delta < -1 && delta >= -6) return `Il y a ${-delta} j`;
  return formatDateShort(isoDate);
}

/** Numéro de semaine ISO 8601 (la semaine 1 contient le premier jeudi de l'année). */
export function getISOWeekNumber(now = new Date()) {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = d.getDay() || 7;
  d.setDate(d.getDate() + 4 - day); // jeudi de la semaine
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d - yearStart) / MS_PER_DAY + 1) / 7);
}

/** « aujourd'hui à 14:05 » ou « 25/09/2026 à 14:05 » pour l'heure de dernière sauvegarde. */
export function formatSavedAt(date, now = new Date()) {
  if (!date) return null;
  const d = new Date(date);
  const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return toISODate(d) === toISODate(now) ? `aujourd'hui à ${time}` : `${d.toLocaleDateString('fr-FR')} à ${time}`;
}
