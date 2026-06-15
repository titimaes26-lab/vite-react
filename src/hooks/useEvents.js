/* ═══════════════════════════════════════════════════════
   src/hooks/useEvents.js
   Événements aléatoires — un seul par journée de service,
   déclenché à un instant aléatoire entre 1 et 15 minutes
   réelles (hors pause) après le début de la journée.

   Comportement :
   - Si la journée est déjà avancée (chargement de sauvegarde),
     la fenêtre de déclenchement est recalée pour rester dans
     les 15 premières minutes ; si la fenêtre est dépassée,
     aucun événement ne se produit ce jour-là.
   - Le décompte est pause-aware : le temps de pause ne compte
     pas dans le délai.
   - La bannière 8 s est annulée proprement lors du cleanup.

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
    // Corrige la fenêtre si la journée est déjà avancée (chargement de sauvegarde)
    const elapsed = Math.max(0, Date.now() - (dayStartRealMs ?? 0));
    if (elapsed >= EVENT_MAX_MS) return; // fenêtre dépassée, pas d'événement aujourd'hui

    const minDelay = Math.max(0, EVENT_MIN_MS - elapsed);
    const maxDelay = EVENT_MAX_MS - elapsed;
    let remaining = minDelay + Math.random() * (maxDelay - minDelay);
    let lastTick = Date.now();
    let bannerT;

    const fireEvent = () => {
      const lv = restoLvRef?.current ?? 0;
      const eligible = GAME_EVENTS.filter(e => (e.minLevel ?? 0) <= lv && (e.maxLevel ?? Infinity) >= lv);
      if (eligible.length === 0) return;
      const evt = eligible[Math.floor(Math.random() * eligible.length)];

      setActiveEvent(evt.id);
      bannerT = setTimeout(() => setActiveEvent(null), 8_000);

      const patienceMult = phaseRef?.current?.patienceMultiplier ?? 1.0;

      evt.apply(
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
      );
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
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayStartRealMs, addToast, addTx]);
};
