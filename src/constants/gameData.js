/* ═══════════════════════════════════════════════════════
   src/constants/gameData.js
   Toutes les données statiques du jeu — aucune dépendance externe.
   Importé par : App.jsx, views/*, hooks/*
═══════════════════════════════════════════════════════ */

/* ─── Générateur de tables ───────────────────────────── */
// Factorisé ici car utilisé uniquement pour initialiser TABLES0
const _mkT = (id, name, cap = 2, capLv = 0) => ({
  id, name,
  capacity: cap,
  capLv,
  status: "libre",
  server: null,
  order: [],
  svcTimer: 0,
  svcMax: 0,
  group: null,
});

/* ─── Palette de couleurs (thème) ───────────────────── */
export const C = {
  bg:      "#f4f0e8",
  surface: "#ffffff",
  card:    "#fdfbf6",
  border:  "#ddd4c0",
  green:   "#2a5c3f",
  greenL:  "#3d7a57",
  greenP:  "#eaf3ed",
  terra:   "#c4622d",
  terraP:  "#fdf0e8",
  terraL:  "#e07a45",
  navy:    "#1c3352",
  navyP:   "#e8edf4",
  ink:     "#1a1612",
  muted:   "#8a7d6a",
  red:     "#c0392b",
  redP:    "#fdecea",
  amber:   "#b87d10",
  amberP:  "#fdf5e0",
  purple:  "#6b3fa0",
  purpleP: "#f0eaf8",
  white:   "#ffffff",
};

/* ─── Typographie ────────────────────────────────────── */
export const F = {
  title: "Georgia,'Times New Roman',serif",
  body:  "'Segoe UI',system-ui,-apple-system,sans-serif",
};

/* ─── Niveaux serveurs ───────────────────────────────── */
export const SRV_LVL = [
  { name: "Stagiaire", color: C.muted,   icon: "🎓" },
  { name: "Serveur",   color: C.green,   icon: "👔" },
  { name: "Senior",    color: C.navy,    icon: "⭐" },
  { name: "Expert",    color: C.amber,   icon: "🎖" },
  { name: "Maître",    color: C.purple,  icon: "👑" },
];

/* ─── Niveaux chef ───────────────────────────────────── */
export const CHEF_LVL = [
  { name: "Apprenti",       color: C.muted,  bg: C.bg,      icon: "👨‍🍳", commis: 1, speed: 1.0 },
  { name: "Cuisinier",      color: C.green,  bg: C.greenP,  icon: "🧑‍🍳", commis: 1, speed: 1.2 },
  { name: "Chef de Partie", color: C.navy,   bg: C.navyP,   icon: "👨‍🍳", commis: 2, speed: 1.5 },
  { name: "Sous-Chef",      color: C.amber,  bg: C.amberP,  icon: "🧑‍🍳", commis: 2, speed: 1.8 },
  { name: "Chef Cuisine",   color: C.terra,  bg: C.terraP,  icon: "👨‍🍳", commis: 3, speed: 2.2 },
  { name: "Chef Étoilé",    color: C.purple, bg: C.purpleP, icon: "⭐",   commis: 3, speed: 3.0 },
];

export const CHEF_XP_CAP = [120, 260, 450, 700, 1050];

/* ─── Niveaux commis ─────────────────────────────────── */
export const COMMIS_LVL = [
  { name: "Débutant", color: C.muted, icon: "🔪" },
  { name: "Confirmé", color: C.green, icon: "🍴" },
  { name: "Expert",   color: C.amber, icon: "⭐" },
];

export const COMMIS_XP_CAP = [80, 200];

/* ─── Niveaux restaurant ─────────────────────────────── */
export const RESTO_LVL = [
  { l: 0, name: "Café de quartier",  icon: "☕",  tables: 3,  xpNeeded: 0,    color: C.muted  },
  { l: 1, name: "Bistrot",           icon: "🍺",  tables: 5,  xpNeeded: 300,  color: C.green  },
  { l: 2, name: "Brasserie",         icon: "🍽",  tables: 7,  xpNeeded: 800,  color: C.navy   },
  { l: 3, name: "Restaurant",        icon: "⭐",  tables: 9,  xpNeeded: 1800, color: C.terra  },
  { l: 4, name: "Grand Restaurant",  icon: "🌟",  tables: 11, xpNeeded: 3500, color: C.purple },
  { l: 5, name: "Palace",            icon: "👑",  tables: 12, xpNeeded: 6000, color: C.amber  },
];

/* ─── Slots serveurs par niveau resto ────────────────── */
export const SERVER_SLOTS_BY_LEVEL = { 0: 2, 1: 3, 2: 4, 3: 5, 4: 6, 5: 8 };

/* ─── Agrandissements de tables ──────────────────────── */
export const CAP_UPGRADES = [
  { capLv: 0, label: "Agrandir (×2→4)", cost: 800,  newCap: 4 },
  { capLv: 1, label: "Agrandir (×4→6)", cost: 1800, newCap: 6 },
];

/* ─── Humeurs clients ────────────────────────────────── */
export const MOODS = [
  { e: "🤩", l: "Enthousiaste", p: 45, b: 1.5 },
  { e: "😊", l: "Détendu",      p: 35, b: 1.2 },
  { e: "😐", l: "Neutre",       p: 25, b: 1.0 },
  { e: "😑", l: "Pressé",       p: 18, b: 0.8 },
  { e: "😤", l: "Impatient",    p: 11, b: 0.6 },
];

/* ─── Banque de prénoms (génération aléatoire) ───────── */
export const NAMES1 = [
  "Alice","Bruno","Clara","Denis","Elena","Félix","Gina","Hugo",
  "Iris","Jean","Katia","Luc","Mona","Noé","Olivia","Paul","Rosa","Sam","Tina","Vera"
];
export const NAMES2 = [
  "Martin","Dupont","Bernard","Thomas","Robert","Petit","Moreau","Simon","Laurent","Michel"
];

/* ─── État initial : tables (12 max) ─────────────────── */
export const TABLES0 = [
  _mkT(1,  "Table 1"),   _mkT(2,  "Table 2"),   _mkT(3,  "Table 3"),
  _mkT(4,  "Table 4"),   _mkT(5,  "Table 5"),   _mkT(6,  "Table 6"),
  _mkT(7,  "Table 7"),   _mkT(8,  "Table 8"),   _mkT(9,  "Table 9"),
  _mkT(10, "Table 10"),  _mkT(11, "Table 11"),  _mkT(12, "Table 12"),
];

/* ─── État initial : serveurs ────────────────────────── */
export const SERVERS0 = [
  { id: 1, name: "Marie Dupont",  status: "actif", totalXp: 320, rating: 4.8, salary: 14, moral: 90, specialty: null },
  { id: 2, name: "Pierre Martin", status: "actif", totalXp: 180, rating: 4.5, salary: 12, moral: 75, specialty: null },
];

/* ─── État initial : stock (ingrédients bruts) ───────── */
// price = coût d'achat unitaire en €
export const STOCK0 = [
  // Viandes & Poissons
  { id: 1,  name: "Bœuf",          qty: 12,  unit: "kg",     alert: 3,    cat: "Viandes",  price: 18   },
  { id: 2,  name: "Saumon",        qty: 8,   unit: "kg",     alert: 2,    cat: "Poissons", price: 22   },
  { id: 3,  name: "Poulet",        qty: 10,  unit: "pcs",    alert: 3,    cat: "Viandes",  price: 9    },
  { id: 4,  name: "Foie gras",     qty: 2,   unit: "kg",     alert: 0.5,  cat: "Fins",     price: 95   },
  // Légumes & Herbes
  { id: 5,  name: "Laitue romaine",qty: 20,  unit: "pcs",    alert: 5,    cat: "Légumes",  price: 1.2  },
  { id: 6,  name: "Oignons",       qty: 8,   unit: "kg",     alert: 2,    cat: "Légumes",  price: 1.5  },
  { id: 7,  name: "Champignons",   qty: 6,   unit: "kg",     alert: 1,    cat: "Légumes",  price: 8    },
  { id: 8,  name: "Ail",           qty: 3,   unit: "kg",     alert: 0.5,  cat: "Légumes",  price: 4    },
  { id: 9,  name: "Pommes",        qty: 10,  unit: "kg",     alert: 2,    cat: "Légumes",  price: 2    },
  { id: 10, name: "Thym",          qty: 20,  unit: "bottes", alert: 4,    cat: "Herbes",   price: 0.8  },
  // Laitiers
  { id: 11, name: "Beurre",        qty: 5,   unit: "kg",     alert: 1,    cat: "Laitiers", price: 9    },
  { id: 12, name: "Crème fraîche", qty: 8,   unit: "L",      alert: 1.5,  cat: "Laitiers", price: 3.5  },
  { id: 13, name: "Œufs",         qty: 80,  unit: "u",      alert: 12,   cat: "Laitiers", price: 0.3  },
  { id: 14, name: "Parmesan",      qty: 3,   unit: "kg",     alert: 0.5,  cat: "Laitiers", price: 24   },
  { id: 15, name: "Gruyère",       qty: 3,   unit: "kg",     alert: 0.5,  cat: "Laitiers", price: 16   },
  // Épicerie
  { id: 16, name: "Farine",        qty: 10,  unit: "kg",     alert: 2,    cat: "Épicerie", price: 1    },
  { id: 17, name: "Sucre",         qty: 6,   unit: "kg",     alert: 1,    cat: "Épicerie", price: 1.2  },
  { id: 18, name: "Riz Arborio",   qty: 5,   unit: "kg",     alert: 1,    cat: "Épicerie", price: 3.5  },
  { id: 19, name: "Huile d'olive", qty: 4,   unit: "L",      alert: 0.5,  cat: "Épicerie", price: 7    },
  // Boissons
  { id: 20, name: "Vin blanc",     qty: 18,  unit: "btl",    alert: 4,    cat: "Boissons", price: 6    },
  { id: 21, name: "Bordeaux",      qty: 24,  unit: "btl",    alert: 8,    cat: "Boissons", price: 12   },
  { id: 22, name: "Eau minérale",  qty: 48,  unit: "btl",    alert: 12,   cat: "Boissons", price: 0.5  },
];

/* ─── État initial : menu (plats définis par recette) ── */
// prepTime : temps de préparation de base en secondes (avant bonus chef)
export const MENU0 = [
  // ── Entrées ──────────────────────────────────────────
  {
    id: 1, name: "Salade César", cat: "Entrées", price: 14, prepTime: 45,
    ingredients: [
      { stockId: 5,  qty: 1    },  // laitue romaine
      { stockId: 14, qty: 0.06 },  // parmesan
      { stockId: 13, qty: 1    },  // œufs
      { stockId: 19, qty: 0.04 },  // huile d'olive
    ],
  },
  {
    id: 2, name: "Soupe à l'oignon", cat: "Entrées", price: 11, prepTime: 90,
    ingredients: [
      { stockId: 6,  qty: 0.35 },  // oignons
      { stockId: 11, qty: 0.05 },  // beurre
      { stockId: 16, qty: 0.02 },  // farine
      { stockId: 15, qty: 0.07 },  // gruyère
    ],
  },
  {
    id: 3, name: "Foie gras maison", cat: "Entrées", price: 22, prepTime: 60,
    ingredients: [
      { stockId: 4,  qty: 0.12 },  // foie gras
      { stockId: 11, qty: 0.02 },  // beurre
      { stockId: 17, qty: 0.01 },  // sucre (chutney)
    ],
  },
  // ── Plats ────────────────────────────────────────────
  {
    id: 4, name: "Entrecôte 300g", cat: "Plats", price: 28, prepTime: 75,
    ingredients: [
      { stockId: 1,  qty: 0.35 },  // bœuf
      { stockId: 11, qty: 0.06 },  // beurre
      { stockId: 8,  qty: 0.02 },  // ail
      { stockId: 10, qty: 1    },  // thym
    ],
  },
  {
    id: 5, name: "Saumon grillé", cat: "Plats", price: 24, prepTime: 120,
    ingredients: [
      { stockId: 2,  qty: 0.25 },  // saumon
      { stockId: 11, qty: 0.04 },  // beurre
      { stockId: 19, qty: 0.02 },  // huile d'olive
      { stockId: 8,  qty: 0.01 },  // ail
    ],
  },
  {
    id: 6, name: "Poulet rôti", cat: "Plats", price: 19, prepTime: 105,
    ingredients: [
      { stockId: 3,  qty: 1    },  // poulet
      { stockId: 11, qty: 0.07 },  // beurre
      { stockId: 8,  qty: 0.03 },  // ail
      { stockId: 10, qty: 2    },  // thym
    ],
  },
  {
    id: 7, name: "Risotto champignons", cat: "Plats", price: 18, prepTime: 180,
    ingredients: [
      { stockId: 18, qty: 0.15 },  // riz arborio
      { stockId: 7,  qty: 0.2  },  // champignons
      { stockId: 6,  qty: 0.08 },  // oignons
      { stockId: 14, qty: 0.05 },  // parmesan
      { stockId: 11, qty: 0.04 },  // beurre
      { stockId: 20, qty: 0.15 },  // vin blanc
    ],
  },
  // ── Desserts ─────────────────────────────────────────
  {
    id: 8, name: "Crème brûlée", cat: "Desserts", price: 9, prepTime: 75,
    ingredients: [
      { stockId: 12, qty: 0.2  },  // crème fraîche
      { stockId: 13, qty: 3    },  // œufs
      { stockId: 17, qty: 0.05 },  // sucre
    ],
  },
  {
    id: 9, name: "Tarte Tatin", cat: "Desserts", price: 10, prepTime: 105,
    ingredients: [
      { stockId: 9,  qty: 0.35 },  // pommes
      { stockId: 11, qty: 0.08 },  // beurre
      { stockId: 17, qty: 0.07 },  // sucre
      { stockId: 16, qty: 0.1  },  // farine
    ],
  },
  // ── Boissons ─────────────────────────────────────────
  {
    id: 10, name: "Bordeaux 75cl", cat: "Boissons", price: 32, prepTime: 8,
    ingredients: [{ stockId: 21, qty: 1 }],
  },
  {
    id: 11, name: "Eau minérale 1L", cat: "Boissons", price: 5, prepTime: 5,
    ingredients: [{ stockId: 22, qty: 1 }],
  },
];

/* ─── État initial : plaintes ────────────────────────── */
export const COMPLAINTS0 = [
  {
    id: 1, date: "2026-03-10", table: 3, server: "Pierre Martin",
    type: "Qualité plat",      desc: "Entrecôte trop cuite",
    status: "résolu",          prio: "haute",
  },
  {
    id: 2, date: "2026-03-11", table: 6, server: "Lucas Petit",
    type: "Délai service",     desc: "Attente de 40 min pour les entrées",
    status: "en cours",        prio: "moyenne",
  },
  {
    id: 3, date: "2026-03-11", table: 5, server: "Sophie Bernard",
    type: "Facture incorrecte",desc: "Erreur sur l'addition",
    status: "nouveau",         prio: "basse",
  },
];

/* ─── État initial : cuisine ─────────────────────────── */
export const KITCHEN0 = {
  chef: {
    id: 1, name: "Julien Marchand",
    totalXp: 0, status: "actif",
    specialty: "Cuisine française",
    signature: "Entrecôte maison",
    salary: 28,
  },
  commis: [
    { id: 1, name: "Léa Fontaine", totalXp: 0,  status: "actif", task: null, salary: 10 },
    { id: 2, name: "Tom Renard",   totalXp: 10, status: "actif", task: null, salary: 10 },
    { id: 3, name: "Nina Morel",   totalXp: 0,  status: "actif", task: null, salary: 10 },
  ],
  queue:       [],
  cooking:     [],
  done:        [],
  totalDishes: 0,
  upgrades:    { fourneau: 0, four: 0, stockage: 0, plonge: 0 },
};

/* ─── Améliorations de cuisine ───────────────────────── */
export const KITCHEN_UPGRADES = [
  {
    id: "fourneau", icon: "🔥", name: "Fourneau supplémentaire",
    desc: "Ajoute +1 feu de cuisson simultané.",
    levels: [
      { l: 1, cost: 600,  bonus: { slots: 1 }, label: "+1 feu (5 total)" },
      { l: 2, cost: 1200, bonus: { slots: 1 }, label: "+1 feu (6 total)" },
      { l: 3, cost: 2200, bonus: { slots: 1 }, label: "+1 feu (7 total)" },
    ],
  },
  {
    id: "four", icon: "🏺", name: "Four professionnel",
    desc: "Réduit le temps de cuisson de tous les plats.",
    levels: [
      { l: 1, cost: 800,  bonus: { speed: 0.15 }, label: "−15 % temps de cuisson" },
      { l: 2, cost: 1800, bonus: { speed: 0.15 }, label: "−30 % temps de cuisson" },
      { l: 3, cost: 3500, bonus: { speed: 0.20 }, label: "−50 % temps de cuisson" },
    ],
  },
  {
    id: "stockage", icon: "🧊", name: "Chambre froide",
    desc: "Double la capacité maximale de chaque ingrédient en stock.",
    levels: [
      { l: 1, cost: 1000, bonus: { storage: 1 }, label: "Capacité stock ×2" },
      { l: 2, cost: 2500, bonus: { storage: 1 }, label: "Capacité stock ×3" },
    ],
  },
  {
    id: "plonge", icon: "🚿", name: "Station de plonge",
    desc: "Réduit le temps de nettoyage des tables.",
    levels: [
      { l: 1, cost: 500,  bonus: { clean: 20 }, label: "Nettoyage −20s (40s)" },
      { l: 2, cost: 1200, bonus: { clean: 20 }, label: "Nettoyage −20s (20s)" },
    ],
  },
];

/* ─── Fournisseurs ───────────────────────────────────── */
export const SUPPLIERS = {
  standard: {
    id: "standard", name: "Fournisseur Local", icon: "🚚",
    desc: "Prix réduit (−20%) mais livraison en 2 minutes.",
    discount: 0.20, delay: 120,
  },
  premium: {
    id: "premium", name: "Grossiste Premium", icon: "⚡",
    desc: "Prix plein mais livraison instantanée.",
    discount: 0, delay: 0,
  },
};

/* ─── Options de prêt bancaire ───────────────────────── */
export const LOAN_OPTIONS = [
  { id: "small",  label: "Petit prêt",    amount: 1500, rate: 0.06,  monthly: 90,  icon: "💳" },
  { id: "medium", label: "Prêt standard", amount: 4000, rate: 0.05,  monthly: 220, icon: "🏦" },
  { id: "large",  label: "Grand prêt",    amount: 9000, rate: 0.045, monthly: 475, icon: "🏛" },
];

/* ─── Pool de défis quotidiens ───────────────────────── */
export const CHALLENGES_POOL = [
  { id: "c_5_clients",  icon: "👥", title: "5 clients servis",      desc: "Servez 5 clients aujourd'hui",                key: "served",    target: 5,    reward: { cash: 150, xp: 40  } },
  { id: "c_10_clients", icon: "🔟", title: "10 clients servis",     desc: "Servez 10 clients aujourd'hui",               key: "served",    target: 10,   reward: { cash: 300, xp: 80  } },
  { id: "c_200_rev",    icon: "💶", title: "200 € de recettes",     desc: "Encaissez 200 € dans la journée",             key: "revenue",   target: 200,  reward: { cash: 100, xp: 30  } },
  { id: "c_500_rev",    icon: "💰", title: "500 € de recettes",     desc: "Encaissez 500 € dans la journée",             key: "revenue",   target: 500,  reward: { cash: 250, xp: 60  } },
  { id: "c_1000_rev",   icon: "🏆", title: "1 000 € de recettes",   desc: "Encaissez 1 000 € dans la journée",           key: "revenue",   target: 1000, reward: { cash: 500, xp: 120 } },
  { id: "c_no_loss",    icon: "✨", title: "Zéro client perdu",      desc: "Ne perdez aucun client de la journée",        key: "noLoss",    target: 1,    reward: { cash: 200, xp: 60  } },
  { id: "c_3_stars",    icon: "⭐", title: "3 notes ★★★★+",         desc: "Obtenez 3 notes de 4 étoiles ou plus",        key: "highRating",target: 3,    reward: { cash: 180, xp: 50  } },
  { id: "c_5_stars",    icon: "🌟", title: "5 notes ★★★★+",         desc: "Obtenez 5 notes de 4 étoiles ou plus",        key: "highRating",target: 5,    reward: { cash: 350, xp: 100 } },
  { id: "c_rush",       icon: "⚡", title: "Rush express",           desc: "Placez 3 groupes en moins de 5 minutes",      key: "fastPlace", target: 3,    reward: { cash: 200, xp: 70  } },
  { id: "c_vip",        icon: "🎩", title: "Service VIP",            desc: "Servez un client VIP",                        key: "vip",       target: 1,    reward: { cash: 300, xp: 80  } },
  { id: "c_full_house", icon: "🍽", title: "Salle comble",           desc: "Ayez 5 tables occupées simultanément",        key: "fullHouse", target: 1,    reward: { cash: 250, xp: 70  } },
  { id: "c_tip_master", icon: "💸", title: "Maître du pourboire",    desc: "Cumulez 50 € de pourboires dans la journée",  key: "tips",      target: 50,   reward: { cash: 150, xp: 40  } },
];

/* ─── Objectifs de progression (4 séries) ────────────── */
export const OBJECTIVES_DEF = [
  // Série 1 — Premiers pas
  { id: "first_service", series: 1, title: "Premier service",    desc: "Servez votre premier client",              icon: "🍽", reward: { cash: 200,  xp: 50  }, condition: (s) => s.totalServed  >= 1    },
  { id: "five_tables",   series: 1, title: "En rythme",          desc: "Servez 5 tables",                          icon: "⊞", reward: { cash: 500,  xp: 100 }, condition: (s) => s.totalServed  >= 5    },
  { id: "first_k",       series: 1, title: "Premier millier",    desc: "Atteignez 1 000 € de chiffre d'affaires",  icon: "💶", reward: { cash: 300,  xp: 80  }, condition: (s) => s.totalRevenue >= 1000 },
  { id: "no_loss_day",   series: 1, title: "Service impeccable", desc: "Terminez une journée sans perdre un client",icon: "✨", reward: { cash: 400,  xp: 120 }, condition: (s) => s.perfectDays  >= 1    },
  // Série 2 — Croissance
  { id: "twenty_tables", series: 2, title: "Rush du midi",       desc: "Servez 20 tables",                         icon: "🔥", reward: { cash: 800,  xp: 200 }, condition: (s) => s.totalServed  >= 20   },
  { id: "five_k",        series: 2, title: "Brasserie rentable", desc: "Atteignez 5 000 € de chiffre d'affaires",  icon: "📈", reward: { cash: 600,  xp: 150 }, condition: (s) => s.totalRevenue >= 5000 },
  { id: "upgrade_table", series: 2, title: "Confort amélioré",   desc: "Agrandissez une table",                    icon: "🪑", reward: { cash: 400,  xp: 100 }, condition: (s) => s.tablesUpgraded >= 1  },
  { id: "bistrot",       series: 2, title: "Bistrot",            desc: "Atteignez le niveau Bistrot",              icon: "🍺", reward: { cash: 700,  xp: 200 }, condition: (s) => s.restoLevel   >= 1    },
  // Série 3 — Excellence
  { id: "fifty_tables",  series: 3, title: "Service non-stop",   desc: "Servez 50 tables",                         icon: "🏃", reward: { cash: 1500, xp: 400 }, condition: (s) => s.totalServed  >= 50   },
  { id: "twenty_k",      series: 3, title: "Grand Compte",       desc: "Atteignez 20 000 € de chiffre d'affaires", icon: "💰", reward: { cash: 2000, xp: 500 }, condition: (s) => s.totalRevenue >= 20000},
  { id: "three_upgrades",series: 3, title: "Salle de prestige",  desc: "Agrandissez 3 tables",                     icon: "✨", reward: { cash: 1200, xp: 300 }, condition: (s) => s.tablesUpgraded >= 3  },
  { id: "brasserie",     series: 3, title: "Brasserie",          desc: "Atteignez le niveau Brasserie",            icon: "🍽", reward: { cash: 1500, xp: 400 }, condition: (s) => s.restoLevel   >= 2    },
  // Série 4 — Légende
  { id: "hundred_tables",series: 4, title: "Centenaire",         desc: "Servez 100 tables",                          icon: "🏆", reward: { cash: 3000, xp: 800  }, condition: (s) => s.totalServed  >= 100  },
  { id: "fifty_k",       series: 4, title: "Empire",             desc: "Atteignez 50 000 € de chiffre d'affaires",   icon: "💎", reward: { cash: 5000, xp: 1000 }, condition: (s) => s.totalRevenue >= 50000},
  { id: "flawless_5",    series: 4, title: "Service légendaire", desc: "Terminez 5 journées sans perdre un client",  icon: "✨", reward: { cash: 4000, xp: 900  }, condition: (s) => (s.perfectDays||0) >= 5},
  { id: "palace",        series: 4, title: "Le Palace",          desc: "Atteignez le niveau Palace",                 icon: "👑", reward: { cash: 5000, xp: 1200 }, condition: (s) => s.restoLevel   >= 5    },
];

/* ─── Étiquettes & couleurs des séries d'objectifs ───── */
export const SERIES_LABELS = { 1: "Premiers pas", 2: "Croissance", 3: "Excellence", 4: "Légende" };
export const SERIES_COLORS = { 1: C.green, 2: C.navy, 3: C.terra, 4: C.amber };

/* ─── Événements aléatoires ──────────────────────────── */
// Les fonctions apply() reçoivent les setters en paramètres
// pour rester découplées de l'état React.
export const GAME_EVENTS = [
  {
    id: "inspection", icon: "🔍", title: "Inspection sanitaire",
    desc: "Un inspecteur de la DGCCRF débarque à l'improviste.",
    type: "auto",
    apply: (stock, cash, complaints, addToast, setCash, addTx, setComplaints) => {
      const alerts = stock.filter(s => s.qty <= s.alert).length;
      if (alerts >= 3) {
        const fine = 300;
        setCash(c => Math.max(0, c - fine));
        addTx("dépense", "Amende inspection sanitaire (infractions stock)", fine);
        setComplaints(p => [{
          id: Date.now(), date: new Date().toLocaleDateString("fr-FR"),
          table: "-", server: "-", type: "Inspection",
          desc: `${alerts} infractions relevées — amende ${fine}€`,
          status: "nouveau", prio: "haute",
        }, ...p]);
        addToast({ icon: "🚨", title: "Inspection — Amende !", msg: `${alerts} infractions · −${fine}€`, color: "#c0392b", tab: "plaintes" });
        return "fail";
      } else {
        const bonus = 100;
        setCash(c => c + bonus);
        addTx("revenu", "Bonus inspection sanitaire (dossier exemplaire)", bonus);
        addToast({ icon: "✅", title: "Inspection réussie !", msg: `Dossier exemplaire · +${bonus}€`, color: "#2a5c3f", tab: "stats" });
        return "pass";
      }
    },
  },
  {
    id: "rush", icon: "⚡", title: "Rush inattendu !",
    desc: "Un groupe important vient de réserver — afflux soudain de clients.",
    type: "auto",
    apply: (stock, cash, complaints, addToast, setCash, addTx, setComplaints, setQueue, rMood, rName, rSize, tables) => {
      const maxCap = Math.max(...tables.filter(t => t.status === "libre").map(t => t.capacity), 2);
      const groups = Array.from({ length: 3 }, () => {
        const mood = rMood();
        return { id: Date.now() + Math.random(), name: rName(), size: Math.min(rSize(), maxCap), mood, expiresAt: Date.now() + mood.p * 1500, patMax: mood.p };
      });
      setQueue(q => [...q, ...groups]);
      addToast({ icon: "⚡", title: "Rush inattendu !", msg: "3 groupes ajoutés en file d'attente", color: "#b87d10", tab: "tables" });
    },
  },
  {
    id: "frigo", icon: "🧊", title: "Panne de chambre froide !",
    desc: "La chambre froide a lâché cette nuit. Une partie des stocks est perdue.",
    type: "auto",
    apply: (stock, cash, complaints, addToast, setCash, addTx, setComplaints, setQueue, rMood, rName, rSize, tables, setStock) => {
      setStock(s => s.map(item => {
        if (["kg", "L"].includes(item.unit) && ["Viandes", "Poissons", "Laitiers"].includes(item.cat))
          return { ...item, qty: +(item.qty * 0.4).toFixed(3) };
        return item;
      }));
      addToast({ icon: "🧊", title: "Panne frigo !", msg: "Stocks viandes/poissons réduits de 60%", color: "#1c3352", tab: "stock" });
    },
  },
  {
    id: "critique", icon: "✍️", title: "Critique gastronomique",
    desc: "Un critique du Michelin serait en ville ce soir. Une table VIP vient d'arriver.",
    type: "auto",
    apply: (stock, cash, complaints, addToast, setCash, addTx, setComplaints, setQueue) => {
      const vip = {
        id: Date.now() + Math.random(), name: "Guide Michelin", size: 2,
        mood: { e: "🎩", l: "VIP", p: 60, b: 3.0 }, isVIP: true,
        expiresAt: Date.now() + 60000, patMax: 60,
      };
      setQueue(q => [vip, ...q]);
      addToast({ icon: "🎩", title: "Client VIP !", msg: "Un critique Michelin attend — servez-le vite !", color: "#6b3fa0", tab: "tables" });
    },
  },
  {
    id: "anniversaire", icon: "🎉", title: "Anniversaire surprise !",
    desc: "Un groupe fête un anniversaire — bonne humeur générale dans toute la salle.",
    type: "auto",
    apply: (stock, cash, complaints, addToast, setCash, addTx, setComplaints, setQueue, rMood, rName, rSize, tables, setStock, setTables) => {
      // Étendre la patience de tous les groupes en attente de +30%
      setQueue(q => q.map(g => ({
        ...g,
        expiresAt: g.expiresAt + Math.round(g.patMax * 1000 * 0.3),
      })));
      // Étendre le temps de repas des tables en train de manger
      setTables(t => t.map(tbl => {
        if (tbl.status === "mange" && tbl.eatUntil)
          return { ...tbl, eatUntil: tbl.eatUntil + 30000 };
        return tbl;
      }));
      const bonus = 60;
      setCash(c => +(c + bonus).toFixed(2));
      addTx("revenu", "Ambiance anniversaire — bonus ambiance", bonus);
      addToast({ icon: "🎉", title: "Anniversaire surprise !", msg: "Patience +30% pour tous · +60€ bonus ambiance", color: "#6b3fa0", tab: "tables" });
    },
  },
  {
    id: "buzz", icon: "📱", title: "Buzz sur les réseaux !",
    desc: "Une story virale attire du monde. File d'attente et réputation en hausse.",
    type: "auto",
    apply: (stock, cash, complaints, addToast, setCash, addTx, setComplaints, setQueue, rMood, rName, rSize, tables, setStock, setTables, setServers, setKitchen, updateReputation) => {
      const maxCap = Math.max(...(tables.filter(t => t.status === "libre").map(t => t.capacity)), 2);
      const groups = Array.from({ length: 2 }, () => {
        const mood = rMood();
        return { id: Date.now() + Math.random(), name: rName(), size: Math.min(rSize(), maxCap), mood, expiresAt: Date.now() + mood.p * 1000, patMax: mood.p };
      });
      const vip = {
        id: Date.now() + Math.random(), name: rName(), size: 2,
        mood: { e: "🎩", l: "VIP", p: 50, b: 2.0 }, isVIP: true,
        expiresAt: Date.now() + 50000, patMax: 50,
      };
      setQueue(q => [...q, ...groups, vip]);
      if (updateReputation) updateReputation(5, "buzz réseaux sociaux");
      addToast({ icon: "📱", title: "Buzz sur les réseaux !", msg: "3 groupes en file · Réputation +5", color: "#6b3fa0", tab: "tables" });
    },
  },
  {
    id: "blackout", icon: "🌑", title: "Coupure électrique !",
    desc: "Panne partielle — la cuisine tourne au ralenti pendant 3 minutes.",
    type: "auto",
    apply: (stock, cash, complaints, addToast, setCash, addTx, setComplaints, setQueue, rMood, rName, rSize, tables, setStock, setTables, setServers, setKitchen) => {
      const now = Date.now();
      // Allonger le temps restant de cuisson de 50%
      setKitchen(k => ({
        ...k,
        cooking: k.cooking.map(d => {
          const finishAt = d.startedAt + d.timerMax * 1000;
          const remaining = Math.max(0, finishAt - now);
          // Nouveau startedAt pour que finishAt = now + remaining * 1.5
          const newStartedAt = now + remaining * 1.5 - d.timerMax * 1000;
          return { ...d, startedAt: newStartedAt };
        }),
      }));
      addToast({ icon: "🌑", title: "Coupure électrique !", msg: "Cuisson ralentie +50% · Retour normal dans 3 min", color: "#1c3352", tab: "cuisine" });
      setTimeout(() => {
        addToast({ icon: "💡", title: "Électricité rétablie !", msg: "La cuisine reprend son rythme normal", color: "#2a5c3f", tab: "cuisine" });
      }, 180_000);
    },
  },
  {
    id: "livraison_cadeau", icon: "🚚", title: "Livraison cadeau fournisseur !",
    desc: "Votre fournisseur offre un réapprovisionnement gratuit sur vos stocks les plus bas.",
    type: "auto",
    apply: (stock, cash, complaints, addToast, setCash, addTx, setComplaints, setQueue, rMood, rName, rSize, tables, setStock) => {
      // Trouver les 5 articles les plus bas (ratio qty/alert)
      const sorted = [...stock]
        .filter(s => s.alert > 0)
        .sort((a, b) => (a.qty / a.alert) - (b.qty / b.alert))
        .slice(0, 5);
      const ids = new Set(sorted.map(s => s.id));
      setStock(prev => prev.map(s => {
        if (!ids.has(s.id)) return s;
        const restock = +(s.alert * 5).toFixed(3);
        return { ...s, qty: +(s.qty + restock).toFixed(3) };
      }));
      addToast({ icon: "🚚", title: "Livraison cadeau !", msg: `${sorted.map(s => s.name).join(", ")} réapprovisionnés gratuitement`, color: "#2a5c3f", tab: "stock" });
    },
  },
  {
    id: "serveur_malade", icon: "🤧", title: "Serveur malade !",
    desc: "Un serveur se sent mal et doit s'arrêter 4 minutes.",
    type: "auto",
    apply: (stock, cash, complaints, addToast, setCash, addTx, setComplaints, setQueue, rMood, rName, rSize, tables, setStock, setTables, setServers, setKitchen, updateReputation, serversRef) => {
      const actifs = (serversRef || []).filter(s => s.status === "actif");
      if (actifs.length === 0) return;
      const victim = actifs[Math.floor(Math.random() * actifs.length)];
      const pauseUntil = Date.now() + 240_000;
      setServers(prev => prev.map(s =>
        s.id !== victim.id ? s : { ...s, status: "pause", moral: 10, pauseUntil }
      ));
      addToast({ icon: "🤧", title: "Serveur malade !", msg: `${victim.name} est indisponible pendant 4 minutes`, color: "#c4622d", tab: "servers" });
      setTimeout(() => {
        setServers(prev => prev.map(s =>
          s.id !== victim.id ? s : { ...s, status: "actif", pauseUntil: null }
        ));
        addToast({ icon: "💪", title: `${victim.name} de retour !`, msg: "Le serveur a repris son service", color: "#2a5c3f", tab: "servers" });
      }, 240_000);
    },
  },
];

/* ─── Onglets de navigation ──────────────────────────── */
export const TABS = [
  { id: "tables",      label: "Tables",       icon: "⊞"  },
  { id: "servers",     label: "Serveurs",     icon: "👤"  },
  { id: "cuisine",     label: "Cuisine",      icon: "👨‍🍳" },
  { id: "menu",        label: "Menu",         icon: "📋"  },
  { id: "stock",       label: "Stocks",       icon: "📦"  },
  { id: "objectives",  label: "Objectifs",    icon: "🎯"  },
  { id: "complaints",  label: "Plaintes",     icon: "⚠"  },
  { id: "stats",       label: "Statistiques", icon: "📊"  },
];
