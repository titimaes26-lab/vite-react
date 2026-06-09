import { useState, useEffect, useCallback, useMemo, useRef, Component } from "react";
import { LangProvider, useLang } from "./src/i18n/index.jsx";
import { LanguageSelect } from "./src/components/LanguageSelect.jsx";

// ── Services ───────────────────────────────────────────
import { saveGame, loadGame, SAVE_KEY } from "./src/services/persistence.js";
import { sendToGDevelop, buildGDevelopPayload, sanitizeSave } from "./src/services/gdevelopBridge.js";
import { triggerAd } from "./src/services/adBridge.js";

// ── Données serveurs ───────────────────────────────────
import { SRV_SPECIALTIES, pickSpecialty, TRAINING_CATALOG, getMaxMoral } from "./src/constants/serverData.js";

// ── Composants supplémentaires ─────────────────────────
import { BankModal }           from "./src/components/system/BankModal.jsx";
import { HelpModal }           from "./src/components/system/HelpModal.jsx";
import { DailySummaryModal }   from "./src/components/DailySummaryModal.jsx";
import { useBreakpoint, rVal, rGrid } from "./src/hooks/useBreakpoint.js";
import { AppHeader }           from "./src/components/system/AppHeader.jsx";
import { LedgerModal }         from "./src/components/system/LedgerModal.jsx";
import { NotificationHistory } from "./src/components/system/NotificationHistory.jsx";
import { APP_STYLES }          from "./src/constants/appStyles.js";

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
import { ClockContext }   from "./src/contexts/ClockContext.jsx";
import { TablesView }     from "./src/views/TablesView.jsx";
import { ServersView }    from "./src/views/ServersView.jsx";
import { KitchenView }    from "./src/views/KitchenView.jsx";
import { MenuView }       from "./src/views/MenuView.jsx";
import { StockView }      from "./src/views/StockView.jsx";
import { ComplaintsView } from "./src/views/ComplaintsView.jsx";
import { StatsView }      from "./src/views/StatsView.jsx";
import { ObjectivesView } from "./src/views/ObjectivesView.jsx";

class TabErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, erroredTab: null };
    this.retry = this.retry.bind(this);
  }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) {
    this.setState(s => ({ ...s, erroredTab: this.props.tab }));
    console.error("[TabErrorBoundary] Crash dans l'onglet '" + this.props.tab + "':", error, info.componentStack);
  }
  componentDidUpdate(prevProps) {
    if (this.state.error && prevProps.tab !== this.props.tab && this.state.erroredTab !== this.props.tab) {
      this.setState({ error: null, erroredTab: null });
    }
  }
  retry() { this.setState({ error: null, erroredTab: null }); }
  render() {
    if (this.state.error) {
      return (
        <div style={{padding:24,color:"#c0392b",fontFamily:"monospace",background:"#fff8f8",border:"1px solid #c0392b",borderRadius:8,margin:16}}>
          <strong>Erreur dans cet onglet</strong>
          <pre style={{marginTop:8,fontSize:11,whiteSpace:"pre-wrap"}}>{String(this.state.error)}</pre>
          <button onClick={this.retry} style={{marginTop:12,padding:"4px 12px",cursor:"pointer",borderRadius:4}}>Réessayer</button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <LangProvider>
      <AppContent />
    </LangProvider>
  );
}

function AppContent(){
  const { lang, t: tl } = useLang();
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
  const [toastHistory,setToastHistory]=useState([]);
  const [toastUnread,setToastUnread]=useState(0);
  const [showToastHistory,setShowToastHistory]=useState(false);
  const [restoXp,setRestoXp]=useState(0);
  const [cash,setCash]=useState(5000);
  const [transactions,setTransactions]=useState([
    {id:0,type:"revenu",label:"Capital de départ",amount:5000,date:Date.now(),gameTime:"08h00"}
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
  const [supplierMode,setSupplierMode]=useState("normal");
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
  const [dailyStats,setDailyStats]=useState([{day:1,served:0,lost:0,revenue:0}]);
  const [reputation,setReputation]=useState(50); // 0–100

  /* ── Indicateur de sauvegarde ──────────────────────── */
  const [saveStatus,setSaveStatus]=useState("idle");
  const saveTimerRef=useRef(null);
  const [showResetModal,setShowResetModal]=useState(false);
  const [showSummary,setShowSummary]=useState(false);
  const [summaryIsRecord,setSummaryIsRecord]=useState(false);
  const [salarySummary,setSalarySummary]=useState(null);
  const prevRevenueRef=useRef(0);
  const resetDayRef=useRef(null);
  // Résumé de fin de journée : s'affiche après 10 min de jeu réel
  const [seenIds,setSeenIds]=useState(new Set());
  const summaryShownRef=useRef(false);
  const pausedRef     = useRef(false);
  const pauseStartRef = useRef(null);
  const [adWatching, setAdWatching] = useState(false);
  const [isGameOver,setIsGameOver]=useState(false);
  const salaryAccruedRef=useRef({ total: 0, perPerson: {} });

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
    setTransactions([{id:0,type:"revenu",label:"Capital de départ",amount:5000,date:Date.now(),gameTime:"08h00"}]);
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
    setDailyStats([{day:1,served:0,lost:0,revenue:0}]);
    setReputation(50);
    setWaitlist([]);
    setFormulas([]);
    setIsGameOver(false);
    salaryAccruedRef.current={ total: 0, perPerson: {} };
    setTab("tables");
    setShowResetModal(false);
    resetDayRef.current?.();
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
        if(sv.kitchen){
          const _unlockedC=CHEF_LVL[Math.min(chefLv(sv.kitchen.chef?.totalXp||0).l,CHEF_LVL.length-1)].commis;
          setKitchen({...sv.kitchen,commis:(sv.kitchen.commis||[]).slice(0,_unlockedC)});
        }
        if(sv.restoXp!=null) setRestoXp(sv.restoXp);
        if(sv.cash!=null)    setCash(sv.cash);
        if(sv.transactions)  setTransactions(sv.transactions);
        if(sv.loan!=null)    setLoan(sv.loan);
        const validModes=["rapide","normal","lowcost"];
        if(sv.supplierMode&&validModes.includes(sv.supplierMode)) setSupplierMode(sv.supplierMode);
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
        if(sv.dailyStats)    setDailyStats(sv.dailyStats.map((d,i)=>d.day!=null?d:{...d,day:i+1}).slice(-15));
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
    if(!t.silent){
      setToasts(p=>[...p.slice(-4),{...t,id}]);
      setTimeout(()=>setToasts(p=>p.filter(x=>x.id!==id)),4000);
    }
    setToastHistory(p=>[{...t,id,at:gameTimeRef.current},...p].slice(0,100));
    setToastUnread(n=>n+1);
  },[]);

  const addTx=useCallback((type,label,amount)=>{
    setTransactions(p=>[{id:Date.now()+Math.random(),type,label,amount:+Math.abs(amount).toFixed(2),date:Date.now(),gameTime:gameTimeRef.current,gameDay:currentDayRef.current},...p].slice(0,200));
  },[]);

  useEffect(()=>{
    if(isLoaded && cash < 0) setIsGameOver(true);
  },[isLoaded, cash]);

  const onSalaryAccrue=useCallback((total, perPerson)=>{
    salaryAccruedRef.current.total+=total;
    Object.entries(perPerson).forEach(([k,v])=>{
      salaryAccruedRef.current.perPerson[k]=(salaryAccruedRef.current.perPerson[k]??0)+v;
    });
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
          silent:true,
        }),50);
      }
      repRef.current = next;
      return next;
    });
  },[addToast]);

  const addDayStat=useCallback((key,value=1)=>{
    setDailyStats(p=>{
      if(p.length===0) return [{day:1,served:0,lost:0,revenue:0,[key]:+value.toFixed(2)}];
      const updated=[...p];
      const idx=updated.length-1;
      updated[idx]={...updated[idx],[key]:+((updated[idx][key]??0)+value).toFixed(2)};
      return updated;
    });
    if(key==="served") setObjStats(s=>({...s,totalServed:s.totalServed+value}));
    if(key==="rating") setObjStats(s=>({...s,totalRating:(s.totalRating||0)+value,ratingCount:(s.ratingCount||0)+1}));
    if(key==="revenue") setObjStats(s=>({...s,totalRevenue:+(s.totalRevenue+value).toFixed(2)}));
    if(key==="lost"){
      setObjStats(s=>({...s,_hadLoss:true}));
      setChallengeLostToday(true);
      setChallengeProgress(p=>({...p,noLoss:0}));
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
  // Utilise gdSyncStateRef.current (toujours à jour) pour éviter la fermeture périmée
  useEffect(()=>{
    if(!isLoaded) return;
    const interval = setInterval(()=>{
      if(!isDirtyRef.current) return;
      isDirtyRef.current = false;
      setSaveStatus("saving");
      saveGame(gdSyncStateRef.current);
      setSaveStatus("saved");
      setTimeout(()=>setSaveStatus("idle"),2000);
    }, 5000);
    return()=>clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[isLoaded]);

  // Sauvegarde immédiate lors des actions critiques de fermeture
  useEffect(()=>{
    if(!isLoaded) return;
    const flush = () => {
      if(isDirtyRef.current) {
        isDirtyRef.current = false;
        saveGame(gdSyncStateRef.current);
      }
    };
    const onVisibility = () => { if(document.visibilityState === "hidden") flush(); };
    window.addEventListener("beforeunload", flush);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("beforeunload", flush);
      document.removeEventListener("visibilitychange", onVisibility);
    };
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
        if (sv.kitchen){
          const _unlockedC=CHEF_LVL[Math.min(chefLv(sv.kitchen.chef?.totalXp||0).l,CHEF_LVL.length-1)].commis;
          setKitchen({...sv.kitchen,commis:(sv.kitchen.commis||[]).slice(0,_unlockedC)});
        }
        if (sv.objStats)              setObjStats(sv.objStats);
        if (sv.dailyStats)            setDailyStats(sv.dailyStats.map((d,i)=>d.day!=null?d:{...d,day:i+1}).slice(-15));
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
  const waitlistRef   = useRef(waitlist);
  const kitchenRef    = useRef(kitchen);
  const loanRef       = useRef(loan);
  const restoLvRef    = useRef(0);
  const lastSpawnRef  = useRef(Date.now());
  const gameTimeRef   = useRef("08h00");
  const currentDayRef = useRef(1);

  useEffect(() => { stockRef.current      = stock;      }, [stock]);
  useEffect(() => { cashRef.current       = cash;       }, [cash]);
  useEffect(() => { complaintsRef.current = complaints; }, [complaints]);
  useEffect(() => { repRef.current        = reputation; }, [reputation]);
  useEffect(() => { tablesRef.current     = tables;     }, [tables]);
  useEffect(() => { serversRef.current    = servers;    }, [servers]);
  useEffect(() => { queueRef.current      = queue;      }, [queue]);
  useEffect(() => { waitlistRef.current   = waitlist;   }, [waitlist]);
  useEffect(() => { kitchenRef.current    = kitchen;    }, [kitchen]);
  useEffect(() => { loanRef.current       = loan;       }, [loan]);
  useEffect(() => { currentDayRef.current = dailyStats[dailyStats.length-1]?.day??1; }, [dailyStats]);
  useEffect(() => { restoLvRef.current    = restoLv(restoXp).l; }, [restoXp]);

  /* ── Pause lors des dialogues ───────────────────────── */
  const isDialogOpen = !!(showIntro||showTablesTutorial||showServersTutorial||showStatsTutorial||showObjectivesTutorial||showStockTutorial||showMenuTutorial||showKitchenTutorial||showBankTutorial);
  useEffect(() => {
    if (isDialogOpen) {
      pausedRef.current     = true;
      pauseStartRef.current = Date.now();
    } else if (pauseStartRef.current !== null) {
      pausedRef.current = false;
      const dur = Date.now() - pauseStartRef.current;
      pauseStartRef.current = null;
      if (dur > 100) {
        setTables(ts => ts.map(t => ({
          ...t,
          eatUntil:   t.eatUntil   ? t.eatUntil   + dur : null,
          cleanUntil: t.cleanUntil ? t.cleanUntil + dur : null,
          svcUntil:   t.svcUntil   ? t.svcUntil   + dur : null,
          placedAt:   t.placedAt   ? t.placedAt   + dur : null,
        })));
        setQueue(q => q.map(g => ({ ...g, expiresAt: g.expiresAt + dur })));
        setWaitlist(w => w.map(g => ({
          ...g,
          recallUntil: g.recallUntil ? g.recallUntil + dur : null,
        })));
        setServers(ss => ss.map(s => ({
          ...s,
          serviceUntil: s.serviceUntil ? s.serviceUntil + dur : null,
          cleanUntil:   s.cleanUntil   ? s.cleanUntil   + dur : null,
        })));
        setKitchen(k => ({
          ...k,
          cooking: (k.cooking ?? []).map(d => ({
            ...d,
            startedAt: d.startedAt ? d.startedAt + dur : null,
          })),
        }));
      }
    }
  }, [isDialogOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Pause pendant la pub ───────────────────────────── */
  useEffect(() => {
    if (adWatching) {
      pausedRef.current = true;
      pauseStartRef.current = Date.now();
    } else if (pauseStartRef.current !== null) {
      pausedRef.current = false;
      const dur = Date.now() - pauseStartRef.current;
      pauseStartRef.current = null;
      if (dur > 100) {
        setTables(ts => ts.map(t => ({
          ...t,
          eatUntil:   t.eatUntil   ? t.eatUntil   + dur : null,
          cleanUntil: t.cleanUntil ? t.cleanUntil + dur : null,
          svcUntil:   t.svcUntil   ? t.svcUntil   + dur : null,
          placedAt:   t.placedAt   ? t.placedAt   + dur : null,
        })));
        setQueue(q => q.map(g => ({ ...g, expiresAt: g.expiresAt + dur })));
        setWaitlist(w => w.map(g => ({
          ...g,
          recallUntil: g.recallUntil ? g.recallUntil + dur : null,
        })));
        setServers(ss => ss.map(s => ({
          ...s,
          serviceUntil: s.serviceUntil ? s.serviceUntil + dur : null,
          cleanUntil:   s.cleanUntil   ? s.cleanUntil   + dur : null,
        })));
        setKitchen(k => ({
          ...k,
          cooking: (k.cooking ?? []).map(d => ({
            ...d,
            startedAt: d.startedAt ? d.startedAt + dur : null,
          })),
        }));
      }
    }
  }, [adWatching]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Horloge de jeu ────────────────────────────────── */
  const { clockNow, gameTime, phase, isDayOver: clockIsDayOver, resetDay } = useGameClock(dayStartRealMs, pausedRef);
  gameTimeRef.current  = gameTime.str;
  resetDayRef.current  = resetDay;
  const tablesOccupied = tables.some(t=>t.status==="occupée"||t.status==="mange");
  const isDayOver      = (phase?.id==="fermeture"||clockIsDayOver)&&!tablesOccupied;

  // Ref stable pour les hooks setInterval (évite les closures périmées)
  const phaseRef = useRef(phase);
  useEffect(()=>{ phaseRef.current = phase; }, [phase]);

  // Fermeture : vider immédiatement la file d'attente et la waitlist
  useEffect(()=>{
    if(phase?.id==="fermeture"){
      setQueue([]);
      setWaitlist([]);
    }
  },[phase?.id]);

  // Fin de journée (00h00 simulée) → mensualité prêt + bilan
  useEffect(()=>{
    if(!isLoaded||!isDayOver||summaryShownRef.current) return;
    summaryShownRef.current=true;

    /* ── Mensualité quotidienne du prêt ─────────────────── */
    const ln = loanRef.current;
    if (ln) {
      const repay        = Math.min(ln.remaining, ln.repayPerDay);
      const newRemaining = +(ln.remaining - repay).toFixed(2);
      setCash(c => +Math.max(0, c - repay).toFixed(2));
      addTx("remboursement", `Mensualité prêt (${ln.id})`, repay);
      addDayStat("loan", repay);
      if (newRemaining <= 0) {
        setLoan(null);
        addToast({ icon:"🎉", title:"Prêt remboursé !", msg:"Votre emprunt est entièrement soldé.", color:C.green, tab:"stats", silent:true });
      } else {
        setLoan({ ...ln, remaining: newRemaining });
      }
    }

    const today=dailyStats[dailyStats.length-1];
    const isRecord=today&&today.revenue>prevRevenueRef.current&&today.revenue>0;
    setSummaryIsRecord(isRecord);
    setObjStats(s=>s._hadLoss?s:{...s,perfectDays:(s.perfectDays||0)+1});
    const sal=salaryAccruedRef.current;
    setSalarySummary(sal.total>0?{ total: sal.total, perPerson: { ...sal.perPerson } }:null);
    setShowSummary(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[isDayOver, isLoaded]);

  // Lancer une nouvelle journée (bouton dans DailySummaryModal)
  const startNewDay = useCallback(()=>{
    const now=Date.now();
    const sal=salaryAccruedRef.current;
    try{localStorage.setItem("day_start",String(now));}catch(e){}
    setDayStartRealMs(now);
    resetDayRef.current?.();
    summaryShownRef.current=false;
    setShowSummary(false);
    setDailyStats(p=>{
      const nextDay=(p[p.length-1]?.day||0)+1;
      const withSal=p.length>0
        ?[...p.slice(0,-1),{...p[p.length-1],salary:+(sal.total).toFixed(2)}]
        :p;
      return [...withSal,{day:nextDay,served:0,lost:0,revenue:0,salary:0}].slice(-15);
    });
    setObjStats(s=>({...s,_hadLoss:false}));
    setMenu(p=>p.map(m=>({...m,dayOrderCount:0,dayFormulaRevenue:0})));
    setServers(p=>p.map(s=>({...s,dayCheckouts:0,dayCovers:0,dayRevenue:0})));
    if(sal.total>0){
      setCash(c=>+(c-sal.total).toFixed(2));
      addTx("dépense", tl("daily.salaries"), sal.total);
    }
    salaryAccruedRef.current={ total: 0, perPerson: {} };
  },[addTx, tl]);

  useSpawner    ({ setQueue, tablesRef, queueRef, restoLvRef, lastSpawnRef, repRef, getRepTier, addToast, phaseRef, pausedRef });
  useExpiry     ({ queueRef, waitlistRef, tablesRef, setQueue, setWaitlist, setTables, setServers, addToast, addDayStat, updateReputation, repDeltaLostClient: REP_DELTA.lostClient, pausedRef });

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
      const cleanDur = tbl.cleanDur || 30;
      const cleanEnd = Date.now() + cleanDur * 1000;
      setTables(p => p.map(t => t.id !== tbl.id ? t : { ...t, cleanUntil: cleanEnd, cleanServer: freeSrv.id }));
      setServers(p => p.map(s => s.id !== freeSrv.id ? s : { ...s, status: "nettoyage", cleanUntil: cleanEnd }));
    }, 500);
    return () => clearInterval(iv);
  }, [setTables, setServers]);
  useSalary     ({ serversRef, kitchenRef, onAccrue: onSalaryAccrue, pausedRef });
  useDeliveries ({ setPendingDeliveries, setStock, addToast });
  useFreshness  ({ stockRef, kitchenRef, setStock, setComplaints, addToast });
  useEvents     ({
    stockRef, cashRef, complaintsRef, tablesRef, serversRef, restoLvRef, phaseRef,
    setStock, setComplaints, setQueue, setCash,
    setTables, setServers, setKitchen,
    setActiveEvent, addToast, addTx, updateReputation,
  });
  useServerMoral({ setServers, addToast, pausedRef });
  useChallenges ({
    tables, restoLvRef,
    setChallengeProgress, setChallengeDate,
    setTodayChallenges, setChallengeLostToday, setChallengeClaimed,
  });
  useObjectives ({ objStats, completedIds, pendingClaim, setPendingClaim, addToast });


  const now=new Date(clockNow);

  const rl=restoLv(restoXp);
  const rlD=rl.d;
  const activeTables=useMemo(()=>tables.slice(0,rlD.tables),[tables,rlD.tables]);

  const addRestoXp=useCallback((xp)=>{
    setRestoXp(prev=>{
      const maxXp=RESTO_LVL[RESTO_LVL.length-1].xpNeeded;
      if(prev>=maxXp) return prev;
      const next=Math.min(maxXp,prev+xp);
      const before=restoLv(prev);
      const after=restoLv(next);
      if(after.l>before.l){
        const nd=RESTO_LVL[after.l];
        setTimeout(()=>{
          setLevelUpData(nd);
          // Pub automatique au level-up (seulement dans GDevelop/iframe)
          if(window !== window.parent){
            setAdWatching(true);
            const safety=setTimeout(()=>setAdWatching(false), 30000);
            triggerAd("rewarded",{
              onRewarded:()=>{ clearTimeout(safety); setAdWatching(false); },
            });
          }
        }, 50);
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
          silent:true,
        }),50);
        setObjStats(s=>({...s,restoLevel:after.l}));
      }
      return next;
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
      msg:`Objectif "${obj.title}" réclamé !`,color:C.green,tab:"objectives",silent:true});
  },[addTx,addRestoXp,addToast]);

  /* ── Dérivés (calculés à chaque render) ─────────────── */
  const _sAlertIds = new Set(menu.filter(d=>(d.unlockLevel??0)<=rl.l).flatMap(d=>(Array.isArray(d.ingredients)?d.ingredients:[]).map(i=>i.stockId)));
  const sAlerts    = stock.filter(s=>_sAlertIds.has(s.id)&&s.qty<=s.alert).length;
  const nCompl     = complaints.filter(c => c.status === "nouveau" && !seenIds.has(c.id)).length;
  const nPending   = pendingClaim.length;
  const repTier    = getRepTier(reputation);


  const handleTableUpgrade = useCallback(() => setObjStats(s=>({...s,tablesUpgraded:s.tablesUpgraded+1})), []);

  if (!lang) return <LanguageSelect />;

  return(
    <ClockContext.Provider value={clockNow}>
    <div style={{height:"100%",display:"flex",flexDirection:"column",overflow:"hidden",background:C.bg,color:C.ink,fontFamily:F.body}}>
      {/* Écran de chargement */}
      {!isLoaded&&(
        <div style={{position:"fixed",inset:0,background:C.bg,zIndex:99999,
          display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16}}>
          <div style={{width:52,height:52,background:C.green,borderRadius:14,
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,
            animation:"pulse 1s ease-in-out infinite"}}>🍽</div>
          <div style={{fontSize:15,fontWeight:700,color:C.ink,fontFamily:F.title}}>{tl("app.loading")}</div>
          <div style={{fontSize:12,color:C.muted,fontFamily:F.body}}>{tl("app.saveLoading")}</div>
        </div>
      )}
      <style>{APP_STYLES}</style>

      {/* Header + Nav — sticky top */}
      <AppHeader
        tab={tab} setTab={setTab}
        bp={bp}
        sAlerts={sAlerts} nCompl={nCompl} queue={queue}
        phase={phase} gameTime={gameTime}
        loan={loan} openBank={openBank}
        setShowToastHistory={setShowToastHistory} setToastUnread={setToastUnread} toastUnread={toastUnread}
        adWatching={adWatching} setAdWatching={setAdWatching}
        setCash={setCash} addTx={addTx} addToast={addToast}
        setShowHelp={setShowHelp} setShowResetModal={setShowResetModal}
        rl={rl} rlD={rlD} restoXp={restoXp} reputation={reputation}
        complaints={complaints} setSeenIds={setSeenIds}
        todayChallenges={todayChallenges} challengeProgress={challengeProgress}
        challengeClaimed={challengeClaimed} challengeLostToday={challengeLostToday}
        pendingClaim={pendingClaim} kitchen={kitchen} activeTables={activeTables}
      />

      {/* Content */}
      <div className="content-area" style={{flex:1,overflowY:"auto",width:"100%",maxWidth:bp.isDesktop?1300:undefined,margin:"0 auto"}}>
        <TabErrorBoundary tab={tab}>
        <div key={tab} style={{animation:"tabSlide 0.2s ease both"}}>
        {tab==="tables"     &&<TablesView     tables={activeTables} setTables={setTables}   servers={servers} setServers={setServers} menu={menu} setMenu={setMenu} setKitchen={setKitchen} kitchen={kitchen} addToast={addToast} addRestoXp={addRestoXp} cash={cash} setCash={setCash} addTx={addTx} queue={queue} setQueue={setQueue} waitlist={waitlist} setWaitlist={setWaitlist} addDayStat={addDayStat} gameTime={gameTime} onTableUpgrade={handleTableUpgrade} setComplaints={setComplaints} dailySpecials={dailySpecials} activeEvent={activeEvent} setChallengeProgress={setChallengeProgress} reputation={reputation} updateReputation={updateReputation} restoLvN={rl.l} stock={stock} formulas={formulas} bp={bp}/>}
        {tab==="servers"    &&<ServersView    servers={servers} setServers={setServers} tables={activeTables} restoLvN={rl.l} cash={cash} setCash={setCash} addTx={addTx} addToast={addToast} candidatePool={candidatePool} setCandidatePool={setCandidatePool} candidateDate={candidateDate} setCandidateDate={setCandidateDate} kitchen={kitchen} setKitchen={setKitchen} commisPool={commisPool} setCommisPool={setCommisPool} commisPoolDate={commisPoolDate} setCommisPoolDate={setCommisPoolDate} bp={bp}/>}
        {tab==="cuisine"    &&<KitchenView    kitchen={kitchen}     setKitchen={setKitchen}  stock={stock} setStock={setStock} tables={activeTables} setTables={setTables} servers={servers} setServers={setServers} addToast={addToast} cash={cash} setCash={setCash} addTx={addTx} gameTime={gameTime} restoLvN={rl.l} bp={bp}/>}
        {tab==="menu"       &&<MenuView       menu={menu} setMenu={setMenu} stock={stock} formulas={formulas} setFormulas={setFormulas} dailyStats={dailyStats} restoLvN={rl.l} bp={bp}/>}
        {tab==="stock"      &&<StockView      stock={stock} setStock={setStock} cash={cash} setCash={setCash} addTx={addTx} addToast={addToast} addDayStat={addDayStat} kitchen={kitchen} supplierMode={supplierMode} setSupplierMode={setSupplierMode} pendingDeliveries={pendingDeliveries} setPendingDeliveries={setPendingDeliveries} menu={menu} restoLvN={rl.l} bp={bp}/>}
        {tab==="objectives" &&<ObjectivesView objStats={objStats} completedIds={completedIds} onClaim={claimObjective} pendingClaim={pendingClaim} todayChallenges={todayChallenges} challengeProgress={challengeProgress} challengeClaimed={challengeClaimed} setChallengeClaimed={setChallengeClaimed} challengeLostToday={challengeLostToday} setCash={setCash} addTx={addTx} addRestoXp={addRestoXp} addToast={addToast} restoXp={restoXp} restoLvN={rl.l} bp={bp}/>}
        {tab==="complaints" &&<ComplaintsView complaints={complaints} setComplaints={setComplaints} tables={activeTables} servers={servers} seenIds={seenIds}/>}
        {tab==="stats"      &&<StatsView dailyStats={dailyStats} loan={loan} objStats={objStats} restoXp={restoXp} kitchen={kitchen} servers={servers} reputation={reputation} transactions={transactions} menu={menu} currentGameDay={dailyStats[dailyStats.length-1]?.day??1} bp={bp}/>}
        </div>
        </TabErrorBoundary>
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
      {showResetModal&&(
        <div onClick={()=>setShowResetModal(false)} style={{position:"fixed",inset:0,
          background:"rgba(0,0,0,0.55)",zIndex:10001,
          display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div onClick={e=>e.stopPropagation()} style={{background:C.surface,borderRadius:18,
            padding:28,width:"100%",maxWidth:380,
            boxShadow:"0 24px 60px rgba(0,0,0,0.3)",textAlign:"center"}}>
            <div style={{fontSize:40,marginBottom:12}}>⚠️</div>
            <div style={{fontSize:18,fontWeight:700,color:C.ink,fontFamily:F.title,marginBottom:8}}>
              {tl("app.newGame")}
            </div>
            <div style={{fontSize:13,color:C.muted,fontFamily:F.body,marginBottom:24,lineHeight:1.6}}>
              {tl("app.newGameWarning")}<br/>
              {tl("app.irreversible")}
            </div>
            <div style={{display:"flex",gap:10,justifyContent:"center"}}>
              <button onClick={()=>setShowResetModal(false)} style={{
                padding:"10px 22px",borderRadius:9,border:`1.5px solid ${C.border}`,
                background:C.bg,color:C.muted,cursor:"pointer",
                fontSize:13,fontWeight:600,fontFamily:F.body}}>
                {tl("app.cancel")}
              </button>
              <button onClick={doReset} style={{
                padding:"10px 22px",borderRadius:9,border:"none",
                background:C.red,color:"#fff",cursor:"pointer",
                fontSize:13,fontWeight:700,fontFamily:F.body,
                boxShadow:`0 4px 14px ${C.red}55`}}>
                {tl("app.restart")}
              </button>
            </div>
          </div>
        </div>
      )}
      {showBank&&<BankModal onClose={()=>setShowBank(false)} cash={cash} loan={loan}
        setLoan={setLoan} setCash={setCash} addTx={addTx} addToast={addToast}/>}
      {/* Ledger modal */}
      {showLedger&&<LedgerModal onClose={()=>setShowLedger(false)} cash={cash} transactions={transactions}/>}

      <Toasts list={toasts} onDismiss={dismissToast} onNavigate={setTab}/>

      {/* ══ Historique des notifications ══ */}
      {showToastHistory&&<NotificationHistory onClose={()=>setShowToastHistory(false)} toastHistory={toastHistory} setToastHistory={setToastHistory}/>}

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
    </ClockContext.Provider>
  );
}
