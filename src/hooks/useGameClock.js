/* ═══════════════════════════════════════════════════════
   src/hooks/useGameClock.js
   Moteur de temps accéléré — 1 seconde réelle = 1 minute de jeu.

   Journée simulée : 07:00 → 23:00 (16 h de jeu = 960 s réelles = 16 min réelles)

   Exports :
     PHASES            — tableau des 3 phases de service
     SHIFTS            — créneaux de travail du personnel (matin / soir)
     isOnShift         — teste si un créneau est actif pour un absMin donné
     REAL_DAY_MS       — durée réelle d'une journée en ms (960 000)
     realMsToGameTime  — convertit elapsed réel → { h, m, absMin, str }
     getPhase          — retourne la phase active pour un absMin donné
     useGameClock      — hook principal ; retourne gameTime.str à jour
═══════════════════════════════════════════════════════ */

import { useState, useEffect, useCallback, useRef } from "react";

/* ─── Bornes par défaut (journée complète) ────────────── */
const DEFAULT_DAY_START_ABS = 7 * 60;   // 07:00
const DEFAULT_DAY_END_ABS   = 23 * 60;  // 23:00

// Conservé pour compatibilité (journée complète)
export const REAL_DAY_MS = (DEFAULT_DAY_END_ABS - DEFAULT_DAY_START_ABS) * 1_000;

/* ─── Phases de service ──────────────────────────────── */
/**
 * Chaque phase définit :
 *   startAbs / endAbs     — bornes en minutes absolues depuis minuit
 *   spawnRate             — multiplicateur d'intervalle de spawn (0 = aucun client)
 *   patienceMultiplier    — facteur appliqué à la patience des clients
 *   prepBonus             — bonus de vitesse de cuisson (0.20 = +20 %)
 *   cleanBonus            — bonus de vitesse de nettoyage (0.50 = +50 %)
 *   priceMultiplier       — facteur sur le prix des plats (1.10 = +10 %)
 *   allowedCats           — catégories de plats disponibles pendant cette phase
 */
export const PHASES = [
  {
    id: "petit_dejeuner",
    label: "Petit Déjeuner",
    icon: "☕",
    color: "#f59e0b",
    startAbs: 420,   // 07:00
    endAbs:   660,   // 11:00
    spawnRate: 0.8,
    prepBonus: 0.15,
    patienceMultiplier: 1.2,
    cleanBonus: 0,
    priceMultiplier: 1.0,
    allowedCats: ["Petit Déjeuner", "Boissons"],
    desc: "Service calme · plats du matin · +15 % vitesse cuisson",
  },
  {
    id: "dejeuner",
    label: "Déjeuner",
    icon: "🌞",
    color: "#f97316",
    startAbs: 660,   // 11:00
    endAbs:   900,   // 15:00
    spawnRate: 2.0,
    prepBonus: 0,
    patienceMultiplier: 0.75,
    cleanBonus: 0,
    priceMultiplier: 1.0,
    allowedCats: ["Entrées", "Plats", "Desserts", "Boissons"],
    desc: "Affluence max · −25 % patience",
  },
  {
    id: "diner",
    label: "Dîner",
    icon: "🌙",
    color: "#8b5cf6",
    startAbs: 900,   // 15:00
    endAbs:   1350,  // 22:30
    spawnRate: 1.5,
    prepBonus: 0,
    patienceMultiplier: 0.9,
    cleanBonus: 0,
    priceMultiplier: 1.10,
    allowedCats: ["Entrées", "Plats", "Desserts", "Boissons"],
    desc: "Service du soir · +10 % prix",
  },
  {
    id: "fermeture",
    label: "Fermeture",
    icon: "🔒",
    color: "#64748b",
    startAbs: 1350,  // 22:30
    endAbs:   1440,  // 00:00
    spawnRate: 0,
    prepBonus: 0,
    patienceMultiplier: 1.0,
    cleanBonus: 0,
    priceMultiplier: 1.0,
    allowedCats: [],
    desc: "Fermeture — plus de nouveaux clients",
  },
];

/* ─── Créneaux de travail du personnel ───────────────── */
const SHIFTS = {
  matin: { id: "matin", label: "Matin",  icon: "🌅", startAbs: 420,  endAbs: 900  }, // 07h-15h
  soir:  { id: "soir",  label: "Soir",   icon: "🌙", startAbs: 900,  endAbs: 1440 }, // 15h-00h (overtime jusqu'au dernier client)
};

/**
 * Retourne true si le personnel avec ce créneau est actuellement en service.
 * @param {string|null} shift  — "matin" | "soir" | null
 * @param {number}      absMin — minutes depuis minuit (ex: 900 = 15h00)
 */
export function isOnShift(shift, absMin) {
  if (!shift) return false;
  const s = SHIFTS[shift];
  return s ? absMin >= s.startAbs && absMin < s.endAbs : false;
}

/* ─── Utilitaires purs ───────────────────────────────── */

/**
 * Convertit un temps écoulé réel (ms depuis le début de la journée)
 * en heure de jeu simulée.
 *
 * @param {number} elapsedRealMs
 * @param {number} [dayStartAbs=420] — début de journée en minutes absolues
 * @returns {{ h: number, m: number, absMin: number, str: string }}
 */
export function realMsToGameTime(elapsedRealMs, dayStartAbs = DEFAULT_DAY_START_ABS) {
  const absMin = dayStartAbs + Math.floor(Math.max(0, elapsedRealMs) / 1_000);
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
export function useGameClock({
  pausedRef,
  dayStartAbs = DEFAULT_DAY_START_ABS,
  dayEndAbs   = DEFAULT_DAY_END_ABS,
} = {}) {
  const [clockNow, setClockNow] = useState(() => Date.now());
  const [dayStart, setDayStart] = useState(() => Date.now());
  const pausedAtRef = useRef(null);
  const lastSyncRef = useRef(Date.now());
  const rafIdRef    = useRef(null);

  useEffect(() => {
    function tick() {
      const now = Date.now();

      if (pausedRef?.current) {
        if (pausedAtRef.current === null) pausedAtRef.current = now;
        rafIdRef.current = requestAnimationFrame(tick);
        return;
      }

      if (pausedAtRef.current !== null) {
        const dur = now - pausedAtRef.current;
        setDayStart(ds => ds + dur);
        pausedAtRef.current = null;
        // Force sync immédiate pour que clockNow et dayStart soient cohérents
        lastSyncRef.current = now - 250;
      }

      // Synchronise React 4×/s — en phase avec l'œil humain
      if (now - lastSyncRef.current >= 250) {
        lastSyncRef.current = now;
        setClockNow(now);
      }

      rafIdRef.current = requestAnimationFrame(tick);
    }

    rafIdRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafIdRef.current);
  }, [pausedRef]);

  const resetDay = useCallback(() => {
    const now = Date.now();
    pausedAtRef.current = null;
    lastSyncRef.current = now - 250;
    setDayStart(now);
  }, []);

  const realDayMs     = (dayEndAbs - dayStartAbs) * 1_000;
  const elapsedRealMs = Math.max(0, clockNow - dayStart);
  const gameTime      = realMsToGameTime(elapsedRealMs, dayStartAbs);
  const phase         = getPhase(gameTime.absMin);
  const isDayOver     = elapsedRealMs >= realDayMs;

  return { clockNow, gameTime, phase, isDayOver, elapsedRealMs, resetDay };
}
