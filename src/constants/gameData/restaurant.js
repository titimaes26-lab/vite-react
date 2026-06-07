import { C, _mkT } from './theme.js';

export const RESTO_LVL = [
  /* ── Ère 1 : Établissements locaux (0–9) ─────────────── */
  { l:  0, name: "Café de quartier",       icon: "☕",    tables:  3, xpNeeded:      0, color: C.muted  },
  { l:  1, name: "Snack Bar",              icon: "🥙",    tables:  4, xpNeeded:    300, color: C.muted  },
  { l:  2, name: "Café-Brasserie",         icon: "🍵",    tables:  5, xpNeeded:    800, color: C.green  },
  { l:  3, name: "Bistrot",               icon: "🍺",    tables:  6, xpNeeded:  1_800, color: C.green  },
  { l:  4, name: "Auberge",               icon: "🏡",    tables:  7, xpNeeded:  3_500, color: C.navy   },
  { l:  5, name: "Taverne",               icon: "🍻",    tables:  8, xpNeeded:  6_000, color: C.navy   },
  { l:  6, name: "Bouchon",               icon: "🥂",    tables:  9, xpNeeded:  9_000, color: C.terra  },
  { l:  7, name: "Guinguette",            icon: "🎵",    tables: 10, xpNeeded: 12_500, color: C.terra  },
  { l:  8, name: "Hostellerie",           icon: "🏠",    tables: 11, xpNeeded: 17_000, color: C.amber  },
  { l:  9, name: "Estaminet",             icon: "🪵",    tables: 12, xpNeeded: 22_500, color: C.amber  },
  /* ── Ère 2 : Reconnaissance régionale (10–19) ─────────── */
  { l: 10, name: "Restaurant",            icon: "🍽️",   tables: 13, xpNeeded: 29_500, color: C.purple },
  { l: 11, name: "Restaurant Bourgeois",  icon: "🎩",    tables: 14, xpNeeded: 38_000, color: C.purple },
  { l: 12, name: "Table Gourmande",       icon: "🍴",    tables: 15, xpNeeded: 48_500, color: C.green  },
  { l: 13, name: "Maison de Maître",      icon: "🏛️",   tables: 15, xpNeeded: 61_000, color: C.green  },
  { l: 14, name: "Restaurant Gastro.",    icon: "⭐",    tables: 16, xpNeeded: 76_000, color: C.navy   },
  { l: 15, name: "Table d'Auteur",        icon: "🖋️",   tables: 16, xpNeeded: 94_000, color: C.navy   },
  { l: 16, name: "Cuisine Créative",      icon: "✨",    tables: 17, xpNeeded:115_000, color: C.terra  },
  { l: 17, name: "Restaurant Renommé",    icon: "🌟",    tables: 17, xpNeeded:140_000, color: C.terra  },
  { l: 18, name: "Brasserie de Prestige", icon: "🥇",    tables: 18, xpNeeded:169_000, color: C.amber  },
  { l: 19, name: "Table du Chef",         icon: "👨‍🍳", tables: 18, xpNeeded:202_000, color: C.amber  },
  /* ── Ère 3 : Gastronomie étoilée (20–29) ─────────────── */
  { l: 20, name: "Haute Cuisine",          icon: "🌺",   tables: 19, xpNeeded:240_000, color: C.purple },
  { l: 21, name: "Maison Étoilée",         icon: "⭐",   tables: 19, xpNeeded:283_000, color: C.purple },
  { l: 22, name: "Grande Table",           icon: "🍾",   tables: 20, xpNeeded:332_000, color: C.green  },
  { l: 23, name: "Restaurant d'Exception", icon: "💎",   tables: 20, xpNeeded:387_000, color: C.green  },
  { l: 24, name: "Cuisine d'Auteur",       icon: "🎨",   tables: 21, xpNeeded:449_000, color: C.navy   },
  { l: 25, name: "Grand Restaurant",       icon: "🌟",   tables: 21, xpNeeded:518_000, color: C.navy   },
  { l: 26, name: "Établissement Réputé",   icon: "🏆",   tables: 22, xpNeeded:595_000, color: C.terra  },
  { l: 27, name: "Maison Gastronomique",   icon: "🌹",   tables: 22, xpNeeded:681_000, color: C.terra  },
  { l: 28, name: "Cuisine d'Excellence",   icon: "💫",   tables: 23, xpNeeded:776_000, color: C.amber  },
  { l: 29, name: "Temple Gastronomique",   icon: "🏛️",  tables: 23, xpNeeded:882_000, color: C.amber  },
  /* ── Ère 4 : Prestige international (30–39) ──────────── */
  { l: 30, name: "Restaurant 2 Étoiles",   icon: "⭐⭐",  tables: 24, xpNeeded:  999_000, color: C.purple },
  { l: 31, name: "Grande Maison",          icon: "🏰",   tables: 24, xpNeeded:1_128_000, color: C.purple },
  { l: 32, name: "Restaurant Légendaire",  icon: "🌠",   tables: 25, xpNeeded:1_270_000, color: C.green  },
  { l: 33, name: "Maison d'Élite",         icon: "💎",   tables: 25, xpNeeded:1_426_000, color: C.green  },
  { l: 34, name: "Institut Gastronomique", icon: "🎓",   tables: 26, xpNeeded:1_597_000, color: C.navy   },
  { l: 35, name: "Palace Gastronomique",   icon: "🏯",   tables: 26, xpNeeded:1_784_000, color: C.navy   },
  { l: 36, name: "Restaurant 3 Étoiles",   icon: "⭐⭐⭐", tables: 27, xpNeeded:1_988_000, color: C.terra  },
  { l: 37, name: "Résidence Gastronomique",icon: "✨",   tables: 27, xpNeeded:2_210_000, color: C.terra  },
  { l: 38, name: "Temple Culinaire",       icon: "🗽",   tables: 28, xpNeeded:2_451_000, color: C.amber  },
  { l: 39, name: "Maison de Référence",    icon: "🎯",   tables: 28, xpNeeded:2_712_000, color: C.amber  },
  /* ── Ère 5 : Légende culinaire (40–49) ───────────────── */
  { l: 40, name: "Légende Culinaire",       icon: "🌟",   tables: 29, xpNeeded:2_994_000, color: C.purple },
  { l: 41, name: "Patrimoine Gastro.",      icon: "🏛️",  tables: 29, xpNeeded:3_298_000, color: C.purple },
  { l: 42, name: "Icône Culinaire",         icon: "⚜️",  tables: 30, xpNeeded:3_625_000, color: C.green  },
  { l: 43, name: "Mythe Gastronomique",     icon: "🌌",   tables: 30, xpNeeded:3_976_000, color: C.green  },
  { l: 44, name: "Sanctuaire Culinaire",    icon: "🕌",   tables: 30, xpNeeded:4_352_000, color: C.navy   },
  { l: 45, name: "Haute Gastro. Mondiale",  icon: "🌍",   tables: 30, xpNeeded:4_754_000, color: C.navy   },
  { l: 46, name: "Palais Gastronomique",    icon: "👑",   tables: 30, xpNeeded:5_183_000, color: C.terra  },
  { l: 47, name: "Monument Culinaire",      icon: "🗿",   tables: 30, xpNeeded:5_640_000, color: C.terra  },
  { l: 48, name: "Anthologie Gastro.",      icon: "📜",   tables: 30, xpNeeded:6_126_000, color: C.amber  },
  { l: 49, name: "Olympe",                  icon: "🌠",   tables: 30, xpNeeded:6_642_000, color: C.purple },
];

export const CAP_UPGRADES = [
  { capLv: 0, label: "Agrandir (×2→4)", cost: 800,  newCap: 4 },
  { capLv: 1, label: "Agrandir (×4→6)", cost: 1800, newCap: 6 },
];

export const MOODS = [
  { e: "🤩", l: "Enthousiaste", p: 45, b: 1.5 },
  { e: "😊", l: "Détendu",      p: 35, b: 1.2 },
  { e: "😐", l: "Neutre",       p: 25, b: 1.0 },
  { e: "😑", l: "Pressé",       p: 18, b: 0.8 },
  { e: "😤", l: "Impatient",    p: 11, b: 0.6 },
];

export const NAMES1 = [
  "Gabriel", "Emma", "Kenji", "Fatoumata", "Mateo", "Yuki", "Sofia", "Amine", "Elena", "Sven",
   "Priya", "Liam", "Zaynab", "Diego", "Chloé", "Hiroshi", "Anais", "Raj", "Valentina", "Malik",
   "Ingrid", "Santiago", "Mei", "Omar", "Alessandra", "Kwamé", "Soraya", "Lars", "Théo", "Ji-woo",
   "Luca", "Inès", "Dimitri", "Aïcha", "Pablo", "Sakura", "Matteo", "Fatima", "Nikolai", "Yasmine",
   "Björn", "Isabella", "Ravi", "Clara", "Ahmed", "Freya", "Carlos", "Leila", "Aris", "Noémie", "Keita",
   "Xiuying", "Marco", "Amina", "Finn", "Lucia", "Hassan", "Camille", "Sanjay", "Beatriz", "Khalil",
   "Mathilda", "Kenza", "Alejandro", "Sunita", "Hugo", "Nala", "Stefan", "Maria", "Idriss", "Olga",
   "Javier", "Zahra", "Mikael", "Siobhan", "Ali", "Francesca", "Tenzin", "Manuel", "Inaya", "Soren", "Paolo",
   "Latifa", "Erik", "Luna", "Ismaël", "Brigitte", "Kwesi", "Natasha", "Kim", "Bodhi", "Salma", "Hans", "Aya",
   "Rodrigo", "Malia", "Vlad", "Zara", "Ousmane", "Camille"
];
export const NAMES2 = [
   "Aleksei", "Amani", "Bao", "Callista", "Dante", "Eliana", "Farrah", "Giacomo", "Hana", "Indira", "Jovan",
   "Kanya", "Lior", "Muna", "Nadir", "Odessa", "Pavel", "Qasim", "Rayan", "Saskia", "Tariq", "Ursula", "Vanya",
   "Willem", "Ximena", "Yosef", "Zaina", "Alaric", "Basile", "Cassian", "Dahlia", "Elowen", "Fadi", "Gita", "Hamza",
   "Ione", "Jiro", "Kael", "Lumi", "Miran", "Niamh", "Odin", "Petra", "Quinn", "Rohan", "Selene", "Thalia", "Umar",
   "Veda", "Xavier"
];

export const TABLES0 = [
  _mkT(1,  "Table 1"),   _mkT(2,  "Table 2"),   _mkT(3,  "Table 3"),
  _mkT(4,  "Table 4"),   _mkT(5,  "Table 5"),   _mkT(6,  "Table 6"),
  _mkT(7,  "Table 7"),   _mkT(8,  "Table 8"),   _mkT(9,  "Table 9"),
  _mkT(10, "Table 10"),  _mkT(11, "Table 11"),  _mkT(12, "Table 12"),
  _mkT(13, "Table 13"),  _mkT(14, "Table 14"),  _mkT(15, "Table 15"),
  _mkT(16, "Table 16"),  _mkT(17, "Table 17"),  _mkT(18, "Table 18"),
  _mkT(19, "Table 19"),  _mkT(20, "Table 20"),  _mkT(21, "Table 21"),
  _mkT(22, "Table 22"),  _mkT(23, "Table 23"),  _mkT(24, "Table 24"),
  _mkT(25, "Table 25"),  _mkT(26, "Table 26"),  _mkT(27, "Table 27"),
  _mkT(28, "Table 28"),  _mkT(29, "Table 29"),  _mkT(30, "Table 30"),
];

export const SERVERS0 = [
  { id: 1, name: "Marie Dupont", status: "actif", totalXp: 320, rating: 4.8, salary: 14, moral: 90, specialty: null, shift: null },
];
