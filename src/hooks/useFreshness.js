/* ═══════════════════════════════════════════════════════
   src/hooks/useFreshness.js
   Tick toutes les 60s — décrémente la fraîcheur de chaque
   article de stock selon sa catégorie. Gère la péremption.

   Fraîcheur (0–100%) :
     > 60% → Frais       (normal)
     20–60% → À utiliser (warning)
     < 20% → Presque périmé (malus note −0.5)
     0%    → Périmé (qty −50%, plainte, toast)

   Taux de base (%/min) définis dans FRESHNESS_DECAY.
   La chambre froide (kitchen.upgrades.stockage) réduit le
   taux : niv 1 → ×0.5, niv 2 → ×0.25.

   Usage dans App.jsx :
     useFreshness({ stockRef, kitchenRef, setStock,
                    setComplaints, addToast });
═══════════════════════════════════════════════════════ */

import { useEffect } from "react";
import { FRESHNESS_DECAY } from "../constants/gameData.js";

export const useFreshness = ({
  stockRef,
  kitchenRef,
  setStock,
  setComplaints,
  addToast,
}) => {
  useEffect(() => {
    const iv = setInterval(() => {
      const current = stockRef.current;
      if (!current) return;

      const storageLv = kitchenRef?.current?.upgrades?.stockage || 0;
      const decayMult = storageLv >= 2 ? 0.25 : storageLv >= 1 ? 0.5 : 1.0;

      // Identifier les items qui vont passer à 0 ce tick
      const newlySpoiled = current.filter(item => {
        if (item.qty <= 0) return false;
        const decay = (FRESHNESS_DECAY[item.cat] ?? 0.033) * decayMult;
        const f = item.freshness ?? 100;
        return f > 0 && f - decay <= 0;
      });

      // Appliquer la dégradation
      setStock(prev => prev.map(item => {
        if (item.qty <= 0) return item;
        const decay = (FRESHNESS_DECAY[item.cat] ?? 0.033) * decayMult;
        const f = item.freshness ?? 100;
        const newF = +(Math.max(0, f - decay)).toFixed(2);
        if (newF <= 0 && f > 0) {
          // Péremption : qty divisée par 2
          return { ...item, freshness: 0, qty: +(item.qty * 0.5).toFixed(3) };
        }
        return { ...item, freshness: newF };
      }));

      // Effets de bord pour les items périmés
      newlySpoiled.forEach(item => {
        addToast({
          icon:  "🗑",
          title: "Aliment périmé !",
          msg:   `${item.name} — 50% du stock perdu`,
          color: "#c0392b",
          tab:   "stock",
        });
        setComplaints(p => [{
          id:     Date.now() + Math.random(),
          date:   new Date().toLocaleDateString("fr-FR"),
          table:  "-",
          server: "-",
          type:   "Hygiène",
          desc:   `${item.name} périmé — 50% des stocks perdus`,
          status: "nouveau",
          prio:   "haute",
        }, ...p]);
      });
    }, 60_000); // toutes les minutes

    return () => clearInterval(iv);
  // stockRef et kitchenRef sont des refs — stables, pas besoin dans deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setStock, setComplaints, addToast]);
};
