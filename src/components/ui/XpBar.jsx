/* ═══════════════════════════════════════════════════════
   src/components/ui/XpBar.jsx
   Barre de progression XP — utilisée pour chef, serveurs,
   commis et niveau restaurant.

   Props :
     xp     {number} valeur actuelle
     needed {number} valeur maximale
     color  {string} couleur de la barre (défaut: C.green)
     h      {number} hauteur en px (défaut: 6)
     style  {object?} surcharge CSS sur le conteneur
═══════════════════════════════════════════════════════ */
import { C } from "./theme.js";

export const XpBar = ({ xp, needed, color = C.green, h = 6, style = {} }) => {
  const pct = Math.min(1, xp / Math.max(1, needed));
  return (
    <div style={{
      background  : C.border,
      borderRadius: 99,
      overflow    : "hidden",
      height      : h,
      ...style,
    }}>
      <div style={{
        height         : "100%",
        width          : "100%",
        background     : color,
        borderRadius   : 99,
        transformOrigin: "left center",
        transform      : `scaleX(${pct})`,
        transition     : "transform 0.5s ease",
      }} />
    </div>
  );
};
