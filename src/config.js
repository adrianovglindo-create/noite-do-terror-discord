// Configuração do Supabase (no painel do Supabase: Project Settings > API).
//   url: a "Project URL", ex.: "https://abcdefghijkl.supabase.co"
//   key: a chave "anon" / "publishable". Ela é pública, pode ficar aqui no código.
// NUNCA coloque aqui a chave "service_role" / "secret".
// As variáveis VITE_SUPABASE_URL e VITE_SUPABASE_KEY, se existirem, têm prioridade
// (opcional: dá para configurar por variáveis de ambiente na Vercel).
export const SUPABASE_CONFIG = {
  url: import.meta.env.VITE_SUPABASE_URL || "https://bpughareviyswxvcnyae.supabase.co",
  key: import.meta.env.VITE_SUPABASE_KEY || "sb_publishable_dj6ihUNcDRpqPL0QouUj8Q_7jRRnZsq",
};
