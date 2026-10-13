// Aba Roleta: roda, resultado do giro, "Alguém quer pular?", histórico,
// contas, cartas de cada um e (para o ADM) a montagem do grupo de jogos.
import { useEffect, useRef, useState } from "react";
import { useEvento, getState, spin } from "../state/evento.js";
import { sliceCenter } from "../lib/wheel.js";
import WheelSvg from "./WheelSvg.jsx";
import SpinResult from "./SpinResult.jsx";
import HistoryList from "./HistoryList.jsx";
import AccountBox from "./AccountBox.jsx";
import PlayersCards from "./PlayersCards.jsx";
import AdminPanel from "./AdminPanel.jsx";
import WheelList from "./WheelList.jsx";

const AUTO_RESPIN_MS = 1700;
const reduced = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion:reduce)").matches;

function SyncBar({ status, connected }) {
  const [color, text] = {
    "sem-config": ["#EF4444", "O Supabase não está configurado. Preencha src/config.js (veja o LEIA-ME)."],
    conectando: ["#E2BD66", "Conectando…"],
    online: connected ? ["#22C55E", "Ao vivo: cartas e roleta sincronizadas com todos."] : ["#EF4444", "Sem conexão. Tentando reconectar…"],
    erro: ["#EF4444", "Não foi possível conectar ao banco de dados. Confira a configuração do Supabase."],
  }[status];
  return <div className="syncBar"><span><span className="dotS" style={{ background: color }} />{text}</span></div>;
}

export default function Roulette() {
  const ev = useEvento();
  const s = ev.data.spin;
  // spinning/angle/frozen: animação; revealSeq: giro cujo resultado está à mostra
  const [anim, setAnim] = useState({ spinning: false, angle: 0, frozen: null, revealSeq: 0 });
  const [highlight, setHighlight] = useState(null);
  const r = useRef({ first: true, animSeq: 0, revealSeq: 0, autoSeq: 0, angle: 0, finish: null });

  function autoRespin(cur) {
    const R = r.current;
    if (!getState().isAdmin || !cur || cur.state !== "skipped" || R.revealSeq !== cur.seq || R.autoSeq === cur.seq) return;
    R.autoSeq = cur.seq;
    setTimeout(() => { const c = getState().data.spin; if (c && c.seq === cur.seq && c.state === "skipped") spin(cur.seq); }, AUTO_RESPIN_MS);
  }
  function reveal(seq) {
    r.current.revealSeq = seq;
    setAnim(a => ({ ...a, revealSeq: seq }));
    autoRespin(getState().data.spin);
  }

  useEffect(() => {
    if (!ev.loaded) return;
    const R = r.current;
    if (!s || !s.seq) { R.first = false; R.animSeq = 0; R.revealSeq = 0; setAnim(a => ({ ...a, revealSeq: 0 })); return; }
    // ao abrir a página (ou se o giro "voltou"), mostra o resultado sem animar
    if (R.first || s.seq < R.animSeq) { R.first = false; R.animSeq = s.seq; reveal(s.seq); return; }
    if (s.seq > R.animSeq) {
      R.animSeq = s.seq;
      const fw = ev.wheel; const center = sliceCenter(fw, s.winner);
      if (center == null) { reveal(s.seq); return; }
      R.angle = R.angle - (R.angle % 360) + 5 * 360 + (360 - center);
      // durante a animação a roda fica congelada no desenho do momento do giro
      setAnim(a => ({ ...a, spinning: true, frozen: fw, angle: R.angle }));
      let done = false;
      R.finish = () => { if (done) return; done = true; R.finish = null; setAnim(a => ({ ...a, spinning: false, frozen: null })); reveal(s.seq); };
      setTimeout(R.finish, reduced() ? 260 : 5200);
      return;
    }
    autoRespin(s);
  }, [ev.loaded, s && s.seq, s && s.state]); // eslint-disable-line react-hooks/exhaustive-deps

  const adminView = ev.isAdmin && ev.status === "online";
  const showResult = !!(s && s.seq && anim.revealSeq === s.seq && !anim.spinning);

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "18px 20px 60px" }}>
      <SyncBar status={ev.status} connected={ev.connected} />
      <div className="wheelWrap">
        <div className="wheelCol">
          <div className="wheelStage">
            <div className="pointer" aria-hidden="true">🔻</div>
            <WheelSvg slices={anim.frozen || ev.wheel} saves={ev.cards.saves} angle={anim.angle} highlight={anim.spinning ? null : highlight} onDone={() => r.current.finish && r.current.finish()} />
            <div className="hub" aria-hidden="true">🎃</div>
          </div>
          {adminView
            ? <button id="spinBtn" disabled={anim.spinning || !ev.wheel.length} onClick={() => spin().catch(e => alert(e.message))}>Girar a roleta</button>
            : <p className="facet-note" style={{ textAlign: "center", marginTop: 14 }}>Só o ADM gira a roleta. Fica de olho na live!</p>}
          {showResult ? <SpinResult /> : <div className="winner" />}
          {ev.status === "online" && <WheelList highlight={highlight} onHighlight={setHighlight} disabled={anim.spinning} />}
          <HistoryList />
        </div>

        <div className="rouletteControls">
          {ev.status === "online" && <>
            <AccountBox />
            <PlayersCards />
            {adminView && <AdminPanel />}
          </>}
        </div>
      </div>
    </div>
  );
}
