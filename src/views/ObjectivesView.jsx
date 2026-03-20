/* ═══════════════════════════════════════════════════════
   src/views/ObjectivesView.jsx
   Extrait du monolithe restaurant-manager.jsx
   Dépendances déclarées dans les imports ci-dessous.
═══════════════════════════════════════════════════════ */
import { C, F, OBJECTIVES_DEF, SERIES_LABELS, SERIES_COLORS,
         CHALLENGES_POOL, CHEF_LVL, TABS, GAME_EVENTS } from "../constants/gameData";
import { REP_DELTA, MORAL_PAUSE_GAIN } from "../constants/gameConstants";
import { Btn } from "../components/ui";

export function ObjectivesView({objStats,completedIds,onClaim,pendingClaim,todayChallenges,challengeProgress,challengeClaimed,setChallengeClaimed,challengeLostToday,setCash,addTx,addRestoXp,addToast,restoXp,restoLvN,bp={}}){
  const series=["Revenus","Clients","Niveau","Salle"];

  const claimChallenge=(ch)=>{
    if(challengeClaimed[ch.id])return;
    setChallengeClaimed(p=>({...p,[ch.id]:true}));
    setCash(c=>+(c+ch.reward.cash).toFixed(2));
    addTx("revenu",`Défi quotidien : ${ch.title}`,ch.reward.cash);
    addRestoXp(ch.reward.xp);
    addToast({icon:ch.icon,title:`Défi complété — +${ch.reward.cash}€`,
      msg:`${ch.title} · +${ch.reward.xp} XP`,color:C.purple,tab:"objectives"});
  };

  const getChallengeValue=(ch)=>{
    if(ch.key==="noLoss")return challengeLostToday?0:1;
    return challengeProgress[ch.key]||0;
  };

  return(
    <div style={{maxWidth:800,margin:"0 auto",padding:"10px 0"}}>

      {/* ── Daily challenges ── */}
      <div style={{background:C.purpleP,border:`1.5px solid ${C.purple}33`,
        borderRadius:16,padding:"18px 20px",marginBottom:28}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
          <span style={{fontSize:20}}>🎯</span>
          <div>
            <div style={{fontSize:15,fontWeight:700,color:C.purple,fontFamily:F.title}}>Défis du jour</div>
            <div style={{fontSize:11,color:C.muted,fontFamily:F.body}}>Renouvelés chaque jour · récompenses immédiates</div>
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {(todayChallenges||[]).map(ch=>{
            const val=getChallengeValue(ch);
            const done=val>=ch.target;
            const claimed=!!(challengeClaimed||{})[ch.id];
            const pct=Math.min(100,Math.round((val/ch.target)*100));
            return(
              <div key={ch.id} style={{
                background:claimed?C.greenP:done?C.purple+"18":C.surface,
                border:`1.5px solid ${claimed?C.green+"55":done?C.purple:C.border}`,
                borderRadius:12,padding:"12px 16px",
                display:"flex",alignItems:"center",gap:12,
                transition:"all 0.2s"}}>
                <span style={{fontSize:24,flexShrink:0,filter:claimed?"grayscale(1)":"none"}}>{ch.icon}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                    <span style={{fontSize:13,fontWeight:700,
                      color:claimed?C.muted:done?C.purple:C.ink,
                      fontFamily:F.title}}>
                      {ch.title}
                    </span>
                    {claimed&&<span style={{fontSize:10,background:C.green,color:"#fff",
                      borderRadius:99,padding:"1px 8px",fontFamily:F.body,fontWeight:700}}>✓ Réclamé</span>}
                    {done&&!claimed&&<span style={{fontSize:10,background:C.purple,color:"#fff",
                      borderRadius:99,padding:"1px 8px",fontFamily:F.body,fontWeight:700,
                      animation:"pulse 1s infinite"}}>🎉 Complété !</span>}
                  </div>
                  <div style={{fontSize:11,color:C.muted,fontFamily:F.body,marginBottom:6}}>{ch.desc}</div>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <div style={{flex:1,height:5,background:C.border,borderRadius:99,overflow:"hidden"}}>
                      <div style={{height:"100%",borderRadius:99,
                        background:claimed?C.green:done?C.purple:C.amber,
                        width:`${pct}%`,transition:"width 0.4s"}}/>
                    </div>
                    <span style={{fontSize:10,color:done?C.purple:C.muted,
                      fontWeight:done?700:400,fontFamily:F.body,flexShrink:0}}>
                      {ch.key==="noLoss"?(challengeLostToday?"✗":"✓"):
                       ch.key==="fullHouse"?(val>=1?"✓":"En attente"):
                       ch.key==="vip"?(val>=1?"✓":"En attente"):
                       `${typeof val==="number"&&ch.key==="revenue"?val.toFixed(0):val}/${ch.target}`}
                    </span>
                  </div>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:3,alignItems:"flex-end",flexShrink:0}}>
                  <span style={{fontSize:11,color:C.amber,fontWeight:700,fontFamily:F.body}}>💶 +{ch.reward.cash}€</span>
                  <span style={{fontSize:11,color:C.green,fontWeight:700,fontFamily:F.body}}>⭐ +{ch.reward.xp} XP</span>
                  {done&&!claimed&&(
                    <button onClick={()=>claimChallenge(ch)} style={{
                      background:C.purple,color:"#fff",border:"none",
                      borderRadius:8,padding:"6px 14px",cursor:"pointer",
                      fontFamily:F.body,fontWeight:700,fontSize:12,marginTop:4,
                      boxShadow:`0 3px 10px ${C.purple}55`}}>
                      Réclamer
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Jalons de progression ── */}
      {(()=>{
        const milestones=[
          {label:"10 clients",key:"totalServed",target:10,icon:"👥"},
          {label:"50 clients",key:"totalServed",target:50,icon:"🔥"},
          {label:"1k€ CA",key:"totalRevenue",target:1000,icon:"💶"},
          {label:"5k€ CA",key:"totalRevenue",target:5000,icon:"💰"},
          {label:"20k€ CA",key:"totalRevenue",target:20000,icon:"🏆"},
          {label:"Palace",key:"restoLevel",target:5,icon:"👑"},
        ];
        const vals={totalServed:objStats?.totalServed||0,totalRevenue:objStats?.totalRevenue||0,restoLevel:restoLvN||0};
        return(
          <div style={{background:C.card,border:`1.5px solid ${C.border}`,
            borderRadius:16,padding:"18px 20px",marginBottom:28}}>
            <div style={{fontSize:13,fontWeight:700,color:C.ink,fontFamily:F.title,marginBottom:16,
              display:"flex",alignItems:"center",gap:8}}>
              <span>🗺</span> Jalons de progression
            </div>
            <div style={{display:"flex",alignItems:"center",gap:0,position:"relative"}}>
              {/* connecting line */}
              <div style={{position:"absolute",top:"50%",left:"5%",right:"5%",height:3,
                background:C.border,borderRadius:99,transform:"translateY(-50%)",zIndex:0}}/>
              {milestones.map((m,i)=>{
                const val=vals[m.key]||0;
                const done=val>=m.target;
                return(
                  <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",
                    position:"relative",zIndex:1}}>
                    <div style={{width:36,height:36,borderRadius:"50%",
                      background:done?C.amber:C.bg,
                      border:`3px solid ${done?C.amber:C.border}`,
                      display:"flex",alignItems:"center",justifyContent:"center",
                      fontSize:done?16:14,marginBottom:6,
                      boxShadow:done?`0 0 0 4px ${C.amber}33`:"none",
                      transition:"all 0.3s"}}>
                      {done?m.icon:"○"}
                    </div>
                    <div style={{fontSize:9,color:done?C.amber:C.muted,fontFamily:F.body,
                      fontWeight:done?700:400,textAlign:"center",lineHeight:1.3}}>
                      {m.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Summary bar */}
      <div style={{display:"grid",gridTemplateColumns:bp.isMobile?"1fr 1fr":bp.isTablet?"repeat(2,1fr)":"repeat(4,1fr)",gap:bp.isMobile?8:12,marginBottom:28}}>
        {series.map(s=>{
          const all=OBJECTIVES_DEF.filter(o=>o.series===s);
          const done=all.filter(o=>completedIds.includes(o.id)).length;
          const pct=Math.round(done/all.length*100);
          const col=SERIES_COLORS[s];
          return(
            <div key={s} style={{background:col+"14",border:`1.5px solid ${col}22`,
              borderRadius:14,padding:"14px 16px",textAlign:"center"}}>
              <div style={{fontSize:22,fontWeight:800,color:col,fontFamily:F.title}}>{done}/{all.length}</div>
              <div style={{fontSize:10,color:C.muted,fontFamily:F.body,marginBottom:8}}>{SERIES_LABELS[s]}</div>
              <div style={{background:C.border,borderRadius:99,height:5}}>
                <div style={{width:`${pct}%`,height:"100%",background:col,borderRadius:99,transition:"width 0.4s"}}/>
              </div>
            </div>
          );
        })}
      </div>

      {/* Objectives by series */}
      {series.map(s=>{
        const objs=OBJECTIVES_DEF.filter(o=>o.series===s);
        const col=SERIES_COLORS[s];
        return(
          <div key={s} style={{marginBottom:28}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
              <div style={{width:3,height:20,background:col,borderRadius:99}}/>
              <div style={{fontSize:14,fontWeight:700,color:col,fontFamily:F.title}}>
                {SERIES_LABELS[s]}
              </div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {objs.map(obj=>{
                const done=completedIds.includes(obj.id);
                const isPending=pendingClaim.includes(obj.id);
                return(
                  <div key={obj.id} style={{
                    background:isPending?col+"18":done?C.greenP:C.card,
                    border:`1.5px solid ${isPending?col:done?C.green+"44":C.border}`,
                    borderRadius:12,padding:"14px 16px",
                    display:"flex",alignItems:"center",gap:14,
                    opacity:done&&!isPending?0.6:1,
                    transition:"all 0.2s"}}>
                    {/* Icon */}
                    <div style={{fontSize:28,flexShrink:0,
                      filter:done&&!isPending?"grayscale(1)":"none"}}>{obj.icon}</div>

                    {/* Text */}
                    <div style={{flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                        <span style={{fontSize:13,fontWeight:700,color:isPending?col:done?C.muted:C.ink,
                          fontFamily:F.title}}>
                          {obj.title}
                        </span>
                        {done&&!isPending&&(
                          <span style={{fontSize:10,background:C.green,color:"#fff",
                            borderRadius:99,padding:"1px 8px",fontFamily:F.body,fontWeight:700}}>
                            ✓ Complété
                          </span>
                        )}
                        {isPending&&(
                          <span style={{fontSize:10,background:col,color:"#fff",
                            borderRadius:99,padding:"1px 8px",fontFamily:F.body,fontWeight:700,
                            animation:"pulse 1s infinite"}}>
                            🎉 À récupérer !
                          </span>
                        )}
                      </div>
                      <div style={{fontSize:12,color:C.muted,fontFamily:F.body,marginBottom:6}}>
                        {obj.desc}
                      </div>
                      <div style={{display:"flex",gap:10}}>
                        <span style={{fontSize:11,color:C.amber,fontFamily:F.body,fontWeight:600}}>
                          💶 +{obj.reward.cash} €
                        </span>
                        <span style={{fontSize:11,color:C.green,fontFamily:F.body,fontWeight:600}}>
                          ⭐ +{obj.reward.xp} XP resto
                        </span>
                      </div>
                    </div>

                    {/* Claim button */}
                    {isPending&&(
                      <button onClick={()=>onClaim(obj.id)} style={{
                        background:col,color:"#fff",border:"none",
                        borderRadius:10,padding:"10px 18px",cursor:"pointer",
                        fontFamily:F.body,fontWeight:700,fontSize:13,flexShrink:0,
                        boxShadow:`0 4px 14px ${col}55`}}>
                        Récupérer
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}


/* ══════════════════════════════════════════════════════════
   HOOK : useBreakpoint — détection taille d'écran réactive
══════════════════════════════════════════════════════════ */
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

const TABS=[
  {id:"tables",     label:"Tables",      icon:"⊞"},
  {id:"servers",    label:"Serveurs",    icon:"👤"},
  {id:"cuisine",    label:"Cuisine",     icon:"👨‍🍳"},
  {id:"menu",       label:"Menu",        icon:"📋"},
  {id:"stock",      label:"Stocks",      icon:"📦"},
  {id:"objectives", label:"Objectifs",   icon:"🎯"},
  {id:"complaints", label:"Plaintes",    icon:"⚠"},
  {id:"stats",      label:"Statistiques",icon:"📊"},
];

/* ── Objectifs de progression ── */
const OBJECTIVES_DEF=[
  // Série : Revenus
  {id:"rev1",  series:"Revenus",    icon:"💶", title:"Premiers euros",      desc:"Encaisser 500€",          reward:{cash:50,  xp:100}, condition:s=>(s.totalRevenue||0)>=500  },
  {id:"rev2",  series:"Revenus",    icon:"💶", title:"Bistrot rentable",     desc:"Encaisser 2 000€",        reward:{cash:150, xp:250}, condition:s=>(s.totalRevenue||0)>=2000 },
  {id:"rev3",  series:"Revenus",    icon:"💶", title:"Restaurant prospère",  desc:"Encaisser 10 000€",       reward:{cash:500, xp:600}, condition:s=>(s.totalRevenue||0)>=10000},
  {id:"rev4",  series:"Revenus",    icon:"💶", title:"Empire culinaire",     desc:"Encaisser 50 000€",       reward:{cash:2000,xp:1500},condition:s=>(s.totalRevenue||0)>=50000},
  // Série : Clients
  {id:"srv1",  series:"Clients",    icon:"🍽", title:"Premier service",      desc:"Servir 10 clients",       reward:{cash:30,  xp:80 }, condition:s=>(s.totalServed||0)>=10   },
  {id:"srv2",  series:"Clients",    icon:"🍽", title:"Service régulier",     desc:"Servir 50 clients",       reward:{cash:80,  xp:200}, condition:s=>(s.totalServed||0)>=50   },
  {id:"srv3",  series:"Clients",    icon:"🍽", title:"Grande salle comble",  desc:"Servir 200 clients",      reward:{cash:300, xp:500}, condition:s=>(s.totalServed||0)>=200  },
  {id:"srv4",  series:"Clients",    icon:"🍽", title:"Institution locale",   desc:"Servir 1 000 clients",    reward:{cash:1000,xp:1200},condition:s=>(s.totalServed||0)>=1000 },
  // Série : Niveau resto
  {id:"lvl1",  series:"Niveau",     icon:"⭐", title:"Bistrot étoilé",       desc:"Atteindre le niveau 2",   reward:{cash:200, xp:300}, condition:s=>(s.restoLevel||0)>=2     },
  {id:"lvl2",  series:"Niveau",     icon:"⭐", title:"Brasserie reconnue",   desc:"Atteindre le niveau 3",   reward:{cash:500, xp:600}, condition:s=>(s.restoLevel||0)>=3     },
  {id:"lvl3",  series:"Niveau",     icon:"⭐", title:"Grand restaurant",     desc:"Atteindre le niveau 4",   reward:{cash:1200,xp:1000},condition:s=>(s.restoLevel||0)>=4     },
  {id:"lvl4",  series:"Niveau",     icon:"👑", title:"Palace gastronomique", desc:"Atteindre le niveau 5",   reward:{cash:3000,xp:2000},condition:s=>(s.restoLevel||0)>=5     },
  // Série : Tables
  {id:"tbl1",  series:"Salle",      icon:"🪑", title:"Première extension",   desc:"Agrandir 1 table",        reward:{cash:50,  xp:80 }, condition:s=>(s.tablesUpgraded||0)>=1 },
  {id:"tbl2",  series:"Salle",      icon:"🪑", title:"Salle réaménagée",     desc:"Agrandir 3 tables",       reward:{cash:120, xp:200}, condition:s=>(s.tablesUpgraded||0)>=3 },
];

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

const pickDailyChallenges=(dateStr)=>{
  // Seed déterministe à partir de la date → même défis pour toute la journée
  const seed=dateStr.split("/").reduce((acc,n,i)=>acc+parseInt(n)*(i+1),0);
  const shuffled=[...ALL_CHALLENGES].sort((a,b)=>{
    const ha=(seed*17+a.id.charCodeAt(3))%100;
    const hb=(seed*17+b.id.charCodeAt(3))%100;
    return ha-hb;
  });
  return shuffled.slice(0,3);
};

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
  const [todayChallenges,setTodayChallenges]=useState(()=>pickDailyChallenges(_today));
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
    setTodayChallenges(pickDailyChallenges(today));
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
  const repRef = useRef(50);
  useEffect(()=>{ repRef.current=reputation; },[reputation]);

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

  // Salary — deducted every hour (real time). Only active staff.
  useEffect(()=>{
    const iv=setInterval(()=>{
      let total=0;
      const lines=[];
      setServers(sv=>{
        sv.filter(s=>s.status==="actif").forEach(s=>{
          total+=s.salary||0;
          lines.push(`${s.name.split(" ")[0]} ${(s.salary||0).toFixed(0)}€`);
        });
        return sv;
      });
      setKitchen(k=>{
        const chefWage=k.chef.salary||0;
        total+=chefWage;
        lines.push(`${k.chef.name.split(" ")[0]} ${chefWage.toFixed(0)}€`);
        const cl2=chefLv(k.chef.totalXp);
        const unlocked=CHEF_LVL[Math.min(cl2.l,CHEF_LVL.length-1)].commis;
        k.commis.slice(0,unlocked).filter(c=>c.status==="actif").forEach(c=>{
          total+=c.salary||0;
          lines.push(`${c.name.split(" ")[0]} ${(c.salary||0).toFixed(0)}€`);
        });
        return k;
      });
      if(total>0){
        setCash(c=>+Math.max(0,c-total).toFixed(2));
        addTx("salaire",`Salaires (${lines.join(", ")})`,total);
        addToast({icon:"💸",title:`Salaires — ${total.toFixed(0)} €`,
          msg:lines.join(" · "),color:C.navy,tab:"stats"});
      }
      // Loan repayment each hour
      setLoan(ln=>{
        if(!ln)return ln;
        const repay=Math.min(ln.remaining,ln.repayPerHour);
        const newRemaining=+(ln.remaining-repay).toFixed(2);
        setCash(c=>+Math.max(0,c-repay).toFixed(2));
        addTx("remboursement",`Remboursement prêt (${ln.id}) — mensualité`,repay);
        if(newRemaining<=0){
          addToast({icon:"🎉",title:"Prêt remboursé !",msg:"Votre emprunt est soldé.",color:C.green,tab:"stats"});
          return null;
        }
        return{...ln,remaining:newRemaining};
      });
    },3600000);
    return()=>clearInterval(iv);
  },[addToast]);

  // Moral drain/gain — every 5 min real time
  useEffect(()=>{
    const iv=setInterval(()=>{
      setServers(prev=>prev.map(s=>{
        if(s.status==="actif"||s.status==="service"){
          // Drain en travaillant
          const newMoral=Math.max(0,(s.moral??100)-1);
          // Alerte burnout
          if(newMoral===10){
            setTimeout(()=>addToast({icon:"😓",title:`${s.name} épuisé·e !`,
              msg:"Moral critique — mettez-le/la en pause ou offrez une prime.",
              color:C.red,tab:"servers"}),50);
          }
          return {...s,moral:newMoral};
        }
        if(s.status==="pause"){
          return {...s,moral:Math.min(100,(s.moral??100)+MORAL_PAUSE_GAIN)};
        }
        return s;
      }));
    },MORAL_DRAIN_INTERVAL);
    return()=>clearInterval(iv);
  },[addToast]);

  // Specialty unlock — check on every XP gain (level 2 & 4)
  useEffect(()=>{
    setServers(prev=>prev.map(s=>{
      const sl=srvLv(s.totalXp);
      // Unlock specialty at level 2 if not already set
      if(sl.l>=2&&!s.specialty){
        const sp=pickSpecialty();
        setTimeout(()=>addToast({icon:sp.icon,
          title:`${s.name} — Spécialité débloquée !`,
          msg:`${sp.name} : ${sp.desc}`,color:sp.color,tab:"servers"}),100);
        return {...s,specialty:sp};
      }
      // Upgrade specialty at level 4 (mark as upgraded)
      if(sl.l>=4&&s.specialty&&!s.specialtyUpgraded){
        setTimeout(()=>addToast({icon:"⬆️",
          title:`${s.name} — Spécialité améliorée !`,
          msg:`${s.specialty.name} niveau 2`,color:s.specialty.color,tab:"servers"}),100);
        return {...s,specialtyUpgraded:true};
      }
      return s;
    }));
  },[servers.map(s=>srvLv(s.totalXp).l).join(",")]);
  useEffect(()=>{
    const iv=setInterval(()=>{
      const now=Date.now();
      setPendingDeliveries(prev=>{
        const arrived=prev.filter(d=>now>=d.arrivedAt);
        if(!arrived.length)return prev;
        arrived.forEach(d=>{
          setStock(s=>s.map(item=>{
            const match=d.items.find(x=>x.stockId===item.id);
            return match?{...item,qty:+(item.qty+match.qty).toFixed(3)}:item;
          }));
          addToast({icon:"🚚",title:"Livraison arrivée !",
            msg:d.labels,color:C.green,tab:"stock"});
        });
        return prev.filter(d=>now<d.arrivedAt);
      });
    },5000);
    return()=>clearInterval(iv);
  },[addToast]);

  // Random events — fire every 4 minutes (real time), 60% chance
  const stockRef=useRef(stock);
  const cashRef=useRef(cash);
  const complaintsRef=useRef(complaints);
  useEffect(()=>{stockRef.current=stock;},[stock]);
  useEffect(()=>{cashRef.current=cash;},[cash]);
  useEffect(()=>{complaintsRef.current=complaints;},[complaints]);
  useEffect(()=>{
    const iv=setInterval(()=>{
      if(Math.random()<0.60){
        const evt=GAME_EVENTS[Math.floor(Math.random()*GAME_EVENTS.length)];
        setActiveEvent(evt.id);
        setTimeout(()=>setActiveEvent(null),8000);
        evt.apply(
          stockRef.current,cashRef.current,complaintsRef.current,
          addToast,setCash,addTx,setComplaints,
          setQueue,rMood,rName,rSize,tablesRef.current,setStock,updateReputation
        );
      }
    },240000);
    return()=>clearInterval(iv);
  },[addToast,addTx]);

  // Daily specials rotate every real hour
  useEffect(()=>{
    const iv=setInterval(()=>{
      setMenu(m=>{
        const base=m.filter(x=>x.cat!=="Boissons");
        const picks=base.sort(()=>Math.random()-0.5).slice(0,2);
        const ids=new Set(picks.map(p=>p.id));
        const specials=picks.map(p=>({...p,originalPrice:p.price,price:+(p.price*0.8).toFixed(2),isSpecial:true}));
        setDailySpecials(specials);
        return m.map(x=>ids.has(x.id)?{...x,isSpecial:true}:({...x,isSpecial:false}));
      });
    },3600000);
    return()=>clearInterval(iv);
  },[]);

  // Spawn clients — polling toutes les 500ms, spawn garanti toutes les 30s
  // On stocke le timestamp du dernier spawn dans un ref (jamais remis à zéro par les re-renders)
  const tablesRef=useRef(tables);
  const lastSpawnRef=useRef(Date.now());
  useEffect(()=>{tablesRef.current=tables;},[tables]);
  useEffect(()=>{
    const iv=setInterval(()=>{
      const now=Date.now();
      const tier = getRepTier(repRef.current);
      const interval = Math.round(30000 / (tier.spawnMult || 1));
      if(now-lastSpawnRef.current>=interval){
        lastSpawnRef.current=now;
        const mood=rMood();
        const maxCap=Math.max(...tablesRef.current.filter(t=>t.status==="libre").map(t=>t.capacity),2);
        const size=Math.min(rSize(),maxCap);
        setQueue(q=>[...q,{
          id:Date.now()+Math.random(),name:rName(),size,
          mood,expiresAt:Date.now()+mood.p*1000,patMax:mood.p,
        }]);
      }
    },500);
    return()=>clearInterval(iv);
  },[]);

  // FullHouse challenge: check if 5+ tables are occupied simultaneously (every 2s)
  useEffect(()=>{
    const iv=setInterval(()=>{
      setTables(prev=>{
        const occ=prev.filter(t=>t.status==="occupée"||t.status==="mange").length;
        if(occ>=5) setChallengeProgress(p=>p.fullHouse>=1?p:{...p,fullHouse:1});
        return prev;
      });
      // Rotate challenges if date changed
      const today=new Date().toLocaleDateString("fr-FR");
      setChallengeDate(prev=>{
        if(prev!==today){
          setTodayChallenges(pickDailyChallenges(today));
          setChallengeProgress({served:0,revenue:0,noLoss:1,highRating:0,fastPlace:0,vip:0,fullHouse:0,tips:0});
          setChallengeLostToday(false);
          setChallengeClaimed({});
        }
        return today;
      });