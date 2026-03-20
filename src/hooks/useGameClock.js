/* ═══════════════════════════════════════════════════════
   src/hooks/useGameClock.js
   Horloge globale du jeu — met à jour clockNow toutes les 250ms.
   Utilisé par TablesView, ServersView et l'en-tête pour les
   compteurs de patience et les timers de cuisson.

   Usage dans App.jsx :
     const clockNow = useGameClock();
═══════════════════════════════════════════════════════ */

import { useState, useEffect } from "react";

/**
 * @returns {number} timestamp ms actualisé toutes les 250ms
 */
export const useGameClock = () => {
  const [clockNow, setClockNow] = useState(Date.now);

  useEffect(() => {
    const iv = setInterval(() => setClockNow(Date.now()), 250);
    return () => clearInterval(iv);
  }, []);

  return clockNow;
};
