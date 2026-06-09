/* ═══════════════════════════════════════════════════════
   src/components/ui/Modal.jsx
   Modale générique — overlay + contenu scrollable.
   Utilisée comme base pour toutes les modales du jeu.

   Props :
     title   {string}   affiché dans l'en-tête
     onClose {Function} appelé au clic sur ×
     children {ReactNode}
═══════════════════════════════════════════════════════ */
import { useState } from "react";
import { C, F, Z, QUEUE_BAR_H } from "./theme.js";

export const Modal = ({ title, onClose, children }) => {
  const [closeHovered, setCloseHovered] = useState(false);
  return (
  <div style={{
    position      : "fixed",
    top: 0, left: 0, right: 0, bottom: QUEUE_BAR_H,
    background    : "rgba(26,22,18,0.5)",
    zIndex        : Z.modal,
    display       : "flex",
    alignItems    : "center",
    justifyContent: "center",
    padding       : 16,
  }}>
    <div style={{
      background  : C.surface,
      border      : `1.5px solid ${C.border}`,
      borderRadius: 18,
      padding     : 28,
      width       : "100%",
      maxWidth    : 540,
      maxHeight   : "88vh",
      overflowY   : "auto",
      boxShadow   : "0 20px 60px rgba(0,0,0,0.18)",
    }}>
      {/* Header */}
      <div style={{
        display       : "flex",
        justifyContent: "space-between",
        alignItems    : "center",
        marginBottom  : 20,
      }}>
        <h3 style={{
          color      : C.ink,
          margin     : 0,
          fontSize   : 20,
          fontFamily : F.title,
          fontWeight : 600,
        }}>
          {title}
        </h3>
        <button
          onClick={onClose}
          onMouseEnter={() => setCloseHovered(true)}
          onMouseLeave={() => setCloseHovered(false)}
          style={{
            background    : closeHovered ? C.border : C.bg,
            border        : `1px solid ${C.border}`,
            borderRadius  : 8,
            color         : closeHovered ? C.ink : C.muted,
            fontSize      : 20,
            cursor        : "pointer",
            width         : 44,
            height        : 44,
            display       : "flex",
            alignItems    : "center",
            justifyContent: "center",
            transition    : "background 0.15s, color 0.15s",
          }}
        >
          ×
        </button>
      </div>
      {children}
    </div>
  </div>
  );
};
