/* ═══════════════════════════════════════════════════════
   src/hooks/useSpawner.js
   Gestion des arrivées de clients avec :

   B — File bouchon   : pas de spawn si file >= MAX_QUEUE
   C — Niveau resto   : intervalle réduit au fur et à mesure
   D — Vagues         : 5 % de chance de spawner 2–3 groupes
   F — Salle vide     : force un spawn si aucune table active
                        depuis IDLE_FORCE_SPAWN ms
   P — Phase          : bloque le spawn hors service (spawnRate=0),
                        ajuste l'intervalle et la patience clients
═══════════════════════════════════════════════════════ */

import { useEffect, useRef } from "react";
import { rMood, rName, rSize } from "../utils/randomUtils.js";
import { useLang } from "../i18n/index.jsx";
import { SPAWNER, spawnInterval } from "../config/gameConfig.js";

/* ── Aliases locaux pour rétrocompatibilité interne ─── */
const MAX_QUEUE        = SPAWNER.maxQueue;
const WAVE_CHANCE      = SPAWNER.waveChance;
const IDLE_FORCE_SPAWN = SPAWNER.idleForceMs;
const intervalForLevel = spawnInterval;

/* ── Créer un groupe ────────────────────────────────── */
/**
 * @param {Array}  livres        - tables libres disponibles
 * @param {number} patienceMult  - multiplicateur de patience (1.0 = normal)
 */
const makeGroup = (livres, patienceMult = 1.0) => {
  const mood   = rMood();
  const maxCap = livres.length > 0 ? Math.max(...livres.map(t => t.capacity)) : 2;
  const size   = Math.min(rSize(), maxCap);
  const pat    = mood.p * patienceMult; // patience en secondes (ajustée)
  return {
    id        : Date.now() + Math.random(),
    name      : rName(),
    size,
    mood,
    expiresAt : Date.now() + pat * 1000,
    patMax    : pat,       // secondes — utilisé pour la barre de patience
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
  phaseRef,
  pausedRef,
}) => {
  const { t } = useLang();
  const lastActiveRef = useRef(Date.now()); // F — timestamp dernière table non-vide

  useEffect(() => {
    const iv = setInterval(() => {
      if (pausedRef?.current) return;
      const now    = Date.now();
      const tables = tablesRef.current;
      const queue  = queueRef.current;
      const lvl    = restoLvRef.current ?? 0;
      const tier   = getRepTier(repRef.current);

      // ── P : phase de service ──────────────────────
      const phase = phaseRef?.current;
      if (phase && phase.spawnRate === 0) return; // Mise en place / Fermeture : pas de clients

      // ── B : file bouchon ──────────────────────────
      if (queue.length >= MAX_QUEUE) return;

      // ── C + P : intervalle selon niveau + réputation + phase ─
      const spawnMult = phase?.spawnRate ?? 1.0;
      const interval  = Math.round(
        intervalForLevel(lvl) / (tier.spawnMult ?? 1) / Math.max(0.1, spawnMult)
      );

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

      // ── P : patience ajustée selon la phase ──────
      const patienceMult = phase?.patienceMultiplier ?? 1.0;
      const newGroups    = Array.from({ length: nb }, () => makeGroup(livres, patienceMult));

      setQueue(q => [...q, ...newGroups]);

      if (isWave && nb > 1) {
        addToast({
          icon  : "🌊",
          title : t("toast.wave", {n:nb}),
          msg   : t("toast.waveMsg"),
          color : "#3a5f8a",
          tab   : "tables",
        });
      }
    }, 500);

    return () => clearInterval(iv);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setQueue, t]);
};
