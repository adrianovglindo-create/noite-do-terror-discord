// Janela de confirmação no visual do site. Uso:
//   const [dialog, ask] = useConfirm();
//   const escolha = await ask({ title, message, actions: [{ label, value, danger }] });
//   ... e renderizar {dialog} no componente. Cancelar (botão, Esc ou clique fora) devolve null.
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export function useConfirm() {
  const [req, setReq] = useState(null);
  const ask = useCallback(opts => new Promise(resolve => setReq({ ...opts, resolve })), []);
  const close = v => { if (req) req.resolve(v); setReq(null); };
  const dialog = req ? <ConfirmDialog {...req} onClose={close} /> : null;
  return [dialog, ask];
}

function ConfirmDialog({ title, message, actions = [{ label: "Confirmar", value: true, danger: true }], onClose }) {
  const first = useRef(null);
  useEffect(() => {
    first.current && first.current.focus();
    const esc = e => e.key === "Escape" && onClose(null);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return createPortal(
    <div className="cdlgBack" onClick={() => onClose(null)}>
      <div className="cdlg" role="alertdialog" aria-modal="true" aria-labelledby="cdlgT" onClick={e => e.stopPropagation()}>
        <h3 id="cdlgT">{title}</h3>
        {message && <div className="cdlgMsg">{message}</div>}
        <div className="cdlgBtns">
          <button type="button" className="ghostBtn" ref={first} onClick={() => onClose(null)}>Cancelar</button>
          {actions.map(a => (
            <button key={a.label} type="button" className={a.danger ? "btn danger" : "btn"} onClick={() => onClose(a.value)}>{a.label}</button>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}
