/**
 * Header — Barre supérieure : titre de la page, contexte (date, semaine, sprint),
 * recherche Ctrl+K, annuler, sauvegarde et thème.
 */
import { Menu, Moon, Save, Search, Sun, Undo2 } from 'lucide-react';
import { formatSavedAt, getISOWeekNumber } from '../utils/dates';

/** Date du jour en toutes lettres (« samedi 26 septembre »). */
function formatToday(now = new Date()) {
  return now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

export default function Header({
  title,
  activeSprint,
  hasUnsavedChanges,
  lastSaved,
  onSave,
  onUndo,
  canUndo,
  darkMode,
  onToggleDarkMode,
  onToggleSidebar,
  onOpenCommandPalette,
  children,
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <button type="button" onClick={onToggleSidebar} className="btn-icon lg:hidden" aria-label="Ouvrir le menu">
          <Menu className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-primary truncate">{title}</h1>
          <p className="text-xs text-tertiary mt-0.5">
            <span className="first-letter:uppercase inline-block">{formatToday()}</span>
            <span aria-hidden> · </span>S{getISOWeekNumber()}
            {activeSprint && (
              <>
                <span aria-hidden> · </span>
                <span className="text-secondary">{activeSprint.name}</span>
              </>
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        {children}

        <button type="button" onClick={onOpenCommandPalette} className="search-trigger" aria-label="Rechercher ou créer (Ctrl+K)">
          <Search className="w-3.5 h-3.5" aria-hidden />
          <span className="hidden md:inline">Rechercher…</span>
          <kbd className="hidden md:inline">Ctrl K</kbd>
        </button>

        <button type="button" onClick={onUndo} disabled={!canUndo} className="btn-icon disabled:opacity-40 disabled:pointer-events-none" aria-label="Annuler (Ctrl+Z)" title="Annuler (Ctrl+Z)">
          <Undo2 className="w-4 h-4" />
        </button>

        <button type="button" onClick={onToggleDarkMode} className="btn-icon" aria-label={darkMode ? 'Passer en mode clair' : 'Passer en mode sombre'}>
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <button
          type="button"
          onClick={() => onSave()}
          className="btn btn-secondary relative"
          title={lastSaved ? `Dernière sauvegarde ${formatSavedAt(lastSaved)} (Ctrl+S)` : 'Sauvegarder (Ctrl+S)'}
        >
          <Save className="w-4 h-4" aria-hidden />
          <span className="hidden sm:inline">{hasUnsavedChanges ? 'Sauvegarder' : 'Enregistré'}</span>
          {hasUnsavedChanges && <span className="unsaved-dot" aria-label="Modifications non enregistrées" />}
        </button>
      </div>
    </header>
  );
}
