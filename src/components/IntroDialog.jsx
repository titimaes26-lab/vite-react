/* ═══════════════════════════════════════════════════════
   src/components/IntroDialog.jsx
   Dialogues d'introduction et tutoriels — Élodie & Gustave

   IMAGES attendues dans /public/ :
     /elodie.png   — ratio 16:9  (~1400×788)
     /gustave.png  — ratio 16:9  (~1400×788)
═══════════════════════════════════════════════════════ */
import { useState, useEffect } from "react";
import { C, F } from "../constants/gameData.js";

/* ─── Config des personnages ─────────────────────────── */
const SPEAKERS = {
  elodie: {
    name: "Élodie",
    title: "Assistante de gestion",
    img: "/elodie.png",
    color: "#1c3352",
    bubble: { left: "45%", top: "3%", width: "52%", height: "44%" },
  },
  gustave: {
    name: "Gustave",
    title: "Chef de cuisine",
    img: "/gustave.png",
    color: "#b85520",
    bubble: { left: "43%", top: "3%", width: "54%", height: "44%" },
  },
};

/* ═══════════════════════════════════════════════════════
   DIALOGUE 1 — Introduction
═══════════════════════════════════════════════════════ */
const INTRO_DIALOG = [
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

/* ═══════════════════════════════════════════════════════
   DIALOGUE 2 — Tutoriel : L'onglet Tables
═══════════════════════════════════════════════════════ */
const TABLES_DIALOG = [
  {
    speaker: "elodie",
    section: "L'Art de l'Accueil",
    text: "Patron, ouvrez l'onglet Tables. C'est ici que la théorie rencontre la réalité du terrain. Les clients arrivent en groupes toutes les 30 secondes — avec 65 % de chance de franchir la porte.",
  },
  {
    speaker: "gustave",
    text: "Et quand ils entrent, c'est pour l'extase ! Mais voyez cette barre de patience ? Si elle vire au rouge et tombe à zéro, ils partent… et mon génie est gaspillé sur des ingrats qui n'ont pas su attendre !",
  },
  {
    speaker: "elodie",
    text: "Surtout, ils partent sans payer. Pour éviter ce drame : cliquez sur une table pour ouvrir son panneau de détails. C'est votre tour de contrôle.",
  },
  {
    speaker: "elodie",
    section: "Le Cycle du Service",
    text: "Le processus est une horloge suisse. Le serveur prend la commande, puis dès que vous servez les assiettes, la table passe en mode 🍴 Repas.",
  },
  {
    speaker: "gustave",
    text: "C'est le moment sacré ! Le silence de la dégustation… interrompu uniquement par le bruit des couverts.",
  },
  {
    speaker: "elodie",
    text: "Puis vient le moment que je préfère : l'encaissement. Mais ne vous reposez pas ! Un serveur doit nettoyer la table avant qu'un nouveau groupe puisse s'installer.",
  },
  {
    speaker: "gustave",
    section: "Optimisation de l'Espace",
    text: "Patron, j'ai des visions de banquets royaux ! Deux chaises, c'est pour les rendez-vous timides. Il nous faut de la place pour la grandeur !",
  },
  {
    speaker: "elodie",
    text: "Pour une fois, il n'a pas tort. Sur chaque table libre, un bouton permet d'augmenter la capacité. Plus de sièges = des groupes plus grands = plus de chiffre d'affaires.",
  },
  {
    speaker: "elodie",
    text: "Gardez un œil sur l'espace : les groupes qui arrivent ne dépasseront jamais votre capacité maximale. Des tables de deux seulement ? Vous raterez les grandes tablées qui rapportent gros.",
  },
  {
    speaker: "gustave",
    text: "Allez, Patron ! Poussez les murs, installez du monde, et laissez-moi les éblouir !",
    isLast: true,
  },
];

/* ═══════════════════════════════════════════════════════
   COMPOSANT GÉNÉRIQUE — DialogScene
═══════════════════════════════════════════════════════ */
function DialogScene({ dialogData, ctaLabel = "Compris !", onDone }) {
  const [step,     setStep]     = useState(0);
  const [visible,  setVisible]  = useState(false);
  const [textAnim, setTextAnim] = useState(true);
  const [imgKey,   setImgKey]   = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    setTextAnim(false);
    const t = setTimeout(() => setTextAnim(true), 60);
    return () => clearTimeout(t);
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
        Passer ›
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
              padding: "3% 5% 6%",
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
              {line.text}
            </p>
          </div>

          {/* Hint tap */}
          <div style={{
            position: "absolute", bottom: 10, right: 14,
            fontSize: 11, color: "rgba(255,255,255,0.45)",
            fontFamily: F.body,
            animation: "tapPulse 2s ease-in-out infinite",
          }}>
            {!isLast && "Toucher pour continuer ▶"}
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
              {isLast ? `✅ ${ctaLabel}` : "Suivant →"}
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
export function IntroDialog({ onDone }) {
  return (
    <DialogScene
      dialogData={INTRO_DIALOG}
      ctaLabel="Commencer !"
      onDone={onDone}
    />
  );
}

export function TablesDialog({ onDone }) {
  return (
    <DialogScene
      dialogData={TABLES_DIALOG}
      ctaLabel="À table !"
      onDone={onDone}
    />
  );
}
