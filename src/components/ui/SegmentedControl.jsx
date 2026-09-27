/**
 * SegmentedControl — Groupe de boutons exclusifs (bascule d'unité, de mode, de vue…).
 */
export default function SegmentedControl({ label, options, value, onChange, size = 'md' }) {
  return (
    <div role="group" aria-label={label} className={`segmented ${size === 'sm' ? 'segmented-sm' : ''}`}>
      {options.map((opt) => {
        const Icon = opt.icon;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={value === opt.value}
            onClick={() => onChange(opt.value)}
            className="segmented-item"
            title={opt.title}
            aria-label={opt.icon && !opt.label ? opt.title : undefined}
          >
            {Icon && <Icon className="w-4 h-4" aria-hidden />}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
