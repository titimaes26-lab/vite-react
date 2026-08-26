/* ═══════════════════════════════════════════════════════
   src/hooks/useAutoPrime.js
   Auto-prime d'excellence — vérifie toutes les 4 heures de jeu
   (240 s réelles) si le moral est sous le seuil configuré et
   déclenche la prime automatiquement si le solde le permet.
═══════════════════════════════════════════════════════ */

import { useEffect } from "react";

/**
 * @param {{
 *   autoPrimeBrigade  : { enabled: boolean, threshold: number },
 *   autoPrimeServeurs : { enabled: boolean, threshold: number },
 *   kitchenRef  : React.RefObject,
 *   serversRef  : React.RefObject,
 *   cashRef     : React.RefObject,
 *   pausedRef   : React.RefObject,
 *   setCash     : Function,
 *   addTx       : Function,
 *   addToast    : Function,
 *   setKitchen  : Function,
 *   setServers  : Function,
 * }} params
 */
export const useAutoPrime = ({
  autoPrimeBrigade,
  autoPrimeServeurs,
  kitchenRef,
  serversRef,
  cashRef,
  pausedRef,
  setCash,
  addTx,
  addToast,
  setKitchen,
  setServers,
}) => {
  useEffect(() => {
    const iv = setInterval(() => {
      if (pausedRef?.current) return;

      /* ── Brigade ── */
      if (autoPrimeBrigade?.enabled) {
        const morale = kitchenRef.current?.morale ?? 100;
        const cash   = cashRef.current ?? 0;
        const seuil  = autoPrimeBrigade.threshold ?? 60;
        if (morale < seuil && cash >= 150) {
          setCash(c => +(c - 150).toFixed(2));
          addTx("dépense", "Prime brigade (auto)", 150);
          setKitchen(k => ({ ...k, morale: Math.min(100, (k.morale ?? 100) + 30) }));
          addToast({ icon: "🤖", title: "Prime brigade auto", msg: "Moral +30 · −150€", color: "#236b47", tab: "servers", silent: true });
        }
      }

      /* ── Serveurs ── */
      if (autoPrimeServeurs?.enabled) {
        const servers = serversRef.current ?? [];
        const seuil   = autoPrimeServeurs.threshold ?? 60;
        servers
          .filter(s => s.status === "actif" && (s.moral ?? 100) < seuil)
          .forEach(sv => {
            if ((cashRef.current ?? 0) < 50) return;
            setCash(c => +(c - 50).toFixed(2));
            addTx("achat", `Prime motivation auto — ${sv.name}`, 50);
            setServers(p => p.map(x => x.id !== sv.id ? x : { ...x, moral: Math.min(100, x.moral + 50) }));
            addToast({ icon: "🤖", title: `Prime auto — ${sv.name}`, msg: "Moral +50 · −50€", color: "#2563eb", tab: "servers", silent: true });
          });
      }
    }, 240_000); // 4 heures de jeu = 240 s réelles

    return () => clearInterval(iv);
  }, [autoPrimeBrigade, autoPrimeServeurs]); // eslint-disable-line react-hooks/exhaustive-deps
};
