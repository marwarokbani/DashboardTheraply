/**
 * Avatar — Pastille colorée avec les initiales d'un membre.
 * Affiche un cercle neutre « ? » si la tâche n'est pas assignée.
 */
import { getInitials } from '../../utils/team';

const SIZES = {
  xs: 'w-5 h-5 text-[10px]',
  sm: 'w-6 h-6 text-[11px]',
  md: 'w-8 h-8 text-xs',
  lg: 'w-10 h-10 text-sm',
};

export default function Avatar({ member, size = 'sm', showTitle = true }) {
  const classes = `${SIZES[size]} rounded-full inline-flex items-center justify-center font-semibold shrink-0 select-none`;
  if (!member) {
    return (
      <span className={`${classes} border border-dashed text-tertiary`} style={{ borderColor: 'var(--border-strong)' }} title={showTitle ? 'Non assignée' : undefined} aria-label="Non assignée">
        ?
      </span>
    );
  }
  return (
    <span className={`${classes} text-white`} style={{ background: member.color }} title={showTitle ? member.name : undefined} aria-label={member.name}>
      {getInitials(member.name)}
    </span>
  );
}
