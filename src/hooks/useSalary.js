/* ═══════════════════════════════════════════════════════
   src/hooks/useSalary.js
   Débit toutes les heures (temps réel) de :
     - Salaires des serveurs actifs
     - Salaire du chef + commis débloqués
     - Mensualité du prêt bancaire en cours

   Si la caisse est insuffisante pour rembourser le prêt,
   le remboursement est différé (pas de solde négatif).

   Usage dans App.jsx :
     useSalary({ setServers, setKitchen, setCash, setLoan, addTx, addToast });
═══════════════════════════════════════════════════════ */

import { useEffect } from "react";
import { CHEF_LVL, CHEF_XP_CAP } from "../constants/gameData";

/** Recalcule le niveau chef depuis l'XP (dupliqué ici pour éviter l'import circulaire) */
const _chefLv = (xp) => {
  let l = 0, r = xp;
  while (l < CHEF_XP_CAP.length && r >= CHEF_XP_CAP[l]) { r -= CHEF_XP_CAP[l]; l++; }
  return l;
};

/**
 * @param {{
 *   setServers  : Function,
 *   setKitchen  : Function,
 *   setCash     : Function,
 *   setLoan     : Function,
 *   addTx       : Function,
 *   addToast    : Function,
 * }} params
 */
export const useSalary = ({
  setServers,
  setKitchen,
  setCash,
  setLoan,
  addTx,
  addToast,
}) => {
  useEffect(() => {
    const iv = setInterval(() => {
      /* ── Collecte des salaires ─────────────────────── */
      let total = 0;
      const lines = [];

      // Serveurs actifs uniquement
      setServers(sv => {
        sv.filter(s => s.status === "actif").forEach(s => {
          total += s.salary ?? 0;
          lines.push(`${s.name.split(" ")[0]} ${(s.salary ?? 0).toFixed(0)}€`);
        });
        return sv; // pas de modification — lecture seule
      });

      // Chef + commis débloqués
      setKitchen(k => {
        const chefWage = k.chef.salary ?? 0;
        total += chefWage;
        lines.push(`${k.chef.name.split(" ")[0]} ${chefWage.toFixed(0)}€`);

        const lvIdx = _chefLv(k.chef.totalXp);
        const unlockedCommis = CHEF_LVL[Math.min(lvIdx, CHEF_LVL.length - 1)].commis;

        k.commis.slice(0, unlockedCommis)
          .filter(c => c.status === "actif")
          .forEach(c => {
            total += c.salary ?? 0;
            lines.push(`${c.name.split(" ")[0]} ${(c.salary ?? 0).toFixed(0)}€`);
          });

        return k; // lecture seule
      });

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

      /* ── Remboursement de prêt ─────────────────────── */
      setLoan(ln => {
        if (!ln) return ln;

        const repay       = Math.min(ln.remaining, ln.repayPerHour);
        const newRemaining = +(ln.remaining - repay).toFixed(2);

        setCash(c => +Math.max(0, c - repay).toFixed(2));
        addTx("remboursement", `Remboursement prêt (${ln.id}) — mensualité`, repay);

        if (newRemaining <= 0) {
          addToast({
            icon  : "🎉",
            title : "Prêt remboursé !",
            msg   : "Votre emprunt est entièrement soldé.",
            color : "#2a5c3f",
            tab   : "stats",
          });
          return null;
        }

        return { ...ln, remaining: newRemaining };
      });
    }, 3_600_000); // toutes les heures réelles

    return () => clearInterval(iv);
  }, [setServers, setKitchen, setCash, setLoan, addTx, addToast]);
};
