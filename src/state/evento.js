// Estado compartilhado do evento (vem do Supabase) e as ações sobre ele.
//
// data = { config: {...ver lib/pool.js}, spin: {seq, winner, state, by, ts},
//          admin: {pin}, players: {id: {name, color, pin, skipsUsed, ban, save, ts}},
//          history: {id: {game, type: "pulado"|"escolhido", by, ts, undone}},
//          timers: {playerId: {total: ms acumulados, since: início da contagem atual ou null}} }
//
// Os componentes leem com useEvento() e chamam as funções exportadas daqui.
import { useSyncExternalStore, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_CONFIG } from "../config.js";
import { createSupabaseStore } from "../lib/store.js";
import { LS } from "../lib/storage.js";
import { sha } from "../lib/hash.js";
import { newId } from "../lib/paths.js";
import { cardMap, finalWheel, pickWeighted } from "../lib/wheel.js";
import { normalizeConfig, poolFromConfig } from "../lib/pool.js";

export const SKIPS = 3;
export const COLORS = [["azul", "Azul", "#3B82F6"], ["verde", "Verde", "#22C55E"], ["amarelo", "Amarelo", "#EAB308"], ["roxo", "Roxo", "#A855F7"],
  ["rosa", "Rosa", "#EC4899"], ["vermelho", "Vermelho", "#EF4444"], ["preto", "Preto", "#1A1520"], ["branco", "Branco", "#F7F3EC"]];
export const colorHex = id => (COLORS.find(c => c[0] === id) || COLORS[0])[2];

// "me" e "isAdmin" só lembram quem está usando este aparelho
const LS_ME = "nt-me", LS_ADM = "nt-adm";

/* ---------- store externo (useSyncExternalStore) ---------- */
let state = {
  data: {},
  status: "conectando", // conectando | online | erro | sem-config
  connected: false,
  loaded: false,
  me: LS.get(LS_ME),
  isAdmin: LS.get(LS_ADM) === "1",
};
const listeners = new Set();
const setState = patch => { state = { ...state, ...patch }; listeners.forEach(l => l()); };
const subscribe = l => { listeners.add(l); return () => listeners.delete(l); };
export const getState = () => state;

// Estado + valores derivados (participantes, cartas, config, roleta final)
export function useEvento() {
  const s = useSyncExternalStore(subscribe, getState);
  const derived = useMemo(() => {
    const players = Object.entries(s.data.players || {}).map(([id, p]) => ({ id, ...p })).sort((a, b) => (a.ts || 0) - (b.ts || 0));
    const cards = cardMap(players);
    const config = normalizeConfig(s.data.config);
    const pool = poolFromConfig(config);
    return { players, cards, config, pool, wheel: finalWheel(pool, cards) };
  }, [s.data]);
  return { ...s, ...derived };
}

const playerById = id => (state.data.players || {})[id] ? { id, ...state.data.players[id] } : null;
export const canEdit = (s, pid) => s.isAdmin || pid === s.me;

/* ---------- conexão ---------- */
let Store = null;
export async function initSync() {
  if (!SUPABASE_CONFIG.url || !SUPABASE_CONFIG.key) { setState({ status: "sem-config", loaded: true }); return; }
  try {
    const client = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.key, { auth: { persistSession: false } });
    Store = createSupabaseStore(client, {
      onChange: data => setState({ data, loaded: true }),
      onStatus: ok => setState({ connected: ok }),
    });
    setState({ status: "online" });
    await Store.start();
    // ao voltar para a aba (ex.: celular que bloqueou a tela), recarrega tudo
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && state.connected) Store.reload().catch(() => {});
    });
  } catch (e) {
    console.error(e); setState({ status: "erro", loaded: true });
  }
}

/* ---------- contas ---------- */
export async function createPlayer(rawName, pin, color) {
  const name = rawName.trim().replace(/\s+/g, " ");
  if (!name) return "Digite um nome.";
  if (Object.values(state.data.players || {}).some(p => p.name.toLowerCase() === name.toLowerCase())) return "Já existe alguém com esse nome.";
  if (!/^\d{4}$/.test(pin)) return "O PIN precisa ter 4 números.";
  const pid = newId("p");
  await Store.set(`players/${pid}`, { name, color, skipsUsed: 0, ts: Date.now(), pin: await sha(pid + "|" + pin) });
  LS.set(LS_ME, pid); setState({ me: pid });
  return null;
}
export async function login(pid, pin) {
  const p = playerById(pid);
  if (!p || p.pin !== await sha(pid + "|" + pin)) return "PIN incorreto.";
  LS.set(LS_ME, pid); setState({ me: pid }); return null;
}
export function logout() { LS.del(LS_ME); setState({ me: null }); }

export async function adminLogin(pin) {
  if (pin.length < 4) return "Use pelo menos 4 números.";
  const hsh = await sha("adm|" + pin);
  const cur = state.data.admin && state.data.admin.pin;
  if (!cur) {
    const ok = await Store.tx("admin/pin", c => c ? undefined : hsh); // só define se ninguém definiu
    if (!ok) return "Alguém já definiu o PIN do ADM.";
  } else if (cur !== hsh) return "PIN incorreto.";
  LS.set(LS_ADM, "1"); setState({ isAdmin: true }); return null;
}
export function adminLogout() { LS.del(LS_ADM); setState({ isAdmin: false }); }

/* ---------- cartas ---------- */
// Estas aparecem na tela na hora (otimista) e o banco confirma em seguida
const mine = pid => canEdit(state, pid);
const OPT = { optimistic: true };
export const putCard = (pid, type, game) => mine(pid) && Store.update(`players/${pid}`, { [type]: game }, OPT);
export const removeCard = (pid, type) => mine(pid) && Store.update(`players/${pid}`, { [type]: null }, OPT);
export const setColor = (pid, color) => mine(pid) && Store.update(`players/${pid}`, { color }, OPT);
export const removePlayer = pid => state.isAdmin && Store.set(`players/${pid}`, null);

/* ---------- configuração da roleta (só ADM) ---------- */
// fn recebe a config atual (normalizada) e devolve a nova
export const updateConfig = fn => state.isAdmin && Store.tx("config", cur => fn(normalizeConfig(cur)), OPT);

/* ---------- giro ---------- */
// O ADM sorteia e grava o resultado; todos os aparelhos animam até o mesmo jogo.
// afterSkip: número do giro que foi pulado (giro automático). Só gira se esse
// giro ainda estiver como "skipped", para dois aparelhos do ADM não girarem duas vezes.
export async function spin(afterSkip = null) {
  if (!state.isAdmin) return;
  const config = normalizeConfig(state.data.config);
  const players = Object.values(state.data.players || {});
  const pick = pickWeighted(finalWheel(poolFromConfig(config), cardMap(players)));
  if (!pick) return;
  await Store.tx("spin", cur => {
    if (afterSkip != null && (!cur || cur.seq !== afterSkip || cur.state !== "skipped")) return undefined;
    return { seq: ((cur && cur.seq) || 0) + 1, winner: pick, state: "live", ts: Date.now() };
  });
}

// Gasta uma carta de pular. A troca do giro para "skipped" é condicional:
// se duas pessoas apertarem juntas, só a primeira gasta a carta.
export async function spendSkip(pid) {
  const s = state.data.spin; const p = playerById(pid);
  if (!s || s.state !== "live" || !p || (p.skipsUsed || 0) >= SKIPS || !mine(pid)) return false;
  const ok = await Store.tx("spin", cur => (!cur || cur.seq !== s.seq || cur.state !== "live") ? undefined : { ...cur, state: "skipped", by: pid });
  if (!ok) return false;
  await Store.tx(`players/${pid}/skipsUsed`, c => Math.min(SKIPS, (c || 0) + 1));
  await Store.push("history", { game: s.winner, type: "pulado", by: pid, ts: Date.now() });
  return true;
}

export async function confirmPick() {
  const s = state.data.spin; if (!s || !state.isAdmin) return;
  const ok = await Store.tx("spin", cur => (!cur || cur.seq !== s.seq || cur.state !== "live") ? undefined : { ...cur, state: "chosen" });
  if (ok) await Store.push("history", { game: s.winner, type: "escolhido", ts: Date.now() });
}

export async function undoSkip(hid) {
  const h = (state.data.history || {})[hid]; if (!state.isAdmin || !h || h.undone) return;
  if (h.by) await Store.tx(`players/${h.by}/skipsUsed`, c => Math.max(0, (c || 0) - 1));
  await Store.update(`history/${hid}`, { undone: true });
}

// ---- ADM: histórico e cartas de pular ----
export async function deleteHistoryItem(hid, giveBackCard = false) {
  const h = (state.data.history || {})[hid]; if (!state.isAdmin || !h) return;
  if (giveBackCard && h.type === "pulado" && !h.undone && h.by) await Store.tx(`players/${h.by}/skipsUsed`, c => Math.max(0, (c || 0) - 1));
  await Store.set(`history/${hid}`, null);
}
export async function clearHistory() {
  if (!state.isAdmin) return;
  for (const hid of Object.keys(state.data.history || {})) await Store.set(`history/${hid}`, null);
}
// devolve as cartas de pular de um participante (ou de todos, sem pid)
export async function resetSkips(pid = null) {
  if (!state.isAdmin) return;
  const ids = pid ? [pid] : Object.keys(state.data.players || {});
  for (const id of ids) if ((state.data.players || {})[id]) await Store.update(`players/${id}`, { skipsUsed: 0 });
}

// ---- ADM: cronômetro de cada participante (aba Tempo) ----
// total = tempo já somado; since = quando a contagem atual começou (null = parado).
export const timerNow = (t, now = Date.now()) => t ? (t.total || 0) + (t.since ? Math.max(0, now - t.since) : 0) : 0;
const timerTx = (pid, fn) => Store.tx(`timers/${pid}`, cur => fn({ total: 0, since: null, ...(cur || {}) }));
export async function timerStart(pid) {
  if (!state.isAdmin) return;
  await timerTx(pid, t => t.since ? undefined : { ...t, since: Date.now() });
}
export async function timerStop(pid) {
  if (!state.isAdmin) return;
  await timerTx(pid, t => t.since ? { total: timerNow(t), since: null } : undefined);
}
export async function timerAdjust(pid, deltaMs) {
  if (!state.isAdmin || !deltaMs) return;
  await timerTx(pid, t => ({ ...t, total: Math.max(0, (t.total || 0) + deltaMs) }));
}
export async function timerReset(pid) {
  if (!state.isAdmin) return;
  await Store.set(`timers/${pid}`, null);
}
export async function timerStopAll() {
  if (!state.isAdmin) return;
  for (const [pid, t] of Object.entries(state.data.timers || {})) if (t && t.since) await timerStop(pid);
}

export async function resetAll() {
  if (!state.isAdmin) return;
  for (const pid of Object.keys(state.data.players || {})) await Store.update(`players/${pid}`, { skipsUsed: 0, ban: null, save: null });
  for (const hid of Object.keys(state.data.history || {})) await Store.set(`history/${hid}`, null);
  await Store.set("spin", null);
}
