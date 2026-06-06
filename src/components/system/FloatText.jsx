/* ═══════════════════════════════════════════════════════
   src/components/system/FloatText.jsx
   Texte flottant éphémère (+10€, +XP, etc.).
   S'auto-détruit après la fin de l'animation CSS.

   Usage:
     const [floats, setFloats] = useState([]);
     const spawnFloat = (text, color) =>
       setFloats(f => [...f, { id: Date.now() + Math.random(), text, color }]);

     <FloatLayer floats={floats} onExpire={id =>
       setFloats(f => f.filter(x => x.id !== id))} />

   Props FloatLayer:
     floats   {Array<{id, text, color?}>}
     onExpire {(id) => void}
═══════════════════════════════════════════════════════ */
import { useEffect } from "react";
import { F } from "../ui/theme.js";

const DURATION_MS = 900;

const FloatItem = ({ id, text, color = "#1e5c38", onExpire }) => {
  useEffect(() => {
    const t = setTimeout(() => onExpire(id), DURATION_MS);
    return () => clearTimeout(t);
  }, [id, onExpire]);

  return (
    <span style={{
      position      : "absolute",
      left          : "50%",
      top           : 0,
      transform     : "translateX(-50%)",
      fontFamily    : F.body,
      fontSize      : 13,
      fontWeight    : 700,
      color,
      pointerEvents : "none",
      whiteSpace    : "nowrap",
      animation     : `floatUp ${DURATION_MS}ms ease-out forwards`,
    }}>
      {text}
    </span>
  );
};

export const FloatLayer = ({ floats, onExpire }) => (
  <>
    {floats.map(f => (
      <FloatItem key={f.id} id={f.id} text={f.text} color={f.color} onExpire={onExpire} />
    ))}
  </>
);

export const FLOAT_KEYFRAMES = `
  @keyframes floatUp {
    0%   { opacity: 1; transform: translateX(-50%) translateY(0); }
    100% { opacity: 0; transform: translateX(-50%) translateY(-32px); }
  }
`;
