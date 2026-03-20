/* ═══════════════════════════════════════════════════════
   src/components/system/Toasts.jsx
   Pile de notifications — affichée en overlay fixe en
   haut à droite. Chaque toast :
     - S'auto-détruit après 4s (barre de progression)
     - Est cliquable pour naviguer vers un onglet
     - Peut être rejeté manuellement

   Props :
     list       {Array<{id, icon, title, msg, color, tab?}>}
     onDismiss  {(id: string) => void}
     onNavigate {(tab: string) => void}
═══════════════════════════════════════════════════════ */
import { C, F } from "../ui/theme";

export const Toasts = ({ list, onDismiss, onNavigate }) => (
  <div style={{
    position     : "fixed",
    top          : 100,
    right        : 18,
    zIndex       : 9999,
    display      : "flex",
    flexDirection: "column",
    gap          : 8,
    pointerEvents: "none",
    width        : 290,
  }}>
    {list.map(t => (
      <div
        key={t.id}
        onClick={() => {
          onDismiss(t.id);
          if (t.tab && onNavigate) onNavigate(t.tab);
        }}
        style={{
          background  : C.surface,
          border      : `1.5px solid ${t.color ?? C.green}33`,
          borderLeft  : `4px solid ${t.color ?? C.green}`,
          borderRadius: 11,
          overflow    : "hidden",
          boxShadow   : "0 6px 24px rgba(0,0,0,0.15)",
          pointerEvents: "auto",
          cursor      : t.tab ? "pointer" : "default",
          animation   : "slideIn 0.2s ease",
        }}
      >
        {/* Contenu */}
        <div style={{
          display   : "flex",
          alignItems: "flex-start",
          gap       : 10,
          padding   : "11px 14px",
        }}>
          <span style={{ fontSize: 20, lineHeight: 1.2, flexShrink: 0 }}>{t.icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, fontFamily: F.body }}>
              {t.title}
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 2, fontFamily: F.body }}>
              {t.msg}
            </div>
            {t.tab && (
              <div style={{
                fontSize  : 9,
                color     : t.color ?? C.green,
                marginTop : 3,
                fontFamily: F.body,
                fontWeight: 600,
              }}>
                ↗ Appuyer pour y aller
              </div>
            )}
          </div>
          <span style={{ fontSize: 12, color: C.muted, flexShrink: 0, marginTop: 1 }}>✕</span>
        </div>

        {/* Barre de compte à rebours */}
        <div style={{
          height    : 3,
          background: (t.color ?? C.green) + "33",
          overflow  : "hidden",
        }}>
          <div style={{
            height    : "100%",
            background: t.color ?? C.green,
            animation : "toastBar 4s linear forwards",
          }} />
        </div>
      </div>
    ))}
  </div>
);
