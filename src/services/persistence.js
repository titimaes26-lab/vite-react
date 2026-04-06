/* ═══════════════════════════════════════════════════════
   src/services/persistence.js
   Sauvegarde et chargement via localStorage.
═══════════════════════════════════════════════════════ */

export const SAVE_KEY = "resto_save_v1";

export const saveToLocalStorage = (state) => {
  if (!window.localStorage) {
    console.error("LocalStorage non supporté sur ce navigateur");
    return;
  }
  try {
    const payload = JSON.stringify({ ...state, savedAt: Date.now() });
    window.localStorage.setItem(SAVE_KEY, payload);
  } catch (error) {
    if (error.name === "QuotaExceededError") {
      alert("Espace de stockage saturé sur la tablette !");
    } else {
      console.warn("Erreur de sauvegarde :", error);
    }
  }
};

export const saveGame = (state) => saveToLocalStorage(state);

export const loadGame = async () => {
  try {
    if (!window.localStorage) return null;
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
};
