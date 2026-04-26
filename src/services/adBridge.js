/* ═══════════════════════════════════════════════════════
   src/services/adBridge.js
   Pont React → GDevelop pour le déclenchement des publicités AdMob.
   Séparé de gdevelopBridge.js (état du jeu) — responsabilité unique.
═══════════════════════════════════════════════════════ */

const postToParent = (type, payload = {}) => {
  try {
    // Envoie au parent (iframe) ET à la fenêtre courante (même contexte GDevelop)
    window.parent.postMessage({ source: "react-app", type, ...payload }, "*");
    if (window.parent === window) {
      // Même fenêtre : postMessage s'envoie à soi-même, GDevelop l'intercepte via son listener
    }
  } catch (err) {
    console.error("[Bridge] Impossible d'envoyer le message :", err.message);
  }
};

/**
 * Déclenche une publicité AdMob via GDevelop.
 * @param {"interstitial"|"rewarded"} adType - type de pub
 * @param {{ onRewarded?: (data: object) => void }} options
 */
export const triggerAd = (adType, { onRewarded } = {}) => {
  if (!["interstitial", "rewarded"].includes(adType)) return;
  postToParent("AD_REQUEST", { adType });
  if (adType === "rewarded" && typeof onRewarded === "function") {
    const handler = (event) => {
      if (event.data?.type === "AD_REWARDED") {
        onRewarded(event.data);
        window.removeEventListener("message", handler);
      }
    };
    window.addEventListener("message", handler);
  }
};

/**
 * Notifie GDevelop d'un événement applicatif (achat, niveau, etc.).
 * @param {string} event - nom de l'événement
 * @param {object} data  - données associées
 */
export const notifyGame = (event, data = {}) => {
  postToParent(event, data);
};
