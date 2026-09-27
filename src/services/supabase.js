/**
 * supabase.js — Client Supabase et adaptateur de persistance en ligne.
 *
 * Activé seulement si VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY sont définies
 * (.env.local en local, variables d'environnement sur Vercel). Sans elles,
 * l'application reste 100 % locale (localStorage).
 *
 * Toutes les données du dashboard tiennent dans une seule ligne de la table
 * `dashboard_data` (voir supabase/schema.sql), lisible uniquement par les
 * utilisateurs connectés.
 */
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env?.VITE_SUPABASE_URL;
const anonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY;

/** Client Supabase, ou null si le projet n'est pas configuré. */
export const supabase = url && anonKey ? createClient(url, anonKey) : null;

const TABLE = 'dashboard_data';
const ROW_ID = 'main';

export const supabaseAdapter = supabase && {
  /** Retourne l'objet sauvegardé ({ data, version, lastSaved }) ou null. */
  async load() {
    const { data, error } = await supabase.from(TABLE).select('payload').eq('id', ROW_ID).maybeSingle();
    if (error) throw error;
    return data?.payload ?? null;
  },

  /** Enregistre l'objet complet. */
  async save(payload) {
    const { error } = await supabase
      .from(TABLE)
      .upsert({ id: ROW_ID, payload, updated_at: payload.lastSaved });
    if (error) throw error;
  },

  /** Efface la sauvegarde. */
  async clear() {
    const { error } = await supabase.from(TABLE).delete().eq('id', ROW_ID);
    if (error) throw error;
  },
};
