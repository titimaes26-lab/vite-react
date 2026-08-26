/* ═══════════════════════════════════════════════════════
   src/hooks/useSalary.js
   Tick toutes les heures de jeu (60 s réelles) — accumule
   les salaires dans onAccrue sans débiter le cash.

   Le paiement réel se fait à la fin de la journée simulée
   dans startNewDay() (App.jsx), en un seul virement.

   Lit l'état depuis des refs pour éviter les stale closures.
═══════════════════════════════════════════════════════ */

import { useEffect } from "react";
import { CHEF_LVL, CHEF_XP_CAP } from "../constants/gameData";

const _chefLv = (xp) => {
  let l = 0, r = xp;
  while (l < CHEF_XP_CAP.length && r >= CHEF_XP_CAP[l]) { r -= CHEF_XP_CAP[l]; l++; }
  return l;
};

/**
 * @param {{
 *   serversRef : React.RefObject,
 *   kitchenRef : React.RefObject,
 *   onAccrue   : (total: number, perPerson: Record<string,number>) => void,
 *   pausedRef  : React.RefObject,
 * }} params
 */
export const useSalary = ({ serversRef, kitchenRef, onAccrue, pausedRef }) => {
  useEffect(() => {
    const iv = setInterval(() => {
      if (pausedRef?.current) return;

      let total = 0;
      const perPerson = {};

      const servers = serversRef.current ?? [];
      servers.filter(s => s.status === "actif").forEach(s => {
        const w = s.salary ?? 0;
        if (w <= 0) return;
        total += w;
        const key = s.name.split(" ")[0];
        perPerson[key] = (perPerson[key] ?? 0) + w;
      });

      const kitchen = kitchenRef.current;
      if (kitchen) {
        const cw = kitchen.chef.salary ?? 0;
        if (cw > 0) {
          total += cw;
          const key = kitchen.chef.name.split(" ")[0];
          perPerson[key] = (perPerson[key] ?? 0) + cw;
        }

        const lvIdx = _chefLv(kitchen.chef.totalXp);
        const unlockedCommis = CHEF_LVL[Math.min(lvIdx, CHEF_LVL.length - 1)].commis;
        kitchen.commis.slice(0, unlockedCommis)
          .filter(c => c.status === "actif")
          .forEach(c => {
            const mw = c.salary ?? 0;
            if (mw <= 0) return;
            total += mw;
            const key = c.name.split(" ")[0];
            perPerson[key] = (perPerson[key] ?? 0) + mw;
          });
      }

      if (total > 0) onAccrue(total, perPerson);
    }, 60_000); // 1 heure de jeu = 60 s réelles

    return () => clearInterval(iv);
  }, [serversRef, kitchenRef, onAccrue, pausedRef]);
};
