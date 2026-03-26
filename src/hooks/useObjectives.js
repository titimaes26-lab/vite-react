/* ═══════════════════════════════════════════════════════
   src/hooks/useObjectives.js
   Vérifie les objectifs dès que objStats change.
   Déplace les objectifs nouvellement atteints vers pendingClaim
   et envoie un toast par objectif débloqué.

   Usage dans App.jsx :
     useObjectives({ objStats, completedIds, pendingClaim,
                     setPendingClaim, addToast });
═══════════════════════════════════════════════════════ */

import { useEffect } from "react";
import { OBJECTIVES_DEF } from "../constants/gameData.js";

/**
 * @param {{
 *   objStats      : object,
 *   completedIds  : string[],
 *   pendingClaim  : string[],
 *   setPendingClaim : Function,
 *   addToast      : Function,
 * }} params
 */
export const useObjectives = ({
  objStats,
  completedIds,
  pendingClaim,
  setPendingClaim,
  addToast,
}) => {
  useEffect(() => {
    const newPending = OBJECTIVES_DEF
      .filter(o =>
        !completedIds.includes(o.id) &&
        !pendingClaim.includes(o.id) &&
        o.condition(objStats)
      )
      .map(o => o.id);

    if (newPending.length === 0) return;

    setPendingClaim(p => [...p, ...newPending]);

    newPending.forEach(id => {
      const obj = OBJECTIVES_DEF.find(o => o.id === id);
      if (obj)
        addToast({
          icon  : "🎯",
          title : "Objectif atteint !",
          msg   : obj.title,
          color : "#b87d10",
          tab   : "objectives",
        });
    });
  // pendingClaim est en dépendance pour éviter les doublons
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objStats]);
};
