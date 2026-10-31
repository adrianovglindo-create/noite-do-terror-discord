// Aba "Tempo": um cronômetro por participante para a disputa de horas.
// Todos veem os tempos e o ranking; só o ADM inicia, pausa, soma, tira e zera.
// Os tempos ficam no banco (linha "timers"), então recarregar a página não perde nada.
import { useEffect, useState } from "react";
import { useEvento, timerNow, timerStart, timerStop, timerAdjust, timerReset, timerStopAll } from "../state/evento.js";
import { PlayerTag, GameLink } from "./common.jsx";
import { useConfirm } from "./ConfirmDialog.jsx";

const report = p => Promise.resolve(p).catch(e => { console.error(e); alert(e.message); });
const pad = n => String(n).padStart(2, "0");
export function fmt(ms) {
  const s = Math.floor(ms / 1000);
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`;
}
const MEDAL = ["🥇", "🥈", "🥉"];

function AdjustBox({ pid }) {
  const [min, setMin] = useState("");
  const apply = sign => { const v = parseFloat(String(min).replace(",", ".")); if (v > 0) { report(timerAdjust(pid, sign * v * 60000)); setMin(""); } };
  return (
    <span className="tAdj">
      <input type="number" min="0" step="1" inputMode="numeric" placeholder="min" aria-label="Minutos para ajustar" value={min} onChange={e => setMin(e.target.value)} />
      <button type="button" className="linkBtn" onClick={() => apply(1)} title="Somar minutos">+ somar</button>
      <button type="button" className="linkBtn" onClick={() => apply(-1)} title="Tirar minutos">− tirar</button>
    </span>
  );
}

export default function Timers() {
  const ev = useEvento();
  const [dialog, ask] = useConfirm();
  const [now, setNow] = useState(Date.now());
  const timers = ev.data.timers || {};
  const running = ev.players.filter(p => timers[p.id] && timers[p.id].since);

  useEffect(() => { // atualiza o relógio a cada segundo enquanto alguém está contando
    if (!running.length) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [running.length]);

  const totals = ev.players.map(p => ({ p, ms: timerNow(timers[p.id], now) }));
  const rank = [...totals].filter(x => x.ms > 0).sort((a, b) => b.ms - a.ms);
  const pos = id => { const i = rank.findIndex(x => x.p.id === id); return i < 0 ? null : i; };
  const adm = ev.isAdmin;
  const s = ev.data.spin;
  const current = s && s.state === "chosen" ? s.winner : null;

  async function askReset(p) {
    const ok = await ask({ title: `Zerar o tempo de ${p.name}?`, message: <p>{p.name} está com <strong>{fmt(timerNow(timers[p.id], Date.now()))}</strong>. O tempo volta para 00:00:00 e não dá para desfazer.</p>,
      actions: [{ label: "Zerar", value: true, danger: true }] });
    if (ok) report(timerReset(p.id));
  }
  async function askStopAll() {
    const ok = await ask({ title: "Pausar todos os cronômetros?", message: <p>{running.length} {running.length === 1 ? "cronômetro está" : "cronômetros estão"} contando. O tempo de cada um fica salvo.</p>,
      actions: [{ label: "Pausar todos", value: true }] });
    if (ok) report(timerStopAll());
  }

  return (
    <div className="timers">
      <div className="tTop">
        <div>
          <p className="countHead" style={{ margin: 0 }}>Tempo de jogo</p>
          <p className="facet-note" style={{ margin: "4px 0 0" }}>{adm
            ? "Só você (ADM) controla os cronômetros; os participantes só acompanham. Os tempos ficam salvos no banco, mesmo se a página recarregar."
            : "Quem acumular mais horas jogadas leva R$100. Só o ADM liga e pausa os cronômetros; aqui você acompanha ao vivo."}</p>
        </div>
        {adm && running.length > 0 && <button type="button" className="ghostBtn" onClick={askStopAll}>⏸ Pausar todos</button>}
      </div>

      <div className="tStatus">
        <span><strong>{running.length}</strong> {running.length === 1 ? "pessoa jogando" : "pessoas jogando"} agora</span>
        <span>Jogo escolhido na roleta: {current ? <strong><GameLink name={current} /></strong> : <em>nenhum confirmado</em>}</span>
      </div>
      {running.length > 0 && running.length < 3 && (
        <p className="tWarn">⚠ Menos de 3 pessoas contando. Pela regra 1, o tempo só vale com 3 ou mais pessoas jogando juntas.</p>
      )}

      {!ev.players.length && <p className="facet-note">Ninguém criou conta ainda. Os cronômetros aparecem aqui quando os participantes entrarem.</p>}
      <ul className="tList">
        {ev.players.map(p => {
          const t = timers[p.id], on = !!(t && t.since), ms = timerNow(t, now), i = pos(p.id);
          return (
            <li key={p.id} className={(on ? "on" : "") + (adm ? "" : " view")}>
              <span className="tWho"><PlayerTag player={p} /><strong>{p.name}</strong>{p.id === ev.me && <span className="youTag">você</span>}{i != null && <span className="tRank" title={`${i + 1}º lugar`}>{MEDAL[i] || `${i + 1}º`}</span>}</span>
              <span className="tClock" aria-live="off">{fmt(ms)}</span>
              {adm
                ? <button type="button" className={on ? "btn danger" : "btn"} onClick={() => report(on ? timerStop(p.id) : timerStart(p.id))}>{on ? "⏸ Pausar" : "▶ Iniciar"}</button>
                : <span className={"tState" + (on ? " on" : "")}>{on ? "● contando" : "pausado"}</span>}
              {adm && <span className="tMore">
                <AdjustBox pid={p.id} />
                {ms > 0 && <button type="button" className="linkBtn danger" onClick={() => askReset(p)}>zerar</button>}
              </span>}
            </li>
          );
        })}
      </ul>

      {rank.length > 0 && (
        <div className="tRanking">
          <h4>Ranking</h4>
          <ol>{rank.map((x, k) => <li key={x.p.id}><span>{MEDAL[k] || `${k + 1}º`}</span><PlayerTag player={x.p} showName /><span className="tClock sm">{fmt(x.ms)}</span></li>)}</ol>
        </div>
      )}
      {dialog}
    </div>
  );
}
