/**
 * useSaveData — Hook central des données du dashboard.
 *
 * - Chargement (avec migration automatique vers le format courant)
 * - Sauvegarde manuelle (bouton + Ctrl/Cmd+S) et automatique
 * - Détection des modifications non enregistrées + alerte avant fermeture
 * - Historique d'annulation (Ctrl/Cmd+Z, 50 états)
 * - Règles automatiques sur les tâches (completedAt, sprintAssignedAt)
 * - Export / import JSON, réinitialisation, données de démo
 * - Toast de notification (avec action optionnelle, ex. « Annuler »)
 *
 * La persistance passe par un adaptateur (services/storage.js), remplaçable
 * par une API sans toucher aux composants.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { DATA_VERSION, getEmptyState } from '../data/initialData';
import { getDemoState } from '../data/demoData';
import { migratePayload } from '../data/migrations';
import { applyTaskRules } from '../utils/tasks';
import { todayISO } from '../utils/dates';
import { localStorageAdapter, downloadFile, readFileAsText } from '../services/storage';

const MAX_HISTORY = 50;
const TOAST_DURATION = 5000;

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

export function useSaveData(storage = localStorageAdapter) {
  // Chargement initial calculé une seule fois
  const [initial] = useState(() => loadInitialState(storage));

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

  const save = useCallback(({ silent = false } = {}) => {
    try {
      const now = new Date();
      storage.save({ data: dataRef.current, version: DATA_VERSION, lastSaved: now.toISOString() });
      setLastSaved(now);
      setHasUnsavedChanges(false);
      if (!silent) showToast('Données enregistrées');
      return true;
    } catch (error) {
      console.error('Erreur lors de la sauvegarde :', error);
      showToast("Échec de l'enregistrement : espace de stockage insuffisant ?", 'error');
      return false;
    }
  }, [storage, showToast]);

  // Sauvegarde automatique
  const autoSave = data.settings?.autoSave;
  const autoSaveInterval = data.settings?.autoSaveInterval || 120000;
  useEffect(() => {
    if (!autoSave) return undefined;
    const timer = setInterval(() => {
      if (unsavedRef.current) save({ silent: true });
    }, autoSaveInterval);
    return () => clearInterval(timer);
  }, [autoSave, autoSaveInterval, save]);

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

  // Alerte avant fermeture si des modifications ne sont pas enregistrées
  useEffect(() => {
    if (!hasUnsavedChanges) return undefined;
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

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
      showToast('Données importées. Pensez à sauvegarder.');
      return true;
    } catch (error) {
      console.error("Erreur lors de l'import :", error);
      showToast('Le fichier ne contient pas de JSON valide', 'error');
      return false;
    }
  }, [replaceData, showToast]);

  const resetData = useCallback(() => {
    try {
      storage.clear();
      replaceData(getEmptyState(), false);
      setLastSaved(null);
      showToast('Espace réinitialisé');
    } catch (error) {
      console.error('Erreur lors de la réinitialisation :', error);
      showToast('Échec de la réinitialisation', 'error');
    }
  }, [storage, replaceData, showToast]);

  const loadDemoData = useCallback(() => {
    replaceData(getDemoState());
    showToast('Données de démo chargées. Rien n’est enregistré tant que vous ne sauvegardez pas.', 'info');
  }, [replaceData, showToast]);

  // Nettoyage du minuteur de toast au démontage
  useEffect(() => () => clearTimeout(toastTimerRef.current), []);

  return {
    data,
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
