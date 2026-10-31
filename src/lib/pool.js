// Grupo de jogos da roleta a partir da configuração do ADM (linha "config" no banco).
//
// config = { filters: {players: [], themes: [], sizes: [], status: []}, mode: "equal"|"custom",
//            banned: [jogo], off: [jogo], pct: {jogo: número} }
// Todos os aparelhos calculam o mesmo grupo a partir dela.
import { GAMELIST } from "../data/games.js";
import { FACETS, passFacets } from "./filters.js";
import { buildPool, weights } from "./wheel.js";

export function normalizeConfig(c) {
  c = c && typeof c === "object" ? c : {};
  const f = c.filters || {};
  const arr = v => Array.isArray(v) ? v : [];
  return {
    filters: Object.fromEntries(FACETS.map(({ key }) => [key, arr(f[key])])),
    mode: c.mode === "custom" ? "custom" : "equal",
    banned: arr(c.banned),
    off: arr(c.off),
    pct: c.pct && typeof c.pct === "object" ? c.pct : {},
  };
}

const asSets = filters => Object.fromEntries(FACETS.map(({ key }) => [key, new Set(filters[key] || [])]));
const byKey = (a, b) => a.key.localeCompare(b.key);

// Jogos que passam nos filtros do ADM (inclui banidos e desmarcados, para a tabela)
export function filteredGames(config) {
  const sets = asSets(config.filters);
  return GAMELIST.filter(g => passFacets(g, sets)).sort(byKey);
}
// Jogos que entram de fato na roleta
export function activeGames(config) {
  const banned = new Set(config.banned), off = new Set(config.off);
  return filteredGames(config).filter(g => !banned.has(g.id) && !off.has(g.id));
}
export function poolFromConfig(config) {
  return buildPool(activeGames(config), config.mode, config.pct);
}
export function activeWeights(config) {
  return weights(activeGames(config), config.mode, config.pct);
}
// Soma dos valores digitados (modo personalizado), para avisar se passar de 100%
export function typedSum(config) {
  return activeGames(config).reduce((a, g) => a + (config.pct[g.id] != null && config.pct[g.id] !== "" ? +config.pct[g.id] : 0), 0);
}
// Porcentagens que somam 100% mantendo a proporção atual
export function normalizedPct(config) {
  const active = activeGames(config); const w = activeWeights(config);
  const tot = w.reduce((a, b) => a + b, 0) || 1;
  const pct = { ...config.pct };
  active.forEach((g, i) => { pct[g.id] = Math.round(w[i] / tot * 10000) / 100; });
  return pct;
}
