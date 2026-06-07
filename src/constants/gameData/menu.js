export const MENU0 = [
  // ── Entrées ──────────────────────────────────────────
  {
    id: 1, name: "Salade César", cat: "Entrées", price: 14, prepTime: 45, unlockLevel: 0,
    ingredients: [
      { stockId: 5,  qty: 1    },
      { stockId: 14, qty: 0.06 },
      { stockId: 13, qty: 1    },
      { stockId: 19, qty: 0.04 },
    ],
  },
  {
    id: 2, name: "Soupe à l'oignon", cat: "Entrées", price: 11, prepTime: 90, unlockLevel: 0,
    ingredients: [
      { stockId: 6,  qty: 0.35 },
      { stockId: 11, qty: 0.05 },
      { stockId: 16, qty: 0.02 },
      { stockId: 15, qty: 0.07 },
    ],
  },
  {
    id: 3, name: "Foie gras maison", cat: "Entrées", price: 22, prepTime: 60, unlockLevel: 7,
    ingredients: [
      { stockId: 4,  qty: 0.12 },
      { stockId: 11, qty: 0.02 },
      { stockId: 17, qty: 0.01 },
    ],
  },
  {
    id: 12, name: "Tartare de bœuf", cat: "Entrées", price: 18, prepTime: 50, unlockLevel: 10,
    ingredients: [
      { stockId: 1,  qty: 0.18 },
      { stockId: 6,  qty: 0.03 },
      { stockId: 19, qty: 0.02 },
      { stockId: 13, qty: 1    },
    ],
  },
  {
    id: 13, name: "Velouté de truffe", cat: "Entrées", price: 38, prepTime: 80, unlockLevel: 20,
    ingredients: [
      { stockId: 23, qty: 8    },
      { stockId: 12, qty: 0.15 },
      { stockId: 11, qty: 0.03 },
    ],
  },
  // ── Plats ────────────────────────────────────────────
  {
    id: 4, name: "Entrecôte 300g", cat: "Plats", price: 28, prepTime: 75, unlockLevel: 0,
    ingredients: [
      { stockId: 1,  qty: 0.35 },
      { stockId: 11, qty: 0.06 },
      { stockId: 8,  qty: 0.02 },
      { stockId: 10, qty: 1    },
    ],
  },
  {
    id: 5, name: "Saumon grillé", cat: "Plats", price: 24, prepTime: 120, unlockLevel: 3,
    ingredients: [
      { stockId: 2,  qty: 0.25 },
      { stockId: 11, qty: 0.04 },
      { stockId: 19, qty: 0.02 },
      { stockId: 8,  qty: 0.01 },
    ],
  },
  {
    id: 6, name: "Poulet rôti", cat: "Plats", price: 19, prepTime: 105, unlockLevel: 0,
    ingredients: [
      { stockId: 3,  qty: 1    },
      { stockId: 11, qty: 0.07 },
      { stockId: 8,  qty: 0.03 },
      { stockId: 10, qty: 2    },
    ],
  },
  {
    id: 7, name: "Risotto champignons", cat: "Plats", price: 18, prepTime: 180, unlockLevel: 5,
    ingredients: [
      { stockId: 18, qty: 0.15 },
      { stockId: 7,  qty: 0.2  },
      { stockId: 6,  qty: 0.08 },
      { stockId: 14, qty: 0.05 },
      { stockId: 11, qty: 0.04 },
      { stockId: 20, qty: 0.15 },
    ],
  },
  {
    id: 14, name: "Homard rôti", cat: "Plats", price: 55, prepTime: 150, unlockLevel: 15,
    ingredients: [
      { stockId: 24, qty: 1    },
      { stockId: 11, qty: 0.08 },
      { stockId: 8,  qty: 0.02 },
      { stockId: 10, qty: 1    },
    ],
  },
  {
    id: 15, name: "Filet de bœuf Wellington", cat: "Plats", price: 72, prepTime: 210, unlockLevel: 25,
    ingredients: [
      { stockId: 1,  qty: 0.30 },
      { stockId: 7,  qty: 0.15 },
      { stockId: 16, qty: 0.12 },
      { stockId: 11, qty: 0.05 },
    ],
  },
  {
    id: 16, name: "Pigeonneau en croûte", cat: "Plats", price: 90, prepTime: 240, unlockLevel: 35,
    ingredients: [
      { stockId: 25, qty: 1    },
      { stockId: 7,  qty: 0.12 },
      { stockId: 16, qty: 0.10 },
      { stockId: 11, qty: 0.06 },
    ],
  },
  // ── Desserts ─────────────────────────────────────────
  {
    id: 8, name: "Crème brûlée", cat: "Desserts", price: 9, prepTime: 75, unlockLevel: 0,
    ingredients: [
      { stockId: 12, qty: 0.2  },
      { stockId: 13, qty: 3    },
      { stockId: 17, qty: 0.05 },
    ],
  },
  {
    id: 9, name: "Tarte Tatin", cat: "Desserts", price: 10, prepTime: 105, unlockLevel: 3,
    ingredients: [
      { stockId: 9,  qty: 0.35 },
      { stockId: 11, qty: 0.08 },
      { stockId: 17, qty: 0.07 },
      { stockId: 16, qty: 0.1  },
    ],
  },
  {
    id: 17, name: "Soufflé au Grand Marnier", cat: "Desserts", price: 14, prepTime: 120, unlockLevel: 12,
    ingredients: [
      { stockId: 13, qty: 4    },
      { stockId: 12, qty: 0.1  },
      { stockId: 17, qty: 0.08 },
    ],
  },
  {
    id: 18, name: "Mille-feuille Passion", cat: "Desserts", price: 16, prepTime: 130, unlockLevel: 22,
    ingredients: [
      { stockId: 16, qty: 0.15 },
      { stockId: 11, qty: 0.07 },
      { stockId: 12, qty: 0.12 },
      { stockId: 17, qty: 0.06 },
    ],
  },
  // ── Petit Déjeuner ───────────────────────────────────
  {
    id: 21, name: "Croissant beurre", cat: "Petit Déjeuner", price: 4, prepTime: 10, unlockLevel: 0,
    ingredients: [
      { stockId: 16, qty: 0.05 },
      { stockId: 11, qty: 0.03 },
    ],
  },
  {
    id: 22, name: "Pain au chocolat", cat: "Petit Déjeuner", price: 4.5, prepTime: 12, unlockLevel: 0,
    ingredients: [
      { stockId: 16, qty: 0.05 },
      { stockId: 11, qty: 0.03 },
      { stockId: 17, qty: 0.02 },
    ],
  },
  {
    id: 23, name: "Omelette nature", cat: "Petit Déjeuner", price: 8, prepTime: 20, unlockLevel: 0,
    ingredients: [
      { stockId: 13, qty: 3    },
      { stockId: 11, qty: 0.02 },
      { stockId: 28, qty: 0.05 },
    ],
  },
  {
    id: 24, name: "Pancakes sirop d'érable", cat: "Petit Déjeuner", price: 11, prepTime: 30, unlockLevel: 4,
    ingredients: [
      { stockId: 16, qty: 0.10 },
      { stockId: 13, qty: 2    },
      { stockId: 28, qty: 0.15 },
      { stockId: 11, qty: 0.02 },
      { stockId: 17, qty: 0.03 },
    ],
  },
  {
    id: 25, name: "Tartines confiture", cat: "Petit Déjeuner", price: 5, prepTime: 8, unlockLevel: 0,
    ingredients: [
      { stockId: 16, qty: 0.08 },
      { stockId: 11, qty: 0.02 },
      { stockId: 30, qty: 0.04 },
    ],
  },
  {
    id: 26, name: "Œufs Bénédicte", cat: "Petit Déjeuner", price: 14, prepTime: 45, unlockLevel: 8,
    ingredients: [
      { stockId: 13, qty: 3    },
      { stockId: 11, qty: 0.06 },
      { stockId: 12, qty: 0.05 },
      { stockId: 16, qty: 0.06 },
    ],
  },
  // ── Boissons ─────────────────────────────────────────
  {
    id: 27, name: "Café crème", cat: "Boissons", price: 4, prepTime: 5, unlockLevel: 0,
    ingredients: [
      { stockId: 27, qty: 0.01 },
      { stockId: 28, qty: 0.05 },
    ],
  },
  {
    id: 28, name: "Jus d'orange pressé", cat: "Boissons", price: 6, prepTime: 6, unlockLevel: 0,
    ingredients: [{ stockId: 29, qty: 0.25 }],
  },
  {
    id: 10, name: "Bordeaux 75cl", cat: "Boissons", price: 32, prepTime: 8, unlockLevel: 0,
    ingredients: [{ stockId: 21, qty: 1 }],
  },
  {
    id: 11, name: "Eau minérale 1L", cat: "Boissons", price: 5, prepTime: 5, unlockLevel: 0,
    ingredients: [{ stockId: 22, qty: 1 }],
  },
  {
    id: 19, name: "Vin blanc AOC", cat: "Boissons", price: 18, prepTime: 6, unlockLevel: 5,
    ingredients: [{ stockId: 20, qty: 1 }],
  },
  {
    id: 20, name: "Champagne Millésimé", cat: "Boissons", price: 75, prepTime: 10, unlockLevel: 10,
    ingredients: [{ stockId: 26, qty: 1 }],
  },
];
