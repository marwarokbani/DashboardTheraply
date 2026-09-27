/**
 * ReportMenu — Export du rapport hebdomadaire : Markdown (téléchargement ou
 * copie) et PDF (via l'impression du navigateur, « Enregistrer en PDF »).
 */
import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ClipboardCopy, FileDown, FileText, Printer } from 'lucide-react';

export default function ReportMenu({ onDownloadMarkdown, onCopyMarkdown, onPrint }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Fermeture au clic extérieur ou avec Échap
  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => {
      if (e.type === 'keydown' ? e.key === 'Escape' : !ref.current?.contains(e.target)) setOpen(false);
    };
    window.addEventListener('mousedown', close);
    window.addEventListener('keydown', close);
    return () => {
      window.removeEventListener('mousedown', close);
      window.removeEventListener('keydown', close);
    };
  }, [open]);

  const run = (action) => () => {
    setOpen(false);
    action();
  };

  return (
    <div ref={ref} className="relative">
      <button type="button" className="btn btn-secondary" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <FileText className="w-4 h-4" aria-hidden />
        <span className="hidden sm:inline">Rapport</span>
        <ChevronDown className="w-3.5 h-3.5 text-tertiary" aria-hidden />
      </button>
      {open && (
        <div role="menu" className="menu">
          <p className="menu-label">Rapport de la semaine</p>
          <button type="button" role="menuitem" className="menu-item" onClick={run(onPrint)}>
            <Printer className="w-4 h-4" aria-hidden /> PDF (imprimer / enregistrer)
          </button>
          <button type="button" role="menuitem" className="menu-item" onClick={run(onDownloadMarkdown)}>
            <FileDown className="w-4 h-4" aria-hidden /> Télécharger en Markdown
          </button>
          <button type="button" role="menuitem" className="menu-item" onClick={run(onCopyMarkdown)}>
            <ClipboardCopy className="w-4 h-4" aria-hidden /> Copier le Markdown
          </button>
        </div>
      )}
    </div>
  );
}
