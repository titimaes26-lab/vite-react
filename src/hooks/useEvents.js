/* ═══════════════════════════════════════════════════════
   src/hooks/useEvents.js
   Événements aléatoires — se déclenchent toutes les ~4 min
   avec 60 % de probabilité. Accède aux états courants via
   des refs pour ne pas recréer l'intervalle à chaque rendu.

   Événements disponibles (définis dans gameData.js) :
     - inspection  → amende ou bonus selon le stock
     - rush        → 3 groupes ajoutés en file
     - frigo       → panne, stock viandes/poissons −60 %
     - critique    → client VIP Michelin

   Usage dans App.jsx :
     useEvents({ stockRef, cashRef, complaintsRef, tablesRef,
                 setStock, setComplaints, setQueue, setCash,
                 setActiveEvent, addToast, addTx });
═══════════════════════════════════════════════════════ */

import { useEffect } from "react";
import { GAME_EVENTS } from "../constants/gameData";
import { rMood, rName, rSize } from "../utils/randomUtils";

/**
 * @param {{
 *   stockRef        : React.MutableRefObject<Array>,
 *   cashRef         : React.MutableRefObject<number>,
 *   complaintsRef   : React.MutableRefObject<Array>,
 *   tablesRef       : React.MutableRefObject<Array>,
 *   setStock        : Function,
 *   setComplaints   : Function,
 *   setQueue        : Function,
 *   setCash         : Function,
 *   setActiveEvent  : Function,
 *   addToast        : Function,
 *   addTx           : Function,
 * }} params
 */
export const useEvents = ({
  stockRef,
  cashRef,
  complaintsRef,
  tablesRef,
  setStock,
  setComplaints,
  setQueue,
  setCash,
  setActiveEvent,
  addToast,
  addTx,
}) => {
  useEffect(() => {
    const iv = setInterval(() => {
      if (Math.random() >= 0.60) return;

      const evt = GAME_EVENTS[Math.floor(Math.random() * GAME_EVENTS.length)];

      // Afficher la bannière d'événement 8 secondes
      setActiveEvent(evt.id);
      setTimeout(() => setActiveEvent(null), 8_000);

      // Exécuter l'événement avec les refs pour lire l'état courant
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
      );
    }, 240_000); // toutes les 4 minutes

    return () => clearInterval(iv);
  // Les setters React sont stables — pas besoin dans les deps
  // Les refs sont mutables — accès en lecture dans le callback
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addToast, addTx]);
};
