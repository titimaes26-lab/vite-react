/* ═══════════════════════════════════════════════════════
   src/hooks/useSpawner.js
   Spawne un groupe de clients toutes les ~30s (modulé par
   la réputation du restaurant).

   Utilise un ref-based polling (2ms) pour éviter la dérive
   des setInterval sur les re-renders React.

   Dépend de :
     - randomUtils : rMood, rName, rSize
     - reputation  : pilote spawnMult via getRepTier

   Usage dans App.jsx :
     useSpawner({ setQueue, tablesRef, repRef, getRepTier });
═══════════════════════════════════════════════════════ */

import { useEffect, useRef } from "react";
import { rMood, rName, rSize } from "../utils/randomUtils";

/**
 * @param {{
 *   setQueue      : Function,
 *   tablesRef     : React.MutableRefObject<Array>,
 *   repRef        : React.MutableRefObject<number>,
 *   getRepTier    : (rep: number) => { spawnMult: number },
 * }} params
 */
export const useSpawner = ({ setQueue, tablesRef, repRef, getRepTier }) => {
  const lastSpawnRef = useRef(Date.now());

  useEffect(() => {
    const iv = setInterval(() => {
      const now = Date.now();
      const tier     = getRepTier(repRef.current);
      // spawnMult > 1 = réputation haute = plus de clients
      const interval = Math.round(30_000 / (tier.spawnMult ?? 1));

      if (now - lastSpawnRef.current < interval) return;
      lastSpawnRef.current = now;

      // 65 % de chance qu'un groupe arrive
      if (Math.random() >= 0.65) return;

      const mood   = rMood();
      const livres = tablesRef.current.filter(t => t.status === "libre");
      const maxCap = livres.length > 0
        ? Math.max(...livres.map(t => t.capacity))
        : 2;
      const size   = Math.min(rSize(), maxCap);

      setQueue(q => [
        ...q,
        {
          id        : Date.now() + Math.random(),
          name      : rName(),
          size,
          mood,
          expiresAt : Date.now() + mood.p * 1000,
          patMax    : mood.p,
        },
      ]);
    }, 500); // polling toutes les 500ms, spawn toutes les ~30s

    return () => clearInterval(iv);
  // getRepTier est une fonction pure stable — pas besoin dans les deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setQueue]);
};
