/* ═══════════════════════════════════════════════════════
   src/components/ui/Modal.jsx
   Modale générique — overlay + contenu scrollable.
   Utilisée comme base pour toutes les modales du jeu.

   Props :
     title   {string}   affiché dans l'en-tête
     onClose {Function} appelé au clic sur ×
     children {ReactNode}
═══════════════════════════════════════════════════════ */
import { C, F } from "./theme";

export const Modal = ({ title, onClose, children }) => (
  <div style={{
    position      : "fixed",
    inset         : 0,
    background    : "rgba(26,22,18,0.5)",
    zIndex        : 1000,
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
          style={{
            background  : C.bg,
            border      : `1px solid ${C.border}`,
            borderRadius: 8,
            color       : C.muted,
            fontSize    : 20,
            cursor      : "pointer",
            width       : 32,
            height      : 32,
            display     : "flex",
            alignItems  : "center",
            justifyContent: "center",
          }}
        >
          ×
        </button>
      </div>
      {children}
    </div>
  </div>
);
