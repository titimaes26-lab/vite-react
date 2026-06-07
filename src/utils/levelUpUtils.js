import { RESTO_LVL, SERVER_SLOTS_BY_LEVEL } from "../constants/gameData.js";

export const ERA_LABELS = [
  "Établissements locaux",
  "Reconnaissance régionale",
  "Gastronomie étoilée",
  "Prestige international",
  "Légende culinaire",
];

export const computeUnlocks = (levelData) => {
  const l = levelData.l;
  const prev = RESTO_LVL[Math.max(0, l - 1)];
  const cur  = levelData;
  const items = [];

  const isMax = l >= RESTO_LVL.length - 1;
  const era   = Math.floor(l / 10);

  if (l > 0 && l % 10 === 0) {
    items.push({ icon: "🌟", text: `Nouvelle ère : ${ERA_LABELS[era] ?? "Légende"}` });
  }

  if (cur.tables > prev.tables) {
    const diff = cur.tables - prev.tables;
    const suffix = isMax ? " (maximum)" : ` (+${diff})`;
    items.push({ icon: "🪑", text: `${cur.tables} tables disponibles${suffix}` });
  }

  const prevSlots = SERVER_SLOTS_BY_LEVEL[Math.max(0, l - 1)] ?? 2;
  const curSlots  = SERVER_SLOTS_BY_LEVEL[l] ?? 2;
  if (curSlots > prevSlots) {
    const suffix = isMax ? " (maximum)" : ` (+${curSlots - prevSlots})`;
    items.push({ icon: "👥", text: `${curSlots} slots serveurs${suffix}` });
  }

  if (l === 2)  items.push({ icon: "⚡", text: "Spécialités serveurs débloquées" });
  if (l === 2)  items.push({ icon: "🎓", text: "Formations disponibles" });
  if (l === 5)  items.push({ icon: "🧑‍🍳", text: "2ème commis cuisine débloqué" });
  if (l === 10) items.push({ icon: "🧑‍🍳", text: "3ème commis cuisine débloqué" });
  if (l === 20) items.push({ icon: "🍷", text: "Clients VIP plus fréquents" });
  if (l === 30) items.push({ icon: "🏅", text: "Événements exclusifs débloqués" });
  if (l === 40) items.push({ icon: "🌐", text: "Réputation internationale" });
  if (isMax)    items.push({ icon: "🏆", text: "Niveau maximum atteint !" });

  if (items.length === 0) {
    items.push({ icon: "📈", text: "Réputation et attractivité améliorées" });
  }

  return items;
};
