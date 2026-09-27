/**
 * Sidebar — Navigation principale.
 * Ordinateur : repliable en colonne d'icônes. Mobile : tiroir par-dessus le contenu.
 */
import { BarChart3, Calendar, CheckSquare, ChevronsLeft, ChevronsRight, Settings } from 'lucide-react';

const NAV_ITEMS = [
  { id: 'tasks', label: 'Tâches', icon: CheckSquare },
  { id: 'calendar', label: 'Calendrier', icon: Calendar },
  { id: 'stats', label: 'Statistiques', icon: BarChart3 },
];

function NavButton({ item, active, collapsed, onNavigate }) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={() => onNavigate(item.id)}
      aria-current={active ? 'page' : undefined}
      className="nav-item"
      title={collapsed ? item.label : undefined}
    >
      <Icon className="w-4 h-4 shrink-0" aria-hidden />
      <span className={collapsed ? 'sr-only' : ''}>{item.label}</span>
    </button>
  );
}

export default function Sidebar({ activeSection, onNavigate, collapsed, onToggle }) {
  return (
    <>
      {!collapsed && <div className="sidebar-backdrop lg:hidden" onClick={onToggle} aria-hidden />}

      <aside className={`sidebar ${collapsed ? 'is-collapsed' : ''}`} aria-label="Navigation principale">
        <div className={`flex items-center gap-2.5 h-16 shrink-0 ${collapsed ? 'justify-center' : 'px-5'}`}>
          <img src="/LogoTheraply.png" alt="" className="w-7 h-7 object-contain" />
          {!collapsed && <span className="text-[0.9375rem] font-semibold tracking-tight text-primary">Theraply</span>}
        </div>

        <nav className="flex-1 px-3 space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <NavButton key={item.id} item={item} active={activeSection === item.id} collapsed={collapsed} onNavigate={onNavigate} />
          ))}
        </nav>

        <div className="px-3 py-3 space-y-0.5 border-t" style={{ borderColor: 'var(--border-light)' }}>
          <NavButton item={{ id: 'settings', label: 'Paramètres', icon: Settings }} active={activeSection === 'settings'} collapsed={collapsed} onNavigate={onNavigate} />
          <button type="button" onClick={onToggle} className="nav-item hidden lg:flex" aria-label={collapsed ? 'Déplier la barre latérale' : 'Replier la barre latérale'}>
            {collapsed ? <ChevronsRight className="w-4 h-4" aria-hidden /> : <><ChevronsLeft className="w-4 h-4" aria-hidden /> <span>Replier</span></>}
          </button>
        </div>
      </aside>
    </>
  );
}
