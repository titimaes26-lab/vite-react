/* ═══════════════════════════════════════════════════════
   src/hooks/useEvents.js
   Événements aléatoires — un seul par journée de service,
   déclenché à un instant aléatoire entre 1 et 15 minutes
   réelles après le début de la journée.

   Événements disponibles (définis dans gameData.js) :
     - inspection       → amende ou bonus selon le stock
     - rush             → 3 groupes ajoutés en file
     - frigo            → panne, stock viandes/poissons −60 %
     - critique         → client VIP Michelin
     - anniversaire     → patience +30%, bonus cash
     - buzz             → 3 groupes + VIP, réputation +5
     - blackout         → cuisson ralentie 50% pendant 3 min
     - livraison_cadeau → réapprovisionnement gratuit x5 items
     - serveur_malade   → serveur en pause 4 min

   Usage dans App.jsx :
     useEvents({ stockRef, cashRef, complaintsRef, tablesRef,
                 serversRef, setStock, setComplaints, setQueue,
                 setCash, setTables, setServers, setKitchen,
                 setActiveEvent, addToast, addTx, updateReputation,
                 dayStartRealMs });
═══════════════════════════════════════════════════════ */

import { useEffect } from "react";
import { GAME_EVENTS } from "../constants/gameData.js";
import { rMood, rName, rSize } from "../utils/randomUtils.js";

// Fenêtre de déclenchement : entre 1 min et 15 min réelles dans la journée
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
    // Un seul événement par journée, à un instant aléatoire
    const delay = EVENT_MIN_MS + Math.random() * (EVENT_MAX_MS - EVENT_MIN_MS);

    const t = setTimeout(() => {
      const lv = restoLvRef?.current ?? 0;
      const eligible = GAME_EVENTS.filter(e => (e.minLevel ?? 0) <= lv && (e.maxLevel ?? Infinity) >= lv);
      if (eligible.length === 0) return;
      const evt = eligible[Math.floor(Math.random() * eligible.length)];

      setActiveEvent(evt.id);
      setTimeout(() => setActiveEvent(null), 8_000);

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
    }, delay);

    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayStartRealMs, addToast, addTx]);
};
