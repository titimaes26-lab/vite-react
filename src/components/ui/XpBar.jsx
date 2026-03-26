/* ═══════════════════════════════════════════════════════
   src/components/ui/XpBar.jsx
   Barre de progression XP — utilisée pour chef, serveurs,
   commis et niveau restaurant.

   Props :
     xp     {number} valeur actuelle
     needed {number} valeur maximale
     color  {string} couleur de la barre (défaut: C.green)
     h      {number} hauteur en px (défaut: 6)
═══════════════════════════════════════════════════════ */
import { C } from "./theme.js";

export const XpBar = ({ xp, needed, color = C.green, h = 6 }) => (
  <div style={{
    background  : C.border,
    borderRadius: 99,
    overflow    : "hidden",
    height      : h,
  }}>
    <div style={{
      height     : "100%",
      width      : `${Math.min(100, (xp / Math.max(1, needed)) * 100)}%`,
      background : color,
      borderRadius: 99,
      transition : "width 0.5s ease",
    }} />
  </div>
);
