/* ═══════════════════════════════════════════════════════
   src/components/ui/theme.js
   Re-export centralisé — les composants UI importent
   toujours C et F depuis ici (pas directement gameData).
   Facilite un futur remplacement de thème sans toucher
   chaque composant.
═══════════════════════════════════════════════════════ */
export { useC } from "../../contexts/ThemeContext.jsx";
export { F } from "../../constants/gameData.js";
