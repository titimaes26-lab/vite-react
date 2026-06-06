/* ═══════════════════════════════════════════════════════
   src/components/ui/Sel.jsx
   Sélecteur stylisé — utilisé dans formulaires et filtres.

   Props :
     value     {string}
     onChange  {Function}
     children  {ReactNode} balises <option>
     style     {object?}
═══════════════════════════════════════════════════════ */
import { useState } from "react";
import { C, F } from "./theme.js";

export const Sel = ({ value, onChange, children, style = {} }) => {
  const [focused, setFocused] = useState(false);
  return (
    <select
      value={value}
      onChange={onChange}
      onFocus={() => setFocused(true)}
      onBlur={()  => setFocused(false)}
      style={{
        background  : C.white,
        border      : `1.5px solid ${focused ? C.green : C.border}`,
        borderRadius: 9,
        padding     : "9px 13px",
        color       : C.ink,
        fontSize    : 13,
        fontFamily  : F.body,
        outline     : "none",
        cursor      : "pointer",
        width       : "100%",
        transition  : "border-color 0.15s",
        ...style,
      }}
    >
      {children}
    </select>
  );
};
