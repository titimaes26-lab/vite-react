/* ═══════════════════════════════════════════════════════
   src/components/ui/Sel.jsx
   Sélecteur stylisé — utilisé dans formulaires et filtres.

   Props :
     value     {string}
     onChange  {Function}
     children  {ReactNode} balises <option>
     style     {object?}
═══════════════════════════════════════════════════════ */
import { C, F } from "./theme.js";

export const Sel = ({ value, onChange, children, style = {} }) => (
  <select
    value={value}
    onChange={onChange}
    style={{
      background  : C.white,
      border      : `1.5px solid ${C.border}`,
      borderRadius: 9,
      padding     : "9px 13px",
      color       : C.ink,
      fontSize    : 13,
      fontFamily  : F.body,
      outline     : "none",
      cursor      : "pointer",
      width       : "100%",
      ...style,
    }}
  >
    {children}
  </select>
);
