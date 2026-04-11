import { useState, useEffect, useCallback, useRef } from "react";

// ── Services ───────────────────────────────────────────
import { saveGame, loadGame, SAVE_KEY } from "./src/services/persistence.js";
import { sendToGDevelop, buildGDevelopPayload, sanitizeSave } from "./src/services/gdevelopBridge.js";

// ── Données serveurs ───────────────────────────────────
import { SRV_SPECIALTIES, pickSpecialty, TRAINING_CATALOG, getMaxMoral } from "./src/constants/serverData.js";

// ── Composants supplémentaires ─────────────────────────
import { BankModal }         from "./src/components/system/BankModal.jsx";
import { HelpModal }         from "./src/components/system/HelpModal.jsx";
import { DailySummaryModal } from "./src/components/DailySummaryModal.jsx";
import { useBreakpoint, rVal, rGrid } from "./src/hooks/useBreakpoint.js";

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
  TABLES0, SERVERS0, STOCK0, MENU0, PREMIUM_STOCK, COMPLAINTS0, KITCHEN0,
  KITCHEN_UPGRADES, SUPPLIERS, LOAN_OPTIONS,
  CHALLENGES_POOL, OBJECTIVES_DEF, SERIES_LABELS, SERIES_COLORS,
  GAME_EVENTS, TABS,
} from "./src/constants/gameData.js";

import {
  REP_THRESHOLDS, REP_DELTA, FORMULA_PRESETS,
  MORAL_PAUSE_GAIN, getRepTier,
} from "./src/constants/gameConstants.js";

// ── Logique pure ───────────────────────────────────────
import {
  srvLv, chefLv, chefLvData, commisLv, commisLvData, restoLv,
  dishCookTime, dishCookTimeWithUpgrades,
  calcRating, ratingColor, ratingStars,
  calcTip, srvXpFromCheckout, restoXpFromCheckout,
} from "./src/utils/levelUtils.js";

import {
  pick, rName, rMood, rSize, pickSeeded,
  generateOrder, generateOrderWithSpecials,
} from "./src/utils/randomUtils.js";

import {
  consumeStock, buildKitchenTickets,
  svcDuration, eatDuration, calcBill, quickAmounts,
} from "./src/utils/orderUtils.js";

// ── Hooks métier ───────────────────────────────────────
import { useGameClock, PHASES, REAL_DAY_MS, getPhase, realMsToGameTime } from "./src/hooks/useGameClock.js";
import { useSpawner }     from "./src/hooks/useSpawner.js";
import { useExpiry }      from "./src/hooks/useExpiry.js";
import { useSalary }      from "./src/hooks/useSalary.js";
import { useDeliveries }  from "./src/hooks/useDeliveries.js";
import { useEvents }      from "./src/hooks/useEvents.js";
import { useServerMoral } from "./src/hooks/useServerMoral.js";
import { useFreshness }   from "./src/hooks/useFreshness.js";
import { useChallenges }  from "./src/hooks/useChallenges.js";
import { useObjectives }  from "./src/hooks/useObjectives.js";

// ── Composants UI ──────────────────────────────────────
import { Badge, Card, Btn, Inp, Sel, Lbl, XpBar, Modal } from "./src/components/ui/index.js";
import { Toasts } from "./src/components/system/Toasts.jsx";
import { IntroDialog, TablesDialog, ServersDialog, BankDialog, StatsDialog, ObjectivesDialog, StockDialog, MenuDialog, KitchenDialog } from "./src/components/IntroDialog.jsx";
import { LevelUpModal } from "./src/components/LevelUpModal.jsx";
import { QueueBar }    from "./src/components/QueueBar.jsx";

// ── Vues ───────────────────────────────────────────────
import { TablesView }     from "./src/views/TablesView.jsx";
import { ServersView }    from "./src/views/ServersView.jsx";
import { KitchenView }    from "./src/views/KitchenView.jsx";
import { MenuView }       from "./src/views/MenuView.jsx";
import { StockView }      from "./src/views/StockView.jsx";
import { ComplaintsView } from "./src/views/ComplaintsView.jsx";
import { StatsView }      from "./src/views/StatsView.jsx";
import { ObjectivesView } from "./src/views/ObjectivesView.jsx";

export default function App(){
  const bp=useBreakpoint();
  const _today = new Date().toLocaleDateString("fr-FR");

  /* ── Dialogues tutoriels (premier lancement) ── */
  const [showIntro, setShowIntro] = useState(()=>{
    try { return !localStorage.getItem("intro_seen"); } catch(e) { return false; }
  });
  const [showTablesTutorial, setShowTablesTutorial] = useState(false);

  const handleIntroDone = () => {
    try { localStorage.setItem("intro_seen", "1"); } catch(e) {}
    setShowIntro(false);
    // Enchaîner avec le tutoriel Tables si jamais vu
    try {
      if (!localStorage.getItem("tables_tutorial_seen")) {
        setTimeout(() => setShowTablesTutorial(true), 400);
      }
    } catch(e) {}
  };

  const handleTablesTutorialDone = () => {
    try { localStorage.setItem("tables_tutorial_seen", "1"); } catch(e) {}
    setShowTablesTutorial(false);
  };

  /* ── États principaux — initialisés avec les valeurs par défaut ── */
  /* La sauvegarde est chargée de façon asynchrone dans le useEffect  */
  const [isLoaded, setIsLoaded] = useState(false);
  const [tab,setTab]=useState("tables");

  /* ── Tutoriel Serveurs (déclenché à la première visite de l'onglet) ── */
  const [showServersTutorial, setShowServersTutorial] = useState(false);
  useEffect(()=>{
    if(tab === "servers" && isLoaded){
      try {
        if(!localStorage.getItem("servers_tutorial_seen")){
          setShowServersTutorial(true);
        }
      } catch(e) {}
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[tab]);
  const handleServersTutorialDone = () => {
    try { localStorage.setItem("servers_tutorial_seen", "1"); } catch(e) {}
    setShowServersTutorial(false);
  };

  /* ── Tutoriel Statistiques (déclenché à la première visite de l'onglet) ── */
  const [showStatsTutorial, setShowStatsTutorial] = useState(false);
  useEffect(()=>{
    if(tab === "stats" && isLoaded){
      try {
        if(!localStorage.getItem("stats_tutorial_seen")){
          setShowStatsTutorial(true);
        }
      } catch(e) {}
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[tab]);
  const handleStatsTutorialDone = () => {
    try { localStorage.setItem("stats_tutorial_seen", "1"); } catch(e) {}
    setShowStatsTutorial(false);
  };

  /* ── Tutoriel Objectifs (déclenché à la première visite de l'onglet) ── */
  const [showObjectivesTutorial, setShowObjectivesTutorial] = useState(false);
  useEffect(()=>{
    if(tab === "objectives" && isLoaded){
      try {
        if(!localStorage.getItem("objectives_tutorial_seen")){
          setShowObjectivesTutorial(true);
        }
      } catch(e) {}
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[tab]);
  const handleObjectivesTutorialDone = () => {
    try { localStorage.setItem("objectives_tutorial_seen", "1"); } catch(e) {}
    setShowObjectivesTutorial(false);
  };

  /* ── Tutoriel Stock (déclenché à la première visite de l'onglet) ── */
  const [showStockTutorial, setShowStockTutorial] = useState(false);
  useEffect(()=>{
    if(tab === "stock" && isLoaded){
      try {
        if(!localStorage.getItem("stock_tutorial_seen")){
          setShowStockTutorial(true);
        }
      } catch(e) {}
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[tab]);
  const handleStockTutorialDone = () => {
    try { localStorage.setItem("stock_tutorial_seen", "1"); } catch(e) {}
    setShowStockTutorial(false);
  };

  /* ── Tutoriel Menu (déclenché à la première visite de l'onglet) ── */
  const [showMenuTutorial, setShowMenuTutorial] = useState(false);
  useEffect(()=>{
    if(tab === "menu" && isLoaded){
      try {
        if(!localStorage.getItem("menu_tutorial_seen")){
          setShowMenuTutorial(true);
        }
      } catch(e) {}
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[tab]);
  const handleMenuTutorialDone = () => {
    try { localStorage.setItem("menu_tutorial_seen", "1"); } catch(e) {}
    setShowMenuTutorial(false);
  };

  /* ── Tutoriel Cuisine (déclenché à la première visite de l'onglet) ── */
  const [showKitchenTutorial, setShowKitchenTutorial] = useState(false);
  useEffect(()=>{
    if(tab === "cuisine" && isLoaded){
      try {
        if(!localStorage.getItem("kitchen_tutorial_seen")){
          setShowKitchenTutorial(true);
        }
      } catch(e) {}
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[tab]);
  const handleKitchenTutorialDone = () => {
    try { localStorage.setItem("kitchen_tutorial_seen", "1"); } catch(e) {}
    setShowKitchenTutorial(false);
  };
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
  const [levelUpData,setLevelUpData]=useState(null);
  const [showBankTutorial,setShowBankTutorial]=useState(false);
  const openBank = () => {
    setShowBank(true);
    try {
      if(!localStorage.getItem("bank_tutorial_seen")){
        localStorage.setItem("bank_tutorial_seen","1");
        setTimeout(()=>setShowBankTutorial(true),300);
      }
    } catch(e) {}
  };
  const handleBankTutorialDone = () => setShowBankTutorial(false);
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
  const [candidatePool,setCandidatePool]=useState([]);
  const [candidateDate,setCandidateDate]=useState("");
  const [commisPool,setCommisPool]=useState([]);
  const [commisPoolDate,setCommisPoolDate]=useState("");
  // Moteur de temps simulé — timestamp réel du début de la journée courante
  const [dayStartRealMs,setDayStartRealMs]=useState(()=>{
    try{const v=parseInt(localStorage.getItem("day_start")||"0");return v>0?v:Date.now();}
    catch(e){return Date.now();}
  });
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
  const [seenIds,setSeenIds]=useState(new Set());
  const summaryShownRef=useRef(false);

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
        if(sv.candidatePool) setCandidatePool(sv.candidatePool);
        if(sv.candidateDate) setCandidateDate(sv.candidateDate);
        if(sv.dayStartRealMs>0) setDayStartRealMs(sv.dayStartRealMs);
        setQueue(sv.queue||[]);
      }
      setIsLoaded(true);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);
  const dismissToast=useCallback(id=>setToasts(p=>p.filter(x=>x.id!==id)),[]);
  const addToast=useCallback(t=>{
    const id=Date.now()+Math.random();
    setToasts(p=>[...p.slice(-4),{...t,id}]);
    setTimeout(()=>setToasts(p=>p.filter(x=>x.id!==id)),4000);
  },[]);

  const addTx=useCallback((type,label,amount)=>{
    setTransactions(p=>[{id:Date.now()+Math.random(),type,label,amount:+Math.abs(amount).toFixed(2),date:Date.now()},...p].slice(0,200));
  },[]);

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



  const [showHelp,setShowHelp]=useState(false);

  /* ── Réputation ────────────────────────────────────── */


  /* ── Sauvegarde automatique : dirty flag + interval 5s ─ */
  const isDirtyRef = useRef(false);

  // Marquer dirty dès qu'une variable significative change
  useEffect(()=>{
    if(!isLoaded) return;
    isDirtyRef.current = true;
  },[isLoaded,tables,servers,menu,stock,complaints,kitchen,
     restoXp,cash,loan,supplierMode,pendingDeliveries,
     completedIds,challengeProgress,challengeClaimed,
     challengeLostToday,pendingClaim,objStats,dailyStats,reputation,
     formulas]);

  // Toutes les 5s : sauvegarder si dirty
  useEffect(()=>{
    if(!isLoaded) return;
    const interval = setInterval(()=>{
      if(!isDirtyRef.current) return;
      isDirtyRef.current = false;
      setSaveStatus("saving");
      saveGame({
        tables,servers,menu,stock,complaints,kitchen,
        restoXp,cash,transactions,loan,supplierMode,
        pendingDeliveries,dailySpecials,completedIds,
        challengeDate,todayChallenges,challengeProgress,
        challengeClaimed,challengeLostToday,pendingClaim,
        objStats,dailyStats,reputation,formulas,
        candidatePool,candidateDate,
        dayStartRealMs,
      });
      setSaveStatus("saved");
      setTimeout(()=>setSaveStatus("idle"),2000);
    }, 5000);
    return()=>clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[isLoaded]);

  /* ── GDevelop : écoute du message d'initialisation ─── */
  useEffect(()=>{
    const handler = (event) => {
      // Accepter uniquement les messages venant de GDevelop
      if (!event.data || event.data.source !== "gdevelop") return;
      const { type, payload } = event.data;

      if (type === "INIT" && payload) {
        // GDevelop peut sauvegarder soit le payload SYNC complet (données brutes dans payload.saveData)
        // soit directement le saveData. On cherche saveData en priorité.
        const raw = payload.saveData ?? payload;
        const sv  = sanitizeSave(raw);
        if (sv.argent        != null) setCash(sv.argent);
        if (sv.restoXp       != null) setRestoXp(sv.restoXp);
        if (sv.stock)                 setStock(sv.stock);
        if (sv.servers)               setServers(sv.servers);
        if (sv.tables)                setTables(sv.tables);
        if (sv.kitchen)               setKitchen(sv.kitchen);
        if (sv.objStats)              setObjStats(sv.objStats);
        if (sv.dailyStats)            setDailyStats(sv.dailyStats);
        if (sv.completedIds)          setCompletedIds(sv.completedIds);
        if (sv.challengeProgress)     setChallengeProgress(sv.challengeProgress);
        if (sv.loan          != null) setLoan(sv.loan);
        if (sv.reputation    != null) setReputation(sv.reputation);
        if (sv.transactions)          setTransactions(sv.transactions);
        if (sv.pendingDeliveries)     setPendingDeliveries(sv.pendingDeliveries);
        if (sv.pendingClaim)          setPendingClaim(sv.pendingClaim);
        if (sv.challengeClaimed)      setChallengeClaimed(sv.challengeClaimed);
        if (sv.challengeLostToday != null) setChallengeLostToday(sv.challengeLostToday);
        if (sv.activeEvent   != null) setActiveEvent(sv.activeEvent);
        if (sv.candidatePool)         setCandidatePool(sv.candidatePool);
        if (sv.candidateDate)         setCandidateDate(sv.candidateDate);
        if (sv.dayStartRealMs > 0)    setDayStartRealMs(sv.dayStartRealMs);
        setQueue(sv.queue || []);
        console.info("[GDevelop Bridge] Init reçu ✓ (source:", payload.saveData?"saveData":"payload direct",")", sv);
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

  /* ── GDevelop : sync interval 2s (ref toujours à jour) ── */
  const gdSyncStateRef = useRef({});
  useEffect(()=>{
    gdSyncStateRef.current = {
      cash, restoXp, stock, queue, waitlist, tables, kitchen, objStats, servers, dailyStats,
      reputation, transactions, loan, pendingDeliveries, menu, complaints, supplierMode,
      formulas, dailySpecials, challengeDate,
      completedIds, pendingClaim, todayChallenges, challengeProgress,
      challengeClaimed, challengeLostToday, activeEvent,
      candidatePool, candidateDate,
      dayStartRealMs,
    };
  },[cash, restoXp, stock, queue, waitlist, tables, kitchen, objStats, servers, dailyStats,
     reputation, transactions, loan, pendingDeliveries, menu, complaints, supplierMode,
     formulas, dailySpecials, challengeDate,
     completedIds, pendingClaim, todayChallenges, challengeProgress,
     challengeClaimed, challengeLostToday, activeEvent,
     candidatePool, candidateDate, dayStartRealMs]);

  useEffect(()=>{
    if (!isLoaded) return;
    const interval = setInterval(()=>{
      const payload = buildGDevelopPayload(gdSyncStateRef.current);
      sendToGDevelop({ type: "SYNC", ...payload });
    }, 2000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[isLoaded]);


  /* ── Refs pour hooks asynchrones ─────────────────── */
  const stockRef      = useRef(stock);
  const cashRef       = useRef(cash);
  const complaintsRef = useRef(complaints);
  const repRef        = useRef(reputation);
  const tablesRef     = useRef(tables);
  const serversRef    = useRef(servers);
  const queueRef      = useRef(queue);
  const kitchenRef    = useRef(kitchen);
  const restoLvRef    = useRef(0);
  const lastSpawnRef  = useRef(Date.now());

  useEffect(() => { stockRef.current      = stock;      }, [stock]);
  useEffect(() => { cashRef.current       = cash;       }, [cash]);
  useEffect(() => { complaintsRef.current = complaints; }, [complaints]);
  useEffect(() => { repRef.current        = reputation; }, [reputation]);
  useEffect(() => { tablesRef.current     = tables;     }, [tables]);
  useEffect(() => { serversRef.current    = servers;    }, [servers]);
  useEffect(() => { queueRef.current      = queue;      }, [queue]);
  useEffect(() => { kitchenRef.current    = kitchen;    }, [kitchen]);
  useEffect(() => { restoLvRef.current    = restoLv(restoXp).l; }, [restoXp]);

  /* ── Horloge de jeu ────────────────────────────────── */
  const { clockNow, gameTime, phase, isDayOver } = useGameClock(dayStartRealMs);

  // Ref stable pour les hooks setInterval (évite les closures périmées)
  const phaseRef = useRef(phase);
  useEffect(()=>{ phaseRef.current = phase; }, [phase]);

  // Fin de journée (00h00 simulée) → afficher le bilan
  useEffect(()=>{
    if(!isLoaded||!isDayOver||summaryShownRef.current) return;
    summaryShownRef.current=true;
    const today=dailyStats[dailyStats.length-1];
    const isRecord=today&&today.revenue>prevRevenueRef.current&&today.revenue>0;
    setSummaryIsRecord(isRecord);
    setObjStats(s=>s._hadLoss?s:{...s,perfectDays:(s.perfectDays||0)+1});
    setShowSummary(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[isDayOver, isLoaded]);

  // Lancer une nouvelle journée (bouton dans DailySummaryModal)
  const startNewDay = useCallback(()=>{
    const now=Date.now();
    try{localStorage.setItem("day_start",String(now));}catch(e){}
    setDayStartRealMs(now);
    summaryShownRef.current=false;
    setShowSummary(false);
  },[]);

  useSpawner    ({ setQueue, tablesRef, queueRef, restoLvRef, lastSpawnRef, repRef, getRepTier, addToast, phaseRef });
  useExpiry     ({ setQueue, setWaitlist, setTables, setServers, addToast, addDayStat });

  /* ── Auto-assign serveur pour le nettoyage des tables ── */
  useEffect(() => {
    const iv = setInterval(() => {
      const curTables  = tablesRef.current;
      const curServers = serversRef.current;
      const waiting = curTables.filter(t => t.status === "nettoyage" && !t.cleanUntil);
      if (waiting.length === 0) return;
      const freeSrv = curServers.find(s => s.status === "actif" && (s.moral ?? 100) > 10);
      if (!freeSrv) return;
      const tbl = waiting[0];
      const cleanDur = tbl.cleanDur || 60;
      const cleanEnd = Date.now() + cleanDur * 1000;
      setTables(p => p.map(t => t.id !== tbl.id ? t : { ...t, cleanUntil: cleanEnd, cleanServer: freeSrv.id }));
      setServers(p => p.map(s => s.id !== freeSrv.id ? s : { ...s, status: "nettoyage", cleanUntil: cleanEnd }));
    }, 500);
    return () => clearInterval(iv);
  }, [setTables, setServers]);
  useSalary     ({ setServers, setKitchen, setCash, setLoan, addTx, addToast });
  useDeliveries ({ setPendingDeliveries, setStock, addToast });
  useFreshness  ({ stockRef, kitchenRef, setStock, setComplaints, addToast });
  useEvents     ({
    stockRef, cashRef, complaintsRef, tablesRef, serversRef,
    setStock, setComplaints, setQueue, setCash,
    setTables, setServers, setKitchen,
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
        setTimeout(()=>setLevelUpData(nd), 50);
        // Débloquer les plats dont unlockLevel correspond au nouveau niveau
        const newlyUnlocked=MENU0.filter(
          d=>(d.unlockLevel??0)>before.l&&(d.unlockLevel??0)<=after.l
        );
        const neededStockIds=new Set(
          newlyUnlocked.flatMap(d=>(d.ingredients||[]).map(i=>i.stockId))
        );
        const premiumToAdd=PREMIUM_STOCK.filter(p=>neededStockIds.has(p.id));
        if(premiumToAdd.length>0){
          setStock(s=>{
            const existing=new Set(s.map(item=>item.id));
            const toAdd=premiumToAdd.filter(p=>!existing.has(p.id));
            return toAdd.length>0?[...s,...toAdd]:s;
          });
        }
        const unlockedNames=newlyUnlocked.map(d=>d.name).join(", ");
        setTimeout(()=>addToast({
          icon:nd.icon,
          title:`Niveau ${nd.l} — ${nd.name} !`,
          msg:`🎉 ${nd.tables} tables débloquées${unlockedNames?` · 🍽 ${unlockedNames}`:""}`,
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

  /* ── Dérivés (calculés à chaque render) ─────────────── */
  const sAlerts    = stock.filter(s => s.qty <= s.alert).length;
  const nCompl     = complaints.filter(c => c.status === "nouveau" && !seenIds.has(c.id)).length;
  const nPending   = pendingClaim.length;
  const repTier    = getRepTier(reputation);


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
        @keyframes bankPulse    { 0%,100%{box-shadow:0 2px 10px rgba(160,108,8,0.4);transform:scale(1)} 50%{box-shadow:0 2px 18px rgba(160,108,8,0.7);transform:scale(1.04)} }
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
          .content-area { padding: 12px var(--pad) 60px !important; }
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
          .content-area { padding: 16px var(--pad) 60px !important; }
          .hide-tablet { display: none !important; }
          .resp-grid { grid-template-columns: 1fr 1fr !important; }
          .resp-grid-3 { grid-template-columns: 1fr 1fr !important; }
        }
        @media (min-width: 1024px) {
          .desktop-nav { display: flex !important; }
          .mobile-nav  { display: none !important; }
          .content-area { padding: 20px var(--pad) 60px !important; }
          .show-mobile { display: none !important; }
        }
      `}</style>

      {/* Header + Nav — sticky top */}
      <div style={{position:"sticky",top:0,zIndex:1000,background:C.surface}}>

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
            {/* Horloge — temps de jeu simulé + phase */}
            <div style={{
              textAlign:"right",flexShrink:0,
              background:C.bg,border:`1px solid ${phase?.color||C.border}44`,
              borderRadius:8,padding:"3px 9px",
            }}>
              <div style={{fontSize:16,fontWeight:800,color:phase?.color||C.ink,fontFamily:F.title,lineHeight:1.1,letterSpacing:"-0.02em"}}>
                {phase?.icon} {gameTime.str}
              </div>
              <div style={{fontSize:8,color:C.muted,whiteSpace:"nowrap",marginTop:1}}>
                {phase?.label} · {activeTables.filter(t=>t.status==="occupée"||t.status==="mange").length}/{activeTables.length} tables
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
            <span style={{fontSize:9,color:C.muted,fontFamily:F.body,whiteSpace:"nowrap"}}>
              {rl.l>=RESTO_LVL.length-1?"✦ Max":`${restoXp}/${rl.next.xpNeeded} XP`}
            </span>
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

          {/* Loan indicator + bank button */}
          <div style={{display:"flex",alignItems:"center",gap:5,flexShrink:0}}>
            {loan&&(
              <div style={{background:C.amberP,border:`1px solid ${C.amber}44`,borderRadius:6,
                padding:"3px 8px",fontSize:10,color:C.amber,fontWeight:600,whiteSpace:"nowrap"}}>
                🏦 −{loan.remaining.toFixed(0)}€
              </div>
            )}
            <button onClick={openBank} title="Banque" style={{
              padding:"6px 12px",fontSize:12,fontWeight:700,
              background:loan?C.amber:C.navy,
              border:"none",
              borderRadius:8,color:"#fff",cursor:"pointer",
              fontFamily:F.body,display:"flex",alignItems:"center",gap:5,whiteSpace:"nowrap",
              boxShadow:loan?`0 2px 10px ${C.amber}66`:`0 2px 10px ${C.navy}44`,
              animation:loan?"bankPulse 2s ease-in-out infinite":"none"}}>
              🏦 Banque
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
                objStats,dailyStats,reputation,formulas,
                candidatePool,candidateDate,
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
            <span style={{fontSize:11,fontWeight:700,color:"#fff",whiteSpace:"nowrap",
              display:"inline-block",minWidth:"72px",textAlign:"center"}}>
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
            const val=ch.key==="noLoss"?(!challengeLostToday&&(challengeProgress.served||0)>=1?1:0):
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

      {/* Nav Mobile — fixe en haut (dans le wrapper sticky) */}
      <div className="mobile-nav" style={{
        background:C.surface,
        borderBottom:`1px solid ${C.border}`,
        boxShadow:"0 2px 8px rgba(23,18,14,0.07)",
        justifyContent:"space-around",alignItems:"stretch",
        paddingTop:"env(safe-area-inset-top,0px)",
      }}>
        {TABS.map(t=>{
          const readyChallenges=(todayChallenges||[]).filter(ch=>{
            const val=ch.key==="noLoss"?(!challengeLostToday&&(challengeProgress.served||0)>=1?1:0):(challengeProgress[ch.key]||0);
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
              padding:"7px 2px 8px",
              cursor:"pointer",position:"relative",
              borderBottom:active?`2.5px solid ${C.green}`:"2.5px solid transparent",
              gap:3,
              transition:"background 0.15s",
            }}>
              <div style={{
                width:34,height:26,
                display:"flex",alignItems:"center",justifyContent:"center",
                borderRadius:9,
                background:active?C.green+"14":"transparent",
                transition:"background 0.15s",
              }}>
                <span style={{
                  fontSize:17,lineHeight:1,
                  filter:active?"none":"grayscale(0.5) opacity(0.55)",
                  transition:"filter 0.15s",
                }}>{t.icon}</span>
              </div>
              <span style={{
                fontSize:9,fontWeight:active?700:400,fontFamily:F.body,
                color:active?C.green:C.muted,
                whiteSpace:"nowrap",letterSpacing:"0.01em",lineHeight:1,
              }}>{t.label}</span>
              {badge>0&&(
                <span style={{
                  position:"absolute",top:4,right:"calc(50% - 18px)",
                  background:C.red,color:"#fff",borderRadius:"50%",
                  width:15,height:15,fontSize:8,fontWeight:800,
                  display:"inline-flex",alignItems:"center",justifyContent:"center",
                  boxShadow:`0 1px 4px ${C.red}55`,animation:"popIn 0.3s ease",
                }}>{badge}</span>
              )}
            </button>
          );
        })}
      </div>

      </div>{/* fin wrapper sticky */}

      {/* Content */}
      <div className="content-area" style={{maxWidth:bp.isDesktop?1300:undefined,margin:"0 auto"}}>
        <div key={tab} style={{animation:"tabSlide 0.2s ease both"}}>
        {tab==="tables"     &&<TablesView     tables={activeTables} setTables={setTables}   servers={servers} setServers={setServers} menu={menu} setMenu={setMenu} setKitchen={setKitchen} kitchen={kitchen} addToast={addToast} addRestoXp={addRestoXp} cash={cash} setCash={setCash} addTx={addTx} queue={queue} setQueue={setQueue} waitlist={waitlist} setWaitlist={setWaitlist} addDayStat={addDayStat} clockNow={clockNow} onTableUpgrade={()=>setObjStats(s=>({...s,tablesUpgraded:s.tablesUpgraded+1}))} setComplaints={setComplaints} dailySpecials={dailySpecials} activeEvent={activeEvent} setChallengeProgress={setChallengeProgress} reputation={reputation} updateReputation={updateReputation} restoLvN={rl.l} stock={stock} bp={bp}/>}
        {tab==="servers"    &&<ServersView    servers={servers} setServers={setServers} tables={activeTables} clockNow={clockNow} restoLvN={rl.l} cash={cash} setCash={setCash} addTx={addTx} addToast={addToast} candidatePool={candidatePool} setCandidatePool={setCandidatePool} candidateDate={candidateDate} setCandidateDate={setCandidateDate} bp={bp}/>}
        {tab==="cuisine"    &&<KitchenView    kitchen={kitchen}     setKitchen={setKitchen}  stock={stock} setStock={setStock} tables={activeTables} setTables={setTables} servers={servers} setServers={setServers} addToast={addToast} cash={cash} setCash={setCash} addTx={addTx} restoLvN={rl.l} commisPool={commisPool} setCommisPool={setCommisPool} commisPoolDate={commisPoolDate} setCommisPoolDate={setCommisPoolDate} bp={bp}/>}
        {tab==="menu"       &&<MenuView       menu={menu} setMenu={setMenu} stock={stock} formulas={formulas} setFormulas={setFormulas} dailyStats={dailyStats} bp={bp}/>}
        {tab==="stock"      &&<StockView      stock={stock} setStock={setStock} cash={cash} setCash={setCash} addTx={addTx} kitchen={kitchen} supplierMode={supplierMode} setSupplierMode={setSupplierMode} pendingDeliveries={pendingDeliveries} setPendingDeliveries={setPendingDeliveries} menu={menu} bp={bp}/>}
        {tab==="objectives" &&<ObjectivesView objStats={objStats} completedIds={completedIds} onClaim={claimObjective} pendingClaim={pendingClaim} todayChallenges={todayChallenges} challengeProgress={challengeProgress} challengeClaimed={challengeClaimed} setChallengeClaimed={setChallengeClaimed} challengeLostToday={challengeLostToday} setCash={setCash} addTx={addTx} addRestoXp={addRestoXp} addToast={addToast} restoXp={restoXp} restoLvN={rl.l} bp={bp}/>}
        {tab==="complaints" &&<ComplaintsView complaints={complaints} setComplaints={setComplaints} tables={activeTables} servers={servers} seenIds={seenIds}/>}
        {tab==="stats"      &&<StatsView dailyStats={dailyStats} loan={loan} objStats={objStats} restoXp={restoXp} kitchen={kitchen} servers={servers} reputation={reputation} transactions={transactions} menu={menu} bp={bp}/>}
        </div>
      </div>

      {/* Barre file d'attente + cash — toujours visible */}
      {isLoaded && (
        <QueueBar
          queue={queue}
          cash={cash}
          onTabChange={setTab}
          isMobile={bp.isMobile}
          onOpenBank={()=>setShowLedger(true)}
        />
      )}


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
          onClose={startNewDay}
          dailyStats={dailyStats}
          objStats={objStats}
          servers={servers}
          menu={menu}
          transactions={transactions}
          isRecord={summaryIsRecord}/>
      )}

      <Toasts list={toasts} onDismiss={dismissToast} onNavigate={setTab}/>

      {/* Dialogues tutoriels — affichés une seule fois chacun */}
      {levelUpData && <LevelUpModal levelData={levelUpData} onClose={()=>setLevelUpData(null)}/>}
      {showBankTutorial                  && <BankDialog    onDone={handleBankTutorialDone}/>}
      {showIntro            && isLoaded && <IntroDialog   onDone={handleIntroDone}/>}
      {showTablesTutorial   && isLoaded && <TablesDialog  onDone={handleTablesTutorialDone}/>}
      {showServersTutorial     && isLoaded && <ServersDialog    onDone={handleServersTutorialDone}/>}
      {showStatsTutorial       && isLoaded && <StatsDialog      onDone={handleStatsTutorialDone}/>}
      {showObjectivesTutorial  && isLoaded && <ObjectivesDialog onDone={handleObjectivesTutorialDone}/>}
      {showStockTutorial       && isLoaded && <StockDialog      onDone={handleStockTutorialDone}/>}
      {showMenuTutorial     && isLoaded && <MenuDialog    onDone={handleMenuTutorialDone}/>}
      {showKitchenTutorial  && isLoaded && <KitchenDialog onDone={handleKitchenTutorialDone}/>}
    </div>
  );
}
