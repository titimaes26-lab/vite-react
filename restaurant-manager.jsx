import { useState, useEffect, useCallback, useRef } from "react";

/* ═══════════════════════════════════════════════════════
   Imports modulaires — extraits du monolithe original
   Chaque module est indépendant et testable unitairement.
═══════════════════════════════════════════════════════ */

// ── Données statiques ──────────────────────────────────
import {
  C, F,
  SRV_LVL, CHEF_LVL, CHEF_XP_CAP, COMMIS_LVL, COMMIS_XP_CAP,
  RESTO_LVL, SERVER_SLOTS_BY_LEVEL, CAP_UPGRADES,
  MOODS, NAMES1, NAMES2,
  TABLES0, SERVERS0, STOCK0, MENU0, COMPLAINTS0, KITCHEN0,
  KITCHEN_UPGRADES, SUPPLIERS, LOAN_OPTIONS,
  CHALLENGES_POOL, OBJECTIVES_DEF, SERIES_LABELS, SERIES_COLORS,
  GAME_EVENTS, TABS,
} from "./src/constants/gameData.js";

import {
  REP_THRESHOLDS, REP_DELTA, MENU_THEMES, FORMULA_PRESETS,
  MORAL_PAUSE_GAIN, getRepTier,
} from "./src/constants/gameConstants.js";

// ── Logique pure ───────────────────────────────────────
import {
  srvLv, chefLv, chefLvData, commisLv, commisLvData, restoLv,
  dishCookTime, dishCookTimeWithUpgrades,
  calcRating, ratingColor, ratingStars,
  calcTip, srvXpFromCheckout, restoXpFromCheckout,
} from "./src/utils/levelUtils.js";

import {
  pick, rName, rMood, rSize, pickSeeded,
  generateOrder, generateOrderWithSpecials,
} from "./src/utils/randomUtils.js";

import {
  consumeStock, buildKitchenTickets,
  svcDuration, eatDuration, calcBill, quickAmounts,
} from "./src/utils/orderUtils.js";

// ── Hooks métier ───────────────────────────────────────
import { useGameClock }   from "./src/hooks/useGameClock.js";
import { useSpawner }     from "./src/hooks/useSpawner.js";
import { useExpiry }      from "./src/hooks/useExpiry.js";
import { useSalary }      from "./src/hooks/useSalary.js";
import { useDeliveries }  from "./src/hooks/useDeliveries.js";
import { useEvents }      from "./src/hooks/useEvents.js";
import { useServerMoral } from "./src/hooks/useServerMoral.js";
import { useFreshness }   from "./src/hooks/useFreshness.js";
import { useChallenges }  from "./src/hooks/useChallenges.js";
import { useObjectives }  from "./src/hooks/useObjectives.js";

// ── Composants UI ──────────────────────────────────────
import { Badge, Card, Btn, Inp, Sel, Lbl, XpBar, Modal } from "./src/components/ui/index.js";
import { Toasts } from "./src/components/system/Toasts.jsx";

// ── Vues ───────────────────────────────────────────────
import { TablesView }     from "./src/views/TablesView.jsx";
import { ServersView }    from "./src/views/ServersView.jsx";
import { KitchenView }    from "./src/views/KitchenView.jsx";
import { MenuView }       from "./src/views/MenuView.jsx";
import { StockView }      from "./src/views/StockView.jsx";
import { ComplaintsView } from "./src/views/ComplaintsView.jsx";
import { StatsView }      from "./src/views/StatsView.jsx";
import { ObjectivesView } from "./src/views/ObjectivesView.jsx";

/* ─── Sauvegarde localStorage ─────────────────────────── */
const SAVE_KEY = "resto_save_v1";

const saveToLocalStorage = (state) => {
    if (!window.localStorage) {
        console.error("LocalStorage non supporté sur ce navigateur");
        return;
    }
    try {
        const payload = JSON.stringify({
            ...state,
            savedAt: Date.now()
        });
        window.localStorage.setItem(SAVE_KEY, payload);
    } catch (error) {
        if (error.name === 'QuotaExceededError') {
            alert("Espace de stockage saturé sur la tablette !");
        } else {
            console.warn("Erreur de sauvegarde :", error);
        }
    }
};

const saveGame = (state) => saveToLocalStorage(state);

const loadGame = async () => {
    try {
        if (!window.localStorage) return null;
        const raw = window.localStorage.getItem(SAVE_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch(e) { return null; }
};

// resetGame est appelé depuis l'intérieur du composant App
// pour pouvoir réinitialiser les états React sans reload

/* ─── Pont de communication React ↔ GDevelop ──────────── */
// Envoie un message structuré au parent (GDevelop via iframe)
const sendToGDevelop = (payload) => {
  try {
    window.parent.postMessage({ source: "react-ui", payload }, "*");
  } catch(e) {
    console.warn("[GDevelop Bridge] postMessage échoué :", e);
  }
};

// Construit le payload standardisé depuis les états React
const buildGDevelopPayload = ({
  cash, restoXp, stock, queue, waitlist, tables, kitchen, objStats, servers, dailyStats,
  reputation, transactions, loan, pendingDeliveries, menu, complaints, supplierMode,
  formulas, dailySpecials, challengeDate,
  completedIds, pendingClaim, todayChallenges, challengeProgress,
  challengeClaimed, challengeLostToday, activeTheme, activeEvent,
}) => {
  const rl       = restoLv(restoXp);
  const cl       = chefLv(kitchen?.chef?.totalXp || 0);
  const themeObj = MENU_THEMES.find(t => t.id === activeTheme) || MENU_THEMES[0];
  return {
    argent: cash,
    niveaux: {
      restaurant: {
        niveau    : rl.l,
        nom       : RESTO_LVL[rl.l]?.name || "",
        xp        : restoXp,
        xpProchain: rl.next?.xpNeeded || 0,
        pct       : rl.pct,
      },
      chef: {
        niveau  : cl.l,
        nom     : CHEF_LVL[Math.min(cl.l, CHEF_LVL.length-1)]?.name || "",
        prenom  : kitchen?.chef?.name || "",
        xp      : kitchen?.chef?.totalXp || 0,
        vitesse : CHEF_LVL[Math.min(cl.l, CHEF_LVL.length-1)]?.speed || 1,
        salaire : kitchen?.chef?.salary || 0,
      },
      serveurs: (servers || []).map(s => {
        const sl = srvLv(s.totalXp);
        return {
          id           : s.id,
          nom          : s.name,
          niveau       : sl.l,
          xp           : s.totalXp,
          statut       : s.status,
          salaire      : s.salary,
          moral        : s.moral ?? 100,
          note         : s.rating ?? 0,
          specialite   : s.specialty ? { id: s.specialty.id, nom: s.specialty.name } : null,
          serviceJusqua: s.serviceUntil || null,
          nettoyageJusqua: s.cleanUntil || null,
        };
      }),
      commis: (kitchen?.commis || []).map(c => {
        const cLv = commisLv(c.totalXp);
        return { id: c.id, nom: c.name, niveau: cLv.l, xp: c.totalXp, statut: c.status, salaire: c.salary };
      }),
    },
    inventaire: (stock || []).map(s => ({
      id: s.id, nom: s.name, quantite: s.qty, unite: s.unit,
      alerte: s.qty <= s.alert, prix: s.price, categorie: s.cat,
    })),
    menu: (menu || []).map(m => ({
      id: m.id, nom: m.name, prix: m.price, categorie: m.cat,
      actif: m.active !== false, special: m.isSpecial || false,
    })),
    formules: (formulas || []).map(f => ({
      id: f.id, nom: f.name, actif: f.active, remise: f.discount,
    })),
    platsSpeciaux: (dailySpecials || []).map(s => ({
      id: s.id, nom: s.name, prix: s.price, categorie: s.cat,
    })),
    clients: {
      enAttente      : (queue || []).length,
      enRappel       : (waitlist || []).length,
      tablesOccupees : (tables || []).filter(t => t.status === "occupée" || t.status === "mange").length,
      tablesLibres   : (tables || []).filter(t => t.status === "libre").length,
      tablesNettoyage: (tables || []).filter(t => t.status === "nettoyage").length,
      totalServis    : objStats?.totalServed    || 0,
      totalPerdus    : (dailyStats || []).reduce((s, d) => s + (d.lost || 0), 0),
      chiffreAffaires: objStats?.totalRevenue   || 0,
    },
    tables: (tables || []).map(t => ({
      id      : t.id,
      nom     : t.name,
      statut  : t.status,
      capacite: t.capacity,
      serveur : t.server || null,
      groupe  : t.group ? { taille: t.group.size, nom: t.group.name, humeur: t.group.mood?.l, vip: t.group.isVIP || false } : null,
      commande: (t.order || []).length,
      nettoyageJusqua: t.cleanUntil || null,
      serveurNettoyage: t.cleanServer || null,
    })),
    cuisine: {
      platsEnCuisson : (kitchen?.cooking || []).length,
      platsEnAttente : (kitchen?.queue   || []).length,
      platsPretsNb   : (kitchen?.done    || []).length,
      totalCuisines  : kitchen?.totalDishes || 0,
      ameliorations  : kitchen?.upgrades || {},
    },
    timers: (kitchen?.cooking || []).map(d => ({
      id      : String(d.id),
      finishAt: d.startedAt + d.timerMax * 1000,
      label   : d.name + (d.tableName ? " · " + d.tableName : ""),
      tableId : d.tableId || null,
      cat     : d.cat || "",
    })),
    platsPretsAServir: (kitchen?.done || []).map(d => ({
      id: String(d.id), nom: d.name, tableId: d.tableId, tableName: d.tableName || "", cat: d.cat || "",
    })),
    reputation,
    transactions   : (transactions || []).slice(0, 50),
    pret           : loan,
    livraisons     : (pendingDeliveries || []).map(d => ({
      id: d.id, nom: d.name, quantite: d.qty, arriveeAt: d.arrivesAt,
    })),
    plaintes: (complaints || []).slice(0, 20).map(c => ({
      id: c.id, message: c.message, date: c.date,
    })),
    fournisseur: supplierMode || "premium",
    objectifs: {
      completedIds,
      pendingClaim,
      stats       : objStats,
      defisJour   : (todayChallenges || []).map(ch => ({
        id: ch.id, titre: ch.title, icone: ch.icon,
        recompense: ch.reward,
        reclame   : !!(challengeClaimed || {})[ch.id],
      })),
      dateDefis   : challengeDate || "",
      progression : challengeProgress,
      clientPerduAujourdhui: challengeLostToday,
    },
    statsJournalieres: dailyStats,
    theme: {
      id       : themeObj.id,
      nom      : themeObj.name,
      prixMult : themeObj.priceMult,
      repBonus : themeObj.repBonus,
      xpMult   : themeObj.xpMult,
    },
    evenement    : activeEvent,
    // Données brutes prêtes à renvoyer via INIT pour restaurer l'état React
    saveData: {
      argent             : cash,
      restoXp,
      stock,
      servers,
      tables,
      kitchen,
      objStats,
      dailyStats,
      completedIds,
      challengeProgress,
      challengeClaimed,
      challengeLostToday,
      loan,
      reputation,
      transactions,
      pendingDeliveries,
      pendingClaim,
      activeTheme,
      activeEvent,
    },
    savedAt      : Date.now(),
  };
};

// Nettoie les états liés aux timers qui ne sont plus valides après un rechargement
const sanitizeSave = (save) => {
  const now = Date.now();
  const savedTables = (save.tables || []).map(t => {
    if (t.status === "nettoyage") {
      // Si le timer est déjà démarré et expiré → libérer la table
      if (t.cleanUntil && now >= t.cleanUntil)
        return { ...t, status: "libre", server: null, cleanUntil: null, cleanDur: null, cleanServer: null, freedAt: now };
      // Sinon (en attente d'un serveur ou en cours) → conserver l'état
      return t;
    }
    if (t.status === "mange") return { ...t, eatUntil: null, eatDur: null };
    if (t.status === "occupée") return { ...t, svcUntil: null };
    return t;
  });
  // Merge avec TABLES0 pour garantir que toutes les tables existent
  const tables = TABLES0.map(t0 => savedTables.find(t => t.id === t0.id) || t0);
  const servers = (save.servers || []).map(s =>
    (s.status === "service" || s.status === "nettoyage")
      ? { ...s, status: "actif", serviceUntil: null, cleanUntil: null }
      : s
  );
  const kitchen = save.kitchen ? {
    ...save.kitchen,
    queue: [...(save.kitchen.queue || []), ...(save.kitchen.cooking || []).map(d => ({
      ...d, startedAt: undefined, timerMax: undefined
    }))],
    cooking: [],
    done: save.kitchen.done || [],
  } : null;
  const stock = (save.stock || STOCK0).map(item => ({
    ...item, freshness: item.freshness ?? 100,
  }));
  return { ...save, tables, servers, kitchen, stock, queue: [],
    candidatePool: save.candidatePool || [],
    candidateDate: save.candidateDate || "",
  };
};

/* ─── Palette ─────────────────────────────────────────── */


/* ─── XP / Level system ───────────────────────────────── */




/* ─── Spécialités serveurs ───────────────────────────── */
const SRV_SPECIALTIES = [
  { id:"speed",    icon:"⚡", name:"Rapidité",     color:"#1c3352", desc:"−30% temps de prise de commande",  tipMult:1.0,  speedMult:0.70 },
  { id:"charm",    icon:"✨", name:"Charme",        color:"#6b3fa0", desc:"Pourboires +20%",                  tipMult:1.20, speedMult:1.0  },
  { id:"sommelier",icon:"🍷", name:"Sommelier",     color:"#c4622d", desc:"Boissons commandées +30%",         tipMult:1.10, speedMult:1.0  },
  { id:"vip",      icon:"🎩", name:"Gestion VIP",   color:"#b87d10", desc:"Patience clients VIP +30s",        tipMult:1.15, speedMult:1.0  },
];
const pickSpecialty = () => SRV_SPECIALTIES[Math.floor(Math.random()*SRV_SPECIALTIES.length)];

/* ─── Catalogue de formations serveurs ───────────────── */
const TRAINING_CATALOG = [
  {
    id:"accueil", icon:"🤝", name:"Accueil & Relation client",
    color:C.purple,
    desc:"Améliore la satisfaction client et les pourboires.",
    levels:[
      { l:1, name:"Initiation",  cost:80,  xp:40,  moralBonus:5,  effect:"Pourboires +5%",       specialtyId:"charm",   desc:"Introduction aux techniques d'accueil." },
      { l:2, name:"Avancé",     cost:180, xp:100, moralBonus:8,  effect:"Pourboires +12%",      specialtyId:"charm",   desc:"Gestion des situations délicates et fidélisation." },
      { l:3, name:"Expert",     cost:350, xp:200, moralBonus:15, effect:"Pourboires +20% + Moral max", specialtyId:"charm", desc:"Maîtrise complète de l'expérience client." },
    ]
  },
  {
    id:"service", icon:"⚡", name:"Rapidité & Efficacité",
    color:C.navy,
    desc:"Réduit les temps de prise de commande.",
    levels:[
      { l:1, name:"Initiation",  cost:70,  xp:35,  moralBonus:0,  effect:"Commandes −10%",        specialtyId:"speed",   desc:"Optimisation des déplacements en salle." },
      { l:2, name:"Avancé",     cost:160, xp:90,  moralBonus:5,  effect:"Commandes −20%",        specialtyId:"speed",   desc:"Gestion simultanée de plusieurs tables." },
      { l:3, name:"Expert",     cost:320, xp:180, moralBonus:10, effect:"Commandes −30% + XP×2", specialtyId:"speed",   desc:"Technique de service professionnel haute performance." },
    ]
  },
  {
    id:"sommellerie", icon:"🍷", name:"Sommellerie & Boissons",
    color:C.terra,
    desc:"Augmente les ventes et la qualité du service boissons.",
    levels:[
      { l:1, name:"Initiation",  cost:90,  xp:45,  moralBonus:5,  effect:"Ventes boissons +15%",  specialtyId:"sommelier", desc:"Bases de la dégustation et des accords mets-vins." },
      { l:2, name:"Avancé",     cost:200, xp:110, moralBonus:8,  effect:"Ventes boissons +25%",  specialtyId:"sommelier", desc:"Connaissance approfondie des crus et spiritueux." },
      { l:3, name:"Expert",     cost:400, xp:220, moralBonus:12, effect:"Ventes boissons +40%",  specialtyId:"sommelier", desc:"Certification sommelier — conseils personnalisés." },
    ]
  },
  {
    id:"prestige", icon:"🎩", name:"Gestion VIP & Prestige",
    color:C.amber,
    desc:"Optimise le service des clients importants.",
    levels:[
      { l:1, name:"Initiation",  cost:100, xp:50,  moralBonus:5,  effect:"Patience VIP +15s",     specialtyId:"vip",     desc:"Protocole de service haut de gamme." },
      { l:2, name:"Avancé",     cost:220, xp:120, moralBonus:10, effect:"Patience VIP +30s",     specialtyId:"vip",     desc:"Gestion des personnalités et critiques gastronomiques." },
      { l:3, name:"Expert",     cost:450, xp:240, moralBonus:15, effect:"Patience VIP +45s + XP×2", specialtyId:"vip",  desc:"Excellence absolue — label Palace." },
    ]
  },
  {
    id:"bienetre", icon:"🧘", name:"Bien-être & Gestion du stress",
    color:C.green,
    desc:"Améliore la résistance à la fatigue et le moral.",
    levels:[
      { l:1, name:"Initiation",  cost:60,  xp:30,  moralBonus:20, effect:"Moral max +10",         specialtyId:null,      desc:"Techniques de récupération rapide." },
      { l:2, name:"Avancé",     cost:130, xp:70,  moralBonus:35, effect:"Moral max +20 + drain −50%", specialtyId:null,  desc:"Gestion de la fatigue en service intensif." },
      { l:3, name:"Expert",     cost:280, xp:140, moralBonus:60, effect:"Moral plein + immunité burnout", specialtyId:null, desc:"Résilience professionnelle complète." },
    ]
  },
];
// Max moral bonus (cumul toutes formations bien-être)
const getMaxMoral = (sv) => {
  const bienetre = (sv.trainings||{})["bienetre"] || 0;
  return 100 + (bienetre>=1?10:0) + (bienetre>=2?10:0);
};



/* ─── HELP_SECTIONS ──────────────────────────────────────── */
const HELP_SECTIONS=[
  {
    icon:"⊞", title:"Tables",
    color:"#1e5c38",
    items:[
      {q:"Arrivée des clients",a:"Un nouveau groupe arrive toutes les 30 secondes (65 % de chance). La taille du groupe ne dépasse jamais la capacité maximale des tables libres. La file d'attente reste active même si vous changez d'onglet."},
      {q:"Humeur et patience",a:"🤩 Enthousiaste (45s, ×1.5 XP) · 😊 Détendu (35s) · 😐 Neutre (25s) · 😑 Pressé (18s) · 😤 Impatient (11s, ×0.6 XP). La barre de patience passe du vert au rouge — si elle atteint 0, le groupe part sans consommer."},
      {q:"Plan de salle / Vue grille",a:"Basculez entre le plan SVG et la vue grille via le bouton 🗺 / ⊞. Le plan montre toutes les tables avec leur statut coloré. Cliquez une table pour ouvrir son panneau de détail latéral."},
      {q:"Timeline de phases",a:"Chaque table affiche une barre de 4 segments : 🛎 Commande (bleu) → 🔥 Cuisine (orange) → 🍴 Repas (vert) → 🧹 Nettoyage (jaune). Chaque segment se remplit progressivement. La phase cuisine utilise le plat le plus long encore en cuisson."},
      {q:"Placement automatique",a:"Si une table libre et un serveur actif sont disponibles, cliquez sur ▶ Placer pour installer le groupe automatiquement. Sinon, utilisez la modale pour choisir table et serveur manuellement."},
      {q:"Prise de commande",a:"Le serveur prend la commande selon la taille du groupe : 30s (2p), 1 min (4p), 1m30 (6p). La carte affiche 🛎 avec un compte à rebours et la barre de phase se remplit."},
      {q:"Repas en cours",a:"Une fois les plats servis, la table passe en 🍴 repas. Le temps correspond aux ⅔ du plat le plus long. Le bouton Encaisser est verrouillé pendant ce délai."},
      {q:"Nettoyage",a:"Après l'encaissement, un serveur nettoie pendant 1 minute (réduit par l'amélioration Station de plonge). La table redevient libre automatiquement."},
      {q:"Agrandir une table",a:"Sur chaque table libre, un bouton permet d'augmenter la capacité : 2→4 couverts pour 800 €, puis 4→6 couverts pour 1 800 €. Des groupes plus grands arriveront ensuite."},
      {q:"File d'attente — rappel",a:"Si un groupe part avant d'être placé, il reste rappelable 2 minutes dans la liste d'attente. Cliquez ↩ Rappeler pour le remettre en tête de file avec +15s de patience."},
      {q:"Réorganiser la file",a:"Les boutons ↑↓ sur chaque ticket de la file permettent de prioriser les groupes. Un indicateur de backlog (temps total estimé) s'affiche en haut."},
    ]
  },
  {
    icon:"👤", title:"Serveurs",
    color:"#162d4a",
    items:[
      {q:"Équipe et slots",a:"Le restaurant démarre avec 2 serveurs. Des slots supplémentaires se débloquent avec le niveau du restaurant : 3 au Bistrot, 4 à la Brasserie, jusqu'à 8 au Palace."},
      {q:"Statuts",a:"Actif → disponible. En pause → indisponible, non payé. 🛎 En service → prend une commande ou nettoie. Seuls les serveurs actifs (moral > 10) sont assignés automatiquement."},
      {q:"Moral",a:"Le moral baisse de 1 point toutes les 5 minutes si le serveur est actif. Il remonte pendant les pauses. En dessous de 10 (💀 Burnout), le serveur n'est plus disponible. Utilisez 🎁 Prime 50€ pour remonter un moral bas."},
      {q:"Spécialités",a:"Débloquées au niveau 2 : ⚡ Rapidité (−30% temps commande), ✨ Charme (+20% pourboires), 🍷 Sommelier (+10% pourboires), 🎩 VIP (+15% pourboires). Améliorées au niveau 4."},
      {q:"Formations",a:"5 domaines de formation : Accueil, Rapidité, Sommellerie, Prestige VIP, Bien-être. Chaque domaine a 3 niveaux progressifs. Les formations améliorent les spécialités et le moral maximal."},
      {q:"Expérience et niveau",a:"Les serveurs gagnent de l'XP à chaque encaissement. 5 niveaux : 🎓 Stagiaire → 👑 Maître. Les pourboires augmentent aussi avec le niveau."},
      {q:"Salaire",a:"Les serveurs actifs sont payés toutes les heures réelles. En pause ou au repos, ils ne sont pas payés."},
    ]
  },
  {
    icon:"👨‍🍳", title:"Cuisine",
    color:"#b85520",
    items:[
      {q:"Piano de cuisine",a:"Le centre de l'onglet affiche un piano SVG avec N brûleurs. Les flammes s'animent en orange pendant la cuisson, passent au vert à 80% de progression, avec vapeur quand c'est presque prêt."},
      {q:"Tickets de commande",a:"Chaque table a un ticket ordonnable (boutons ↑↓). Le ticket change de couleur selon l'attente : 🟢 < 3 min · 🟡 3–5 min · 🔴 > 5 min. Un badge indique les tickets en retard."},
      {q:"Feux de cuisson",a:"4 feux de base + commis débloqués + améliorations Fourneau. Cliquez ▶ sur un plat ou « Tout démarrer » pour remplir les feux libres."},
      {q:"Temps de cuisson",a:"Réduit par le niveau du chef (×1.0 à ×3.0), les commis (+15% chacun) et l'amélioration Four professionnel (jusqu'à −50%)."},
      {q:"Servir une table",a:"Quand tous les plats d'une table sont prêts (✅ PRÊT), le bouton 🍽 Servir apparaît. La table passe en phase repas avant encaissement."},
      {q:"Chef et commis",a:"Le chef gagne +12 XP par plat. Les commis gagnent 40% de ce montant. 3 commis débloqués aux niveaux 2 et 4 du chef (niveaux 1, 2 et 3 selon l'avancement)."},
      {q:"Améliorations cuisine",a:"🔥 Fourneau (+1 feu, 3 niveaux) · 🏺 Four professionnel (−50% temps, 3 niveaux) · 🧊 Chambre froide (capacité stock ×3, 2 niveaux) · 🚿 Station de plonge (nettoyage −40s, 2 niveaux)."},
    ]
  },
  {
    icon:"📋", title:"Menu",
    color:"#5c2e96",
    items:[
      {q:"4 sous-onglets",a:"📋 Carte (plats actifs), 🍽 Formules (menus combinés), 🎨 Thèmes (modificateurs globaux), 📊 Performance (analyse de rentabilité)."},
      {q:"Prix dynamique",a:"Sur chaque carte, ajustez le prix : −10%, −5%, +5%, +10%, +20%. Le bouton ↺ réinitialise au prix de base. Les prix ajustés s'appliquent aux nouvelles commandes."},
      {q:"Activer / Désactiver",a:"Le bouton ⏸ retire un plat du menu sans le supprimer. Les plats désactivés ne sont plus commandés par les clients."},
      {q:"Score de rentabilité",a:"Chaque plat a un score composé : 40% marge brute + 40% popularité + 20% disponibilité stock. Badge 🔥 pour le plat le mieux noté."},
      {q:"Formules",a:"3 modèles : Menu Découverte (−12%, 3 services), Menu Express (−8%, 2 services), Menu Prestige (−15%, 4 services). Configurez les plats de chaque catégorie puis activez."},
      {q:"Thèmes",a:"🍺 Bistrot (×0.90 prix) · ⭐ Gastronomique (×1.15 prix, +5 rép, +20% XP) · 🌿 Saisonnier (+8 rép, +10% XP). Le thème actif s'applique à chaque encaissement."},
      {q:"Plats du jour",a:"2 plats aléatoires sont mis en avant chaque heure avec −20% de réduction. Ils apparaissent dans la file d'attente et dans l'onglet Tables."},
    ]
  },
  {
    icon:"📦", title:"Stocks",
    color:"#162d4a",
    items:[
      {q:"3 modes de vue",a:"⊞ Cartes (défaut, accordéon par catégorie), ☰ Liste (tableau compact), 📊 Graphique (barres horizontales triées par urgence). Triez par urgence, catégorie ou alphabétique."},
      {q:"Prévision rupture",a:"Le bloc 🔮 calcule combien de repas chaque ingrédient peut encore couvrir selon les recettes actives. Couleur : ✓ vert (>10 repas) · ⚠ orange (<10) · ⛔ rouge (<3 ou épuisé)."},
      {q:"Commander selon prévision",a:"Le bouton 🛒 Commander réapprovisionne automatiquement les 3 ingrédients les plus critiques jusqu'au niveau optimal, en tenant compte du fournisseur actif."},
      {q:"Fournisseurs",a:"⚡ Grossiste Premium : prix plein, livraison instantanée. 🚚 Fournisseur Local : −20% mais livraison en 2 minutes. Les livraisons en cours s'affichent avec une barre de progression."},
      {q:"Accordéon catégories",a:"Cliquez sur l'en-tête d'une catégorie pour la réduire ou l'agrandir. Le badge rouge indique combien d'alertes il y a dans chaque catégorie sans avoir à dérouler."},
      {q:"KPI inventaire",a:"4 métriques en haut : alertes stock, valeur totale de l'inventaire, ruptures prévues, nombre d'articles. Mis à jour en temps réel."},
    ]
  },
  {
    icon:"🎯", title:"Objectifs & Défis",
    color:"#a06c08",
    items:[
      {q:"Séries d'objectifs",a:"16 objectifs en 4 séries : Premiers pas, Croissance, Excellence, Légende. Chaque objectif complété donne des espèces et de l'XP restaurant. Cliquez Récupérer pour encaisser."},
      {q:"Défis quotidiens",a:"3 défis renouvelés chaque jour, tirés au sort selon la date. Catégories : clients servis, recettes, notes, rush express, service VIP, salle comble, pourboires. Récompenses immédiates."},
      {q:"Jalons de progression",a:"Une frise chronologique affiche 6 jalons clés (10 clients, 50 clients, 1k€, 5k€, 20k€, Palace). Les jalons atteints s'illuminent en or."},
      {q:"Badge et notifications",a:"Un badge rouge sur l'onglet Objectifs indique les récompenses prêtes + défis quotidiens complétés. Les toasts sont cliquables pour y accéder directement."},
    ]
  },
  {
    icon:"💰", title:"Finances",
    color:"#a06c08",
    items:[
      {q:"Caisse",a:"Le restaurant démarre avec 5 000 €. Affiché en vert (≥ 200 €) ou rouge (critique). Cliquez sur 💰 pour ouvrir le Grand Livre."},
      {q:"Résultat du jour",a:"Dans l'onglet Statistiques : revenus encaissés, dépenses du jour et résultat net. La masse salariale active (chef + commis + serveurs) est détaillée en €/h."},
      {q:"Grand livre",a:"Toutes les transactions avec résumé Recettes / Dépenses / Résultat net. Limité aux 200 dernières entrées."},
      {q:"Prêts bancaires",a:"3 options : Petit prêt (1 500€), Standard (4 000€), Grand prêt (9 000€). Remboursement automatique par mensualités horaires. Un seul prêt actif à la fois. Remboursement anticipé possible."},
      {q:"Salaires",a:"Débités automatiquement toutes les heures réelles. Seuls les personnels actifs sont payés. Les commis non débloqués ne sont pas comptés."},
    ]
  },
  {
    icon:"📊", title:"Statistiques",
    color:"#1e5c38",
    items:[
      {q:"Graphiques linéaires",a:"3 courbes SVG interactives : Revenus, Clients servis, Réputation. Passez la souris sur un point pour voir la valeur exacte. Un indicateur ↗/↘ montre la tendance vs j−1."},
      {q:"Période",a:"Sélecteur 3 jours / 5 jours pour zoomer ou élargir la vue."},
      {q:"Analyse financière",a:"Compte de résultat du jour (revenus, dépenses, résultat net), masse salariale active, camembert de répartition des revenus par catégorie de menu, panier moyen."},
      {q:"Réputation",a:"Jauge circulaire SVG avec palier actuel, effets sur les pourboires et le taux de spawn clients. Barre de progression vers le palier suivant."},
      {q:"Tableau journalier",a:"Les N derniers jours : clients servis, perdus, taux de service (barre colorée) et revenus. La ligne du jour est mise en avant."},
    ]
  },
  {
    icon:"⭐", title:"Réputation",
    color:"#5c2e96",
    items:[
      {q:"5 paliers",a:"💀 Désastreuse (0–19) · 😟 Dégradée (20–39) · 😐 Neutre (40–59) · 😊 Appréciée (60–79) · 🌟 Réputée (80+). Chaque palier modifie les pourboires et le taux d'arrivée des clients."},
      {q:"Gain de réputation",a:"★★★★★ +4 pts · ★★★★ +2 pts · ★★★ 0 pt · ★★ −4 pts · ★ −8 pts. Client VIP servi +6 pts. Bonus selon le thème de menu actif."},
      {q:"Perte de réputation",a:"Client perdu −3 pts · Plainte −5 pts · Amende inspection −6 pts · Passage inspection réussie +3 pts."},
      {q:"Effets en jeu",a:"Les pourboires et le taux de spawn clients sont multipliés par le modificateur du palier (×0.5 à ×1.25). Visible dans le header et l'onglet Statistiques."},
    ]
  },
  {
    icon:"⚠", title:"Plaintes",
    color:"#b85520",
    items:[
      {q:"Génération automatique",a:"Une plainte est générée automatiquement si la note est ≤ 2 étoiles lors d'un encaissement, ou en cas d'amende d'inspection sanitaire."},
      {q:"Liste des plaintes",a:"Triées de la plus récente à la plus ancienne. Badge ● NOUVEAU sur les plaintes non encore consultées. Priorités : haute (rouge), moyenne (orange), basse (bleu)."},
      {q:"Alerte header",a:"L'alerte 💬 indique le nombre de nouvelles plaintes. Cliquez dessus pour accéder directement à l'onglet — le badge disparaît après consultation."},
    ]
  },
  {
    icon:"🏆", title:"Niveau Restaurant",
    color:"#a06c08",
    items:[
      {q:"Progression",a:"Chaque encaissement ajoute de l'XP (modifié par l'humeur du groupe, le statut VIP et le thème de menu). La barre dans le header indique l'avancement."},
      {q:"Déblocage des tables",a:"☕ Café de quartier (3 tables) → 🍺 Bistrot (5) → 🍽 Brasserie (7) → ⭐ Restaurant (9) → 🌟 Grand Restaurant (11) → 👑 Palace (12 tables)."},
      {q:"Déblocage des serveurs",a:"Bistrot +1 slot (3 total) → Brasserie +1 (4) → Restaurant +1 (5) → Grand Restaurant +1 (6) → Palace +2 (8 serveurs maximum)."},
      {q:"Événements aléatoires",a:"Toutes les 4 minutes réelles : 🔍 Inspection sanitaire (amende ou bonus), ⚡ Rush inattendu (3 groupes ajoutés), 🧊 Panne frigo (stocks réduits), 🎩 Critique Michelin (client VIP)."},
    ]
  },
];

/* ─── BankModal (inliné — fichier supprimé du repo) ─────── */
function BankModal({onClose,cash,loan,setLoan,setCash,addTx,addToast}){
  const takeLoan=(opt)=>{
    if(loan){addToast({icon:"🏦",title:"Prêt en cours",msg:"Remboursez d'abord votre emprunt actuel.",color:C.red});return;}
    const totalDue=+(opt.amount*(1+opt.rate)).toFixed(2);
    setLoan({id:opt.id,label:opt.label,amount:opt.amount,remaining:totalDue,
      rate:opt.rate,takenAt:Date.now(),repayPerHour:opt.monthly});
    setCash(c=>+(c+opt.amount).toFixed(2));
    addTx("revenu",`Prêt bancaire — ${opt.label} (${opt.amount}€)`,opt.amount);
    addToast({icon:"🏦",title:`Prêt accordé — +${opt.amount} €`,
      msg:`Remboursement : ${opt.monthly}€/h · Total : ${totalDue}€`,color:C.navy,tab:"stats"});
    onClose();
  };
  const repayNow=()=>{
    if(!loan)return;
    if(cash<loan.remaining){addToast({icon:"❌",title:"Fonds insuffisants",msg:`Il vous manque ${(loan.remaining-cash).toFixed(2)}€`,color:C.red});return;}
    setCash(c=>+(c-loan.remaining).toFixed(2));
    addTx("remboursement",`Remboursement anticipé — ${loan.label}`,loan.remaining);
    addToast({icon:"🎉",title:"Prêt soldé !",msg:"Votre emprunt est entièrement remboursé.",color:C.green,tab:"stats"});
    setLoan(null);
    onClose();
  };
  return(
    <Modal title="🏦 Banque" onClose={onClose}>
      <div style={{display:"flex",flexDirection:"column",gap:18}}>

        {/* Active loan status */}
        {loan?(
          <div style={{background:C.amberP,border:`1.5px solid ${C.amber}44`,borderRadius:12,padding:"14px 16px"}}>
            <div style={{fontSize:12,fontWeight:700,color:C.amber,fontFamily:F.title,marginBottom:8}}>
              📋 Prêt en cours — {loan.label}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
              {[
                {l:"Montant initial",v:`${loan.amount.toFixed(2)} €`},
                {l:"Restant dû",v:`${loan.remaining.toFixed(2)} €`,c:C.red},
                {l:"Mensualité",v:`${loan.repayPerHour.toFixed(0)} €/h`},
                {l:"Taux",v:`${(loan.rate*100).toFixed(1)} %`},
              ].map(r=>(
                <div key={r.l} style={{background:C.surface,borderRadius:8,padding:"8px 10px"}}>
                  <div style={{fontSize:9,color:C.muted,fontFamily:F.body,marginBottom:2}}>{r.l}</div>
                  <div style={{fontSize:14,fontWeight:700,color:r.c||C.ink,fontFamily:F.title}}>{r.v}</div>
                </div>
              ))}
            </div>
            <div style={{height:8,background:C.border,borderRadius:99,overflow:"hidden",marginBottom:12}}>
              <div style={{height:"100%",borderRadius:99,background:C.amber,
                width:`${Math.max(0,100-(loan.remaining/loan.amount/(1+loan.rate))*100)}%`,
                transition:"width 0.4s"}}/>
            </div>
            <Btn full v="primary" onClick={repayNow}
              icon={cash>=loan.remaining?"💸":"🔒"}>
              {cash>=loan.remaining?`Rembourser en avance (${loan.remaining.toFixed(2)} €)`:"Fonds insuffisants"}
            </Btn>
          </div>
        ):(
          <div style={{background:C.greenP,border:`1px solid ${C.green}33`,
            borderRadius:10,padding:"10px 14px",fontSize:12,color:C.green,fontFamily:F.body}}>
            ✅ Aucun emprunt actif — vous pouvez contracter un prêt.
          </div>
        )}

        {/* Loan options */}
        <div style={{fontSize:13,fontWeight:700,color:C.ink,fontFamily:F.title}}>Nouveaux prêts disponibles</div>
        {LOAN_OPTIONS.map(opt=>{
          const totalDue=+(opt.amount*(1+opt.rate)).toFixed(2);
          const disabled=!!loan;
          return(
            <div key={opt.id} style={{background:disabled?C.bg:C.card,
              border:`1.5px solid ${disabled?C.border:C.navy+"44"}`,
              borderRadius:12,padding:"14px 16px",opacity:disabled?0.55:1,
              display:"flex",alignItems:"center",gap:14}}>
              <span style={{fontSize:28,flexShrink:0}}>{opt.icon}</span>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:700,color:C.ink,fontFamily:F.title,marginBottom:3}}>
                  {opt.label} — {opt.amount.toLocaleString("fr-FR")} €
                </div>
                <div style={{fontSize:11,color:C.muted,fontFamily:F.body}}>
                  Taux {(opt.rate*100).toFixed(1)}% · Mensualités {opt.monthly}€/h · Total dû {totalDue}€
                </div>
              </div>
              <Btn v={disabled?"disabled":"primary"} onClick={()=>!disabled&&takeLoan(opt)}>
                Emprunter
              </Btn>
            </div>
          );
        })}

        {/* Fine print */}
        <div style={{fontSize:10,color:C.muted,fontFamily:F.body,textAlign:"center",lineHeight:1.5}}>
          Les mensualités sont déduites automatiquement chaque heure. En cas d'insolvabilité,
          le remboursement est différé jusqu'à disponibilité des fonds.
        </div>
      </div>
    </Modal>
  );
}

/* ─── HelpModal (inliné — fichier supprimé du repo) ─────── */
function HelpModal({onClose}){
  const [sec,setSec]=useState(0);
  const s=HELP_SECTIONS[sec];
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",
      zIndex:10000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}
      onClick={onClose}>
      <div style={{background:C.surface,borderRadius:20,width:"100%",maxWidth:780,
        maxHeight:"88vh",display:"flex",flexDirection:"column",overflow:"hidden",
        boxShadow:"0 24px 80px rgba(0,0,0,0.25)"}}
        onClick={e=>e.stopPropagation()}>

        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
          padding:"20px 24px",borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:38,height:38,background:C.green,borderRadius:10,
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>
              ❓
            </div>
            <div>
              <div style={{fontSize:17,fontWeight:700,color:C.ink,fontFamily:F.title}}>Guide utilisateur</div>
              <div style={{fontSize:11,color:C.muted,fontFamily:F.body}}>Toutes les fonctionnalités expliquées</div>
            </div>
          </div>
          <button onClick={onClose} style={{background:C.border,border:"none",borderRadius:8,
            width:32,height:32,cursor:"pointer",fontSize:16,color:C.muted,
            display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        </div>

        <div style={{display:"flex",flex:1,overflow:"hidden"}}>
          {/* Sidebar */}
          <div style={{width:170,borderRight:`1px solid ${C.border}`,padding:"12px 8px",
            display:"flex",flexDirection:"column",gap:3,flexShrink:0,overflowY:"auto",
            background:C.bg}}>
            {HELP_SECTIONS.map((hs,i)=>(
              <button key={i} onClick={()=>setSec(i)} style={{
                background:sec===i?hs.color+"18":"transparent",
                border:`1.5px solid ${sec===i?hs.color+"44":"transparent"}`,
                borderRadius:9,padding:"9px 11px",cursor:"pointer",
                display:"flex",alignItems:"center",gap:9,
                color:sec===i?hs.color:C.muted,
                fontWeight:sec===i?700:400,
                fontSize:12,fontFamily:F.body,textAlign:"left",
                transition:"all 0.15s"}}>
                <span style={{fontSize:16,flexShrink:0}}>{hs.icon}</span>
                <span>{hs.title}</span>
              </button>
            ))}
          </div>

          {/* Content */}
          <div style={{flex:1,padding:"24px 28px",overflowY:"auto"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20}}>
              <span style={{fontSize:26}}>{s.icon}</span>
              <div style={{fontSize:20,fontWeight:700,color:s.color,fontFamily:F.title}}>{s.title}</div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              {s.items.map((it,i)=>(
                <div key={i} style={{background:C.card,border:`1.5px solid ${s.color}22`,
                  borderLeft:`4px solid ${s.color}`,borderRadius:10,padding:"14px 16px"}}>
                  <div style={{fontSize:13,fontWeight:700,color:s.color,
                    fontFamily:F.body,marginBottom:6}}>
                    {it.q}
                  </div>
                  <div style={{fontSize:12,color:C.ink,fontFamily:F.body,
                    lineHeight:1.6}}>
                    {it.a}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
/* ═══════════════════════════════════════════════════════
   DAILY SUMMARY MODAL — Résumé de fin de journée (A)
═══════════════════════════════════════════════════════ */


/* ─── DailySummaryModal ─────────────────────────────────── */
function DailySummaryModal({onClose,dailyStats,objStats,servers,menu,transactions,prevRecord,isRecord}){
  const today=dailyStats[dailyStats.length-1]||{served:0,lost:0,revenue:0,date:""};
  const totalClients=today.served+today.lost;
  const rate=totalClients>0?Math.round((today.served/totalClients)*100):0;
  const rateColor=rate>=80?C.green:rate>=50?C.amber:C.red;

  // Meilleur serveur (plus de XP total)
  const bestSrv=[...servers].sort((a,b)=>b.totalXp-a.totalXp)[0];

  // Plat le plus commandé (depuis les transactions du jour)
  const dishCount={};
  transactions.filter(t=>t.type==="revenu"&&t.label.includes("×")).forEach(t=>{
    const m=t.label.match(/(\d+)× ([^,)]+)/g);
    if(m) m.forEach(s=>{
      const [,q,n]=s.match(/(\d+)× (.+)/);
      dishCount[n]=(dishCount[n]||0)+parseInt(q);
    });
  });
  const topDish=Object.entries(dishCount).sort((a,b)=>b[1]-a[1])[0];

  // Objectif du lendemain
  const nextRevTarget=[500,1000,2000,5000,10000].find(t=>t>objStats.totalRevenue)||10000;

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",zIndex:10050,
      display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:C.surface,borderRadius:22,width:"100%",maxWidth:460,
        boxShadow:"0 32px 80px rgba(0,0,0,0.35)",overflow:"hidden",
        animation:"popIn 0.4s ease"}}>

        {/* Header */}
        <div style={{background:`linear-gradient(135deg,${C.green},${C.greenL})`,
          padding:"24px 28px 20px",textAlign:"center",position:"relative"}}>
          {isRecord&&(
            <div style={{position:"absolute",top:12,right:16,
              background:"#f5d878",color:"#7a5a00",borderRadius:20,
              padding:"3px 10px",fontSize:10,fontWeight:800,letterSpacing:"0.06em"}}>
              🏆 RECORD !
            </div>
          )}
          <div style={{fontSize:40,marginBottom:8}}>📊</div>
          <div style={{fontSize:22,fontWeight:800,color:"#fff",fontFamily:F.title}}>
            Bilan de la journée
          </div>
          <div style={{fontSize:12,color:"rgba(255,255,255,0.75)",fontFamily:F.body,marginTop:4}}>
            {today.date}
          </div>
        </div>

        {/* Stats principales */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:0,
          borderBottom:`1px solid ${C.border}`}}>
          {[
            {icon:"✅",val:today.served,label:"Servis",color:C.green,bg:C.greenP},
            {icon:"😤",val:today.lost,label:"Perdus",color:C.red,bg:C.redP},
            {icon:"💶",val:today.revenue.toFixed(0)+"€",label:"Revenus",color:C.amber,bg:C.amberP},
          ].map(s=>(
            <div key={s.label} style={{background:s.bg,padding:"16px 10px",textAlign:"center",
              borderRight:`1px solid ${C.border}`}}>
              <div style={{fontSize:20,marginBottom:4}}>{s.icon}</div>
              <div style={{fontSize:22,fontWeight:800,color:s.color,fontFamily:F.title,lineHeight:1}}>{s.val}</div>
              <div style={{fontSize:10,color:C.muted,fontFamily:F.body,marginTop:3}}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{padding:"20px 24px",display:"flex",flexDirection:"column",gap:14}}>

          {/* Taux de service */}
          <div>
            <div style={{display:"flex",justifyContent:"space-between",
              fontSize:11,fontFamily:F.body,marginBottom:6}}>
              <span style={{color:C.muted}}>Taux de service</span>
              <span style={{fontWeight:700,color:rateColor}}>{rate}%</span>
            </div>
            <div style={{height:8,background:C.border,borderRadius:99,overflow:"hidden"}}>
              <div style={{height:"100%",width:`${rate}%`,background:rateColor,
                borderRadius:99,transition:"width 1s ease"}}/>
            </div>
          </div>

          {/* Meilleur serveur + plat */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {bestSrv&&(
              <div style={{background:C.navyP,border:`1px solid ${C.navy}22`,
                borderRadius:12,padding:"12px 14px"}}>
                <div style={{fontSize:10,color:C.muted,fontFamily:F.body,marginBottom:4}}>⭐ Meilleur serveur</div>
                <div style={{fontSize:13,fontWeight:700,color:C.navy,fontFamily:F.title}}>{bestSrv.name}</div>
                <div style={{fontSize:10,color:C.muted,fontFamily:F.body,marginTop:2}}>{bestSrv.totalXp} XP</div>
              </div>
            )}
            {topDish&&(
              <div style={{background:C.terraP,border:`1px solid ${C.terra}22`,
                borderRadius:12,padding:"12px 14px"}}>
                <div style={{fontSize:10,color:C.muted,fontFamily:F.body,marginBottom:4}}>🍽 Plat n°1</div>
                <div style={{fontSize:13,fontWeight:700,color:C.terra,fontFamily:F.title,
                  overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{topDish[0]}</div>
                <div style={{fontSize:10,color:C.muted,fontFamily:F.body,marginTop:2}}>{topDish[1]}× commandé</div>
              </div>
            )}
          </div>

          {/* Objectif demain */}
          <div style={{background:C.purpleP,border:`1px solid ${C.purple}22`,
            borderRadius:12,padding:"12px 16px",display:"flex",alignItems:"center",gap:12}}>
            <span style={{fontSize:22}}>🎯</span>
            <div>
              <div style={{fontSize:10,color:C.muted,fontFamily:F.body,marginBottom:2}}>Objectif demain</div>
              <div style={{fontSize:13,fontWeight:700,color:C.purple,fontFamily:F.title}}>
                Atteindre {nextRevTarget.toLocaleString("fr-FR")} € de CA total
              </div>
              <div style={{fontSize:10,color:C.muted,fontFamily:F.body,marginTop:2}}>
                {(nextRevTarget-objStats.totalRevenue).toLocaleString("fr-FR")} € restants
              </div>
            </div>
          </div>

          <button onClick={onClose} style={{
            padding:"12px",borderRadius:12,border:"none",
            background:C.green,color:"#fff",cursor:"pointer",
            fontSize:14,fontWeight:700,fontFamily:F.body,
            boxShadow:`0 4px 16px ${C.green}44`}}>
            Continuer →
          </button>
        </div>
      </div>
    </div>
  );
}

function useBreakpoint(){
  const [bp,setBp]=useState(()=>({
    w:typeof window!=="undefined"?window.innerWidth:1280,
    isMobile:typeof window!=="undefined"?window.innerWidth<640:false,
    isTablet:typeof window!=="undefined"?window.innerWidth>=640&&window.innerWidth<1024:false,
    isDesktop:typeof window!=="undefined"?window.innerWidth>=1024:true,
    isSmall:typeof window!=="undefined"?window.innerWidth<480:false,
  }));
  useEffect(()=>{
    const update=()=>{
      const w=window.innerWidth;
      setBp({
        w,
        isMobile:w<640,
        isTablet:w>=640&&w<1024,
        isDesktop:w>=1024,
        isSmall:w<480,
      });
    };
    // Use ResizeObserver if available, fallback to resize event
    if(typeof ResizeObserver!=="undefined"){
      const ro=new ResizeObserver(update);
      ro.observe(document.documentElement);
      return()=>ro.disconnect();
    } else {
      window.addEventListener("resize",update,{passive:true});
      return()=>window.removeEventListener("resize",update);
    }
  },[]);
  return bp;
}

/* ── Helpers responsive ── */
// Retourne la valeur selon breakpoint: rVal(bp, mobile, tablet, desktop)
const rVal=(bp,mobile,tablet,desktop)=>bp.isMobile?mobile:bp.isTablet?tablet:desktop;
// Grid columns helper
const rGrid=(bp,m=1,t=2,d=3)=>`repeat(${bp.isMobile?m:bp.isTablet?t:d},1fr)`;


/* ── Objectifs de progression ── */

/* ── Défis quotidiens ── */
const ALL_CHALLENGES=[
  {id:"ch_served",   key:"served",   icon:"🍽", title:"Service express",      desc:"Servir 10 clients aujourd'hui",            target:10,  reward:{cash:80, xp:120}},
  {id:"ch_revenue",  key:"revenue",  icon:"💶", title:"Journée dorée",        desc:"Encaisser 500€ dans la journée",           target:500, reward:{cash:100,xp:150}},
  {id:"ch_rating",   key:"highRating",icon:"⭐",title:"Service 5 étoiles",    desc:"Obtenir 5 notes ≥ 4★",                    target:5,   reward:{cash:60, xp:100}},
  {id:"ch_noloss",   key:"noLoss",   icon:"😊", title:"Zéro abandon",         desc:"Aucun client ne repart sans être servi",   target:1,   reward:{cash:70, xp:90 }},
  {id:"ch_fast",     key:"fastPlace",icon:"⚡", title:"Placement rapide",     desc:"Placer 8 groupes en un clic",              target:8,   reward:{cash:50, xp:80 }},
  {id:"ch_vip",      key:"vip",      icon:"🎩", title:"Service VIP",          desc:"Servir un client VIP",                     target:1,   reward:{cash:150,xp:200}},
  {id:"ch_tips",     key:"tips",     icon:"💰", title:"Maître du pourboire",  desc:"Encaisser 50€ de pourboires",              target:50,  reward:{cash:60, xp:100}},
  {id:"ch_fullhouse",key:"fullHouse",icon:"🏠", title:"Salle comble",         desc:"Avoir 5 tables occupées simultanément",    target:1,   reward:{cash:90, xp:130}},
];

// pickDailyChallenges → remplacé par pickSeeded(CHALLENGES_POOL, 3, dateStr)



export default function App(){
  const bp=useBreakpoint();
  const _today = new Date().toLocaleDateString("fr-FR");

  /* ── États principaux — initialisés avec les valeurs par défaut ── */
  /* La sauvegarde est chargée de façon asynchrone dans le useEffect  */
  const [isLoaded, setIsLoaded] = useState(false);
  const [tab,setTab]=useState("tables");
  const [tables,setTables]=useState(TABLES0);
  const [servers,setServers]=useState(SERVERS0);
  const [queue,setQueue]=useState(()=>{
    const mood=rMood();
    return [{id:1,name:rName(),size:Math.min(rSize(),2),mood,expiresAt:Date.now()+mood.p*1000,patMax:mood.p}];
  });
  const [waitlist,setWaitlist]=useState([]); // groupes partis mais rappelables 2 min
  const [menu,setMenu]=useState(MENU0);
  const [stock,setStock]=useState(STOCK0);
  const [formulas,setFormulas]=useState([]); // [{id, presetId, name, items:[{menuId,cat}], active}]
  const [activeTheme,setActiveTheme]=useState("none");
  const [complaints,setComplaints]=useState(COMPLAINTS0);
  const [kitchen,setKitchen]=useState(KITCHEN0);
  const [toasts,setToasts]=useState([]);
  const [restoXp,setRestoXp]=useState(0);
  const [cash,setCash]=useState(5000);
  const [transactions,setTransactions]=useState([
    {id:0,type:"revenu",label:"Capital de départ",amount:5000,date:Date.now()}
  ]);
  const [showLedger,setShowLedger]=useState(false);
  const [showBank,setShowBank]=useState(false);
  const [loan,setLoan]=useState(null);
  const [supplierMode,setSupplierMode]=useState("premium");
  const [pendingDeliveries,setPendingDeliveries]=useState([]);
  const [dailySpecials,setDailySpecials]=useState(()=>{
    const base=MENU0.filter(m=>m.cat!=="Boissons");
    const picks=base.sort(()=>Math.random()-0.5).slice(0,2);
    return picks.map(m=>({...m,originalPrice:m.price,price:+(m.price*0.8).toFixed(2),isSpecial:true}));
  });
  const [activeEvent,setActiveEvent]=useState(null);
  const [completedIds,setCompletedIds]=useState([]);
  const [challengeDate,setChallengeDate]=useState(_today);
  const [todayChallenges,setTodayChallenges]=useState(()=>pickSeeded(CHALLENGES_POOL, 3, _today));
  const [challengeProgress,setChallengeProgress]=useState({served:0,revenue:0,noLoss:1,highRating:0,fastPlace:0,vip:0,fullHouse:0,tips:0});
  const [challengeClaimed,setChallengeClaimed]=useState({});
  const [candidatePool,setCandidatePool]=useState([]);
  const [candidateDate,setCandidateDate]=useState("");
  const [challengeLostToday,setChallengeLostToday]=useState(false);
  const [pendingClaim,setPendingClaim]=useState([]);
  const [objStats,setObjStats]=useState({totalServed:0,totalRevenue:0,perfectDays:0,tablesUpgraded:0,restoLevel:0});
  const [dailyStats,setDailyStats]=useState([{date:_today,served:0,lost:0,revenue:0}]);
  const [reputation,setReputation]=useState(50); // 0–100

  /* ── Indicateur de sauvegarde ──────────────────────── */
  const [saveStatus,setSaveStatus]=useState("idle");
  const saveTimerRef=useRef(null);
  const [showResetModal,setShowResetModal]=useState(false);
  const [showSummary,setShowSummary]=useState(false);
  const [summaryIsRecord,setSummaryIsRecord]=useState(false);
  const prevRevenueRef=useRef(0);
  // Résumé de fin de journée : s'affiche après 10 min de jeu réel
  const [seenIds,setSeenIds]=useState(new Set());
  const summaryShownRef=useRef(false);
  useEffect(()=>{
    if(!isLoaded) return;
    const t=setTimeout(()=>{
      if(summaryShownRef.current) return;
      summaryShownRef.current=true;
      const today=dailyStats[dailyStats.length-1];
      const isRecord=today&&today.revenue>prevRevenueRef.current&&today.revenue>0;
      setSummaryIsRecord(isRecord);
      // Journée parfaite si aucun client perdu
      setObjStats(s=>s._hadLoss?s:{...s,perfectDays:(s.perfectDays||0)+1});
      setShowSummary(true);
    },600000); // 10 minutes
    return()=>clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[isLoaded]);

  /* ── Réinitialisation complète (sans reload) ────────── */
  const doReset = useCallback(() => {
    try { window.localStorage.removeItem(SAVE_KEY); } catch(e) {}
    const today = new Date().toLocaleDateString("fr-FR");
    const mood  = rMood();
    setTables(TABLES0);
    setServers(SERVERS0);
    setQueue([{id:1,name:rName(),size:Math.min(rSize(),2),mood,expiresAt:Date.now()+mood.p*1000,patMax:mood.p}]);
    setMenu(MENU0);
    setStock(STOCK0);
    setComplaints(COMPLAINTS0);
    setKitchen(KITCHEN0);
    setRestoXp(0);
    setCash(5000);
    setTransactions([{id:0,type:"revenu",label:"Capital de départ",amount:5000,date:Date.now()}]);
    setLoan(null);
    setSupplierMode("premium");
    setPendingDeliveries([]);
    const base=MENU0.filter(m=>m.cat!=="Boissons");
    const picks=base.sort(()=>Math.random()-0.5).slice(0,2);
    setDailySpecials(picks.map(m=>({...m,originalPrice:m.price,price:+(m.price*0.8).toFixed(2),isSpecial:true})));
    setCompletedIds([]);
    setChallengeDate(today);
    setTodayChallenges(pickSeeded(CHALLENGES_POOL, 3, today));
    setChallengeProgress({served:0,revenue:0,noLoss:1,highRating:0,fastPlace:0,vip:0,fullHouse:0,tips:0});
    setChallengeClaimed({});
    setChallengeLostToday(false);
    setPendingClaim([]);
    setObjStats({totalServed:0,totalRevenue:0,perfectDays:0,tablesUpgraded:0,restoLevel:0});
    setDailyStats([{date:today,served:0,lost:0,revenue:0}]);
    setReputation(50);
    setWaitlist([]);
    setFormulas([]);
    setActiveTheme("none");
    setTab("tables");
    setShowResetModal(false);
  },[]);

  /* ── Chargement depuis localStorage ───────────────── */
  useEffect(()=>{
    loadGame().then(raw=>{
      if(raw){
        const sv=sanitizeSave(raw);
        if(sv.tables)    setTables(sv.tables);
        if(sv.servers)   setServers(sv.servers);
        if(sv.menu)      setMenu(sv.menu);
        if(sv.stock)     setStock(sv.stock);
        if(sv.complaints)setComplaints(sv.complaints);
        if(sv.kitchen)   setKitchen(sv.kitchen);
        if(sv.restoXp!=null) setRestoXp(sv.restoXp);
        if(sv.cash!=null)    setCash(sv.cash);
        if(sv.transactions)  setTransactions(sv.transactions);
        if(sv.loan!=null)    setLoan(sv.loan);
        if(sv.supplierMode)  setSupplierMode(sv.supplierMode);
        if(sv.pendingDeliveries) setPendingDeliveries(sv.pendingDeliveries);
        if(sv.dailySpecials) setDailySpecials(sv.dailySpecials);
        if(sv.completedIds)  setCompletedIds(sv.completedIds);
        if(sv.challengeDate) setChallengeDate(sv.challengeDate);
        if(sv.todayChallenges) setTodayChallenges(sv.todayChallenges);
        if(sv.challengeProgress) setChallengeProgress(sv.challengeProgress);
        if(sv.challengeClaimed)  setChallengeClaimed(sv.challengeClaimed);
        if(sv.challengeLostToday!=null) setChallengeLostToday(sv.challengeLostToday);
        if(sv.pendingClaim)  setPendingClaim(sv.pendingClaim);
        if(sv.objStats)      setObjStats(sv.objStats);
        if(sv.dailyStats)    setDailyStats(sv.dailyStats);
        if(sv.reputation!=null) setReputation(sv.reputation);
        if(sv.formulas)      setFormulas(sv.formulas);
        if(sv.activeTheme)   setActiveTheme(sv.activeTheme);
        if(sv.candidatePool) setCandidatePool(sv.candidatePool);
        if(sv.candidateDate) setCandidateDate(sv.candidateDate);
        setQueue(sv.queue||[]);
      }
      setIsLoaded(true);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);
  const dismissToast=useCallback(id=>setToasts(p=>p.filter(x=>x.id!==id)),[]);
  const addToast=useCallback(t=>{
    const id=Date.now()+Math.random();
    setToasts(p=>[...p.slice(-4),{...t,id}]);
    setTimeout(()=>setToasts(p=>p.filter(x=>x.id!==id)),4000);
  },[]);

  const addTx=useCallback((type,label,amount)=>{
    setTransactions(p=>[{id:Date.now()+Math.random(),type,label,amount:+Math.abs(amount).toFixed(2),date:Date.now()},...p].slice(0,200));
  },[]);

  const updateReputation = useCallback((delta, reason="")=>{
    setReputation(prev=>{
      const before = getRepTier(prev);
      const next   = Math.min(100, Math.max(0, prev + delta));
      const after  = getRepTier(next);
      if(before.label !== after.label){
        const up = delta > 0;
        setTimeout(()=>addToast({
          icon: after.icon,
          title: up ? `Réputation en hausse !` : `Réputation en baisse !`,
          msg: `${after.label} (${Math.round(next)}/100)${reason?" · "+reason:""}`,
          color: after.color,
          tab: "stats",
        }),50);
      }
      repRef.current = next;
      return next;
    });
  },[addToast]);

  const addDayStat=useCallback((key,value=1)=>{
    const today=new Date().toLocaleDateString("fr-FR");
    setDailyStats(p=>{
      const idx=p.findIndex(d=>d.date===today);
      if(idx>=0){
        const updated=[...p];
        updated[idx]={...updated[idx],[key]:+(updated[idx][key]+value).toFixed(2)};
        // Check perfect day when losing a client
        return updated;
      }
      const base={date:today,served:0,lost:0,revenue:0};
      return [...p,{...base,[key]:+value.toFixed(2)}].slice(-5);
    });
    if(key==="served") setObjStats(s=>({...s,totalServed:s.totalServed+1}));
    if(key==="rating") setObjStats(s=>({...s,totalRating:(s.totalRating||0)+value,ratingCount:(s.ratingCount||0)+1}));
    if(key==="revenue") setObjStats(s=>({...s,totalRevenue:+(s.totalRevenue+value).toFixed(2)}));
    if(key==="lost"){
      setObjStats(s=>({...s,_hadLoss:true}));
      setChallengeLostToday(true);
      setChallengeProgress(p=>({...p,noLoss:0}));
      updateReputation(REP_DELTA.lostClient,"client perdu");
    }
  },[]);



  const [showHelp,setShowHelp]=useState(false);

  /* ── Réputation ────────────────────────────────────── */


  /* ── Sauvegarde automatique : dirty flag + interval 5s ─ */
  const isDirtyRef = useRef(false);

  // Marquer dirty dès qu'une variable significative change
  useEffect(()=>{
    if(!isLoaded) return;
    isDirtyRef.current = true;
  },[isLoaded,tables,servers,menu,stock,complaints,kitchen,
     restoXp,cash,loan,supplierMode,pendingDeliveries,
     completedIds,challengeProgress,challengeClaimed,
     challengeLostToday,pendingClaim,objStats,dailyStats,reputation,
     formulas,activeTheme]);

  // Toutes les 5s : sauvegarder si dirty
  useEffect(()=>{
    if(!isLoaded) return;
    const interval = setInterval(()=>{
      if(!isDirtyRef.current) return;
      isDirtyRef.current = false;
      setSaveStatus("saving");
      saveGame({
        tables,servers,menu,stock,complaints,kitchen,
        restoXp,cash,transactions,loan,supplierMode,
        pendingDeliveries,dailySpecials,completedIds,
        challengeDate,todayChallenges,challengeProgress,
        challengeClaimed,challengeLostToday,pendingClaim,
        objStats,dailyStats,reputation,formulas,activeTheme,
        candidatePool,candidateDate,
      });
      setSaveStatus("saved");
      setTimeout(()=>setSaveStatus("idle"),2000);
    }, 5000);
    return()=>clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[isLoaded]);

  /* ── GDevelop : écoute du message d'initialisation ─── */
  useEffect(()=>{
    const handler = (event) => {
      // Accepter uniquement les messages venant de GDevelop
      if (!event.data || event.data.source !== "gdevelop") return;
      const { type, payload } = event.data;

      if (type === "INIT" && payload) {
        // Charger les données envoyées par GDevelop en priorité sur localStorage
        if (payload.argent        != null) setCash(payload.argent);
        if (payload.restoXp       != null) setRestoXp(payload.restoXp);
        if (payload.stock)                 setStock(payload.stock);
        if (payload.servers)               setServers(payload.servers);
        if (payload.tables)                setTables(payload.tables);
        if (payload.kitchen)               setKitchen(payload.kitchen);
        if (payload.objStats)              setObjStats(payload.objStats);
        if (payload.dailyStats)            setDailyStats(payload.dailyStats);
        if (payload.completedIds)          setCompletedIds(payload.completedIds);
        if (payload.challengeProgress)     setChallengeProgress(payload.challengeProgress);
        if (payload.loan         != null)  setLoan(payload.loan);
        if (payload.reputation   != null)  setReputation(payload.reputation);
        if (payload.transactions)          setTransactions(payload.transactions);
        if (payload.pendingDeliveries)     setPendingDeliveries(payload.pendingDeliveries);
        if (payload.pendingClaim)          setPendingClaim(payload.pendingClaim);
        if (payload.challengeClaimed)      setChallengeClaimed(payload.challengeClaimed);
        if (payload.challengeLostToday != null) setChallengeLostToday(payload.challengeLostToday);
        if (payload.activeTheme)           setActiveTheme(payload.activeTheme);
        if (payload.activeEvent  != null)  setActiveEvent(payload.activeEvent);
        console.info("[GDevelop Bridge] Init reçu ✓", payload);
        // Confirmer la réception à GDevelop
        sendToGDevelop({ type: "INIT_ACK", ok: true });
      }

      if (type === "PING") {
        sendToGDevelop({ type: "PONG", ready: isLoaded });
      }
    };
    window.addEventListener("message", handler);
    // Signaler à GDevelop que l'iframe est prête
    sendToGDevelop({ type: "READY" });
    return () => window.removeEventListener("message", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── GDevelop : sync interval 2s (ref toujours à jour) ── */
  const gdSyncStateRef = useRef({});
  useEffect(()=>{
    gdSyncStateRef.current = {
      cash, restoXp, stock, queue, waitlist, tables, kitchen, objStats, servers, dailyStats,
      reputation, transactions, loan, pendingDeliveries, menu, complaints, supplierMode,
      formulas, dailySpecials, challengeDate,
      completedIds, pendingClaim, todayChallenges, challengeProgress,
      challengeClaimed, challengeLostToday, activeTheme, activeEvent,
    };
  },[cash, restoXp, stock, queue, waitlist, tables, kitchen, objStats, servers, dailyStats,
     reputation, transactions, loan, pendingDeliveries, menu, complaints, supplierMode,
     formulas, dailySpecials, challengeDate,
     completedIds, pendingClaim, todayChallenges, challengeProgress,
     challengeClaimed, challengeLostToday, activeTheme, activeEvent]);

  useEffect(()=>{
    if (!isLoaded) return;
    const interval = setInterval(()=>{
      const payload = buildGDevelopPayload(gdSyncStateRef.current);
      sendToGDevelop({ type: "SYNC", ...payload });
    }, 2000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[isLoaded]);


  /* ── Refs pour hooks asynchrones ─────────────────── */
  const stockRef      = useRef(stock);
  const cashRef       = useRef(cash);
  const complaintsRef = useRef(complaints);
  const repRef        = useRef(reputation);
  const tablesRef     = useRef(tables);
  const serversRef    = useRef(servers);
  const queueRef      = useRef(queue);
  const kitchenRef    = useRef(kitchen);
  const restoLvRef    = useRef(0);
  const lastSpawnRef  = useRef(Date.now());

  useEffect(() => { stockRef.current      = stock;      }, [stock]);
  useEffect(() => { cashRef.current       = cash;       }, [cash]);
  useEffect(() => { complaintsRef.current = complaints; }, [complaints]);
  useEffect(() => { repRef.current        = reputation; }, [reputation]);
  useEffect(() => { tablesRef.current     = tables;     }, [tables]);
  useEffect(() => { serversRef.current    = servers;    }, [servers]);
  useEffect(() => { queueRef.current      = queue;      }, [queue]);
  useEffect(() => { kitchenRef.current    = kitchen;    }, [kitchen]);
  useEffect(() => { restoLvRef.current    = restoLv(restoXp).l; }, [restoXp]);

  /* ── Hooks métier (remplacent 13 useEffect inline) ── */
  const clockNow = useGameClock();

  useSpawner    ({ setQueue, tablesRef, queueRef, restoLvRef, lastSpawnRef, repRef, getRepTier, addToast });
  useExpiry     ({ setQueue, setWaitlist, setTables, setServers, addToast, addDayStat });

  /* ── Auto-assign serveur pour le nettoyage des tables ── */
  useEffect(() => {
    const iv = setInterval(() => {
      const curTables  = tablesRef.current;
      const curServers = serversRef.current;
      const waiting = curTables.filter(t => t.status === "nettoyage" && !t.cleanUntil);
      if (waiting.length === 0) return;
      const freeSrv = curServers.find(s => s.status === "actif" && (s.moral ?? 100) > 10);
      if (!freeSrv) return;
      const tbl = waiting[0];
      const cleanDur = tbl.cleanDur || 60;
      const cleanEnd = Date.now() + cleanDur * 1000;
      setTables(p => p.map(t => t.id !== tbl.id ? t : { ...t, cleanUntil: cleanEnd, cleanServer: freeSrv.id }));
      setServers(p => p.map(s => s.id !== freeSrv.id ? s : { ...s, status: "nettoyage", cleanUntil: cleanEnd }));
    }, 500);
    return () => clearInterval(iv);
  }, [setTables, setServers]);
  useSalary     ({ setServers, setKitchen, setCash, setLoan, addTx, addToast });
  useDeliveries ({ setPendingDeliveries, setStock, addToast });
  useFreshness  ({ stockRef, kitchenRef, setStock, setComplaints, addToast });
  useEvents     ({
    stockRef, cashRef, complaintsRef, tablesRef, serversRef,
    setStock, setComplaints, setQueue, setCash,
    setTables, setServers, setKitchen,
    setActiveEvent, addToast, addTx, updateReputation,
  });
  useServerMoral({ setServers, addToast });
  useChallenges ({
    tables,
    setChallengeProgress, setChallengeDate,
    setTodayChallenges, setChallengeLostToday, setChallengeClaimed,
  });
  useObjectives ({ objStats, completedIds, pendingClaim, setPendingClaim, addToast });


  const now=new Date(clockNow);

  const rl=restoLv(restoXp);
  const rlD=rl.d;
  const activeTables=tables.slice(0,rlD.tables);

  const addRestoXp=useCallback((xp)=>{
    setRestoXp(prev=>{
      const before=restoLv(prev);
      const after=restoLv(prev+xp);
      if(after.l>before.l){
        const nd=RESTO_LVL[after.l];
        setTimeout(()=>addToast({
          icon:nd.icon,
          title:`Niveau ${nd.l} — ${nd.name} !`,
          msg:`🎉 ${nd.tables} tables débloquées`,
          color:nd.color,
          tab:"tables",
        }),50);
        setObjStats(s=>({...s,restoLevel:after.l}));
      }
      return prev+xp;
    });
  },[addToast]);



  const claimObjective=useCallback((id)=>{
    const obj=OBJECTIVES_DEF.find(o=>o.id===id);
    if(!obj)return;
    setCompletedIds(p=>[...p,id]);
    setPendingClaim(p=>p.filter(x=>x!==id));
    setCash(c=>+(c+obj.reward.cash).toFixed(2));
    addTx("revenu",`Récompense objectif : ${obj.title}`,obj.reward.cash);
    addRestoXp(obj.reward.xp);
    addToast({icon:obj.icon,title:`+${obj.reward.cash}€ · +${obj.reward.xp} XP`,
      msg:`Objectif "${obj.title}" réclamé !`,color:C.green,tab:"objectives"});
  },[addTx,addRestoXp,addToast]);

  /* ── Dérivés (calculés à chaque render) ─────────────── */
  const sAlerts    = stock.filter(s => s.qty <= s.alert).length;
  const nCompl     = complaints.filter(c => c.status === "nouveau" && !seenIds.has(c.id)).length;
  const nPending   = pendingClaim.length;
  const repTier    = getRepTier(reputation);


  return(
    <div style={{minHeight:"100vh",background:C.bg,color:C.ink,fontFamily:F.body}}>
      {/* Écran de chargement */}
      {!isLoaded&&(
        <div style={{position:"fixed",inset:0,background:C.bg,zIndex:99999,
          display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16}}>
          <div style={{width:52,height:52,background:C.green,borderRadius:14,
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,
            animation:"pulse 1s ease-in-out infinite"}}>🍽</div>
          <div style={{fontSize:15,fontWeight:700,color:C.ink,fontFamily:F.title}}>Chargement de la partie…</div>
          <div style={{fontSize:12,color:C.muted,fontFamily:F.body}}>Récupération de la sauvegarde</div>
        </div>
      )}
      <style>{`
        * { box-sizing: border-box; }
        html { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }

        /* ── Hover cards ── */
        .hovcard { transition: box-shadow 0.22s cubic-bezier(.4,0,.2,1), transform 0.18s cubic-bezier(.4,0,.2,1) !important; }
        .hovcard:hover { box-shadow: 0 8px 28px rgba(23,18,14,0.14), 0 2px 6px rgba(23,18,14,0.07) !important; transform: translateY(-2px) !important; }
        .hovcard:active { transform: translateY(0px) !important; box-shadow: 0 2px 8px rgba(23,18,14,0.08) !important; }

        /* ── Buttons ── */
        button { transition: filter 0.14s, transform 0.14s, box-shadow 0.14s, opacity 0.14s !important; }
        button:not(:disabled):hover { filter: brightness(1.10); transform: translateY(-1px); }
        button:not(:disabled):active { transform: translateY(0px) scale(0.97); filter: brightness(0.96); }

        /* ── Inputs ── */
        select option { background:#fff; color:#18130e; }
        ::placeholder { color:#b0a088; }
        input, select { transition: border-color 0.15s, box-shadow 0.15s; }
        input:focus, select:focus {
          outline: none !important;
          border-color: #1e5c38 !important;
          box-shadow: 0 0 0 3px #1e5c3822 !important;
        }

        /* ── Animations ── */
        @keyframes slideIn      { from{opacity:0;transform:translateX(24px)} to{opacity:1;transform:translateX(0)} }
        @keyframes slideUp      { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn       { from{opacity:0} to{opacity:1} }
        @keyframes pulse        { 0%,100%{opacity:1} 50%{opacity:0.45} }
        @keyframes popIn        { 0%{transform:scale(0.82);opacity:0} 65%{transform:scale(1.05)} 100%{transform:scale(1);opacity:1} }
        @keyframes breathe      { 0%,100%{box-shadow:0 0 0 0 rgba(30,92,56,0)} 50%{box-shadow:0 0 0 7px rgba(30,92,56,0.16)} }
        @keyframes breatheAmber { 0%,100%{box-shadow:0 0 0 0 rgba(160,108,8,0)} 50%{box-shadow:0 0 0 6px rgba(160,108,8,0.20)} }
        @keyframes bankPulse    { 0%,100%{box-shadow:0 2px 10px rgba(160,108,8,0.4);transform:scale(1)} 50%{box-shadow:0 2px 18px rgba(160,108,8,0.7);transform:scale(1.04)} }
        @keyframes toastBar     { from{width:100%} to{width:0%} }
        @keyframes ledPulse     { 0%,100%{opacity:1} 50%{opacity:0.35} }
        @keyframes shimmer      { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        @keyframes shimmerBar   {
          0%  { background-position: -200% 0; }
          100%{ background-position:  200% 0; }
        }
        @keyframes saveFlash    { 0%{opacity:0;transform:scale(0.8)} 20%{opacity:1;transform:scale(1.1)} 80%{opacity:1} 100%{opacity:0;transform:scale(0.95)} }
        @keyframes countUp      { from{transform:translateY(6px);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes glow         { 0%,100%{opacity:0.5} 50%{opacity:1} }
        @keyframes tabSlide     { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }

        /* ── Tab content entry ── */
        .tab-content { animation: tabSlide 0.22s ease both; }

        /* ── XP bar shimmer ── */
        .xpbar-shimmer::after {
          content:'';
          position:absolute;
          inset:0;
          background:linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.35) 50%,transparent 100%);
          background-size:200% 100%;
          animation: shimmerBar 2.4s ease-in-out infinite;
          border-radius:99px;
        }
        .xpbar-shimmer { position:relative; overflow:hidden; }

        /* ── Accent strip card ── */
        .card-strip { position:relative; overflow:hidden; }
        .card-strip::before {
          content:'';
          position:absolute;
          left:0;top:0;bottom:0;
          width:4px;
          border-radius:2px 0 0 2px;
        }

        /* ── Navigation tab bar ── */
        .nav-tab-active {
          background: linear-gradient(135deg, #1e5c3814, #1e5c3808) !important;
          color: #1e5c38 !important;
          border-bottom: 2.5px solid #1e5c38 !important;
          font-weight: 700 !important;
        }
        .nav-tab {
          transition: color 0.15s, background 0.15s, border-color 0.15s;
        }
        .nav-tab:hover:not(.nav-tab-active) {
          background: rgba(30,92,56,0.05) !important;
          color: #1e5c38 !important;
        }

        /* ── Mobile ── */
        :root {
          --gap: 16px;
          --pad: 22px;
          --card-radius: 16px;
          --font-base: 13px;
        }
        @media (max-width: 639px) {
          :root { --gap: 10px; --pad: 12px; --card-radius: 12px; --font-base: 12px; }
          .desktop-nav { display: none !important; }
          .mobile-nav  { display: flex !important; }
          .content-area { padding: 12px var(--pad) 90px !important; }
          .badge-alert { font-size: 8px !important; width: 14px !important; height: 14px !important; }
          .hide-mobile { display: none !important; }
          .show-mobile { display: flex !important; }
          /* Compact header on mobile */
          .header-title { font-size: 13px !important; }
          .header-line2 { gap: 6px !important; padding: 4px 10px 6px !important; }
          /* Full-width tables on mobile */
          .resp-grid { grid-template-columns: 1fr !important; }
          .resp-grid-2 { grid-template-columns: 1fr 1fr !important; }
          /* Modals full-screen on mobile */
          .modal-inner { border-radius: 0 !important; max-height: 100vh !important; height: 100vh !important; }
        }
        @media (min-width: 640px) and (max-width: 1023px) {
          :root { --gap: 12px; --pad: 16px; --card-radius: 14px; }
          .desktop-nav { display: flex !important; }
          .mobile-nav  { display: none !important; }
          .content-area { padding: 16px var(--pad) !important; }
          .hide-tablet { display: none !important; }
          .resp-grid { grid-template-columns: 1fr 1fr !important; }
          .resp-grid-3 { grid-template-columns: 1fr 1fr !important; }
        }
        @media (min-width: 1024px) {
          .desktop-nav { display: flex !important; }
          .mobile-nav  { display: none !important; }
          .content-area { padding: 20px var(--pad) !important; }
          .show-mobile { display: none !important; }
        }
      `}</style>

      {/* Header — 2 lignes */}
      <div style={{
        background:`linear-gradient(180deg,${C.surface} 0%,#faf7f0 100%)`,
        borderBottom:`1px solid ${C.border}`,
        boxShadow:"0 2px 14px rgba(23,18,14,0.08), 0 1px 3px rgba(23,18,14,0.04)",
      }}>

        {/* Ligne 1 : logo · alertes · horloge · aide */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
          padding:bp.isMobile?"0 10px":"0 16px",minHeight:bp.isMobile?46:52,gap:8,flexWrap:"nowrap",overflow:"hidden"}}>

          {/* Logo + nom */}
          <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0,minWidth:0}}>
            <div style={{
              width:38,height:38,
              background:`linear-gradient(135deg,${C.green} 0%,${C.greenL||"#2d7a50"} 100%)`,
              borderRadius:11,
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:19,flexShrink:0,
              boxShadow:`0 3px 10px ${C.green}38`,
            }}>🍽</div>
            <div style={{minWidth:0}}>
              <div className={bp.isSmall?"hide-mobile":""} style={{
                fontSize:bp.isMobile?13:15,fontWeight:800,color:C.ink,fontFamily:F.title,
                whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",
                letterSpacing:"-0.02em",lineHeight:1.2,
              }}>Le Grand Restaurant</div>
              <div style={{fontSize:9,color:C.muted,fontFamily:F.body,whiteSpace:"nowrap",marginTop:1,letterSpacing:"0.02em"}}>
                {now.toLocaleDateString("fr-FR",{weekday:"short",day:"numeric",month:"short"})}
              </div>
            </div>
          </div>

          {/* Alertes + horloge + aide */}
          <div style={{display:"flex",alignItems:"center",gap:5,flexShrink:0}}>
            {sAlerts>0&&(
              <div style={{
                background:C.redP,border:`1.5px solid ${C.red}28`,borderRadius:8,
                padding:"3px 9px",fontSize:10,color:C.red,fontWeight:700,whiteSpace:"nowrap",
                display:"flex",alignItems:"center",gap:4,
                boxShadow:`0 1px 4px ${C.red}18`,
              }}>
                <span style={{width:5,height:5,borderRadius:"50%",background:C.red,animation:"pulse 1.2s infinite",display:"inline-block",flexShrink:0}}/>
                ⚠ {sAlerts}
              </div>
            )}
            {nCompl>0&&tab!=="complaints"&&(
              <div onClick={()=>{
                setTab("complaints");
                setSeenIds(p=>new Set([...p,...complaints.filter(c=>c.status==="nouveau").map(c=>c.id)]));
              }} style={{
                background:C.terraP,border:`1.5px solid ${C.terra}28`,borderRadius:8,
                padding:"3px 9px",fontSize:10,color:C.terra,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",
                boxShadow:`0 1px 4px ${C.terra}18`,
              }}>
                💬 {nCompl}
              </div>
            )}
            {queue.length>=5&&(
              <div style={{
                background:C.redP,border:`1.5px solid ${C.red}28`,borderRadius:8,
                padding:"3px 9px",fontSize:10,color:C.red,fontWeight:700,whiteSpace:"nowrap",
                animation:"pulse 1.2s ease-in-out infinite",
              }}>🚨</div>
            )}
            {/* Horloge */}
            <div style={{
              textAlign:"right",flexShrink:0,
              background:C.bg,border:`1px solid ${C.border}`,
              borderRadius:8,padding:"3px 9px",
            }}>
              <div style={{fontSize:16,fontWeight:800,color:C.ink,fontFamily:F.title,lineHeight:1.1,letterSpacing:"-0.02em"}}>
                {now.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}
              </div>
              <div style={{fontSize:8,color:C.muted,whiteSpace:"nowrap",marginTop:1}}>
                {activeTables.filter(t=>t.status==="occupée"||t.status==="mange").length}/{activeTables.length} tables
              </div>
            </div>
            <button onClick={()=>setShowHelp(true)} title="Guide utilisateur" style={{
              width:30,height:30,borderRadius:"50%",
              border:`1.5px solid ${C.green}44`,
              background:C.greenP,cursor:"pointer",fontSize:14,
              color:C.green,display:"flex",alignItems:"center",justifyContent:"center",
              flexShrink:0,fontWeight:800,
              boxShadow:`0 2px 7px ${C.green}20`,
            }}>?</button>
            <button onClick={()=>setShowResetModal(true)} title="Nouvelle partie" style={{
              width:30,height:30,borderRadius:"50%",
              border:`1.5px solid ${C.red}33`,
              background:C.redP,cursor:"pointer",fontSize:13,
              color:C.red,display:"flex",alignItems:"center",justifyContent:"center",
              flexShrink:0,fontWeight:800,opacity:0.65,
            }}>↺</button>
          </div>
        </div>

        {/* Ligne 2 : niveau restaurant + cash */}
        <div style={{
          borderTop:`1px solid ${C.border}`,
          padding:bp.isMobile?"5px 10px 7px":"6px 16px 9px",display:"flex",alignItems:"center",gap:bp.isMobile?6:10,
          background:`linear-gradient(180deg,${C.bg}90,${C.bg})`,
          flexWrap:"nowrap",overflow:"hidden",
        }}>
          <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
            <span style={{fontSize:14}}>{rlD.icon}</span>
            <span style={{fontSize:11,fontWeight:700,color:rlD.color,fontFamily:F.title,whiteSpace:"nowrap"}}>{rlD.name}</span>
            <span style={{fontSize:9,background:rlD.color+"18",color:rlD.color,
              border:`1px solid ${rlD.color}33`,borderRadius:4,
              padding:"1px 5px",fontWeight:700,fontFamily:F.body,whiteSpace:"nowrap"}}>N{rlD.l}</span>
          </div>
          <div style={{flex:1,minWidth:40}}>
            <div style={{height:5,background:C.border,borderRadius:99,overflow:"hidden"}}>
              <div style={{height:"100%",
                width:rl.l>=RESTO_LVL.length-1?"100%":`${rl.pct}%`,
                background:rlD.color,borderRadius:99,transition:"width 0.6s ease"}}/>
            </div>
          </div>
          <div style={{fontSize:9,color:C.muted,fontFamily:F.body,flexShrink:0,whiteSpace:"nowrap"}}>
            {rl.l>=RESTO_LVL.length-1
              ? "✦ Max"
              : `${restoXp}/${rl.next.xpNeeded} XP`
            }
          </div>

          {/* ── Réputation ── */}
          {(()=>{
            const tier=getRepTier(reputation);
            return(
              <div title={`${tier.label} — ${tier.desc}`}
                style={{display:"flex",alignItems:"center",gap:5,flexShrink:0,
                  background:tier.color+"14",border:`1px solid ${tier.color}33`,
                  borderRadius:7,padding:"3px 8px",cursor:"default"}}>
                <span style={{fontSize:13}}>{tier.icon}</span>
                <div style={{display:"flex",flexDirection:"column",gap:2,minWidth:50}}>
                  <div style={{height:4,background:C.border,borderRadius:99,overflow:"hidden"}}>
                    <div style={{height:"100%",
                      width:`${reputation}%`,
                      background:tier.color,
                      borderRadius:99,transition:"width 0.6s ease"}}/>
                  </div>
                  <div style={{fontSize:8,color:tier.color,fontWeight:700,
                    fontFamily:F.body,whiteSpace:"nowrap",lineHeight:1}}>
                    {tier.icon} {Math.round(reputation)}/100
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Cash */}
          <div onClick={()=>setShowLedger(true)} style={{flexShrink:0,display:"flex",alignItems:"center",gap:5,
            background:cash<200?C.redP:C.greenP,
            border:`1px solid ${cash<200?C.red:C.green}33`,
            borderRadius:7,padding:"3px 10px",cursor:"pointer"}}
            title="Voir le grand livre">
            <span style={{fontSize:12}}>💰</span>
            <span style={{fontSize:12,fontWeight:700,
              color:cash<200?C.red:C.green,fontFamily:F.title,whiteSpace:"nowrap"}}>
              {cash.toLocaleString("fr-FR",{minimumFractionDigits:2,maximumFractionDigits:2})} €
            </span>
            <span style={{fontSize:9,color:cash<200?C.red:C.green,opacity:0.7}}>▼</span>
          </div>
          {/* Loan indicator + bank button */}
          <div style={{display:"flex",alignItems:"center",gap:5,flexShrink:0}}>
            {loan&&(
              <div style={{background:C.amberP,border:`1px solid ${C.amber}44`,borderRadius:6,
                padding:"3px 8px",fontSize:10,color:C.amber,fontWeight:600,whiteSpace:"nowrap"}}>
                🏦 −{loan.remaining.toFixed(0)}€
              </div>
            )}
            <button onClick={()=>setShowBank(true)} title="Banque" style={{
              padding:"6px 12px",fontSize:12,fontWeight:700,
              background:loan?C.amber:C.navy,
              border:"none",
              borderRadius:8,color:"#fff",cursor:"pointer",
              fontFamily:F.body,display:"flex",alignItems:"center",gap:5,whiteSpace:"nowrap",
              boxShadow:loan?`0 2px 10px ${C.amber}66`:`0 2px 10px ${C.navy}44`,
              animation:loan?"bankPulse 2s ease-in-out infinite":"none"}}>
              🏦 Banque
            </button>
          </div>

          {/* Bouton sauvegarde manuelle */}
          <button
            onClick={()=>{
              if(saveStatus==="saving") return;
              setSaveStatus("saving");
              if(saveTimerRef.current) clearTimeout(saveTimerRef.current);
              saveGame({
                tables,servers,menu,stock,complaints,kitchen,
                restoXp,cash,transactions,loan,supplierMode,
                pendingDeliveries,dailySpecials,completedIds,
                challengeDate,todayChallenges,challengeProgress,
                challengeClaimed,challengeLostToday,pendingClaim,
                objStats,dailyStats,reputation,formulas,activeTheme,
                candidatePool,candidateDate,
              });
              setSaveStatus("saved");
              setTimeout(()=>setSaveStatus("idle"),2000);
            }}
            title="Sauvegarder maintenant"
            style={{
              flexShrink:0,display:"flex",alignItems:"center",gap:5,
              padding:"5px 12px",borderRadius:7,
              background:saveStatus==="saved"?C.green:saveStatus==="saving"?C.amber:C.navy,
              border:"none",cursor:saveStatus==="saving"?"not-allowed":"pointer",
              transition:"background 0.3s",fontFamily:F.body}}>
            <span style={{fontSize:13,
              animation:saveStatus==="saving"?"pulse 0.8s ease-in-out infinite":undefined}}>
              {saveStatus==="saved"?"✅":saveStatus==="saving"?"⏳":"💾"}
            </span>
            <span style={{fontSize:11,fontWeight:700,color:"#fff",whiteSpace:"nowrap",
              display:"inline-block",minWidth:"72px",textAlign:"center"}}>
              {saveStatus==="saved"?"Sauvé !":saveStatus==="saving"?"…":"Sauvegarder"}
            </span>
          </button>
        </div>
      </div>

      {/* Nav Desktop */}
      <div className="desktop-nav" style={{
        background:C.surface,
        borderBottom:`1px solid ${C.border}`,
        padding:"0 16px",overflowX:"auto",
        boxShadow:"0 1px 0 rgba(23,18,14,0.04)",
      }}>
        {TABS.map(t=>{
          const readyChallenges=(todayChallenges||[]).filter(ch=>{
            const val=ch.key==="noLoss"?(!challengeLostToday&&(challengeProgress.served||0)>=1?1:0):
              ch.key==="fullHouse"||ch.key==="vip"?(challengeProgress[ch.key]||0):
              (challengeProgress[ch.key]||0);
            return val>=ch.target&&!(challengeClaimed||{})[ch.id];
          }).length;
          const badge=t.id==="stock"?sAlerts:t.id==="objectives"?pendingClaim.length+readyChallenges:0;
          const active=tab===t.id;
          return(
            <button key={t.id} onClick={()=>{
              setTab(t.id);
              if(t.id==="complaints")
                setSeenIds(p=>new Set([...p,...complaints.filter(c=>c.status==="nouveau").map(c=>c.id)]));
            }} className={active?"nav-tab nav-tab-active":"nav-tab"} style={{
              background:active?`linear-gradient(180deg,${C.green}10,${C.green}06)`:"transparent",
              color:active?C.green:C.muted,
              border:"none",
              borderBottom:active?`2.5px solid ${C.green}`:"2.5px solid transparent",
              borderRadius:active?"10px 10px 0 0":0,
              padding:"12px 16px",
              fontSize:12,fontWeight:active?700:400,
              cursor:"pointer",fontFamily:F.body,
              display:"flex",alignItems:"center",gap:6,
              whiteSpace:"nowrap",
              position:"relative",
            }}>
              <span style={{fontSize:15,lineHeight:1}}>{t.icon}</span>
              <span>{t.label}</span>
              {badge>0&&(
                <span className="badge-alert" style={{
                  background:C.red,color:"#fff",
                  borderRadius:"50%",
                  width:16,height:16,fontSize:9,fontWeight:800,
                  display:"inline-flex",alignItems:"center",justifyContent:"center",
                  boxShadow:`0 1px 4px ${C.red}44`,
                  animation:"popIn 0.3s ease",
                }}>
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="content-area" style={{maxWidth:bp.isDesktop?1300:undefined,margin:"0 auto"}}>
        <div key={tab} style={{animation:"tabSlide 0.2s ease both"}}>
        {tab==="tables"     &&<TablesView     tables={activeTables} setTables={setTables}   servers={servers} setServers={setServers} menu={menu} setMenu={setMenu} setKitchen={setKitchen} kitchen={kitchen} addToast={addToast} addRestoXp={addRestoXp} cash={cash} setCash={setCash} addTx={addTx} queue={queue} setQueue={setQueue} waitlist={waitlist} setWaitlist={setWaitlist} addDayStat={addDayStat} clockNow={clockNow} onTableUpgrade={()=>setObjStats(s=>({...s,tablesUpgraded:s.tablesUpgraded+1}))} setComplaints={setComplaints} dailySpecials={dailySpecials} activeEvent={activeEvent} setChallengeProgress={setChallengeProgress} reputation={reputation} updateReputation={updateReputation} activeTheme={activeTheme} restoLvN={rl.l} stock={stock} bp={bp}/>}
        {tab==="servers"    &&<ServersView    servers={servers} setServers={setServers} tables={activeTables} clockNow={clockNow} restoLvN={rl.l} cash={cash} setCash={setCash} addTx={addTx} addToast={addToast} candidatePool={candidatePool} setCandidatePool={setCandidatePool} candidateDate={candidateDate} setCandidateDate={setCandidateDate} bp={bp}/>}
        {tab==="cuisine"    &&<KitchenView    kitchen={kitchen}     setKitchen={setKitchen}  stock={stock} setStock={setStock} tables={activeTables} setTables={setTables} servers={servers} setServers={setServers} addToast={addToast} cash={cash} setCash={setCash} addTx={addTx} bp={bp}/>}
        {tab==="menu"       &&<MenuView       menu={menu} setMenu={setMenu} stock={stock} formulas={formulas} setFormulas={setFormulas} activeTheme={activeTheme} setActiveTheme={setActiveTheme} dailyStats={dailyStats} bp={bp}/>}
        {tab==="stock"      &&<StockView      stock={stock} setStock={setStock} cash={cash} setCash={setCash} addTx={addTx} kitchen={kitchen} supplierMode={supplierMode} setSupplierMode={setSupplierMode} pendingDeliveries={pendingDeliveries} setPendingDeliveries={setPendingDeliveries} menu={menu} bp={bp}/>}
        {tab==="objectives" &&<ObjectivesView objStats={objStats} completedIds={completedIds} onClaim={claimObjective} pendingClaim={pendingClaim} todayChallenges={todayChallenges} challengeProgress={challengeProgress} challengeClaimed={challengeClaimed} setChallengeClaimed={setChallengeClaimed} challengeLostToday={challengeLostToday} setCash={setCash} addTx={addTx} addRestoXp={addRestoXp} addToast={addToast} restoXp={restoXp} restoLvN={rl.l} bp={bp}/>}
        {tab==="complaints" &&<ComplaintsView complaints={complaints} setComplaints={setComplaints} tables={activeTables} servers={servers} seenIds={seenIds}/>}
        {tab==="stats"      &&<StatsView dailyStats={dailyStats} loan={loan} objStats={objStats} restoXp={restoXp} kitchen={kitchen} servers={servers} reputation={reputation} transactions={transactions} menu={menu} bp={bp}/>}
        </div>
      </div>

      {/* Nav Mobile fixe en bas */}
      <div className="mobile-nav" style={{
        position:"fixed",bottom:0,left:0,right:0,zIndex:900,
        background:C.surface,
        borderTop:`1px solid ${C.border}`,
        boxShadow:"0 -4px 24px rgba(23,18,14,0.12), 0 -1px 4px rgba(23,18,14,0.06)",
        justifyContent:"space-around",alignItems:"stretch",
        paddingBottom:"env(safe-area-inset-bottom,6px)",
      }}>
        {TABS.map(t=>{
          const readyChallenges=(todayChallenges||[]).filter(ch=>{
            const val=ch.key==="noLoss"?(!challengeLostToday&&(challengeProgress.served||0)>=1?1:0):(challengeProgress[ch.key]||0);
            return val>=ch.target&&!(challengeClaimed||{})[ch.id];
          }).length;
          const badge=t.id==="stock"?sAlerts:t.id==="objectives"?pendingClaim.length+readyChallenges:0;
          const active=tab===t.id;
          return(
            <button key={t.id} onClick={()=>{
              setTab(t.id);
              if(t.id==="complaints")
                setSeenIds(p=>new Set([...p,...complaints.filter(c=>c.status==="nouveau").map(c=>c.id)]));
            }} style={{
              flex:1,
              background:active?`linear-gradient(180deg,${C.green}08,transparent)`:"transparent",
              border:"none",
              display:"flex",flexDirection:"column",alignItems:"center",
              justifyContent:"center",
              padding:"9px 2px 5px",
              cursor:"pointer",position:"relative",
              borderTop:active?`2.5px solid ${C.green}`:"2.5px solid transparent",
              gap:4,
              transition:"background 0.15s",
            }}>
              {/* Icon container */}
              <div style={{
                width:34,height:28,
                display:"flex",alignItems:"center",justifyContent:"center",
                borderRadius:9,
                background:active?C.green+"14":"transparent",
                transition:"background 0.15s",
              }}>
                <span style={{
                  fontSize:18,lineHeight:1,
                  filter:active?"none":"grayscale(0.5) opacity(0.55)",
                  transition:"filter 0.15s",
                }}>{t.icon}</span>
              </div>
              <span style={{
                fontSize:9,fontWeight:active?700:400,fontFamily:F.body,
                color:active?C.green:C.muted,
                whiteSpace:"nowrap",letterSpacing:"0.01em",
                lineHeight:1,
              }}>
                {t.label}
              </span>
              {badge>0&&(
                <span style={{
                  position:"absolute",top:5,right:"calc(50% - 18px)",
                  background:C.red,color:"#fff",borderRadius:"50%",
                  width:15,height:15,fontSize:8,fontWeight:800,
                  display:"inline-flex",alignItems:"center",justifyContent:"center",
                  boxShadow:`0 1px 4px ${C.red}55`,
                  animation:"popIn 0.3s ease",
                }}>
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {showHelp&&<HelpModal onClose={()=>setShowHelp(false)}/>}
      {showBank&&<BankModal onClose={()=>setShowBank(false)} cash={cash} loan={loan}
        setLoan={setLoan} setCash={setCash} addTx={addTx} addToast={addToast}/>}
      {/* Ledger modal */}
      {showLedger&&(
        <div onClick={()=>setShowLedger(false)} style={{position:"fixed",inset:0,
          background:"rgba(0,0,0,0.45)",zIndex:9998,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div onClick={e=>e.stopPropagation()} style={{background:C.surface,borderRadius:18,
            width:"100%",maxWidth:560,maxHeight:"80vh",display:"flex",flexDirection:"column",
            boxShadow:"0 24px 60px rgba(0,0,0,0.25)"}}>
            {/* Header */}
            <div style={{padding:"18px 22px",borderBottom:`1px solid ${C.border}`,
              display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
              <div>
                <div style={{fontSize:17,fontWeight:700,color:C.ink,fontFamily:F.title}}>💰 Grand livre</div>
                <div style={{fontSize:11,color:C.muted,fontFamily:F.body,marginTop:2}}>
                  Solde actuel : <span style={{fontWeight:700,color:cash<200?C.red:C.green}}>
                    {cash.toLocaleString("fr-FR",{minimumFractionDigits:2})} €
                  </span>
                </div>
              </div>
              <button onClick={()=>setShowLedger(false)} style={{
                background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,
                width:32,height:32,cursor:"pointer",fontSize:16,color:C.muted}}>✕</button>
            </div>
            {/* Summary row */}
            {(()=>{
              const totalIn=transactions.filter(t=>t.type==="revenu").reduce((s,t)=>s+t.amount,0);
              const totalOut=transactions.filter(t=>t.type!=="revenu").reduce((s,t)=>s+t.amount,0);
              return(
                <div style={{display:"flex",gap:0,borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
                  {[
                    {label:"Recettes",val:totalIn,c:C.green,bg:C.greenP,icon:"📈"},
                    {label:"Dépenses",val:totalOut,c:C.red,bg:C.redP,icon:"📉"},
                    {label:"Résultat",val:totalIn-totalOut,c:totalIn-totalOut>=0?C.green:C.red,bg:totalIn-totalOut>=0?C.greenP:C.redP,icon:"⚖️"},
                  ].map(s=>(
                    <div key={s.label} style={{flex:1,background:s.bg,padding:"10px 14px",textAlign:"center",
                      borderRight:`1px solid ${C.border}`}}>
                      <div style={{fontSize:10,color:C.muted,fontFamily:F.body,marginBottom:2}}>{s.icon} {s.label}</div>
                      <div style={{fontSize:14,fontWeight:700,color:s.c,fontFamily:F.title}}>
                        {s.val>=0?"+":""}{s.val.toLocaleString("fr-FR",{minimumFractionDigits:2})} €
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
            {/* Transaction list */}
            <div style={{overflowY:"auto",flex:1,padding:"8px 0"}}>
              {transactions.length===0?(
                <div style={{padding:24,textAlign:"center",color:C.muted,fontFamily:F.body,fontSize:13}}>
                  Aucune transaction
                </div>
              ):transactions.map(tx=>{
                const isIn=tx.type==="revenu";
                const typeColors={revenu:C.green,achat:C.terra,salaire:C.navy};
                const typeIcons={revenu:"💶",achat:"🛒",salaire:"💸"};
                const c=typeColors[tx.type]||C.muted;
                const d=new Date(tx.date);
                const hm=d.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"});
                return(
                  <div key={tx.id} style={{display:"flex",alignItems:"flex-start",gap:12,
                    padding:"10px 22px",borderBottom:`1px solid ${C.border}11`}}>
                    <div style={{width:32,height:32,background:c+"18",border:`1px solid ${c}33`,
                      borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",
                      fontSize:15,flexShrink:0}}>
                      {typeIcons[tx.type]||"💰"}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12,fontWeight:600,color:C.ink,fontFamily:F.body,
                        whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                        {tx.label}
                      </div>
                      <div style={{fontSize:10,color:C.muted,fontFamily:F.body,marginTop:2}}>
                        {hm} · {tx.type}
                      </div>
                    </div>
                    <div style={{fontSize:13,fontWeight:700,color:isIn?C.green:C.red,
                      fontFamily:F.title,flexShrink:0}}>
                      {isIn?"+":"-"}{tx.amount.toLocaleString("fr-FR",{minimumFractionDigits:2})} €
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modale confirmation reset */}
      {showResetModal&&(
        <div onClick={()=>setShowResetModal(false)} style={{position:"fixed",inset:0,
          background:"rgba(0,0,0,0.55)",zIndex:10001,
          display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div onClick={e=>e.stopPropagation()} style={{background:C.surface,borderRadius:18,
            padding:28,width:"100%",maxWidth:380,
            boxShadow:"0 24px 60px rgba(0,0,0,0.3)",textAlign:"center"}}>
            <div style={{fontSize:40,marginBottom:12}}>⚠️</div>
            <div style={{fontSize:18,fontWeight:700,color:C.ink,fontFamily:F.title,marginBottom:8}}>
              Nouvelle partie ?
            </div>
            <div style={{fontSize:13,color:C.muted,fontFamily:F.body,marginBottom:24,lineHeight:1.6}}>
              Toute la progression sera effacée.<br/>
              Cette action est <strong>irréversible</strong>.
            </div>
            <div style={{display:"flex",gap:10,justifyContent:"center"}}>
              <button onClick={()=>setShowResetModal(false)} style={{
                padding:"10px 22px",borderRadius:9,border:`1.5px solid ${C.border}`,
                background:C.bg,color:C.muted,cursor:"pointer",
                fontSize:13,fontWeight:600,fontFamily:F.body}}>
                Annuler
              </button>
              <button onClick={doReset} style={{
                padding:"10px 22px",borderRadius:9,border:"none",
                background:C.red,color:"#fff",cursor:"pointer",
                fontSize:13,fontWeight:700,fontFamily:F.body,
                boxShadow:`0 4px 14px ${C.red}55`}}>
                🗑 Recommencer
              </button>
            </div>
          </div>
        </div>
      )}

      {showSummary&&(
        <DailySummaryModal
          onClose={()=>setShowSummary(false)}
          dailyStats={dailyStats}
          objStats={objStats}
          servers={servers}
          menu={menu}
          transactions={transactions}
          isRecord={summaryIsRecord}/>
      )}

      <Toasts list={toasts} onDismiss={dismissToast} onNavigate={setTab}/>
    </div>
  );
}
