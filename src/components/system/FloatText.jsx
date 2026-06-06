/* ═══════════════════════════════════════════════════════
   src/components/system/FloatText.jsx
   Texte flottant éphémère (+10€, +XP, etc.).
   S'auto-détruit après la fin de l'animation CSS.

   Usage:
     const [floats, setFloats] = useState([]);
     const spawnFloat = (text, color) =>
       setFloats(f => [...f, { id: Date.now() + Math.random(), text, color }]);

     // onExpire MUST be stable (useCallback) — an inline arrow resets
     // the 900 ms timer on every parent render.
     const handleExpire = useCallback(
       id => setFloats(f => f.filter(x => x.id !== id)), []);

     // Parent container MUST have position:relative so the absolute
     // spans anchor to it and not a distant ancestor.
     <div style={{ position: "relative" }}>
       <FloatLayer floats={floats} onExpire={handleExpire} />
     </div>

   Props FloatLayer:
     floats   {Array<{id, text, color?}>}
     onExpire {(id) => void}  — must be a stable reference (useCallback)
═══════════════════════════════════════════════════════ */
import { useEffect } from "react";
import { F } from "../ui/theme.js";

const DURATION_MS = 900;

const FloatItem = ({ id, text, color = "#1e5c38", onExpire }) => {
  useEffect(() => {
    const t = setTimeout(() => onExpire(id), DURATION_MS);
    return () => clearTimeout(t);
  // onExpire excluded: it's often recreated by the parent; id is the stable key.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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

