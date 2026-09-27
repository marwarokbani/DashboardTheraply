/**
 * Toast — Notification éphémère, avec action optionnelle (ex. « Annuler »).
 */
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

const ICONS = { success: CheckCircle2, error: AlertTriangle, info: Info };

export default function Toast({ toast, onAction, onClose }) {
  if (!toast) return null;
  const Icon = ICONS[toast.type] || Info;

  return (
    <div className="toast-container" role={toast.type === 'error' ? 'alert' : 'status'} aria-live="polite">
      <div key={toast.id} className={`toast toast-${toast.type} animate-toast-enter`}>
        <Icon className="w-4 h-4 shrink-0 toast-icon" aria-hidden />
        <span className="text-sm flex-1">{toast.message}</span>
        {toast.action && (
          <button type="button" className="toast-action" onClick={() => { onAction(toast.action); onClose(); }}>
            {toast.action.label}
          </button>
        )}
        <button type="button" onClick={onClose} className="toast-close" aria-label="Fermer la notification">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
