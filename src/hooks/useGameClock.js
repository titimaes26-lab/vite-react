/* ═══════════════════════════════════════════════════════
   src/hooks/useGameClock.js
   Moteur de temps accéléré — 1 seconde réelle = 1 minute de jeu.

   Journée simulée : 08:00 → 03:00 (19 h de jeu = 1140 s réelles = 19 min réelles)

   Exports :
     PHASES            — tableau des 5 phases de service
     REAL_DAY_MS       — durée réelle d'une journée en ms (1 140 000)
     realMsToGameTime  — convertit elapsed réel → { h, m, absMin, str }
     getPhase          — retourne la phase active pour un absMin donné
     useGameClock      — hook principal ; retourne gameTime.str à jour
═══════════════════════════════════════════════════════ */

import { useState, useEffect, useCallback } from "react";

/* ─── Échelle & bornes ───────────────────────────────── */

const DAY_START_ABS = 8 * 60;   // 08:00 = 480 min depuis minuit
const DAY_END_ABS   = 27 * 60;  // 03:00 (lendemain) = 1620 min

// 1140 min de jeu × 1 000 ms/min = 1 140 000 ms réelles (19 minutes réelles)
export const REAL_DAY_MS = (DAY_END_ABS - DAY_START_ABS) * 1_000;

/* ─── Phases de service ──────────────────────────────── */
/**
 * Chaque phase définit :
 *   startAbs / endAbs     — bornes en minutes absolues depuis minuit
 *   spawnRate             — multiplicateur d'intervalle de spawn (0 = aucun client)
 *   patienceMultiplier    — facteur appliqué à la patience des clients
 *   prepBonus             — bonus de vitesse de cuisson (0.20 = +20 %)
 *   cleanBonus            — bonus de vitesse de nettoyage (0.50 = +50 %)
 *   priceMultiplier       — facteur sur le prix des plats (1.10 = +10 %)
 */
export const PHASES = [
  {
    id: "mise_en_place",
    label: "Mise en place",
    icon: "🧹",
    color: "#6b7280",
    startAbs: 480,   // 08:00
    endAbs:   690,   // 11:30
    spawnRate: 0,
    prepBonus: 0.20,
    patienceMultiplier: 1.0,
    cleanBonus: 0,
    priceMultiplier: 1.0,
    desc: "Pas de clients · +20 % vitesse cuisson",
  },
  {
    id: "rush_midi",
    label: "Rush Midi",
    icon: "🌞",
    color: "#f97316",
    startAbs: 690,   // 11:30
    endAbs:   870,   // 14:30
    spawnRate: 2.0,
    prepBonus: 0,
    patienceMultiplier: 0.7,
    cleanBonus: 0,
    priceMultiplier: 1.0,
    desc: "Affluence max · −30 % patience",
  },
  {
    id: "creux",
    label: "Creux",
    icon: "😴",
    color: "#3b82f6",
    startAbs: 870,   // 14:30
    endAbs:   1080,  // 18:00
    spawnRate: 0.3,
    prepBonus: 0,
    patienceMultiplier: 1.2,
    cleanBonus: 0.5,
    priceMultiplier: 1.0,
    desc: "Calme · +50 % vitesse nettoyage",
  },
  {
    id: "grand_service",
    label: "Grand Service",
    icon: "✨",
    color: "#8b5cf6",
    startAbs: 1080,  // 18:00
    endAbs:   1260,  // 21:00
    spawnRate: 1.5,
    prepBonus: 0,
    patienceMultiplier: 0.9,
    cleanBonus: 0,
    priceMultiplier: 1.10,
    desc: "Plats complexes · +10 % prix",
  },
  {
    id: "fermeture",
    label: "Fermeture",
    icon: "🔒",
    color: "#ef4444",
    startAbs: 1260,  // 21:00
    endAbs:   1620,  // 03:00 (lendemain)
    spawnRate: 0,
    prepBonus: 0,
    patienceMultiplier: 1.0,
    cleanBonus: 0,
    priceMultiplier: 1.0,
    desc: "Service terminé — fin de journée quand la salle est vide",
  },
];

/* ─── Utilitaires purs ───────────────────────────────── */

/**
 * Convertit un temps écoulé réel (ms depuis le début de la journée)
 * en heure de jeu simulée.
 *
 * @param {number} elapsedRealMs
 * @returns {{ h: number, m: number, absMin: number, str: string }}
 *
 * Exemples :
 *   0        → { h:8,  m:0,  str:"08h00" }
 *   210_000  → { h:11, m:30, str:"11h30" }  (Rush Midi commence)
 *   960_000  → { h:0,  m:0,  str:"00h00" }  (fin de journée)
 */
export function realMsToGameTime(elapsedRealMs) {
  const absMin = DAY_START_ABS + Math.floor(Math.max(0, elapsedRealMs) / 1_000);
  const h = Math.floor(absMin / 60) % 24;
  const m = absMin % 60;
  return {
    h, m, absMin,
    str: `${String(h).padStart(2, "0")}h${String(m).padStart(2, "0")}`,
  };
}

/**
 * Retourne la phase active pour un temps absolu en minutes.
 *
 * @param {number} absMin  - minutes depuis minuit (ex: 690 = 11h30)
 * @returns {typeof PHASES[0]}
 */
export function getPhase(absMin) {
  return PHASES.find(p => absMin >= p.startAbs && absMin < p.endAbs)
    ?? PHASES[PHASES.length - 1];
}

/* ─── Hook principal ─────────────────────────────────── */

/**
 * useGameClock — fournit l'horloge réelle et le temps de jeu simulé.
 *
 * @returns {{
 *   clockNow      : number,   // Date.now() réel — pour tous les timers existants
 *   gameTime      : { h, m, absMin, str },
 *   phase         : object,   // phase active (un élément de PHASES)
 *   isDayOver     : boolean,  // true quand 03h00 est atteint
 *   elapsedRealMs : number,   // ms réels depuis dayStart
 *   resetDay      : Function, // remet l'horloge à 08h00
 * }}
 */
export function useGameClock() {
  const [clockNow,   setClockNow]  = useState(() => Date.now());
  const [dayStart,   setDayStart]  = useState(() => Date.now());

  useEffect(() => {
    const iv = setInterval(() => setClockNow(Date.now()), 250);
    return () => clearInterval(iv);
  }, []);

  // Remet la journée à 08h00 en alignant dayStart sur clockNow courant
  const resetDay = useCallback(() => setDayStart(Date.now()), []);

  const elapsedRealMs = Math.max(0, clockNow - dayStart);
  const gameTime      = realMsToGameTime(elapsedRealMs);
  const phase         = getPhase(gameTime.absMin);
  const isDayOver     = elapsedRealMs >= REAL_DAY_MS;

  return { clockNow, gameTime, phase, isDayOver, elapsedRealMs, resetDay };
}
