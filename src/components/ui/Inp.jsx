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
import { useState } from "react";
import { C, F } from "./theme.js";

export const Inp = ({ value, onChange, placeholder, style = {}, type = "text" }) => {
  const [focused, setFocused] = useState(false);
  return (
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      type={type}
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
        width       : "100%",
        boxSizing   : "border-box",
        transition  : "border-color 0.15s",
        ...style,
      }}
    />
  );
};
