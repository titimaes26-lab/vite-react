/* ═══════════════════════════════════════════════════════
   src/views/TablesView.jsx
   Extrait du monolithe restaurant-manager.jsx
   Dépendances déclarées dans les imports ci-dessous.
═══════════════════════════════════════════════════════ */
import { useState, useEffect } from "react";
import { C, F, CAP_UPGRADES, SRV_LVL, GAME_EVENTS } from "../constants/gameData.js";
import { MENU_THEMES, getRepTier } from "../constants/gameConstants.js";
import { REP_DELTA } from "../constants/gameConstants.js";
import { Badge, Btn, Sel, Modal, XpBar, Lbl, Inp } from "../components/ui/index.js";
import { srvLv, calcRating, ratingColor, ratingStars, calcTip, restoXpFromCheckout, srvXpFromCheckout } from "../utils/levelUtils.js";
import { generateOrderWithSpecials } from "../utils/randomUtils.js";
import { buildKitchenTickets, svcDuration, eatDuration, calcBill } from "../utils/orderUtils.js";

export function TablesView({tables,setTables,servers,setServers,menu,setMenu,setKitchen,kitchen,addToast,addRestoXp,cash,setCash,addTx,queue,setQueue,waitlist,setWaitlist,addDayStat,clockNow,onTableUpgrade,setComplaints,dailySpecials,activeEvent,setChallengeProgress,reputation,updateReputation,activeTheme,bp={}}){
  const menuTheme=(MENU_THEMES||[]).find(t=>t.id===(activeTheme||"none"))||{priceMult:1,repBonus:0,xpMult:1};
  const [modal,setModal]=useState(null);
  const [tgtT,setTgtT]=useState("");
  const [tgtS,setTgtS]=useState("");
  const [selectedTable,setSelectedTable]=useState(null);
  const [viewMode,setViewMode]=useState("plan"); // "plan" | "grid"

  const [preview,setPreview]=useState([]);
  const now=clockNow; // use App-level clock to avoid reset on tab change

  // Regenerate order preview when table+server both selected
  useEffect(()=>{
    if(modal&&tgtT&&tgtS) setPreview(generateOrderWithSpecials(modal,menu));
    else setPreview([]);
  },[tgtT,tgtS]);

  const activeSrv=servers.filter(s=>s.status==="actif"&&(s.moral??100)>10);
  const freeTbl=(g)=>tables.filter(t=>t.status==="libre"&&t.capacity>=g.size);
  const openAssign=(g)=>{setModal(g);setTgtT("");setTgtS("");setPreview([]);};

  // Direct placement when a free table + active server exist — no modal needed
  const quickPlace=(g)=>{
    const ft=freeTbl(g);
    if(ft.length===0||activeSrv.length===0)return openAssign(g);
    const table=ft[0];
    const srv=activeSrv[0];
    const orderLines=generateOrderWithSpecials(g,menu);
    // Boissons : servies immédiatement (pas de cuisson)
    const kitchenTickets=[];
    const drinkTickets=[];
    orderLines.forEach((o,li)=>{
      Array.from({length:o.qty},(_,i)=>{
        const ticket={
          id:Date.now()+li*100+i+Math.random(),
          name:o.item,cat:o.cat,ingredients:o.ingredients,
          prepTime:o.prepTime||60,
          tableId:table.id,tableName:table.name,
          oid:o.oid,addedAt:Date.now(),
        };
        if(o.cat==="Boissons") drinkTickets.push({...ticket,completedAt:Date.now(),timerMax:0,startedAt:Date.now()});
        else kitchenTickets.push(ticket);
      });
    });
    const tickets=[...kitchenTickets,...drinkTickets];
    // Service duration based on group size: 30s (2p), 60s (4p), 90s (6p)
    // Reduced by speed specialty
    const speedMult=srv.specialty?.id==="speed"?(srv.specialty.speedMult||1.0):1.0;
    const svcDur=Math.round((g.size<=2?30000:g.size<=4?60000:90000)*speedMult);
    const svcLabel=svcDur<=21000?"~20s":svcDur<=42000?"~40s":"~1min";
    const svcUntil=Date.now()+svcDur;
    setServers(p=>p.map(s=>s.id!==srv.id?s:{...s,status:"service",serviceUntil:svcUntil}));
    setTables(p=>p.map(t=>t.id!==table.id?t:
      {...t,status:"occupée",server:srv.name,group:g,order:orderLines,svcTimer:0,svcMax:0,svcUntil,
        placedAt:Date.now(),patienceLeftRatio:Math.max(0,(g.expiresAt-Date.now())/(g.patMax*1000))}));
    setQueue(q=>q.filter(c=>c.id!==g.id));
    // fastPlace challenge: track placements within a session window
    setChallengeProgress(p=>({...p,fastPlace:p.fastPlace+1}));
    addToast({icon:"🛎️",title:"Prise de commande…",
      msg:`${srv.name} prend la commande à ${table.name} · envoi cuisine dans ${svcLabel}`,color:C.navy,tab:"tables"});
    setTimeout(()=>{
      setKitchen(k=>({
        ...k,
        queue:[...k.queue,...kitchenTickets],
        done:[...k.done,...drinkTickets],
      }));
      setServers(p=>p.map(s=>s.id!==srv.id?s:{...s,status:"actif",serviceUntil:null}));
      setTables(p=>p.map(t=>t.id!==table.id?t:{...t,svcUntil:null,server:null}));
      // Incrémenter orderCount dans le menu
      const counts={};
      orderLines.forEach(o=>{if(o.menuId)counts[o.menuId]=(counts[o.menuId]||0)+o.qty;});
      setMenu(m=>m.map(d=>counts[d.id]?{...d,orderCount:(d.orderCount||0)+counts[d.id]}:d));
      const kitchenMsg=kitchenTickets.length>0?`${kitchenTickets.length} plat${kitchenTickets.length>1?"s":""} → cuisine`:"";
      const drinkMsg=drinkTickets.length>0?`${drinkTickets.length} boisson${drinkTickets.length>1?"s":""} servie${drinkTickets.length>1?"s":""}`:""
      addToast({icon:"📋",title:"Commande envoyée !",
        msg:`${table.name} · ${[kitchenMsg,drinkMsg].filter(Boolean).join(" · ")}`,color:C.terra,tab:"cuisine"});
    },svcDur);
  };
  // Confirm assignment: generate order, send tickets to kitchen
  const confirm=()=>{
    if(!modal||!tgtT||!tgtS||preview.length===0)return;
    const tid=parseInt(tgtT);
    const tn=tables.find(t=>t.id===tid);
    const orderLines=preview.map(o=>{const d=menu.find(m=>m.id===o.menuId);return d?.isSpecial?{...o,price:d.price,isSpecial:true}:o;});
    // Boissons : servies immédiatement (pas de cuisson)
    const kitchenTickets=[];
    const drinkTickets=[];
    orderLines.forEach((o,li)=>{
      Array.from({length:o.qty},(_,i)=>{
        const ticket={
          id:Date.now()+li*100+i+Math.random(),
          name:o.item,cat:o.cat,ingredients:o.ingredients,
          prepTime:o.prepTime||60,
          tableId:tid,tableName:tn?.name,
          oid:o.oid,addedAt:Date.now(),
        };
        if(o.cat==="Boissons") drinkTickets.push({...ticket,completedAt:Date.now(),timerMax:0,startedAt:Date.now()});
        else kitchenTickets.push(ticket);
      });
    });
    setKitchen(k=>({
      ...k,
      queue:[...k.queue,...kitchenTickets],
      done:[...k.done,...drinkTickets],
    }));
    setTables(p=>p.map(t=>t.id!==tid?t:
      {...t,status:"occupée",server:tgtS,group:modal,order:orderLines,svcTimer:0,svcMax:0,
        placedAt:Date.now(),patienceLeftRatio:Math.max(0,(modal.expiresAt-Date.now())/(modal.patMax*1000))}));
    setQueue(q=>q.filter(c=>c.id!==modal.id));
    // Incrémenter orderCount dans le menu
    const counts={};
    orderLines.forEach(o=>{if(o.menuId)counts[o.menuId]=(counts[o.menuId]||0)+o.qty;});
    setMenu(m=>m.map(d=>counts[d.id]?{...d,orderCount:(d.orderCount||0)+counts[d.id]}:d));
    addToast({icon:"📋",title:"Commande envoyée !",
      msg:`${tn?.name} · ${kitchenTickets.length>0?`${kitchenTickets.length} plat${kitchenTickets.length>1?"s":""} → cuisine`:""}${drinkTickets.length>0?` · ${drinkTickets.length} boisson${drinkTickets.length>1?"s":""} servie${drinkTickets.length>1?"s":""}`:""}`
        .trim().replace(/^·\s*/,""),color:C.terra,tab:"cuisine"});
    setModal(null);
  };

  // Encaisser: table is "mange", collect bill + XP
  const checkout=(tid)=>{
    const t=tables.find(x=>x.id===tid);
    if(!t?.group)return;
    const bill=t.order.reduce((s,o)=>s+o.price*o.qty,0);
    const themedBill=+(bill*menuTheme.priceMult).toFixed(2);
    const rating=calcRating(t.patienceLeftRatio??0.5, t.group.mood.b);
    const repTier=getRepTier(reputation);
    // Apply server specialty tip multiplier
    const serverObj=servers.find(s=>s.name===t.server);
    const specTipMult=serverObj?.specialty?.tipMult||1.0;
    const tip=+(themedBill*(rating-1)*0.04*repTier.tipMult*specTipMult).toFixed(2);
    const isVIP=t.group.isVIP||false;
    const totalReceipt=+(themedBill+tip+(isVIP?200:0)).toFixed(2);
    const xpG=Math.round((20+t.group.size*8)*t.group.mood.b*(isVIP?3:1)*menuTheme.xpMult);

    // Boost server moral on good tip
    if(tip>0&&t.server){
      setServers(prev=>prev.map(s=>s.name!==t.server?s:
        {...s,moral:Math.min(100,(s.moral??100)+Math.min(5,Math.round(tip/2)))}));
    }

    // Réputation : delta selon note + bonus thème menu
    const repDeltaKey=["","rating1","rating2","rating3","rating4","rating5"][rating];
    const repDelta=(REP_DELTA[repDeltaKey]||(rating>=4?2:rating<=2?-4:0))+(menuTheme.repBonus||0);
    updateReputation(repDelta, `note ${rating}★${menuTheme.repBonus>0?` +${menuTheme.repBonus} thème`:""}`);
    if(isVIP) updateReputation(REP_DELTA.vip,"client VIP servi");

    // Low rating → auto complaint + réputation
    if(rating<=2){
      const desc=rating===1?"Service très insatisfaisant — client très mécontent":"Service insuffisant";
      setComplaints(p=>[{id:Date.now(),date:new Date().toLocaleDateString("fr-FR"),
        table:t.name,server:t.server||"-",type:"Satisfaction",desc,
        status:"nouveau",prio:rating===1?"haute":"moyenne"},...p]);
      updateReputation(REP_DELTA.complaint,"plainte générée");
    }
    // VIP bonus toast
    if(isVIP){
      addToast({icon:"🎩",title:"Critique Michelin servi !",
        msg:`Note ${rating}/5 · Bonus +200€`,color:"#6b3fa0",tab:"tables"});
    }

    // Find a free server for cleaning
    const cleaner=servers.find(s=>s.status==="actif");
    const plongeBonus=(kitchen.upgrades?.plonge||0);
    const cleanSecs=60-plongeBonus*20;
    const cleanDur=cleanSecs*1000;
    const cleanUntil=Date.now()+cleanDur;

    setTables(p=>p.map(x=>x.id!==tid?x:
      {...x,status:"nettoyage",server:cleaner?.name||null,group:null,order:[],
        svcTimer:0,svcMax:0,
        cleanUntil,cleanDur:60}));

    if(cleaner)
      setServers(p=>p.map(s=>s.name!==cleaner.name?s:
        {...s,status:"service",serviceUntil:cleanUntil}));

    const repLabel=repTier.tipMult>1?` · Rep×${repTier.tipMult}`:repTier.tipMult<1?` · Rep×${repTier.tipMult}`:"";
    const themeLabel=menuTheme.priceMult!==1?` · Thème×${menuTheme.priceMult}`:"";
    addToast({icon:"✨",title:`${ratingStars(rating)} +${totalReceipt.toFixed(2)}€`,
      msg:`${t.name} · ${t.group.mood.e}${tip>0?" · pourboire +"+tip.toFixed(2)+"€":""}${repLabel}${themeLabel}`,
      color:rating>=4?C.green:rating<=2?C.red:C.amber,tab:"tables"});
    addRestoXp(xpG);
    setCash(c=>+(c+totalReceipt).toFixed(2));
    addTx("revenu",`Table ${t.name} — ${t.group?.name||""} (${t.order.map(o=>`${o.qty}× ${o.item}`).join(", ")})`,totalReceipt);
    addDayStat("served");
    addDayStat("revenue",totalReceipt);
    addDayStat("rating",rating);

    const srvXpGain=15+rating*5;
    if(t.server){
      setServers(prev=>prev.map(s=>s.name!==t.server?s:{...s,totalXp:s.totalXp+srvXpGain}));
    }

    const tip2=+(bill*(rating-1)*0.04).toFixed(2);
    setChallengeProgress(p=>({
      ...p,
      served:p.served+1,
      revenue:+(p.revenue+totalReceipt).toFixed(2),
      highRating:p.highRating+(rating>=4?1:0),
      vip:p.vip+(isVIP?1:0),
      tips:+(p.tips+tip2).toFixed(2),
    }));
  };

  const st={
    libre: tables.filter(t=>t.status==="libre").length,
    occ:   tables.filter(t=>t.status==="occupée").length,
    mange: tables.filter(t=>t.status==="mange").length,
  };
  const catColors={Entrées:C.green,Plats:C.terra,Desserts:C.purple,Boissons:C.navy};

  // Réorganisation de la file d'attente
  const moveInQueue=(idx,dir)=>{
    setQueue(q=>{
      const next=idx+dir;
      if(next<0||next>=q.length)return q;
      const arr=[...q];
      [arr[idx],arr[next]]=[arr[next],arr[idx]];
      return arr;
    });
  };

  // Temps d'attente estimé : nb de tables occupées × durée moyenne de service restante
  const estimatedWait=(pos)=>{
    const occupiedCount=tables.filter(t=>t.status==="occupée"||t.status==="mange").length;
    const freeCount=tables.filter(t=>t.status==="libre").length;
    if(freeCount>0&&pos===0)return 0;
    // Estimation grossière : chaque position = 90s si pas de table libre
    return Math.max(0,(pos+1-freeCount)*90);
  };

  // Rappel d'un groupe de la liste d'attente (humeur améliorée)
  const recallGroup=(g)=>{
    const boostedMood={...g.mood, p:g.mood.p+15, b:Math.min(3,g.mood.b+0.2)};
    const newGroup={
      ...g,
      mood:boostedMood,
      expiresAt:Date.now()+boostedMood.p*1000,
      patMax:boostedMood.p,
      recalled:true,
    };
    setQueue(q=>[newGroup,...q]);
    setWaitlist(w=>w.filter(x=>x.id!==g.id));
    addToast({icon:"📞",title:`${g.name} rappelé !`,msg:`Humeur améliorée · patience +15s`,color:C.green,tab:"tables"});
  };

  return(
    <div style={{
      display:"flex",flexDirection:"column",
      height:"calc(100vh - 0px)",overflow:"hidden",
      background:C.bg,
    }}>

      {/* ══ 1. BARRE STATUT — haut 42px ══════════════════════ */}
      <div style={{height:42,flexShrink:0,background:C.surface,
        borderBottom:`1px solid ${C.border}`,
        display:"flex",alignItems:"center",
        paddingLeft:14,paddingRight:14,gap:14,zIndex:10}}>
        <span style={{fontSize:13,fontWeight:800,color:C.green,fontFamily:F.title}}>
          💶 {cash.toLocaleString("fr-FR",{minimumFractionDigits:2})}€
        </span>
        <div style={{width:1,height:18,background:C.border}}/>
        <span style={{fontSize:11,color:C.muted,fontFamily:F.body}}>
          ✅ {tables.filter(t=>t.status==="libre").length}/{tables.length} libres
        </span>
        {queue.length>0&&(
          <span style={{fontSize:11,fontWeight:700,
            color:queue.length>=3?C.red:C.amber,fontFamily:F.body}}>
            🚶 {queue.length} en attente
          </span>
        )}
        {reputation!==undefined&&(
          <div style={{display:"flex",alignItems:"center",gap:5,marginLeft:"auto"}}>
            <span style={{fontSize:10,color:C.muted,fontFamily:F.body}}>Rép.</span>
            <div style={{width:48,height:5,background:C.border,borderRadius:99,overflow:"hidden"}}>
              <div style={{height:"100%",width:`${reputation}%`,
                background:reputation>=60?C.green:reputation>=30?C.amber:C.red,
                borderRadius:99,transition:"width 0.5s"}}/>
            </div>
          </div>
        )}
        {activeEvent&&(()=>{
          const evt=GAME_EVENTS.find(e=>e.id===activeEvent);
          return evt?(<div style={{display:"flex",alignItems:"center",gap:5,
            background:C.amberP,border:`1px solid ${C.amber}44`,
            borderRadius:8,padding:"2px 9px",flexShrink:0}}>
            <span style={{fontSize:12}}>{evt.icon}</span>
            <span style={{fontSize:10,color:C.amber,fontWeight:700,fontFamily:F.body}}>{evt.title}</span>
          </div>):null;
        })()}
      </div>

      {/* ══ 2. ZONE CENTRALE — plan + overlays ═══════════════ */}
      <div style={{flex:1,position:"relative",overflow:"hidden",minHeight:0}}>

        {/* Plan SVG fond */}
        <div style={{position:"absolute",inset:0,background:"#faf7f0",overflow:"hidden"}}>
                          <svg style={{width:"100%",height:"100%"}} viewBox={`0 0 ${VW} ${VH}`} width="100%" style={{display:"block"}}>
                  {/* Fond parquet */}
                  <rect x="0" y="0" width={VW} height={VH} fill="#faf7f0"/>
                  {Array.from({length:Math.ceil(VH/20)+1},(_,i)=>(
                    <line key={`h${i}`} x1="0" y1={i*20} x2={VW} y2={i*20}
                      stroke="#e8e0d0" strokeWidth="0.5"/>
                  ))}
                  {Array.from({length:Math.ceil(VW/20)+1},(_,i)=>(
                    <line key={`v${i}`} x1={i*20} y1="0" x2={i*20} y2={VH}
                      stroke="#e8e0d0" strokeWidth="0.5"/>
                  ))}

                  {/* Entrée — avec silhouettes file d'attente */}
                  <rect x={VW/2-50} y={VH-22} width={100} height={22} rx="4"
                    fill="#d4c9b0" opacity="0.8"/>
                  <text x={VW/2} y={VH-10} textAnchor="middle" fontSize="9"
                    fill="#8a7d6a" fontFamily="sans-serif">✦ ENTRÉE</text>
                  {/* Silhouettes groupes en attente */}
                  {queue.slice(0,6).map((g,qi)=>{
                    const x = VW/2 - 90 + qi * 30;
                    const y = VH - 46;
                    const pct = Math.max(0,(g.expiresAt-now)/(g.patMax*1000));
                    const col = pct > 0.5 ? "#2a5c3f" : pct > 0.25 ? "#b87d10" : "#c0392b";
                    return(
                      <g key={g.id}>
                        {/* Cercle patience */}
                        <circle cx={x} cy={y} r="10" fill={col+"22"} stroke={col} strokeWidth="1.5"/>
                        {/* Emoji humeur */}
                        <text x={x} y={y+4} textAnchor="middle" fontSize="10" fontFamily="sans-serif">
                          {g.mood.e}
                        </text>
                        {/* Taille groupe */}
                        <text x={x} y={y+17} textAnchor="middle" fontSize="7"
                          fill="#8a7d6a" fontFamily="sans-serif">{g.size}p</text>
                      </g>
                    );
                  })}
                  {queue.length > 6 && (
                    <text x={VW/2+100} y={VH-40} textAnchor="middle" fontSize="8"
                      fill="#c0392b" fontFamily="sans-serif" fontWeight="700">
                      +{queue.length-6}
                    </text>
                  )}

                  {/* Bar — droite */}
                  <rect x={VW-MR+6} y={MT} width={MR-10} height={Math.min(rows*CELL_H, 50)} rx="6"
                    fill="#c4a882" opacity="0.7"/>
                  <text x={VW-MR+MR/2+1} y={MT+18} textAnchor="middle" fontSize="9"
                    fill="#5a3e20" fontFamily="sans-serif">🍺</text>
                  <text x={VW-MR+MR/2+1} y={MT+30} textAnchor="middle" fontSize="8"
                    fill="#5a3e20" fontFamily="sans-serif">Bar</text>

                  {/* Cuisine — gauche animée */}
                  {(()=>{
                    const cookCount = kitchen.cooking.length;
                    const hasCook = cookCount > 0;
                    return(
                      <g>
                        <rect x={2} y={MT-2} width={ML-4} height={hasCook?52:34} rx="6"
                          fill={hasCook?"#e07a4518":"#b8d4c8"} opacity="0.95"
                          stroke={hasCook?"#e07a45":"#b8d4c8"} strokeWidth="1"/>
                        <text x={ML/2} y={MT+11} textAnchor="middle" fontSize="11"
                          fontFamily="sans-serif">
                          {hasCook?"🔥":"🍳"}
                          {hasCook&&<animate attributeName="opacity" values="1;0.5;1" dur="0.8s" repeatCount="indefinite"/>}
                        </text>
                        <text x={ML/2} y={MT+22} textAnchor="middle" fontSize="7"
                          fill={hasCook?"#e07a45":"#2a5c3f"} fontFamily="sans-serif" fontWeight={hasCook?"700":"400"}>
                          Cuisine
                        </text>
                        {hasCook&&(
                          <>
                            <text x={ML/2} y={MT+33} textAnchor="middle" fontSize="9"
                              fill="#e07a45" fontFamily="sans-serif" fontWeight="800">
                              {cookCount}
                            </text>
                            <text x={ML/2} y={MT+43} textAnchor="middle" fontSize="6"
                              fill="#e07a45" fontFamily="sans-serif">
                              {cookCount>1?"plats":"plat"}
                            </text>
                          </>
                        )}
                      </g>
                    );
                  })()}

                  {/* Tables */}
                  {tables.map((t,i)=>{
                    const pos = getPos(i);
                    const isMange=t.status==="mange";
                    const isNettoyage=t.status==="nettoyage";
                    const isOrdering=t.status==="occupée"&&t.svcUntil&&now<t.svcUntil;
                    const isLibre=t.status==="libre";
                    const myQ=queue.filter(g=>g.size<=t.capacity&&isLibre);

                    const fill=isNettoyage?"#f5d878":isMange?"#4a9e78":isOrdering?"#3a5f8a":
                      t.status==="occupée"?"#e07a45":myQ.length>0?"#5ab88a":"#c8e6d8";

                    const stroke=t.id===selectedTable?.id?"#1a1612":
                      t.group?.isVIP?"#d4af37":fill;
                    const strokeW=t.id===selectedTable?.id?3:1.5;

                    // Taille selon capacité — garantit que tw+chaises < CELL_W
                    const tw=t.capacity<=2?40:t.capacity<=4?50:60;
                    const th=t.capacity<=2?32:t.capacity<=4?38:44;

                    const bill=isMange?t.order.reduce((s,o)=>s+o.price*o.qty,0):0;
                    const themedBill=+(bill*menuTheme.priceMult).toFixed(2);
                    const isEating=isMange&&t.eatUntil&&now<t.eatUntil;
                    const eatPct=isEating?
                      Math.min(100,Math.round(((t.eatDur*1000-(t.eatUntil-now))/(t.eatDur*1000))*100)):
                      isMange?100:0;

                    // Cuisine : plat le plus long en cuisson pour cette table
                    const isCooking=t.status==="occupée"&&!isOrdering;
                    const cookingForT=kitchen.cooking.filter(d=>d.tableId===t.id);
                    const slowestT=cookingForT.length>0
                      ?cookingForT.reduce((a,b)=>(b.startedAt+b.timerMax*1000)>(a.startedAt+a.timerMax*1000)?b:a)
                      :null;
                    const cookPctSvg=slowestT
                      ?Math.min(100,Math.round(((now-slowestT.startedAt)/(slowestT.timerMax*1000))*100))
                      :0;
                    const isActive=t.status==="occupée"||isMange||isNettoyage;
                    // Phase courante : 0=commande 1=cuisine 2=repas 3=nettoyage
                    const svgPhase=isOrdering?0:isCooking?1:isMange?2:isNettoyage?3:-1;
                    // Pct de la phase active
                    const svgPhasePct=
                      svgPhase===0?Math.min(100,Math.round((1-(Math.max(0,(t.svcUntil-now))/((t.svcUntil-t.placedAt)||1)))*100)):
                      svgPhase===1?cookPctSvg:
                      svgPhase===2?eatPct:
                      svgPhase===3?(t.cleanUntil?Math.min(100,Math.round(((t.cleanDur*1000-(t.cleanUntil-now))/(t.cleanDur*1000))*100)):0):
                      0;
                    const svgPhaseColor=
                      svgPhase===0?"#3a5f8a":
                      svgPhase===1?"#e07a45":
                      svgPhase===2?"#4a9e78":
                      svgPhase===3?"#f5a623":"#888";

                    return(
                      <g key={t.id} onClick={()=>setSelectedTable(t)} style={{cursor:"pointer"}}>

                        {/* Halo sélection */}
                        {t.id===selectedTable?.id&&(
                          <rect x={pos.cx-tw/2-7} y={pos.cy-th/2-7}
                            width={tw+14} height={th+14} rx="13"
                            fill="none" stroke="#1a1612" strokeWidth="2.5"
                            opacity="0.25" strokeDasharray="5 3"/>
                        )}

                        {/* Chaises latérales */}
                        {[{dx:-(tw/2+7),dy:0},{dx:tw/2+7,dy:0}].map((ch,ci)=>(
                          <ellipse key={`s${ci}`}
                            cx={pos.cx+ch.dx} cy={pos.cy+ch.dy}
                            rx="5" ry="7" fill="#d4c9b0" opacity="0.75"/>
                        ))}
                        {/* Chaises haut/bas si 4p+ */}
                        {t.capacity>=4&&[{dx:0,dy:-(th/2+7)},{dx:0,dy:th/2+7}].map((ch,ci)=>(
                          <ellipse key={`tb${ci}`}
                            cx={pos.cx+ch.dx} cy={pos.cy+ch.dy}
                            rx="7" ry="5" fill="#d4c9b0" opacity="0.75"/>
                        ))}
                        {/* Chaises supplémentaires si 6p */}
                        {t.capacity>=6&&[
                          {dx:-(tw/2+7),dy:-th/4},{dx:-(tw/2+7),dy:th/4},
                          {dx:tw/2+7,     dy:-th/4},{dx:tw/2+7,     dy:th/4},
                        ].map((ch,ci)=>(
                          <ellipse key={`ex${ci}`}
                            cx={pos.cx+ch.dx} cy={pos.cy+ch.dy}
                            rx="4" ry="6" fill="#d4c9b0" opacity="0.65"/>
                        ))}

                        {/* Surface de la table */}
                        <rect x={pos.cx-tw/2} y={pos.cy-th/2}
                          width={tw} height={th} rx="8"
                          fill={fill} stroke={stroke} strokeWidth={strokeW}
                          opacity={isLibre&&myQ.length===0?0.85:1}/>

                        {/* Barre de progression — phase unique (repart à 0 à chaque phase) */}
                        {isActive&&svgPhase>=0&&(
                          <g>
                            {/* Fond de la barre */}
                            <rect
                              x={pos.cx-tw/2+3} y={pos.cy+th/2-10}
                              width={tw-6} height={7} rx="3.5"
                              fill="rgba(0,0,0,0.28)"
                            />
                            {/* Barre de progression — couleur de la phase en cours */}
                            <rect
                              x={pos.cx-tw/2+3} y={pos.cy+th/2-10}
                              width={Math.max(0,(tw-6)*svgPhasePct/100)}
                              height={7} rx="3.5"
                              fill={svgPhaseColor}
                              opacity="0.95"
                            />

                          </g>
                        )}

                        {/* Numéro */}
                        <text x={pos.cx} y={pos.cy-3}
                          textAnchor="middle"
                          fontSize={cols<=3?12:10} fontWeight="700"
                          fill={isLibre&&myQ.length===0?"#2a5c3f":"white"}
                          fontFamily="Georgia,serif">
                          {t.name.replace("Table ","")}
                        </text>

                        {/* Icône statut + couverts */}
                        <text x={pos.cx} y={pos.cy+10}
                          textAnchor="middle"
                          fontSize={cols<=3?9:8}
                          fill={isLibre&&myQ.length===0?"#4a7c5f":"rgba(255,255,255,0.9)"}
                          fontFamily="sans-serif">
                          {isNettoyage?"🧹":isMange&&isEating?"🍴":isMange?"💰":
                            isOrdering?"🛎":t.status==="occupée"?"🔥":
                            myQ.length>0?"👥":`✓ ${t.capacity}p`}
                        </text>

                        {/* Badge montant prêt à encaisser */}
                        {isMange&&!isEating&&(
                          <g>
                            <rect x={pos.cx-19} y={pos.cy-th/2-16}
                              width={38} height={14} rx="7" fill={C.green} opacity="0.95"/>
                            <text x={pos.cx} y={pos.cy-th/2-6}
                              textAnchor="middle" fontSize="8" fontWeight="800"
                              fill="white" fontFamily="sans-serif">
                              💰{themedBill.toFixed(0)}€
                            </text>
                          </g>
                        )}

                        {/* Badge VIP */}
                        {t.group?.isVIP&&(
                          <text x={pos.cx+tw/2-5} y={pos.cy-th/2+10}
                            textAnchor="middle" fontSize="10">🎩</text>
                        )}

                        {/* Pulse attente client */}
                        {isLibre&&myQ.length>0&&(
                          <rect x={pos.cx-tw/2} y={pos.cy-th/2}
                            width={tw} height={th} rx="8"
                            fill="none" stroke={C.green} strokeWidth="2.5"
                            opacity="0.7">
                            <animate attributeName="opacity"
                              values="0.7;0.1;0.7" dur="1.8s" repeatCount="indefinite"/>
                          </rect>
                        )}

                        {/* Silhouettes clients sur table occupée */}
                        {!isLibre&&t.group&&(()=>{
                          const sz = Math.min(t.group.size, 6);
                          const nc = sz<=2?sz:sz<=4?2:3;
                          const nr = Math.ceil(sz/nc);
                          const sW = (tw-8)/nc;
                          const sH = (th-14)/nr;
                          const emo = isMange&&isEating?"🍴":isMange?"😊":isCooking?"⏳":isOrdering?"🛎":"🧹";
                          return Array.from({length:sz},(_,si)=>{
                            const sc = si%nc;
                            const sr = Math.floor(si/nc);
                            const sx = pos.cx-tw/2+4+sc*sW+sW/2;
                            const sy2 = pos.cy-th/2+4+sr*sH+sH/2;
                            return(
                              <text key={si} x={sx} y={sy2+4}
                                textAnchor="middle"
                                fontSize={sW>14?10:8}
                                fontFamily="sans-serif"
                                opacity="0.9">
                                {emo}
                              </text>
                            );
                          });
                        })()}

                        {/* Humeur groupe au-dessus */}
                        {!isLibre&&t.group&&(
                          <text x={pos.cx} y={pos.cy-th/2-4}
                            textAnchor="middle" fontSize="9"
                            fontFamily="sans-serif" opacity="0.9">
                            {t.group.mood.e}
                          </text>
                        )}
                      </g>
                    );
                  })}

                  {/* ── Serveurs — points colorés animés ── */}
                  {servers.filter(s=>s.status==="actif"||s.status==="service").map((srv,si)=>{
                    const sl2  = srvLv(srv.totalXp);
                    const slD2 = SRV_LVL[Math.min(sl2.l, SRV_LVL.length-1)];
                    const assignedTable = tables.find(t=>t.server===srv.name&&t.status!=="libre");
                    let sdx, sdy;
                    if(assignedTable){
                      const ai = tables.indexOf(assignedTable);
                      const ap = getPos(ai);
                      const atw = assignedTable.capacity<=2?40:assignedTable.capacity<=4?50:60;
                      const ath = assignedTable.capacity<=2?32:assignedTable.capacity<=4?38:44;
                      sdx = ap.cx + atw/2 + 8;
                      sdy = ap.cy - ath/2 + 8;
                    } else {
                      const actIdx = servers.filter(s=>s.status==="actif"||s.status==="service").indexOf(srv);
                      sdx = ML + 14 + actIdx * 22;
                      sdy = MT - 16;
                    }
                    const moral2  = srv.moral ?? 100;
                    const dotCol  = moral2 <= 10 ? "#c0392b" : slD2.color;
                    return(
                      <g key={"srv"+srv.id}>
                        <circle cx={sdx} cy={sdy+2} r="7" fill="rgba(0,0,0,0.10)"/>
                        <circle cx={sdx} cy={sdy} r="7" fill={dotCol} opacity="0.92"
                          stroke="white" strokeWidth="1.5">
                          {srv.status==="service"&&(
                            <animate attributeName="r" values="7;9;7" dur="0.7s" repeatCount="indefinite"/>
                          )}
                        </circle>
                        <text x={sdx} y={sdy+4} textAnchor="middle"
                          fontSize="8" fontFamily="sans-serif">{slD2.icon}</text>
                      </g>
                    );
                  })}
                </svg>
        </div>

        {/* Overlay gauche — File d'attente */}
        {(queue.length>0||waitlist.length>0)&&(
          <div style={{
            position:"absolute",left:0,top:0,bottom:0,width:210,zIndex:20,
            background:"rgba(255,255,255,0.93)",backdropFilter:"blur(8px)",
            borderRight:`1px solid ${C.border}`,
            display:"flex",flexDirection:"column",
          }}>
            <div style={{padding:"8px 12px",borderBottom:`1px solid ${C.border}`,
              fontWeight:700,fontSize:12,color:C.navy,fontFamily:F.title,
              display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
              🚶 File d'attente
              {queue.length>=5&&<span style={{fontSize:9,background:C.redP,color:C.red,
                borderRadius:20,padding:"1px 6px",fontWeight:700,fontFamily:F.body,
                animation:"pulse 1.2s infinite"}}>🚨</span>}
            </div>
            <div style={{overflowY:"auto",flex:1,padding:8,display:"flex",
              flexDirection:"column",gap:6}}>
              {queue.map(g=>{
                const pct=Math.max(0,(g.expiresAt-now)/(g.patMax*1000));
                const col=pct>0.5?C.green:pct>0.25?C.amber:C.red;
                const freeT=tables.filter(t=>t.status==="libre"&&t.capacity>=g.size);
                const actSrv=servers.filter(s=>s.status==="actif"&&(s.moral??100)>10);
                return(
                  <div key={g.id} style={{background:C.surface,border:`1px solid ${col}33`,
                    borderLeft:`3px solid ${col}`,borderRadius:9,padding:"8px 10px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:4}}>
                      <span style={{fontSize:18}}>{g.mood.e}</span>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:11,fontWeight:700,color:C.ink,fontFamily:F.body,
                          overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{g.name}</div>
                        <div style={{fontSize:9,color:C.muted,fontFamily:F.body}}>{g.size}p · {g.mood.l}{g.isVIP?" 🎩":""}</div>
                      </div>
                    </div>
                    <div style={{height:3,background:col+"22",borderRadius:99,overflow:"hidden",marginBottom:5}}>
                      <div style={{height:"100%",width:`${pct*100}%`,background:col,borderRadius:99,transition:"width 0.3s"}}/>
                    </div>
                    {freeT.length>0&&actSrv.length>0
                      ?<Btn full sm v="primary" onClick={()=>quickPlace(g)} icon="➡️">Placer</Btn>
                      :freeT.length>0
                      ?<Btn full sm v="secondary" onClick={()=>openAssign(g)} icon="🪑">Choisir serveur</Btn>
                      :<div style={{fontSize:9,color:C.muted,fontFamily:F.body,textAlign:"center",padding:"2px 0"}}>{freeT.length===0?"Pas de table":"Pas de serveur"}</div>
                    }
                  </div>
                );
              })}
              {waitlist.length>0&&(
                <div style={{borderTop:`1px solid ${C.border}`,paddingTop:8,marginTop:4}}>
                  <div style={{fontSize:9,color:C.muted,fontFamily:F.body,fontWeight:600,
                    textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:5}}>📞 Rappelables</div>
                  {waitlist.map(g=>{
                    const rem=Math.max(0,Math.ceil((g.recallUntil-now)/1000));
                    return(
                      <div key={"w"+g.id} style={{background:C.bg,borderRadius:8,
                        padding:"5px 8px",marginBottom:3,display:"flex",alignItems:"center",gap:6}}>
                        <span style={{fontSize:13}}>{g.mood.e}</span>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:10,fontWeight:600,color:C.ink,fontFamily:F.body,
                            overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{g.name}</div>
                          <div style={{fontSize:9,color:C.muted,fontFamily:F.body}}>{g.size}p · {rem}s</div>
                        </div>
                        <Btn sm v="ghost" onClick={()=>recallGroup(g)}>📞</Btn>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Overlay droit — Détail table */}
        {selectedTable&&(
          <div style={{
            position:"absolute",right:0,top:0,bottom:0,width:255,zIndex:20,
            background:"rgba(255,255,255,0.95)",backdropFilter:"blur(8px)",
            borderLeft:`1px solid ${C.border}`,
            overflowY:"auto",boxShadow:"-4px 0 20px rgba(0,0,0,0.08)",
          }}>
            <div style={{padding:"8px 12px",borderBottom:`1px solid ${C.border}`,
              display:"flex",justifyContent:"space-between",alignItems:"center",
              position:"sticky",top:0,background:"rgba(255,255,255,0.96)",zIndex:5}}>
              <span style={{fontSize:12,fontWeight:700,color:C.ink,fontFamily:F.title}}>
                📋 {selectedTable.name}
              </span>
              <button onClick={()=>setSelectedTable(null)} style={{
                background:"none",border:"none",fontSize:16,cursor:"pointer",
                color:C.muted,padding:"0 4px",lineHeight:1}}>✕</button>
            </div>
            <div style={{padding:10}}>
                          {(()=>{
              const t=selectedTable;
              // Refresh from live tables
              const tLive=tables.find(x=>x.id===t.id)||t;
              const isMange=tLive.status==="mange";
              const isNettoyage=tLive.status==="nettoyage";
              const isOrdering=tLive.status==="occupée"&&tLive.svcUntil&&now<tLive.svcUntil;
              const bill=isMange?tLive.order.reduce((s,o)=>s+o.price*o.qty,0):0;
              const themedBill=+(bill*menuTheme.priceMult).toFixed(2);
              const isEating=isMange&&tLive.eatUntil&&now<tLive.eatUntil;
              const eatSecsLeft=isEating?Math.ceil((tLive.eatUntil-now)/1000):0;
              const cleanSecsLeft=isNettoyage&&tLive.cleanUntil?Math.max(0,Math.ceil((tLive.cleanUntil-now)/1000)):0;
              const cleanPct=isNettoyage&&tLive.cleanUntil?Math.min(100,Math.round(((tLive.cleanDur*1000-(tLive.cleanUntil-now))/(tLive.cleanDur*1000))*100)):0;
              const eatPct=isEating?Math.min(100,Math.round(((tLive.eatDur*1000-(tLive.eatUntil-now))/(tLive.eatDur*1000))*100)):100;
              const secsLeft=isOrdering?Math.max(0,Math.ceil((tLive.svcUntil-now)/1000)):0;
              const myQ=queue.filter(g=>g.size<=tLive.capacity&&tLive.status==="libre");
              const accentColor=isNettoyage?C.amber:isMange?C.green:isOrdering?C.navy:tLive.status==="occupée"?C.terra:C.green;

              return(
                <div style={{background:C.surface,border:`1.5px solid ${accentColor}44`,
                  borderRadius:16,overflow:"hidden",
                  boxShadow:`0 4px 20px ${accentColor}18`}}>

                  {/* Header */}
                  <div style={{background:`linear-gradient(135deg,${accentColor}18,${accentColor}08)`,
                    padding:"14px 16px",borderBottom:`1px solid ${accentColor}22`}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div>
                        <div style={{fontSize:18,fontWeight:800,color:C.ink,fontFamily:F.title}}>
                          {tLive.name}
                          {tLive.group?.isVIP&&<span style={{marginLeft:6}}>🎩</span>}
                        </div>
                        <div style={{fontSize:11,color:accentColor,fontWeight:600,
                          fontFamily:F.body,marginTop:3}}>
                          {isNettoyage?"🧹 Nettoyage":isMange&&isEating?"🍴 Repas en cours":
                            isMange?"💰 Prêt à encaisser":isOrdering?"🛎 Prise de commande":
                            tLive.status==="occupée"?"🔥 En cuisine":"✅ Libre"}
                        </div>
                      </div>
                      <div style={{textAlign:"right"}}>
                        <div style={{fontSize:22,fontWeight:800,color:accentColor,fontFamily:F.title}}>
                          {tLive.capacity}
                        </div>
                        <div style={{fontSize:9,color:C.muted,fontFamily:F.body}}>couverts</div>
                      </div>
                    </div>
                  </div>

                  <div style={{padding:"12px 16px",display:"flex",flexDirection:"column",gap:10}}>

                    {/* Groupe */}
                    {tLive.group&&(
                      <div style={{background:C.bg,borderRadius:10,padding:"10px 12px"}}>
                        <div style={{fontSize:13,fontWeight:700,color:C.ink,fontFamily:F.body,marginBottom:3}}>
                          {tLive.group.mood.e} {tLive.group.name}
                        </div>
                        <div style={{fontSize:11,color:C.muted,fontFamily:F.body}}>
                          👥 {tLive.group.size}p · {tLive.group.mood.l}
                          {tLive.server&&<span> · 👔 {tLive.server}</span>}
                        </div>
                      </div>
                    )}

                    {/* Commande */}
                    {(tLive.order||[]).length>0&&(
                      <div>
                        <div style={{fontSize:10,color:C.muted,fontWeight:600,
                          textTransform:"uppercase",letterSpacing:"0.06em",
                          fontFamily:F.body,marginBottom:5}}>Commande</div>
                        <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                          {tLive.order.map((o,i)=>(
                            <span key={i} style={{fontSize:10,
                              background:o.isSpecial?C.purpleP:C.terraP,
                              color:o.isSpecial?C.purple:C.terra,
                              borderRadius:5,padding:"2px 6px",fontFamily:F.body}}>
                              {o.qty}× {o.item}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ── Phase timeline — panneau détail ── */}
                    {(tLive.status==="occupée"||isMange||isNettoyage)&&(()=>{
                      const isCooking=tLive.status==="occupée"&&!isOrdering;
                      const panelCooking=kitchen.cooking.filter(d=>d.tableId===tLive.id);
                      const panelSlowest=panelCooking.length>0
                        ?panelCooking.reduce((a,b)=>(b.startedAt+b.timerMax*1000)>(a.startedAt+a.timerMax*1000)?b:a)
                        :null;
                      const panelCookPct=panelSlowest
                        ?Math.min(100,Math.round(((now-panelSlowest.startedAt)/(panelSlowest.timerMax*1000))*100))
                        :isCooking?null:isMange||isNettoyage?100:0;
                      const panelCookRemaining=panelSlowest
                        ?Math.max(0,Math.ceil((panelSlowest.startedAt+panelSlowest.timerMax*1000-now)/1000))
                        :null;
                      const panelPhases=[
                        {id:"commande",icon:"🛎",label:"Commande",color:C.navy,
                          done:!isOrdering&&(isCooking||isMange||isNettoyage),
                          active:isOrdering,
                          pct:isOrdering?Math.min(100,Math.round((1-secsLeft/((tLive.svcUntil-tLive.placedAt)/1000||30))*100)):100,
                          timer:isOrdering?secsLeft:null},
                        {id:"cuisine",icon:"🔥",label:"Cuisine",color:C.terra,
                          done:isMange||isNettoyage,active:isCooking,
                          pct:panelCookPct,timer:panelCookRemaining},
                        {id:"repas",icon:"🍴",label:"Repas",color:C.green,
                          done:isNettoyage,active:isMange,
                          pct:isMange?(isEating?eatPct:100):isNettoyage?100:0,
                          timer:isEating?eatSecsLeft:null},
                        {id:"nettoyage",icon:"🧹",label:"Nettoyage",color:C.amber,
                          done:false,active:isNettoyage,
                          pct:isNettoyage?cleanPct:0,timer:isNettoyage?cleanSecsLeft:null},
                      ];
                      const activeP=panelPhases.find(p=>p.active);
                      return(
                        <div>
                          {/* Steps */}
                          <div style={{display:"flex",alignItems:"center",marginBottom:8}}>
                            {panelPhases.map((ph,pi)=>(
                              <div key={ph.id} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",position:"relative"}}>
                                {pi>0&&<div style={{position:"absolute",left:0,top:11,width:"50%",height:2,background:panelPhases[pi-1].done||panelPhases[pi-1].active?ph.color+"55":C.border}}/>}
                                {pi<panelPhases.length-1&&<div style={{position:"absolute",right:0,top:11,width:"50%",height:2,background:ph.done?ph.color+"55":C.border}}/>}
                                <div style={{
                                  width:24,height:24,borderRadius:"50%",zIndex:1,position:"relative",
                                  background:ph.done?"#fff":ph.active?ph.color:C.bg,
                                  border:`2px solid ${ph.done||ph.active?ph.color:C.border}`,
                                  display:"flex",alignItems:"center",justifyContent:"center",
                                  fontSize:11,
                                  boxShadow:ph.active?`0 0 0 4px ${ph.color}22`:"none",
                                  transition:"all 0.3s",
                                }}>
                                  {ph.done?<span style={{color:ph.color,fontWeight:800,fontSize:11}}>✓</span>
                                    :ph.active?<span style={{animation:ph.pct===null?"pulse 1s infinite":undefined}}>{ph.icon}</span>
                                    :<span style={{fontSize:8,color:C.muted,fontWeight:700}}>{pi+1}</span>}
                                </div>
                                <div style={{fontSize:8,color:ph.active?ph.color:ph.done?ph.color+"88":C.muted,
                                  fontWeight:ph.active?700:400,marginTop:4,fontFamily:F.body,whiteSpace:"nowrap"}}>
                                  {ph.label}
                                </div>
                              </div>
                            ))}
                          </div>
                          {/* Active phase bar */}
                          {activeP&&(
                            <div style={{marginBottom:10}}>
                              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4,fontSize:10,fontFamily:F.body}}>
                                <span style={{color:activeP.color,fontWeight:700}}>{activeP.icon} {activeP.label} en cours</span>
                                {activeP.timer!==null&&<span style={{color:C.muted,fontWeight:600}}>
                                  {Math.floor(activeP.timer/60)}:{String(activeP.timer%60).padStart(2,"0")}
                                </span>}
                              </div>
                              <div style={{height:8,background:C.border,borderRadius:99,overflow:"hidden",position:"relative"}}>
                                {activeP.pct===null
                                  ?<div style={{position:"absolute",inset:0,background:`linear-gradient(90deg,transparent,${activeP.color}77,transparent)`,backgroundSize:"200% 100%",animation:"shimmerBar 1.6s ease-in-out infinite"}}/>
                                  :<div style={{width:`${activeP.pct}%`,height:"100%",background:`linear-gradient(90deg,${activeP.color}cc,${activeP.color})`,borderRadius:99,transition:"width 0.5s linear",position:"relative",overflow:"hidden"}}>
                                    <div style={{position:"absolute",inset:0,background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.28),transparent)",backgroundSize:"200% 100%",animation:"shimmerBar 2s ease-in-out infinite"}}/>
                                  </div>
                                }
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Note prévisionnelle */}
                    {isMange&&tLive.group&&(()=>{
                      const r=calcRating(tLive.patienceLeftRatio??0.5,tLive.group.mood.b);
                      const rc=ratingColor(r);
                      return(
                        <div style={{background:rc+"11",border:`1px solid ${rc}33`,
                          borderRadius:8,padding:"7px 10px",marginBottom:6,
                          display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                          <span style={{fontSize:14,color:rc,letterSpacing:"2px"}}>{ratingStars(r)}</span>
                          <span style={{fontSize:11,color:rc,fontWeight:700,fontFamily:F.body}}>
                            {themedBill.toFixed(2)}€
                          </span>
                        </div>
                      );
                    })()}

                    {/* Actions */}
                    <div style={{display:"flex",flexDirection:"column",gap:6,paddingTop:4}}>

                      {/* Encaisser */}
                      {isMange&&(
                        <Btn full v={isEating?"disabled":"primary"}
                          onClick={isEating?null:()=>{checkout(tLive.id);setSelectedTable(null);}}
                          icon={isEating?"⏳":"💰"}>
                          {isEating?"Patienter…":`Encaisser ${themedBill.toFixed(2)}€`}
                        </Btn>
                      )}

                      {/* Placer un groupe */}
                      {tLive.status==="libre"&&(
                        <>
                          {myQ.length>0?(
                            <Sel value="" style={{fontSize:11,padding:"6px 10px"}}
                              onChange={e=>{
                                const id=parseFloat(e.target.value);
                                const g=queue.find(x=>x.id===id);
                                if(g){activeSrv.length>0?quickPlace(g):openAssign(g);}
                              }}>
                              <option value="">↳ Placer un groupe…</option>
                              {myQ.map(g=>(
                                <option key={g.id} value={g.id}>
                                  {g.mood.e} {g.name} ({g.size}p)
                                </option>
                              ))}
                            </Sel>
                          ):(
                            <div style={{fontSize:11,color:C.muted,fontStyle:"italic",
                              fontFamily:F.body,textAlign:"center",padding:"6px 0"}}>
                              Aucun groupe compatible en attente
                            </div>
                          )}
                        </>
                      )}

                      {/* Agrandir table */}
                      {tLive.status==="libre"&&tLive.capLv<2&&(()=>{
                        const up=CAP_UPGRADES[tLive.capLv];
                        const canAfford=cash>=up.cost;
                        return(
                          <Btn sm v={canAfford?"navy":"disabled"} disabled={!canAfford}
                            onClick={()=>{
                              if(!canAfford)return;
                              setTables(p=>p.map(x=>x.id!==tLive.id?x:{...x,capacity:up.newCap,capLv:tLive.capLv+1}));
                              setCash(c=>+(c-up.cost).toFixed(2));
                              addTx("achat",`Agrandissement ${tLive.name} → ${up.newCap} couverts`,up.cost);
                              addToast({icon:"🪑",title:"Table agrandie !",msg:`${tLive.name} passe à ${up.newCap} couverts`,color:C.navy,tab:"tables"});
                              if(onTableUpgrade)onTableUpgrade();
                            }}>
                            🪑 {up.label} — {up.cost}€
                          </Btn>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Mobile overlay */}
        {bp.isMobile&&(
          <div style={{position:"absolute",inset:0,overflowY:"auto",
            padding:8,background:"rgba(250,247,240,0.97)",zIndex:15}}>
            {tables.map(t=>{
              const isMm=t.status==="mange";const isNm=t.status==="nettoyage";
              const isOm=t.status==="occupée"&&t.svcUntil&&now<t.svcUntil;
              const isLm=t.status==="libre";const isCm=t.status==="occupée"&&!isOm;
              const isEm=isMm&&t.eatUntil&&now<t.eatUntil;
              const myQm=queue.filter(g=>g.size<=t.capacity&&isLm);
              const aSm=servers.filter(s=>s.status==="actif"&&(s.moral??100)>10);
              const ph=isOm?0:isCm?1:isMm?2:isNm?3:-1;
              const pCs=["#3a5f8a","#e07a45","#4a9e78","#f5a623"];
              const pIs=["🛎","🔥","🍴","🧹"];const pLs=["Commande","Cuisine","Repas","Nettoyage"];
              const pC=ph>=0?pCs[ph]:C.green;
              const ckT=kitchen.cooking.filter(d=>d.tableId===t.id);
              const slw=ckT.length>0?ckT.reduce((a,b)=>(b.startedAt+b.timerMax*1000)>(a.startedAt+a.timerMax*1000)?b:a):null;
              const pc=ph===0?Math.min(100,Math.round((1-(Math.max(0,(t.svcUntil-now))/((t.svcUntil-t.placedAt)||1)))*100)):ph===1?(slw?Math.min(100,Math.round(((now-slw.startedAt)/(slw.timerMax*1000))*100)):0):ph===2?(isEm?Math.min(100,Math.round(((t.eatDur*1000-(t.eatUntil-now))/(t.eatDur*1000))*100)):100):ph===3?(t.cleanUntil?Math.min(100,Math.round(((t.cleanDur*1000-(t.cleanUntil-now))/(t.cleanDur*1000))*100)):0):0;
              const bl=isMm?+(t.order.reduce((s,o)=>s+o.price*o.qty,0)*menuTheme.priceMult).toFixed(2):0;
              return(
                <div key={t.id} style={{background:C.surface,
                  border:`1.5px solid ${ph>=0?pC+"55":C.border}`,
                  borderLeft:`4px solid ${ph>=0?pC:C.green}`,
                  borderRadius:11,padding:"9px 11px",marginBottom:7}}>
                  <div style={{display:"flex",justifyContent:"space-between",
                    alignItems:"center",marginBottom:4}}>
                    <span style={{fontSize:13,fontWeight:800,color:C.ink,fontFamily:F.title}}>
                      {t.name}
                    </span>
                    <span style={{fontSize:9,background:ph>=0?pC+"18":C.greenP,
                      color:ph>=0?pC:C.green,borderRadius:20,padding:"1px 7px",
                      fontWeight:600,fontFamily:F.body}}>
                      {ph>=0?pIs[ph]+" "+pLs[ph]:"✅ Libre"}
                    </span>
                  </div>
                  {ph>=0&&<div style={{height:3,background:pC+"22",borderRadius:99,
                    overflow:"hidden",marginBottom:5}}>
                    <div style={{height:"100%",width:`${pc}%`,background:pC,
                      borderRadius:99,transition:"width 0.5s"}}/>
                  </div>}
                  {t.group&&<div style={{fontSize:10,color:C.muted,fontFamily:F.body,marginBottom:5}}>
                    {t.group.mood.e} {t.group.name} · {t.group.size}p{t.server?" · 👔 "+t.server:""}
                  </div>}
                  {isMm&&!isEm&&<Btn full v="primary" sm onClick={()=>checkout(t.id)} icon="💰">Encaisser {bl}€</Btn>}
                  {isLm&&myQm.length>0&&aSm.length>0&&<Btn full v="terra" sm onClick={()=>quickPlace(myQm[0])} icon="👥">Placer</Btn>}
                  {isLm&&myQm.length>0&&aSm.length===0&&<Btn full v="secondary" sm onClick={()=>openAssign(myQm[0])} icon="👥">Placer</Btn>}
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* ══ 3. BARRE CUISINE — bas 64px ═══════════════════════ */}
      <div style={{height:64,flexShrink:0,background:C.surface,
        borderTop:`1px solid ${C.border}`,
        display:"flex",alignItems:"center",
        overflowX:"auto",scrollbarWidth:"none",zIndex:10}}>
        {kitchen.cooking.length===0&&tables.filter(t=>t.status==="nettoyage").length===0?(
          <div style={{padding:"0 18px",fontSize:11,color:C.muted,
            fontFamily:F.body,fontStyle:"italic",whiteSpace:"nowrap"}}>
            🍽 Salle au calme
          </div>
        ):(
          <>
            {kitchen.cooking.map(d=>{
              const rem=Math.max(0,Math.ceil((d.startedAt+d.timerMax*1000-now)/1000));
              const pct=d.timerMax>0?Math.min(100,((d.timerMax-rem)/d.timerMax)*100):0;
              const fmt=s=>s>=60?Math.floor(s/60)+"m"+String(s%60).padStart(2,"0")+"s":s+"s";
              const done=pct>=100;
              return(
                <div key={d.id}
                  onClick={()=>{const t=tables.find(x=>x.id===d.tableId);if(t)setSelectedTable(t);}}
                  style={{flexShrink:0,padding:"0 13px",
                    borderRight:`1px solid ${C.border}`,height:"100%",
                    display:"flex",flexDirection:"column",justifyContent:"center",
                    gap:3,cursor:"pointer",minWidth:120,
                    background:done?"#eaf7ef":"transparent"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span style={{fontSize:11,fontWeight:600,color:done?C.green:C.terra,
                      fontFamily:F.body,maxWidth:80,overflow:"hidden",
                      textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                      {done?"✅ ":"🔥 "}{d.name}
                    </span>
                    <span style={{fontSize:10,color:done?C.green:C.terra,
                      fontWeight:700,fontFamily:F.body,marginLeft:4}}>
                      {done?"Prêt!":fmt(rem)}
                    </span>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:4}}>
                    <div style={{height:3,flex:1,background:C.terra+"22",borderRadius:99,overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${pct}%`,
                        background:done?C.green:C.terra,borderRadius:99,transition:"width 0.3s"}}/>
                    </div>
                    {d.tableName&&<span style={{fontSize:9,color:C.muted,fontFamily:F.body,flexShrink:0}}>
                      {d.tableName}
                    </span>}
                  </div>
                </div>
              );
            })}
            {tables.filter(t=>t.status==="nettoyage").map(t=>{
              const rem=t.cleanUntil?Math.max(0,Math.ceil((t.cleanUntil-now)/1000)):0;
              return(
                <div key={"cl"+t.id} style={{flexShrink:0,padding:"0 12px",
                  borderRight:`1px solid ${C.border}`,height:"100%",
                  display:"flex",flexDirection:"column",justifyContent:"center",
                  gap:2,minWidth:90}}>
                  <span style={{fontSize:11,color:C.amber,fontWeight:600,fontFamily:F.body}}>
                    🧹 {t.name}
                  </span>
                  <span style={{fontSize:10,color:C.muted,fontFamily:F.body}}>
                    {rem>0?rem+"s":"Prête !"}
                  </span>
                </div>
              );
            })}
          </>
        )}
      </div>

            {/* Assign modal */}
      {modal&&(
        <Modal title="Placer le groupe" onClose={()=>setModal(null)}>
          <div style={{display:"flex",flexDirection:"column",gap:18}}>
            {/* Client info */}
            <div style={{background:C.navyP,border:`1px solid ${C.navy}22`,
              borderRadius:12,padding:"14px 16px",display:"flex",alignItems:"center",gap:14}}>
              <span style={{fontSize:38}}>{modal.mood.e}</span>
              <div>
                <div style={{fontSize:17,fontWeight:600,color:C.ink,fontFamily:F.title}}>{modal.name}</div>
                <div style={{fontSize:12,color:C.muted,fontFamily:F.body}}>
                  Groupe de {modal.size} · {modal.mood.l}
                </div>
                <div style={{fontSize:11,color:C.navy,fontWeight:600,marginTop:3,fontFamily:F.body}}>
                  Bonus XP ×{modal.mood.b}
                </div>
              </div>
            </div>

            {/* Table picker */}
            <div>
              <Lbl>Choisir une table</Lbl>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
                {freeTbl(modal).map(t=>{

                  const sel=tgtT===String(t.id);
                  return(
                    <div key={t.id} onClick={()=>setTgtT(String(t.id))}
                      style={{background:sel?C.greenP:C.bg,
                        border:`2px solid ${sel?C.green:C.border}`,
                        borderRadius:10,padding:"11px 13px",cursor:"pointer"}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                        <span style={{fontWeight:600,color:C.ink,fontSize:13,fontFamily:F.body}}>{t.name}</span>
                        <span style={{fontSize:17}}>🪑</span>
                      </div>
                      <div style={{fontSize:10,color:C.muted,fontFamily:F.body}}>
                        👥 {t.capacity} couverts
                      </div>
                      {t.freedAt&&(
                        <div style={{fontSize:9,color:C.green,fontWeight:600,marginTop:3,fontFamily:F.body}}>
                          ✓ Libre depuis {new Date(t.freedAt).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}
                        </div>
                      )}
                    </div>
                  );
                })}
                {freeTbl(modal).length===0&&(
                  <div style={{color:C.red,fontSize:13,gridColumn:"1/-1",fontFamily:F.body,padding:"8px 0"}}>
                    Aucune table disponible.
                  </div>
                )}
              </div>
            </div>

            {/* Server picker */}
            <div>
              <Lbl>Choisir un serveur</Lbl>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {activeSrv.map(sv=>{
                  const sl=srvLv(sv.totalXp);
                  const slD=SRV_LVL[Math.min(sl.l,SRV_LVL.length-1)];
                  const sel=tgtS===sv.name;
                  return(
                    <div key={sv.id} onClick={()=>setTgtS(sv.name)}
                      style={{background:sel?C.greenP:C.bg,
                        border:`2px solid ${sel?C.green:C.border}`,
                        borderRadius:10,padding:"11px 13px",cursor:"pointer",
                        display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div>
                        <div style={{fontWeight:600,color:C.ink,fontSize:13,fontFamily:F.body}}>{sv.name}</div>
                        <div style={{display:"flex",gap:6,marginTop:4}}>
                          <Badge color={slD.color} sm>{slD.icon} {slD.name}</Badge>
                          <span style={{fontSize:10,color:C.muted,fontFamily:F.body}}>⭐ {sv.rating}</span>
                        </div>
                      </div>
                      <div style={{width:72}}>
                        <div style={{fontSize:10,color:C.muted,textAlign:"right",marginBottom:3,fontFamily:F.body}}>
                          {sl.r}/{sl.n}
                        </div>
                        <XpBar xp={sl.r} needed={sl.n} color={slD.color} h={3}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Order preview */}
            {preview.length>0&&(
              <div style={{background:C.terraP,border:`1.5px solid ${C.terra}33`,borderRadius:12,padding:14}}>
                <div style={{fontSize:12,fontWeight:600,color:C.terra,marginBottom:10,fontFamily:F.body}}>
                  📋 Commande du serveur (aperçu)
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {preview.map((o,i)=>(
                    <div key={i} style={{display:"flex",justifyContent:"space-between",
                      alignItems:"center",fontSize:12,fontFamily:F.body}}>
                      <div style={{display:"flex",gap:7,alignItems:"center"}}>
                        <Badge color={catColors[o.cat]||C.navy} sm>{o.cat}</Badge>
                        <span style={{color:C.ink}}>{o.qty}× {o.item}</span>
                      </div>
                      <span style={{color:C.terra,fontWeight:600}}>{(o.price*o.qty).toFixed(2)}€</span>
                    </div>
                  ))}
                  <div style={{borderTop:`1px solid ${C.terra}33`,paddingTop:8,marginTop:2,
                    display:"flex",justifyContent:"space-between",fontWeight:700,fontFamily:F.title}}>
                    <span style={{fontSize:12,color:C.muted}}>Total estimé</span>
                    <span style={{color:C.terra,fontSize:16}}>
                      {preview.reduce((s,o)=>s+o.price*o.qty,0).toFixed(2)}€
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
              <Btn onClick={()=>setModal(null)} v="ghost">Annuler</Btn>
              <Btn onClick={confirm} disabled={!tgtT||!tgtS||preview.length===0} v="terra" icon="🔥">
                Envoyer en cuisine
              </Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
