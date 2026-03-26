/* ═══════════════════════════════════════════════════════
   src/hooks/useChallenges.js
   Polling 2s — deux responsabilités :

   1. Détection "Salle comble" : si 5+ tables sont occupées
      simultanément → marque le défi fullHouse comme atteint.

   2. Rotation quotidienne : si la date a changé depuis le
      dernier chargement → régénère les 3 défis du jour et
      remet les compteurs à zéro.

   Usage dans App.jsx :
     useChallenges({
       tables, setChallengeProgress, setChallengeDate,
       setTodayChallenges, setChallengeLostToday, setChallengeClaimed,
       pickDailyChallenges,
     });
═══════════════════════════════════════════════════════ */

import { useEffect } from "react";
import { CHALLENGES_POOL } from "../constants/gameData.js";
import { pickSeeded } from "../utils/randomUtils.js";

/**
 * @param {{
 *   tables                : Array,
 *   setChallengeProgress  : Function,
 *   setChallengeDate      : Function,
 *   setTodayChallenges    : Function,
 *   setChallengeLostToday : Function,
 *   setChallengeClaimed   : Function,
 * }} params
 */
export const useChallenges = ({
  tables,
  setChallengeProgress,
  setChallengeDate,
  setTodayChallenges,
  setChallengeLostToday,
  setChallengeClaimed,
}) => {
  useEffect(() => {
    const iv = setInterval(() => {

      /* ── 1. Salle comble ──────────────────────────── */
      const occupied = tables.filter(
        t => t.status === "occupée" || t.status === "mange"
      ).length;

      if (occupied >= 5) {
        setChallengeProgress(p =>
          p.fullHouse >= 1 ? p : { ...p, fullHouse: 1 }
        );
      }

      /* ── 2. Rotation quotidienne ──────────────────── */
      const today = new Date().toLocaleDateString("fr-FR");

      setChallengeDate(prev => {
        if (prev === today) return prev;

        // Nouvelle journée — réinitialiser défis + compteurs
        setTodayChallenges(pickSeeded(CHALLENGES_POOL, 3, today));
        setChallengeProgress({
          served: 0, revenue: 0, noLoss: 1,
          highRating: 0, fastPlace: 0, vip: 0, fullHouse: 0, tips: 0,
        });
        setChallengeLostToday(false);
        setChallengeClaimed({});

        return today;
      });
    }, 2_000);

    return () => clearInterval(iv);
  // tables change souvent mais le hook ne doit pas recréer l'interval
  // On passe tables directement car c'est une dépendance de lecture légère
  }, [
    tables,
    setChallengeProgress,
    setChallengeDate,
    setTodayChallenges,
    setChallengeLostToday,
    setChallengeClaimed,
  ]);
};
