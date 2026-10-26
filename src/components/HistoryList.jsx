// Histórico dos últimos giros: jogos pulados (e por quem) e escolhidos.
// O ADM pode devolver uma carta, excluir um registro, limpar tudo e devolver os pulos de todos.
import { useEvento, undoSkip, deleteHistoryItem, clearHistory, resetSkips } from "../state/evento.js";
import { PlayerTag } from "./common.jsx";
import { useConfirm } from "./ConfirmDialog.jsx";

const time = ts => new Date(ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
const report = p => Promise.resolve(p).catch(e => { console.error(e); alert(e.message); });
const SHOW = 20;

export default function HistoryList() {
  const ev = useEvento();
  const [dialog, ask] = useConfirm();
  const all = Object.entries(ev.data.history || {}).map(([id, h]) => ({ id, ...h })).sort((a, b) => b.ts - a.ts);
  const items = all.slice(0, SHOW);
  const usedSkips = ev.players.filter(p => (p.skipsUsed || 0) > 0);
  if (!items.length && !(ev.isAdmin && usedSkips.length)) return null;
  const who = h => ev.players.find(p => p.id === h.by);

  async function askClear() {
    const ok = await ask({
      title: "Limpar o histórico da roleta?",
      message: <>
        <p>Isso apaga os <strong>{all.length}</strong> registros do histórico para todo mundo. Não dá para desfazer.</p>
        <p>As cartas de pular já usadas continuam gastas. Para devolver, use "Devolver pulos de todos".</p>
      </>,
      actions: [{ label: "Sim, limpar histórico", value: true, danger: true }],
    });
    if (ok) report(clearHistory());
  }
  async function askDelete(h) {
    const p = who(h), pendingCard = h.type === "pulado" && !h.undone && p;
    const choice = await ask({
      title: "Excluir este registro?",
      message: <>
        <p><strong>{h.game}</strong>, {h.type === "pulado" ? <>pulado por {p ? p.name : "alguém"}</> : "escolhido"}, às {time(h.ts)}.</p>
        {pendingCard && <p>A carta de pular de {p.name} foi gasta nesse giro. Quer devolver a carta junto?</p>}
      </>,
      actions: pendingCard
        ? [{ label: "Só excluir", value: "only", danger: true }, { label: "Excluir e devolver a carta", value: "give", danger: true }]
        : [{ label: "Excluir", value: "only", danger: true }],
    });
    if (choice) report(deleteHistoryItem(h.id, choice === "give"));
  }
  async function askResetSkips() {
    const ok = await ask({
      title: "Devolver os pulos de todos?",
      message: <>
        <p>Todo mundo volta a ter {3} cartas de pular. Hoje estão com cartas gastas:</p>
        <ul className="cdlgList">{usedSkips.map(p => <li key={p.id}><PlayerTag player={p} showName /> usou {p.skipsUsed}</li>)}</ul>
        <p>As cartas de banir e salvar não mudam.</p>
      </>,
      actions: [{ label: "Sim, devolver os pulos", value: true, danger: true }],
    });
    if (ok) report(resetSkips());
  }

  return (
    <div className="hist">
      <div className="histHead">
        <h4>Histórico</h4>
        {ev.isAdmin && <span className="histAdm">
          {usedSkips.length > 0 && <button type="button" className="linkBtn" onClick={askResetSkips}>devolver pulos de todos</button>}
          {all.length > 0 && <button type="button" className="linkBtn danger" onClick={askClear}>🗑 limpar histórico</button>}
        </span>}
      </div>
      {items.length > 0 && <ul>
        {items.map(h => (
          <li key={h.id} className={h.undone ? "undone" : ""}>
            <time>{time(h.ts)}</time>
            <strong>{h.game}</strong>
            {h.type === "pulado"
              ? <span>pulado por <PlayerTag player={who(h)} showName />{h.undone && " (carta devolvida)"}</span>
              : <span>escolhido ✅</span>}
            {ev.isAdmin && <span className="histItemAdm">
              {h.type === "pulado" && !h.undone && <button className="linkBtn" onClick={() => report(undoSkip(h.id))}>devolver carta</button>}
              <button className="linkBtn danger" aria-label={`Excluir registro de ${h.game}`} title="Excluir registro" onClick={() => askDelete(h)}>excluir</button>
            </span>}
          </li>
        ))}
      </ul>}
      {ev.isAdmin && all.length > SHOW && <p className="facet-note">Mostrando os {SHOW} mais recentes de {all.length}.</p>}
      {dialog}
    </div>
  );
}
