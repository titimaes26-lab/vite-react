/* ═══════════════════════════════════════════════════════
   src/components/LanguageSelect.jsx
   Écran de sélection de langue au démarrage
═══════════════════════════════════════════════════════ */
import { useLang } from "../i18n/index.jsx";
import { C, F } from "../constants/gameData.js";

export function LanguageSelect() {
  const { setLang } = useLang();

  const choose = (code) => setLang(code);

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "linear-gradient(135deg, #1a1209 0%, #2d1f0e 50%, #1a1209 100%)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      gap: 40, padding: 24,
      fontFamily: F.body,
    }}>
      {/* Logo / titre */}
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "clamp(28px, 5vw, 48px)", fontWeight: 900,
          fontFamily: F.title, color: "#c8a96a",
          letterSpacing: "0.04em", marginBottom: 8,
          textShadow: "0 2px 20px rgba(200,169,106,0.4)",
        }}>
          Le Grand Restaurant
        </div>
        <div style={{ fontSize: "clamp(14px, 2.5vw, 18px)", color: "rgba(255,255,255,0.5)",
          fontFamily: F.body, letterSpacing: "0.08em",
        }}>
          / Language / Langue
        </div>
      </div>

      {/* Boutons de langue */}
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", justifyContent: "center" }}>
        {[
          { code: "fr", label: "Français", flag: "🇫🇷", desc: "Jouer en français" },
          { code: "en", label: "English",  flag: "🇬🇧", desc: "Play in English" },
        ].map(({ code, label, flag, desc }) => (
          <button
            key={code}
            onClick={() => choose(code)}
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1.5px solid rgba(200,169,106,0.35)",
              borderRadius: 18,
              padding: "28px 44px",
              cursor: "pointer",
              display: "flex", flexDirection: "column",
              alignItems: "center", gap: 10,
              transition: "all 0.2s ease",
              minWidth: 160,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = "rgba(200,169,106,0.14)";
              e.currentTarget.style.borderColor = "#c8a96a";
              e.currentTarget.style.transform = "translateY(-3px)";
              e.currentTarget.style.boxShadow = "0 8px 30px rgba(200,169,106,0.2)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = "rgba(255,255,255,0.06)";
              e.currentTarget.style.borderColor = "rgba(200,169,106,0.35)";
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <span style={{ fontSize: "clamp(32px, 6vw, 48px)" }}>{flag}</span>
            <span style={{
              fontSize: "clamp(18px, 3vw, 24px)", fontWeight: 700,
              color: "#c8a96a", fontFamily: F.title,
            }}>
              {label}
            </span>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", fontFamily: F.body }}>
              {desc}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
