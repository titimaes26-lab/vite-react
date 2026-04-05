/* ═══════════════════════════════════════════════════════
   src/hooks/useEvents.js
   Événements aléatoires — se déclenchent toutes les ~4 min
   avec 60 % de probabilité. Accède aux états courants via
   des refs pour ne pas recréer l'intervalle à chaque rendu.

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
                 setActiveEvent, addToast, addTx, updateReputation });
═══════════════════════════════════════════════════════ */

import { useEffect } from "react";
import { GAME_EVENTS } from "../constants/gameData.js";
import { rMood, rName, rSize } from "../utils/randomUtils.js";

export const useEvents = ({
  stockRef,
  cashRef,
  complaintsRef,
  tablesRef,
  serversRef,
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
}) => {
  useEffect(() => {
    const iv = setInterval(() => {
      if (Math.random() >= 0.60) return;

      const evt = GAME_EVENTS[Math.floor(Math.random() * GAME_EVENTS.length)];

      // Afficher la bannière d'événement 8 secondes
      setActiveEvent(evt.id);
      setTimeout(() => setActiveEvent(null), 8_000);

      // Exécuter l'événement
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
      );
    }, 240_000); // toutes les 4 minutes

    return () => clearInterval(iv);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addToast, addTx]);
};
