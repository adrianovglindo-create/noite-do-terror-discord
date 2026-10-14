// Comemoração quando o ADM confirma o jogo ("Vai ser esse! ✅"): tela cheia com
// explosões, confete, abóboras voando, tela tremendo e som. Aparece para todos.
// Sem bibliotecas: tudo é desenhado num <canvas> e o som é sintetizado na hora.
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { LS } from "../lib/storage.js";
import { GameLink } from "./common.jsx";

const DURATION_MS = 9000;
const CONFETTI = ["#FF7A1A", "#FFB547", "#A855F7", "#7CFF4F", "#F7F3EC", "#EC4899", "#FFE14D", "#3BE0C4"];
const SPOOKY = ["🎃", "👻", "💀", "🦇", "🕷️", "🍬", "🔥"];
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[(Math.random() * arr.length) | 0];

/* ---------------- som (Web Audio) ---------------- */
let actx = null;
function audio() {
  if (actx) return actx;
  const C = window.AudioContext || window.webkitAudioContext;
  if (!C) return null;
  try { actx = new C(); } catch (e) { return null; }
  return actx;
}
// navegadores só liberam som depois de um clique/toque na página
const soundListeners = new Set();
const notify = () => soundListeners.forEach(f => f());
export function unlockSound() {
  const a = audio(); if (!a) return;
  if (!a.__watched) { a.__watched = true; a.addEventListener("statechange", notify); }
  if (a.state === "suspended") a.resume().then(notify).catch(() => {});
}
if (typeof window !== "undefined") {
  window.addEventListener("pointerdown", unlockSound, { passive: true });
  window.addEventListener("keydown", unlockSound);
}

// Aviso para quem ainda não tocou na página: sem esse toque a festa fica muda.
export function SoundHint() {
  const locked = useSyncExternalStore(
    f => { soundListeners.add(f); return () => soundListeners.delete(f); },
    () => { const a = actx; return !a || a.state !== "running"; }
  );
  if (!locked || LS.get("nt-som") === "off" || !(window.AudioContext || window.webkitAudioContext)) return null;
  return <button type="button" className="soundHint" onClick={unlockSound}>🔊 Toque aqui para ativar o som da festa</button>;
}
function noiseBuffer(a, secs) {
  const b = a.createBuffer(1, a.sampleRate * secs, a.sampleRate); const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2);
  return b;
}
function boom(power = 1) {
  const a = audio(); if (!a || a.state !== "running") return;
  const t = a.currentTime, out = a.createGain(); out.gain.value = 0.55 * power; out.connect(a.destination);
  const n = a.createBufferSource(); n.buffer = noiseBuffer(a, 1.4);
  const f = a.createBiquadFilter(); f.type = "lowpass"; f.frequency.setValueAtTime(1800, t); f.frequency.exponentialRampToValueAtTime(70, t + 1.2);
  const g = a.createGain(); g.gain.setValueAtTime(1, t); g.gain.exponentialRampToValueAtTime(0.001, t + 1.3);
  n.connect(f).connect(g).connect(out); n.start(t);
  const o = a.createOscillator(); o.type = "sine"; o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(28, t + 0.7);
  const og = a.createGain(); og.gain.setValueAtTime(0.9, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
  o.connect(og).connect(out); o.start(t); o.stop(t + 0.85);
}
function pop() {
  const a = audio(); if (!a || a.state !== "running") return;
  const t = a.currentTime, n = a.createBufferSource(); n.buffer = noiseBuffer(a, 0.12);
  const f = a.createBiquadFilter(); f.type = "highpass"; f.frequency.value = 2200;
  const g = a.createGain(); g.gain.value = 0.25; n.connect(f).connect(g).connect(a.destination); n.start(t);
}
function fanfare() {
  const a = audio(); if (!a || a.state !== "running") return;
  const notes = [392, 523.25, 659.25, 783.99, 1046.5]; // sol, dó, mi, sol, dó
  notes.forEach((hz, i) => {
    const t = a.currentTime + 0.12 + i * 0.13, len = i === notes.length - 1 ? 0.9 : 0.18;
    const o = a.createOscillator(); o.type = "sawtooth"; o.frequency.value = hz;
    const f = a.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 2600;
    const g = a.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.13, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(f).connect(g).connect(a.destination); o.start(t); o.stop(t + len + 0.05);
  });
}

/* ---------------- partículas ---------------- */
function makeEngine(canvas, shakeEl, { reduced, sound }) {
  const ctx = canvas.getContext("2d");
  let W = 0, H = 0, dpr = 1;
  const resize = () => {
    dpr = Math.min(2, window.devicePixelRatio || 1); W = window.innerWidth; H = window.innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize(); window.addEventListener("resize", resize);

  const parts = [], rings = [], flashes = [];
  let shake = 0;
  const MAX = reduced ? 220 : 1100;
  const add = p => { if (parts.length < MAX) parts.push(p); };

  const confetti = (x, y, vx, vy) => add({ k: "c", x, y, vx, vy, w: rnd(6, 12), h: rnd(4, 8), rot: rnd(0, 6.28), vr: rnd(-0.3, 0.3), flip: rnd(0, 6.28), vf: rnd(0.1, 0.3), color: pick(CONFETTI), life: 1, decay: 0 });
  const spark = (x, y, vx, vy, color) => add({ k: "s", x, y, px: x, py: y, vx, vy, color, life: 1, decay: rnd(0.012, 0.025) });
  const emoji = (x, y, vx, vy) => add({ k: "e", x, y, vx, vy, ch: pick(SPOOKY), size: rnd(26, 48), rot: rnd(-0.5, 0.5), vr: rnd(-0.12, 0.12), life: 1, decay: 0.006 });
  const smoke = (x, y) => add({ k: "m", x, y, vx: rnd(-1, 1), vy: rnd(-1.2, -0.2), r: rnd(18, 40), life: 1, decay: rnd(0.008, 0.016) });

  function bomb(x, y, power = 1) {
    if (sound()) boom(power);
    flashes.push({ x, y, r: 260 * power, life: 1 });
    rings.push({ x, y, r: 10, max: 320 * power, life: 1, color: pick(["#FFB547", "#A855F7", "#7CFF4F"]) });
    rings.push({ x, y, r: 4, max: 200 * power, life: 1, color: "#FFFFFF" });
    if (!reduced) shake = Math.min(28, shake + 18 * power);
    const n = reduced ? 30 : 120 * power;
    for (let i = 0; i < n; i++) { const a = rnd(0, 6.28), s = rnd(4, 17) * power; spark(x, y, Math.cos(a) * s, Math.sin(a) * s, pick(["#FFF6C9", "#FFB547", "#FF7A1A", "#FFE14D"])); }
    for (let i = 0; i < n * 0.9; i++) { const a = rnd(0, 6.28), s = rnd(3, 13) * power; confetti(x, y, Math.cos(a) * s, Math.sin(a) * s - 3); }
    for (let i = 0; i < (reduced ? 2 : 7 * power); i++) { const a = rnd(0, 6.28), s = rnd(4, 11); emoji(x, y, Math.cos(a) * s, Math.sin(a) * s - 4); }
    for (let i = 0; i < (reduced ? 0 : 10); i++) smoke(x + rnd(-30, 30), y + rnd(-30, 30));
  }
  function cannon(fromLeft) {
    if (sound()) pop();
    const x = fromLeft ? -10 : W + 10, y = H + 10;
    for (let i = 0; i < (reduced ? 40 : 170); i++) {
      const a = fromLeft ? -Math.PI / 2 + rnd(0.25, 0.75) : -Math.PI / 2 - rnd(0.25, 0.75);
      const s = rnd(14, 27); confetti(x, y, Math.cos(a) * s, Math.sin(a) * s);
    }
  }
  function rain(count) { for (let i = 0; i < count; i++) confetti(rnd(0, W), rnd(-60, -10), rnd(-1, 1), rnd(1, 4)); }

  let last = performance.now(), raf = 0, stopped = false;
  function frame(now) {
    if (stopped) return;
    const dt = Math.min(2.2, (now - last) / 16.67); last = now;
    ctx.clearRect(0, 0, W, H);

    // tremor: só a camada da festa treme (ela tem overflow escondido, então nada sai da tela)
    if (shakeEl) {
      if (shake > 0.4) { shakeEl.style.transform = `translate(${rnd(-shake, shake).toFixed(1)}px,${rnd(-shake, shake).toFixed(1)}px) rotate(${rnd(-shake, shake) * 0.03}deg)`; shake *= Math.pow(0.86, dt); }
      else if (shakeEl.style.transform) { shakeEl.style.transform = ""; shake = 0; }
    }

    ctx.globalCompositeOperation = "lighter";
    for (let i = flashes.length - 1; i >= 0; i--) {
      const f = flashes[i]; f.life -= 0.05 * dt; if (f.life <= 0) { flashes.splice(i, 1); continue; }
      const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r);
      g.addColorStop(0, `rgba(255,250,220,${0.95 * f.life})`); g.addColorStop(0.35, `rgba(255,150,40,${0.6 * f.life})`); g.addColorStop(1, "rgba(120,20,160,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 6.29); ctx.fill();
    }
    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i]; r.r += (r.max - r.r) * 0.09 * dt; r.life -= 0.022 * dt; if (r.life <= 0) { rings.splice(i, 1); continue; }
      ctx.strokeStyle = r.color; ctx.globalAlpha = r.life; ctx.lineWidth = 6 * r.life + 1; ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, 6.29); ctx.stroke();
    }
    ctx.globalAlpha = 1;

    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life -= p.decay * dt;
      if (p.life <= 0 || p.y > H + 80 || p.x < -120 || p.x > W + 120) { parts.splice(i, 1); continue; }
      if (p.k === "c") {
        p.vx *= Math.pow(0.985, dt); p.vy = p.vy * Math.pow(0.985, dt) + 0.32 * dt; p.vx += Math.sin(p.flip) * 0.05;
        p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt; p.flip += p.vf * dt;
        ctx.globalCompositeOperation = "source-over";
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(1, Math.cos(p.flip));
        ctx.fillStyle = p.color; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore();
      } else if (p.k === "s") {
        p.px = p.x; p.py = p.y; p.vx *= Math.pow(0.96, dt); p.vy = p.vy * Math.pow(0.96, dt) + 0.12 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        ctx.globalCompositeOperation = "lighter"; ctx.strokeStyle = p.color; ctx.globalAlpha = p.life; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(p.px - p.vx * 1.5, p.py - p.vy * 1.5); ctx.lineTo(p.x, p.y); ctx.stroke(); ctx.globalAlpha = 1;
      } else if (p.k === "e") {
        p.vx *= Math.pow(0.99, dt); p.vy = p.vy * Math.pow(0.99, dt) + 0.22 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
        ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = Math.min(1, p.life * 2);
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.font = `${p.size}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(p.ch, 0, 0); ctx.restore(); ctx.globalAlpha = 1;
      } else if (p.k === "m") {
        p.x += p.vx * dt; p.y += p.vy * dt; p.r += 0.9 * dt;
        ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = p.life * 0.35; ctx.fillStyle = "#3a2f40";
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.29); ctx.fill(); ctx.globalAlpha = 1;
      }
    }
    ctx.globalCompositeOperation = "source-over";
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  // roteiro da festa
  const timers = [];
  const at = (ms, fn) => timers.push(setTimeout(() => !stopped && fn(), ms));
  at(0, () => { bomb(W / 2, H * 0.45, 1.6); if (sound()) fanfare(); });
  at(150, () => { cannon(true); cannon(false); });
  if (!reduced) {
    [600, 1000, 1400, 1850, 2300, 2800, 3400, 4100].forEach((ms, i) =>
      at(ms, () => bomb(rnd(W * 0.12, W * 0.88), rnd(H * 0.12, H * 0.62), rnd(0.7, 1.15) + (i === 7 ? 0.4 : 0))));
    at(2000, () => { cannon(true); cannon(false); });
    at(3800, () => { cannon(true); cannon(false); });
    for (let i = 0; i < 18; i++) at(i * 260, () => rain(14));
  } else {
    at(1200, () => rain(40));
  }

  return () => {
    stopped = true; cancelAnimationFrame(raf); timers.forEach(clearTimeout);
    window.removeEventListener("resize", resize);
    if (shakeEl) shakeEl.style.transform = "";
  };
}

export default function Celebration({ game, onClose }) {
  const canvasRef = useRef(null);
  const shakeRef = useRef(null);
  const [muted, setMuted] = useState(() => LS.get("nt-som") === "off");
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  useEffect(() => {
    const reduced = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion:reduce)").matches;
    const a = audio(); if (a && a.state === "suspended") a.resume().catch(() => {});
    const stop = makeEngine(canvasRef.current, shakeRef.current, { reduced, sound: () => !mutedRef.current });
    const t = setTimeout(onClose, DURATION_MS);
    const esc = e => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => { stop(); clearTimeout(t); window.removeEventListener("keydown", esc); };
  }, [game]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleSound = e => { e.stopPropagation(); const m = !muted; setMuted(m); LS.set("nt-som", m ? "off" : "on"); };

  return createPortal(
    <div className="party" role="dialog" aria-modal="true" aria-label={`Jogo escolhido: ${game}`} onClick={onClose}>
      <div className="partyShake" ref={shakeRef}>
        <div className="partyFlash" aria-hidden="true" />
        <canvas ref={canvasRef} className="partyCanvas" aria-hidden="true" />
        <div className="partyCard" onClick={e => e.stopPropagation()}>
          <p className="partyKicker">🎃 VAI SER ESSE! 🎃</p>
          <p className="partyName"><GameLink name={game} /></p>
          <p className="partySub">Bora jogar!</p>
          <button type="button" className="partyClose" onClick={onClose}>Fechar</button>
        </div>
      </div>
      <button type="button" className="partySound" onClick={toggleSound} aria-pressed={!muted} title={muted ? "Ligar som" : "Desligar som"}>{muted ? "🔇" : "🔊"}</button>
    </div>,
    document.body
  );
}
