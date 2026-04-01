/* ═══════════════════════════════════════════════════════
   src/hooks/useExpiry.js
   Polling 500ms — gère 4 responsabilités de fin de cycle :

   1. Expiration file d'attente → déplace vers waitlist (rappelable 2 min)
   2. Waitlist → perd définitivement les groupes non rappelés
   3. Fin de nettoyage → libère les tables (status → "libre")
   4. Fin de service → libère les serveurs (status → "actif")

   Usage dans App.jsx :
     useExpiry({ setQueue, setWaitlist, setTables, setServers, addToast, addDayStat });
═══════════════════════════════════════════════════════ */

import { useEffect } from "react";

/**
 * @param {{
 *   setQueue    : Function,
 *   setWaitlist : Function,
 *   setTables   : Function,
 *   setServers  : Function,
 *   addToast    : Function,
 *   addDayStat  : Function,
 * }} params
 */
export const useExpiry = ({
  setQueue,
  setWaitlist,
  setTables,
  setServers,
  addToast,
  addDayStat,
}) => {
  useEffect(() => {
    const iv = setInterval(() => {
      const t = Date.now();

      /* ── 1. File d'attente expirée → waitlist ─────── */
      let expired = [];

      setQueue(q => {
        expired = q.filter(c => t >= c.expiresAt);
        return expired.length > 0 ? q.filter(c => t < c.expiresAt) : q;
      });

      // Effets de bord hors setter (toasts + waitlist)
      if (expired.length > 0) {
        setWaitlist(w => [
          ...w,
          ...expired.map(c => ({ ...c, leftAt: t, recallUntil: t + 120_000 })),
        ]);
        expired.forEach(c =>
          addToast({
            icon  : "😤",
            title : "Groupe parti !",
            msg   : `${c.name} n'a plus patience — rappelable 2 min`,
            color : "#c4622d",
            tab   : "tables",
          })
        );
      }

      /* ── 2. Waitlist : groupes non rappelés → perdus ─ */
      let reallyLost = [];

      setWaitlist(w => {
        reallyLost = w.filter(c => t >= c.recallUntil);
        return reallyLost.length > 0 ? w.filter(c => t < c.recallUntil) : w;
      });

      reallyLost.forEach(() => addDayStat("lost"));

      /* ── 3. Fin de nettoyage → tables libres ─────────  */
      setTables(prev => {
        const done = prev.filter(
          tb => tb.status === "nettoyage" && tb.cleanUntil && t >= tb.cleanUntil
        );
        if (!done.length) return prev;

        done.forEach(tb =>
          addToast({
            icon  : "✨",
            title : "Table prête",
            msg   : `${tb.name} est de nouveau disponible.`,
            color : "#2a5c3f",
            tab   : "tables",
          })
        );

        return prev.map(tb =>
          done.find(d => d.id === tb.id)
            ? { ...tb, status: "libre", server: null, cleanUntil: null, cleanDur: null, freedAt: t }
            : tb
        );
      });

      /* ── 4. Fin de service / nettoyage → serveurs actifs ──────── */
      setServers(prev =>
        prev.map(s => {
          if (s.status === "service" && s.serviceUntil && t >= s.serviceUntil)
            return { ...s, status: "actif", serviceUntil: null };
          if (s.status === "nettoyage" && s.cleanUntil && t >= s.cleanUntil)
            return { ...s, status: "actif", cleanUntil: null };
          return s;
        })
      );
    }, 500);

    return () => clearInterval(iv);
  }, [setQueue, setWaitlist, setTables, setServers, addToast, addDayStat]);
};
