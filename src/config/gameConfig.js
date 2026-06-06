/* ═══════════════════════════════════════════════════════
   src/config/gameConfig.js
   Source unique de vérité pour toutes les formules et
   constantes d'équilibrage du jeu.

   Règle : toute valeur numérique qui influence la
   progression, la difficulté ou l'économie du jeu doit
   être définie ici — jamais en dur dans un composant.
═══════════════════════════════════════════════════════ */

/* ─── Formule de coût d'amélioration (géométrique) ── */
/**
 * Coût = base × facteur ^ niveau
 * @param {number} base   - coût du premier niveau
 * @param {number} factor - multiplicateur entre chaque niveau (ex: 1.8)
 * @param {number} level  - numéro du niveau (1-indexed)
 * @returns {number} coût arrondi à l'entier
 */
export const upgradeCost = (base, factor, level) =>
  Math.round(base * factor ** level);

/* ─── Équilibrage des améliorations de tables ──────── */
export const TABLE_UPGRADE = {
  capBase:   500,   // coût niveau 1
  capFactor: 2.0,   // ×2 par palier → 500, 1 000, 2 000 …
};

/* ─── Équilibrage cuisine ───────────────────────────── */
export const KITCHEN_UPGRADE = {
  burnersBase:   500,   factor: 1.9,   // feux : 500, 950, 1 805 …
  speedBase:     700,   speedFactor: 2.1,
  storageBase:   900,   storageFactor: 2.5,
  cleanBase:     450,   cleanFactor: 2.2,
};

/* ─── Spawner client ────────────────────────────────── */
export const SPAWNER = {
  maxQueue      : 4,          // file d'attente max
  baseInterval  : 35_000,     // intervalle entre clients niveau 0 (ms)
  minInterval   :  7_000,     // intervalle minimum niveau max (ms)
  maxLevel      : 49,
  waveChance    : 0.05,       // probabilité de vague (2-3 groupes d'un coup)
  idleForceMs   : 60_000,     // délai avant spawn forcé si salle vide (ms)
};

/**
 * Intervalle de spawn selon le niveau (courbe √).
 * Lv 0 → 35 s   Lv 10 → ~22 s   Lv 25 → ~15 s   Lv 49 → 7 s
 */
export const spawnInterval = (lvl) => {
  const { baseInterval, minInterval, maxLevel } = SPAWNER;
  const curve = Math.sqrt(Math.min(lvl, maxLevel) / maxLevel);
  return Math.round(baseInterval - curve * (baseInterval - minInterval));
};

/* ─── Moral des serveurs ────────────────────────────── */
export const MORALE = {
  drainInterval : 300_000,  // 1 tick de drain = 5 min réelles
  drainAmount   : 1,        // points perdus par tick en service
  pauseGain     : 3,        // points récupérés par tick en pause
};
