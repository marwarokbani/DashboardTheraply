/**
 * smoke-render.mjs — Test de fumée : rend chaque page de l'application côté Node
 * (sans navigateur) pour détecter les erreurs d'exécution.
 *
 * Usage : node scripts/smoke-render.mjs
 * Scénarios : espace vide, données de démo, ancienne sauvegarde v1.
 */
import { createServer } from 'vite';
import React from 'react';
import { renderToString } from 'react-dom/server';

// ── Environnement navigateur minimal ──
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};
globalThis.window = {
  innerWidth: 1280,
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
  addEventListener() {},
  removeEventListener() {},
};
globalThis.document = { documentElement: { classList: { toggle() {} } } };

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
const { getDemoState } = await server.ssrLoadModule('/src/data/demoData.js');

// Chaque page est rendue en passant la section de départ à App (initialSection)
const pages = ['tasks', 'calendar', 'stats', 'settings'];
const scenarios = {
  vide: null,
  demo: { version: 4, lastSaved: new Date().toISOString(), data: getDemoState() },
  v1: {
    lastSaved: new Date().toISOString(),
    data: { tasks: [{ id: 't1', title: 'Ancienne tâche', assignee: 'marwa', module: 'patient', priority: 'haute', deadline: 'Lundi', status: 'done' }] },
  },
};

let failures = 0;
for (const [name, payload] of Object.entries(scenarios)) {
  for (const page of pages) {
    store.clear();
    if (payload) store.set('theraply-dashboard-data', JSON.stringify(payload));
    // Recharge le module App pour repartir d'un état propre
    server.moduleGraph.invalidateAll();
    const { default: App } = await server.ssrLoadModule('/src/App.jsx');
    try {
      const html = renderToString(React.createElement(App, { initialSection: page }));
      console.log(`ok   ${name.padEnd(5)} ${page.padEnd(10)} ${html.length} caractères`);
    } catch (error) {
      failures++;
      console.error(`FAIL ${name.padEnd(5)} ${page.padEnd(10)} ${error.message}`);
      console.error(error.stack.split('\n').slice(0, 4).join('\n'));
    }
  }
}

await server.close();
process.exit(failures ? 1 : 0);
