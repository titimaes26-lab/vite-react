/* ═══════════════════════════════════════════════════════
   src/hooks/useDeliveries.js
   Polling 5s — vérifie si des livraisons fournisseur (mode
   "standard" / délai 2 min) sont arrivées et les ajoute au stock.

   Usage dans App.jsx :
     useDeliveries({ setPendingDeliveries, setStock, addToast });
═══════════════════════════════════════════════════════ */

import { useEffect } from "react";

/**
 * @param {{
 *   setPendingDeliveries : Function,
 *   setStock             : Function,
 *   addToast             : Function,
 * }} params
 */
export const useDeliveries = ({ setPendingDeliveries, setStock, addToast }) => {
  useEffect(() => {
    const iv = setInterval(() => {
      const now = Date.now();

      setPendingDeliveries(prev => {
        const arrived = prev.filter(d => now >= d.arrivedAt);
        if (!arrived.length) return prev;

        // Créditer le stock pour chaque livraison arrivée
        arrived.forEach(d => {
          setStock(s =>
            s.map(item => {
              const match = d.items.find(x => x.stockId === item.id);
              return match
                ? { ...item, qty: +(item.qty + match.qty).toFixed(3) }
                : item;
            })
          );
          addToast({
            icon  : "🚚",
            title : "Livraison arrivée !",
            msg   : d.labels,
            color : "#2a5c3f",
            tab   : "stock",
          });
        });

        return prev.filter(d => now < d.arrivedAt);
      });
    }, 5_000);

    return () => clearInterval(iv);
  }, [setPendingDeliveries, setStock, addToast]);
};
