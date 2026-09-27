/**
 * DataSettings — Emplacement des données, compte, export / import JSON,
 * données de démo et réinitialisation (double confirmation).
 */
import { useRef, useState } from 'react';
import { Cloud, Download, HardDrive, LogOut, RotateCcw, Upload, Sparkles } from 'lucide-react';
import { supabase } from '../../services/supabase';

export default function DataSettings({ data, onExport, onImport, onReset, onLoadDemo }) {
  const [confirmReset, setConfirmReset] = useState(false);
  const fileInputRef = useRef(null);
  const hasContent = data.tasks.length > 0 || data.sprints.length > 0;

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file && confirm('Importer ce fichier remplacera les données actuelles. Continuer ?')) {
      await onImport(file);
    }
  };

  const handleDemo = () => {
    if (hasContent && !confirm('Les données de démo remplaceront définitivement vos données actuelles. Pensez à exporter avant. Continuer ?')) return;
    onLoadDemo();
  };


  return (
    <div className="space-y-3">
      <div className="settings-row">
        {supabase ? <Cloud className="w-4 h-4 text-accent" aria-hidden /> : <HardDrive className="w-4 h-4 text-tertiary" aria-hidden />}
        <span className="flex-1">
          <span className="block text-sm font-medium text-primary">
            {supabase ? 'Enregistrement automatique en ligne' : 'Enregistrement automatique dans ce navigateur'}
          </span>
          <span className="block text-xs text-tertiary">
            {supabase
              ? 'Chaque modification est enregistrée sur le serveur et retrouvée sur tous vos appareils'
              : 'Chaque modification est enregistrée, uniquement sur cet appareil'}
          </span>
        </span>
        {supabase && (
          <button type="button" className="btn btn-ghost" onClick={() => supabase.auth.signOut()}>
            <LogOut className="w-4 h-4" aria-hidden /> Se déconnecter
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <button type="button" className="btn btn-secondary" onClick={onExport}>
          <Download className="w-4 h-4" /> Exporter en JSON
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => fileInputRef.current?.click()}>
          <Upload className="w-4 h-4" /> Importer un JSON
        </button>
        <input ref={fileInputRef} type="file" accept="application/json,.json" className="hidden" onChange={handleImport} />
      </div>

      <button type="button" className="btn btn-secondary w-full" onClick={handleDemo}>
        <Sparkles className="w-4 h-4" /> Charger des données de démo
      </button>

      {confirmReset ? (
        <div className="settings-card space-y-3" role="alertdialog" aria-label="Confirmer la réinitialisation">
          <p className="text-sm text-primary">
            Effacer définitivement toutes les tâches, sprints, jalons et notes ? Pensez à exporter avant.
          </p>
          <div className="flex gap-2">
            <button type="button" className="btn btn-danger flex-1" onClick={() => { onReset(); setConfirmReset(false); }}>
              Tout effacer
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setConfirmReset(false)}>Annuler</button>
          </div>
        </div>
      ) : (
        <button type="button" className="btn btn-danger-ghost w-full" onClick={() => setConfirmReset(true)}>
          <RotateCcw className="w-4 h-4" /> Réinitialiser le dashboard
        </button>
      )}
    </div>
  );
}
