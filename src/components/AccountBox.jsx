// Contas: cada participante cria a sua (nome, cor e PIN de 4 números) e entra
// de novo em outro aparelho com o PIN. Embaixo fica a entrada do ADM (o PIN do
// ADM é conferida no servidor; ela é definida no SQL Editor do Supabase).
import { useState } from "react";
import { useEvento, createPlayer, login, logout, adminLogin, adminLogout } from "../state/evento.js";
import { ColorSwatches, PlayerTag } from "./common.jsx";

// Roda a ação e mostra a mensagem de erro (se houver). Devolve true se deu certo.
async function run(fn, setMsg) {
  try { const err = await fn(); setMsg(err || ""); return !err; }
  catch (e) { console.error(e); setMsg("Não deu certo: " + e.message); return false; }
}

export default function AccountBox() {
  const ev = useEvento();
  const [tab, setTab] = useState("entrar");
  const [name, setName] = useState(""), [pin, setPin] = useState(""), [color, setColor] = useState("azul"), [msg, setMsg] = useState("");
  const [loginId, setLoginId] = useState(""), [loginPin, setLoginPin] = useState("");
  const [admPin, setAdmPin] = useState(""), [admMsg, setAdmMsg] = useState("");

  const me = ev.players.find(p => p.id === ev.me);
  const selected = loginId || (ev.players[0] && ev.players[0].id) || "";

  const add = async () => { if (await run(() => createPlayer(name, pin.trim(), color), setMsg)) { setName(""); setPin(""); } };
  const enter = async () => { if (await run(() => login(selected, loginPin), setMsg)) setLoginPin(""); };
  const enterAdm = async () => { if (await run(() => adminLogin(admPin.trim()), setAdmMsg)) setAdmPin(""); };
  const onEnter = fn => e => { if (e.key === "Enter") fn(); };
  const switchTab = t => { setTab(t); setMsg(""); };

  return <>
    {me ? (
      <div className="box">
        <div className="row" style={{ margin: 0, justifyContent: "space-between" }}>
          <span>Você é <PlayerTag player={me} /><strong>{me.name}</strong></span>
          <button className="ghostBtn" onClick={logout}>Sair</button>
        </div>
      </div>
    ) : (
      <div className="box">
        <h3>Sua conta</h3>
        <div className="tabsMini">
          <button aria-pressed={tab === "entrar"} onClick={() => switchTab("entrar")}>Entrar</button>
          <button aria-pressed={tab === "criar"} onClick={() => switchTab("criar")}>Criar conta</button>
        </div>
        {tab === "entrar" ? (
          ev.players.length ? (
            <div className="row">
              <select value={selected} aria-label="Seu nome" onChange={e => setLoginId(e.target.value)}>
                {ev.players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <input type="password" inputMode="numeric" maxLength={4} placeholder="PIN" aria-label="PIN" value={loginPin} onChange={e => setLoginPin(e.target.value)} onKeyUp={onEnter(enter)} />
              <button className="btn" onClick={enter}>Entrar</button>
            </div>
          ) : <p className="facet-note">Ninguém criou conta ainda. Use a aba "Criar conta".</p>
        ) : <>
          <div className="row">
            <input type="text" maxLength={20} placeholder="Seu nome" aria-label="Seu nome" style={{ flex: 1, minWidth: 140 }} value={name} onChange={e => setName(e.target.value)} />
            <input type="password" inputMode="numeric" maxLength={4} placeholder="PIN" aria-label="PIN de 4 números" value={pin} onChange={e => setPin(e.target.value)} onKeyUp={onEnter(add)} />
          </div>
          <p className="facet-note" style={{ margin: "0 0 6px" }}>Escolha sua cor:</p>
          <ColorSwatches value={color} onChange={setColor} />
          <div className="row">
            <button className="btn" onClick={add}>Criar conta</button>
            <span className="facet-note">O PIN tem 4 números. Guarde, ele é pedido para entrar de novo.</span>
          </div>
        </>}
        <p className="msg">{msg}</p>
      </div>
    )}

    {ev.isAdmin ? (
      <p className="facet-note" style={{ margin: "-8px 0 18px" }}>🛠 Você está no modo ADM. <button className="linkBtn" onClick={adminLogout}>sair do modo ADM</button></p>
    ) : (
      <details style={{ margin: "-8px 0 18px" }}>
        <summary className="facet-note" style={{ cursor: "pointer" }}>Sou o ADM</summary>
        <div className="row">
          <input type="password" autoComplete="current-password" placeholder="Senha do ADM" aria-label="Senha do ADM" style={{ width: 190 }} value={admPin} onChange={e => setAdmPin(e.target.value)} onKeyUp={onEnter(enterAdm)} />
          <button className="ghostBtn" onClick={enterAdm}>Entrar</button>
        </div>
        <p className="msg">{admMsg}</p>
      </details>
    )}
  </>;
}
