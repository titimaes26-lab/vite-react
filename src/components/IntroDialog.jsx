/* ═══════════════════════════════════════════════════════
   src/components/IntroDialog.jsx
   Dialogues d'introduction et tutoriels — Élodie & Gustave

   IMAGES attendues dans /public/ :
     /elodie.png   — ratio 16:9  (~1400×788)
     /gustave.png  — ratio 16:9  (~1400×788)
═══════════════════════════════════════════════════════ */
import { useState, useEffect } from "react";
import { F } from "../constants/gameData.js";
import { useLang } from "../i18n/index.jsx";
import { useC } from "../contexts/ThemeContext.jsx";

import { SPEAKERS_FR, SPEAKERS_EN, INTRO_DIALOG, TABLES_DIALOG, SERVERS_DIALOG, BANK_DIALOG, STATS_DIALOG, OBJECTIVES_DIALOG, STOCK_DIALOG, MENU_DIALOG, KITCHEN_DIALOG, INTRO_DIALOG_EN, TABLES_DIALOG_EN, SERVERS_DIALOG_EN, BANK_DIALOG_EN, STATS_DIALOG_EN, OBJECTIVES_DIALOG_EN, STOCK_DIALOG_EN, MENU_DIALOG_EN, KITCHEN_DIALOG_EN } from "../constants/dialogData.js";


/* ═══════════════════════════════════════════════════════
   COMPOSANT GÉNÉRIQUE — DialogScene
═══════════════════════════════════════════════════════ */
function DialogScene({ dialogData, ctaLabel = "OK", onDone }) {
  const C = useC();
  const { lang, t } = useLang();
  const SPEAKERS = lang === "en" ? SPEAKERS_EN : SPEAKERS_FR;

  const [step,     setStep]     = useState(0);
  const [visible,  setVisible]  = useState(false);
  const [textAnim, setTextAnim] = useState(true);
  const [imgKey,   setImgKey]   = useState(0);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 480);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 480);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  useEffect(() => {
    const tm = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(tm);
  }, []);

  useEffect(() => {
    setTextAnim(false);
    const tm = setTimeout(() => setTextAnim(true), 60);
    return () => clearTimeout(tm);
  }, [step]);

  const line   = dialogData[step];
  const sp     = SPEAKERS[line.speaker];
  const isLast = line.isLast || step === dialogData.length - 1;
  const nextSp = !isLast ? SPEAKERS[dialogData[step + 1]?.speaker] : null;
  const bub    = sp.bubble;

  const next = () => {
    if (isLast) {
      setVisible(false);
      setTimeout(onDone, 350);
      return;
    }
    if (dialogData[step + 1].speaker !== line.speaker) {
      setImgKey(k => k + 1);
    }
    setStep(s => s + 1);
  };

  const skip = (e) => {
    e.stopPropagation();
    setVisible(false);
    setTimeout(onDone, 350);
  };

  return (
    <div
      onClick={next}
      style={{
        position: "fixed", inset: 0, zIndex: 99999,
        background: "rgba(8,6,4,0.92)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "12px 12px 16px",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.35s ease",
        cursor: "pointer",
      }}
    >
      {/* Bouton Passer */}
      <button
        onClick={skip}
        style={{
          position: "absolute", top: 14, right: 14,
          padding: "5px 14px",
          background: "rgba(255,255,255,0.1)",
          border: "1px solid rgba(255,255,255,0.2)",
          borderRadius: 20, color: "rgba(255,255,255,0.6)",
          fontSize: 11, cursor: "pointer", fontFamily: F.body, zIndex: 1,
        }}
      >
        {t("dialog.skip")}
      </button>

      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 860,
          display: "flex", flexDirection: "column", gap: 10,
        }}
      >
        {/* Ligne d'identité : section + personnage */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          opacity: textAnim ? 1 : 0,
          transform: textAnim ? "translateY(0)" : "translateY(-4px)",
          transition: "opacity 0.25s ease, transform 0.25s ease",
        }}>
          {/* Section (chapitre) */}
          <div>
            {line.section && (
              <div style={{
                fontSize: 10, fontWeight: 700,
                color: sp.color + "99",
                fontFamily: F.title, letterSpacing: "0.12em",
                textTransform: "uppercase", marginBottom: 2,
              }}>
                ── {line.section} ──
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <div style={{
                width: 8, height: 8, borderRadius: "50%",
                background: sp.color,
                boxShadow: `0 0 8px ${sp.color}`,
                flexShrink: 0,
              }}/>
              <span style={{
                fontSize: 12, fontWeight: 700, color: sp.color,
                fontFamily: F.title, letterSpacing: "0.05em",
              }}>
                {sp.name}
              </span>
              <span style={{
                fontSize: 10, color: "rgba(255,255,255,0.35)",
                fontFamily: F.body,
              }}>
                — {sp.title}
              </span>
            </div>
          </div>

          {/* Compteur étape */}
          <div style={{
            fontSize: 10, color: "rgba(255,255,255,0.3)",
            fontFamily: F.body,
          }}>
            {step + 1} / {dialogData.length}
          </div>
        </div>

        {/* Image + overlay bulle (conteneur 16:9) */}
        <div style={{
          position: "relative",
          width: "100%",
          paddingBottom: "56.25%",
          borderRadius: 16,
          overflow: "hidden",
          background: "#111",
        }}>
          <img
            key={`${line.speaker}-${imgKey}`}
            src={sp.img}
            alt={sp.name}
            style={{
              position: "absolute", inset: 0,
              width: "100%", height: "100%",
              objectFit: "cover", borderRadius: 16,
              animation: "introImgIn 0.32s ease both",
            }}
          />

          {/* Texte sur la bulle */}
          <div
            style={{
              position: "absolute",
              left: bub.left, top: bub.top,
              width: bub.width, height: bub.height,
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: "1% 5% 9%",
              pointerEvents: "none",
            }}
          >
            <p style={{
              margin: 0,
              fontSize: "clamp(10px, 1.55vw, 14px)",
              color: "#1a120a",
              fontFamily: F.body,
              lineHeight: 1.5,
              textAlign: "center",
              fontWeight: 500,
              opacity: textAnim ? 1 : 0,
              transform: textAnim ? "translateY(0)" : "translateY(5px)",
              transition: "opacity 0.28s ease, transform 0.28s ease",
            }}>
              {(isMobile && line.short) ? line.short : line.text}
            </p>
          </div>

          {/* Hint tap */}
          <div style={{
            position: "absolute", bottom: 10, right: 14,
            fontSize: 11, color: "rgba(255,255,255,0.45)",
            fontFamily: F.body,
            animation: "tapPulse 2s ease-in-out infinite",
          }}>
            {!isLast && t("dialog.tapContinue")}
          </div>
        </div>

        {/* Note de mise en scène */}
        {line.note && (
          <div style={{
            textAlign: "center",
            fontSize: 11, color: "#c8a96a",
            fontFamily: F.body, fontStyle: "italic",
            opacity: textAnim ? 1 : 0,
            transition: "opacity 0.35s ease 0.1s",
          }}>
            ✦ {line.note}
          </div>
        )}

        {/* Barre de contrôles */}
        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "center", padding: "0 2px", marginTop: 2,
        }}>
          {/* Points de progression */}
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            {dialogData.map((d, i) => {
              const isCurrent = i === step;
              const isDone    = i < step;
              const dot       = SPEAKERS[d.speaker];
              return (
                <div key={i} style={{
                  width: isCurrent ? 16 : 6, height: 6,
                  borderRadius: 99,
                  background: isCurrent
                    ? dot.color
                    : isDone ? dot.color + "66" : "rgba(255,255,255,0.18)",
                  transition: "all 0.3s ease",
                }}/>
              );
            })}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Prochain personnage */}
            {nextSp && nextSp.name !== sp.name && (
              <div style={{
                fontSize: 10, color: "rgba(255,255,255,0.35)",
                fontFamily: F.body,
              }}>
                {t("dialog.nextSpeaker", { name: nextSp.name })}
              </div>
            )}

            {/* Bouton principal */}
            <button
              onClick={e => { e.stopPropagation(); next(); }}
              style={{
                padding: "11px 28px",
                background: isLast
                  ? `linear-gradient(135deg,${C.green},#2d7a50)`
                  : sp.color,
                border: "none", borderRadius: 10,
                color: "#fff", fontSize: 14, fontWeight: 700,
                fontFamily: F.body, cursor: "pointer",
                boxShadow: `0 4px 18px ${isLast ? C.green : sp.color}55`,
                transition: "background 0.3s, box-shadow 0.3s",
                letterSpacing: "0.01em",
              }}
            >
              {isLast ? `✅ ${ctaLabel}` : t("dialog.next")}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes introImgIn {
          from { opacity:0; transform:scale(1.03); }
          to   { opacity:1; transform:scale(1); }
        }
        @keyframes tapPulse {
          0%,100% { opacity:0.45; }
          50%     { opacity:0.9; }
        }
      `}</style>
    </div>
  );
}

/* ─── Exports ────────────────────────────────────────── */
function useDialogCta(key) {
  const { lang, t } = useLang();
  return t(key + "Tutorial.cta") !== key + "Tutorial.cta"
    ? t(key + "Tutorial.cta")
    : t("intro.cta");
}

export function IntroDialog({ onDone }) {
  const { lang, t } = useLang();
  const dialogData = lang === "en" ? INTRO_DIALOG_EN : INTRO_DIALOG;
  return <DialogScene dialogData={dialogData} ctaLabel={t("intro.cta")} onDone={onDone} />;
}

export function TablesDialog({ onDone }) {
  const { lang, t } = useLang();
  const dialogData = lang === "en" ? TABLES_DIALOG_EN : TABLES_DIALOG;
  return <DialogScene dialogData={dialogData} ctaLabel={t("tablesTutorial.cta")} onDone={onDone} />;
}

export function ServersDialog({ onDone }) {
  const { lang, t } = useLang();
  const dialogData = lang === "en" ? SERVERS_DIALOG_EN : SERVERS_DIALOG;
  return <DialogScene dialogData={dialogData} ctaLabel={t("serversTutorial.cta")} onDone={onDone} />;
}

export function BankDialog({ onDone }) {
  const { lang, t } = useLang();
  const dialogData = lang === "en" ? BANK_DIALOG_EN : BANK_DIALOG;
  return <DialogScene dialogData={dialogData} ctaLabel={t("bankTutorial.cta")} onDone={onDone} />;
}

export function StatsDialog({ onDone }) {
  const { lang, t } = useLang();
  const dialogData = lang === "en" ? STATS_DIALOG_EN : STATS_DIALOG;
  return <DialogScene dialogData={dialogData} ctaLabel={t("statsTutorial.cta")} onDone={onDone} />;
}

export function ObjectivesDialog({ onDone }) {
  const { lang, t } = useLang();
  const dialogData = lang === "en" ? OBJECTIVES_DIALOG_EN : OBJECTIVES_DIALOG;
  return <DialogScene dialogData={dialogData} ctaLabel={t("objectivesTutorial.cta")} onDone={onDone} />;
}

export function StockDialog({ onDone }) {
  const { lang, t } = useLang();
  const dialogData = lang === "en" ? STOCK_DIALOG_EN : STOCK_DIALOG;
  return <DialogScene dialogData={dialogData} ctaLabel={t("stockTutorial.cta")} onDone={onDone} />;
}

export function MenuDialog({ onDone }) {
  const { lang, t } = useLang();
  const dialogData = lang === "en" ? MENU_DIALOG_EN : MENU_DIALOG;
  return <DialogScene dialogData={dialogData} ctaLabel={t("menuTutorial.cta")} onDone={onDone} />;
}

export function KitchenDialog({ onDone }) {
  const { lang, t } = useLang();
  const dialogData = lang === "en" ? KITCHEN_DIALOG_EN : KITCHEN_DIALOG;
  return <DialogScene dialogData={dialogData} ctaLabel={t("kitchenTutorial.cta")} onDone={onDone} />;
}
