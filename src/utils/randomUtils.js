/* ═══════════════════════════════════════════════════════
   src/utils/randomUtils.js
   Générateurs aléatoires purs — aucune dépendance React.
   Toutes les fonctions sont déterministes avec un seed.
═══════════════════════════════════════════════════════ */

import { NAMES1, NAMES2, MOODS } from "../constants/gameData.js";

/* ─── Sélecteur aléatoire générique ─────────────────── */

/**
 * Sélectionne un élément au hasard dans un tableau.
 * @template T
 * @param {T[]} arr
 * @returns {T}
 */
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

/* ─── Génération de clients ──────────────────────────── */

/**
 * Génère un nom aléatoire (prénom + nom de famille).
 * @returns {string}
 */
export const rName = () => `${pick(NAMES1)} ${pick(NAMES2)}`;

/**
 * Génère une humeur aléatoire pour un client.
 * @returns {typeof MOODS[0]}
 */
export const rMood = () => pick(MOODS);

/**
 * Génère une taille de groupe aléatoire (1–6 personnes).
 * Distribution pondérée : les groupes de 2–4 sont les plus fréquents.
 * @returns {number}
 */
export const rSize = () => pick([1, 2, 2, 2, 3, 3, 4, 4, 6]);

/* ─── Sélecteur avec seed (défis quotidiens) ─────────── */

/**
 * Sélecteur pseudo-aléatoire basé sur un seed numérique.
 * Utilisé pour les défis quotidiens — reproductible à date égale.
 * @param {number} seed - valeur initiale (modifiée en place via objet)
 * @returns {number} valeur entre 0 et 1
 */
export const seededRng = (seedObj) => {
  seedObj.v = (seedObj.v * 9301 + 49297) % 233280;
  return seedObj.v / 233280;
};

/**
 * Sélectionne N éléments aléatoires depuis un pool, sans remise.
 * Reproductible si la chaîne dateStr est identique.
 * @param {any[]} pool      - tableau source
 * @param {number} count    - nombre d'éléments à sélectionner
 * @param {string} dateStr  - chaîne de seed (ex: "20/03/2026")
 * @returns {any[]}
 */
export const pickSeeded = (pool, count, dateStr) => {
  const seedObj = { v: dateStr.split("").reduce((a, c) => a + c.charCodeAt(0), 0) };
  const src = [...pool];
  const result = [];
  while (result.length < count && src.length) {
    const i = Math.floor(seededRng(seedObj) * src.length);
    result.push(src.splice(i, 1)[0]);
  }
  return result;
};

/* ─── Génération de commandes ────────────────────────── */

/**
 * Génère une commande aléatoire pour un groupe.
 * Règles : 1 plat/personne, ~60% entrées, ~40% desserts, 1 boisson/personne.
 * Seuls les plats activés ET dont unlockLevel <= restoLevel sont proposés.
 * @param {{ size: number }} group
 * @param {typeof import("../constants/gameData").MENU0} menu
 * @param {number} [restoLevel=0] - niveau actuel du restaurant
 * @returns {Array<{oid, menuId, item, cat, price, qty, prepTime, ingredients}>}
 */
export const generateOrder = (group, menu, restoLevel = 0) => {
  const available = menu.filter(
    (m) => m.enabled !== false && (m.unlockLevel ?? 0) <= restoLevel
  );
  const by = (cat) => available.filter((m) => m.cat === cat);
  const items = [];

  // 1 plat par personne
  for (let i = 0; i < group.size; i++)
    if (by("Plats").length) items.push(pick(by("Plats")));

  // ~60% de chance d'entrée pour la table
  const nS = Math.round(group.size * 0.5) * (Math.random() > 0.4 ? 1 : 0);
  for (let i = 0; i < nS; i++)
    if (by("Entrées").length) items.push(pick(by("Entrées")));

  // ~40% de chance de dessert
  if (Math.random() > 0.6 && by("Desserts").length)
    for (let i = 0; i < Math.ceil(group.size * 0.5); i++)
      items.push(pick(by("Desserts")));

  // 1 boisson par personne
  for (let i = 0; i < group.size; i++)
    if (by("Boissons").length) items.push(pick(by("Boissons")));

  // Grouper en lignes (1 ligne par plat distinct)
  const map = {};
  items.forEach((m, idx) => {
    if (!map[m.id])
      map[m.id] = {
        oid: Date.now() + idx + Math.random(),
        menuId: m.id,
        item: m.name,
        cat: m.cat,
        price: m.price,
        qty: 0,
        prepTime: m.prepTime ?? 60,
        ingredients: m.ingredients ?? [],
      };
    map[m.id].qty++;
  });

  return Object.values(map);
};

/**
 * Comme generateOrder() mais applique les prix des plats du jour (isSpecial).
 * @param {{ size: number }} group
 * @param {typeof import("../constants/gameData").MENU0} menu
 * @param {number} [restoLevel=0]
 * @returns {ReturnType<typeof generateOrder>}
 */
export const generateOrderWithSpecials = (group, menu, restoLevel = 0) => {
  const orders = generateOrder(group, menu, restoLevel);
  return orders.map((o) => {
    const dish = menu.find((m) => m.id === o.menuId);
    if (dish?.isSpecial) return { ...o, price: dish.price, isSpecial: true };
    return o;
  });
};

/**
 * Comme generateOrderWithSpecials() mais prend en compte les formules actives.
 * Si une formule est active, le groupe a 35% de chance de la commander.
 * @param {{ size: number }} group
 * @param {typeof import("../constants/gameData").MENU0} menu
 * @param {Array} formulas - formules configurées et actives
 * @param {number} [restoLevel=0]
 * @returns {ReturnType<typeof generateOrder>}
 */
export const generateOrderWithFormulas = (group, menu, formulas = [], restoLevel = 0) => {
  const activeFormulas = (formulas || []).filter(f => f.active && (f.items || []).length > 0);

  if (activeFormulas.length > 0 && Math.random() < 0.35) {
    const formula = pick(activeFormulas);
    const lines = [];

    for (const item of formula.items) {
      const dish = menu.find(m => m.id === parseInt(item.menuId) && m.enabled !== false);
      if (!dish) continue;
      lines.push({
        oid: Date.now() + Math.random(),
        menuId: dish.id,
        item: dish.name,
        cat: dish.cat,
        price: +(dish.price * (1 - (formula.discount || 0))).toFixed(2),
        qty: group.size,
        prepTime: dish.prepTime ?? 60,
        ingredients: dish.ingredients ?? [],
        isFormula: true,
        formulaName: formula.name,
      });
    }

    // Si tous les plats de la formule sont valides, l'utiliser
    if (lines.length === formula.items.length) return lines;
  }

  // Sinon commande individuelle avec plats du jour
  return generateOrderWithSpecials(group, menu, restoLevel);
};
