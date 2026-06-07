export const FRESHNESS_DECAY = {
  Poissons: 0.417,
  Viandes:  0.250,
  Laitiers: 0.167,
  Légumes:  0.133,
  Herbes:   0.133,
  Fins:     0.033,
  Épicerie: 0.033,
  Boissons: 0.033,
};

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
  // Petit déjeuner
  { id: 27, name: "Café",          qty: 5,   unit: "kg",     alert: 1,    cat: "Épicerie", price: 18   },
  { id: 28, name: "Lait",          qty: 10,  unit: "L",      alert: 2,    cat: "Laitiers", price: 1.2  },
  { id: 29, name: "Jus d'orange",  qty: 12,  unit: "L",      alert: 2,    cat: "Boissons", price: 3    },
  { id: 30, name: "Confiture",     qty: 4,   unit: "kg",     alert: 0.5,  cat: "Épicerie", price: 5    },
].map(item => ({ ...item, freshness: 100, lots: [{ qty: item.qty, freshness: 100, boughtAt: 0 }] }));

export const PREMIUM_STOCK = [
  { id: 23, name: "Truffe noire",    qty: 50,  unit: "g",      alert: 10,   cat: "Fins",     price: 2.8  },
  { id: 24, name: "Homard vivant",   qty: 4,   unit: "pcs",    alert: 1,    cat: "Poissons", price: 45   },
  { id: 25, name: "Pigeonneau",      qty: 6,   unit: "pcs",    alert: 1,    cat: "Viandes",  price: 22   },
  { id: 26, name: "Champagne",       qty: 12,  unit: "btl",    alert: 3,    cat: "Boissons", price: 28   },
].map(item => ({ ...item, freshness: 100, lots: [{ qty: item.qty, freshness: 100, boughtAt: 0 }] }));

export const SUPPLIERS = {
  rapide: {
    id: "rapide", name: "Rapide", icon: "⚡",
    desc: "Livraison en 1h de jeu (1 min réelle) · +30 % sur les prix.",
    discount: -0.30, delay: 60,
  },
  normal: {
    id: "normal", name: "Normal", icon: "🚚",
    desc: "Livraison en 24h de jeu (24 min réelles) · prix de base.",
    discount: 0, delay: 1440,
  },
  lowcost: {
    id: "lowcost", name: "Low Cost", icon: "💰",
    desc: "Livraison en 48h de jeu (48 min réelles) · −20 % sur les prix.",
    discount: 0.20, delay: 2880,
  },
};
