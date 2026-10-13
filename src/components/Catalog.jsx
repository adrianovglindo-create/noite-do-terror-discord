// Aba Catálogo: busca, filtros facetados, ordenação e lista de jogos.
import { useEffect, useMemo, useRef, useState } from "react";
import { GAMELIST } from "../data/games.js";
import { FACETS, THEME_LABEL, STATUS_LABEL, passSearch, passFacets, facetCounts, playersText, sizeText } from "../lib/filters.js";
import { FacetGroup, FilterChips, GameLink } from "./common.jsx";

const EMPTY = { players: new Set(), themes: new Set(), sizes: new Set() };
const STATUS_ORDER = { G: 0, P: 1, V: 2 };

export default function Catalog() {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("az");
  const [filters, setFilters] = useState(EMPTY);
  const [open, setOpen] = useState(false);

  const base = useMemo(() => GAMELIST.filter(g => passSearch(g, q.trim())), [q]);
  const counts = useMemo(() => facetCounts(base, filters), [base, filters]);
  const results = useMemo(() => base.filter(g => passFacets(g, filters)).sort((a, b) => {
    if (sort === "max") return ((b.max ?? -1) - (a.max ?? -1)) || a.key.localeCompare(b.key);
    if (sort === "size") return ((a.size ?? 1e9) - (b.size ?? 1e9)) || a.key.localeCompare(b.key);
    if (sort === "status") return (STATUS_ORDER[a.status] - STATUS_ORDER[b.status]) || a.key.localeCompare(b.key);
    return a.key.localeCompare(b.key);
  }), [base, filters, sort]);

  // ao mudar busca, filtro ou ordem, a lista volta para o topo
  const listRef = useRef(null);
  useEffect(() => { if (listRef.current) listRef.current.scrollTop = 0; }, [q, filters, sort]);

  const toggle = (key, id, on) => setFilters(f => { const s = new Set(f[key]); on ? s.add(id) : s.delete(id); return { ...f, [key]: s }; });
  const clearAll = () => { setQ(""); setFilters(EMPTY); };

  return (
    <div className="layout">
      <aside id="filters" className={open ? "open" : ""} aria-label="Filtros do catálogo">
        <div className="searchbar" style={{ marginBottom: 24 }}>
          <label htmlFor="q">Buscar jogo ou quantidade de jogadores</label>
          <input id="q" type="search" placeholder="Ex.: Phasmophobia ou 6" autoComplete="off" value={q} onChange={e => setQ(e.target.value)} />
        </div>
        {FACETS.map(f => <FacetGroup key={f.key} facet={f} selected={filters[f.key]} counts={counts[f.key]} onToggle={(id, on) => toggle(f.key, id, on)} />)}
        <p className="facet-note" style={{ marginBottom: 22 }}>Dentro de cada grupo, marcar mais de uma opção mostra jogos que atendem a qualquer uma delas.</p>
      </aside>
      <main>
        <div className="resultsHead">
          <button className="toggleFilters" aria-expanded={open} aria-controls="filters" onClick={() => setOpen(!open)}>{open ? "Fechar" : "Filtros"}</button>
          <p className="countHead" aria-live="polite">{results.length} {results.length === 1 ? "jogo" : "jogos"}</p>
          <div className="sort"><label htmlFor="sort">Ordenar</label>
            <select id="sort" value={sort} onChange={e => setSort(e.target.value)}>
              <option value="az">Nome (A–Z)</option>
              <option value="max">Mais jogadores</option>
              <option value="size">Menor tamanho</option>
              <option value="status">Grátis primeiro</option>
            </select>
          </div>
        </div>
        <FilterChips q={q.trim()} onClearQ={() => setQ("")} filters={filters}
          onRemove={(k, id) => toggle(k, id, false)} onClearAll={clearAll} />
        <ul className="list scrollBox" ref={listRef}>
          {!results.length && (
            <li className="empty">
              <p>Nenhum jogo combina com essa busca e esses filtros. Tente tirar um filtro ou buscar só pelo nome.</p>
              <button type="button" onClick={clearAll}>Limpar filtros</button>
            </li>
          )}
          {results.map(g => (
            <li key={g.id} className="game">
              <div>
                <p className="gname"><GameLink name={g.name} /></p>
                <div className="meta">
                  <span className={"players" + (g.min == null ? " unknown" : "")}>{playersText(g)}</span>
                  <span className={"size" + (g.size == null ? " unknown" : "")}>{sizeText(g)}</span>
                  <span className="tags">
                    {g.themes.map(t => <span key={t} className={"tag " + t}>{THEME_LABEL[t]}</span>)}
                    {!g.themes.length && <span className="tag Q">Tema a confirmar</span>}
                  </span>
                </div>
                {g.access && <p className="access"><strong>⚠ Precisa solicitar acesso antecipado para jogar.</strong> {g.access}</p>}
              </div>
              <span className={"status " + g.status}>{STATUS_LABEL[g.status]}</span>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
