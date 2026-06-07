import { C } from './theme.js';

export const SRV_LVL = [
  { name: "Stagiaire", color: C.muted,   icon: "🎓" },
  { name: "Serveur",   color: C.green,   icon: "👔" },
  { name: "Senior",    color: C.navy,    icon: "⭐" },
  { name: "Expert",    color: C.amber,   icon: "🎖" },
  { name: "Maître",    color: C.purple,  icon: "👑" },
];

export const CHEF_LVL = [
  { name: "Apprenti",       color: C.muted,  bg: C.bg,      icon: "👨‍🍳", commis: 1, speed: 1.0 },
  { name: "Cuisinier",      color: C.green,  bg: C.greenP,  icon: "🧑‍🍳", commis: 1, speed: 1.2 },
  { name: "Chef de Partie", color: C.navy,   bg: C.navyP,   icon: "👨‍🍳", commis: 2, speed: 1.5 },
  { name: "Sous-Chef",      color: C.amber,  bg: C.amberP,  icon: "🧑‍🍳", commis: 2, speed: 1.8 },
  { name: "Chef Cuisine",   color: C.terra,  bg: C.terraP,  icon: "👨‍🍳", commis: 3, speed: 2.2 },
  { name: "Chef Étoilé",    color: C.purple, bg: C.purpleP, icon: "⭐",   commis: 3, speed: 3.0 },
];

export const CHEF_XP_CAP = [120, 260, 450, 700, 1050];

export const CHEF_TRAININGS = [
  { id: "tech",    name: "Techniques avancées", icon: "📚", xp: 80, cost: 200, desc: "+80 XP chef" },
  { id: "pastry",  name: "Cours de pâtisserie", icon: "🍰", xp: 20, cost: 280, desc: "Desserts −20 % cuisson", catBonus: { cat: "Desserts", mult: 0.20 } },
  { id: "sauces",  name: "Maîtrise des sauces", icon: "🫕", xp: 20, cost: 280, desc: "Plats −20 % cuisson",    catBonus: { cat: "Plats",    mult: 0.20 } },
  { id: "brigade", name: "Stage brigade",        icon: "👥", xp: 40, cost: 350, desc: "+1 feu (72 h)" },
];

export const COMMIS_LVL = [
  { name: "Débutant", color: C.muted, icon: "🔪" },
  { name: "Confirmé", color: C.green, icon: "🍴" },
  { name: "Expert",   color: C.amber, icon: "⭐" },
];

export const COMMIS_XP_CAP = [80, 200];

export const COMMIS_SPECIALTIES = [
  { id: "patissier",   name: "Pâtissier",    icon: "🍰", cat: "Desserts", bonus: 0.20 },
  { id: "rotisseur",   name: "Rôtisseur",    icon: "🥩", cat: "Plats",    bonus: 0.20 },
  { id: "gardemanger", name: "Garde-Manger", icon: "🥗", cat: "Entrées",  bonus: 0.20 },
  { id: "sommelier",   name: "Sommelier",    icon: "🍷", cat: "Boissons", bonus: 0.20 },
];

export const SERVER_SLOTS_BY_LEVEL = {
   0:  2,  1:  3,  2:  3,  3:  4,  4:  4,  5:  5,  6:  5,  7:  6,  8:  6,  9:  7,
  10:  8, 11:  8, 12:  9, 13:  9, 14: 10, 15: 10, 16: 11, 17: 11, 18: 12, 19: 12,
  20: 13, 21: 13, 22: 14, 23: 14, 24: 15, 25: 15, 26: 16, 27: 16, 28: 17, 29: 17,
  30: 18, 31: 18, 32: 19, 33: 19, 34: 20, 35: 20, 36: 21, 37: 21, 38: 22, 39: 22,
  40: 23, 41: 23, 42: 24, 43: 24, 44: 25, 45: 25, 46: 25, 47: 25, 48: 25, 49: 25,
};

export const STAFF_QUALITY_REQ = [
  { atLv: 10, tier: 1, count: 1, icon: "👔", label: "1 Serveur minimum"  },
  { atLv: 15, tier: 2, count: 1, icon: "⭐", label: "1 Senior minimum"   },
  { atLv: 20, tier: 2, count: 2, icon: "⭐", label: "2 Senior minimum"   },
  { atLv: 25, tier: 3, count: 1, icon: "🎖",  label: "1 Expert minimum"   },
  { atLv: 30, tier: 3, count: 2, icon: "🎖",  label: "2 Expert minimum"   },
  { atLv: 40, tier: 4, count: 1, icon: "👑", label: "1 Maître minimum"   },
];
