/* ═══════════════════════════════════════════════════════
   src/utils/levelUtils.js
   Logique pure de progression XP / niveaux.
   Aucune dépendance React. Testable unitairement.

   Import dans App.jsx :
     import { srvLv, chefLv, commisLv, restoLv, dishCookTime,
              calcRating, ratingColor, ratingStars } from "./utils/levelUtils";
═══════════════════════════════════════════════════════ */

import {
  SRV_LVL, CHEF_LVL, CHEF_XP_CAP,
  COMMIS_LVL, COMMIS_XP_CAP, RESTO_LVL,
} from "../constants/gameData.js";

/* ─────────────────────────────────────────────────────
   SERVEURS — Niveau à partir de l'XP total
   Retourne : { l, r, n }
     l = index de niveau (0–4)
     r = XP restant dans le niveau courant
     n = XP nécessaire pour passer au suivant (999 si max)
───────────────────────────────────────────────────── */
const SRV_XP_CAP = [80, 160, 280, 440];

/**
 * @param {number} xp - XP total du serveur
 * @returns {{ l: number, r: number, n: number }}
 */
export const srvLv = (xp) => {
  const cap = SRV_XP_CAP;
  let l = 0, r = xp;
  while (l < cap.length && r >= cap[l]) { r -= cap[l]; l++; }
  return { l, r, n: cap[l] ?? 999 };
};

/* ─────────────────────────────────────────────────────
   CHEF — Niveau à partir de l'XP total
   Retourne : { l, r, n }
     l = index de niveau (0–5)
     r = XP restant dans le niveau courant
     n = XP nécessaire pour passer au suivant (999 si max)
───────────────────────────────────────────────────── */

/**
 * @param {number} xp - XP total du chef
 * @returns {{ l: number, r: number, n: number }}
 */
export const chefLv = (xp) => {
  let l = 0, r = xp;
  while (l < CHEF_XP_CAP.length && r >= CHEF_XP_CAP[l]) {
    r -= CHEF_XP_CAP[l]; l++;
  }
  return { l, r, n: CHEF_XP_CAP[l] ?? 999 };
};

/**
 * Données de niveau chef à partir d'un index.
 * Clamp automatique pour éviter les out-of-bounds.
 * @param {number} l - index de niveau
 * @returns {typeof CHEF_LVL[0]}
 */
export const chefLvData = (l) => CHEF_LVL[Math.min(l, CHEF_LVL.length - 1)];

/* ─────────────────────────────────────────────────────
   COMMIS — Niveau à partir de l'XP total
   Retourne : { l, r, n }
     l = index de niveau (0–2)
     r = XP restant dans le niveau courant
     n = XP nécessaire pour passer au suivant (999 si max)
───────────────────────────────────────────────────── */

/**
 * @param {number} xp - XP total du commis
 * @returns {{ l: number, r: number, n: number }}
 */
export const commisLv = (xp) => {
  let l = 0, r = xp;
  while (l < COMMIS_XP_CAP.length && r >= COMMIS_XP_CAP[l]) {
    r -= COMMIS_XP_CAP[l]; l++;
  }
  return { l, r, n: COMMIS_XP_CAP[l] ?? 999 };
};

/**
 * Données de niveau commis à partir d'un index.
 * @param {number} l - index de niveau
 * @returns {typeof COMMIS_LVL[0]}
 */
export const commisLvData = (l) => COMMIS_LVL[Math.min(l, COMMIS_LVL.length - 1)];

/* ─────────────────────────────────────────────────────
   RESTAURANT — Niveau à partir de l'XP total
   Retourne : { l, d, next, pct }
     l    = index de niveau (0–5)
     d    = objet RESTO_LVL courant
     next = objet RESTO_LVL suivant (ou dernier si max)
     pct  = % de progression vers le prochain niveau (0–100)
───────────────────────────────────────────────────── */

/**
 * @param {number} xp - XP total du restaurant
 * @returns {{ l: number, d: object, next: object, pct: number }}
 */
export const restoLv = (xp) => {
  let lv = 0;
  for (let i = RESTO_LVL.length - 1; i >= 0; i--) {
    if (xp >= RESTO_LVL[i].xpNeeded) { lv = i; break; }
  }
  const cur  = RESTO_LVL[lv];
  const next = RESTO_LVL[Math.min(lv + 1, RESTO_LVL.length - 1)];
  const needed = next.xpNeeded - cur.xpNeeded;
  const rem    = xp - cur.xpNeeded;
  const pct = lv >= RESTO_LVL.length - 1
    ? 100
    : Math.min(100, Math.round((rem / needed) * 100));
  return { l: lv, d: cur, next, pct };
};

/* ─────────────────────────────────────────────────────
   CUISINE — Temps de cuisson effectif
   Formule : max(5s, round(prepTime / (chefSpeed × (1 + commisCount × 0.15))))
   + bonus four si appliqué via upgDishCookTime (voir KitchenView)
───────────────────────────────────────────────────── */

/**
 * Temps de cuisson de base (sans bonus four).
 * @param {number} prepTime     - temps de préparation de base (secondes)
 * @param {number} chefSpeed    - multiplicateur de vitesse du chef (ex: 1.5)
 * @param {number} commisCount  - nombre de commis actifs (0–3)
 * @returns {number} secondes
 */
export const dishCookTime = (prepTime, chefSpeed, commisCount) =>
  Math.max(5, Math.round(prepTime / (chefSpeed * (1 + commisCount * 0.15))));

/**
 * Temps de cuisson avec bonus four (speedBonus = somme des bonus four débloqués).
 * Utilisé dans KitchenView.
 * @param {number} prepTime
 * @param {number} chefSpeed
 * @param {number} commisCount
 * @param {number} speedBonus  - bonus de vitesse cumulé du four (ex: 0.15, 0.30…)
 * @returns {number} secondes
 */
export const dishCookTimeWithUpgrades = (prepTime, chefSpeed, commisCount, speedBonus = 0) =>
  Math.max(5, Math.round(prepTime / ((chefSpeed + speedBonus) * (1 + commisCount * 0.15))));

/* ─────────────────────────────────────────────────────
   NOTATION — Calcul de la note client (1–5 étoiles)
───────────────────────────────────────────────────── */

/**
 * Calcule la note finale d'un service.
 * @param {number} patienceLeftRatio
 *   1.0 = placé immédiatement · 0.0 = placé à la dernière seconde
 * @param {number} moodB
 *   Multiplicateur d'humeur du client (0.6 pour impatient, 1.5 pour enthousiaste)
 * @returns {number} note entre 1 et 5
 */
export const calcRating = (patienceLeftRatio, moodB) => {
  let base =
    patienceLeftRatio > 0.70 ? 5 :
    patienceLeftRatio > 0.45 ? 4 :
    patienceLeftRatio > 0.20 ? 3 : 2;

  if (moodB >= 1.5) base = Math.min(5, base + 1);
  else if (moodB < 0.8) base = Math.max(1, base - 1);

  return Math.max(1, Math.min(5, base));
};

/**
 * Couleur correspondant à une note.
 * @param {number} r - note (1–5)
 * @returns {string} code couleur hex
 */
export const ratingColor = (r) =>
  r >= 4 ? "#b87d10" :
  r >= 3 ? "#2a5c3f" :
  r >= 2 ? "#c4622d" : "#c0392b";

/**
 * Représentation textuelle d'une note en étoiles.
 * @param {number} r - note (1–5)
 * @returns {string} ex: "★★★★☆"
 */
export const ratingStars = (r) => "★".repeat(r) + "☆".repeat(5 - r);

/* ─────────────────────────────────────────────────────
   HELPERS XP — Calculs dérivés (pourboires, XP service)
───────────────────────────────────────────────────── */

/**
 * Calcule le pourboire en fonction de l'addition et de la note.
 * @param {number} bill   - montant de l'addition (€)
 * @param {number} rating - note du service (1–5)
 * @returns {number} pourboire en €
 */
export const calcTip = (bill, rating) =>
  +(bill * (rating - 1) * 0.04).toFixed(2);

/**
 * XP gagnée par un serveur lors d'un encaissement.
 * @param {number} rating - note du service (1–5)
 * @returns {number} XP
 */
export const srvXpFromCheckout = (rating) => 15 + rating * 5;

/**
 * XP restaurant gagnée lors d'un encaissement.
 * @param {number} groupSize - taille du groupe
 * @param {number} moodB     - multiplicateur d'humeur
 * @param {boolean} isVIP    - client VIP (×3)
 * @returns {number} XP
 */
export const restoXpFromCheckout = (groupSize, moodB, isVIP = false) =>
  Math.round((20 + groupSize * 8) * moodB * (isVIP ? 3 : 1));

/* ─────────────────────────────────────────────────────
   TESTS UNITAIRES (optionnel — à lancer avec Vitest)
   npx vitest run src/utils/levelUtils.test.js
───────────────────────────────────────────────────── */
/*
import { describe, it, expect } from "vitest";

describe("srvLv", () => {
  it("niveau 0 à 0 XP",       () => expect(srvLv(0).l).toBe(0));
  it("niveau 1 à 80 XP",      () => expect(srvLv(80).l).toBe(1));
  it("niveau max à 1000 XP",  () => expect(srvLv(1000).l).toBe(4));
  it("XP restant correct",    () => expect(srvLv(100).r).toBe(20));
});

describe("chefLv", () => {
  it("niveau 0 à 0 XP",       () => expect(chefLv(0).l).toBe(0));
  it("niveau 1 à 120 XP",     () => expect(chefLv(120).l).toBe(1));
  it("niveau max à 9999 XP",  () => expect(chefLv(9999).l).toBe(5));
});

describe("restoLv", () => {
  it("niveau 0 à 0 XP",       () => expect(restoLv(0).l).toBe(0));
  it("niveau 1 à 300 XP",     () => expect(restoLv(300).l).toBe(1));
  it("Palace à 6000 XP",      () => expect(restoLv(6000).l).toBe(5));
  it("pct 100% au max",       () => expect(restoLv(9999).pct).toBe(100));
});

describe("dishCookTime", () => {
  it("minimum 5s",              () => expect(dishCookTime(1, 3.0, 3)).toBeGreaterThanOrEqual(5));
  it("chef rapide = temps < base", () => expect(dishCookTime(120, 2.0, 0)).toBeLessThan(120));
  it("commis réduisent le temps",  () => {
    expect(dishCookTime(120, 1.0, 2)).toBeLessThan(dishCookTime(120, 1.0, 0));
  });
});

describe("calcRating", () => {
  it("5 étoiles si patience > 0.7 et humeur 1.5", () => expect(calcRating(0.9, 1.5)).toBe(5));
  it("minimum 1 étoile",                            () => expect(calcRating(0.0, 0.6)).toBe(1));
  it("maximum 5 étoiles",                           () => expect(calcRating(1.0, 1.5)).toBe(5));
});

describe("calcTip", () => {
  it("pas de pourboire à 1 étoile", () => expect(calcTip(100, 1)).toBe(0));
  it("pourboire positif à 5 étoiles", () => expect(calcTip(100, 5)).toBeGreaterThan(0));
});
*/
