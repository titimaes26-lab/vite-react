/* ═══════════════════════════════════════════════════════
   src/hooks/useFreshness.js
   Tick toutes les 60s — décrémente la fraîcheur de chaque
   LOT de stock selon sa catégorie. Gère la péremption par lot.

   Fraîcheur (0–100%) :
     > 60% → Frais       (normal)
     20–60% → À utiliser (warning)
     < 20% → Presque périmé (malus note −0.5)
     0%    → Lot périmé : supprimé, qty totale recalculée

   Taux de base (%/min) définis dans FRESHNESS_DECAY.
   La chambre froide (kitchen.upgrades.stockage) réduit le
   taux : niv 1 → ×0.5, niv 2 → ×0.25.
═══════════════════════════════════════════════════════ */

import { useEffect } from "react";
import { FRESHNESS_DECAY } from "../constants/gameData.js";
import { getLots } from "../utils/orderUtils.js";
import { useLang } from "../i18n/index.jsx";

export const useFreshness = ({
  stockRef,
  kitchenRef,
  setStock,
  setComplaints,
  addToast,
}) => {
  const { t } = useLang();
  useEffect(() => {
    const iv = setInterval(() => {
      const current = stockRef.current;
      if (!current) return;

      const storageLv = kitchenRef?.current?.upgrades?.stockage || 0;
      const decayMult = storageLv >= 2 ? 0.25 : storageLv >= 1 ? 0.5 : 1.0;

      const newlySpoiled = [];

      setStock(prev => prev.map(item => {
        if (item.qty <= 0) return item;
        const decay = (FRESHNESS_DECAY[item.cat] ?? 0.033) * decayMult;
        const lots = getLots(item);

        const newLots = lots.map(lot => {
          if (lot.qty <= 0) return null;
          const newF = +(Math.max(0, lot.freshness - decay)).toFixed(2);
          if (newF <= 0 && lot.freshness > 0) {
            newlySpoiled.push({ ...item, spoiledQty: lot.qty });
            return null; // lot supprimé
          }
          return { ...lot, freshness: newF };
        }).filter(Boolean);

        const totalQty = +newLots.reduce((s, l) => s + l.qty, 0).toFixed(3);
        const freshness = newLots[0]?.freshness ?? 0;
        return { ...item, lots: newLots, qty: totalQty, freshness };
      }));

      newlySpoiled.forEach(item => {
        addToast({
          icon:  "🗑",
          title: t("toast.spoiled"),
          msg:   t("toast.spoiledMsg", { name: item.name }),
          color: "#c0392b",
          tab:   "stock",
          silent: true,
        });
        setComplaints(p => [{
          id:     Date.now() + Math.random(),
          date:   new Date().toLocaleDateString("fr-FR"),
          table:  "-",
          server: "-",
          type:   "Hygiène",
          desc:   t("toast.spoiledDesc", { name: item.name }),
          status: "nouveau",
          prio:   "haute",
        }, ...p]);
      });
    }, 60_000);

    return () => clearInterval(iv);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setStock, setComplaints, addToast, t]);
};
