/* ═══════════════════════════════════════════════════════
   src/components/ui/Badge.jsx
   Étiquette colorée — utilisée partout pour les statuts,
   catégories de plats, niveaux de personnel.

   Props :
     color    {string}  couleur du texte et de la bordure
     bg       {string?} couleur de fond (défaut: color+"1a")
     sm       {boolean} taille réduite (défaut: false)
     children {ReactNode}
═══════════════════════════════════════════════════════ */
import { C, F } from "./theme";

export const Badge = ({ color, bg, children, sm = false }) => (
  <span style={{
    background   : bg ?? color + "1a",
    color,
    border       : `1px solid ${color}33`,
    borderRadius : 5,
    padding      : sm ? "2px 8px" : "3px 11px",
    fontSize     : sm ? 10 : 11,
    fontWeight   : 600,
    letterSpacing: "0.03em",
    whiteSpace   : "nowrap",
    fontFamily   : F.body,
  }}>
    {children}
  </span>
);
