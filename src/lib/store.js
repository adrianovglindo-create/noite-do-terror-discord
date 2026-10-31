// Estado do evento na tabela public.estado do Supabase.
//
// Cada linha é { key, value (jsonb), ver }. As chaves são "config", "spin", "admin",
// "players/<id>" e "history/<id>" (ver splitPath). Toda escrita é
// "ler e depois atualizar onde ver = versão lida" (concorrência otimista), com
// até MAX_TRIES tentativas. Assim, se duas pessoas apertam "pular" ao mesmo
// tempo, só a primeira grava. As mudanças chegam a todos pelo Realtime
// (postgres_changes) e, a cada (re)conexão, o estado inteiro é recarregado.
import { getAt, setAt, clone, splitPath, newId } from "./paths.js";

export const TABLE = "estado";
const MAX_TRIES = 6;
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Linhas que só o ADM grava. O banco (RLS) recusa escrita direta nelas; o ADM
// grava pela função admin_write, que confere a sessão de ADM no servidor.
export const ADMIN_ONLY = /^(config|admin|timers)$/;

export function createSupabaseStore(client, { onChange, onStatus, adminToken = () => null }) {
  const rows = new Map(); // key -> { value, ver } (o que o banco confirmou)
  // Escritas otimistas ainda em andamento: aparecem na tela na hora e são
  // reaplicadas por cima do valor confirmado até o banco responder.
  const pending = new Map(); // key -> [{ sub, fn }]
  let reloading = false, buffer = [], channel = null;

  function snapshot() {
    const ev = {};
    for (const key of new Set([...rows.keys(), ...pending.keys()])) {
      let value = rows.has(key) ? clone(rows.get(key).value) : null;
      for (const op of pending.get(key) || []) {
        const r = computeNext(value, op.sub, op.fn);
        if (r) value = r.next;
      }
      if (value != null) setAt(ev, key, value);
    }
    return ev;
  }
  const emit = () => onChange(snapshot());

  // Só aceita a linha se não for mais velha que a que já temos.
  function applyRow(key, value, ver) {
    const cur = rows.get(key);
    if (cur && cur.ver > ver) return false;
    rows.set(key, { value, ver });
    return true;
  }
  function applyEvent(payload) {
    if (payload.eventType === "DELETE") return rows.delete(payload.old && payload.old.key);
    const n = payload.new;
    return n && n.key ? applyRow(n.key, n.value, n.ver) : false;
  }

  async function reload() {
    reloading = true; buffer = [];
    try {
      const { data, error } = await client.from(TABLE).select("key,value,ver");
      if (error) throw error;
      rows.clear();
      for (const r of data) rows.set(r.key, { value: r.value, ver: r.ver });
      // eventos que chegaram durante a leitura são mais novos que ela
      for (const p of buffer) applyEvent(p);
    } finally { reloading = false; buffer = []; }
    emit();
  }

  // Valor novo da linha inteira depois de aplicar fn no caminho sub.
  // Devolve undefined se fn desistiu.
  function computeNext(rowVal, sub, fn) {
    const cur = sub ? (rowVal == null ? null : getAt(rowVal, sub) ?? null) : rowVal;
    const nv = fn(clone(cur));
    if (nv === undefined) return undefined;
    if (!sub) return { next: nv == null ? null : clone(nv) };
    const next = rowVal && typeof rowVal === "object" ? clone(rowVal) : {};
    setAt(next, sub, clone(nv));
    return { next };
  }

  // optimistic: mostra o resultado na tela antes do banco confirmar (para
  // cliques do ADM e das cartas). Não use onde "só o primeiro vale" (pular, PIN).
  async function tx(path, fn, { optimistic = false } = {}) {
    if (!optimistic) return txNow(path, fn);
    const { key, sub } = splitPath(path);
    const op = { sub, fn };
    pending.set(key, [...(pending.get(key) || []), op]);
    emit();
    try { return await txNow(path, fn); }
    finally {
      const rest = (pending.get(key) || []).filter(o => o !== op);
      rest.length ? pending.set(key, rest) : pending.delete(key);
      emit();
    }
  }

  async function txNow(path, fn) {
    const { key, sub } = splitPath(path);
    for (let attempt = 0; attempt < MAX_TRIES; attempt++) {
      if (attempt) await sleep(40 + Math.random() * 120 * attempt);
      const { data: row, error } = await client.from(TABLE).select("value,ver").eq("key", key).maybeSingle();
      if (error) throw error;

      const r = computeNext(row ? row.value : null, sub, fn);
      if (!r) return false; // fn desistiu (ex.: alguém já pulou esse giro)
      const next = r.next;

      const token = adminToken();
      if (token) { // ADM: tudo passa pelo servidor, que confere a sessão
        const { data: nv, error: e } = await client.rpc("admin_write", { p_token: token, p_key: key, p_value: next, p_ver: row ? row.ver : 0 });
        if (e) throw new Error(e.message);
        if (nv === -1) continue; // outra pessoa gravou no meio
        if (next == null || nv === 0) rows.delete(key); else applyRow(key, next, nv);
        emit(); return true;
      }
      if (ADMIN_ONLY.test(key)) throw new Error("Só o ADM pode mudar isso.");

      if (!row) {
        if (next == null) return true;
        const { error: e } = await client.from(TABLE).insert({ key, value: next, ver: 1 });
        if (!e) { applyRow(key, next, 1); emit(); return true; }
        if (e.code === "23505") continue; // alguém criou a linha antes: tenta de novo
        throw e;
      }
      if (next == null) {
        const { data: d, error: e } = await client.from(TABLE).delete().eq("key", key).eq("ver", row.ver).select("key");
        if (e) throw e;
        if (d && d.length) { rows.delete(key); emit(); return true; }
        continue;
      }
      const ver = row.ver + 1;
      const { data: u, error: e } = await client.from(TABLE)
        .update({ value: next, ver, updated_at: new Date().toISOString() })
        .eq("key", key).eq("ver", row.ver).select("ver");
      if (e) throw e;
      if (u && u.length) { applyRow(key, next, ver); emit(); return true; }
      // outra pessoa gravou no meio: lê de novo e tenta outra vez
    }
    throw new Error(`Muitas pessoas mexendo em "${key}" ao mesmo tempo. Tente de novo.`);
  }

  return {
    async start() {
      channel = client.channel("estado-realtime")
        .on("postgres_changes", { event: "*", schema: "public", table: TABLE }, payload => {
          if (reloading) { buffer.push(payload); return; }
          applyEvent(payload); emit();
        })
        .subscribe(status => {
          const ok = status === "SUBSCRIBED";
          onStatus(ok);
          if (ok) reload().catch(e => console.error("Falha ao recarregar o estado", e));
        });
    },
    reload,
    tx,
    set: (p, v, opts) => tx(p, () => v ?? null, opts),
    update: (p, o, opts) => tx(p, cur => { const n = cur && typeof cur === "object" ? cur : {}; for (const k in o) setAt(n, k, clone(o[k])); return n; }, opts),
    async push(p, v) { const id = newId(""); await tx(`${p}/${id}`, () => v); return id; },
    stop() { if (channel) client.removeChannel(channel); },
  };
}
