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
   DIALOGUE 3 — Tutoriel : L'onglet Serveurs
═══════════════════════════════════════════════════════ */
const SERVERS_DIALOG = [
  {
    speaker: "elodie",
    section: "Brigade et Burnout",
    text: "Parlons ressources humaines. Pour l'instant, nous avons 2 serveurs — le strict minimum pour ne pas ressembler à un self-service. D'autres slots se débloqueront avec le niveau du restaurant.",
  },
  {
    speaker: "gustave",
    text: "Mes plats sont des poèmes, Patron ! Il faut des messagers dignes de ce nom pour les porter. Mais regardez-les… ils ont l'air fatigués.",
  },
  {
    speaker: "elodie",
    text: "C'est normal, Gustave. Un serveur actif perd 1 point de moral toutes les 5 minutes. S'ils tombent sous 10, c'est le 💀 Burnout : inutiles et indisponibles. Seuls les serveurs au moral solide sont assignés automatiquement.",
  },
  {
    speaker: "gustave",
    text: "Sacrilège ! On ne peut pas servir un homard avec une mine déconfite ! Qu'ils fassent des pauses pour que leur moral remonte. Un artiste a besoin de repos !",
  },
  {
    speaker: "elodie",
    text: "Et le propriétaire a besoin d'économies. Les serveurs sont payés toutes les heures réelles, mais seulement s'ils sont actifs. En pause ou au repos, ils ne coûtent rien. C'est le moment d'être un manager efficace.",
  },
  {
    speaker: "gustave",
    section: "Formation et Évolution",
    text: "Et si on les transformait en véritables maîtres ? Sommellerie, Prestige VIP, Rapidité pour qu'ils courent aussi vite que mon inspiration !",
  },
  {
    speaker: "elodie",
    text: "Les formations en Accueil ou en Bien-être sont aussi cruciales. Elles améliorent leurs spécialités et augmentent leur moral maximal. Plus ils sont formés, moins ils craquent.",
  },
  {
    speaker: "gustave",
    text: "L'expérience, Patron ! À chaque encaissement, ils gagnent de l'XP. Et plus ils montent de niveau, plus les clients sont généreux sur les pourboires.",
  },
  {
    speaker: "elodie",
    text: "En résumé : gérez leur fatigue, investissez dans leur formation, et surveillez votre masse salariale. À vous de jouer, Patron.",
    isLast: true,
  },
];

/* ═══════════════════════════════════════════════════════
   DIALOGUE 4 — Tutoriel : L'onglet Menu
═══════════════════════════════════════════════════════ */
const MENU_DIALOG = [
  {
    speaker: "elodie",
    section: "L'Alchimie du Menu",
    text: "Patron, il est temps de structurer notre offre. Nous avons trois leviers : la 📋 Carte pour les plats individuels, les 🍽 Formules pour les combos stratégiques, et les 🎨 Thèmes pour donner une ambiance globale à notre cuisine.",
  },
  {
    speaker: "gustave",
    text: "Et surtout, la liberté ! Je viens de doubler le prix de mon Homard Thermidor. L'art n'a pas de prix, n'est-ce pas ?",
  },
  {
    speaker: "elodie",
    text: "L'art a un prix que le client accepte de payer, Gustave. Patron, vous pouvez ajuster les prix sur chaque fiche. Notez bien que les nouveaux tarifs s'appliquent uniquement aux prochaines commandes. On ne change pas l'addition d'un client qui est déjà en train de manger !",
  },
  {
    speaker: "gustave",
    text: "Regardez, j'ai aussi cliqué sur ce petit bouton ⏸. Ma Soupe à l'Oignon me barbait ce matin, alors je l'ai mise en pause. Disparue ! Envolée !",
  },
  {
    speaker: "elodie",
    text: "Exactement. Le bouton ⏸ désactive le plat : il reste dans nos archives, mais les clients ne le commanderont plus. C'est pratique pour gérer les stocks... ou les caprices du Chef.",
  },
  {
    speaker: "gustave",
    text: "Et regardez ce magnifique Badge 🔥 ! C'est la consécration ! Mon Filet Mignon est la star du quartier !",
  },
  {
    speaker: "elodie",
    text: "Ce badge récompense le score composé. Pour l'obtenir, le Patron doit jongler entre : 40% de marge brute (l'argent qui reste en caisse), 40% de popularité (le plaisir des clients), 20% de disponibilité (avoir les ingrédients en stock).",
  },
  {
    speaker: "gustave",
    text: "Marge, stock... Vous parlez comme une épicière ! Patron, cherchez le feu ! Cherchez le 🔥 ! C'est lui qui fera de nous des rois !",
  },
  {
    speaker: "elodie",
    text: "Et c'est la marge qui nous permettra de payer le gaz pour vos fourneaux. À vous de fixer les priorités, Patron.",
    isLast: true,
  },
];

/* ═══════════════════════════════════════════════════════
   DIALOGUE 5 — Tutoriel : L'onglet Cuisine
═══════════════════════════════════════════════════════ */
const KITCHEN_DIALOG = [
  {
    speaker: "gustave",
    section: "Le Feu Sacré... et la Rigueur",
    text: "Regardez-moi cette bête, Patron ! Elle n'attend que mon talent. Pour lancer la magie, il suffit de cliquer sur un plat ou sur « Tout démarrer » pour embraser tous les brûleurs d'un coup !",
  },
  {
    speaker: "elodie",
    text: "C'est surtout une question d'optimisation d'espace. Un brûleur vide est un brûleur qui nous coûte de l'argent. Remplissez les feux libres, mais ne vous laissez pas déborder par votre ego, Gustave.",
  },
  {
    speaker: "gustave",
    text: "Déborder ? Jamais ! Dès que le petit ✅ PRÊT s'affiche sur chaque plat d'une même commande, c'est l'heure du spectacle ! On clique sur 🍽 Servir et la salle s'illumine de saveurs !",
  },
  {
    speaker: "elodie",
    text: "Et surtout, le client passe en phase repas, ce qui nous rapproche enfin du moment où il paye l'addition. C'est l'étape cruciale.",
  },
  {
    speaker: "gustave",
    text: "C'est aussi l'étape de ma gloire personnelle ! Chaque plat envoyé me rapporte +12 XP. Je deviens chaque jour plus légendaire !",
  },
  {
    speaker: "elodie",
    text: "N'oubliez pas vos commis, Gustave. Ils ne font pas ça pour la gloire, mais ils apprennent à vos côtés. Ils gagnent 40% de votre expérience. S'ils progressent, l'établissement progresse.",
  },
  {
    speaker: "gustave",
    text: "40% ? C'est généreux ! Allez, Patron, assez de théorie ! Les brûleurs sont froids, les clients ont faim et mon talent trépigne d'impatience... On lance la première commande ?",
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

export function ServersDialog({ onDone }) {
  return (
    <DialogScene
      dialogData={SERVERS_DIALOG}
      ctaLabel="Gérer l'équipe !"
      onDone={onDone}
    />
  );
}

export function MenuDialog({ onDone }) {
  return (
    <DialogScene
      dialogData={MENU_DIALOG}
      ctaLabel="On compose la carte !"
      onDone={onDone}
    />
  );
}

export function KitchenDialog({ onDone }) {
  return (
    <DialogScene
      dialogData={KITCHEN_DIALOG}
      ctaLabel="On allume les feux !"
      onDone={onDone}
    />
  );
}
