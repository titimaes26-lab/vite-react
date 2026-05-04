export const MAX_PRESTIGE = 10;

const NAMES  = ["Étoilé","Double Étoile","Triple Étoile","Illustre","Renommé","Célèbre","Légendaire","Mythique","Immortel","Divin"];
const ICONS  = ["⭐","🌟","✨","💎","🏆","👑","🔥","⚡","🌈","🎖"];
const COLORS = ["#f0c040","#e8a820","#ff8c00","#40c8e0","#a060d0","#e050a0","#ff6060","#40d080","#40b8ff","#e0d8ff"];

export const PRESTIGE_ICONS = ICONS;

export function getPrestigeTier(p) {
  const i = Math.min(Math.max(p - 1, 0), NAMES.length - 1);
  return {
    p,
    name:         p > 0 ? NAMES[i]  : "",
    icon:         p > 0 ? ICONS[i]  : "✦",
    color:        p > 0 ? COLORS[i] : "#888888",
    xpMultiplier: 1 + p * 0.10,
    cashReward:   5000 * p,
  };
}
