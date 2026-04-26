/* ═══════════════════════════════════════════════════════
   src/services/adBridge.js
   Pont React → GDevelop pour le déclenchement des publicités AdMob.
   Séparé de gdevelopBridge.js (état du jeu) — responsabilité unique.
═══════════════════════════════════════════════════════ */

const TRUSTED_ORIGINS = [
  "https://ton-jeu.gdevelop.io",
  "capacitor://localhost",
  "http://localhost",
];

const postToParent = (type, payload = {}) => {
  if (window === window.parent) return;
  try {
    TRUSTED_ORIGINS.forEach(origin => {
      window.parent.postMessage({ source: "react-app", type, ...payload }, origin);
    });
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
      if (!TRUSTED_ORIGINS.includes(event.origin)) return;
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
