/**
 * AuthGate — Écran de connexion (Supabase Auth, e-mail + mot de passe).
 *
 * Si Supabase n'est pas configuré, affiche directement l'application
 * (mode local). Sinon, l'application n'est montée qu'une fois connecté,
 * pour que les données en ligne ne soient accessibles qu'à l'équipe.
 */
import { useEffect, useState } from 'react';
import { LogIn } from 'lucide-react';
import { supabase } from '../services/supabase';

export default function AuthGate({ children }) {
  const [session, setSession] = useState(undefined); // undefined = vérification en cours
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!supabase) return undefined;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  if (!supabase) return children;
  if (session === undefined) return <LoadingScreen />;
  if (session) return children;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setSubmitting(false);
    if (authError) setError('E-mail ou mot de passe incorrect.');
  };

  return (
    <div className="min-h-screen bg-app flex items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="card w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center gap-3">
          <img src="/LogoTheraply.png" alt="" className="w-9 h-9 rounded-lg" />
          <div>
            <h1 className="text-lg font-semibold text-primary">Theraply — Suivi des tests</h1>
            <p className="text-xs text-tertiary">Connectez-vous pour accéder au dashboard</p>
          </div>
        </div>

        <label className="block space-y-1">
          <span className="field-label">E-mail</span>
          <input type="email" className="input" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="block space-y-1">
          <span className="field-label">Mot de passe</span>
          <input type="password" className="input" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>

        {error && <p className="text-sm text-danger" role="alert">{error}</p>}

        <button type="submit" className="btn btn-primary w-full" disabled={submitting}>
          <LogIn className="w-4 h-4" aria-hidden /> {submitting ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>
    </div>
  );
}

/** Écran d'attente (vérification de session, chargement des données en ligne). */
export function LoadingScreen() {
  return (
    <div className="min-h-screen bg-app flex items-center justify-center" role="status">
      <p className="text-sm text-tertiary">Chargement…</p>
    </div>
  );
}
