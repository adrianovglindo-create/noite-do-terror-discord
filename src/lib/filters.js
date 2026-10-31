// Filtros do catálogo e da roleta (jogadores, tema, tamanho, preço) e textos de exibição.

export const normalize = t => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function inRange(g, a, b) { return g.min != null && g.min <= b && (g.max ?? g.min) >= a; }
export function themeMatch(g, id) { return id === "Q" ? g.themes.length === 0 : g.themes.includes(id); }

export const PLAYER_OPTS = [
  { id: "solo", label: "Dá pra jogar sozinho", test: g => g.min === 1 },
  { id: "2", label: "2 jogadores", test: g => inRange(g, 2, 2) },
  { id: "3-4", label: "3 a 4 jogadores", test: g => inRange(g, 3, 4) },
  { id: "5-8", label: "5 a 8 jogadores", test: g => inRange(g, 5, 8) },
  { id: "9+", label: "9 ou mais", test: g => inRange(g, 9, 999) },
  { id: "na", label: "A confirmar", test: g => g.min == null },
];
export const THEME_OPTS = [
  { id: "T", label: "Terror", color: "var(--t-terror)" },
  { id: "D", label: "Diversão", color: "var(--t-diversao)" },
  { id: "P", label: "Competitivo", color: "var(--t-comp)" },
  { id: "C", label: "Cooperativo", color: "var(--t-coop)" },
  { id: "Q", label: "A confirmar", color: "var(--muted)" },
].map(o => ({ ...o, test: g => themeMatch(g, o.id) }));
export const SIZE_OPTS = [
  { id: "xs", label: "Até 1 GB", test: g => g.size != null && g.size <= 1 },
  { id: "s", label: "1 a 5 GB", test: g => g.size != null && g.size > 1 && g.size <= 5 },
  { id: "m", label: "5 a 15 GB", test: g => g.size != null && g.size > 5 && g.size <= 15 },
  { id: "l", label: "Mais de 15 GB", test: g => g.size != null && g.size > 15 },
  { id: "na", label: "A confirmar", test: g => g.size == null },
];
export const STATUS_OPTS = [
  { id: "G", label: "Grátis", color: "var(--s-free)" },
  { id: "P", label: "Hydra (pago)", color: "var(--s-paid)" },
  { id: "V", label: "A confirmar", color: "var(--s-check)" },
].map(o => ({ ...o, test: g => g.status === o.id }));
export const FACETS = [
  { key: "players", legend: "Jogadores", opts: PLAYER_OPTS, chip: o => o.label },
  { key: "themes", legend: "Tema", opts: THEME_OPTS, chip: o => o.label },
  { key: "sizes", legend: "Tamanho", opts: SIZE_OPTS, chip: o => "Tamanho: " + o.label },
  { key: "status", legend: "Preço", opts: STATUS_OPTS, chip: o => "Preço: " + o.label },
];

export const THEME_LABEL = { T: "Terror", D: "Diversão", P: "Competitivo", C: "Cooperativo" };
export const STATUS_LABEL = { G: "Grátis", P: "Hydra", V: "A confirmar" };

export function playersText(g) {
  if (g.min == null) return "Jogadores a confirmar";
  if (g.max === 99) return `${g.min}+ jogadores`;
  if (g.min === g.max) return `${g.min} jogador${g.min > 1 ? "es" : ""}`;
  return `${g.min} a ${g.max} jogadores`;
}
export function sizeText(g) {
  if (g.size == null) return "Tamanho a confirmar";
  if (g.size === 0) return "Joga no navegador";
  if (g.size < 1) return `~${Math.round(g.size * 1000)} MB`;
  return `~${(g.size % 1 === 0 ? g.size : g.size.toFixed(1)).toString().replace(".", ",")} GB`;
}

export function parseQuery(q) {
  const m = q.match(/\d+/); const n = m ? parseInt(m[0], 10) : null;
  const text = normalize(q.replace(/\d+/g, "").replace(/jogadores?|players?|pessoas?/gi, "").trim());
  return { n, text };
}
// Busca do catálogo: aceita nome do jogo e/ou um número de jogadores
export function passSearch(g, q) {
  if (!q) return true;
  const { n, text } = parseQuery(q);
  if (n != null && !text) return inRange(g, n, n) || g.key.includes(String(n));
  if (text && !g.key.includes(text)) return false;
  if (n != null && !inRange(g, n, n) && !g.key.includes(String(n))) return false;
  return true;
}
// Busca da roleta: só pelo nome
export const passName = (g, q) => !q || g.key.includes(normalize(q));

const passFacet = (opts, g, sel) => sel.size === 0 || [...sel].some(id => opts.find(o => o.id === id).test(g));
export const FACET_TEST = {
  players: (g, sel) => passFacet(PLAYER_OPTS, g, sel),
  themes: (g, sel) => passFacet(THEME_OPTS, g, sel),
  sizes: (g, sel) => passFacet(SIZE_OPTS, g, sel),
  status: (g, sel) => passFacet(STATUS_OPTS, g, sel),
};
export const passFacets = (g, f) => Object.keys(FACET_TEST).every(k => FACET_TEST[k](g, f[k]));

// Contagem de cada opção considerando os outros grupos de filtro (busca facetada)
export function facetCounts(base, f) {
  const out = {};
  for (const { key, opts } of FACETS) {
    const others = Object.keys(FACET_TEST).filter(k => k !== key);
    const pool = base.filter(g => others.every(k => FACET_TEST[k](g, f[k])));
    out[key] = Object.fromEntries(opts.map(o => [o.id, pool.filter(o.test).length]));
  }
  return out;
}
