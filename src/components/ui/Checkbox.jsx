/**
 * Checkbox — Case ronde animée (cocher une tâche en un clic).
 * Arrête la propagation pour ne pas ouvrir la carte parente.
 */
import { Check } from 'lucide-react';

export default function Checkbox({ checked, onChange, label, size = 'md' }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
      onPointerDown={(e) => e.stopPropagation()} // ne démarre pas un glisser-déposer
      className={`task-check ${size === 'sm' ? 'task-check-sm' : ''} ${checked ? 'is-checked' : ''}`}
    >
      <Check className="task-check-icon" strokeWidth={3} aria-hidden />
    </button>
  );
}
