// Área do ADM: monta o grupo de jogos da roleta (filtros, desmarcar, "Banir (ADM)"
// e porcentagens). Tudo fica na linha "config" do banco, então todos veem a
// mesma roleta e o ADM pode trocar de aparelho.
import { useEffect, useMemo, useRef, useState } from "react";
import { GAMELIST } from "../data/games.js";
import { FACETS, THEME_LABEL, facetCounts, passName, playersText, sizeText } from "../lib/filters.js";
import { filteredGames, activeGames, activeWeights, typedSum, normalizedPct } from "../lib/pool.js";
import { useEvento, updateConfig, resetAll } from "../state/evento.js";
import { FacetGroup, FilterChips, GameLink, PlayerTag } from "./common.jsx";

const fmt = n => (Math.round(n * 100) / 100).toString().replace(".", ",");
const report = p => Promise.resolve(p).catch(e => { console.error(e); alert(e.message); });
const toggleIn = (list, id, on) => on ? [...new Set([...list, id])] : list.filter(x => x !== id);

export default function AdminPanel() {
  const { config, cards } = useEvento();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(true);
  const [drafts, setDrafts] = useState({}); // porcentagens sendo digitadas (gravam ao sair do campo)
  const [show, setShow] = useState("todos"); // todos | dentro | fora
  const tableRef = useRef(null);
  useEffect(() => { if (tableRef.current) tableRef.current.scrollTop = 0; }, [show, q, config.filters]);

  const sets = useMemo(() => Object.fromEntries(FACETS.map(f => [f.key, new Set(config.filters[f.key])])), [config]);
  const counts = useMemo(() => facetCounts(GAMELIST, sets), [sets]);
  const isOut = g => config.banned.includes(g.id) || config.off.includes(g.id) || !!cards.bans[g.name];
  const allRows = useMemo(() => filteredGames(config).filter(g => passName(g, q.trim())), [config, q]);
  const outRows = allRows.filter(isOut);
  const rows = show === "dentro" ? allRows.filter(g => !isOut(g)) : show === "fora" ? outRows : allRows;
  const active = useMemo(() => activeGames(config), [config]);
  const total = useMemo(() => activeWeights(config).reduce((a, b) => a + b, 0), [config]);
  const typed = useMemo(() => typedSum(config), [config]);
  const custom = config.mode === "custom";
  const over = custom && typed > 100.0001;
  const banned = new Set(config.banned), off = new Set(config.off);

  const save = fn => report(updateConfig(fn));
  const setFilter = (key, id, on) => save(c => ({ ...c, filters: { ...c.filters, [key]: toggleIn(c.filters[key], id, on) } }));
  function commitPct(id) {
    if (!(id in drafts)) return;
    const raw = drafts[id];
    setDrafts(d => { const n = { ...d }; delete n[id]; return n; });
    save(c => {
      const pct = { ...c.pct };
      if (raw === "" || raw == null || isNaN(+raw)) delete pct[id];
      else pct[id] = Math.max(0, Math.min(100, Math.round(+raw * 100) / 100));
      return { ...c, pct };
    });
  }

  const extra = config.banned.length ? [{ label: `${config.banned.length} banido(s) pelo ADM — liberar todos`, action: () => save(c => ({ ...c, banned: [] })) }] : [];
  const extraNote = " Cartas de banir tiram o jogo e cartas de salvar dobram a chance na roleta final.";
  const hint = !custom ? `${active.length} jogo(s) no grupo, chance base igual de ${active.length ? (100 / active.length).toFixed(2).replace(".", ",") : "0"}% cada.` + extraNote
    : over ? "A soma dos valores digitados passou de 100%. Reduza algum antes de girar."
    : `${active.length} ativo(s). Jogos sem valor dividem os ${(100 - typed).toFixed(2).replace(".", ",")}% restantes.` + extraNote;

  return (
    <div>
      <p className="countHead" style={{ margin: "0 0 6px" }}>Quem entra na roleta</p>
      <p className="facet-note" style={{ margin: "0 0 16px", maxWidth: "60ch" }}>Monte o grupo com os filtros. Desmarque um jogo para tirá-lo do sorteio, ajuste a chance de cada um ou bana os jogos que já foram jogados. Tudo aqui vale para todos na hora.</p>

      <div className="searchbar" style={{ marginBottom: 14 }}>
        <label htmlFor="rq">Buscar jogo na lista</label>
        <input id="rq" type="search" placeholder="Procurar na lista abaixo…" autoComplete="off" value={q} onChange={e => setQ(e.target.value)} />
        <button className="toggleFilters" aria-expanded={open} aria-controls="rFilters" style={{ display: "block" }} onClick={() => setOpen(!open)}>{open ? "Fechar" : "Filtros"}</button>
      </div>

      {open && (
        <div id="rFilters" style={{ marginBottom: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: "4px 26px" }}>
            {FACETS.map(f => <FacetGroup key={f.key} facet={f} selected={sets[f.key]} counts={counts[f.key]} onToggle={(id, on) => setFilter(f.key, id, on)} />)}
          </div>
        </div>
      )}

      <div className="modeRow">
        <span style={{ fontWeight: 700 }}>Chances:</span>
        <label><input type="radio" name="pmode" value="equal" checked={!custom} onChange={() => save(c => ({ ...c, mode: "equal" }))} /> Iguais para todos</label>
        <label><input type="radio" name="pmode" value="custom" checked={custom} onChange={() => save(c => ({ ...c, mode: "custom" }))} /> Personalizadas</label>
      </div>

      <div className="showRow" role="group" aria-label="Mostrar na lista">
        <span style={{ fontWeight: 700 }}>Mostrar:</span>
        {[["todos", `Todos (${allRows.length})`], ["dentro", `Na roleta (${allRows.length - outRows.length})`], ["fora", `Fora da roleta (${outRows.length})`]].map(([id, label]) => (
          <button key={id} type="button" aria-pressed={show === id} onClick={() => setShow(id)}>{label}</button>
        ))}
      </div>

      <FilterChips q={q.trim()} onClearQ={() => setQ("")} filters={sets} onRemove={(k, id) => setFilter(k, id, false)} extra={extra} />

      <div className="tableWrap scrollBox" ref={tableRef}>
        {!rows.length && <div className="empty"><p>{show === "fora" ? "Nenhum jogo fora da roleta." : "Nenhum jogo com esses filtros. Tire um filtro para montar a roleta."}</p></div>}
        {rows.map(g => {
          const isBanned = banned.has(g.id), isOff = off.has(g.id), cb = cards.bans[g.name], cs = cards.saves[g.name];
          const value = g.id in drafts ? drafts[g.id] : (config.pct[g.id] ?? "");
          return (
            <div key={g.id} className={"rrow" + (isBanned ? " banned" : "") + (cb && !isBanned ? " cardban" : "") + (isOff && !isBanned ? " off" : "")}>
              <input type="checkbox" className="rtoggle" checked={!isOff && !isBanned} disabled={isBanned} aria-label="Incluir na roleta"
                onChange={e => save(c => ({ ...c, off: toggleIn(c.off, g.id, !e.target.checked) }))} />
              <GameLink className="rname" name={g.name} />
              <div className="rmeta">
                {isBanned && <span className="statusTag ban">⛔ Banido pelo ADM</span>}
                {isOff && !isBanned && <span className="statusTag off">Desmarcado</span>}
                <span>{playersText(g)}</span><span>{sizeText(g)}</span>
                <span>{g.themes.map(t => THEME_LABEL[t]).join(", ") || "Tema a confirmar"}</span>
                {(cb || []).map(p => <span key={"b" + p.id} className="badge b"><PlayerTag player={p} />banido por {p.name}</span>)}
                {(cs || []).map(p => <span key={"s" + p.id} className="badge s"><PlayerTag player={p} />salvo por {p.name}</span>)}
              </div>
              <div className="pctCell">
                <input type="number" min="0" max="100" step="0.01" placeholder="auto" aria-label="Chance (%)" value={value}
                  disabled={!custom || isOff || isBanned}
                  onChange={e => setDrafts(d => ({ ...d, [g.id]: e.target.value }))}
                  onBlur={() => commitPct(g.id)} onKeyDown={e => e.key === "Enter" && commitPct(g.id)} />
                <span className="psign">%</span>
              </div>
              <button className="banBtn" aria-pressed={isBanned} onClick={() => save(c => ({ ...c, banned: toggleIn(c.banned, g.id, !isBanned) }))}>{isBanned ? "Banido (ADM)" : "Banir (ADM)"}</button>
            </div>
          );
        })}
      </div>

      <div className={"sumBar" + (over ? " over" : "")}>
        <span className="total">{fmt(total)}%</span>
        <span className="hint">{hint}</span>
        <button type="button" onClick={() => active.length && save(c => ({ ...c, mode: "custom", pct: normalizedPct(c) }))}>Ajustar para 100%</button>
        <button type="button" onClick={() => save(c => ({ ...c, pct: {} }))}>Zerar ajustes</button>
      </div>
      <div style={{ marginTop: 22, display: "flex", flexWrap: "wrap", gap: 10 }}>
        <button type="button" className="ghostBtn" onClick={() => confirm("Devolver todas as cartas de todos e limpar o histórico?") && report(resetAll())}>Devolver todas as cartas e limpar histórico</button>
      </div>
    </div>
  );
}
