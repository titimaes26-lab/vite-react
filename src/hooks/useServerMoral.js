/* ═══════════════════════════════════════════════════════
   src/hooks/useServerMoral.js
   Polling 50ms — fait évoluer le moral des serveurs en temps réel.

   Règles :
     - Actif / En service → moral −1 par tick (~−1/5s)
     - En pause           → moral +MORAL_PAUSE_GAIN par tick
     - Alerte burnout     → toast si moral atteint 10
     - Repos              → inchangé (géré manuellement)

   Usage dans App.jsx :
     useServerMoral({ setServers, addToast });
═══════════════════════════════════════════════════════ */

import { useEffect } from "react";

/** Gain de moral par tick quand le serveur est en pause */
const MORAL_PAUSE_GAIN = 2;

/**
 * @param {{
 *   setServers : Function,
 *   addToast   : Function,
 * }} params
 */
export const useServerMoral = ({ setServers, addToast }) => {
  useEffect(() => {
    const iv = setInterval(() => {
      setServers(prev =>
        prev.map(s => {
          if (s.status === "actif" || s.status === "service") {
            const newMoral = Math.max(0, (s.moral ?? 100) - 1);

            // Alerte burnout (une seule fois, à 10)
            if (newMoral === 10) {
              // setTimeout pour sortir du setter (React strict mode)
              setTimeout(() =>
                addToast({
                  icon  : "😓",
                  title : `${s.name} épuisé·e !`,
                  msg   : "Moral critique — mettez-le/la en pause ou offrez une prime.",
                  color : "#c0392b",
                  tab   : "servers",
                }), 50
              );
            }

            return { ...s, moral: newMoral };
          }

          if (s.status === "pause") {
            return { ...s, moral: Math.min(100, (s.moral ?? 100) + MORAL_PAUSE_GAIN) };
          }

          // Repos ou autre statut → inchangé
          return s;
        })
      );
    }, 50); // ~20 ticks/seconde = dérive très lente

    return () => clearInterval(iv);
  // addToast est stable (useCallback dans App)
  }, [setServers, addToast]);
};
