export const KITCHEN0 = {
  chef: {
    id: 1, name: "Julien Marchand",
    totalXp: 0, status: "actif",
    specialty: "Cuisine française",
    signature: "Entrecôte maison",
    salary: 28,
    shift: null,
  },
  chefs: [],
  commis: [],
  queue:        [],
  cooking:      [],
  done:         [],
  totalDishes:  0,
  upgrades:     { fourneau: 0, four: 0, stockage: 0, plonge: 0, salamandre: 0, dressage: 0, sousvide: 0, brigade: 0 },
  morale:       100,
  chefTrainings: {},
};

export const KITCHEN_UPGRADES = [
  {
    id: "fourneau", icon: "🔥", name: "Fourneau supplémentaire",
    desc: "Ajoute +1 feu de cuisson simultané.",
    minRestoLevel: 0,
    levels: [
      { l: 1, cost: 600,  bonus: { slots: 1 }, label: "+1 feu (5 total)" },
      { l: 2, cost: 1200, bonus: { slots: 1 }, label: "+1 feu (6 total)" },
      { l: 3, cost: 2200, bonus: { slots: 1 }, label: "+1 feu (7 total)" },
    ],
  },
  {
    id: "four", icon: "🏺", name: "Four professionnel",
    desc: "Réduit le temps de cuisson de tous les plats.",
    minRestoLevel: 0,
    levels: [
      { l: 1, cost: 800,  bonus: { speed: 0.15 }, label: "−15 % temps de cuisson" },
      { l: 2, cost: 1800, bonus: { speed: 0.15 }, label: "−30 % temps de cuisson" },
      { l: 3, cost: 3500, bonus: { speed: 0.20 }, label: "−50 % temps de cuisson" },
    ],
  },
  {
    id: "stockage", icon: "🧊", name: "Chambre froide",
    desc: "Double la capacité de stock et ralentit la dégradation de la fraîcheur des aliments.",
    minRestoLevel: 0,
    levels: [
      { l: 1, cost: 1000, bonus: { storage: 1 }, label: "Capacité ×2 · Fraîcheur −50%" },
      { l: 2, cost: 2500, bonus: { storage: 1 }, label: "Capacité ×3 · Fraîcheur −75%" },
    ],
  },
  {
    id: "plonge", icon: "🚿", name: "Station de plonge",
    desc: "Réduit le temps de nettoyage des tables.",
    minRestoLevel: 0,
    levels: [
      { l: 1, cost: 500,  bonus: { clean: 20 }, label: "Nettoyage −20s (40s)" },
      { l: 2, cost: 1200, bonus: { clean: 20 }, label: "Nettoyage −20s (20s)" },
    ],
  },
  {
    id: "salamandre", icon: "🔆", name: "Salamandre pro",
    desc: "Grill de finition haute performance — accélère la cuisson de tous les plats.",
    minRestoLevel: 10,
    levels: [
      { l: 1, cost: 2000, bonus: { speed: 0.20 }, label: "−17 % temps de cuisson" },
      { l: 2, cost: 4500, bonus: { speed: 0.40 }, label: "−28 % temps de cuisson supplémentaire" },
    ],
  },
  {
    id: "dressage", icon: "🪨", name: "Plan de travail grand chef",
    desc: "Surface de travail en marbre massif — espace supplémentaire pour plus de plats simultanés.",
    minRestoLevel: 20,
    levels: [
      { l: 1, cost: 5000, bonus: { slots: 1 }, label: "+1 plat simultané" },
      { l: 2, cost: 9500, bonus: { slots: 1 }, label: "+1 plat simultané (total +2)" },
    ],
  },
  {
    id: "sousvide", icon: "💧", name: "Cuiseur sous-vide",
    desc: "Cuisson basse température ultra-précise — drastiquement plus rapide pour les plats de prestige.",
    minRestoLevel: 30,
    levels: [
      { l: 1, cost: 8000,  bonus: { speed: 0.30 }, label: "−23 % temps de cuisson" },
      { l: 2, cost: 14000, bonus: { speed: 0.50 }, label: "−33 % temps de cuisson supplémentaire" },
    ],
  },
  {
    id: "brigade", icon: "👨‍🍳", name: "Brigade étoilée",
    desc: "Recrutement d'une brigade complète — débloque 2 feux supplémentaires en permanence.",
    minRestoLevel: 40,
    levels: [
      { l: 1, cost: 20000, bonus: { slots: 2 }, label: "+2 feux de cuisson simultanés" },
    ],
  },
];
