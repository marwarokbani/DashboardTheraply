/**
 * initialData.js — Constantes fixes et état initial VIDE du dashboard.
 *
 * Les données métier (tâches, sprints, membres, modules, jalons, notes)
 * vivent dans le localStorage via useSaveData : rien n'est codé en dur ici
 * à part les listes fixes (statuts, priorités) et la configuration de
 * départ de l'équipe, entièrement éditable depuis la page Paramètres.
 */

/** Version courante du format de sauvegarde (voir data/migrations.js). */
export const DATA_VERSION = 4;

// ============================================
// Statuts de tâche (fixes)
// ============================================

export const STATUSES = [
  { id: 'todo', label: 'À faire' },
  { id: 'in-progress', label: 'En cours' },
  { id: 'in-review', label: 'En revue' },
  { id: 'done', label: 'Terminé' },
];

export const STATUS_IDS = STATUSES.map((s) => s.id);

// ============================================
// Priorités (fixes, de la plus urgente à la moins urgente)
// ============================================

export const PRIORITIES = [
  { id: 'haute', label: 'Haute' },
  { id: 'moyenne', label: 'Moyenne' },
  { id: 'basse', label: 'Basse' },
];

export const PRIORITY_IDS = PRIORITIES.map((p) => p.id);

// ============================================
// Configuration de départ de l'équipe Theraply
// (sert uniquement à initialiser un nouvel espace ; éditable ensuite)
// ============================================

export const DEFAULT_TEAM_MEMBERS = [
  { id: 'marwa', name: 'Marwa', role: 'Cheffe de projet & Dev', color: '#7c3aed' },
  { id: 'sahar', name: 'Sahar', role: 'Développeuse', color: '#0284c7' },
];

/** Catégories par défaut : phases du processus de test ISTQB (éditables). */
export const DEFAULT_MODULES = [
  { id: 'planification', name: 'Planification des tests', color: '#6d28d9' },
  { id: 'suivi', name: 'Suivi et contrôle', color: '#0369a1' },
  { id: 'analyse', name: 'Analyse de test', color: '#a21caf' },
  { id: 'conception', name: 'Conception des tests', color: '#b45309' },
  { id: 'implementation', name: 'Implémentation des tests', color: '#047857' },
  { id: 'execution', name: 'Exécution des tests', color: '#be123c' },
  { id: 'cloture', name: 'Clôture des tests', color: '#0e7490' },
];

/** Anciens modules par défaut (v1 à v3), remplacés par les phases ISTQB s'ils sont inutilisés. */
export const LEGACY_DEFAULT_MODULE_IDS = ['patient', 'therapeute', 'ia', 'admin', 'backend'];

export const DEFAULT_SETTINGS = {
  autoSave: true,
  autoSaveInterval: 120000, // 2 minutes
  currentUserId: 'marwa', // « moi » : assignée par défaut des nouvelles tâches
};

// ============================================
// État initial VIDE (premier lancement)
// ============================================

/**
 * Espace vide : aucune tâche, aucun sprint, aucun jalon.
 * L'écran d'accueil propose « Commence par ajouter ta première tâche »
 * et un bouton optionnel « Charger des données de démo ».
 */
export function getEmptyState() {
  return {
    tasks: [],
    milestones: [],
    notes: [],
    sprints: [],
    teamMembers: DEFAULT_TEAM_MEMBERS.map((m) => ({ ...m })),
    modules: DEFAULT_MODULES.map((m) => ({ ...m })),
    settings: { ...DEFAULT_SETTINGS },
  };
}
