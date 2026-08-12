/* ═══════════════════════════════════════════════════════
   src/hooks/useEvents.js
   Événements aléatoires — un seul par journée de service,
   déclenché à un instant aléatoire entre 1 et 15 minutes
   réelles (hors pause) après le début de la journée.

   Comportement :
   - Si la journée est déjà avancée (chargement de sauvegarde),
     la fenêtre est recalée pour rester dans les 15 premières minutes.
   - Si le navigateur a été fermé longtemps (elapsed > 15 min réelles),
     on repart d'une fenêtre complète [1-15 min] plutôt que de
     supprimer l'événement du jour.
   - Le décompte est pause-aware : le temps de pause ne compte
     pas dans le délai.
   - La bannière 8 s et l'état activeEvent sont annulés lors du cleanup.
   - IMPORTANT : addToast et addTx doivent rester des références stables
     (useCallback à deps vides). Si leurs deps changent, l'effet se
     ré-exécute à chaque render et le cleanup efface immédiatement
     chaque bannière d'événement.

   Usage dans App.jsx :
     useEvents({ stockRef, cashRef, complaintsRef, tablesRef,
                 serversRef, setStock, setComplaints, setQueue,
                 setCash, setTables, setServers, setKitchen,
                 setActiveEvent, addToast, addTx, updateReputation,
                 dayStartRealMs, pausedRef });
═══════════════════════════════════════════════════════ */

import { useEffect } from "react";
import { GAME_EVENTS } from "../constants/gameData.js";
import { rMood, rName, rSize } from "../utils/randomUtils.js";

// Fenêtre de déclenchement : entre 1 min et 15 min de jeu (hors pause)
const EVENT_MIN_MS = 60_000;
const EVENT_MAX_MS = 900_000;

export const useEvents = ({
  stockRef,
  cashRef,
  complaintsRef,
  tablesRef,
  serversRef,
  restoLvRef,
  phaseRef,
  pausedRef,
  setStock,
  setComplaints,
  setQueue,
  setCash,
  setTables,
  setServers,
  setKitchen,
  setActiveEvent,
  addToast,
  addTx,
  updateReputation,
  dayStartRealMs,
}) => {
  useEffect(() => {
    // Corrige la fenêtre si la journée est déjà avancée (chargement de sauvegarde).
    // Si le navigateur a été fermé longtemps (elapsed >= EVENT_MAX_MS), on repart
    // d'une fenêtre complète plutôt que de supprimer l'événement du jour.
    const rawElapsed = Math.max(0, Date.now() - (dayStartRealMs ?? 0));
    const elapsed = rawElapsed >= EVENT_MAX_MS ? 0 : rawElapsed;

    const minDelay = Math.max(0, EVENT_MIN_MS - elapsed);
    const maxDelay = EVENT_MAX_MS - elapsed;
    let remaining = minDelay + Math.random() * (maxDelay - minDelay);
    let lastTick = Date.now();
    let bannerT;
    let evtCleanup = null;

    const fireEvent = () => {
      const lv = restoLvRef?.current ?? 0;
      const eligible = GAME_EVENTS.filter(e => (e.minLevel ?? 0) <= lv && (e.maxLevel ?? Infinity) >= lv);
      if (eligible.length === 0) return;
      const evt = eligible[Math.floor(Math.random() * eligible.length)];

      setActiveEvent(evt.id);
      bannerT = setTimeout(() => setActiveEvent(null), 8_000);

      const patienceMult = phaseRef?.current?.patienceMultiplier ?? 1.0;

      evtCleanup = evt.apply(
        stockRef.current,
        cashRef.current,
        complaintsRef.current,
        addToast,
        setCash,
        addTx,
        setComplaints,
        setQueue,
        rMood,
        rName,
        rSize,
        tablesRef.current,
        setStock,
        setTables,
        setServers,
        setKitchen,
        updateReputation,
        serversRef ? serversRef.current : [],
        lv,
        patienceMult,
      ) ?? null;
    };

    // Décompte pause-aware : le temps de pause ne consomme pas le délai
    const iv = setInterval(() => {
      if (pausedRef?.current) {
        lastTick = Date.now();
        return;
      }
      const now = Date.now();
      remaining -= now - lastTick;
      lastTick = now;
      if (remaining > 0) return;
      clearInterval(iv);
      fireEvent();
    }, 250);

    return () => {
      clearInterval(iv);
      clearTimeout(bannerT);
      evtCleanup?.();
      setActiveEvent(null);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayStartRealMs, addToast, addTx]);
};
