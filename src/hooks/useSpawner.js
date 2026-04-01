/* ═══════════════════════════════════════════════════════
   src/hooks/useSpawner.js
   Gestion des arrivées de clients avec :

   B — File bouchon   : pas de spawn si file >= MAX_QUEUE
   C — Niveau resto   : intervalle réduit au fur et à mesure
   D — Vagues         : 5 % de chance de spawner 2–3 groupes
   F — Salle vide     : force un spawn si aucune table active
                        depuis IDLE_FORCE_SPAWN ms
═══════════════════════════════════════════════════════ */

import { useEffect, useRef } from "react";
import { rMood, rName, rSize } from "../utils/randomUtils.js";

/* ── Constantes ─────────────────────────────────────── */
const MAX_QUEUE        = 4;       // B — max groupes en file
const BASE_INTERVAL    = 35_000;  // C — intervalle de base (niveau 0)
const MIN_INTERVAL     = 15_000;  // C — intervalle minimum  (niveau 5)
const WAVE_CHANCE      = 0.05;    // D — 5 % de chance de vague
const IDLE_FORCE_SPAWN = 60_000;  // F — force spawn si salle vide > 60s

/* ── Intervalle selon niveau (C) ────────────────────── */
const intervalForLevel = (lvl) => {
  const t = Math.min(lvl, 5) / 5;
  return Math.round(BASE_INTERVAL - t * (BASE_INTERVAL - MIN_INTERVAL));
};

/* ── Créer un groupe ────────────────────────────────── */
const makeGroup = (livres) => {
  const mood   = rMood();
  const maxCap = livres.length > 0 ? Math.max(...livres.map(t => t.capacity)) : 2;
  const size   = Math.min(rSize(), maxCap);
  return {
    id        : Date.now() + Math.random(),
    name      : rName(),
    size,
    mood,
    expiresAt : Date.now() + mood.p * 1000,
    patMax    : mood.p,
  };
};

export const useSpawner = ({
  setQueue,
  tablesRef,
  queueRef,
  restoLvRef,
  lastSpawnRef,
  repRef,
  getRepTier,
  addToast,
}) => {
  const lastActiveRef = useRef(Date.now()); // F — timestamp dernière table non-vide

  useEffect(() => {
    const iv = setInterval(() => {
      const now    = Date.now();
      const tables = tablesRef.current;
      const queue  = queueRef.current;
      const lvl    = restoLvRef.current ?? 0;
      const tier   = getRepTier(repRef.current);

      // ── B : file bouchon ──────────────────────────
      if (queue.length >= MAX_QUEUE) return;

      // ── C : intervalle selon niveau + réputation ─
      const interval = Math.round(intervalForLevel(lvl) / (tier.spawnMult ?? 1));

      const livres    = tables.filter(t => t.status === "libre");
      const hasActive = tables.some(t => t.status !== "libre" && t.status !== "nettoyage");

      // ── F : salle vide → force le spawn ──────────
      if (hasActive) lastActiveRef.current = now;
      const forceSpawn = (now - lastActiveRef.current) >= IDLE_FORCE_SPAWN
        && livres.length > 0
        && queue.length === 0;

      if (!forceSpawn && now - lastSpawnRef.current < interval) return;
      lastSpawnRef.current = now;

      if (!forceSpawn && Math.random() >= 0.65) return;
      if (livres.length === 0) return;

      // ── D : vague de clients ──────────────────────
      const isWave    = !forceSpawn && Math.random() < WAVE_CHANCE;
      const count     = isWave ? (Math.random() < 0.5 ? 2 : 3) : 1;
      const nb        = Math.min(count, MAX_QUEUE - queue.length);
      const newGroups = Array.from({ length: nb }, () => makeGroup(livres));

      setQueue(q => [...q, ...newGroups]);

      if (isWave && nb > 1) {
        addToast({
          icon  : "🌊",
          title : `Vague de clients ! (${nb} groupes)`,
          msg   : "Plusieurs groupes arrivent en même temps.",
          color : "#3a5f8a",
          tab   : "tables",
        });
      }
      if (forceSpawn) {
        addToast({
          icon  : "🚶",
          title : "Un groupe arrive…",
          msg   : "La salle était calme, des clients passent la porte.",
          color : "#8a7d6a",
          tab   : "tables",
        });
      }
    }, 500);

    return () => clearInterval(iv);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setQueue]);
};
