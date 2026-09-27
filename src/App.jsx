/**
 * App — Composant racine du dashboard de suivi des tests Theraply.
 *
 * Trois pages : Tâches (checkpoints), Calendrier, Statistiques
 * (+ Paramètres : équipe, catégories, données).
 * Orchestre le thème, la navigation, les données (useSaveData), les
 * statistiques (useDashboardStats), les actions sur les tâches, le panneau
 * d'édition, les notifications et la palette de commandes (Ctrl+K).
 */
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { Download, FileText, Moon, Save } from 'lucide-react';
import { useDashboardStats } from './hooks/useDashboardStats';
import { useSaveData } from './hooks/useSaveData';
import { useTaskActions } from './hooks/useTaskActions';
import { useWeeklyReport } from './hooks/useWeeklyReport';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import TasksSection from './components/TasksSection';
import CalendarSection from './components/CalendarSection';
import SettingsPage from './components/SettingsPage';
import CommandPalette from './components/CommandPalette';
import Toast from './components/Toast';
import TaskDrawer from './components/tasks/TaskDrawer';
import ReportMenu from './components/dashboard/ReportMenu';
import WeeklyReport from './components/dashboard/WeeklyReport';

// Les graphiques (Recharts, lourd) sont chargés à la demande
const StatisticsPage = lazy(() => import('./components/StatisticsPage'));

/** Titre affiché dans l'en-tête pour chaque page. */
const PAGE_TITLES = {
  tasks: 'Tâches',
  calendar: 'Calendrier',
  stats: 'Statistiques',
  settings: 'Paramètres',
};

/** Thème initial : choix mémorisé, sinon préférence du système. */
function getInitialDarkMode() {
  try {
    const stored = localStorage.getItem('theraply-theme');
    if (stored) return stored === 'dark';
  } catch {
    // localStorage indisponible : on suit le système
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/** Squelette affiché pendant le chargement de la page Statistiques. */
function StatsFallback() {
  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4" role="status" aria-label="Chargement des statistiques">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="card p-5">
          <div className="skeleton h-4 w-24 mb-4" />
          <div className="skeleton h-8 w-16" />
        </div>
      ))}
    </div>
  );
}

export default function App({ initialSection = 'tasks' }) {
  // ── Thème ──
  const [darkMode, setDarkMode] = useState(getInitialDarkMode);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    try {
      localStorage.setItem('theraply-theme', darkMode ? 'dark' : 'light');
    } catch {
      // préférence non mémorisée, sans conséquence
    }
  }, [darkMode]);

  // ── Navigation ──
  const [activeSection, setActiveSection] = useState(initialSection);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => window.innerWidth < 1024);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const navigate = useCallback((section) => {
    setActiveSection(section);
    if (window.innerWidth < 1024) setSidebarCollapsed(true);
  }, []);

  // ── Données, statistiques, actions ──
  const {
    data, updateData, save, undo, canUndo, hasUnsavedChanges, lastSaved,
    toast, showToast, exportData, importData, resetData, loadDemoData,
  } = useSaveData();
  const actions = useTaskActions(data, updateData, showToast);
  const stats = useDashboardStats(data);
  const report = useWeeklyReport(data, 'all', showToast);

  // ── Panneau d'édition d'une tâche ──
  const [openTaskId, setOpenTaskId] = useState(null);
  const openTask = data.tasks.find((t) => t.id === openTaskId) || null;
  const closeDrawer = useCallback(() => setOpenTaskId(null), []);

  // ── Palette de commandes (Ctrl/Cmd+K) ──
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((open) => !open);
      } else if (e.key === 'Escape') {
        setPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const commands = useMemo(() => [
    { id: 'cmd:save', label: 'Sauvegarder', meta: 'Ctrl+S', icon: Save, run: () => save() },
    { id: 'cmd:theme', label: darkMode ? 'Passer en mode clair' : 'Passer en mode sombre', icon: Moon, run: () => setDarkMode((d) => !d) },
    { id: 'cmd:export', label: 'Exporter les données (JSON)', icon: Download, run: exportData },
    { id: 'cmd:report-pdf', label: 'Rapport hebdomadaire en PDF', icon: FileText, run: report.print },
    { id: 'cmd:report-md', label: 'Rapport hebdomadaire en Markdown', icon: FileText, run: report.downloadMarkdown },
  ], [darkMode, save, exportData, report.print, report.downloadMarkdown]);

  // Action d'un toast : « Annuler » déclenche l'annulation globale
  const handleToastAction = (action) => (action.undo ? undo() : action.onClick?.());

  const renderContent = () => {
    switch (activeSection) {
      case 'tasks':
        return <TasksSection data={data} tasks={data.tasks} actions={actions} onOpenTask={setOpenTaskId} />;
      case 'calendar':
        return <CalendarSection data={data} />;
      case 'stats':
        return (
          <Suspense fallback={<StatsFallback />}>
            <StatisticsPage stats={stats} data={data} onOpenTask={setOpenTaskId} />
          </Suspense>
        );
      case 'settings':
        return (
          <SettingsPage
            data={data}
            updateData={updateData}
            showToast={showToast}
            onReset={resetData}
            onExport={exportData}
            onImport={importData}
            onLoadDemo={loadDemoData}
          />
        );
      default:
        return null;
    }
  };

  return (
    <>
      <div className="flex h-screen overflow-hidden bg-app no-print">
        <Sidebar
          activeSection={activeSection}
          onNavigate={navigate}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((c) => !c)}
        />

        <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden flex flex-col">
          <div className="max-w-7xl w-full min-w-0 mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 flex-1 flex flex-col">
            <Header
              title={PAGE_TITLES[activeSection]}
              hasUnsavedChanges={hasUnsavedChanges}
              lastSaved={lastSaved}
              onSave={save}
              onUndo={undo}
              canUndo={canUndo}
              darkMode={darkMode}
              onToggleDarkMode={() => setDarkMode((d) => !d)}
              onToggleSidebar={() => setSidebarCollapsed((c) => !c)}
              onOpenCommandPalette={() => setPaletteOpen(true)}
            >
              {activeSection === 'stats' && data.tasks.length > 0 && (
                <ReportMenu onPrint={report.print} onDownloadMarkdown={report.downloadMarkdown} onCopyMarkdown={report.copyMarkdown} />
              )}
            </Header>

            {renderContent()}
          </div>
        </main>

        {openTask && (
          <TaskDrawer
            key={openTask.id}
            task={openTask}
            data={data}
            onClose={closeDrawer}
            onChange={actions.editTask}
            onDelete={actions.deleteTasks}
          />
        )}

        <Toast toast={toast} onAction={handleToastAction} onClose={() => showToast(null)} />

        {paletteOpen && (
          <CommandPalette
            data={data}
            commands={commands}
            onClose={() => setPaletteOpen(false)}
            onNavigate={navigate}
            onOpenTask={setOpenTaskId}
            onAddTask={actions.addQuickTask}
          />
        )}
      </div>

      {/* Version imprimable du rapport (PDF) */}
      {report.printReport && (
        <div className="print-only">
          <WeeklyReport report={report.printReport} />
        </div>
      )}
    </>
  );
}
