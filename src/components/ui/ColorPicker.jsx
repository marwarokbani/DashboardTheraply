/**
 * ColorPicker — Choix d'une couleur dans la palette prédéfinie.
 */
import { Check } from 'lucide-react';
import { PRESET_COLORS } from '../../utils/team';

export default function ColorPicker({ value, onChange, label = 'Couleur' }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
      {PRESET_COLORS.map((color) => {
        const selected = value === color;
        return (
          <button
            key={color}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={color}
            onClick={() => onChange(color)}
            className="w-6 h-6 rounded-full flex items-center justify-center cursor-pointer transition-transform duration-150 hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ background: color, outlineColor: color }}
          >
            {selected && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
          </button>
        );
      })}
    </div>
  );
}
