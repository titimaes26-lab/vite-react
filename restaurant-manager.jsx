import { useState, useEffect, useCallback, useRef } from "react";

/* ═══════════════════════════════════════════════════════
   Imports modulaires — extraits du monolithe original
   Chaque module est indépendant et testable unitairement.
═══════════════════════════════════════════════════════ */

// ── Données statiques ──────────────────────────────────
import {
  C, F,
  SRV_LVL, CHEF_LVL, CHEF_XP_CAP, COMMIS_LVL, COMMIS_XP_CAP,
  RESTO_LVL, SERVER_SLOTS_BY_LEVEL, CAP_UPGRADES,
  MOODS, NAMES1, NAMES2,
  TABLES0, SERVERS0, STOCK0, MENU0, COMPLAINTS0, KITCHEN0,
  KITCHEN_UPGRADES, SUPPLIERS, LOAN_OPTIONS,
  CHALLENGES_POOL, OBJECTIVES_DEF, SERIES_LABELS, SERIES_COLORS,
  GAME_EVENTS, TABS,
} from "./src/constants/gameData";

import {
  REP_THRESHOLDS, REP_DELTA, MENU_THEMES, FORMULA_PRESETS,
  MORAL_PAUSE_GAIN, getRepTier,
} from "./src/constants/gameConstants";

// ── Logique pure ───────────────────────────────────────
import {
  srvLv, chefLv, chefLvData, commisLv, commisLvData, restoLv,
  dishCookTime, dishCookTimeWithUpgrades,
  calcRating, ratingColor, ratingStars,
  calcTip, srvXpFromCheckout, restoXpFromCheckout,
} from "./src/utils/levelUtils";

import {
  pick, rName, rMood, rSize, pickSeeded,
  generateOrder, generateOrderWithSpecials,
} from "./src/utils/randomUtils";

import {
  consumeStock, buildKitchenTickets,
  svcDuration, eatDuration, calcBill, quickAmounts,
} from "./src/utils/orderUtils";

// ── Hooks métier ───────────────────────────────────────
import { useGameClock }   from "./src/hooks/useGameClock";
import { useSpawner }     from "./src/hooks/useSpawner";
import { useExpiry }      from "./src/hooks/useExpiry";
import { useSalary }      from "./src/hooks/useSalary";
import { useDeliveries }  from "./src/hooks/useDeliveries";
import { useEvents }      from "./src/hooks/useEvents";
import { useServerMoral } from "./src/hooks/useServerMoral";
import { useChallenges }  from "./src/hooks/useChallenges";
import { useObjectives }  from "./src/hooks/useObjectives";

// ── Composants UI ──────────────────────────────────────
import { Badge, Card, Btn, Inp, Sel, Lbl, XpBar, Modal } from "./src/components/ui";
import { Toasts } from "./src/components/system/Toasts";

// ── Vues ───────────────────────────────────────────────
import { TablesView }     from "./src/views/TablesView";
import { ServersView }    from "./src/views/ServersView";
import { KitchenView }    from "./src/views/KitchenView";
import { MenuView }       from "./src/views/MenuView";
import { StockView }      from "./src/views/StockView";
import { ComplaintsView } from "./src/views/ComplaintsView";
import { StatsView }      from "./src/views/StatsView";
import { ObjectivesView } from "./src/views/ObjectivesView";
import { BankModal }      from "./src/components/system/BankModal";
import { HelpModal }      from "./src/components/system/HelpModal";

/* ─── Sauvegarde localStorage ─────────────────────────── */
const SAVE_KEY = "resto_save_v1";

const saveToLocalStorage = (state) => {
    if (!window.localStorage) {
        console.error("LocalStorage non supporté sur ce navigateur");
        return;
    }
    try {
        const payload = JSON.stringify({
            ...state,
            savedAt: Date.now()
        });
        window.localStorage.setItem(SAVE_KEY, payload);
    } catch (error) {
        if (error.name === 'QuotaExceededError') {
            alert("Espace de stockage saturé sur la tablette !");
        } else {
            console.warn("Erreur de sauvegarde :", error);
        }
    }
};

const saveGame = (state) => saveToLocalStorage(state);

const loadGame = async () => {
    try {
        if (!window.localStorage) return null;
        const raw = window.localStorage.getItem(SAVE_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch(e) { return null; }
};

// resetGame est appelé depuis l'intérieur du composant App
// pour pouvoir réinitialiser les états React sans reload

/* ─── Pont de communication React ↔ GDevelop ──────────── */
// Envoie un message structuré au parent (GDevelop via iframe)
const sendToGDevelop = (payload) => {
  try {
    window.parent.postMessage({ source: "react-ui", payload }, "*");
  } catch(e) {
    console.warn("[GDevelop Bridge] postMessage échoué :", e);
  }
};

// Construit le payload standardisé depuis les états React
const buildGDevelopPayload = ({ cash, restoXp, stock, queue, tables, kitchen, objStats, servers, dailyStats }) => {
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
        niveau : cl.l,
        nom    : CHEF_LVL[Math.min(cl.l, CHEF_LVL.length-1)]?.name || "",
        xp     : kitchen?.chef?.totalXp || 0,
        vitesse: CHEF_LVL[Math.min(cl.l, CHEF_LVL.length-1)]?.speed || 1,
      },
      serveurs: (servers || []).map(s => {
        const sl = srvLv(s.totalXp);
        return { id: s.id, nom: s.name, niveau: sl.l, xp: s.totalXp, statut: s.status, salaire: s.salary };
      }),
    },
    inventaire: (stock || []).map(s => ({
      id: s.id, nom: s.name, quantite: s.qty, unite: s.unit,
      alerte: s.qty <= s.alert, prix: s.price, categorie: s.cat,
    })),
    clients: {
      enAttente      : (queue || []).length,
      tablesOccupees : (tables || []).filter(t => t.status === "occupée" || t.status === "mange").length,
      tablesLibres   : (tables || []).filter(t => t.status === "libre").length,
      totalServis    : objStats?.totalServed    || 0,
      totalPerdus    : (dailyStats || []).reduce((s, d) => s + (d.lost || 0), 0),
      chiffreAffaires: objStats?.totalRevenue   || 0,
    },
    // Timers : finishAt (timestamp absolu) pour précision cross-plateforme
    timers: (kitchen?.cooking || []).map(d => ({
      id      : String(d.id),
      finishAt: d.startedAt + d.timerMax * 1000,
      label   : d.name + (d.tableName ? " · " + d.tableName : ""),
      tableId : d.tableId || null,
      cat     : d.cat || "",
    })),
    savedAt: Date.now(),
  };
};

// Nettoie les états liés aux timers qui ne sont plus valides après un rechargement
const sanitizeSave = (save) => {
  const now = Date.now();
  const tables = (save.tables || []).map(t => {
    if (t.status === "nettoyage") {
      if (!t.cleanUntil || now >= t.cleanUntil)
        return { ...t, status: "libre", server: null, cleanUntil: null, cleanDur: null, freedAt: now };
      return t;
    }
    if (t.status === "mange") return { ...t, eatUntil: null, eatDur: null };
    if (t.status === "occupée") return { ...t, svcUntil: null };
    return t;
  });
  const servers = (save.servers || []).map(s =>
    s.status === "service" ? { ...s, status: "actif", serviceUntil: null } : s
  );
  const kitchen = save.kitchen ? {
    ...save.kitchen,
    queue: [...(save.kitchen.queue || []), ...(save.kitchen.cooking || []).map(d => ({
      ...d, startedAt: undefined, timerMax: undefined
    }))],
    cooking: [],
    done: save.kitchen.done || [],
  } : null;
  return { ...save, tables, servers, kitchen, queue: [] };
};

/* ─── Palette ─────────────────────────────────────────── */


/* ─── XP / Level system ───────────────────────────────── */




/* ─── Spécialités serveurs ───────────────────────────── */
const SRV_SPECIALTIES = [
  { id:"speed",    icon:"⚡", name:"Rapidité",     color:"#1c3352", desc:"−30% temps de prise de commande",  tipMult:1.0,  speedMult:0.70 },
  { id:"charm",    icon:"✨", name:"Charme",        color:"#6b3fa0", desc:"Pourboires +20%",                  tipMult:1.20, speedMult:1.0  },
  { id:"sommelier",icon:"🍷", name:"Sommelier",     color:"#c4622d", desc:"Boissons commandées +30%",         tipMult:1.10, speedMult:1.0  },
  { id:"vip",      icon:"🎩", name:"Gestion VIP",   color:"#b87d10", desc:"Patience clients VIP +30s",        tipMult:1.15, speedMult:1.0  },
];
const pickSpecialty = () => SRV_SPECIALTIES[Math.floor(Math.random()*SRV_SPECIALTIES.length)];

/* ─── Catalogue de formations serveurs ───────────────── */
const TRAINING_CATALOG = [
  {
    id:"accueil", icon:"🤝", name:"Accueil & Relation client",
    color:C.purple,
    desc:"Améliore la satisfaction client et les pourboires.",
    levels:[
      { l:1, name:"Initiation",  cost:80,  xp:40,  moralBonus:5,  effect:"Pourboires +5%",       specialtyId:"charm",   desc:"Introduction aux techniques d'accueil." },
      { l:2, name:"Avancé",     cost:180, xp:100, moralBonus:8,  effect:"Pourboires +12%",      specialtyId:"charm",   desc:"Gestion des situations délicates et fidélisation." },
      { l:3, name:"Expert",     cost:350, xp:200, moralBonus:15, effect:"Pourboires +20% + Moral max", specialtyId:"charm", desc:"Maîtrise complète de l'expérience client." },
    ]
  },
  {
    id:"service", icon:"⚡", name:"Rapidité & Efficacité",
    color:C.navy,
    desc:"Réduit les temps de prise de commande.",
    levels:[
      { l:1, name:"Initiation",  cost:70,  xp:35,  moralBonus:0,  effect:"Commandes −10%",        specialtyId:"speed",   desc:"Optimisation des déplacements en salle." },
      { l:2, name:"Avancé",     cost:160, xp:90,  moralBonus:5,  effect:"Commandes −20%",        specialtyId:"speed",   desc:"Gestion simultanée de plusieurs tables." },
      { l:3, name:"Expert",     cost:320, xp:180, moralBonus:10, effect:"Commandes −30% + XP×2", specialtyId:"speed",   desc:"Technique de service professionnel haute performance." },
    ]
  },
  {
    id:"sommellerie", icon:"🍷", name:"Sommellerie & Boissons",
    color:C.terra,
    desc:"Augmente les ventes et la qualité du service boissons.",
    levels:[
      { l:1, name:"Initiation",  cost:90,  xp:45,  moralBonus:5,  effect:"Ventes boissons +15%",  specialtyId:"sommelier", desc:"Bases de la dégustation et des accords mets-vins." },
      { l:2, name:"Avancé",     cost:200, xp:110, moralBonus:8,  effect:"Ventes boissons +25%",  specialtyId:"sommelier", desc:"Connaissance approfondie des crus et spiritueux." },
      { l:3, name:"Expert",     cost:400, xp:220, moralBonus:12, effect:"Ventes boissons +40%",  specialtyId:"sommelier", desc:"Certification sommelier — conseils personnalisés." },
    ]
  },
  {
    id:"prestige", icon:"🎩", name:"Gestion VIP & Prestige",
    color:C.amber,
    desc:"Optimise le service des clients importants.",
    levels:[
      { l:1, name:"Initiation",  cost:100, xp:50,  moralBonus:5,  effect:"Patience VIP +15s",     specialtyId:"vip",     desc:"Protocole de service haut de gamme." },
      { l:2, name:"Avancé",     cost:220, xp:120, moralBonus:10, effect:"Patience VIP +30s",     specialtyId:"vip",     desc:"Gestion des personnalités et critiques gastronomiques." },
      { l:3, name:"Expert",     cost:450, xp:240, moralBonus:15, effect:"Patience VIP +45s + XP×2", specialtyId:"vip",  desc:"Excellence absolue — label Palace." },
    ]
  },
  {
    id:"bienetre", icon:"🧘", name:"Bien-être & Gestion du stress",
    color:C.green,
    desc:"Améliore la résistance à la fatigue et le moral.",
    levels:[
      { l:1, name:"Initiation",  cost:60,  xp:30,  moralBonus:20, effect:"Moral max +10",         specialtyId:null,      desc:"Techniques de récupération rapide." },
      { l:2, name:"Avancé",     cost:130, xp:70,  moralBonus:35, effect:"Moral max +20 + drain −50%", specialtyId:null,  desc:"Gestion de la fatigue en service intensif." },
      { l:3, name:"Expert",     cost:280, xp:140, moralBonus:60, effect:"Moral plein + immunité burnout", specialtyId:null, desc:"Résilience professionnelle complète." },
    ]
  },
];
// Max moral bonus (cumul toutes formations bien-être)
const getMaxMoral = (sv) => {
  const bienetre = (sv.trainings||{})["bienetre"] || 0;
  return 100 + (bienetre>=1?10:0) + (bienetre>=2?10:0);
};


function useBreakpoint(){
  const [bp,setBp]=useState(()=>({
    w:typeof window!=="undefined"?window.innerWidth:1280,
    isMobile:typeof window!=="undefined"?window.innerWidth<640:false,
    isTablet:typeof window!=="undefined"?window.innerWidth>=640&&window.innerWidth<1024:false,
    isDesktop:typeof window!=="undefined"?window.innerWidth>=1024:true,
    isSmall:typeof window!=="undefined"?window.innerWidth<480:false,
  }));
  useEffect(()=>{
    const update=()=>{
      const w=window.innerWidth;
      setBp({
        w,
        isMobile:w<640,
        isTablet:w>=640&&w<1024,
        isDesktop:w>=1024,
        isSmall:w<480,
      });
    };
    // Use ResizeObserver if available, fallback to resize event
    if(typeof ResizeObserver!=="undefined"){
      const ro=new ResizeObserver(update);
      ro.observe(document.documentElement);
      return()=>ro.disconnect();
    } else {
      window.addEventListener("resize",update,{passive:true});
      return()=>window.removeEventListener("resize",update);
    }
  },[]);
  return bp;
}

/* ── Helpers responsive ── */
// Retourne la valeur selon breakpoint: rVal(bp, mobile, tablet, desktop)
const rVal=(bp,mobile,tablet,desktop)=>bp.isMobile?mobile:bp.isTablet?tablet:desktop;
// Grid columns helper
const rGrid=(bp,m=1,t=2,d=3)=>`repeat(${bp.isMobile?m:bp.isTablet?t:d},1fr)`;


/* ── Objectifs de progression ── */

/* ── Défis quotidiens ── */
const ALL_CHALLENGES=[
  {id:"ch_served",   key:"served",   icon:"🍽", title:"Service express",      desc:"Servir 10 clients aujourd'hui",            target:10,  reward:{cash:80, xp:120}},
  {id:"ch_revenue",  key:"revenue",  icon:"💶", title:"Journée dorée",        desc:"Encaisser 500€ dans la journée",           target:500, reward:{cash:100,xp:150}},
  {id:"ch_rating",   key:"highRating",icon:"⭐",title:"Service 5 étoiles",    desc:"Obtenir 5 notes ≥ 4★",                    target:5,   reward:{cash:60, xp:100}},
  {id:"ch_noloss",   key:"noLoss",   icon:"😊", title:"Zéro abandon",         desc:"Aucun client ne repart sans être servi",   target:1,   reward:{cash:70, xp:90 }},
  {id:"ch_fast",     key:"fastPlace",icon:"⚡", title:"Placement rapide",     desc:"Placer 8 groupes en un clic",              target:8,   reward:{cash:50, xp:80 }},
  {id:"ch_vip",      key:"vip",      icon:"🎩", title:"Service VIP",          desc:"Servir un client VIP",                     target:1,   reward:{cash:150,xp:200}},
  {id:"ch_tips",     key:"tips",     icon:"💰", title:"Maître du pourboire",  desc:"Encaisser 50€ de pourboires",              target:50,  reward:{cash:60, xp:100}},
  {id:"ch_fullhouse",key:"fullHouse",icon:"🏠", title:"Salle comble",         desc:"Avoir 5 tables occupées simultanément",    target:1,   reward:{cash:90, xp:130}},
];

// pickDailyChallenges → remplacé par pickSeeded(CHALLENGES_POOL, 3, dateStr)



export default function App(){
  const bp=useBreakpoint();
  const _today = new Date().toLocaleDateString("fr-FR");

  /* ── États principaux — initialisés avec les valeurs par défaut ── */
  /* La sauvegarde est chargée de façon asynchrone dans le useEffect  */
  const [isLoaded, setIsLoaded] = useState(false);
  const [tab,setTab]=useState("tables");
  const [tables,setTables]=useState(TABLES0);
  const [servers,setServers]=useState(SERVERS0);
  const [queue,setQueue]=useState(()=>{
    const mood=rMood();
    return [{id:1,name:rName(),size:Math.min(rSize(),2),mood,expiresAt:Date.now()+mood.p*1000,patMax:mood.p}];
  });
  const [waitlist,setWaitlist]=useState([]); // groupes partis mais rappelables 2 min
  const [menu,setMenu]=useState(MENU0);
  const [stock,setStock]=useState(STOCK0);
  const [formulas,setFormulas]=useState([]); // [{id, presetId, name, items:[{menuId,cat}], active}]
  const [activeTheme,setActiveTheme]=useState("none");
  const [complaints,setComplaints]=useState(COMPLAINTS0);
  const [kitchen,setKitchen]=useState(KITCHEN0);
  const [toasts,setToasts]=useState([]);
  const [restoXp,setRestoXp]=useState(0);
  const [cash,setCash]=useState(5000);
  const [transactions,setTransactions]=useState([
    {id:0,type:"revenu",label:"Capital de départ",amount:5000,date:Date.now()}
  ]);
  const [showLedger,setShowLedger]=useState(false);
  const [showBank,setShowBank]=useState(false);
  const [loan,setLoan]=useState(null);
  const [supplierMode,setSupplierMode]=useState("premium");
  const [pendingDeliveries,setPendingDeliveries]=useState([]);
  const [dailySpecials,setDailySpecials]=useState(()=>{
    const base=MENU0.filter(m=>m.cat!=="Boissons");
    const picks=base.sort(()=>Math.random()-0.5).slice(0,2);
    return picks.map(m=>({...m,originalPrice:m.price,price:+(m.price*0.8).toFixed(2),isSpecial:true}));
  });
  const [activeEvent,setActiveEvent]=useState(null);
  const [completedIds,setCompletedIds]=useState([]);
  const [challengeDate,setChallengeDate]=useState(_today);
  const [todayChallenges,setTodayChallenges]=useState(()=>pickSeeded(CHALLENGES_POOL, 3, _today));
  const [challengeProgress,setChallengeProgress]=useState({served:0,revenue:0,noLoss:1,highRating:0,fastPlace:0,vip:0,fullHouse:0,tips:0});
  const [challengeClaimed,setChallengeClaimed]=useState({});
  const [challengeLostToday,setChallengeLostToday]=useState(false);
  const [pendingClaim,setPendingClaim]=useState([]);
  const [objStats,setObjStats]=useState({totalServed:0,totalRevenue:0,perfectDays:0,tablesUpgraded:0,restoLevel:0});
  const [dailyStats,setDailyStats]=useState([{date:_today,served:0,lost:0,revenue:0}]);
  const [reputation,setReputation]=useState(50); // 0–100

  /* ── Indicateur de sauvegarde ──────────────────────── */
  const [saveStatus,setSaveStatus]=useState("idle");
  const saveTimerRef=useRef(null);
  const [showResetModal,setShowResetModal]=useState(false);
  const [showSummary,setShowSummary]=useState(false);
  const [summaryIsRecord,setSummaryIsRecord]=useState(false);
  const prevRevenueRef=useRef(0);
  // Résumé de fin de journée : s'affiche après 10 min de jeu réel
  const summaryShownRef=useRef(false);
  useEffect(()=>{
    if(!isLoaded) return;
    const t=setTimeout(()=>{
      if(summaryShownRef.current) return;
      summaryShownRef.current=true;
      const today=dailyStats[dailyStats.length-1];
      const isRecord=today&&today.revenue>prevRevenueRef.current&&today.revenue>0;
      setSummaryIsRecord(isRecord);
      setShowSummary(true);
    },600000); // 10 minutes
    return()=>clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[isLoaded]);

  /* ── Réinitialisation complète (sans reload) ────────── */
  const doReset = useCallback(() => {
    try { window.localStorage.removeItem(SAVE_KEY); } catch(e) {}
    const today = new Date().toLocaleDateString("fr-FR");
    const mood  = rMood();
    setTables(TABLES0);
    setServers(SERVERS0);
    setQueue([{id:1,name:rName(),size:Math.min(rSize(),2),mood,expiresAt:Date.now()+mood.p*1000,patMax:mood.p}]);
    setMenu(MENU0);
    setStock(STOCK0);
    setComplaints(COMPLAINTS0);
    setKitchen(KITCHEN0);
    setRestoXp(0);
    setCash(5000);
    setTransactions([{id:0,type:"revenu",label:"Capital de départ",amount:5000,date:Date.now()}]);
    setLoan(null);
    setSupplierMode("premium");
    setPendingDeliveries([]);
    const base=MENU0.filter(m=>m.cat!=="Boissons");
    const picks=base.sort(()=>Math.random()-0.5).slice(0,2);
    setDailySpecials(picks.map(m=>({...m,originalPrice:m.price,price:+(m.price*0.8).toFixed(2),isSpecial:true})));
    setCompletedIds([]);
    setChallengeDate(today);
    setTodayChallenges(pickSeeded(CHALLENGES_POOL, 3, today));
    setChallengeProgress({served:0,revenue:0,noLoss:1,highRating:0,fastPlace:0,vip:0,fullHouse:0,tips:0});
    setChallengeClaimed({});
    setChallengeLostToday(false);
    setPendingClaim([]);
    setObjStats({totalServed:0,totalRevenue:0,perfectDays:0,tablesUpgraded:0,restoLevel:0});
    setDailyStats([{date:today,served:0,lost:0,revenue:0}]);
    setReputation(50);
    setWaitlist([]);
    setFormulas([]);
    setActiveTheme("none");
    setTab("tables");
    setShowResetModal(false);
  },[]);

  /* ── Chargement depuis localStorage ───────────────── */
  useEffect(()=>{
    loadGame().then(raw=>{
      if(raw){
        const sv=sanitizeSave(raw);
        if(sv.tables)    setTables(sv.tables);
        if(sv.servers)   setServers(sv.servers);
        if(sv.menu)      setMenu(sv.menu);
        if(sv.stock)     setStock(sv.stock);
        if(sv.complaints)setComplaints(sv.complaints);
        if(sv.kitchen)   setKitchen(sv.kitchen);
        if(sv.restoXp!=null) setRestoXp(sv.restoXp);
        if(sv.cash!=null)    setCash(sv.cash);
        if(sv.transactions)  setTransactions(sv.transactions);
        if(sv.loan!=null)    setLoan(sv.loan);
        if(sv.supplierMode)  setSupplierMode(sv.supplierMode);
        if(sv.pendingDeliveries) setPendingDeliveries(sv.pendingDeliveries);
        if(sv.dailySpecials) setDailySpecials(sv.dailySpecials);
        if(sv.completedIds)  setCompletedIds(sv.completedIds);
        if(sv.challengeDate) setChallengeDate(sv.challengeDate);
        if(sv.todayChallenges) setTodayChallenges(sv.todayChallenges);
        if(sv.challengeProgress) setChallengeProgress(sv.challengeProgress);
        if(sv.challengeClaimed)  setChallengeClaimed(sv.challengeClaimed);
        if(sv.challengeLostToday!=null) setChallengeLostToday(sv.challengeLostToday);
        if(sv.pendingClaim)  setPendingClaim(sv.pendingClaim);
        if(sv.objStats)      setObjStats(sv.objStats);
        if(sv.dailyStats)    setDailyStats(sv.dailyStats);
        if(sv.reputation!=null) setReputation(sv.reputation);
        if(sv.formulas)      setFormulas(sv.formulas);
        if(sv.activeTheme)   setActiveTheme(sv.activeTheme);
        setQueue(sv.queue||[]);
      }
      setIsLoaded(true);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);
  const addDayStat=useCallback((key,value=1)=>{
    const today=new Date().toLocaleDateString("fr-FR");
    setDailyStats(p=>{
      const idx=p.findIndex(d=>d.date===today);
      if(idx>=0){
        const updated=[...p];
        updated[idx]={...updated[idx],[key]:+(updated[idx][key]+value).toFixed(2)};
        // Check perfect day when losing a client
        return updated;
      }
      const base={date:today,served:0,lost:0,revenue:0};
      return [...p,{...base,[key]:+value.toFixed(2)}].slice(-5);
    });
    if(key==="served") setObjStats(s=>({...s,totalServed:s.totalServed+1}));
    if(key==="rating") setObjStats(s=>({...s,totalRating:(s.totalRating||0)+value,ratingCount:(s.ratingCount||0)+1}));
    if(key==="revenue") setObjStats(s=>({...s,totalRevenue:+(s.totalRevenue+value).toFixed(2)}));
    if(key==="lost"){
      setObjStats(s=>({...s,_hadLoss:true}));
      setChallengeLostToday(true);
      setChallengeProgress(p=>({...p,noLoss:0}));
      updateReputation(REP_DELTA.lostClient,"client perdu");
    }
  },[]);
  const addTx=useCallback((type,label,amount)=>{
    setTransactions(p=>[{id:Date.now()+Math.random(),type,label,amount:+Math.abs(amount).toFixed(2),date:Date.now()},...p].slice(0,200));
  },[]);

  const [showHelp,setShowHelp]=useState(false);
  const dismissToast=useCallback(id=>setToasts(p=>p.filter(x=>x.id!==id)),[]);
  const addToast=useCallback(t=>{
    const id=Date.now()+Math.random();
    setToasts(p=>[...p.slice(-4),{...t,id}]);
    setTimeout(()=>setToasts(p=>p.filter(x=>x.id!==id)),4000);
  },[]);

  /* ── Réputation ────────────────────────────────────── */

  const updateReputation = useCallback((delta, reason="")=>{
    setReputation(prev=>{
      const before = getRepTier(prev);
      const next   = Math.min(100, Math.max(0, prev + delta));
      const after  = getRepTier(next);
      if(before.label !== after.label){
        const up = delta > 0;
        setTimeout(()=>addToast({
          icon: after.icon,
          title: up ? `Réputation en hausse !` : `Réputation en baisse !`,
          msg: `${after.label} (${Math.round(next)}/100)${reason?" · "+reason:""}`,
          color: after.color,
          tab: "stats",
        }),50);
      }
      repRef.current = next;
      return next;
    });
  },[addToast]);

  /* ── Sauvegarde automatique debounced (2s) ─────────── */
  useEffect(()=>{
    // Ne pas sauvegarder avant que la partie soit entièrement chargée
    if(!isLoaded) return;
    setSaveStatus("saving");
    if(saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current=setTimeout(()=>{
      saveGame({
        tables,servers,menu,stock,complaints,kitchen,
        restoXp,cash,transactions,loan,supplierMode,
        pendingDeliveries,dailySpecials,completedIds,
        challengeDate,todayChallenges,challengeProgress,
        challengeClaimed,challengeLostToday,pendingClaim,
        objStats,dailyStats,reputation,formulas,activeTheme,
      });
      setSaveStatus("saved");
      setTimeout(()=>setSaveStatus("idle"),2000);
    },2000);
    return()=>{if(saveTimerRef.current)clearTimeout(saveTimerRef.current);};
  },[isLoaded,tables,servers,menu,stock,complaints,kitchen,
     restoXp,cash,loan,supplierMode,pendingDeliveries,
     completedIds,challengeProgress,challengeClaimed,
     challengeLostToday,pendingClaim,objStats,dailyStats,reputation,
     formulas,activeTheme]);

  /* ── GDevelop : écoute du message d'initialisation ─── */
  useEffect(()=>{
    const handler = (event) => {
      // Accepter uniquement les messages venant de GDevelop
      if (!event.data || event.data.source !== "gdevelop") return;
      const { type, payload } = event.data;

      if (type === "INIT" && payload) {
        // Charger les données envoyées par GDevelop en priorité sur localStorage
        if (payload.argent        != null) setCash(payload.argent);
        if (payload.restoXp       != null) setRestoXp(payload.restoXp);
        if (payload.stock)                 setStock(payload.stock);
        if (payload.servers)               setServers(payload.servers);
        if (payload.tables)                setTables(payload.tables);
        if (payload.kitchen)               setKitchen(payload.kitchen);
        if (payload.objStats)              setObjStats(payload.objStats);
        if (payload.dailyStats)            setDailyStats(payload.dailyStats);
        if (payload.completedIds)          setCompletedIds(payload.completedIds);
        if (payload.challengeProgress)     setChallengeProgress(payload.challengeProgress);
        if (payload.loan         != null)  setLoan(payload.loan);
        console.info("[GDevelop Bridge] Init reçu ✓", payload);
        // Confirmer la réception à GDevelop
        sendToGDevelop({ type: "INIT_ACK", ok: true });
      }

      if (type === "PING") {
        sendToGDevelop({ type: "PONG", ready: isLoaded });
      }
    };
    window.addEventListener("message", handler);
    // Signaler à GDevelop que l'iframe est prête
    sendToGDevelop({ type: "READY" });
    return () => window.removeEventListener("message", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── GDevelop : sync debounced (1s) sur les états clés ── */
  const gdSyncTimerRef = useRef(null);
  useEffect(()=>{
    if (!isLoaded) return;
    if (gdSyncTimerRef.current) clearTimeout(gdSyncTimerRef.current);
    gdSyncTimerRef.current = setTimeout(()=>{
      const payload = buildGDevelopPayload({ cash, restoXp, stock, queue, tables, kitchen, objStats, servers, dailyStats });
      sendToGDevelop({ type: "SYNC", ...payload });
    }, 1000);
    return () => { if (gdSyncTimerRef.current) clearTimeout(gdSyncTimerRef.current); };
  },[isLoaded, cash, restoXp, stock, queue, tables, kitchen, objStats, servers, dailyStats]);


  /* ── Refs pour hooks asynchrones ─────────────────── */
  const stockRef      = useRef(stock);
  const cashRef       = useRef(cash);
  const complaintsRef = useRef(complaints);
  const repRef        = useRef(reputation);
  const tablesRef     = useRef(tables);
  const lastSpawnRef  = useRef(Date.now());

  useEffect(() => { stockRef.current      = stock;      }, [stock]);
  useEffect(() => { cashRef.current       = cash;       }, [cash]);
  useEffect(() => { complaintsRef.current = complaints; }, [complaints]);
  useEffect(() => { repRef.current        = reputation; }, [reputation]);
  useEffect(() => { tablesRef.current     = tables;     }, [tables]);

  /* ── Hooks métier (remplacent 13 useEffect inline) ── */
  const clockNow = useGameClock();

  useSpawner    ({ setQueue, tablesRef, lastSpawnRef, repRef, getRepTier });
  useExpiry     ({ setQueue, setWaitlist, setTables, setServers, addToast, addDayStat });
  useSalary     ({ setServers, setKitchen, setCash, setLoan, addTx, addToast });
  useDeliveries ({ setPendingDeliveries, setStock, addToast });
  useEvents     ({
    stockRef, cashRef, complaintsRef, tablesRef,
    setStock, setComplaints, setQueue, setCash,
    setActiveEvent, addToast, addTx, updateReputation,
  });
  useServerMoral({ setServers, addToast });
  useChallenges ({
    tables,
    setChallengeProgress, setChallengeDate,
    setTodayChallenges, setChallengeLostToday, setChallengeClaimed,
  });
  useObjectives ({ objStats, completedIds, pendingClaim, setPendingClaim, addToast });


  const now=new Date(clockNow);

  const rl=restoLv(restoXp);
  const rlD=rl.d;
  const activeTables=tables.slice(0,rlD.tables);

  const addRestoXp=useCallback((xp)=>{
    setRestoXp(prev=>{
      const before=restoLv(prev);
      const after=restoLv(prev+xp);
      if(after.l>before.l){
        const nd=RESTO_LVL[after.l];
        setTimeout(()=>addToast({
          icon:nd.icon,
          title:`Niveau ${nd.l} — ${nd.name} !`,
          msg:`🎉 ${nd.tables} tables débloquées`,
          color:nd.color,
          tab:"tables",
        }),50);
        setObjStats(s=>({...s,restoLevel:after.l}));
      }
      return prev+xp;
    });
  },[addToast]);



  const claimObjective=useCallback((id)=>{
    const obj=OBJECTIVES_DEF.find(o=>o.id===id);
    if(!obj)return;
    setCompletedIds(p=>[...p,id]);
    setPendingClaim(p=>p.filter(x=>x!==id));
    setCash(c=>+(c+obj.reward.cash).toFixed(2));
    addTx("revenu",`Récompense objectif : ${obj.title}`,obj.reward.cash);
    addRestoXp(obj.reward.xp);
    addToast({icon:obj.icon,title:`+${obj.reward.cash}€ · +${obj.reward.xp} XP`,
      msg:`Objectif "${obj.title}" réclamé !`,color:C.green,tab:"objectives"});
  },[addTx,addRestoXp,addToast]);

  return(
    <div style={{minHeight:"100vh",background:C.bg,color:C.ink,fontFamily:F.body}}>
      {/* Écran de chargement */}
      {!isLoaded&&(
        <div style={{position:"fixed",inset:0,background:C.bg,zIndex:99999,
          display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16}}>
          <div style={{width:52,height:52,background:C.green,borderRadius:14,
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,
            animation:"pulse 1s ease-in-out infinite"}}>🍽</div>
          <div style={{fontSize:15,fontWeight:700,color:C.ink,fontFamily:F.title}}>Chargement de la partie…</div>
          <div style={{fontSize:12,color:C.muted,fontFamily:F.body}}>Récupération de la sauvegarde</div>
        </div>
      )}
      <style>{`
        * { box-sizing: border-box; }
        html { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }

        /* ── Hover cards ── */
        .hovcard { transition: box-shadow 0.22s cubic-bezier(.4,0,.2,1), transform 0.18s cubic-bezier(.4,0,.2,1) !important; }
        .hovcard:hover { box-shadow: 0 8px 28px rgba(23,18,14,0.14), 0 2px 6px rgba(23,18,14,0.07) !important; transform: translateY(-2px) !important; }
        .hovcard:active { transform: translateY(0px) !important; box-shadow: 0 2px 8px rgba(23,18,14,0.08) !important; }

        /* ── Buttons ── */
        button { transition: filter 0.14s, transform 0.14s, box-shadow 0.14s, opacity 0.14s !important; }
        button:not(:disabled):hover { filter: brightness(1.10); transform: translateY(-1px); }
        button:not(:disabled):active { transform: translateY(0px) scale(0.97); filter: brightness(0.96); }

        /* ── Inputs ── */
        select option { background:#fff; color:#18130e; }
        ::placeholder { color:#b0a088; }
        input, select { transition: border-color 0.15s, box-shadow 0.15s; }
        input:focus, select:focus {
          outline: none !important;
          border-color: #1e5c38 !important;
          box-shadow: 0 0 0 3px #1e5c3822 !important;
        }

        /* ── Animations ── */
        @keyframes slideIn      { from{opacity:0;transform:translateX(24px)} to{opacity:1;transform:translateX(0)} }
        @keyframes slideUp      { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn       { from{opacity:0} to{opacity:1} }
        @keyframes pulse        { 0%,100%{opacity:1} 50%{opacity:0.45} }
        @keyframes popIn        { 0%{transform:scale(0.82);opacity:0} 65%{transform:scale(1.05)} 100%{transform:scale(1);opacity:1} }
        @keyframes breathe      { 0%,100%{box-shadow:0 0 0 0 rgba(30,92,56,0)} 50%{box-shadow:0 0 0 7px rgba(30,92,56,0.16)} }
        @keyframes breatheAmber { 0%,100%{box-shadow:0 0 0 0 rgba(160,108,8,0)} 50%{box-shadow:0 0 0 6px rgba(160,108,8,0.20)} }
        @keyframes toastBar     { from{width:100%} to{width:0%} }
        @keyframes ledPulse     { 0%,100%{opacity:1} 50%{opacity:0.35} }
        @keyframes shimmer      { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        @keyframes shimmerBar   {
          0%  { background-position: -200% 0; }
          100%{ background-position:  200% 0; }
        }
        @keyframes saveFlash    { 0%{opacity:0;transform:scale(0.8)} 20%{opacity:1;transform:scale(1.1)} 80%{opacity:1} 100%{opacity:0;transform:scale(0.95)} }
        @keyframes countUp      { from{transform:translateY(6px);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes glow         { 0%,100%{opacity:0.5} 50%{opacity:1} }
        @keyframes tabSlide     { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }

        /* ── Tab content entry ── */
        .tab-content { animation: tabSlide 0.22s ease both; }

        /* ── XP bar shimmer ── */
        .xpbar-shimmer::after {
          content:'';
          position:absolute;
          inset:0;
          background:linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.35) 50%,transparent 100%);
          background-size:200% 100%;
          animation: shimmerBar 2.4s ease-in-out infinite;
          border-radius:99px;
        }
        .xpbar-shimmer { position:relative; overflow:hidden; }

        /* ── Accent strip card ── */
        .card-strip { position:relative; overflow:hidden; }
        .card-strip::before {
          content:'';
          position:absolute;
          left:0;top:0;bottom:0;
          width:4px;
          border-radius:2px 0 0 2px;
        }

        /* ── Navigation tab bar ── */
        .nav-tab-active {
          background: linear-gradient(135deg, #1e5c3814, #1e5c3808) !important;
          color: #1e5c38 !important;
          border-bottom: 2.5px solid #1e5c38 !important;
          font-weight: 700 !important;
        }
        .nav-tab {
          transition: color 0.15s, background 0.15s, border-color 0.15s;
        }
        .nav-tab:hover:not(.nav-tab-active) {
          background: rgba(30,92,56,0.05) !important;
          color: #1e5c38 !important;
        }

        /* ── Mobile ── */
        :root {
          --gap: 16px;
          --pad: 22px;
          --card-radius: 16px;
          --font-base: 13px;
        }
        @media (max-width: 639px) {
          :root { --gap: 10px; --pad: 12px; --card-radius: 12px; --font-base: 12px; }
          .desktop-nav { display: none !important; }
          .mobile-nav  { display: flex !important; }
          .content-area { padding: 12px var(--pad) 90px !important; }
          .badge-alert { font-size: 8px !important; width: 14px !important; height: 14px !important; }
          .hide-mobile { display: none !important; }
          .show-mobile { display: flex !important; }
          /* Compact header on mobile */
          .header-title { font-size: 13px !important; }
          .header-line2 { gap: 6px !important; padding: 4px 10px 6px !important; }
          /* Full-width tables on mobile */
          .resp-grid { grid-template-columns: 1fr !important; }
          .resp-grid-2 { grid-template-columns: 1fr 1fr !important; }
          /* Modals full-screen on mobile */
          .modal-inner { border-radius: 0 !important; max-height: 100vh !important; height: 100vh !important; }
        }
        @media (min-width: 640px) and (max-width: 1023px) {
          :root { --gap: 12px; --pad: 16px; --card-radius: 14px; }
          .desktop-nav { display: flex !important; }
          .mobile-nav  { display: none !important; }
          .content-area { padding: 16px var(--pad) !important; }
          .hide-tablet { display: none !important; }
          .resp-grid { grid-template-columns: 1fr 1fr !important; }
          .resp-grid-3 { grid-template-columns: 1fr 1fr !important; }
        }
        @media (min-width: 1024px) {
          .desktop-nav { display: flex !important; }
          .mobile-nav  { display: none !important; }
          .content-area { padding: 20px var(--pad) !important; }
          .show-mobile { display: none !important; }
        }
      `}</style>

      {/* Header — 2 lignes */}
      <div style={{
        background:`linear-gradient(180deg,${C.surface} 0%,#faf7f0 100%)`,
        borderBottom:`1px solid ${C.border}`,
        boxShadow:"0 2px 14px rgba(23,18,14,0.08), 0 1px 3px rgba(23,18,14,0.04)",
      }}>

        {/* Ligne 1 : logo · alertes · horloge · aide */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
          padding:bp.isMobile?"0 10px":"0 16px",minHeight:bp.isMobile?46:52,gap:8,flexWrap:"nowrap",overflow:"hidden"}}>

          {/* Logo + nom */}
          <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0,minWidth:0}}>
            <div style={{
              width:38,height:38,
              background:`linear-gradient(135deg,${C.green} 0%,${C.greenL||"#2d7a50"} 100%)`,
              borderRadius:11,
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:19,flexShrink:0,
              boxShadow:`0 3px 10px ${C.green}38`,
            }}>🍽</div>
            <div style={{minWidth:0}}>
              <div className={bp.isSmall?"hide-mobile":""} style={{
                fontSize:bp.isMobile?13:15,fontWeight:800,color:C.ink,fontFamily:F.title,
                whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",
                letterSpacing:"-0.02em",lineHeight:1.2,
              }}>Le Grand Restaurant</div>
              <div style={{fontSize:9,color:C.muted,fontFamily:F.body,whiteSpace:"nowrap",marginTop:1,letterSpacing:"0.02em"}}>
                {now.toLocaleDateString("fr-FR",{weekday:"short",day:"numeric",month:"short"})}
              </div>
            </div>
          </div>

          {/* Alertes + horloge + aide */}
          <div style={{display:"flex",alignItems:"center",gap:5,flexShrink:0}}>
            {sAlerts>0&&(
              <div style={{
                background:C.redP,border:`1.5px solid ${C.red}28`,borderRadius:8,
                padding:"3px 9px",fontSize:10,color:C.red,fontWeight:700,whiteSpace:"nowrap",
                display:"flex",alignItems:"center",gap:4,
                boxShadow:`0 1px 4px ${C.red}18`,
              }}>
                <span style={{width:5,height:5,borderRadius:"50%",background:C.red,animation:"pulse 1.2s infinite",display:"inline-block",flexShrink:0}}/>
                ⚠ {sAlerts}
              </div>
            )}
            {nCompl>0&&tab!=="complaints"&&(
              <div onClick={()=>{
                setTab("complaints");
                setSeenIds(p=>new Set([...p,...complaints.filter(c=>c.status==="nouveau").map(c=>c.id)]));
              }} style={{
                background:C.terraP,border:`1.5px solid ${C.terra}28`,borderRadius:8,
                padding:"3px 9px",fontSize:10,color:C.terra,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",
                boxShadow:`0 1px 4px ${C.terra}18`,
              }}>
                💬 {nCompl}
              </div>
            )}
            {queue.length>=5&&(
              <div style={{
                background:C.redP,border:`1.5px solid ${C.red}28`,borderRadius:8,
                padding:"3px 9px",fontSize:10,color:C.red,fontWeight:700,whiteSpace:"nowrap",
                animation:"pulse 1.2s ease-in-out infinite",
              }}>🚨</div>
            )}
            {/* Horloge */}
            <div style={{
              textAlign:"right",flexShrink:0,
              background:C.bg,border:`1px solid ${C.border}`,
              borderRadius:8,padding:"3px 9px",
            }}>
              <div style={{fontSize:16,fontWeight:800,color:C.ink,fontFamily:F.title,lineHeight:1.1,letterSpacing:"-0.02em"}}>
                {now.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}
              </div>
              <div style={{fontSize:8,color:C.muted,whiteSpace:"nowrap",marginTop:1}}>
                {activeTables.filter(t=>t.status==="occupée"||t.status==="mange").length}/{activeTables.length} tables
              </div>
            </div>
            <button onClick={()=>setShowHelp(true)} title="Guide utilisateur" style={{
              width:30,height:30,borderRadius:"50%",
              border:`1.5px solid ${C.green}44`,
              background:C.greenP,cursor:"pointer",fontSize:14,
              color:C.green,display:"flex",alignItems:"center",justifyContent:"center",
              flexShrink:0,fontWeight:800,
              boxShadow:`0 2px 7px ${C.green}20`,
            }}>?</button>
            <button onClick={()=>setShowResetModal(true)} title="Nouvelle partie" style={{
              width:30,height:30,borderRadius:"50%",
              border:`1.5px solid ${C.red}33`,
              background:C.redP,cursor:"pointer",fontSize:13,
              color:C.red,display:"flex",alignItems:"center",justifyContent:"center",
              flexShrink:0,fontWeight:800,opacity:0.65,
            }}>↺</button>
          </div>
        </div>

        {/* Ligne 2 : niveau restaurant + cash */}
        <div style={{
          borderTop:`1px solid ${C.border}`,
          padding:bp.isMobile?"5px 10px 7px":"6px 16px 9px",display:"flex",alignItems:"center",gap:bp.isMobile?6:10,
          background:`linear-gradient(180deg,${C.bg}90,${C.bg})`,
          flexWrap:"nowrap",overflow:"hidden",
        }}>
          <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
            <span style={{fontSize:14}}>{rlD.icon}</span>
            <span style={{fontSize:11,fontWeight:700,color:rlD.color,fontFamily:F.title,whiteSpace:"nowrap"}}>{rlD.name}</span>
            <span style={{fontSize:9,background:rlD.color+"18",color:rlD.color,
              border:`1px solid ${rlD.color}33`,borderRadius:4,
              padding:"1px 5px",fontWeight:700,fontFamily:F.body,whiteSpace:"nowrap"}}>N{rlD.l}</span>
          </div>
          <div style={{flex:1,minWidth:40}}>
            <div style={{height:5,background:C.border,borderRadius:99,overflow:"hidden"}}>
              <div style={{height:"100%",
                width:rl.l>=RESTO_LVL.length-1?"100%":`${rl.pct}%`,
                background:rlD.color,borderRadius:99,transition:"width 0.6s ease"}}/>
            </div>
          </div>
          <div style={{fontSize:9,color:C.muted,fontFamily:F.body,flexShrink:0,whiteSpace:"nowrap"}}>
            {rl.l>=RESTO_LVL.length-1
              ? "✦ Max"
              : `${restoXp}/${rl.next.xpNeeded} XP`
            }
          </div>

          {/* ── Réputation ── */}
          {(()=>{
            const tier=getRepTier(reputation);
            return(
              <div title={`${tier.label} — ${tier.desc}`}
                style={{display:"flex",alignItems:"center",gap:5,flexShrink:0,
                  background:tier.color+"14",border:`1px solid ${tier.color}33`,
                  borderRadius:7,padding:"3px 8px",cursor:"default"}}>
                <span style={{fontSize:13}}>{tier.icon}</span>
                <div style={{display:"flex",flexDirection:"column",gap:2,minWidth:50}}>
                  <div style={{height:4,background:C.border,borderRadius:99,overflow:"hidden"}}>
                    <div style={{height:"100%",
                      width:`${reputation}%`,
                      background:tier.color,
                      borderRadius:99,transition:"width 0.6s ease"}}/>
                  </div>
                  <div style={{fontSize:8,color:tier.color,fontWeight:700,
                    fontFamily:F.body,whiteSpace:"nowrap",lineHeight:1}}>
                    {tier.icon} {Math.round(reputation)}/100
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Cash */}
          <div onClick={()=>setShowLedger(true)} style={{flexShrink:0,display:"flex",alignItems:"center",gap:5,
            background:cash<200?C.redP:C.greenP,
            border:`1px solid ${cash<200?C.red:C.green}33`,
            borderRadius:7,padding:"3px 10px",cursor:"pointer"}}
            title="Voir le grand livre">
            <span style={{fontSize:12}}>💰</span>
            <span style={{fontSize:12,fontWeight:700,
              color:cash<200?C.red:C.green,fontFamily:F.title,whiteSpace:"nowrap"}}>
              {cash.toLocaleString("fr-FR",{minimumFractionDigits:2,maximumFractionDigits:2})} €
            </span>
            <span style={{fontSize:9,color:cash<200?C.red:C.green,opacity:0.7}}>▼</span>
          </div>
          {/* Loan indicator + bank button */}
          <div style={{display:"flex",alignItems:"center",gap:5,flexShrink:0}}>
            {loan&&(
              <div style={{background:C.amberP,border:`1px solid ${C.amber}44`,borderRadius:6,
                padding:"3px 8px",fontSize:10,color:C.amber,fontWeight:600,whiteSpace:"nowrap"}}>
                🏦 −{loan.remaining.toFixed(0)}€
              </div>
            )}
            <button onClick={()=>setShowBank(true)} title="Banque" style={{
              padding:"4px 10px",fontSize:11,fontWeight:600,
              background:loan?C.amberP:C.navyP,
              border:`1.5px solid ${loan?C.amber:C.navy}44`,
              borderRadius:7,color:loan?C.amber:C.navy,cursor:"pointer",
              fontFamily:F.body,display:"flex",alignItems:"center",gap:4,whiteSpace:"nowrap"}}>
              🏦
            </button>
          </div>

          {/* Bouton sauvegarde manuelle */}
          <button
            onClick={()=>{
              if(saveStatus==="saving") return;
              setSaveStatus("saving");
              if(saveTimerRef.current) clearTimeout(saveTimerRef.current);
              saveGame({
                tables,servers,menu,stock,complaints,kitchen,
                restoXp,cash,transactions,loan,supplierMode,
                pendingDeliveries,dailySpecials,completedIds,
                challengeDate,todayChallenges,challengeProgress,
                challengeClaimed,challengeLostToday,pendingClaim,
                objStats,dailyStats,reputation,formulas,activeTheme,
              });
              setSaveStatus("saved");
              setTimeout(()=>setSaveStatus("idle"),2000);
            }}
            title="Sauvegarder maintenant"
            style={{
              flexShrink:0,display:"flex",alignItems:"center",gap:5,
              padding:"5px 12px",borderRadius:7,
              background:saveStatus==="saved"?C.green:saveStatus==="saving"?C.amber:C.navy,
              border:"none",cursor:saveStatus==="saving"?"not-allowed":"pointer",
              transition:"background 0.3s",fontFamily:F.body}}>
            <span style={{fontSize:13,
              animation:saveStatus==="saving"?"pulse 0.8s ease-in-out infinite":undefined}}>
              {saveStatus==="saved"?"✅":saveStatus==="saving"?"⏳":"💾"}
            </span>
            <span style={{fontSize:11,fontWeight:700,color:"#fff",whiteSpace:"nowrap"}}>
              {saveStatus==="saved"?"Sauvé !":saveStatus==="saving"?"…":"Sauvegarder"}
            </span>
          </button>
        </div>
      </div>

      {/* Nav Desktop */}
      <div className="desktop-nav" style={{
        background:C.surface,
        borderBottom:`1px solid ${C.border}`,
        padding:"0 16px",overflowX:"auto",
        boxShadow:"0 1px 0 rgba(23,18,14,0.04)",
      }}>
        {TABS.map(t=>{
          const readyChallenges=(todayChallenges||[]).filter(ch=>{
            const val=ch.key==="noLoss"?(challengeLostToday?0:1):
              ch.key==="fullHouse"||ch.key==="vip"?(challengeProgress[ch.key]||0):
              (challengeProgress[ch.key]||0);
            return val>=ch.target&&!(challengeClaimed||{})[ch.id];
          }).length;
          const badge=t.id==="stock"?sAlerts:t.id==="objectives"?pendingClaim.length+readyChallenges:0;
          const active=tab===t.id;
          return(
            <button key={t.id} onClick={()=>{
              setTab(t.id);
              if(t.id==="complaints")
                setSeenIds(p=>new Set([...p,...complaints.filter(c=>c.status==="nouveau").map(c=>c.id)]));
            }} className={active?"nav-tab nav-tab-active":"nav-tab"} style={{
              background:active?`linear-gradient(180deg,${C.green}10,${C.green}06)`:"transparent",
              color:active?C.green:C.muted,
              border:"none",
              borderBottom:active?`2.5px solid ${C.green}`:"2.5px solid transparent",
              borderRadius:active?"10px 10px 0 0":0,
              padding:"12px 16px",
              fontSize:12,fontWeight:active?700:400,
              cursor:"pointer",fontFamily:F.body,
              display:"flex",alignItems:"center",gap:6,
              whiteSpace:"nowrap",
              position:"relative",
            }}>
              <span style={{fontSize:15,lineHeight:1}}>{t.icon}</span>
              <span>{t.label}</span>
              {badge>0&&(
                <span className="badge-alert" style={{
                  background:C.red,color:"#fff",
                  borderRadius:"50%",
                  width:16,height:16,fontSize:9,fontWeight:800,
                  display:"inline-flex",alignItems:"center",justifyContent:"center",
                  boxShadow:`0 1px 4px ${C.red}44`,
                  animation:"popIn 0.3s ease",
                }}>
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="content-area" style={{maxWidth:bp.isDesktop?1300:undefined,margin:"0 auto"}}>
        <div key={tab} style={{animation:"tabSlide 0.2s ease both"}}>
        {tab==="tables"     &&<TablesView     tables={activeTables} setTables={setTables}   servers={servers} setServers={setServers} menu={menu} setMenu={setMenu} setKitchen={setKitchen} kitchen={kitchen} addToast={addToast} addRestoXp={addRestoXp} cash={cash} setCash={setCash} addTx={addTx} queue={queue} setQueue={setQueue} waitlist={waitlist} setWaitlist={setWaitlist} addDayStat={addDayStat} clockNow={clockNow} onTableUpgrade={()=>setObjStats(s=>({...s,tablesUpgraded:s.tablesUpgraded+1}))} setComplaints={setComplaints} dailySpecials={dailySpecials} activeEvent={activeEvent} setChallengeProgress={setChallengeProgress} reputation={reputation} updateReputation={updateReputation} activeTheme={activeTheme} bp={bp}/>}
        {tab==="servers"    &&<ServersView    servers={servers} setServers={setServers} tables={activeTables} clockNow={clockNow} restoLvN={rl.l} cash={cash} setCash={setCash} addTx={addTx} addToast={addToast} bp={bp}/>}
        {tab==="cuisine"    &&<KitchenView    kitchen={kitchen}     setKitchen={setKitchen}  stock={stock} setStock={setStock} tables={activeTables} setTables={setTables} addToast={addToast} cash={cash} setCash={setCash} addTx={addTx} bp={bp}/>}
        {tab==="menu"       &&<MenuView       menu={menu} setMenu={setMenu} stock={stock} formulas={formulas} setFormulas={setFormulas} activeTheme={activeTheme} setActiveTheme={setActiveTheme} dailyStats={dailyStats} bp={bp}/>}
        {tab==="stock"      &&<StockView      stock={stock} setStock={setStock} cash={cash} setCash={setCash} addTx={addTx} kitchen={kitchen} supplierMode={supplierMode} setSupplierMode={setSupplierMode} pendingDeliveries={pendingDeliveries} setPendingDeliveries={setPendingDeliveries} menu={menu} bp={bp}/>}
        {tab==="objectives" &&<ObjectivesView objStats={objStats} completedIds={completedIds} onClaim={claimObjective} pendingClaim={pendingClaim} todayChallenges={todayChallenges} challengeProgress={challengeProgress} challengeClaimed={challengeClaimed} setChallengeClaimed={setChallengeClaimed} challengeLostToday={challengeLostToday} setCash={setCash} addTx={addTx} addRestoXp={addRestoXp} addToast={addToast} restoXp={restoXp} restoLvN={rl.l} bp={bp}/>}
        {tab==="complaints" &&<ComplaintsView complaints={complaints} setComplaints={setComplaints} tables={activeTables} servers={servers} seenIds={seenIds}/>}
        {tab==="stats"      &&<StatsView dailyStats={dailyStats} loan={loan} objStats={objStats} restoXp={restoXp} kitchen={kitchen} servers={servers} reputation={reputation} transactions={transactions} menu={menu} bp={bp}/>}
        </div>
      </div>

      {/* Nav Mobile fixe en bas */}
      <div className="mobile-nav" style={{
        position:"fixed",bottom:0,left:0,right:0,zIndex:900,
        background:C.surface,
        borderTop:`1px solid ${C.border}`,
        boxShadow:"0 -4px 24px rgba(23,18,14,0.12), 0 -1px 4px rgba(23,18,14,0.06)",
        justifyContent:"space-around",alignItems:"stretch",
        paddingBottom:"env(safe-area-inset-bottom,6px)",
      }}>
        {TABS.map(t=>{
          const readyChallenges=(todayChallenges||[]).filter(ch=>{
            const val=ch.key==="noLoss"?(challengeLostToday?0:1):(challengeProgress[ch.key]||0);
            return val>=ch.target&&!(challengeClaimed||{})[ch.id];
          }).length;
          const badge=t.id==="stock"?sAlerts:t.id==="objectives"?pendingClaim.length+readyChallenges:0;
          const active=tab===t.id;
          return(
            <button key={t.id} onClick={()=>{
              setTab(t.id);
              if(t.id==="complaints")
                setSeenIds(p=>new Set([...p,...complaints.filter(c=>c.status==="nouveau").map(c=>c.id)]));
            }} style={{
              flex:1,
              background:active?`linear-gradient(180deg,${C.green}08,transparent)`:"transparent",
              border:"none",
              display:"flex",flexDirection:"column",alignItems:"center",
              justifyContent:"center",
              padding:"9px 2px 5px",
              cursor:"pointer",position:"relative",
              borderTop:active?`2.5px solid ${C.green}`:"2.5px solid transparent",
              gap:4,
              transition:"background 0.15s",
            }}>
              {/* Icon container */}
              <div style={{
                width:34,height:28,
                display:"flex",alignItems:"center",justifyContent:"center",
                borderRadius:9,
                background:active?C.green+"14":"transparent",
                transition:"background 0.15s",
              }}>
                <span style={{
                  fontSize:18,lineHeight:1,
                  filter:active?"none":"grayscale(0.5) opacity(0.55)",
                  transition:"filter 0.15s",
                }}>{t.icon}</span>
              </div>
              <span style={{
                fontSize:9,fontWeight:active?700:400,fontFamily:F.body,
                color:active?C.green:C.muted,
                whiteSpace:"nowrap",letterSpacing:"0.01em",
                lineHeight:1,
              }}>
                {t.label}
              </span>
              {badge>0&&(
                <span style={{
                  position:"absolute",top:5,right:"calc(50% - 18px)",
                  background:C.red,color:"#fff",borderRadius:"50%",
                  width:15,height:15,fontSize:8,fontWeight:800,
                  display:"inline-flex",alignItems:"center",justifyContent:"center",
                  boxShadow:`0 1px 4px ${C.red}55`,
                  animation:"popIn 0.3s ease",
                }}>
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {showHelp&&<HelpModal onClose={()=>setShowHelp(false)}/>}
      {showBank&&<BankModal onClose={()=>setShowBank(false)} cash={cash} loan={loan}
        setLoan={setLoan} setCash={setCash} addTx={addTx} addToast={addToast}/>}
      {/* Ledger modal */}
      {showLedger&&(
        <div onClick={()=>setShowLedger(false)} style={{position:"fixed",inset:0,
          background:"rgba(0,0,0,0.45)",zIndex:9998,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div onClick={e=>e.stopPropagation()} style={{background:C.surface,borderRadius:18,
            width:"100%",maxWidth:560,maxHeight:"80vh",display:"flex",flexDirection:"column",
            boxShadow:"0 24px 60px rgba(0,0,0,0.25)"}}>
            {/* Header */}
            <div style={{padding:"18px 22px",borderBottom:`1px solid ${C.border}`,
              display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
              <div>
                <div style={{fontSize:17,fontWeight:700,color:C.ink,fontFamily:F.title}}>💰 Grand livre</div>
                <div style={{fontSize:11,color:C.muted,fontFamily:F.body,marginTop:2}}>
                  Solde actuel : <span style={{fontWeight:700,color:cash<200?C.red:C.green}}>
                    {cash.toLocaleString("fr-FR",{minimumFractionDigits:2})} €
                  </span>
                </div>
              </div>
              <button onClick={()=>setShowLedger(false)} style={{
                background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,
                width:32,height:32,cursor:"pointer",fontSize:16,color:C.muted}}>✕</button>
            </div>
            {/* Summary row */}
            {(()=>{
              const totalIn=transactions.filter(t=>t.type==="revenu").reduce((s,t)=>s+t.amount,0);
              const totalOut=transactions.filter(t=>t.type!=="revenu").reduce((s,t)=>s+t.amount,0);
              return(
                <div style={{display:"flex",gap:0,borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
                  {[
                    {label:"Recettes",val:totalIn,c:C.green,bg:C.greenP,icon:"📈"},
                    {label:"Dépenses",val:totalOut,c:C.red,bg:C.redP,icon:"📉"},
                    {label:"Résultat",val:totalIn-totalOut,c:totalIn-totalOut>=0?C.green:C.red,bg:totalIn-totalOut>=0?C.greenP:C.redP,icon:"⚖️"},
                  ].map(s=>(
                    <div key={s.label} style={{flex:1,background:s.bg,padding:"10px 14px",textAlign:"center",
                      borderRight:`1px solid ${C.border}`}}>
                      <div style={{fontSize:10,color:C.muted,fontFamily:F.body,marginBottom:2}}>{s.icon} {s.label}</div>
                      <div style={{fontSize:14,fontWeight:700,color:s.c,fontFamily:F.title}}>
                        {s.val>=0?"+":""}{s.val.toLocaleString("fr-FR",{minimumFractionDigits:2})} €
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
            {/* Transaction list */}
            <div style={{overflowY:"auto",flex:1,padding:"8px 0"}}>
              {transactions.length===0?(
                <div style={{padding:24,textAlign:"center",color:C.muted,fontFamily:F.body,fontSize:13}}>
                  Aucune transaction
                </div>
              ):transactions.map(tx=>{
                const isIn=tx.type==="revenu";
                const typeColors={revenu:C.green,achat:C.terra,salaire:C.navy};
                const typeIcons={revenu:"💶",achat:"🛒",salaire:"💸"};
                const c=typeColors[tx.type]||C.muted;
                const d=new Date(tx.date);
                const hm=d.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"});
                return(
                  <div key={tx.id} style={{display:"flex",alignItems:"flex-start",gap:12,
                    padding:"10px 22px",borderBottom:`1px solid ${C.border}11`}}>
                    <div style={{width:32,height:32,background:c+"18",border:`1px solid ${c}33`,
                      borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",
                      fontSize:15,flexShrink:0}}>
                      {typeIcons[tx.type]||"💰"}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12,fontWeight:600,color:C.ink,fontFamily:F.body,
                        whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                        {tx.label}
                      </div>
                      <div style={{fontSize:10,color:C.muted,fontFamily:F.body,marginTop:2}}>
                        {hm} · {tx.type}
                      </div>
                    </div>
                    <div style={{fontSize:13,fontWeight:700,color:isIn?C.green:C.red,
                      fontFamily:F.title,flexShrink:0}}>
                      {isIn?"+":"-"}{tx.amount.toLocaleString("fr-FR",{minimumFractionDigits:2})} €
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modale confirmation reset */}
      {showResetModal&&(
        <div onClick={()=>setShowResetModal(false)} style={{position:"fixed",inset:0,
          background:"rgba(0,0,0,0.55)",zIndex:10001,
          display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div onClick={e=>e.stopPropagation()} style={{background:C.surface,borderRadius:18,
            padding:28,width:"100%",maxWidth:380,
            boxShadow:"0 24px 60px rgba(0,0,0,0.3)",textAlign:"center"}}>
            <div style={{fontSize:40,marginBottom:12}}>⚠️</div>
            <div style={{fontSize:18,fontWeight:700,color:C.ink,fontFamily:F.title,marginBottom:8}}>
              Nouvelle partie ?
            </div>
            <div style={{fontSize:13,color:C.muted,fontFamily:F.body,marginBottom:24,lineHeight:1.6}}>
              Toute la progression sera effacée.<br/>
              Cette action est <strong>irréversible</strong>.
            </div>
            <div style={{display:"flex",gap:10,justifyContent:"center"}}>
              <button onClick={()=>setShowResetModal(false)} style={{
                padding:"10px 22px",borderRadius:9,border:`1.5px solid ${C.border}`,
                background:C.bg,color:C.muted,cursor:"pointer",
                fontSize:13,fontWeight:600,fontFamily:F.body}}>
                Annuler
              </button>
              <button onClick={doReset} style={{
                padding:"10px 22px",borderRadius:9,border:"none",
                background:C.red,color:"#fff",cursor:"pointer",
                fontSize:13,fontWeight:700,fontFamily:F.body,
                boxShadow:`0 4px 14px ${C.red}55`}}>
                🗑 Recommencer
              </button>
            </div>
          </div>
        </div>
      )}

      {showSummary&&(
        <DailySummaryModal
          onClose={()=>setShowSummary(false)}
          dailyStats={dailyStats}
          objStats={objStats}
          servers={servers}
          menu={menu}
          transactions={transactions}
          isRecord={summaryIsRecord}/>
      )}

      <Toasts list={toasts} onDismiss={dismissToast} onNavigate={setTab}/>
    </div>
  );
}
