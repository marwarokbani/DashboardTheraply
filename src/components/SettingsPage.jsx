/**
 * SettingsPage — Paramètres : équipe, catégories, données.
 */
import { useState } from 'react';
import { Database, Layers, Users } from 'lucide-react';
import MembersSettings from './settings/MembersSettings';
import ModulesSettings from './settings/ModulesSettings';
import DataSettings from './settings/DataSettings';

const TABS = [
  { id: 'members', label: 'Équipe', icon: Users },
  { id: 'modules', label: 'Catégories', icon: Layers },
  { id: 'data', label: 'Données', icon: Database },
];

export default function SettingsPage({ data, updateData, showToast, onReset, onExport, onImport, onLoadDemo }) {
  const [activeTab, setActiveTab] = useState('members');
  const shared = { data, updateData, showToast };

  return (
    <section className="max-w-2xl animate-fade-in" aria-label="Paramètres">
      <div role="tablist" aria-label="Sections des paramètres" className="segmented mb-6">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`tab-${id}`}
            aria-selected={activeTab === id}
            aria-controls={`panel-${id}`}
            onClick={() => setActiveTab(id)}
            className="segmented-item flex-1"
          >
            <Icon className="w-4 h-4" aria-hidden />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${activeTab}`} aria-labelledby={`tab-${activeTab}`}>
        {activeTab === 'members' && <MembersSettings {...shared} />}
        {activeTab === 'modules' && <ModulesSettings {...shared} />}
        {activeTab === 'data' && (
          <DataSettings data={data} onExport={onExport} onImport={onImport} onReset={onReset} onLoadDemo={onLoadDemo} />
        )}
      </div>
    </section>
  );
}
