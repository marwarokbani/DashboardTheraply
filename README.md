# Theraply — Suivi des tests (ISTQB)

Tableau de bord simple pour suivre la partie test du projet Theraply : on ajoute des tâches (checkpoints), on les coche, et l'avancement se calcule tout seul. Aucune valeur codée en dur, aucune donnée fictive (les données de démo sont optionnelles).

- **Tâches** : saisie rapide, Kanban ou liste, case à cocher pour valider un checkpoint, panneau d'édition au clic.
- **Calendrier** : les tâches de la semaine selon leur échéance.
- **Statistiques** : avancement global, validées cette semaine, en retard, restantes, progression dans le temps, statuts, avancement par catégorie et par membre, rapport hebdomadaire (PDF / Markdown).
- **Paramètres** : équipe, catégories (par défaut les phases du processus de test ISTQB), export / import JSON.

React 19 · Vite 8 · Tailwind CSS 4 · Recharts · @dnd-kit · lucide-react · Supabase.

Chaque modification est enregistrée automatiquement (1 s après la saisie). Si Supabase est configuré, les données sont stockées en ligne (accessibles depuis tous les appareils après connexion), avec une copie locale dans le navigateur ; sinon, elles restent uniquement dans le navigateur (localStorage).

## Mise en ligne (Supabase + Vercel)

1. **Supabase** (https://supabase.com, gratuit) : créer un projet, puis
   - *SQL Editor* : exécuter `supabase/schema.sql` ;
   - *Authentication > Sign In / Providers* : désactiver « Allow new users to sign up » ;
   - *Authentication > Users > Add user* : créer un compte (e-mail + mot de passe, « Auto Confirm User ») pour chaque membre ;
   - *Project Settings > API* : noter la *Project URL* et la clé *anon public*.
2. **En local** : copier `.env.example` en `.env.local` et y mettre ces deux valeurs.
3. **Vercel** (https://vercel.com, connexion avec GitHub) : *Add New > Project*, importer ce dépôt, ajouter les variables d'environnement `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`, puis *Deploy*. Chaque `git push` sur `main` redéploie le site.

Au premier lancement connecté, les données déjà présentes dans le navigateur sont envoyées en ligne automatiquement. Si deux personnes modifient en même temps, la dernière version enregistrée l'emporte.

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
  services/    storage.js (localStorage) et supabase.js (base en ligne)
  components/  composants d'affichage (dashboard, charts, tasks, settings, ui)
  theme/       couleurs sémantiques (statuts, priorités)
tests/         tests unitaires
```

## Format des données

Le format de sauvegarde est versionné (`version: 4`). Les anciennes sauvegardes (v1 avec `deadline: "Lundi"`, v2, v3) sont converties automatiquement au chargement ou à l'import, sans perte : voir `src/data/migrations.js`.

En ligne, tout le contenu est stocké dans une seule ligne (`id = 'main'`) de la table `dashboard_data`, accessible uniquement aux utilisateurs connectés (voir `supabase/schema.sql`).
