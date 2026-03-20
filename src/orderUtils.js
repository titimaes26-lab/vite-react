/* ═══════════════════════════════════════════════════════
   src/utils/orderUtils.js
   Logique de commandes, tickets cuisine, consommation stock.
   Aucune dépendance React.
═══════════════════════════════════════════════════════ */

/* ─── Consommation des ingrédients ──────────────────── */

/**
 * Déduit les ingrédients utilisés par une liste de plats du stock courant.
 * Retourne le nouveau stock, le coût total et les éventuels manques.
 *
 * @param {Array<{ingredients?: Array<{stockId, qty}>}>} dishes - plats à cuire
 * @param {typeof import("../constants/gameData").STOCK0} prevStock
 * @returns {{ newStock: typeof prevStock, cost: number, missing: Array<{dish, ing, need, have}> }}
 */
export const consumeStock = (dishes, prevStock) => {
  let s = [...prevStock];
  let cost = 0;
  const missing = [];

  dishes.forEach((d) =>
    (d.ingredients ?? []).forEach((ing) => {
      const item = s.find((x) => x.id === ing.stockId);
      if (item) {
        if (item.qty < ing.qty)
          missing.push({ dish: d.name, ing: item.name, need: ing.qty, have: item.qty });
        cost += +(ing.qty * (item.price ?? 0)).toFixed(4);
        s = s.map((x) =>
          x.id === ing.stockId
            ? { ...x, qty: Math.max(0, +(x.qty - ing.qty).toFixed(3)) }
            : x
        );
      }
    })
  );

  return { newStock: s, cost: +cost.toFixed(2), missing };
};

/* ─── Construction des tickets cuisine ──────────────── */

/**
 * Convertit des lignes de commande en tickets cuisine individuels.
 * Un ticket = 1 portion d'un plat pour une table.
 *
 * @param {Array<{oid, menuId, item, cat, ingredients, prepTime, qty}>} orderLines
 * @param {{ id: number, name: string }} table
 * @returns {Array<{id, name, cat, ingredients, prepTime, tableId, tableName, oid, addedAt}>}
 */
export const buildKitchenTickets = (orderLines, table) =>
  orderLines.flatMap((o, li) =>
    Array.from({ length: o.qty }, (_, i) => ({
      id: Date.now() + li * 100 + i + Math.random(),
      name: o.item,
      cat: o.cat,
      ingredients: o.ingredients,
      prepTime: o.prepTime ?? 60,
      tableId: table.id,
      tableName: table.name,
      oid: o.oid,
      addedAt: Date.now(),
    }))
  );

/* ─── Durée de service (prise de commande) ───────────── */

/**
 * Durée en ms que le serveur passe à prendre la commande.
 * Dépend de la taille du groupe.
 *
 * @param {number} groupSize
 * @returns {{ ms: number, label: string }}
 */
export const svcDuration = (groupSize) => {
  if (groupSize <= 2) return { ms: 30_000, label: "30s" };
  if (groupSize <= 4) return { ms: 60_000, label: "1 min" };
  return { ms: 90_000, label: "1m30" };
};

/* ─── Durée de repas (manger) ────────────────────────── */

/**
 * Durée en secondes d'un repas (= ⅔ du temps du plat le plus long).
 *
 * @param {Array<{prepTime?: number}>} dishes
 * @returns {number} secondes
 */
export const eatDuration = (dishes) => {
  const maxPrep = Math.max(...dishes.map((d) => d.prepTime ?? 60), 60);
  return Math.round(maxPrep * (2 / 3));
};

/* ─── Montants de l'addition ─────────────────────────── */

/**
 * Calcule le total d'une addition.
 * @param {Array<{price: number, qty: number}>} orderLines
 * @returns {number}
 */
export const calcBill = (orderLines) =>
  orderLines.reduce((s, o) => s + o.price * o.qty, 0);

/* ─── Presets de quantité pour l'UI stock ────────────── */

/**
 * Retourne les boutons de réapprovisionnement rapide selon l'unité.
 * @param {string} unit
 * @returns {number[]}
 */
export const quickAmounts = (unit) => {
  if (["kg", "L"].includes(unit))                   return [0.5, 1, 5];
  if (["btl", "pcs", "bottes"].includes(unit))      return [1, 6, 12];
  if (unit === "u")                                  return [6, 12, 24];
  return [1, 5, 10];
};
