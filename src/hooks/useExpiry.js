/* ═══════════════════════════════════════════════════════
   src/hooks/useExpiry.js
   Polling 500ms — gère 4 responsabilités de fin de cycle :

   1. Expiration file d'attente → déplace vers waitlist (rappelable 2 min)
   2. Waitlist → perd définitivement les groupes non rappelés
   3. Fin de nettoyage → libère les tables (status → "libre")
   4. Fin de service → libère les serveurs (status → "actif")

   Lit l'état depuis des refs (lecture synchrone) pour éviter
   le piège React 18 : les effets de bord exécutés à l'intérieur
   des updaters setState (ex: updateReputation, addToast) ne
   s'exécutent pas de manière synchrone, le setter étant différé.

   Usage dans restaurant-manager.jsx :
     useExpiry({ queueRef, waitlistRef, tablesRef,
                 setQueue, setWaitlist, setTables, setServers,
                 addToast, addDayStat, updateReputation, repDeltaLostClient });
═══════════════════════════════════════════════════════ */

import { useEffect } from "react";
import { useLang } from "../i18n/index.jsx";

export const useExpiry = ({
  queueRef,
  waitlistRef,
  tablesRef,
  setQueue,
  setWaitlist,
  setTables,
  setServers,
  addToast,
  addDayStat,
  updateReputation,
  repDeltaLostClient,
  pausedRef,
}) => {
  const { t } = useLang();
  useEffect(() => {
    const iv = setInterval(() => {
      if (pausedRef?.current) return;
      const now = Date.now();

      /* ── 1. File d'attente expirée → waitlist ─────────── */
      const queue   = queueRef.current ?? [];
      const expired = queue.filter(c => now >= c.expiresAt);

      if (expired.length > 0) {
        setQueue(queue.filter(c => now < c.expiresAt));
        setWaitlist(w => [
          ...w,
          ...expired.map(c => ({ ...c, leftAt: now, recallUntil: now + 120_000 })),
        ]);
        expired.forEach(c => {
          addToast({
            icon  : "😤",
            title : t("toast.groupLeft", {name:c.name}),
            msg   : t("toast.groupLeftDetail", {rep:repDeltaLostClient}),
            color : "#c4622d",
            tab   : "tables",
          });
          if (updateReputation) updateReputation(repDeltaLostClient, "client impatient");
        });
      }

      /* ── 2. Waitlist : groupes non rappelés → perdus ───── */
      const waitlist   = waitlistRef.current ?? [];
      const reallyLost = waitlist.filter(c => now >= c.recallUntil);

      if (reallyLost.length > 0) {
        setWaitlist(waitlist.filter(c => now < c.recallUntil));
        reallyLost.forEach(() => addDayStat("lost"));
      }

      /* ── 3. Fin de nettoyage → tables libres ─────────── */
      const tables    = tablesRef.current ?? [];
      const doneTables = tables.filter(
        tb => tb.status === "nettoyage" && tb.cleanUntil && now >= tb.cleanUntil
      );

      if (doneTables.length > 0) {
        doneTables.forEach(tb =>
          addToast({
            icon  : "✨",
            title : t("toast.tableReady"),
            msg   : t("toast.tableReadyMsg", {name:tb.name}),
            color : "#2a5c3f",
            tab   : "tables",
          })
        );
        setTables(prev =>
          prev.map(tb =>
            doneTables.find(d => d.id === tb.id)
              ? { ...tb, status: "libre", server: null, cleanServer: null, cleanUntil: null, cleanDur: null, freedAt: now }
              : tb
          )
        );
      }

      /* ── 4. Fin de service / nettoyage → serveurs actifs ── */
      setServers(prev =>
        prev.map(s => {
          if (s.status === "service" && s.serviceUntil && now >= s.serviceUntil)
            return { ...s, status: "actif", serviceUntil: null };
          if (s.status === "nettoyage" && s.cleanUntil && now >= s.cleanUntil)
            return { ...s, status: "actif", cleanUntil: null };
          return s;
        })
      );
    }, 500);

    return () => clearInterval(iv);
  }, [queueRef, waitlistRef, tablesRef, setQueue, setWaitlist, setTables, setServers, addToast, addDayStat, updateReputation, repDeltaLostClient, t]);
};
