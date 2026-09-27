/**
 * CommandPalette — Palette de commandes (Ctrl+K).
 *
 * - Chercher une tâche (ouvre son panneau d'édition)
 * - Créer une tâche avec la saisie rapide (@membre #module !priorité JJ/MM ~estimation)
 * - Naviguer entre les sections, lancer une action (thème, sauvegarde, export…)
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight, BarChart3, Calendar, CheckSquare, Plus, Search, Settings,
} from 'lucide-react';
import { STATUSES } from '../data/initialData';
import { findById } from '../utils/team';
import { filterTasks } from '../utils/taskFilters';
import { statusColor } from '../theme/colors';

const NAV_ITEMS = [
  { id: 'tasks', label: 'Tâches', icon: CheckSquare },
  { id: 'calendar', label: 'Calendrier', icon: Calendar },
  { id: 'stats', label: 'Statistiques', icon: BarChart3 },
  { id: 'settings', label: 'Paramètres', icon: Settings },
];

/** Minuscule sans accents. */
function fold(text) {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/**
 * Construit la liste des résultats (groupes + éléments) pour une requête.
 * @returns {Array<{ group: string, items: Array }>}
 */
function buildResults(query, { tasks, teamMembers, commands }) {
  const q = fold(query.trim());
  const groups = [];

  if (q) {
    const matching = filterTasks(tasks, { search: query.trim(), assignee: 'all', module: 'all', priority: 'all' }).slice(0, 6);
    if (matching.length) {
      groups.push({
        group: 'Tâches',
        items: matching.map((task) => ({
          id: `task:${task.id}`,
          type: 'task',
          label: task.title,
          meta: [findById(teamMembers, task.assignee)?.name, STATUSES.find((s) => s.id === task.status)?.label].filter(Boolean).join(' · '),
          color: statusColor(task.status),
          taskId: task.id,
        })),
      });
    }
    groups.push({
      group: 'Créer',
      items: [{ id: 'create', type: 'create', label: `Créer « ${query.trim()} »`, meta: 'Entrée', icon: Plus }],
    });
  }

  const nav = NAV_ITEMS.filter((n) => !q || fold(n.label).includes(q));
  if (nav.length) groups.push({ group: 'Aller à', items: nav.map((n) => ({ ...n, id: `nav:${n.id}`, type: 'nav', target: n.id })) });

  const cmds = commands.filter((c) => !q || fold(c.label).includes(q));
  if (cmds.length) groups.push({ group: 'Actions', items: cmds.map((c) => ({ ...c, type: 'command' })) });

  return groups;
}

export default function CommandPalette({ data, onClose, onNavigate, onOpenTask, onAddTask, commands }) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Chaque élément reçoit sa position globale (navigation au clavier)
  const groups = useMemo(() => {
    let position = 0;
    return buildResults(query, { tasks: data.tasks, teamMembers: data.teamMembers, commands }).map((group) => ({
      ...group,
      items: group.items.map((item) => ({ ...item, index: position++ })),
    }));
  }, [query, data.tasks, data.teamMembers, commands]);
  const items = groups.flatMap((g) => g.items);
  const current = Math.min(selectedIndex, Math.max(0, items.length - 1));

  const run = (item) => {
    if (!item) return;
    if (item.type === 'task') onOpenTask(item.taskId);
    else if (item.type === 'nav') onNavigate(item.target);
    else if (item.type === 'create') {
      if (!onAddTask(query)) return;
    } else item.run();
    onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const next = e.key === 'ArrowDown' ? Math.min(current + 1, items.length - 1) : Math.max(current - 1, 0);
      setSelectedIndex(next);
      listRef.current?.querySelector(`[data-index="${next}"]`)?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      run(items[current]);
    }
  };

  return (
    <>
      <div className="palette-backdrop" onClick={onClose} aria-hidden />
      <div className="palette" role="dialog" aria-modal="true" aria-label="Palette de commandes">
        <div className="palette-search">
          <Search className="w-4 h-4 text-tertiary shrink-0" aria-hidden />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Chercher, créer une tâche ou lancer une action…"
            aria-label="Rechercher"
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-results"
            aria-activedescendant={items[current] ? `palette-${items[current].id}` : undefined}
          />
          <kbd>Échap</kbd>
        </div>

        <div ref={listRef} id="palette-results" role="listbox" className="palette-results">
          {groups.map((group) => (
            <div key={group.group} role="group" aria-label={group.group}>
              <p className="palette-group">{group.group}</p>
              {group.items.map((item) => {
                const i = item.index;
                const Icon = item.icon;
                return (
                  <div
                    key={item.id}
                    id={`palette-${item.id}`}
                    role="option"
                    aria-selected={i === current}
                    data-index={i}
                    className="palette-item"
                    onMouseMove={() => i !== current && setSelectedIndex(i)}
                    onClick={() => run(item)}
                  >
                    {Icon ? <Icon className="w-4 h-4 shrink-0 text-tertiary" aria-hidden /> : <span className="w-2 h-2 rounded-full shrink-0 mx-1" style={{ background: item.color }} aria-hidden />}
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.meta && <span className="text-xs text-tertiary shrink-0">{item.meta}</span>}
                    {i === current && <ArrowRight className="w-3.5 h-3.5 text-tertiary shrink-0" aria-hidden />}
                  </div>
                );
              })}
            </div>
          ))}
          {items.length === 0 && <p className="text-center py-8 text-sm text-tertiary">Aucun résultat.</p>}
        </div>

        <footer className="palette-footer">
          <span><kbd>↑</kbd> <kbd>↓</kbd> naviguer</span>
          <span><kbd>Entrée</kbd> valider</span>
          <span className="hidden sm:inline">Syntaxe : @membre #catégorie !haute 30/09</span>
        </footer>
      </div>
    </>
  );
}
