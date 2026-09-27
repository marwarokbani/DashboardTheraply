/**
 * useSaveData — Hook central des données du dashboard.
 *
 * - Chargement (avec migration automatique vers le format courant)
 * - Sauvegarde automatique à chaque modification (+ bouton et Ctrl/Cmd+S)
 * - Synchronisation en ligne (Supabase) si configurée, avec copie locale
 * - Détection des modifications non enregistrées + alerte avant fermeture
 * - Historique d'annulation (Ctrl/Cmd+Z, 50 états)
 * - Règles automatiques sur les tâches (completedAt, sprintAssignedAt)
 * - Export / import JSON, réinitialisation, données de démo
 * - Toast de notification (avec action optionnelle, ex. « Annuler »)
 *
 * La persistance passe par deux adaptateurs :
 *   - `local` (services/storage.js, synchrone) : cache immédiat dans le navigateur ;
 *   - `remote` (services/supabase.js, asynchrone, optionnel) : source de vérité en ligne.
 * Au démarrage, la version la plus récente (locale ou en ligne) l'emporte.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { DATA_VERSION, getEmptyState } from '../data/initialData';
import { getDemoState } from '../data/demoData';
import { migratePayload } from '../data/migrations';
import { applyTaskRules } from '../utils/tasks';
import { todayISO } from '../utils/dates';
import { localStorageAdapter, downloadFile, readFileAsText } from '../services/storage';
import { supabaseAdapter } from '../services/supabase';

const MAX_HISTORY = 50;
const TOAST_DURATION = 5000;
const AUTOSAVE_DELAY = 1000; // enregistrement 1 s après la dernière modification

/** Date de sauvegarde d'un payload en millisecondes (0 si absente). */
function savedTime(payload) {
  return payload?.lastSaved ? new Date(payload.lastSaved).getTime() : 0;
}

/**
 * Charge et migre les données au démarrage (synchrone avec localStorage).
 * @returns {{ data, lastSaved, migratedFrom: number|null, error: boolean }}
 */
function loadInitialState(storage) {
  try {
    const payload = storage.load();
    if (!payload?.data) return { data: getEmptyState(), lastSaved: null, migratedFrom: null, error: false };
    const { data, fromVersion, migrated } = migratePayload(payload);
    return {
      data,
      lastSaved: payload.lastSaved ? new Date(payload.lastSaved) : null,
      migratedFrom: migrated ? fromVersion : null,
      error: false,
    };
  } catch (error) {
    console.error('Erreur lors du chargement des données :', error);
    return { data: getEmptyState(), lastSaved: null, migratedFrom: null, error: true };
  }
}

/** true si le focus est dans un champ de saisie (Ctrl+Z doit y rester natif). */
function isTypingInField() {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable;
}

export function useSaveData({ local = localStorageAdapter, remote = supabaseAdapter } = {}) {
  // Chargement initial (copie locale) calculé une seule fois
  const [initial] = useState(() => loadInitialState(local));
  // true tant que la version en ligne n'a pas été récupérée
  const [loading, setLoading] = useState(Boolean(remote));

  const [data, setData] = useState(initial.data);
  const [lastSaved, setLastSaved] = useState(initial.lastSaved);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(initial.migratedFrom !== null);
  const [historySize, setHistorySize] = useState(0);
  const [toast, setToast] = useState(() => {
    if (initial.error) return { id: 1, type: 'error', message: 'Données illisibles : un espace vide a été chargé.' };
    if (initial.migratedFrom !== null) {
      return { id: 1, type: 'success', message: `Données converties depuis le format v${initial.migratedFrom}. Pensez à sauvegarder.` };
    }
    return null;
  });

  // Références pour lire l'état courant sans recréer les callbacks
  const dataRef = useRef(data);
  const historyRef = useRef([]);
  const toastTimerRef = useRef(null);
  const unsavedRef = useRef(hasUnsavedChanges);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    unsavedRef.current = hasUnsavedChanges;
  }, [hasUnsavedChanges]);

  // ============================================
  // Toast
  // ============================================

  /**
   * Affiche une notification.
   * @param {string|null} message — null pour fermer
   * @param {'success'|'error'|'info'} type
   * @param {{ label: string, onClick: Function }|null} action
   */
  const showToast = useCallback((message, type = 'success', action = null) => {
    clearTimeout(toastTimerRef.current);
    if (!message) {
      setToast(null);
      return;
    }
    setToast({ id: Date.now(), message, type, action });
    toastTimerRef.current = setTimeout(() => setToast(null), TOAST_DURATION);
  }, []);

  // Fermeture automatique du toast affiché au chargement
  useEffect(() => {
    if (!initial.error && initial.migratedFrom === null) return undefined;
    toastTimerRef.current = setTimeout(() => setToast(null), TOAST_DURATION);
    return () => clearTimeout(toastTimerRef.current);
  }, [initial]);

  // ============================================
  // Historique
  // ============================================

  const resetHistory = useCallback(() => {
    historyRef.current = [];
    setHistorySize(0);
  }, []);

  /** Remplace toutes les données (import, démo, reset) sans historique. */
  const replaceData = useCallback((next, unsaved = true) => {
    dataRef.current = next;
    setData(next);
    setHasUnsavedChanges(unsaved);
    resetHistory();
  }, [resetHistory]);

  // ============================================
  // Mise à jour
  // ============================================

  /**
   * Modifie les données.
   * @param {Function|object} updater — (prev) => next, ou nouvel objet
   * @param {{ history?: boolean }} options — history: false pour ne pas empiler dans Ctrl+Z
   */
  const updateData = useCallback((updater, { history = true } = {}) => {
    const prev = dataRef.current;
    const candidate = typeof updater === 'function' ? updater(prev) : updater;
    if (!candidate || candidate === prev) return;

    const tasks = applyTaskRules(prev.tasks, candidate.tasks, new Date());
    const next = tasks === candidate.tasks ? candidate : { ...candidate, tasks };

    if (history) {
      historyRef.current = [prev, ...historyRef.current].slice(0, MAX_HISTORY);
      setHistorySize(historyRef.current.length);
    }
    dataRef.current = next;
    setData(next);
    setHasUnsavedChanges(true);
  }, []);

  /** Annule la dernière modification. */
  const undo = useCallback(() => {
    const [previous, ...rest] = historyRef.current;
    if (!previous) {
      showToast('Aucune action à annuler', 'info');
      return;
    }
    historyRef.current = rest;
    setHistorySize(rest.length);
    dataRef.current = previous;
    setData(previous);
    setHasUnsavedChanges(true);
    showToast('Action annulée', 'info');
  }, [showToast]);

  // ============================================
  // Sauvegarde
  // ============================================

  // Les envois en ligne sont enchaînés pour qu'une ancienne version n'écrase pas une plus récente
  const remoteQueueRef = useRef(Promise.resolve());
  const remoteErrorShownRef = useRef(false);

  const save = useCallback(({ silent = false } = {}) => {
    const snapshot = dataRef.current;
    const now = new Date();
    const payload = { data: snapshot, version: DATA_VERSION, lastSaved: now.toISOString() };

    try {
      local.save(payload);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde locale :', error);
      if (!remote) {
        showToast("Échec de l'enregistrement : espace de stockage insuffisant ?", 'error');
        return Promise.resolve(false);
      }
    }

    if (!remote) {
      setLastSaved(now);
      setHasUnsavedChanges(false);
      if (!silent) showToast('Données enregistrées');
      return Promise.resolve(true);
    }

    const run = remoteQueueRef.current.then(async () => {
      try {
        await remote.save(payload);
        remoteErrorShownRef.current = false;
        setLastSaved(now);
        // D'autres modifications ont pu arriver pendant l'envoi : elles restent à enregistrer
        if (dataRef.current === snapshot) setHasUnsavedChanges(false);
        if (!silent) showToast('Données enregistrées en ligne');
        return true;
      } catch (error) {
        console.error('Erreur lors de la sauvegarde en ligne :', error);
        // En sauvegarde automatique, on ne prévient qu'une fois jusqu'au prochain succès
        if (!silent || !remoteErrorShownRef.current) {
          remoteErrorShownRef.current = true;
          showToast('Hors ligne : modifications gardées sur cet appareil, elles seront envoyées au prochain enregistrement.', 'error');
        }
        return false;
      }
    });
    remoteQueueRef.current = run;
    return run;
  }, [local, remote, showToast]);

  /**
   * Récupère la version en ligne si elle est plus récente que la version affichée.
   * Si rien n'existe en ligne, y envoie les données locales (premier lancement).
   * @param {{ initial?: boolean }} options — initial : aucune modification n'a encore pu être faite
   */
  const pullRemote = useCallback(async ({ initial = false } = {}) => {
    if (!remote) return;
    try {
      const payload = await remote.load();
      if (!payload?.data) {
        if (dataRef.current.tasks.length > 0 || unsavedRef.current) await save({ silent: true });
        return;
      }
      let localPayload = null;
      try {
        localPayload = local.load();
      } catch {
        // copie locale illisible : la version en ligne l'emporte
      }
      if (savedTime(payload) > savedTime(localPayload) && (initial || !unsavedRef.current)) {
        const { data: remoteData } = migratePayload(payload);
        dataRef.current = remoteData;
        setData(remoteData);
        setHasUnsavedChanges(false);
        resetHistory();
        setLastSaved(new Date(payload.lastSaved));
        try {
          local.save(payload);
        } catch {
          // cache local facultatif
        }
      } else if (savedTime(localPayload) > savedTime(payload)) {
        // Modifications faites hors ligne sur cet appareil : on les envoie
        await save({ silent: true });
      }
    } catch (error) {
      console.error('Erreur lors du chargement en ligne :', error);
      showToast('Impossible de joindre le serveur : affichage de la copie locale.', 'error');
    }
  }, [local, remote, save, showToast, resetHistory]);

  // Chargement initial depuis le serveur
  useEffect(() => {
    if (!remote) return undefined;
    let cancelled = false;
    (async () => {
      await pullRemote({ initial: true });
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [remote, pullRemote]);

  // Retour sur l'onglet : récupère les modifications faites ailleurs (autre appareil, équipe)
  useEffect(() => {
    if (!remote) return undefined;
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') pullRemote();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [remote, pullRemote]);

  // Sauvegarde automatique : 1 s après la dernière modification
  useEffect(() => {
    if (loading || !hasUnsavedChanges) return undefined;
    const timer = setTimeout(() => save({ silent: true }), AUTOSAVE_DELAY);
    return () => clearTimeout(timer);
  }, [data, loading, hasUnsavedChanges, save]);

  // Raccourcis clavier : Ctrl/Cmd+S et Ctrl/Cmd+Z
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const key = e.key.toLowerCase();
      if (key === 's') {
        e.preventDefault();
        save();
      } else if (key === 'z' && !e.shiftKey && !isTypingInField()) {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [save, undo]);

  // Avant fermeture : copie locale immédiate, et alerte si l'envoi n'est pas terminé
  useEffect(() => {
    if (!hasUnsavedChanges) return undefined;
    const handleBeforeUnload = (e) => {
      try {
        local.save({ data: dataRef.current, version: DATA_VERSION, lastSaved: new Date().toISOString() });
      } catch {
        // rien de plus à faire à la fermeture
      }
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges, local]);

  // ============================================
  // Export / import / reset / démo
  // ============================================

  const exportData = useCallback(() => {
    try {
      const now = new Date();
      const payload = { data: dataRef.current, version: DATA_VERSION, exportedAt: now.toISOString() };
      downloadFile(JSON.stringify(payload, null, 2), `theraply-dashboard-${todayISO(now)}.json`);
      showToast('Export téléchargé');
    } catch (error) {
      console.error("Erreur lors de l'export :", error);
      showToast("Échec de l'export", 'error');
    }
  }, [showToast]);

  /** Importe un fichier JSON exporté (toutes versions). Retourne true si succès. */
  const importData = useCallback(async (file) => {
    try {
      const payload = JSON.parse(await readFileAsText(file));
      if (!payload?.data || !Array.isArray(payload.data.tasks)) {
        showToast('Format de fichier non reconnu', 'error');
        return false;
      }
      const { data: imported } = migratePayload(payload);
      replaceData(imported);
      showToast('Données importées');
      return true;
    } catch (error) {
      console.error("Erreur lors de l'import :", error);
      showToast('Le fichier ne contient pas de JSON valide', 'error');
      return false;
    }
  }, [replaceData, showToast]);

  const resetData = useCallback(async () => {
    try {
      local.clear();
      if (remote) await remote.clear();
      replaceData(getEmptyState(), false);
      setLastSaved(null);
      showToast('Espace réinitialisé');
    } catch (error) {
      console.error('Erreur lors de la réinitialisation :', error);
      showToast('Échec de la réinitialisation', 'error');
    }
  }, [local, remote, replaceData, showToast]);

  const loadDemoData = useCallback(() => {
    replaceData(getDemoState());
    showToast('Données de démo chargées', 'info');
  }, [replaceData, showToast]);

  // Nettoyage du minuteur de toast au démontage
  useEffect(() => () => clearTimeout(toastTimerRef.current), []);

  return {
    data,
    loading,
    updateData,
    save,
    undo,
    canUndo: historySize > 0,
    hasUnsavedChanges,
    lastSaved,
    toast,
    showToast,
    exportData,
    importData,
    resetData,
    loadDemoData,
  };
}
