import { useEffect, useState } from "react";
import { useEvento } from "./state/evento.js";
import Timers from "./components/Timers.jsx";
import Catalog from "./components/Catalog.jsx";
import Roulette from "./components/Roulette.jsx";

export default function App() {
  const [tab, setTab] = useState("cat");
  const { isAdmin } = useEvento();
  // a aba Tempo só existe para o ADM; se sair do modo ADM, volta para o catálogo
  useEffect(() => { if (!isAdmin && tab === "tim") setTab("cat"); }, [isAdmin, tab]);
  // quando o ADM gira, todo mundo vai para a aba Roleta e a roda fica à vista
  function showSpin() {
    setTab("rou");
    setTimeout(() => {
      const el = document.querySelector(".wheelStage"); if (!el) return;
      const r = el.getBoundingClientRect();
      if (r.top < 0 || r.bottom > window.innerHeight) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 60);
  }
  return (
    <>
      <header>
        <h1>Noite do Terror</h1>
        <p className="lede">O catálogo reúne todos os jogos co-op do evento. A roleta sorteia um jogo entre os que o ADM escolher, com chances ajustáveis e as cartas de cada participante.</p>
      </header>

      <div className="tabs" role="tablist" aria-label="Seções">
        <button className="tab" id="tab-cat" role="tab" aria-selected={tab === "cat"} aria-controls="panel-cat" onClick={() => setTab("cat")}>🔎 Catálogo</button>
        <button className="tab" id="tab-rou" role="tab" aria-selected={tab === "rou"} aria-controls="panel-rou" onClick={() => setTab("rou")}>🎡 Roleta</button>
        {isAdmin && <button className="tab" id="tab-tim" role="tab" aria-selected={tab === "tim"} aria-controls="panel-tim" onClick={() => setTab("tim")}>⏱️ Tempo</button>}
      </div>

      {/* as duas abas ficam montadas para a roleta acompanhar o giro mesmo no catálogo */}
      <section className={"panel" + (tab === "cat" ? " active" : "")} id="panel-cat" role="tabpanel" aria-labelledby="tab-cat"><Catalog /></section>
      <section className={"panel" + (tab === "rou" ? " active" : "")} id="panel-rou" role="tabpanel" aria-labelledby="tab-rou"><Roulette onSpinStart={showSpin} /></section>
      {isAdmin && <section className={"panel" + (tab === "tim" ? " active" : "")} id="panel-tim" role="tabpanel" aria-labelledby="tab-tim"><div className="timWrap"><Timers /></div></section>}

      <footer>
        <p>Jogadores, temas e tamanhos são aproximados e podem mudar com atualizações. Tamanho é o espaço em disco informado nos requisitos da Steam. Jogos com aviso amarelo só podem ser jogados depois que o desenvolvedor libera o acesso.</p>
      </footer>
    </>
  );
}
