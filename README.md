# Theraply — Suivi des tests (ISTQB)

Tableau de bord simple pour suivre la partie test du projet Theraply : on ajoute des tâches (checkpoints), on les coche, et l'avancement se calcule tout seul. Aucune valeur codée en dur, aucune donnée fictive (les données de démo sont optionnelles).

- **Tâches** : saisie rapide, Kanban ou liste, case à cocher pour valider un checkpoint, panneau d'édition au clic.
- **Calendrier** : les tâches de la semaine selon leur échéance.
- **Statistiques** : avancement global, validées cette semaine, en retard, restantes, progression dans le temps, statuts, avancement par catégorie et par membre, rapport hebdomadaire (PDF / Markdown).
- **Paramètres** : équipe, catégories (par défaut les phases du processus de test ISTQB), export / import JSON.

React 19 · Vite 8 · Tailwind CSS 4 · Recharts · @dnd-kit · lucide-react. Pas de backend : les données sont enregistrées dans le navigateur (localStorage).

## Commandes

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production (`dist/`) |
| `npm run lint` | Analyse du code (oxlint) |
| `npm test` | Tests unitaires des fonctions métier (`node --test`, dossier `tests/`) |
| `npm run smoke` | Rend chaque page côté Node (vide, démo, ancienne sauvegarde v1) pour détecter les erreurs d'exécution |

L'ancienne version complète (sprints, jalons, burndown…) est archivée dans `archive/dashboard-version-complete.zip`.

## Raccourcis

- `Ctrl+K` : palette de commandes (chercher, créer une tâche, naviguer, exporter)
- `Ctrl+S` : sauvegarder · `Ctrl+Z` : annuler la dernière action
- Saisie rapide : `Concevoir les cas de test du paiement @sahar #conception !haute 30/09`
  (`@membre`, `#catégorie`, `!haute|moyenne|basse`, `JJ/MM` ou `demain`)

## Organisation du code

```
src/
  data/        constantes, état vide, données de démo, migrations du format de sauvegarde
  utils/       logique métier pure et testée (dates, tâches, sprints, stats, filtres, rapport…)
  hooks/       useSaveData (persistance), useDashboardStats, useTaskActions, useWeeklyReport
  services/    storage.js : adaptateur localStorage (à remplacer par une API plus tard)
  components/  composants d'affichage (dashboard, charts, tasks, settings, ui)
  theme/       couleurs sémantiques (statuts, priorités)
tests/         tests unitaires
```

## Format des données

Le format de sauvegarde est versionné (`version: 4`). Les anciennes sauvegardes (v1 avec `deadline: "Lundi"`, v2, v3) sont converties automatiquement au chargement ou à l'import, sans perte : voir `src/data/migrations.js`.

Pour brancher un backend, fournir à `useSaveData` un adaptateur avec la même interface que `localStorageAdapter` (`load`, `save`, `clear`).
