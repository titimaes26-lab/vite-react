/* ═══════════════════════════════════════════════════════
   src/components/ui/Inp.jsx
   Champ de saisie stylisé — utilisé dans tous les modaux.

   Props :
     value       {string|number}
     onChange    {Function}
     placeholder {string?}
     style       {object?}
     type        {string}  défaut: "text"
═══════════════════════════════════════════════════════ */
import { useC, F } from "./theme.js";

export const Inp = ({ value, onChange, placeholder, style = {}, type = "text" }) => {
  const C = useC();
  return (
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      type={type}
      style={{
        background  : C.surface,
        border      : `1.5px solid ${C.border}`,
        borderRadius: 9,
        padding     : "9px 13px",
        color       : C.ink,
        fontSize    : 13,
        fontFamily  : F.body,
        outline     : "none",
        width       : "100%",
        boxSizing   : "border-box",
        ...style,
      }}
    />
  );
};
