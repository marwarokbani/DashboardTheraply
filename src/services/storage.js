/**
 * storage.js — Couche de persistance.
 *
 * useSaveData ne parle qu'à cet adaptateur (load / save / clear).
 * Pour brancher un backend plus tard, il suffit de fournir un autre
 * adaptateur avec la même interface (éventuellement asynchrone côté API,
 * en adaptant useSaveData).
 */

const STORAGE_KEY = 'theraply-dashboard-data';

export const localStorageAdapter = {
  /** Retourne l'objet sauvegardé ({ data, version, lastSaved }) ou null. */
  load() {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  },

  /** Enregistre l'objet complet. Lève une erreur si le quota est dépassé. */
  save(payload) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  },

  /** Efface la sauvegarde. */
  clear() {
    localStorage.removeItem(STORAGE_KEY);
  },
};

/** Télécharge un contenu texte sous forme de fichier (export JSON, rapport Markdown…). */
export function downloadFile(content, filename, mimeType = 'application/json') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** Lit un fichier choisi par l'utilisateur et retourne son contenu texte. */
export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}
