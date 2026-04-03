/* ═══════════════════════════════════════════════════════
   src/components/IntroDialog.jsx
   Dialogue d'introduction — Élodie & Gustave
   Affiché une seule fois au premier lancement du jeu.
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
    text: "Sacrilège ! Élodie ! Il n'y a pas un seul grain de sel de Guérande dans cette cuisine ! Comment suis-je censé travailler dans ces conditions ?",
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
    text: "Détails ! Patron, mon plan est simple : nous créons le menu le plus divin de la région, et la gloire sera à nous !",
  },
  {
    speaker: "elodie",
    text: "Mon plan est plus réaliste : nous achetons deux tables, réparons la gazinière qui fuit, et vendons des plats avec une marge positive. C'est là que vous intervenez, Patron.",
  },
  {
    speaker: "gustave",
    text: "Allez, Patron ! Ne l'écoutez pas, elle parle comme un tableau Excel. Faites-moi confiance : construisez-moi une cuisine digne de ce nom, et je vous promets des miracles !",
    note: "Les deux se tournent vers vous…",
  },
  {
    speaker: "elodie",
    text: "La gloire ou le profit… C'est à vous de choisir par où commencer.",
    isLast: true,
  },
];

/* ─── Config des personnages ─────────────────────────── */
const SPEAKERS = {
  elodie: {
    name: "Élodie",
    title: "Assistante de gestion",
    img: "/elodie.png",
    color: "#1c3352",
    accent: "#e8eef5",
    // Position de la bulle dans l'image (% du conteneur image)
    bubble: { top: "4%", right: "2%", width: "46%", height: "52%" },
    textPad: "22% 10% 10% 10%",
  },
  gustave: {
    name: "Gustave",
    title: "Chef de cuisine",
    img: "/gustave.png",
    color: "#b85520",
    accent: "#f5ede8",
    bubble: { top: "3%", right: "2%", width: "49%", height: "51%" },
    textPad: "18% 10% 10% 10%",
  },
};

/* ─── Composant ──────────────────────────────────────── */
export function IntroDialog({ onDone }) {
  const [step, setStep]       = useState(0);
  const [visible, setVisible] = useState(false);
  const [textAnim, setTextAnim] = useState(true);

  // Fade-in à l'ouverture
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  // Animation texte à chaque changement de réplique
  useEffect(() => {
    setTextAnim(false);
    const t = setTimeout(() => setTextAnim(true), 50);
    return () => clearTimeout(t);
  }, [step]);

  const line   = DIALOG[step];
  const sp     = SPEAKERS[line.speaker];
  const isLast = step === DIALOG.length - 1;

  const next = () => {
    if (isLast) {
      setVisible(false);
      setTimeout(onDone, 350);
    } else {
      setStep(s => s + 1);
    }
  };

  return (
    <div
      onClick={next}
      style={{
        position: "fixed", inset: 0, zIndex: 99999,
        background: "rgba(10,8,6,0.88)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
        opacity: visible ? 1 : 0,
        transition: "opacity 0.35s ease",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 860,
          display: "flex", flexDirection: "column", gap: 12,
        }}
      >
        {/* ── Image du personnage + bulle ── */}
        <div style={{ position: "relative", width: "100%", borderRadius: 16, overflow: "hidden" }}>
          <img
            src={sp.img}
            alt={sp.name}
            key={line.speaker} // re-mount pour animation sur changement
            style={{
              width: "100%", display: "block",
              borderRadius: 16,
              animation: "introImgIn 0.3s ease both",
            }}
          />

          {/* Overlay texte sur la bulle dessinée dans l'image */}
          <div
            style={{
              position: "absolute",
              top: sp.bubble.top,
              right: sp.bubble.right,
              width: sp.bubble.width,
              height: sp.bubble.height,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: sp.textPad,
              pointerEvents: "none",
            }}
          >
            {/* Nom du personnage */}
            <div style={{
              fontSize: 11,
              fontWeight: 800,
              color: sp.color,
              fontFamily: F.title,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: 6,
              opacity: textAnim ? 1 : 0,
              transition: "opacity 0.2s ease",
            }}>
              {sp.name} · <span style={{ fontWeight: 500, fontSize: 10 }}>{sp.title}</span>
            </div>

            {/* Texte du dialogue */}
            <div style={{
              fontSize: 13,
              color: "#18130e",
              fontFamily: F.body,
              lineHeight: 1.55,
              textAlign: "center",
              opacity: textAnim ? 1 : 0,
              transform: textAnim ? "translateY(0)" : "translateY(4px)",
              transition: "opacity 0.25s ease, transform 0.25s ease",
            }}>
              {line.text}
            </div>

            {/* Note de mise en scène */}
            {line.note && (
              <div style={{
                marginTop: 8,
                fontSize: 10,
                color: "#a0917a",
                fontFamily: F.body,
                fontStyle: "italic",
                opacity: textAnim ? 1 : 0,
                transition: "opacity 0.3s ease 0.1s",
              }}>
                ✦ {line.note}
              </div>
            )}
          </div>
        </div>

        {/* ── Barre de contrôles ── */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0 2px",
        }}>
          {/* Points de progression */}
          <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
            {DIALOG.map((d, i) => {
              const isCurrent = i === step;
              const isDone    = i < step;
              const spDot     = SPEAKERS[d.speaker];
              return (
                <div key={i} style={{
                  width:  isCurrent ? 14 : 6,
                  height: 6,
                  borderRadius: 99,
                  background: isCurrent
                    ? spDot.color
                    : isDone
                      ? spDot.color + "55"
                      : "rgba(255,255,255,0.2)",
                  transition: "all 0.3s ease",
                }} />
              );
            })}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Indicateur prochain personnage */}
            {!isLast && (
              <div style={{
                fontSize: 10,
                color: "rgba(255,255,255,0.4)",
                fontFamily: F.body,
              }}>
                {SPEAKERS[DIALOG[step + 1]?.speaker]?.name} parle ensuite…
              </div>
            )}

            {/* Bouton Suivant / Commencer */}
            <button
              onClick={next}
              style={{
                padding: "11px 26px",
                background: isLast
                  ? `linear-gradient(135deg, ${C.green}, #2d7a50)`
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

        {/* Hint tap */}
        <div style={{
          textAlign: "center",
          fontSize: 10,
          color: "rgba(255,255,255,0.28)",
          fontFamily: F.body,
          marginTop: -4,
        }}>
          Appuyez n'importe où pour avancer
        </div>
      </div>

      <style>{`
        @keyframes introImgIn {
          from { opacity: 0; transform: translateX(10px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
