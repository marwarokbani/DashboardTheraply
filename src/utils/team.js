/**
 * team.js — Membres de l'équipe et modules du projet (fonctions pures).
 *
 * Membre : { id, name, role, color }
 * Module : { id, name, color }
 *
 * La suppression ne casse jamais les données : les tâches (et jalons)
 * qui référençaient l'élément supprimé passent à « non assignée » /
 * « sans module ».
 */

import { generateId } from './ids.js';

/** Palette proposée pour les membres et modules (contraste AA sur fond clair et sombre). */
export const PRESET_COLORS = [
  '#7c3aed', '#0284c7', '#c026d3', '#d97706', '#059669',
  '#e11d48', '#0891b2', '#db2777', '#65a30d', '#ea580c',
];

/** Retrouve un élément par id dans une liste (ou null). */
export function findById(list = [], id) {
  return id ? list.find((item) => item.id === id) || null : null;
}

/** Initiales d'un nom (« Marwa Rokbani » → « MR », « Sahar » → « S »). */
export function getInitials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return parts.slice(0, 2).map((p) => p[0].toUpperCase()).join('');
}

/** Couleur suivante de la palette, en évitant celles déjà utilisées si possible. */
export function nextPresetColor(list = []) {
  const used = new Set(list.map((item) => item.color));
  return PRESET_COLORS.find((c) => !used.has(c)) || PRESET_COLORS[list.length % PRESET_COLORS.length];
}

// ============================================
// Membres
// ============================================

export function addMember(members, { name, role = '', color }) {
  const member = {
    id: generateId('member'),
    name: name.trim(),
    role: role.trim(),
    color: color || nextPresetColor(members),
  };
  return [...members, member];
}

export function updateMember(members, memberId, patch) {
  return members.map((m) => (m.id === memberId ? { ...m, ...patch } : m));
}

/**
 * Supprime un membre et désassigne ses tâches.
 * Si c'était l'utilisateur courant (« moi »), on bascule sur le premier membre restant.
 * @returns {{ teamMembers: Array, tasks: Array, settings: object }}
 */
export function removeMember({ teamMembers, tasks, settings }, memberId) {
  const remaining = teamMembers.filter((m) => m.id !== memberId);
  return {
    teamMembers: remaining,
    tasks: tasks.map((t) => (t.assignee === memberId ? { ...t, assignee: null } : t)),
    settings:
      settings.currentUserId === memberId
        ? { ...settings, currentUserId: remaining[0]?.id || null }
        : settings,
  };
}

// ============================================
// Modules
// ============================================

export function addModule(modules, { name, color }) {
  const mod = { id: generateId('module'), name: name.trim(), color: color || nextPresetColor(modules) };
  return [...modules, mod];
}

export function updateModule(modules, moduleId, patch) {
  return modules.map((m) => (m.id === moduleId ? { ...m, ...patch } : m));
}

/**
 * Supprime un module ; tâches et jalons liés passent « sans module ».
 * @returns {{ modules: Array, tasks: Array, milestones: Array }}
 */
export function removeModule({ modules, tasks, milestones }, moduleId) {
  return {
    modules: modules.filter((m) => m.id !== moduleId),
    tasks: tasks.map((t) => (t.module === moduleId ? { ...t, module: null } : t)),
    milestones: milestones.map((ms) => (ms.module === moduleId ? { ...ms, module: null } : ms)),
  };
}

/** Nombre de tâches qui référencent un membre ou un module (pour les confirmations). */
export function countReferences(tasks = [], field, id) {
  return tasks.filter((t) => t[field] === id).length;
}
