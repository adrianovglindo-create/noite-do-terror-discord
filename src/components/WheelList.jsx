// Lista de quem está na roleta agora (com a chance de cada um) e de quem está
// fora e por quê. Visível para todos. Passar o mouse ou tocar num jogo destaca
// a fatia dele na roda.
import { useMemo, useState } from "react";
import { GAMELIST } from "../data/games.js";
import { filteredGames } from "../lib/pool.js";
import { passName } from "../lib/filters.js";
import { useEvento } from "../state/evento.js";
import { WHEEL_COLORS } from "./WheelSvg.jsx";
import { GameLink, PlayerTag } from "./common.jsx";

const pctText = n => (n >= 10 ? n.toFixed(1) : n.toFixed(2)).replace(".", ",") + "%";

export default function WheelList({ highlight, onHighlight, disabled }) {
  const { wheel, pool, config, cards } = useEvento();
  const [q, setQ] = useState("");
  const [pinned, setPinned] = useState(null);

  const inWheel = useMemo(() => {
    const tot = wheel.reduce((a, [, w]) => a + w, 0) || 1;
    return wheel.map(([name, w], i) => ({ name, pct: w / tot * 100, color: WHEEL_COLORS[i % WHEEL_COLORS.length], saves: cards.saves[name] || [] }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [wheel, cards]);

  const out = useMemo(() => {
    const banned = new Set(config.banned), off = new Set(config.off);
    const admBanned = GAMELIST.filter(g => banned.has(g.id)).map(g => g.name);
    const unchecked = filteredGames(config).filter(g => off.has(g.id) && !banned.has(g.id)).map(g => g.name);
    const cardBanned = pool.map(([n]) => n).filter(n => cards.bans[n]).map(n => ({ name: n, by: cards.bans[n] }));
    const sort = a => a.sort((x, y) => (x.name || x).localeCompare(y.name || y));
    return { admBanned: sort(admBanned), unchecked: sort(unchecked), cardBanned: sort(cardBanned) };
  }, [config, pool, cards]);
  const outCount = out.admBanned.length + out.unchecked.length + out.cardBanned.length;

  const term = q.trim();
  const match = name => !term || passName({ key: name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() }, term);
  const shown = inWheel.filter(x => match(x.name));

  const hover = name => { if (!disabled && !pinned) onHighlight(name); };
  const toggle = name => {
    if (disabled) return;
    const next = pinned === name ? null : name;
    setPinned(next); onHighlight(next);
  };

  return (
    <div className="wlist">
      <div className="wlistHead">
        <h4>Na roleta agora</h4>
        <span>{inWheel.length} {inWheel.length === 1 ? "jogo" : "jogos"}</span>
      </div>
      {inWheel.length > 8 && (
        <input type="search" className="wlistSearch" placeholder="Procurar na roleta…" aria-label="Procurar jogo na roleta" value={q} onChange={e => setQ(e.target.value)} />
      )}
      {!inWheel.length && <p className="facet-note">Nenhum jogo na roleta no momento.</p>}
      <ul className="wlistItems" onMouseLeave={() => !pinned && onHighlight(null)}>
        {shown.map(x => (
          <li key={x.name} className={highlight === x.name ? "on" : ""}
            onMouseEnter={() => hover(x.name)} onClick={e => { if (e.target.closest("a")) return; toggle(x.name); }}>
            <span className="wsw" style={{ background: x.color }} aria-hidden="true" />
            <GameLink className="wln" name={x.name} />
            {x.saves.map(p => <span key={p.id} className="badge s" title={`Salvo por ${p.name}`}><PlayerTag player={p} />♥</span>)}
            <span className="wpct">{pctText(x.pct)}</span>
          </li>
        ))}
        {term && !shown.length && <li className="none">Nenhum jogo com esse nome na roleta.</li>}
      </ul>
      {inWheel.length > 0 && <p className="facet-note" style={{ margin: "6px 0 0" }}>Toque num jogo para achar a fatia dele na roda.</p>}

      {outCount > 0 && (
        <details className="wout">
          <summary>Fora da roleta ({outCount})</summary>
          {out.admBanned.length > 0 && <>
            <p className="woutTitle">⛔ Banidos pelo ADM</p>
            <ul>{out.admBanned.map(n => <li key={n} className="struck">{n}</li>)}</ul>
          </>}
          {out.cardBanned.length > 0 && <>
            <p className="woutTitle">🃏 Banidos por carta</p>
            <ul>{out.cardBanned.map(x => <li key={x.name}><span className="struck">{x.name}</span>{x.by.map(p => <span key={p.id} className="badge b"><PlayerTag player={p} />{p.name}</span>)}</li>)}</ul>
          </>}
          {out.unchecked.length > 0 && <>
            <p className="woutTitle">◻️ Desmarcados pelo ADM</p>
            <ul>{out.unchecked.map(n => <li key={n}>{n}</li>)}</ul>
          </>}
        </details>
      )}
    </div>
  );
}
