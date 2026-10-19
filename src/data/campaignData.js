/**
 * campaignData.js — Campagne de test Theraply (15 septembre → 15 octobre 2026).
 *
 * Contenu tiré du document de synthèse de la campagne (DocTest.pdf) :
 * 157 cas de test, 97 exigences, 20 défauts trouvés.
 * Rédigé pour un public non spécialiste : titres simples, jargon expliqué
 * dans les descriptions.
 *
 * Organisation : chaque jour ouvré, Marwa (cheffe de projet & responsable des
 * tests) et Sahar (testeuse qualité du code) terminent chacune une tâche,
 * soit 23 tâches par personne sur les 5 semaines du projet.
 *
 * Chargée automatiquement une seule fois (repère `settings.campaign`), puis à
 * la demande (Paramètres › Données › « Charger la campagne de test »).
 */

import { DEFAULT_SETTINGS, DEFAULT_TEAM_MEMBERS } from './initialData.js';

/** Repère enregistré dans les réglages une fois la campagne chargée (changer la valeur la recharge une fois). */
export const CAMPAIGN_ID = 'theraply-2026-09-15-v2';

/** true si ces données contiennent déjà la campagne (chargée automatiquement ou à la main). */
export function hasCampaign(data) {
  return data?.settings?.campaign === CAMPAIGN_ID;
}

/** Les 9 étapes du projet, dans l'ordre chronologique. */
export const CAMPAIGN_MODULES = [
  { id: 'cadrage', name: '1 · Comprendre le projet', color: '#6d28d9' },
  { id: 'outils', name: '2 · Installer les outils', color: '#0369a1' },
  { id: 'preparation', name: '3 · Préparer les tests', color: '#a21caf' },
  { id: 'code', name: '4 · Tester le code', color: '#b45309' },
  { id: 'fonctions', name: '5 · Tester les fonctions et l’IA', color: '#047857' },
  { id: 'utilisateur', name: '6 · Tester comme un utilisateur', color: '#be123c' },
  { id: 'robustesse', name: '7 · Performance et sécurité', color: '#0e7490' },
  { id: 'suivi', name: '8 · Automatiser et suivre les défauts', color: '#4d7c0f' },
  { id: 'bilan', name: '9 · Bilan et résultats', color: '#9a3412' },
];

/** Horodatage ISO d'un jour « YYYY-MM-DD » à une heure donnée, heure de Tunis (UTC+1). */
const at = (date, hour) => new Date(`${date}T${String(hour).padStart(2, '0')}:00:00+01:00`).toISOString();

/**
 * Planning jour par jour : [date, tâche de Marwa, tâche de Sahar].
 * Tâche : [titre, étape, priorité, description].
 */
const PLANNING = [
  // ── Semaine 1 · 15 → 18 sept. : comprendre le projet et installer les outils ──
  ['2026-09-15',
    ['Lire le cahier des charges de Theraply', 'cadrage', 'haute',
      'Comprendre ce que l’application doit faire pour ses quatre publics : patients, thérapeutes, administrateurs et assistant IA.'],
    ['Étudier le code de l’application', 'cadrage', 'moyenne',
      'Parcourir le serveur (Spring Boot, 19 modules), le site web (Angular) et la base de données pour savoir où chercher les défauts.'],
  ],
  ['2026-09-16',
    ['Lister les risques de l’application', 'cadrage', 'haute',
      'Repérer ce qui pourrait nuire à un patient : fuite de données de santé, message de détresse non détecté, erreur de l’IA. Les tests les plus importants porteront sur ces risques.'],
    ['Faire l’inventaire des tests déjà existants', 'cadrage', 'moyenne',
      'Le projet contenait déjà 867 tests automatiques : on les a recensés pour savoir ce qui était déjà vérifié et ce qui manquait.'],
  ],
  ['2026-09-17',
    ['Fixer les 13 règles à ne jamais enfreindre', 'cadrage', 'haute',
      'Exemples : un patient ne voit jamais les écrits d’un autre, un message suicidaire est toujours signalé, les données sont effacées sur demande.'],
    ['Créer un environnement de test séparé', 'outils', 'haute',
      'Une copie complète de l’application (serveur, site, base) lancée en une commande avec Docker, sans risque pour la version de démonstration. Prête en 57 secondes.'],
  ],
  ['2026-09-18',
    ['Installer l’outil de gestion des tests', 'outils', 'haute',
      'Kiwi TCMS : le « tableau de bord » des tests, qui regroupe exigences, cas de test, résultats et défauts au même endroit.'],
    ['Installer l’outil d’analyse de la qualité du code', 'outils', 'moyenne',
      'SonarQube : relit le code automatiquement pour signaler les erreurs probables, les failles et le code difficile à maintenir.'],
  ],

  // ── Semaine 2 · 21 → 25 sept. : préparer les tests ──
  ['2026-09-21',
    ['Installer le robot qui lance les tests tout seul', 'outils', 'moyenne',
      'Jenkins : à chaque modification du code, il relance les tests automatiquement et prévient en cas de problème.'],
    ['Préparer la simulation de pannes', 'outils', 'moyenne',
      'Un script qui coupe réellement l’IA ou la recherche de textes, pour vérifier que l’application réagit proprement en cas de panne.'],
  ],
  ['2026-09-22',
    ['Rédiger les 97 exigences à vérifier', 'preparation', 'haute',
      'Chaque phrase du cahier des charges devient une exigence vérifiable, avec un identifiant (ex. REQ-PAT-14).'],
    ['Préparer les données de test fictives', 'preparation', 'moyenne',
      'Patients, thérapeutes et rendez-vous inventés : aucune vraie personne, toutes les adresses se terminent par @example.test.'],
  ],
  ['2026-09-23',
    ['Rédiger le plan de test', 'preparation', 'haute',
      'Le document de référence : ce qu’on teste, à quel niveau, avec quels outils, dans quel ordre, et à partir de quand on considère que c’est terminé.'],
    ['Écrire les cas de test du code', 'preparation', 'moyenne',
      '28 cas qui vérifient chaque règle isolément, par exemple « le patient peut annuler 24 h avant, mais pas 23 h 59 avant ».'],
  ],
  ['2026-09-24',
    ['Écrire les cas de test des parcours utilisateurs', 'preparation', 'moyenne',
      '41 cas qui suivent un vrai utilisateur de bout en bout (inscription, choix du thérapeute, rendez-vous) et ce que la réglementation exige.'],
    ['Écrire les cas de test des fonctions et de l’IA', 'preparation', 'haute',
      '88 cas qui vérifient l’application à travers son serveur : droits d’accès, confidentialité, messagerie, réponses de l’IA.'],
  ],
  ['2026-09-25',
    ['Relier chaque exigence à ses tests', 'preparation', 'moyenne',
      'Un tableau de correspondance : si un test échoue, on sait tout de suite quelle promesse du produit n’est pas tenue. Les 97 exigences sont couvertes.'],
    ['Importer les 157 cas de test dans l’outil de suivi', 'preparation', 'moyenne',
      'Les cas sont écrits une seule fois puis envoyés automatiquement dans Kiwi, avec leur priorité et leur catégorie.'],
  ],

  // ── Semaine 3 · 28 sept. → 2 oct. : tester le code et les fonctions ──
  ['2026-09-28',
    ['Tester l’inscription et la connexion', 'fonctions', 'haute',
      'Inscription valide ou refusée, âge minimum, blocage après plusieurs mots de passe erronés. Tous les tests passent.'],
    ['Tester les règles de réservation des rendez-vous', 'code', 'haute',
      'Délais de réservation, d’annulation et de report, testés juste avant et juste après chaque limite. Tous les tests passent.'],
  ],
  ['2026-09-29',
    ['Tester la prise de rendez-vous et la messagerie', 'fonctions', 'moyenne',
      'Réserver, annuler, reporter, échanger des messages et des pièces jointes avec son thérapeute.'],
    ['Tester le chiffrement et la protection des données', 'code', 'haute',
      'Les informations sensibles sont chiffrées en base, le nombre de requêtes est limité et aucune donnée privée n’apparaît dans les journaux.'],
  ],
  ['2026-09-30',
    ['Tester les droits du thérapeute et de l’administrateur', 'fonctions', 'haute',
      'Chacun n’accède qu’à ce qu’il a le droit de voir : notes privées réservées au thérapeute, validation des thérapeutes par l’administrateur.'],
    ['Tester les règles de l’IA dans le code', 'code', 'moyenne',
      'Le choix des thérapeutes respecte toujours les critères obligatoires, et les mots à risque sont reconnus en français et en anglais.'],
  ],
  ['2026-10-01',
    ['Vérifier qu’un patient ne voit que ses propres données', 'fonctions', 'haute',
      'Même en interrogeant l’IA, un patient ne retrouve jamais les écrits d’un autre patient. Test réussi.'],
    ['Développer une fonctionnalité en écrivant le test d’abord', 'code', 'moyenne',
      'Méthode TDD : on écrit le test, puis le code qui le fait passer. Résultat : une « horloge de démonstration » qui permet d’avancer le temps pendant les tests.'],
  ],
  ['2026-10-02',
    ['Vérifier la suppression complète d’un compte', 'fonctions', 'haute',
      'Droit à l’effacement : après suppression, les données disparaissent et l’ancien accès ne fonctionne plus.'],
    ['Mesurer la part du code vérifiée par les tests', 'code', 'moyenne',
      '86 % des lignes de code sont exécutées par les tests, au-dessus de l’objectif de 80 %. Les 867 tests automatiques passent.'],
  ],

  // ── Semaine 4 · 5 → 9 oct. : IA, parcours utilisateurs, performance et sécurité ──
  ['2026-10-05',
    ['Tester la recommandation de thérapeutes par l’IA', 'fonctions', 'moyenne',
      'L’IA propose des thérapeutes adaptés au patient et explique son choix ; elle continue de fonctionner si une partie du service est coupée.'],
    ['Tester l’assistant IA avec le vrai modèle', 'fonctions', 'haute',
      'L’assistant répond à partir du journal du patient en citant ses sources. Testé avec la vraie IA, jamais simulée : cela a révélé des défauts invisibles autrement.'],
  ],
  ['2026-10-06',
    ['Couper l’IA volontairement et observer la réaction', 'fonctions', 'haute',
      'L’application refuse proprement de répondre, mais l’incident de sécurité attendu n’est pas enregistré : défaut bloquant signalé (ANO-06).'],
    ['Tester la détection des messages à risque', 'fonctions', 'haute',
      'Un message de détresse doit toujours être signalé. Certaines phrases en français ne sont pas toujours détectées : défaut signalé (ANO-20).'],
  ],
  ['2026-10-07',
    ['Tester le rendez-vous à partir d’un modèle', 'utilisateur', 'moyenne',
      'On décrit les 7 états d’un rendez-vous (demandé, confirmé, terminé…) et un outil génère les tests. 100 % des 14 passages vérifiés, sans erreur.'],
    ['Préparer les tests dans un vrai navigateur', 'utilisateur', 'moyenne',
      'Playwright pilote Chrome comme un utilisateur : il clique, remplit les formulaires et vérifie ce qui s’affiche à l’écran.'],
  ],
  ['2026-10-08',
    ['Tester avec de nombreux utilisateurs en même temps', 'robustesse', 'haute',
      'Simulation de charge : à partir de 10 connexions simultanées, le serveur se bloque 30 secondes. Défaut bloquant signalé (ANO-11).'],
    ['Tester les 15 parcours patient, thérapeute et admin', 'utilisateur', 'haute',
      'Parcours complets dans le navigateur. Le patient est bloqué au choix du thérapeute et ne peut pas rejoindre sa séance : défauts signalés.'],
  ],
  ['2026-10-09',
    ['Évaluer la qualité des réponses de l’IA', 'utilisateur', 'moyenne',
      'Grille de 5 critères (ton, bienveillance, prudence) : notes de 4,1 à 5 sur 5, jamais de diagnostic ni de conseil médical.'],
    ['Rechercher les failles de sécurité', 'robustesse', 'haute',
      'OWASP ZAP attaque l’application (en local uniquement) pour trouver des failles connues : protections du site manquantes, signalées.'],
  ],

  // ── Semaine 5 · 12 → 15 oct. : automatiser, suivre les défauts et conclure ──
  ['2026-10-12',
    ['Mettre en place la chaîne de tests automatique', 'suivi', 'moyenne',
      'Jenkins enchaîne tout seul : construction, tests du code, des fonctions, du navigateur, puis envoi des résultats. Parcours rapide en 3 minutes.'],
    ['Analyser la qualité du code', 'robustesse', 'moyenne',
      'SonarQube a analysé le serveur et le site web : contrôle qualité réussi sur les deux.'],
  ],
  ['2026-10-13',
    ['Classer les défauts par gravité', 'suivi', 'haute',
      '20 défauts : 3 bloquants, 10 majeurs, 7 mineurs. 3 sont déjà corrigés et vérifiés, 17 restent à corriger par les développeurs.'],
    ['Documenter les 20 défauts trouvés', 'suivi', 'haute',
      'Une fiche par défaut : comment le reproduire, ce qui était attendu, ce qui s’est passé, et la correction proposée.'],
  ],
  ['2026-10-14',
    ['Comparer le suivi avec et sans outils reliés', 'bilan', 'moyenne',
      'Expérience : analyser un échec demande 5 à 6 étapes dans 5 documents sans outils reliés, contre 2 étapes dans un seul outil avec Kiwi.'],
    ['Relier automatiquement les résultats à l’outil de suivi', 'suivi', 'moyenne',
      'Chaque résultat de test revient tout seul dans Kiwi et dans un rapport unique (Allure), avec sa preuve et le défaut associé.'],
  ],
  ['2026-10-15',
    ['Rédiger le bilan final et le verdict', 'bilan', 'haute',
      'Verdict : bases solides (droits, confidentialité, rendez-vous), mais application pas encore prête pour une bêta tant que les 2 défauts bloquants ne sont pas corrigés.'],
    ['Calculer les chiffres clés de la campagne', 'bilan', 'moyenne',
      '157 cas de test, 135 réussis, 97 exigences sur 97 couvertes, 92 % des tests automatisés, 86 % du code vérifié.'],
  ],
];

/** Construit l'état complet de la campagne (format v4). */
export function getCampaignState() {
  // Tout le planning est posé le premier jour : la progression monte ensuite jour après jour
  const plannedAt = at(PLANNING[0][0], 9);
  const tasks = [];
  PLANNING.forEach(([date, marwaTask, saharTask]) => {
    [['marwa', marwaTask, 11], ['sahar', saharTask, 16]].forEach(([assignee, [title, module, priority, description], hour]) => {
      tasks.push({
        id: `campagne-${String(tasks.length + 1).padStart(2, '0')}`,
        title,
        description,
        assignee,
        module,
        priority,
        status: 'done',
        dueDate: date,
        estimate: null,
        sprintId: null,
        sprintAssignedAt: null,
        createdAt: plannedAt,
        completedAt: at(date, hour),
      });
    });
  });

  return {
    tasks,
    milestones: [],
    notes: [],
    sprints: [],
    teamMembers: DEFAULT_TEAM_MEMBERS.map((m) => ({ ...m })),
    modules: CAMPAIGN_MODULES.map((m) => ({ ...m })),
    settings: { ...DEFAULT_SETTINGS, campaign: CAMPAIGN_ID },
  };
}
