/* ═══════════════════════════════════════════════════════
   src/components/QueueBar.jsx
   Barre flottante — file d'attente + cash — toujours visible
═══════════════════════════════════════════════════════ */
import { useState, useEffect, useRef } from "react";
import { C, F } from "../constants/gameData.js";

export function QueueBar({ queue, cash, onTabChange, isMobile, onOpenBank }) {
  const [now, setNow] = useState(Date.now());
  const rafRef = useRef(null);

  useEffect(() => {
    const tick = () => { setNow(Date.now()); rafRef.current = requestAnimationFrame(tick); };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const cashColor   = cash < 200 ? C.red : cash < 800 ? C.amber : C.green;
  const queueCount  = queue.length;
  const urgentCount = queue.filter(g =>
    Math.max(0, (g.expiresAt - now) / (g.patMax * 1000)) * 100 < 30
  ).length;

  return (
    <div style={{
      position: "fixed",
      bottom: 0,
      left: 0, right: 0,
      zIndex: 850,
      background: "#ffffff",
      borderTop: `2px solid ${C.border}`,
      boxShadow: "0 -2px 12px rgba(23,18,14,0.08), 0 -1px 3px rgba(23,18,14,0.04)",
      display: "flex",
      alignItems: "stretch",
      minHeight: 44,
    }}>

      {/* ── Cash ───────────────────────────────────────── */}
      <div
        onClick={onOpenBank}
        title="Voir le grand livre"
        style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "0 14px",
          flexShrink: 0,
          borderRight: `1px solid ${C.border}`,
          minWidth: isMobile ? 100 : 130,
          cursor: onOpenBank ? "pointer" : "default",
          background: onOpenBank ? (cash < 200 ? C.redP : C.greenP) : "transparent",
          transition: "background 0.2s",
        }}>
        <span style={{ fontSize: 13 }}>💰</span>
        <span style={{
          fontSize: isMobile ? 12 : 13,
          fontWeight: 800,
          color: cashColor,
          fontFamily: F.title,
          whiteSpace: "nowrap",
          letterSpacing: "-0.01em",
        }}>
          {cash.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
        </span>
        {onOpenBank && <span style={{ fontSize: 9, color: cashColor, opacity: 0.7 }}>▼</span>}
      </div>

      {/* ── Titre file d'attente ────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "0 10px 0 12px",
        flexShrink: 0,
        borderRight: `1px solid ${C.border}`,
      }}>
        <span style={{ fontSize: 13 }}>👥</span>
        <span style={{
          fontSize: 10, fontWeight: 700,
          color: urgentCount > 0 ? C.red : queueCount > 0 ? C.amber : C.muted,
          fontFamily: F.body,
          whiteSpace: "nowrap",
        }}>
          {queueCount === 0 ? "Personne" : `${queueCount} groupe${queueCount > 1 ? "s" : ""}`}
        </span>
        {urgentCount > 0 && (
          <span style={{
            background: C.red, color: "#fff",
            borderRadius: "50%", width: 16, height: 16,
            fontSize: 9, fontWeight: 800,
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            animation: "queuePulse 1s ease-in-out infinite",
            flexShrink: 0,
          }}>
            {urgentCount}
          </span>
        )}
      </div>

      {/* ── Groupes scrollables ─────────────────────────── */}
      <div style={{
        flex: 1,
        overflowX: "auto",
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "0 10px",
        scrollbarWidth: "none",
      }}>
        {queue.length === 0 ? (
          <span style={{
            fontSize: 11, color: C.muted,
            fontFamily: F.body, fontStyle: "italic",
            whiteSpace: "nowrap", opacity: 0.6,
          }}>
            Aucun client en attente
          </span>
        ) : (
          queue.map(g => {
            const remaining = Math.max(0, g.expiresAt - now);
            const pct       = Math.min(100, (remaining / (g.patMax * 1000)) * 100);
            const barColor  = pct > 60 ? C.green : pct > 30 ? C.amber : C.red;
            const isUrgent  = pct < 30;

            return (
              <div
                key={g.id}
                onClick={() => onTabChange("tables")}
                title={`${g.name} — groupe de ${g.size} — ${Math.ceil(remaining / 1000)}s`}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  background: isUrgent ? C.redP : C.bg,
                  border: `1px solid ${isUrgent ? C.red + "55" : C.border}`,
                  borderRadius: 8,
                  padding: "4px 8px",
                  flexShrink: 0,
                  cursor: "pointer",
                  animation: isUrgent ? "queuePulse 1s ease-in-out infinite" : "none",
                  transition: "background 0.3s",
                }}
              >
                {/* Humeur + taille */}
                <span style={{ fontSize: 14, lineHeight: 1 }}>{g.mood?.e ?? "😐"}</span>
                <span style={{
                  fontSize: 10, fontWeight: 700,
                  color: C.ink,
                  fontFamily: F.body,
                }}>
                  ×{g.size}
                </span>

                {/* Barre de patience */}
                <div style={{
                  width: isMobile ? 36 : 48,
                  height: 4,
                  background: C.border,
                  borderRadius: 99,
                  overflow: "hidden",
                  flexShrink: 0,
                }}>
                  <div style={{
                    height: "100%",
                    width: `${pct}%`,
                    background: barColor,
                    borderRadius: 99,
                    transition: "width 0.25s linear, background 0.5s ease",
                  }} />
                </div>

                {/* Secondes restantes */}
                <span style={{
                  fontSize: 9,
                  color: isUrgent ? C.red : C.muted,
                  fontFamily: F.body,
                  fontWeight: isUrgent ? 700 : 400,
                  minWidth: 18,
                  textAlign: "right",
                }}>
                  {Math.ceil(remaining / 1000)}s
                </span>
              </div>
            );
          })
        )}
      </div>

      <style>{`
        @keyframes queuePulse {
          0%,100% { opacity: 1; }
          50%     { opacity: 0.55; }
        }
      `}</style>
    </div>
  );
}
