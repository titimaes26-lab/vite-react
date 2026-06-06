/* ═══════════════════════════════════════════════════════
   src/constants/gameConstants.js
   Constantes de gameplay avancé — séparées de gameData.js
   car elles dépendent de C (thème) et contiennent de la
   logique de règles de jeu (multiplicateurs, seuils).

   Contient : REP_THRESHOLDS, REP_DELTA, MENU_THEMES,
              FORMULA_PRESETS, MORAL_PAUSE_GAIN, getRepTier
═══════════════════════════════════════════════════════ */
import { C } from "./gameData.js";
import { MORALE } from "../config/gameConfig.js";

/* ─── Réputation restaurant (0–100) ──────────────────── */
export const REP_THRESHOLDS = [
  { min: 80, label: "Réputé",      icon: "🌟", color: "#6b3fa0",
    tipMult: 1.25, spawnMult: 1.20,
    desc: "Les clients affluent. Pourboires +25%, +20% de clients." },
  { min: 60, label: "Apprécié",    icon: "😊", color: "#2a5c3f",
    tipMult: 1.10, spawnMult: 1.10,
    desc: "Bonne réputation. Légère hausse des pourboires et des clients." },
  { min: 40, label: "Neutre",      icon: "😐", color: "#8a7d6a",
    tipMult: 1.00, spawnMult: 1.00,
    desc: "Réputation standard, pas d'effet." },
  { min: 20, label: "Dégradée",    icon: "😟", color: "#c4622d",
    tipMult: 0.80, spawnMult: 0.80,
    desc: "Les clients se méfient. Pourboires −20%, moins de clients." },
  { min: 0,  label: "Désastreuse", icon: "💀", color: "#c0392b",
    tipMult: 0.50, spawnMult: 0.50,
    desc: "Votre réputation est en ruine. Urgence absolue !" },
];

/**
 * Retourne le palier de réputation actif.
 * @param {number} rep - valeur 0–100
 * @returns {typeof REP_THRESHOLDS[0]}
 */
export const getRepTier = (rep) =>
  REP_THRESHOLDS.find(t => rep >= t.min) ?? REP_THRESHOLDS[REP_THRESHOLDS.length - 1];

/* ─── Deltas de réputation par événement ─────────────── */
export const REP_DELTA = {
  rating5    : +4,   // ★★★★★
  rating4    : +2,   // ★★★★
  rating3    :  0,   // ★★★ neutre
  rating2    : -4,   // ★★
  rating1    : -8,   // ★
  vip        : +6,   // Client VIP bien servi
  lostClient : -3,   // Client parti sans être servi
  complaint  : -5,   // Plainte générée auto
  inspection : -6,   // Inspection ratée
  inspOk     : +3,   // Inspection réussie
};

/* ─── Moral des serveurs ─────────────────────────────── */
export const MORAL_PAUSE_GAIN = MORALE.pauseGain;

/* ─── Formules de menu (menus fixes à prix réduit) ───── */
export const FORMULA_PRESETS = [
  {
    id: "decouverte", name: "Menu Découverte", icon: "🌟", discount: 0.12,
    cats: ["Entrées", "Plats", "Desserts"],
    desc: "3 services — −12%",
  },
  {
    id: "express", name: "Menu Express", icon: "⚡", discount: 0.08,
    cats: ["Plats", "Boissons"],
    desc: "2 services — −8%",
  },
  {
    id: "prestige", name: "Menu Prestige", icon: "👑", discount: 0.15,
    cats: ["Entrées", "Plats", "Desserts", "Boissons"],
    desc: "4 services — −15%",
  },
];
