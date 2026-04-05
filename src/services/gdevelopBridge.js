/* ═══════════════════════════════════════════════════════
   src/services/gdevelopBridge.js
   Pont de communication React ↔ GDevelop (postMessage).
═══════════════════════════════════════════════════════ */
import { RESTO_LVL, CHEF_LVL, TABLES0, STOCK0 } from "../constants/gameData.js";
import { restoLv, chefLv, srvLv, commisLv } from "../utils/levelUtils.js";

/** Envoie un message structuré au parent (GDevelop via iframe) */
export const sendToGDevelop = (payload) => {
  try {
    window.parent.postMessage({ source: "react-ui", payload }, "*");
  } catch (e) {
    console.warn("[GDevelop Bridge] postMessage échoué :", e);
  }
};

/** Construit le payload standardisé depuis les états React */
export const buildGDevelopPayload = ({
  cash, restoXp, stock, queue, waitlist, tables, kitchen, objStats, servers, dailyStats,
  reputation, transactions, loan, pendingDeliveries, menu, complaints, supplierMode,
  formulas, dailySpecials, challengeDate,
  completedIds, pendingClaim, todayChallenges, challengeProgress,
  challengeClaimed, challengeLostToday, activeEvent,
  candidatePool, candidateDate,
}) => {
  const rl = restoLv(restoXp);
  const cl = chefLv(kitchen?.chef?.totalXp || 0);
  return {
    argent: cash,
    niveaux: {
      restaurant: {
        niveau    : rl.l,
        nom       : RESTO_LVL[rl.l]?.name || "",
        xp        : restoXp,
        xpProchain: rl.next?.xpNeeded || 0,
        pct       : rl.pct,
      },
      chef: {
        niveau  : cl.l,
        nom     : CHEF_LVL[Math.min(cl.l, CHEF_LVL.length - 1)]?.name || "",
        prenom  : kitchen?.chef?.name || "",
        xp      : kitchen?.chef?.totalXp || 0,
        vitesse : CHEF_LVL[Math.min(cl.l, CHEF_LVL.length - 1)]?.speed || 1,
        salaire : kitchen?.chef?.salary || 0,
      },
      serveurs: (servers || []).map(s => {
        const sl = srvLv(s.totalXp);
        return {
          id           : s.id,
          nom          : s.name,
          niveau       : sl.l,
          xp           : s.totalXp,
          statut       : s.status,
          salaire      : s.salary,
          moral        : s.moral ?? 100,
          note         : s.rating ?? 0,
          specialite   : s.specialty ? { id: s.specialty.id, nom: s.specialty.name } : null,
          serviceJusqua: s.serviceUntil || null,
          nettoyageJusqua: s.cleanUntil || null,
        };
      }),
      commis: (kitchen?.commis || []).map(c => {
        const cLv = commisLv(c.totalXp);
        return { id: c.id, nom: c.name, niveau: cLv.l, xp: c.totalXp, statut: c.status, salaire: c.salary };
      }),
    },
    inventaire: (stock || []).map(s => ({
      id: s.id, nom: s.name, quantite: s.qty, unite: s.unit,
      alerte: s.qty <= s.alert, prix: s.price, categorie: s.cat,
    })),
    menu: (menu || []).map(m => ({
      id: m.id, nom: m.name, prix: m.price, categorie: m.cat,
      actif: m.active !== false, special: m.isSpecial || false,
    })),
    formules: (formulas || []).map(f => ({
      id: f.id, nom: f.name, actif: f.active, remise: f.discount,
    })),
    platsSpeciaux: (dailySpecials || []).map(s => ({
      id: s.id, nom: s.name, prix: s.price, categorie: s.cat,
    })),
    clients: {
      enAttente      : (queue || []).length,
      enRappel       : (waitlist || []).length,
      tablesOccupees : (tables || []).filter(t => t.status === "occupée" || t.status === "mange").length,
      tablesLibres   : (tables || []).filter(t => t.status === "libre").length,
      tablesNettoyage: (tables || []).filter(t => t.status === "nettoyage").length,
      totalServis    : objStats?.totalServed    || 0,
      totalPerdus    : (dailyStats || []).reduce((s, d) => s + (d.lost || 0), 0),
      chiffreAffaires: objStats?.totalRevenue   || 0,
    },
    tables: (tables || []).map(t => ({
      id      : t.id,
      nom     : t.name,
      statut  : t.status,
      capacite: t.capacity,
      serveur : t.server || null,
      groupe  : t.group ? { taille: t.group.size, nom: t.group.name, humeur: t.group.mood?.l, vip: t.group.isVIP || false } : null,
      commande: (t.order || []).length,
      nettoyageJusqua: t.cleanUntil || null,
      serveurNettoyage: t.cleanServer || null,
    })),
    cuisine: {
      platsEnCuisson : (kitchen?.cooking || []).length,
      platsEnAttente : (kitchen?.queue   || []).length,
      platsPretsNb   : (kitchen?.done    || []).length,
      totalCuisines  : kitchen?.totalDishes || 0,
      ameliorations  : kitchen?.upgrades || {},
    },
    timers: (kitchen?.cooking || []).map(d => ({
      id      : String(d.id),
      finishAt: d.startedAt + d.timerMax * 1000,
      label   : d.name + (d.tableName ? " · " + d.tableName : ""),
      tableId : d.tableId || null,
      cat     : d.cat || "",
    })),
    platsPretsAServir: (kitchen?.done || []).map(d => ({
      id: String(d.id), nom: d.name, tableId: d.tableId, tableName: d.tableName || "", cat: d.cat || "",
    })),
    reputation,
    transactions   : (transactions || []).slice(0, 50),
    pret           : loan,
    livraisons     : (pendingDeliveries || []).map(d => ({
      id: d.id, nom: d.name, quantite: d.qty, arriveeAt: d.arrivesAt,
    })),
    plaintes: (complaints || []).slice(0, 20).map(c => ({
      id: c.id, message: c.message, date: c.date,
    })),
    fournisseur: supplierMode || "premium",
    objectifs: {
      completedIds,
      pendingClaim,
      stats       : objStats,
      defisJour   : (todayChallenges || []).map(ch => ({
        id: ch.id, titre: ch.title, icone: ch.icon,
        recompense: ch.reward,
        reclame   : !!(challengeClaimed || {})[ch.id],
      })),
      dateDefis   : challengeDate || "",
      progression : challengeProgress,
      clientPerduAujourdhui: challengeLostToday,
    },
    statsJournalieres: dailyStats,
    evenement    : activeEvent,
    saveData: {
      argent             : cash,
      restoXp,
      stock,
      servers,
      tables,
      kitchen,
      objStats,
      dailyStats,
      completedIds,
      challengeProgress,
      challengeClaimed,
      challengeLostToday,
      loan,
      reputation,
      transactions,
      pendingDeliveries,
      pendingClaim,
      activeEvent,
      candidatePool,
      candidateDate,
    },
    savedAt: Date.now(),
  };
};

/** Nettoie les états liés aux timers qui ne sont plus valides après un rechargement */
export const sanitizeSave = (save) => {
  const now = Date.now();
  const savedTables = (save.tables || []).map(t => {
    if (t.status === "nettoyage") {
      if (t.cleanUntil && now >= t.cleanUntil)
        return { ...t, status: "libre", server: null, cleanUntil: null, cleanDur: null, cleanServer: null, freedAt: now };
      return t;
    }
    if (t.status === "mange")   return { ...t, eatUntil: null, eatDur: null };
    if (t.status === "occupée") return { ...t, svcUntil: null };
    return t;
  });
  const tables  = TABLES0.map(t0 => savedTables.find(t => t.id === t0.id) || t0);
  const servers = (save.servers || []).map(s =>
    (s.status === "service" || s.status === "nettoyage")
      ? { ...s, status: "actif", serviceUntil: null, cleanUntil: null }
      : s
  );
  const kitchen = save.kitchen ? {
    ...save.kitchen,
    queue: [...(save.kitchen.queue || []), ...(save.kitchen.cooking || []).map(d => ({
      ...d, startedAt: undefined, timerMax: undefined,
    }))],
    cooking: [],
    done: save.kitchen.done || [],
  } : null;
  const stock = (save.stock || STOCK0).map(item => ({
    ...item, freshness: item.freshness ?? 100,
  }));
  return {
    ...save, tables, servers, kitchen, stock, queue: [],
    candidatePool: save.candidatePool || [],
    candidateDate: save.candidateDate || "",
  };
};
