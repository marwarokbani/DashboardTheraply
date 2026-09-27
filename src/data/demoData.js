/**
 * demoData.js — Données de démonstration OPTIONNELLES (checkpoints de test ISTQB).
 *
 * Jamais chargées automatiquement : uniquement via « Charger des données de démo »
 * (Paramètres › Données). Les dates sont relatives à aujourd'hui.
 */

import { DEFAULT_MODULES, DEFAULT_SETTINGS, DEFAULT_TEAM_MEMBERS } from './initialData.js';
import { addDays, parseISODate, todayISO } from '../utils/dates.js';

/**
 * Construit l'état de démo.
 * @param {Date} now
 */
export function getDemoState(now = new Date()) {
  const today = todayISO(now);
  const day = (offset) => addDays(today, offset);
  // Horodatage à une heure donnée d'un jour relatif (ex : at(-2, 15) = avant-hier 15 h)
  const at = (offset, hour = 10) => {
    const d = parseISODate(day(offset));
    d.setHours(hour, 0, 0, 0);
    return d.toISOString();
  };

  let n = 0;
  /** Raccourci : checkpoint créé il y a `created` jours, terminé il y a `doneAgo` jours (ou non). */
  const task = (title, module, assignee, { priority = 'moyenne', status = 'todo', due = null, created = -12, doneAgo = null, description = '' } = {}) => {
    n += 1;
    const done = doneAgo !== null;
    return {
      id: `demo-task-${n}`,
      title,
      description,
      assignee,
      module,
      priority,
      status: done ? 'done' : status,
      dueDate: due === null ? null : day(due),
      estimate: null,
      sprintId: null,
      sprintAssignedAt: null,
      createdAt: at(created, 9),
      completedAt: done ? at(doneAgo, 16) : null,
    };
  };

  const tasks = [
    // Planification
    task('Rédiger le plan de test (périmètre, objectifs, critères de sortie)', 'planification', 'marwa', { priority: 'haute', due: -9, doneAgo: -9 }),
    task('Identifier les risques produit et projet', 'planification', 'marwa', { due: -8, doneAgo: -8 }),
    task("Définir l'environnement et les données de test", 'planification', 'sahar', { due: -7, doneAgo: -6 }),
    // Suivi et contrôle
    task('Mettre en place le suivi des anomalies (outil + workflow)', 'suivi', 'sahar', { due: -6, doneAgo: -5 }),
    task('Point hebdomadaire : indicateurs de couverture', 'suivi', 'marwa', { due: 1, status: 'in-progress' }),
    // Analyse
    task('Analyser les exigences du parcours de réservation', 'analyse', 'marwa', { priority: 'haute', due: -5, doneAgo: -4 }),
    task("Définir les conditions de test de l'authentification", 'analyse', 'sahar', { due: -4, doneAgo: -2 }),
    // Conception
    task('Concevoir les cas de test : partitions d’équivalence (inscription)', 'conception', 'sahar', { priority: 'haute', due: -2, doneAgo: -1 }),
    task('Concevoir les cas de test : valeurs limites (paiement)', 'conception', 'marwa', { priority: 'haute', due: -1, status: 'in-review' }),
    task('Table de décision : règles d’annulation de séance', 'conception', 'sahar', { due: 2, status: 'in-progress' }),
    // Implémentation
    task('Préparer les jeux de données de test', 'implementation', 'sahar', { due: 3 }),
    task('Automatiser les tests API (Spring Boot, JUnit + RestAssured)', 'implementation', 'marwa', { priority: 'haute', due: 5, status: 'in-progress' }),
    // Exécution
    task('Exécuter la campagne de tests fonctionnels', 'execution', 'sahar', { priority: 'haute', due: 7 }),
    task('Tests de non-régression après correctifs', 'execution', 'marwa', { due: 9 }),
    task('Retester les anomalies critiques', 'execution', 'sahar', { priority: 'haute', due: -1 }),
    // Clôture
    task('Rédiger le rapport de synthèse des tests', 'cloture', 'marwa', { due: 12 }),
    task('Archiver le testware et capitaliser les leçons apprises', 'cloture', 'marwa', { priority: 'basse', due: 14 }),
  ];

  return {
    tasks,
    milestones: [],
    notes: [
      { id: 'demo-note-1', author: 'sahar', type: 'blocage', text: "Environnement de recette indisponible : impossible d'exécuter les tests de paiement.", timestamp: at(-1, 11) },
    ],
    sprints: [],
    teamMembers: DEFAULT_TEAM_MEMBERS.map((m) => ({ ...m })),
    modules: DEFAULT_MODULES.map((m) => ({ ...m })),
    settings: { ...DEFAULT_SETTINGS },
  };
}
