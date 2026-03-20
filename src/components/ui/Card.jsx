/* ═══════════════════════════════════════════════════════
   src/components/ui/Card.jsx
   Conteneur de base — fond clair, bordure subtile,
   coins arrondis. Supporte un accent coloré facultatif.

   Props :
     children  {ReactNode}
     style     {object?}   styles supplémentaires
     onClick   {Function?} rend la carte cliquable
     accent    {string?}   couleur d'accentuation (bordure + ombre)
═══════════════════════════════════════════════════════ */
import { C } from "./theme";

export const Card = ({ children, style = {}, onClick, accent }) => (
  <div
    onClick={onClick}
    className={onClick ? "hovcard" : ""}
    style={{
      background  : C.card,
      border      : `1.5px solid ${accent ?? C.border}`,
      borderRadius: 14,
      padding     : 18,
      cursor      : onClick ? "pointer" : "default",
      boxShadow   : accent
        ? `0 2px 10px ${accent}18`
        : "0 1px 5px rgba(0,0,0,0.06)",
      ...style,
    }}
  >
    {children}
  </div>
);
