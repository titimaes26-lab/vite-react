/* ═══════════════════════════════════════════════════════
   src/components/ui/Lbl.jsx
   Libellé de champ de formulaire — texte uppercase, spacing.

   Props :
     children {ReactNode}
═══════════════════════════════════════════════════════ */
import { C, F } from "./theme.js";

export const Lbl = ({ children }) => (
  <div style={{
    fontSize      : 11,
    color         : C.muted,
    fontWeight    : 600,
    letterSpacing : "0.06em",
    textTransform : "uppercase",
    marginBottom  : 7,
    fontFamily    : F.body,
  }}>
    {children}
  </div>
);
