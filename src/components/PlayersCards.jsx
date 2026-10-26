// "Cartas de cada um": todos veem quantas cartas cada um tem e onde cada carta
// de banir/salvar foi colocada. Cada um mexe só nas próprias; o ADM mexe em todas.
import { useEvento, canEdit, putCard, removeCard, setColor, removePlayer, resetSkips, SKIPS } from "../state/evento.js";
import { useConfirm } from "./ConfirmDialog.jsx";
import { ColorSwatches, JokerCard, PlayerTag } from "./common.jsx";

const SLOTS = [["ban", "Banir"], ["save", "Salvar (chance 2×)"]];
const report = p => Promise.resolve(p).catch(e => { console.error(e); alert(e.message); });

export default function PlayersCards() {
  const [dialog, ask] = useConfirm();
  const ev = useEvento();
  if (!ev.players.length) return (
    <div className="box">
      <h3>Cartas</h3>
      <p className="facet-note" style={{ margin: 0 }}>Ninguém entrou ainda. Crie sua conta acima para receber suas cartas: 3 de pular, 1 de banir e 1 de salvar.</p>
    </div>
  );

  const ordered = ev.players.slice().sort((a, b) => (b.id === ev.me) - (a.id === ev.me));
  const poolNames = ev.pool.map(([n]) => n).sort((a, b) => a.localeCompare(b));
  const { bans, saves } = ev.cards;
  const touched = [...new Set([...Object.keys(bans), ...Object.keys(saves)])].sort((a, b) => a.localeCompare(b));

  return (
    <div className="box">
      {dialog}
      <h3>Cartas de cada um</h3>
      {ordered.map(p => {
        const ed = canEdit(ev, p.id), left = SKIPS - (p.skipsUsed || 0);
        return (
          <div key={p.id} className="player">
            <div className="phead">
              <PlayerTag player={p} /><span className="pname">{p.name}</span>
              {p.id === ev.me && <span className="youTag">você</span>}
              {ed && <span style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
                <ColorSwatches small value={p.color} onChange={c => report(setColor(p.id, c))} />
                {ev.isAdmin && <button className="linkBtn" onClick={() => confirm(`Remover ${p.name} e as cartas dele?`) && report(removePlayer(p.id))}>remover</button>}
              </span>}
            </div>
            <div className="cards" style={{ gap: "14px 22px" }}>
              <div className="cardGroup" title={`Cartas de pular restantes: ${left}`}>
                {Array.from({ length: SKIPS }, (_, i) => <JokerCard key={i} type="skip" used={i >= left} />)}
                <span className="lbl" style={{ fontSize: ".8rem", color: "var(--muted)" }}>Pular: {left}/{SKIPS}</span>
                {ev.isAdmin && left < SKIPS && <button type="button" className="linkBtn" onClick={async () => {
                  const ok = await ask({ title: `Devolver os pulos de ${p.name}?`, message: <p>{p.name} usou {SKIPS - left} de {SKIPS} cartas de pular e vai voltar a ter {SKIPS}.</p>,
                    actions: [{ label: "Devolver", value: true }] });
                  if (ok) report(resetSkips(p.id));
                }}>devolver pulos</button>}
              </div>
              {SLOTS.map(([type, label]) => (
                <div key={type} className="cardGroup">
                  <JokerCard type={type} used={!!p[type]} />
                  <div className="cardSlot">
                    <span className="lbl">{label}</span>
                    {p[type] ? <>
                      <span className="place">{p[type]}</span>
                      {ed && <button className="linkBtn" style={{ alignSelf: "flex-start" }} onClick={() => report(removeCard(p.id, type))}>retirar carta</button>}
                    </> : ed ? (
                      <select value="" aria-label={`Colocar carta de ${type === "ban" ? "banir" : "salvar"}`} onChange={e => e.target.value && report(putCard(p.id, type, e.target.value))}>
                        <option value="">Colocar em…</option>
                        {poolNames.map(n => <option key={n}>{n}</option>)}
                      </select>
                    ) : <span className="lbl">disponível</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
      {touched.length > 0 && (
        <div className="player">
          <p className="pname" style={{ margin: "0 0 8px" }}>Jogos com cartas</p>
          {touched.map(n => (
            <div key={n} className="row" style={{ margin: "4px 0", fontSize: ".9rem" }}>
              <strong>{n}</strong>
              {(bans[n] || []).map(p => <span key={"b" + p.id} className="badge b"><PlayerTag player={p} />banido por {p.name}</span>)}
              {(saves[n] || []).map(p => <span key={"s" + p.id} className="badge s"><PlayerTag player={p} />salvo por {p.name}</span>)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
