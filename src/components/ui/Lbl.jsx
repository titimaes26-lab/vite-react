/* ═══════════════════════════════════════════════════════
   src/components/ui/Lbl.jsx
   Libellé de champ de formulaire — texte uppercase, spacing.

   Props :
     children {ReactNode}
     style    {object?} surcharge CSS
═══════════════════════════════════════════════════════ */
import { C, F } from "./theme.js";

export const Lbl = ({ children, style = {} }) => (
  <div style={{
    fontSize      : 11,
    color         : C.muted,
    fontWeight    : 600,
    letterSpacing : "0.06em",
    textTransform : "uppercase",
    marginBottom  : 7,
    fontFamily    : F.body,
    ...style,
  }}>
    {children}
  </div>
);
