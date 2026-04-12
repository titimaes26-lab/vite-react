/* ═══════════════════════════════════════════════════════
   src/hooks/useSalary.js
   Débit toutes les heures de jeu (60 s réelles) de :
     - Salaires des serveurs actifs
     - Salaire du chef + commis débloqués

   Le remboursement du prêt bancaire est géré séparément
   dans restaurant-manager.jsx (déduction quotidienne).

   Lit l'état depuis des refs (lecture synchrone) pour éviter
   le piège React : accumuler dans `total` à l'intérieur de
   setters différés revient à lire total=0 au moment du `if`.

   Usage dans restaurant-manager.jsx :
     useSalary({ serversRef, kitchenRef, setCash, addTx, addToast });
═══════════════════════════════════════════════════════ */

import { useEffect } from "react";
import { CHEF_LVL, CHEF_XP_CAP } from "../constants/gameData";

/** Recalcule le niveau chef depuis l'XP */
const _chefLv = (xp) => {
  let l = 0, r = xp;
  while (l < CHEF_XP_CAP.length && r >= CHEF_XP_CAP[l]) { r -= CHEF_XP_CAP[l]; l++; }
  return l;
};

/**
 * @param {{
 *   serversRef  : React.RefObject,
 *   kitchenRef  : React.RefObject,
 *   setCash     : Function,
 *   addTx       : Function,
 *   addToast    : Function,
 * }} params
 */
export const useSalary = ({
  serversRef,
  kitchenRef,
  setCash,
  addTx,
  addToast,
}) => {
  useEffect(() => {
    const iv = setInterval(() => {
      /* ── Collecte synchrone depuis les refs ───────────── */
      let total = 0;
      const lines = [];

      // Serveurs actifs
      const servers = serversRef.current ?? [];
      servers.filter(s => s.status === "actif").forEach(s => {
        total += s.salary ?? 0;
        lines.push(`${s.name.split(" ")[0]} ${(s.salary ?? 0).toFixed(0)}€`);
      });

      // Chef + commis débloqués
      const kitchen = kitchenRef.current;
      if (kitchen) {
        const chefWage = kitchen.chef.salary ?? 0;
        total += chefWage;
        lines.push(`${kitchen.chef.name.split(" ")[0]} ${chefWage.toFixed(0)}€`);

        const lvIdx = _chefLv(kitchen.chef.totalXp);
        const unlockedCommis = CHEF_LVL[Math.min(lvIdx, CHEF_LVL.length - 1)].commis;

        kitchen.commis.slice(0, unlockedCommis)
          .filter(c => c.status === "actif")
          .forEach(c => {
            total += c.salary ?? 0;
            lines.push(`${c.name.split(" ")[0]} ${(c.salary ?? 0).toFixed(0)}€`);
          });
      }

      if (total > 0) {
        setCash(c => +Math.max(0, c - total).toFixed(2));
        addTx("salaire", `Salaires (${lines.join(", ")})`, total);
        addToast({
          icon  : "💸",
          title : `Salaires — ${total.toFixed(0)} €`,
          msg   : lines.join(" · "),
          color : "#1c3352",
          tab   : "stats",
        });
      }
    }, 60_000); // 1 heure de jeu = 60 s réelles

    return () => clearInterval(iv);
  }, [serversRef, kitchenRef, setCash, addTx, addToast]);
};
