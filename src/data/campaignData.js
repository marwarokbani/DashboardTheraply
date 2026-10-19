/**
 * campaignData.js — Campagne de test Theraply (15 septembre → 15 octobre 2026).
 *
 * Contenu tiré du document de synthèse de la campagne (DocTest.pdf) :
 * 11 phases, 157 cas de test, 97 exigences, 20 anomalies.
 * Chargée uniquement à la demande (Paramètres › Données › « Charger la campagne de test »).
 *
 * Rôles : Marwa, cheffe de projet & responsable des tests (stratégie, plan, Kiwi, MBT,
 * CI, tri des anomalies, bilan) ; Sahar, testeuse qualité du code (unitaire, TDD,
 * couverture, SonarQube, API, IA, E2E, charge, sécurité, fiches d'anomalies).
 *
 * Dates absolues (heure de Tunis) : les tâches terminées le sont à leur échéance ;
 * les suites à donner (§ 11 Recommandations) restent ouvertes après le 15 octobre.
 */

import { DEFAULT_MODULES, DEFAULT_SETTINGS, DEFAULT_TEAM_MEMBERS } from './initialData.js';

/** Horodatage ISO d'un jour « YYYY-MM-DD » à une heure donnée, heure de Tunis (UTC+1). */
const at = (date, hour) => new Date(`${date}T${String(hour).padStart(2, '0')}:00:00+01:00`).toISOString();

const M = 'marwa';
const S = 'sahar';

/** Construit l'état complet de la campagne (format v4). */
export function getCampaignState() {
  let n = 0;
  const tasks = [];
  /** start = début de la phase (création), due = échéance ; terminée par défaut à l'échéance, 16 h. */
  const task = (title, module, assignee, start, due, { priority = 'moyenne', description = '', status = 'done', doneOn = due } = {}) => {
    n += 1;
    const done = status === 'done';
    tasks.push({
      id: `campagne-${String(n).padStart(2, '0')}`,
      title,
      description,
      assignee,
      module,
      priority,
      status,
      dueDate: due,
      estimate: null,
      sprintId: null,
      sprintAssignedAt: null,
      createdAt: at(start, 9),
      completedAt: done ? at(doneOn, 16) : null,
    });
  };

  // ============================================
  // Semaine 1 — 15 → 20 sept : Phase 0 Découverte, Phase 1 Infrastructure
  // ============================================
  task('Lire le cahier des charges (BRIEF) et la stratégie de test', 'analyse', M, '2026-09-15', '2026-09-15', {
    priority: 'haute',
    description: "Base de test : BRIEF, docs/newdocs/TEST_STRATEGY.md et KICKOFF_PROMPT.md. Quatre publics : patients, thérapeutes, administration, services d'IA.",
  });
  task('Cartographier les 19 modules du backend et leurs risques', 'planification', M, '2026-09-15', '2026-09-16', {
    priority: 'haute',
    description: 'Monolithe modulaire Spring Boot 4.1.1 / Java 25, PostgreSQL 17 + pgvector, Angular 22. Livrable : reports/phase-0-decouverte.md.',
  });
  task('Analyser le code et la suite JUnit existante', 'analyse', S, '2026-09-15', '2026-09-16', {
    description: 'Lecture du code backend et front, repérage des 867 tests JUnit existants et des zones non couvertes.',
  });
  task('Recenser les 13 règles non négociables (N1 à N13)', 'analyse', M, '2026-09-15', '2026-09-17', {
    priority: 'haute',
    description: 'Données de santé (secret, consentement, effacement), IA non déterministe, situations de crise : un message suicidaire doit toujours être détecté.',
  });
  task('Monter la stack de test Docker Compose isolée', 'implementation', M, '2026-09-16', '2026-09-18', {
    priority: 'haute',
    description: 'tests/infra/docker-compose.test.yml : profils app, tcms, quality, ci. Stack prête en 57 s, séparée de la démo.',
  });
  task('Installer et configurer Kiwi TCMS 16.5', 'suivi', M, '2026-09-16', '2026-09-18', {
    priority: 'haute',
    description: 'Conteneur Docker (https://localhost:8444), API XML-RPC pour automatiser plans, cas, runs et bugs.',
  });
  task('Installer SonarQube 26.9 et brancher la couverture JaCoCo', 'implementation', S, '2026-09-16', '2026-09-19', {
    description: 'Quality Gate standard ; import de la couverture JaCoCo du build Maven.',
  });
  task('Installer Jenkins 2.580 LTS', 'implementation', M, '2026-09-16', '2026-09-19', {
    description: 'Auto-hébergé ; secrets stockés en identifiants Jenkins, jamais dans le code.',
  });
  task("Script d'injection de pannes réelles (fault.sh)", 'implementation', S, '2026-09-17', '2026-09-20', {
    description: 'tests/infra/fault.sh llm-down | embeddings-down | restore : couper vraiment un service, sans mock.',
  });

  // ============================================
  // Semaine 2 — 21 → 27 sept : Phase 2 Plan de test
  // ============================================
  task('Rédiger les 97 exigences vérifiables (requirements.md)', 'analyse', M, '2026-09-21', '2026-09-22', {
    priority: 'haute',
    description: 'Une phrase vérifiable par exigence, avec son identifiant (REQ-PAT-14, REQ-IA-RAG-02…).',
  });
  task('Rédiger le plan de test (test-plan.md)', 'planification', M, '2026-09-21', '2026-09-23', {
    priority: 'haute',
    description: '4 niveaux (unitaire, intégration/API, système, acceptation), types, priorités P1/P2/P3, suites smoke / regression / nightly, critères de sortie.',
  });
  task('Écrire les cas de test unitaires et API en YAML', 'conception', S, '2026-09-21', '2026-09-24', {
    priority: 'haute',
    description: '116 cas (28 unitaires, 88 intégration/API) dans tests/kiwi/cases/*.yaml. Techniques : partitions, valeurs limites, table de décision, transitions d’état.',
  });
  task('Écrire les cas de test système et acceptation', 'conception', M, '2026-09-21', '2026-09-24', {
    description: '41 cas (21 système, 20 acceptation) ; 12 cas manuels pour le jugement humain (utilisabilité, ton de l’IA, accessibilité).',
  });
  task('Générer la matrice de traçabilité (generate_docs.py)', 'conception', M, '2026-09-23', '2026-09-25', {
    description: 'Lien exigences ↔ cas dans les deux sens ; 97/97 exigences couvertes par au moins un cas.',
  });
  task('Synchroniser plans et cas dans Kiwi (sync_kiwi.py)', 'suivi', S, '2026-09-23', '2026-09-25', {
    description: '4 plans de niveau + plan maître, 157 cas avec priorité, catégorie, composant et étiquettes (niveau, type, mode, outil, suite).',
  });

  // ============================================
  // Semaine 3 — 28 sept → 4 oct : Phase 3 Unitaire + TDD, Phase 4-5 Intégration / API / IA
  // ============================================
  task('Tests unitaires réservation : créneaux, heure d’été, politique d’annulation', 'implementation', S, '2026-09-26', '2026-09-28', {
    priority: 'haute',
    description: 'Valeurs limites (TC-UNIT-PAT-005) : préavis 11 h 59 refusé / 12 h 00 accepté, annulation 23 h 59 / 24 h 00, 4e report refusé.',
  });
  task('Tests unitaires sécurité : AES-256-GCM, limiteur de débit, toString', 'implementation', S, '2026-09-26', '2026-09-29', {
    priority: 'haute',
    description: 'Chiffrement des champs sensibles, capacité et fenêtre du limiteur, aucun contenu sensible exposé dans toString, garde de production.',
  });
  task('Tests unitaires IA : matching, lexique FR/EN, découpage des textes', 'implementation', S, '2026-09-28', '2026-09-30', {
    description: 'Filtres durs jamais violés, poids et départage déterministe, lexique de sécurité en anglais et en français.',
  });
  task("Développer l'horloge de démonstration en TDD", 'implementation', S, '2026-09-28', '2026-10-01', {
    description: 'Test qui échoue → code → remaniement. Permet au MBT et à Playwright de « voyager dans le temps » jusqu’à l’heure d’un rendez-vous.',
  });
  task('Vérifier les règles d’architecture et la couverture JaCoCo (≥ 80 %)', 'execution', S, '2026-09-29', '2026-10-01', {
    description: './mvnw -Pci verify : 867 tests, 0 échec ; ModularityTests ; couverture 86,1 % des lignes / 70,3 % des branches.',
  });
  task('Revue des tests unitaires (28 cas, 867 tests JUnit)', 'suivi', M, '2026-09-30', '2026-10-01', {
    description: 'Contrôle des identifiants @DisplayName("TC-UNIT-…") et de la conformité aux cas YAML. 28/28 passés.',
  });
  task('Tests API patient : inscription, consentements, réservation, messagerie', 'implementation', S, '2026-09-29', '2026-10-03', {
    priority: 'haute',
    description: 'REST Assured 6.0.1 + validateur OpenAPI sur la stack déployée (./mvnw -Pcampaign test), lecture JDBC pour prouver ce qui est stocké.',
  });
  task('Tests API thérapeute et administration : autorisations, notes privées', 'implementation', S, '2026-09-30', '2026-10-04', {
    priority: 'haute',
    description: 'Compte PENDING jusqu’à approbation, fiche patient selon sa portée, notes privées réservées à l’auteur, dossier de vérification.',
  });

  // ============================================
  // Semaine 4 — 5 → 11 oct : IA réelle, Phase 6 E2E, Phase 7 Non fonctionnel, Phase 8 MBT
  // ============================================
  task('Tests IA réelle : matching, RAG, journal intelligent, détection du risque', 'execution', S, '2026-10-01', '2026-10-05', {
    priority: 'haute',
    description: 'Vrai modèle gpt-oss:120b (Ollama Cloud) et bge-m3, jamais simulés. Révèle ANO-17, ANO-18, ANO-20 ; 16 cas IA débloqués.',
  });
  task('Vérifier l’isolation des données et l’effacement du compte', 'execution', S, '2026-10-02', '2026-10-05', {
    priority: 'haute',
    description: 'Un patient ne retrouve jamais les écrits d’un autre via l’IA (TC-API-IA-005) ; export puis effacement, l’ancien jeton cesse de fonctionner.',
  });
  task('Injection de pannes : embeddings coupés, modèle de langage coupé', 'execution', S, '2026-10-05', '2026-10-06', {
    priority: 'haute',
    description: 'Embeddings coupés : le matching continue sans facteur sémantique (passé). Modèle coupé : refus propre mais incident non créé (ANO-06).',
  });
  task('Mettre en place Playwright 1.63 (Page Objects, horloge alignée)', 'implementation', S, '2026-10-05', '2026-10-06', {
    description: 'Modèle Page Object (tests/e2e/pages), horloge du navigateur alignée sur le serveur, rapports JUnit + HTML + Allure.',
  });
  task('Retester les corrections ANO-01, ANO-02 et ANO-03', 'execution', S, '2026-10-06', '2026-10-07', {
    priority: 'haute',
    description: 'Jeton d’un compte effacé, lexique de risque sans langue fournie, démarrage de l’API avec l’IA réelle : trois corrections confirmées.',
  });
  task('Écrire et exécuter les 15 parcours E2E', 'execution', S, '2026-10-06', '2026-10-08', {
    priority: 'haute',
    description: 'Parcours patient, thérapeute et admin dans Chromium. Révèle ANO-07, ANO-08, ANO-10, ANO-16, ANO-19.',
  });
  task('Model-Based Testing du rendez-vous avec GraphWalker 4.3.3', 'conception', M, '2026-10-05', '2026-10-08', {
    description: 'Modèle Appointment.json (7 états, 14 transitions), deux générateurs : 100 % des transitions et des états, 0 violation.',
  });
  task('Tests de charge JMeter 5.6.3', 'execution', S, '2026-10-07', '2026-10-09', {
    priority: 'haute',
    description: 'Connexion, matching, réservation, tableau de bord, IA. ANO-11 (interblocage à 10 connexions), ANO-12 (dérive p95) ; IA : p95 4,7 s.',
  });
  task('Scans de sécurité OWASP ZAP 2.16.1', 'execution', S, '2026-10-07', '2026-10-09', {
    priority: 'haute',
    description: 'Baseline front, API authentifiée patient puis admin (tests/security/zap.sh), en local uniquement. ANO-13, ANO-14.',
  });
  task('Analyse qualité SonarQube (backend + front) et tri des constats', 'execution', S, '2026-10-08', '2026-10-10', {
    description: 'tests/quality/sonar.sh : Quality Gate passée sur les deux projets.',
  });
  task('Acceptation : évaluer les réponses de l’IA sur une grille de 5 critères', 'execution', M, '2026-10-08', '2026-10-10', {
    description: 'Moyennes de 4,1 à 5,0 sur 5, aucun diagnostic ni conseil médical. 20 cas : 11 passés, 3 échoués, 6 non exécutés (vraies personnes).',
  });

  // ============================================
  // Semaine 5 — 12 → 15 oct : Phase 9 CI, anomalies, Phase 10 Métriques et synthèse
  // ============================================
  task('Écrire le Jenkinsfile de la campagne', 'implementation', M, '2026-10-12', '2026-10-12', {
    priority: 'haute',
    description: 'Build → unitaires → déploiement de la stack → API → Playwright → GraphWalker → (nuit) JMeter et ZAP → Allure → Kiwi. Un échec rend le build UNSTABLE.',
  });
  task('Remonter les résultats vers Kiwi et Allure', 'suivi', S, '2026-10-12', '2026-10-12', {
    description: 'push_results.py : un run par plan et par build, preuve en commentaire, bug lié (157 exécutions en 1 min). enrich_allure.py étiquette chaque résultat.',
  });
  task('Stabiliser la suite smoke dans Jenkins', 'execution', M, '2026-10-12', '2026-10-13', {
    description: 'Builds #1 à #6 : plugin manquant, mvnw non exécutable, origine CORS. Build #6 de bout en bout en 2 min 57 ; ANO-05 reproduite.',
  });
  task('Rédiger les fiches d’anomalies ANO-01 à ANO-20 et les lier dans Kiwi', 'suivi', S, '2026-10-12', '2026-10-13', {
    priority: 'haute',
    description: 'anomalies.md : reproduction, attendu, obtenu, analyse, correction proposée. 16/16 échecs liés automatiquement à une anomalie.',
  });
  task('Trier et classer les anomalies par gravité', 'suivi', M, '2026-10-13', '2026-10-13', {
    priority: 'haute',
    description: '20 anomalies dont 3 bloquantes (ANO-03 corrigée, ANO-06, ANO-11), 17 ouvertes. La moitié sont liées à la concurrence ou aux ressources.',
  });
  task('Expérience de comparaison : workflow éclaté contre workflow intégré', 'cloture', M, '2026-10-13', '2026-10-14', {
    description: '3 défauts injectés sur une branche dédiée, tous détectés. Analyse d’un échec : 5 à 6 étapes sur 5 artefacts sans intégration, 2 avec Kiwi.',
  });
  task('Calculer les métriques de la campagne (metrics.md)', 'cloture', S, '2026-10-13', '2026-10-14', {
    description: '97/97 exigences couvertes, 145 cas automatisés / 12 manuels, couverture 86,1 % / 70,3 %, durées d’exécution par outil.',
  });
  task('Rédiger le bilan final et le verdict (final-summary.md)', 'cloture', M, '2026-10-14', '2026-10-15', {
    priority: 'haute',
    description: 'Build de référence : 135 passés, 16 échoués, 6 non exécutés. Verdict : pas prête pour une bêta (ANO-06, ANO-11, parcours patient interrompu).',
  });
  task('Générer le document de synthèse de la campagne', 'cloture', M, '2026-10-14', '2026-10-15', {
    description: 'tests/docs/document/build.py : notions clés, outils, workflow intégré, résultats, anomalies, recommandations, annexes.',
  });

  // ============================================
  // Suites à donner (§ 11 Recommandations) — après le 15 oct
  // ============================================
  task('Retester ANO-06 et ANO-11/ANO-04 puis rejouer la charge', 'execution', S, '2026-10-16', '2026-10-23', {
    priority: 'haute',
    status: 'in-progress',
    description: 'Après correction (ne jamais garder une connexion pendant un appel externe) : décisions de sécurité de l’IA enregistrées, plus d’interblocage à 10 connexions.',
  });
  task('Retester le parcours patient (ANO-10, ANO-07, ANO-16)', 'execution', S, '2026-10-16', '2026-10-24', {
    priority: 'haute',
    status: 'todo',
    description: 'Consentement au choix du thérapeute, bouton « rejoindre » la séance, jonction idempotente patient / thérapeute.',
  });
  task('Valider la sécurité de l’IA (ANO-20, ANO-17) par exécutions répétées', 'execution', M, '2026-10-16', '2026-10-27', {
    priority: 'haute',
    status: 'todo',
    description: 'Lexique français complété, classifieur stabilisé, seuil du RAG recalibré pour bge-m3. Répéter les cas IA non déterministes.',
  });
  task('Retester en-têtes de sécurité (ANO-13) et noms accessibles (ANO-19)', 'execution', S, '2026-10-16', '2026-10-28', {
    status: 'todo',
    description: 'CSP et anti-clickjacking sur le front web ; nom accessible du bouton d’envoi de l’assistant.',
  });
  task('Faire passer les 6 cas humains et la bêta (protocole-beta.md)', 'planification', M, '2026-10-16', '2026-10-30', {
    status: 'todo',
    description: 'Utilisabilité, accessibilité avec lecteur d’écran, bêta ; faire confirmer la notation de l’IA par un humain.',
  });

  return {
    tasks,
    milestones: [],
    notes: [],
    sprints: [],
    teamMembers: DEFAULT_TEAM_MEMBERS.map((m) => ({ ...m })),
    modules: DEFAULT_MODULES.map((m) => ({ ...m })),
    settings: { ...DEFAULT_SETTINGS },
  };
}
