/* ═══════════════════════════════════════════════════════
   src/hooks/useServerMoral.js
   Fait évoluer le moral des serveurs en temps réel.

   Règles originales (conservées à l'identique) :
     - Actif / En service → moral −1 toutes les 5 min réelles
     - En pause           → moral +3 toutes les 5 min réelles
     - Alerte burnout     → toast unique quand moral atteint 10
     - Repos / autre      → inchangé

   Intervalle : 300 000 ms (5 minutes)
   → moral 100 → 0 en ~8h20 de jeu réel
   → moral 0   → 100 en ~2h47 de pause

   Usage dans App.jsx :
     useServerMoral({ setServers, addToast });
═══════════════════════════════════════════════════════ */

import { useEffect } from "react";

/** Gain de moral par tick (5 min) quand le serveur est en pause */
const MORAL_PAUSE_GAIN    = 3;

/** Intervalle entre chaque tick de moral — 5 minutes réelles */
const MORAL_DRAIN_INTERVAL = 300_000;

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

            // Alerte burnout — toast unique quand moral atteint 10
            if (newMoral === 10) {
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
    }, MORAL_DRAIN_INTERVAL); // ← 300 000 ms = 5 min (PAS 50 ms)

    return () => clearInterval(iv);
  }, [setServers, addToast]);
};
