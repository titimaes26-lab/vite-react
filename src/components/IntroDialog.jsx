/* ═══════════════════════════════════════════════════════
   src/components/IntroDialog.jsx
   Dialogue d'introduction — Élodie & Gustave
   Affiché une seule fois au premier lancement du jeu.

   IMAGES attendues dans /public/ :
     /elodie.png   — ratio 16:9  (~1400×788)
     /gustave.png  — ratio 16:9  (~1400×788)
═══════════════════════════════════════════════════════ */
import { useState, useEffect } from "react";
import { C, F } from "../constants/gameData.js";

/* ─── Données du dialogue ────────────────────────────── */
const DIALOG = [
  {
    speaker: "elodie",
    text: "Bonjour ! Je suis Élodie, votre assistante de gestion. J'ai analysé les chiffres de ce lieu… Disons que « potentiel » est un mot poli pour « catastrophe financière imminente ».",
  },
  {
    speaker: "elodie",
    text: "Mon rôle est de m'assurer que nous ne fassions pas faillite avant la fin de la semaine. Le vôtre est de prendre les décisions stratégiques. Et le sien…",
    note: "Gustave arrive en trombe !",
  },
  {
    speaker: "gustave",
    text: "Sacrilège ! Il n'y a pas un seul grain de sel de Guérande dans cette cuisine ! Comment suis-je censé travailler dans ces conditions ?",
  },
  {
    speaker: "elodie",
    text: "Gustave, je vous présente notre nouveau propriétaire. Vous savez, la personne qui a réellement de l'argent pour acheter votre sel.",
  },
  {
    speaker: "gustave",
    text: "Le Patron ! Enchanté ! Je suis Gustave, le vrai cœur battant de cet établissement. La légende locale de la sauce au poivre !",
  },
  {
    speaker: "elodie",
    text: "Et la légende locale des factures de beurre impayées…",
  },
  {
    speaker: "gustave",
    text: "Détails ! Mon plan est simple : nous créons le menu le plus divin de la région, et la gloire sera à nous !",
  },
  {
    speaker: "elodie",
    text: "Mon plan est plus réaliste : deux tables, la gazinière réparée, et des plats avec une marge positive. C'est là que vous intervenez, Patron.",
  },
  {
    speaker: "gustave",
    text: "Allez, Patron ! Ne l'écoutez pas, elle parle comme un tableau Excel. Construisez-moi une cuisine digne de ce nom, et je vous promets des miracles !",
    note: "Les deux se tournent vers vous…",
  },
  {
    speaker: "elodie",
    text: "La gloire ou le profit… C'est à vous de choisir par où commencer.",
    isLast: true,
  },
];

/* ─── Config des personnages ─────────────────────────── */
/* bubble : zone de texte sur la bulle dessinée dans l'image
   Coordonnées en % de la largeur/hauteur de l'image (ratio 16:9)

   Pour ajuster : modifier left/top/width/height jusqu'à
   ce que le texte soit centré dans la bulle blanche. */
const SPEAKERS = {
  elodie: {
    name: "Élodie",
    title: "Assistante de gestion",
    img: "/elodie.png",
    color: "#1c3352",
    nameColor: "#1c3352",
    // Bulle Élodie : haut-droit, queue en bas-gauche
    bubble: {
      left:   "45%",   // départ horizontal (% image)
      top:    "3%",    // départ vertical   (% image)
      width:  "52%",   // largeur zone texte
      height: "44%",   // hauteur zone texte
    },
  },
  gustave: {
    name: "Gustave",
    title: "Chef de cuisine",
    img: "/gustave.png",
    color: "#b85520",
    nameColor: "#b85520",
    // Bulle Gustave : haut-droit, queue en bas-gauche
    bubble: {
      left:   "43%",
      top:    "3%",
      width:  "54%",
      height: "44%",
    },
  },
};

/* ─── Composant ──────────────────────────────────────── */
export function IntroDialog({ onDone }) {
  const [step,     setStep]     = useState(0);
  const [visible,  setVisible]  = useState(false);
  const [textAnim, setTextAnim] = useState(true);
  const [imgKey,   setImgKey]   = useState(0); // force re-mount image à chaque changement de speaker

  const prevSpeaker = DIALOG[step > 0 ? step - 1 : 0].speaker;

  // Fade-in à l'ouverture
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  // Animation texte à chaque changement de réplique
  useEffect(() => {
    setTextAnim(false);
    const t = setTimeout(() => setTextAnim(true), 60);
    return () => clearTimeout(t);
  }, [step]);

  const line   = DIALOG[step];
  const sp     = SPEAKERS[line.speaker];
  const isLast = line.isLast || step === DIALOG.length - 1;
  const nextSp = !isLast ? SPEAKERS[DIALOG[step + 1]?.speaker] : null;

  const next = () => {
    if (isLast) {
      setVisible(false);
      setTimeout(onDone, 350);
      return;
    }
    // Si changement de personnage → animer l'image
    if (DIALOG[step + 1].speaker !== line.speaker) {
      setImgKey(k => k + 1);
    }
    setStep(s => s + 1);
  };

  const skip = (e) => {
    e.stopPropagation();
    setVisible(false);
    setTimeout(onDone, 350);
  };

  const bub = sp.bubble;

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
      {/* ── Bouton Passer ── */}
      <button
        onClick={skip}
        style={{
          position: "absolute", top: 14, right: 14,
          padding: "5px 14px",
          background: "rgba(255,255,255,0.1)",
          border: "1px solid rgba(255,255,255,0.2)",
          borderRadius: 20, color: "rgba(255,255,255,0.6)",
          fontSize: 11, cursor: "pointer", fontFamily: F.body,
          zIndex: 1,
        }}
      >
        Passer ›
      </button>

      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 860,
          display: "flex", flexDirection: "column", gap: 10,
        }}
      >
        {/* ── Badge personnage ── */}
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          opacity: textAnim ? 1 : 0,
          transform: textAnim ? "translateY(0)" : "translateY(-4px)",
          transition: "opacity 0.25s ease, transform 0.25s ease",
        }}>
          <div style={{
            width: 8, height: 8, borderRadius: "50%",
            background: sp.color,
            boxShadow: `0 0 8px ${sp.color}`,
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

        {/* ── Image + overlay bulle ── */}
        {/*
          Conteneur à ratio fixe 16:9 (paddingBottom=56.25%).
          L'image est position:absolute et remplit 100%.
          L'overlay texte est position:absolute avec % alignés sur la bulle.
        */}
        <div style={{
          position: "relative",
          width: "100%",
          paddingBottom: "56.25%",   /* ratio 16:9 — ajuster si images non-16:9 */
          borderRadius: 16,
          overflow: "hidden",
          background: "#111",        /* fond pendant chargement image */
        }}>
          {/* Image personnage */}
          <img
            key={`img-${line.speaker}-${imgKey}`}
            src={sp.img}
            alt={sp.name}
            style={{
              position: "absolute", inset: 0,
              width: "100%", height: "100%",
              objectFit: "cover",
              borderRadius: 16,
              animation: "introImgIn 0.32s ease both",
            }}
          />

          {/* ── Overlay texte dans la bulle ── */}
          <div
            style={{
              position: "absolute",
              left:   bub.left,
              top:    bub.top,
              width:  bub.width,
              height: bub.height,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              /* padding interne pour éviter les bords arrondis de la bulle */
              padding: "3% 5% 6%",
              pointerEvents: "none",
            }}
          >
            <p style={{
              margin: 0,
              /* clamp : 10px min · 1.55vw fluide · 14px max */
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
              {line.text}
            </p>
          </div>

          {/* Indicateur de tap */}
          <div style={{
            position: "absolute", bottom: 10, right: 14,
            fontSize: 11, color: "rgba(255,255,255,0.45)",
            fontFamily: F.body,
            animation: "tapPulse 2s ease-in-out infinite",
          }}>
            {isLast ? "" : "Toucher pour continuer ▶"}
          </div>
        </div>

        {/* ── Note de mise en scène ── */}
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

        {/* ── Barre de contrôles ── */}
        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "center", padding: "0 2px", marginTop: 2,
        }}>
          {/* Points de progression */}
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            {DIALOG.map((d, i) => {
              const isCurrent = i === step;
              const isDone    = i < step;
              const dot       = SPEAKERS[d.speaker];
              return (
                <div key={i} style={{
                  width:  isCurrent ? 16 : 6,
                  height: 6,
                  borderRadius: 99,
                  background: isCurrent
                    ? dot.color
                    : isDone
                      ? dot.color + "66"
                      : "rgba(255,255,255,0.18)",
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
                {nextSp.name} répond…
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
              {isLast ? "🍽 Commencer !" : "Suivant →"}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes introImgIn {
          from { opacity: 0; transform: scale(1.03); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes tapPulse {
          0%,100% { opacity: 0.45; }
          50%      { opacity: 0.9; }
        }
      `}</style>
    </div>
  );
}
