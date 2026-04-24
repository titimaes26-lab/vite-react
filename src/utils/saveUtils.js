/* ═══════════════════════════════════════════════════════
   src/utils/saveUtils.js
   Sauvegarde localStorage + pont GDevelop (postMessage)
═══════════════════════════════════════════════════════ */
import { restoLv, chefLv, srvLv } from "./levelUtils";
import { RESTO_LVL, CHEF_LVL } from "../constants/gameData";

export const SAVE_KEY = "resto_save_v1";

const saveToLocalStorage = (state) => {
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

export const saveGame = (state) => {
  saveToLocalStorage(state);
  // Backup vers GDevelop pour les environnements où localStorage ne persiste pas
  sendToGDevelop({ type: "SAVE", save: { ...state, savedAt: Date.now() } });
};

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

// Nettoie les états liés aux timers qui ne sont plus valides après un rechargement
export const sanitizeSave = (save) => {
  const now = Date.now();
  const tables = (save.tables || []).map((t) => {
    if (t.status === "nettoyage") {
      if (!t.cleanUntil || now >= t.cleanUntil)
        return { ...t, status: "libre", server: null, cleanUntil: null, cleanDur: null, freedAt: now };
      return t;
    }
    if (t.status === "mange")   return { ...t, eatUntil: null, eatDur: null };
    if (t.status === "occupée") return { ...t, svcUntil: null };
    return t;
  });
  const servers = (save.servers || []).map((s) =>
    s.status === "service" ? { ...s, status: "actif", serviceUntil: null } : s
  );
  const kitchen = save.kitchen
    ? {
        morale: 100,
        chefTrainings: {},
        ...save.kitchen,
        queue: [
          ...(save.kitchen.queue || []),
          ...(save.kitchen.cooking || []).map((d) => ({
            ...d, startedAt: undefined, timerMax: undefined,
          })),
        ],
        cooking: [],
        done: save.kitchen.done || [],
        commis: (save.kitchen.commis || []).map(c => ({
          specialty: null,
          ...c,
        })),
      }
    : null;
  return { ...save, tables, servers, kitchen, queue: [] };
};

/* ─── Pont GDevelop (iframe postMessage) ─────────────── */
export const sendToGDevelop = (payload) => {
  try {
    window.parent.postMessage({ source: "react-ui", payload }, "*");
  } catch (e) {
    console.warn("[GDevelop Bridge] postMessage échoué :", e);
  }
};

export const buildGDevelopPayload = ({
  cash, restoXp, stock, queue, tables, kitchen, objStats, servers, dailyStats,
}) => {
  const rl = restoLv(restoXp);
  const cl = chefLv(kitchen?.chef?.totalXp || 0);
  return {
    argent: cash,
    niveaux: {
      restaurant: {
        niveau:     rl.l,
        nom:        RESTO_LVL[rl.l]?.name || "",
        xp:         restoXp,
        xpProchain: rl.next?.xpNeeded || 0,
        pct:        rl.pct,
      },
      chef: {
        niveau:  cl.l,
        nom:     CHEF_LVL[Math.min(cl.l, CHEF_LVL.length - 1)]?.name || "",
        xp:      kitchen?.chef?.totalXp || 0,
        vitesse: CHEF_LVL[Math.min(cl.l, CHEF_LVL.length - 1)]?.speed || 1,
      },
      serveurs: (servers || []).map((s) => {
        const sl = srvLv(s.totalXp);
        return { id: s.id, nom: s.name, niveau: sl.l, xp: s.totalXp, statut: s.status, salaire: s.salary };
      }),
    },
    inventaire: (stock || []).map((s) => ({
      id: s.id, nom: s.name, quantite: s.qty, unite: s.unit,
      alerte: s.qty <= s.alert, prix: s.price, categorie: s.cat,
    })),
    clients: {
      enAttente:       (queue || []).length,
      tablesOccupees:  (tables || []).filter((t) => t.status === "occupée" || t.status === "mange").length,
      tablesLibres:    (tables || []).filter((t) => t.status === "libre").length,
      totalServis:     objStats?.totalServed   || 0,
      totalPerdus:     (dailyStats || []).reduce((s, d) => s + (d.lost || 0), 0),
      chiffreAffaires: objStats?.totalRevenue  || 0,
    },
    timers: (kitchen?.cooking || []).map((d) => ({
      id:       String(d.id),
      finishAt: d.startedAt + d.timerMax * 1000,
      label:    d.name + (d.tableName ? " · " + d.tableName : ""),
      tableId:  d.tableId || null,
      cat:      d.cat || "",
    })),
    savedAt: Date.now(),
  };
};
