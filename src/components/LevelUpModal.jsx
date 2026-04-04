/* ═══════════════════════════════════════════════════════
   src/components/LevelUpModal.jsx
   Modale de passage de niveau restaurant
═══════════════════════════════════════════════════════ */
import { useState, useEffect } from "react";
import { C, F } from "../constants/gameData.js";

/* ─── Déblocages par niveau ──────────────────────────── */
const UNLOCKS = {
  1: [
    { icon: "🪑", text: "5 tables disponibles (+2)" },
    { icon: "👥", text: "3 slots serveurs (+1)" },
    { icon: "🎯", text: "Objectifs journaliers actifs" },
  ],
  2: [
    { icon: "🪑", text: "7 tables disponibles (+2)" },
    { icon: "👥", text: "4 slots serveurs (+1)" },
    { icon: "⚡", text: "Spécialités serveurs débloquées" },
    { icon: "🎓", text: "Formations disponibles" },
  ],
  3: [
    { icon: "🪑", text: "9 tables disponibles (+2)" },
    { icon: "👥", text: "5 slots serveurs (+1)" },
    { icon: "🧑‍🍳", text: "2ème commis cuisine débloqué" },
  ],
  4: [
    { icon: "🪑", text: "11 tables disponibles (+2)" },
    { icon: "👥", text: "6 slots serveurs (+1)" },
    { icon: "🧑‍🍳", text: "3ème commis cuisine débloqué" },
    { icon: "🌟", text: "Spécialités serveurs niveau 2" },
  ],
  5: [
    { icon: "🪑", text: "12 tables disponibles (maximum)" },
    { icon: "👥", text: "8 slots serveurs (maximum)" },
    { icon: "🏆", text: "Niveau maximum atteint !" },
  ],
};

export function LevelUpModal({ levelData, onClose }) {
  const [visible, setVisible] = useState(false);
  const [itemsVisible, setItemsVisible] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 60);
    const t2 = setTimeout(() => setItemsVisible(true), 400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 320);
  };

  const unlocks = UNLOCKS[levelData.l] || [];
  const col = levelData.color;

  return (
    <div
      onClick={handleClose}
      style={{
        position: "fixed", inset: 0, zIndex: 99998,
        background: "rgba(6,4,2,0.88)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
        opacity: visible ? 1 : 0,
        transition: "opacity 0.32s ease",
        cursor: "pointer",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 440,
          background: C.card,
          borderRadius: 20,
          overflow: "hidden",
          boxShadow: `0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px ${col}33`,
          transform: visible ? "scale(1) translateY(0)" : "scale(0.88) translateY(24px)",
          transition: "transform 0.38s cubic-bezier(0.34,1.56,0.64,1)",
          cursor: "default",
        }}
      >
        {/* Header coloré */}
        <div style={{
          background: `linear-gradient(135deg, ${col}, ${col}cc)`,
          padding: "28px 24px 24px",
          textAlign: "center",
          position: "relative",
        }}>
          {/* Étoiles décoratives */}
          <div style={{
            position: "absolute", inset: 0, overflow: "hidden",
            pointerEvents: "none", opacity: 0.15,
          }}>
            {["10%,20%","85%,15%","5%,70%","92%,65%","50%,5%"].map((pos, i) => (
              <div key={i} style={{
                position: "absolute",
                left: pos.split(",")[0], top: pos.split(",")[1],
                fontSize: 18,
                animation: `starTwinkle ${1.5 + i * 0.3}s ease-in-out infinite`,
              }}>✦</div>
            ))}
          </div>

          {/* Badge niveau */}
          <div style={{
            display: "inline-block",
            background: "rgba(255,255,255,0.2)",
            borderRadius: 20, padding: "4px 14px",
            fontSize: 11, fontWeight: 700,
            color: "#fff", fontFamily: F.body,
            letterSpacing: "0.1em", textTransform: "uppercase",
            marginBottom: 12,
          }}>
            Niveau {levelData.l}
          </div>

          {/* Icône */}
          <div style={{
            fontSize: 56, lineHeight: 1,
            marginBottom: 10,
            animation: "lvlIconPop 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.15s both",
          }}>
            {levelData.icon}
          </div>

          {/* Nom du niveau */}
          <div style={{
            fontSize: 26, fontWeight: 800,
            color: "#fff", fontFamily: F.title,
            letterSpacing: "0.02em", marginBottom: 4,
          }}>
            {levelData.name}
          </div>
          <div style={{
            fontSize: 13, color: "rgba(255,255,255,0.75)",
            fontFamily: F.body,
          }}>
            Félicitations, Patron !
          </div>
        </div>

        {/* Corps — liste des déblocages */}
        <div style={{ padding: "20px 24px 24px" }}>
          <div style={{
            fontSize: 11, fontWeight: 700,
            color: C.muted, fontFamily: F.body,
            letterSpacing: "0.1em", textTransform: "uppercase",
            marginBottom: 14,
          }}>
            Nouveautés débloquées
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {unlocks.map((u, i) => (
              <div
                key={i}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  background: C.bg, borderRadius: 10,
                  padding: "10px 14px",
                  border: `1px solid ${C.border}`,
                  opacity: itemsVisible ? 1 : 0,
                  transform: itemsVisible ? "translateX(0)" : "translateX(-12px)",
                  transition: `opacity 0.3s ease ${i * 0.07}s, transform 0.3s ease ${i * 0.07}s`,
                }}
              >
                <span style={{ fontSize: 20, flexShrink: 0 }}>{u.icon}</span>
                <span style={{
                  fontSize: 13, fontWeight: 600,
                  color: "#2a1f14", fontFamily: F.body,
                }}>
                  {u.text}
                </span>
                <span style={{
                  marginLeft: "auto", flexShrink: 0,
                  fontSize: 12, color: col, fontWeight: 700,
                }}>
                  ✓
                </span>
              </div>
            ))}
          </div>

          {/* Bouton */}
          <button
            onClick={handleClose}
            style={{
              width: "100%", marginTop: 20,
              padding: "13px 0",
              background: `linear-gradient(135deg, ${col}, ${col}cc)`,
              border: "none", borderRadius: 12,
              color: "#fff", fontSize: 15, fontWeight: 700,
              fontFamily: F.body, cursor: "pointer",
              boxShadow: `0 4px 18px ${col}55`,
              letterSpacing: "0.01em",
            }}
          >
            Super, on continue ! →
          </button>
        </div>
      </div>

      <style>{`
        @keyframes lvlIconPop {
          from { transform: scale(0.4) rotate(-10deg); opacity: 0; }
          to   { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes starTwinkle {
          0%,100% { opacity: 0.15; transform: scale(1); }
          50%     { opacity: 0.4;  transform: scale(1.3); }
        }
      `}</style>
    </div>
  );
}
