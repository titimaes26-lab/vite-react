// Import from ./theme.js directly — importing from ./index.js would be circular
import { C } from './theme.js';

export const LOAN_OPTIONS = [
  { id: "small",  label: "Petit prêt",    amount: 1500, rate: 0.06,  monthly: 90,  icon: "💳" },
  { id: "medium", label: "Prêt standard", amount: 4000, rate: 0.05,  monthly: 220, icon: "🏦" },
  { id: "large",  label: "Grand prêt",    amount: 9000, rate: 0.045, monthly: 475, icon: "🏛" },
];

export const CHALLENGES_POOL = [
  /* ── Tier 1 — disponibles dès le niveau 0 ─────────────────────────── */
  { tier: 1, id: "c_5_clients",  icon: "👥", title: "5 clients servis",      desc: "Servez 5 clients aujourd'hui",                key: "served",    target: 5,    reward: { cash: 150, xp: 40  } },
  { tier: 1, id: "c_10_clients", icon: "🔟", title: "10 clients servis",     desc: "Servez 10 clients aujourd'hui",               key: "served",    target: 10,   reward: { cash: 300, xp: 80  } },
  { tier: 1, id: "c_200_rev",    icon: "💶", title: "200 € de recettes",     desc: "Encaissez 200 € dans la journée",             key: "revenue",   target: 200,  reward: { cash: 100, xp: 30  } },
  { tier: 1, id: "c_500_rev",    icon: "💰", title: "500 € de recettes",     desc: "Encaissez 500 € dans la journée",             key: "revenue",   target: 500,  reward: { cash: 250, xp: 60  } },
  { tier: 1, id: "c_1000_rev",   icon: "🏆", title: "1 000 € de recettes",   desc: "Encaissez 1 000 € dans la journée",           key: "revenue",   target: 1000, reward: { cash: 500, xp: 120 } },
  { tier: 1, id: "c_no_loss",    icon: "✨", title: "Zéro client perdu",      desc: "Ne perdez aucun client de la journée",        key: "noLoss",    target: 1,    reward: { cash: 200, xp: 60  } },
  { tier: 1, id: "c_3_stars",    icon: "⭐", title: "3 notes ★★★★+",         desc: "Obtenez 3 notes de 4 étoiles ou plus",        key: "highRating",target: 3,    reward: { cash: 180, xp: 50  } },
  { tier: 1, id: "c_5_stars",    icon: "🌟", title: "5 notes ★★★★+",         desc: "Obtenez 5 notes de 4 étoiles ou plus",        key: "highRating",target: 5,    reward: { cash: 350, xp: 100 } },
  { tier: 1, id: "c_rush",       icon: "⚡", title: "Rush express",           desc: "Placez 3 groupes en moins de 5 minutes",      key: "fastPlace", target: 3,    reward: { cash: 200, xp: 70  } },
  { tier: 1, id: "c_vip",        icon: "🎩", title: "Service VIP",            desc: "Servez un client VIP",                        key: "vip",       target: 1,    reward: { cash: 300, xp: 80  } },
  { tier: 1, id: "c_full_house", icon: "🍽", title: "Salle comble",           desc: "Ayez 5 tables occupées simultanément",        key: "fullHouse", target: 1,    reward: { cash: 250, xp: 70  } },
  { tier: 1, id: "c_tip_master", icon: "💸", title: "Maître du pourboire",    desc: "Cumulez 50 € de pourboires dans la journée",  key: "tips",      target: 50,   reward: { cash: 150, xp: 40  } },
  /* ── Tier 2 — débloqués à partir du niveau 15 ─────────────────────── */
  { tier: 2, id: "c_20_clients", icon: "👨‍👩‍👦‍👦", title: "20 clients servis",  desc: "Servez 20 clients aujourd'hui",               key: "served",    target: 20,   reward: { cash: 500,  xp: 130 } },
  { tier: 2, id: "c_2000_rev",   icon: "💎", title: "2 000 € de recettes",   desc: "Encaissez 2 000 € dans la journée",           key: "revenue",   target: 2000, reward: { cash: 700,  xp: 180 } },
  { tier: 2, id: "c_8_stars",    icon: "🌠", title: "8 notes ★★★★+",         desc: "Obtenez 8 notes de 4 étoiles ou plus",        key: "highRating",target: 8,    reward: { cash: 600,  xp: 160 } },
  { tier: 2, id: "c_100_tips",   icon: "💰", title: "100 € de pourboires",   desc: "Cumulez 100 € de pourboires dans la journée", key: "tips",      target: 100,  reward: { cash: 400,  xp: 110 } },
  { tier: 2, id: "c_vip2",       icon: "🎭", title: "Double VIP",             desc: "Servez 2 clients VIP dans la journée",        key: "vip",       target: 2,    reward: { cash: 550,  xp: 140 } },
  /* ── Tier 3 — débloqués à partir du niveau 30 ─────────────────────── */
  { tier: 3, id: "c_50_clients", icon: "🏟", title: "50 clients servis",     desc: "Servez 50 clients aujourd'hui",               key: "served",    target: 50,   reward: { cash: 1200, xp: 350 } },
  { tier: 3, id: "c_5000_rev",   icon: "👑", title: "5 000 € de recettes",   desc: "Encaissez 5 000 € dans la journée",           key: "revenue",   target: 5000, reward: { cash: 1800, xp: 500 } },
  { tier: 3, id: "c_10_stars",   icon: "✨", title: "10 notes ★★★★+",        desc: "Obtenez 10 notes de 4 étoiles ou plus",       key: "highRating",target: 10,   reward: { cash: 900,  xp: 250 } },
  { tier: 3, id: "c_vip3",       icon: "🏅", title: "Triple VIP",             desc: "Servez 3 clients VIP dans la journée",        key: "vip",       target: 3,    reward: { cash: 1000, xp: 280 } },
];

export const OBJECTIVES_DEF = [
  // Série 1 — Premiers pas
  { id: "first_service", series: 1, title: "Premier service",    desc: "Servez votre premier client",              icon: "🍽", reward: { cash: 200,  xp: 50  }, condition: (s) => s.totalServed  >= 1    },
  { id: "five_tables",   series: 1, title: "En rythme",          desc: "Servez 5 tables",                          icon: "⊞", reward: { cash: 500,  xp: 100 }, condition: (s) => s.totalServed  >= 5    },
  { id: "first_k",       series: 1, title: "Premier millier",    desc: "Atteignez 1 000 € de chiffre d'affaires",  icon: "💶", reward: { cash: 300,  xp: 80  }, condition: (s) => s.totalRevenue >= 1000 },
  { id: "no_loss_day",   series: 1, title: "Service impeccable", desc: "Terminez une journée sans perdre un client",icon: "✨", reward: { cash: 400,  xp: 120 }, condition: (s) => s.perfectDays  >= 1    },
  // Série 2 — Croissance
  { id: "twenty_tables", series: 2, title: "Rush du midi",       desc: "Servez 20 tables",                         icon: "🔥", reward: { cash: 800,  xp: 200 }, condition: (s) => s.totalServed  >= 20   },
  { id: "five_k",        series: 2, title: "Brasserie rentable", desc: "Atteignez 5 000 € de chiffre d'affaires",  icon: "📈", reward: { cash: 600,  xp: 150 }, condition: (s) => s.totalRevenue >= 5000 },
  { id: "upgrade_table", series: 2, title: "Confort amélioré",   desc: "Agrandissez une table",                    icon: "🪑", reward: { cash: 400,  xp: 100 }, condition: (s) => s.tablesUpgraded >= 1  },
  { id: "bistrot",       series: 2, title: "Bistrot",            desc: "Atteignez le niveau Bistrot (niv. 3)",     icon: "🍺", reward: { cash: 700,  xp: 0   }, condition: (s) => s.restoLevel   >= 3    },
  // Série 3 — Excellence
  { id: "fifty_tables",  series: 3, title: "Service non-stop",   desc: "Servez 50 tables",                         icon: "🏃", reward: { cash: 1500, xp: 400 }, condition: (s) => s.totalServed  >= 50   },
  { id: "twenty_k",      series: 3, title: "Grand Compte",       desc: "Atteignez 20 000 € de chiffre d'affaires", icon: "💰", reward: { cash: 2000, xp: 500 }, condition: (s) => s.totalRevenue >= 20000},
  { id: "three_upgrades",series: 3, title: "Salle de prestige",  desc: "Agrandissez 3 tables",                     icon: "✨", reward: { cash: 1200, xp: 300 }, condition: (s) => s.tablesUpgraded >= 3  },
  { id: "brasserie",     series: 3, title: "Restaurant",         desc: "Atteignez le niveau Restaurant (niv. 10)", icon: "🍽", reward: { cash: 1500, xp: 0   }, condition: (s) => s.restoLevel   >= 10   },
  // Série 4 — Légende
  { id: "hundred_tables",series: 4, title: "Centenaire",         desc: "Servez 100 tables",                          icon: "🏆", reward: { cash: 3000, xp: 800  }, condition: (s) => s.totalServed  >= 100  },
  { id: "fifty_k",       series: 4, title: "Empire",             desc: "Atteignez 50 000 € de chiffre d'affaires",   icon: "💎", reward: { cash: 5000, xp: 1000 }, condition: (s) => s.totalRevenue >= 50000},
  { id: "flawless_5",    series: 4, title: "Service légendaire", desc: "Terminez 5 journées sans perdre un client",  icon: "✨", reward: { cash: 4000, xp: 900  }, condition: (s) => (s.perfectDays||0) >= 5},
  { id: "palace",        series: 4, title: "Grand Restaurant",   desc: "Atteignez le niveau Grand Restaurant (niv. 25)", icon: "👑", reward: { cash: 5000, xp: 0    }, condition: (s) => s.restoLevel   >= 25   },
];

export const SERIES_LABELS = { 1: "Premiers pas", 2: "Croissance", 3: "Excellence", 4: "Légende" };
export const SERIES_COLORS = { 1: C.green, 2: C.navy, 3: C.terra, 4: C.amber };

export const GAME_EVENTS = [
  {
    id: "inspection", icon: "🔍", title: "Inspection sanitaire",
    desc: "Un inspecteur de la DGCCRF débarque à l'improviste.",
    minLevel: 0,
    type: "auto",
    apply: (stock, cash, complaints, addToast, setCash, addTx, setComplaints, setQueue, rMood, rName, rSize, tables, setStock, setTables, setServers, setKitchen, updateReputation, serversRef, restoLv = 0) => {
      const alerts = stock.filter(s => s.qty <= s.alert).length;
      if (alerts >= 3) {
        const fine = 300 + restoLv * 20;
        setCash(c => +(c - fine).toFixed(2));
        addTx("dépense", "Amende inspection sanitaire (infractions stock)", fine);
        setComplaints(p => [{
          id: Date.now(), date: new Date().toLocaleDateString("fr-FR"),
          table: "-", server: "-", type: "Inspection",
          desc: `${alerts} infractions relevées — amende ${fine}€`,
          status: "nouveau", prio: "haute",
        }, ...p]);
        addToast({ icon: "🚨", title: "Inspection — Amende !", msg: `${alerts} infractions · −${fine}€`, color: "#c0392b", tab: "complaints" });
        return "fail";
      } else {
        const bonus = 100 + restoLv * 10;
        setCash(c => c + bonus);
        addTx("revenu", "Bonus inspection sanitaire (dossier exemplaire)", bonus);
        addToast({ icon: "✅", title: "Inspection réussie !", msg: `Dossier exemplaire · +${bonus}€`, color: "#2a5c3f", tab: "stats" });
        return "pass";
      }
    },
  },
  {
    id: "rush", icon: "⚡", title: "Rush inattendu !",
    desc: "Un groupe important vient de réserver — afflux soudain de clients.",
    minLevel: 0,
    type: "auto",
    apply: (stock, cash, complaints, addToast, setCash, addTx, setComplaints, setQueue, rMood, rName, rSize, tables) => {
      const maxCap = Math.max(...tables.filter(t => t.status === "libre").map(t => t.capacity), 2);
      const groups = Array.from({ length: 3 }, () => {
        const mood = rMood();
        return { id: Date.now() + Math.random(), name: rName(), size: Math.min(rSize(), maxCap), mood, expiresAt: Date.now() + mood.p * 1500, patMax: mood.p };
      });
      setQueue(q => [...q, ...groups]);
      addToast({ icon: "⚡", title: "Rush inattendu !", msg: "3 groupes ajoutés en file d'attente", color: "#b87d10", tab: "tables" });
    },
  },
  {
    id: "frigo", icon: "🧊", title: "Panne de chambre froide !",
    desc: "La chambre froide a lâché cette nuit. Une partie des stocks est perdue.",
    minLevel: 0,
    type: "auto",
    apply: (stock, cash, complaints, addToast, setCash, addTx, setComplaints, setQueue, rMood, rName, rSize, tables, setStock) => {
      setStock(s => s.map(item => {
        if (["kg", "L"].includes(item.unit) && ["Viandes", "Poissons", "Laitiers"].includes(item.cat))
          return { ...item, qty: +(item.qty * 0.4).toFixed(3), freshness: Math.min(item.freshness ?? 100, 15) };
        return item;
      }));
      addToast({ icon: "🧊", title: "Panne frigo !", msg: "Stocks viandes/poissons réduits de 60% · Fraîcheur à 15%", color: "#1c3352", tab: "stock" });
    },
  },
  {
    id: "critique", icon: "✍️", title: "Critique gastronomique",
    desc: "Un critique du Michelin serait en ville ce soir. Une table VIP vient d'arriver.",
    minLevel: 0,
    type: "auto",
    apply: (stock, cash, complaints, addToast, setCash, addTx, setComplaints, setQueue) => {
      const vip = {
        id: Date.now() + Math.random(), name: "Guide Michelin", size: 2,
        mood: { e: "🎩", l: "VIP", p: 60, b: 3.0 }, isVIP: true,
        expiresAt: Date.now() + 60000, patMax: 60,
      };
      setQueue(q => [vip, ...q]);
      addToast({ icon: "🎩", title: "Client VIP !", msg: "Un critique Michelin attend — servez-le vite !", color: "#6b3fa0", tab: "tables" });
    },
  },
  {
    id: "anniversaire", icon: "🎉", title: "Anniversaire surprise !",
    desc: "Un groupe fête un anniversaire — bonne humeur générale dans toute la salle.",
    minLevel: 0,
    type: "auto",
    apply: (stock, cash, complaints, addToast, setCash, addTx, setComplaints, setQueue, rMood, rName, rSize, tables, setStock, setTables, setServers, setKitchen, updateReputation, serversRef, restoLv = 0) => {
      setQueue(q => q.map(g => ({
        ...g,
        expiresAt: g.expiresAt + Math.round(g.patMax * 1000 * 0.3),
      })));
      setTables(t => t.map(tbl => {
        if (tbl.status === "mange" && tbl.eatUntil)
          return { ...tbl, eatUntil: tbl.eatUntil + 30000 };
        return tbl;
      }));
      const bonus = 60 + restoLv * 5;
      setCash(c => +(c + bonus).toFixed(2));
      addTx("revenu", "Ambiance anniversaire — bonus ambiance", bonus);
      addToast({ icon: "🎉", title: "Anniversaire surprise !", msg: `Patience +30% pour tous · +${bonus}€ bonus ambiance`, color: "#6b3fa0", tab: "tables" });
    },
  },
  {
    id: "buzz", icon: "📱", title: "Buzz sur les réseaux !",
    desc: "Une story virale attire du monde. File d'attente et réputation en hausse.",
    minLevel: 0,
    type: "auto",
    apply: (stock, cash, complaints, addToast, setCash, addTx, setComplaints, setQueue, rMood, rName, rSize, tables, setStock, setTables, setServers, setKitchen, updateReputation, serversRef, restoLv = 0) => {
      const maxCap = Math.max(...(tables.filter(t => t.status === "libre").map(t => t.capacity)), 2);
      const groups = Array.from({ length: 2 }, () => {
        const mood = rMood();
        return { id: Date.now() + Math.random(), name: rName(), size: Math.min(rSize(), maxCap), mood, expiresAt: Date.now() + mood.p * 1000, patMax: mood.p };
      });
      const vip = {
        id: Date.now() + Math.random(), name: rName(), size: 2,
        mood: { e: "🎩", l: "VIP", p: 50, b: 2.0 }, isVIP: true,
        expiresAt: Date.now() + 50000, patMax: 50,
      };
      setQueue(q => [...q, ...groups, vip]);
      const repBoost = 5 + Math.floor(restoLv / 10);
      if (updateReputation) updateReputation(repBoost, "buzz réseaux sociaux");
      addToast({ icon: "📱", title: "Buzz sur les réseaux !", msg: `3 groupes en file · Réputation +${repBoost}`, color: "#6b3fa0", tab: "tables" });
    },
  },
  {
    id: "blackout", icon: "🌑", title: "Coupure électrique !",
    desc: "Panne partielle — la cuisine tourne au ralenti pendant 3 minutes.",
    minLevel: 0,
    type: "auto",
    apply: (stock, cash, complaints, addToast, setCash, addTx, setComplaints, setQueue, rMood, rName, rSize, tables, setStock, setTables, setServers, setKitchen) => {
      const now = Date.now();
      setKitchen(k => ({
        ...k,
        cooking: k.cooking.map(d => {
          const finishAt = d.startedAt + d.timerMax * 1000;
          const remaining = Math.max(0, finishAt - now);
          const newStartedAt = now + remaining * 1.5 - d.timerMax * 1000;
          return { ...d, startedAt: newStartedAt };
        }),
      }));
      addToast({ icon: "🌑", title: "Coupure électrique !", msg: "Cuisson ralentie +50% · Retour normal dans 3 min", color: "#1c3352", tab: "cuisine" });
      setTimeout(() => {
        addToast({ icon: "💡", title: "Électricité rétablie !", msg: "La cuisine reprend son rythme normal", color: "#2a5c3f", tab: "cuisine" });
      }, 180_000);
    },
  },
  {
    id: "livraison_cadeau", icon: "🚚", title: "Livraison cadeau fournisseur !",
    desc: "Votre fournisseur offre un réapprovisionnement gratuit sur vos stocks les plus bas.",
    minLevel: 0,
    type: "auto",
    apply: (stock, cash, complaints, addToast, setCash, addTx, setComplaints, setQueue, rMood, rName, rSize, tables, setStock, setTables, setServers, setKitchen, updateReputation, serversRef, restoLv = 0) => {
      const sorted = [...stock]
        .filter(s => s.alert > 0)
        .sort((a, b) => (a.qty / a.alert) - (b.qty / b.alert))
        .slice(0, 5);
      const ids = new Set(sorted.map(s => s.id));
      const restockMult = 5 + Math.floor(restoLv / 5);
      setStock(prev => prev.map(s => {
        if (!ids.has(s.id)) return s;
        const restock = +(s.alert * restockMult).toFixed(3);
        return { ...s, qty: +(s.qty + restock).toFixed(3), freshness: 100 };
      }));
      addToast({ icon: "🚚", title: "Livraison cadeau !", msg: `${sorted.map(s => s.name).join(", ")} réapprovisionnés gratuitement`, color: "#2a5c3f", tab: "stock" });
    },
  },
  {
    id: "serveur_malade", icon: "🤧", title: "Serveur malade !",
    desc: "Un serveur se sent mal et doit s'arrêter 4 minutes.",
    minLevel: 0,
    type: "auto",
    apply: (stock, cash, complaints, addToast, setCash, addTx, setComplaints, setQueue, rMood, rName, rSize, tables, setStock, setTables, setServers, setKitchen, updateReputation, serversRef) => {
      const actifs = (serversRef || []).filter(s => s.status === "actif");
      if (actifs.length === 0) return;
      const victim = actifs[Math.floor(Math.random() * actifs.length)];
      const pauseUntil = Date.now() + 240_000;
      setServers(prev => prev.map(s =>
        s.id !== victim.id ? s : { ...s, status: "pause", moral: 10, pauseUntil }
      ));
      addToast({ icon: "🤧", title: "Serveur malade !", msg: `${victim.name} est indisponible pendant 4 minutes`, color: "#c4622d", tab: "servers" });
      setTimeout(() => {
        setServers(prev => prev.map(s =>
          s.id !== victim.id ? s : { ...s, status: "actif", pauseUntil: null }
        ));
        addToast({ icon: "💪", title: `${victim.name} de retour !`, msg: "Le serveur a repris son service", color: "#2a5c3f", tab: "servers" });
      }, 240_000);
    },
  },
  /* ── Événements exclusifs : débloqués par niveau ────────────────────── */
  {
    id: "guide_michelin", icon: "⭐", title: "Visite du Guide Michelin !",
    desc: "Un inspecteur du Guide Michelin réserve une table ce soir.",
    minLevel: 30,
    type: "auto",
    apply: (stock, cash, complaints, addToast, setCash, addTx, setComplaints, setQueue, rMood, rName, rSize, tables, setStock, setTables, setServers, setKitchen, updateReputation, serversRef, restoLv = 0) => {
      const vip1 = {
        id: Date.now() + Math.random(), name: "Guide Michelin", size: 2,
        mood: { e: "🌟", l: "VIP Prestige", p: 90, b: 4.0 }, isVIP: true,
        expiresAt: Date.now() + 90000, patMax: 90,
      };
      const vip2 = {
        id: Date.now() + Math.random(), name: rName(), size: 2,
        mood: { e: "🎩", l: "VIP", p: 70, b: 3.0 }, isVIP: true,
        expiresAt: Date.now() + 70000, patMax: 70,
      };
      setQueue(q => [vip1, vip2, ...q]);
      if (updateReputation) updateReputation(10, "visite Guide Michelin");
      addToast({ icon: "⭐", title: "Guide Michelin !", msg: "2 inspecteurs VIP attendent — service irréprochable requis !", color: "#c89b2a", tab: "tables" });
    },
  },
  {
    id: "soiree_gala", icon: "🥂", title: "Soirée de gala !",
    desc: "Une soirée privée de prestige s'improvise — clients VIP en masse.",
    minLevel: 35,
    type: "auto",
    apply: (stock, cash, complaints, addToast, setCash, addTx, setComplaints, setQueue, rMood, rName, rSize, tables, setStock, setTables, setServers, setKitchen, updateReputation, serversRef, restoLv = 0) => {
      const vips = Array.from({ length: 3 }, () => ({
        id: Date.now() + Math.random(), name: rName(), size: 2,
        mood: { e: "🥂", l: "VIP Gala", p: 80, b: 3.5 }, isVIP: true,
        expiresAt: Date.now() + 80000, patMax: 80,
      }));
      setQueue(q => [...vips, ...q]);
      const bonus = 200 + restoLv * 10;
      setCash(c => +(c + bonus).toFixed(2));
      addTx("revenu", "Soirée de gala — acompte privatisation", bonus);
      if (updateReputation) updateReputation(10, "soirée de gala");
      addToast({ icon: "🥂", title: "Soirée de gala !", msg: `3 VIP en route · Réputation +10 · +${bonus}€`, color: "#8b2a6b", tab: "tables" });
    },
  },
  {
    id: "concours_culinaire", icon: "🏆", title: "Concours culinaire !",
    desc: "Votre chef remporte un concours régional — prix et notoriété.",
    minLevel: 40,
    type: "auto",
    apply: (stock, cash, complaints, addToast, setCash, addTx, setComplaints, setQueue, rMood, rName, rSize, tables, setStock, setTables, setServers, setKitchen, updateReputation, serversRef, restoLv = 0) => {
      const prize = 500 + restoLv * 20;
      setCash(c => +(c + prize).toFixed(2));
      addTx("revenu", "Prix concours culinaire régional", prize);
      if (updateReputation) updateReputation(15, "victoire concours culinaire");
      addToast({ icon: "🏆", title: "Concours culinaire !", msg: `Votre chef a gagné ! · +${prize}€ · Réputation +15`, color: "#c89b2a", tab: "stats" });
    },
  },
];

export const TABS = [
  { id: "tables",      label: "Tables",       icon: "⊞"  },
  { id: "cuisine",     label: "Cuisine",      icon: "👨‍🍳" },
  { id: "servers",     label: "Personnels",   icon: "👤"  },
  { id: "menu",        label: "Menu",         icon: "📋"  },
  { id: "stock",       label: "Stocks",       icon: "📦"  },
  { id: "objectives",  label: "Objectifs",    icon: "🎯"  },
  { id: "complaints",  label: "Plaintes",     icon: "⚠"  },
  { id: "stats",       label: "Statistiques", icon: "📊"  },
];
