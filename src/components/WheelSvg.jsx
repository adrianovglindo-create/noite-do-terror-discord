// Desenho da roleta. Fatias salvas por carta têm contorno dourado e um ♥.
import { useMemo } from "react";

export const WHEEL_COLORS = ["#C85F1C", "#2E8574", "#6B4FB0", "#A8322B", "#B38200", "#3C6E71", "#9B4722", "#527a4d"];

export default function WheelSvg({ slices, saves, angle, onDone, highlight }) {
  const shapes = useMemo(() => {
    const tot = slices.reduce((a, [, w]) => a + w, 0);
    if (!slices.length || tot <= 0) return [];
    let ang = -90;
    return slices.map(([name, w], i) => {
      const sweep = w / tot * 360, a0 = ang * Math.PI / 180, a1 = (ang + sweep) * Math.PI / 180;
      const x0 = 100 + 98 * Math.cos(a0), y0 = 100 + 98 * Math.sin(a0), x1 = 100 + 98 * Math.cos(a1), y1 = 100 + 98 * Math.sin(a1);
      const saved = !!saves[name];
      const s = {
        name, saved, fill: WHEEL_COLORS[i % WHEEL_COLORS.length], label: null,
        d: slices.length === 1 ? "M100 2 A 98 98 0 1 1 99.9 2 Z" : `M100 100 L ${x0.toFixed(2)} ${y0.toFixed(2)} A 98 98 0 ${sweep > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z`,
      };
      if (w / tot > 0.028) {
        const mid = (ang + sweep / 2) * Math.PI / 180, tx = (100 + 64 * Math.cos(mid)).toFixed(1), ty = (100 + 64 * Math.sin(mid)).toFixed(1);
        s.label = { x: tx, y: ty, rot: `rotate(${ang + sweep / 2 + (Math.cos(mid) < 0 ? 180 : 0)} ${tx} ${ty})`, text: (saved ? "♥ " : "") + (name.length > 19 ? name.slice(0, 18) + "…" : name) };
      }
      ang += sweep;
      return s;
    });
  }, [slices, saves]);

  return (
    <svg viewBox="0 0 200 200" role="img" aria-label="Roleta de jogos" style={{ transform: `rotate(${angle}deg)` }} onTransitionEnd={onDone}>
      {shapes.length ? shapes.map(s => (
        <g key={s.name} opacity={highlight && highlight !== s.name ? 0.28 : 1}>
          <path d={s.d} fill={s.fill} stroke={highlight === s.name ? "#FFFFFF" : s.saved ? "#FFD34D" : "rgba(0,0,0,.25)"} strokeWidth={highlight === s.name ? 2.2 : s.saved ? 1.2 : 0.5} />
          {s.label && <text x={s.label.x} y={s.label.y} textAnchor="middle" dominantBaseline="middle" fontSize="5.5" fontWeight="700" fill="#fff" transform={s.label.rot}>{s.label.text}</text>}
        </g>
      )) : <>
        <circle cx="100" cy="100" r="98" fill="var(--panel)" stroke="var(--ink)" strokeWidth="2" />
        <text x="100" y="104" textAnchor="middle" fontSize="11" fill="var(--muted)">Sem jogos</text>
      </>}
    </svg>
  );
}
