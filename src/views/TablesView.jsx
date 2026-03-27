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
    <div>
      {/* Active event banner */}
      {activeEvent&&(()=>{
        const evt=GAME_EVENTS.find(e=>e.id===activeEvent);
        if(!evt)return null;
        return(
          <div style={{background:C.amberP,border:`1.5px solid ${C.amber}`,
            borderRadius:12,padding:"10px 16px",marginBottom:14,
            display:"flex",alignItems:"center",gap:10,animation:"pulse 1s ease-in-out"}}>
            <span style={{fontSize:22}}>{evt.icon}</span>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:700,color:C.amber,fontFamily:F.title}}>{evt.title}</div>
              <div style={{fontSize:11,color:C.ink,fontFamily:F.body,marginTop:2}}>{evt.desc}</div>
            </div>
          </div>
        );
      })()}

      {/* Stats row */}
      <div style={{display:"flex",gap:bp.isMobile?8:12,marginBottom:bp.isMobile?14:20,flexWrap:"wrap",alignItems:"stretch"}}>

        {/* Tables libres */}
        <div style={{flex:"0 0 auto",minWidth:110,background:C.greenP,
          border:`1.5px solid ${C.green}22`,borderRadius:14,padding:"13px 10px",
          textAlign:"center",boxShadow:`0 2px 8px ${C.green}12`}}>
          <div style={{fontSize:11,marginBottom:5}}>✅</div>
          <div style={{fontSize:22,fontWeight:700,color:C.green,fontFamily:F.title,lineHeight:1}}>{st.libre}</div>
          <div style={{fontSize:10,color:C.muted,marginTop:4,fontFamily:F.body}}>Tables libres</div>
        </div>

        {/* File d'attente */}
        <div style={{flex:"0 0 auto",minWidth:110,
          background:queue.length>3?C.redP:C.amberP,
          border:`1.5px solid ${queue.length>3?C.red:C.amber}22`,
          borderRadius:14,padding:"13px 10px",
          textAlign:"center",boxShadow:`0 2px 8px ${queue.length>3?C.red:C.amber}12`}}>
          <div style={{fontSize:11,marginBottom:5}}>🚶</div>
          <div style={{fontSize:22,fontWeight:700,color:queue.length>3?C.red:C.amber,fontFamily:F.title,lineHeight:1}}>{queue.length}</div>
          <div style={{fontSize:10,color:C.muted,marginTop:4,fontFamily:F.body}}>File d'attente</div>
        </div>

        {/* Nettoyage */}
        {(()=>{const n=tables.filter(t=>t.status==="nettoyage").length;
          return n>0?(
            <div style={{flex:"0 0 auto",minWidth:110,background:C.amberP,
              border:`1.5px solid ${C.amber}22`,borderRadius:14,padding:"13px 10px",
              textAlign:"center",boxShadow:`0 2px 8px ${C.amber}12`}}>
              <div style={{fontSize:11,marginBottom:5}}>🧹</div>
              <div style={{fontSize:22,fontWeight:700,color:C.amber,fontFamily:F.title,lineHeight:1}}>{n}</div>
              <div style={{fontSize:10,color:C.muted,marginTop:4,fontFamily:F.body}}>Nettoyage</div>
            </div>
          ):null;
        })()}

      </div>

      {/* ── File d'attente intelligente ── */}
      {(queue.length>0||waitlist.length>0)&&(
        <div style={{marginBottom:20}}>

          {/* Header file */}
          {queue.length>0&&(
            <div style={{background:C.navyP,border:`1.5px solid ${C.navy}22`,
              borderRadius:14,padding:16,marginBottom:waitlist.length>0?12:0}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
                <span>🚶‍♂️</span>
                <span style={{color:C.navy,fontWeight:700,fontSize:14,fontFamily:F.title}}>
                  {queue.length} groupe{queue.length>1?"s":""} en attente
                </span>
                {queue.length>=5&&(
                  <span style={{fontSize:10,background:C.redP,color:C.red,
                    border:`1px solid ${C.red}33`,borderRadius:20,padding:"2px 8px",
                    fontWeight:700,fontFamily:F.body,animation:"pulse 1.2s infinite"}}>
                    🚨 Salle saturée
                  </span>
                )}
                <span style={{marginLeft:"auto",fontSize:10,color:C.muted,fontFamily:F.body}}>
                  ↑↓ pour réordonner
                </span>
              </div>

              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {queue.map((g,idx)=>{
                  const remaining=Math.max(0,Math.ceil((g.expiresAt-now)/1000));
                  const pct=(remaining/g.patMax)*100;
                  const pc=pct>60?C.green:pct>30?C.terra:C.red;
                  const ft=freeTbl(g);
                  const waitSec=estimatedWait(idx);
                  return(
                    <div key={g.id} style={{
                      background:g.recalled?"#f0fff4":g.isVIP?"#fffbef":C.white,
                      border:`1.5px solid ${g.isVIP?"#d4af37":g.recalled?C.green+"55":pc+"33"}`,
                      borderRadius:12,padding:"10px 12px",
                      boxShadow:pct<25?`0 0 10px ${C.red}33`:g.isVIP?"0 0 14px #d4af3744":"none",
                      animation:pct<25?"breatheAmber 1.2s ease-in-out infinite":undefined,
                      display:"flex",alignItems:"center",gap:10}}>

                      {/* Boutons ↑↓ */}
                      <div style={{display:"flex",flexDirection:"column",gap:2,flexShrink:0}}>
                        <button onClick={()=>moveInQueue(idx,-1)} disabled={idx===0}
                          style={{width:22,height:22,borderRadius:5,border:`1px solid ${C.border}`,
                            background:idx===0?C.bg:C.navyP,color:idx===0?C.muted:C.navy,
                            cursor:idx===0?"not-allowed":"pointer",fontSize:11,fontWeight:700,
                            display:"flex",alignItems:"center",justifyContent:"center"}}>▲</button>
                        <button onClick={()=>moveInQueue(idx,+1)} disabled={idx===queue.length-1}
                          style={{width:22,height:22,borderRadius:5,border:`1px solid ${C.border}`,
                            background:idx===queue.length-1?C.bg:C.navyP,color:idx===queue.length-1?C.muted:C.navy,
                            cursor:idx===queue.length-1?"not-allowed":"pointer",fontSize:11,fontWeight:700,
                            display:"flex",alignItems:"center",justifyContent:"center"}}>▼</button>
                      </div>

                      {/* Position */}
                      <div style={{width:24,height:24,borderRadius:"50%",flexShrink:0,
                        background:idx===0?C.green:C.navy,
                        display:"flex",alignItems:"center",justifyContent:"center",
                        fontSize:11,fontWeight:800,color:"#fff"}}>
                        {idx+1}
                      </div>

                      {/* Infos groupe */}
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:2}}>
                          {g.isVIP&&<span style={{fontSize:13}}>🎩</span>}
                          {g.recalled&&<span style={{fontSize:11}}>📞</span>}
                          <span style={{fontSize:13,fontWeight:700,
                            color:g.isVIP?"#8a6a00":C.ink,fontFamily:F.body,
                            overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                            {g.name}
                          </span>
                          <span style={{fontSize:10,background:pct<25?C.redP:pct<60?C.amberP:C.greenP,
                            color:pct<25?C.red:pct<60?C.amber:C.green,
                            borderRadius:4,padding:"0px 5px",fontWeight:600,flexShrink:0}}>
                            {g.mood.e} {g.size}p
                          </span>
                        </div>
                        <div style={{display:"flex",gap:8,alignItems:"center"}}>
                          <div style={{flex:1,height:4,background:C.border,borderRadius:99,overflow:"hidden",minWidth:40}}>
                            <div style={{height:"100%",borderRadius:99,
                              background:`linear-gradient(90deg,${C.red},${pct>50?C.amber:C.red},${pct>70?C.green:C.red})`,
                              width:`${pct}%`,transition:"width 0.5s linear"}}/>
                          </div>
                          <span style={{fontSize:10,color:pc,fontWeight:700,fontFamily:F.body,flexShrink:0}}>
                            {remaining}s
                          </span>
                          {waitSec>0&&(
                            <span style={{fontSize:9,color:C.muted,fontFamily:F.body,flexShrink:0}}>
                              ⏳ ~{waitSec>=60?`${Math.floor(waitSec/60)}min`:waitSec+"s"} att.
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Bouton placer */}
                      <Btn sm v={ft.length>0?"primary":"ghost"}
                        disabled={ft.length===0}
                        onClick={()=>ft.length>0&&activeSrv.length>0?quickPlace(g):openAssign(g)}>
                        {ft.length>0
                          ?activeSrv.length>0?"▶ Placer":"Pas de serveur"
                          :"Complet"
                        }
                      </Btn>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Liste d'attente (groupes partis rappelables) */}
          {waitlist.length>0&&(
            <div style={{background:C.terraP,border:`1.5px solid ${C.terra}33`,
              borderRadius:14,padding:"12px 16px"}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                <span style={{fontSize:15}}>📞</span>
                <span style={{fontSize:13,fontWeight:700,color:C.terra,fontFamily:F.title}}>
                  {waitlist.length} groupe{waitlist.length>1?"s":""} — rappelable{waitlist.length>1?"s":""}
                </span>
                <span style={{fontSize:10,color:C.muted,fontFamily:F.body,marginLeft:"auto"}}>
                  Sous 2 minutes · humeur améliorée
                </span>
              </div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {waitlist.map(g=>{
                  const recallLeft=Math.max(0,Math.ceil((g.recallUntil-now)/1000));
                  const pct=(recallLeft/120)*100;
                  return(
                    <div key={g.id} style={{
                      background:C.surface,border:`1.5px solid ${C.terra}44`,
                      borderRadius:10,padding:"10px 12px",minWidth:160,flex:"0 0 auto"}}>
                      <div style={{display:"flex",justifyContent:"space-between",
                        alignItems:"center",marginBottom:6}}>
                        <div style={{fontSize:12,fontWeight:700,color:C.ink,fontFamily:F.body}}>
                          {g.mood.e} {g.name}
                        </div>
                        <span style={{fontSize:11,fontWeight:700,color:C.terra,fontFamily:F.title}}>
                          {recallLeft}s
                        </span>
                      </div>
                      <div style={{height:3,background:C.border,borderRadius:99,
                        overflow:"hidden",marginBottom:8}}>
                        <div style={{height:"100%",width:`${pct}%`,background:C.terra,
                          borderRadius:99,transition:"width 0.5s"}}/>
                      </div>
                      <div style={{fontSize:10,color:C.muted,fontFamily:F.body,marginBottom:8}}>
                        👥 {g.size}p · {g.mood.l}
                      </div>
                      <Btn sm full v="terra" onClick={()=>recallGroup(g)}>
                        📞 Rappeler
                      </Btn>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Bouton toggle vue ── */}
      <div style={{display:"flex",gap:8,marginBottom:14,alignItems:"center"}}>
        {[{k:"plan",icon:"🗺",label:"Plan de salle"},{k:"grid",icon:"⊞",label:"Grille"}].map(v=>(
          <button key={v.k} onClick={()=>setViewMode(v.k)} style={{
            padding:"6px 14px",borderRadius:8,fontSize:12,fontWeight:600,
            background:viewMode===v.k?C.navy:"transparent",
            color:viewMode===v.k?"#fff":C.muted,
            border:`1.5px solid ${viewMode===v.k?C.navy:C.border}`,
            cursor:"pointer",fontFamily:F.body,display:"flex",alignItems:"center",gap:5}}>
            <span>{v.icon}</span><span>{v.label}</span>
          </button>
        ))}
        {selectedTable&&viewMode==="plan"&&(
          <button onClick={()=>setSelectedTable(null)}
            style={{marginLeft:"auto",padding:"4px 10px",borderRadius:7,fontSize:11,
              background:C.redP,color:C.red,border:`1px solid ${C.red}33`,
              cursor:"pointer",fontFamily:F.body,fontWeight:600}}>
            ✕ Fermer
          </button>
        )}
      </div>

      {viewMode==="plan"?(
        /* ══════════════════════════════════════════════════
           PLAN DE SALLE SVG
        ══════════════════════════════════════════════════ */
        <div style={{display:"flex",gap:14,flexWrap:"wrap"}}>

          {/* SVG Floor plan */}
          <div style={{flex:"1 1 420px",background:"#faf7f0",
            border:`1.5px solid ${C.border}`,borderRadius:16,
            overflow:"hidden",position:"relative",minHeight:340}}>

            {/* Légende */}
            <div style={{position:"absolute",top:10,left:10,zIndex:5,
              display:"flex",gap:6,flexWrap:"wrap"}}>
              {[
                {c:C.green,   label:"Libre"},
                {c:C.terra,   label:"En cuisine"},
                {c:"#2a7a5c", label:"Repas"},
                {c:C.amber,   label:"Nettoyage"},
                {c:C.navy,    label:"Commande"},
              ].map(x=>(
                <div key={x.label} style={{display:"flex",alignItems:"center",gap:4,
                  background:"rgba(255,255,255,0.85)",borderRadius:5,padding:"2px 7px",
                  fontSize:9,fontFamily:F.body,fontWeight:600,color:x.c,
                  border:`1px solid ${x.c}33`}}>
                  <div style={{width:7,height:7,borderRadius:2,background:x.c}}/>
                  {x.label}
                </div>
              ))}
            </div>

            {/* SVG Floor plan — layout dynamique */}
            {(()=>{
              const n = tables.length;

              // ── 1. Grille dynamique ─────────────────────────
              // Colonnes : adapté au nombre de tables
              const cols = n<=2?n : n<=4?2 : n<=6?3 : n<=9?3 : 4;
              const rows = Math.ceil(n / cols);

              // ── 2. Taille de chaque cellule ─────────────────
              // La plus grande table (6p) : tw=64, th=46
              // Chaises : +14px gauche/droite, +14px haut/bas
              // Espacement entre tables : 20px
              const CELL_W = 110; // 64+14+14+18 de marge
              const CELL_H = 90;  // 46+14+14+16 de marge

              // ── 3. Marges du plan ───────────────────────────
              const ML = 30;   // gauche (couloir cuisine)
              const MT = 52;   // haut (déco + espace)
              const MR = 80;   // droite (bar)
              const MB = 36;   // bas (entrée)

              // ── 4. ViewBox calculée ──────────────────────────
              const VW = ML + cols * CELL_W + MR;
              const VH = MT + rows * CELL_H + MB;

              // ── 5. Position centre de chaque table ──────────
              const getPos = (i) => ({
                cx: ML + (i % cols) * CELL_W + CELL_W / 2,
                cy: MT + Math.floor(i / cols) * CELL_H + CELL_H / 2,
              });

              return(
                <svg viewBox={`0 0 ${VW} ${VH}`} width="100%" style={{display:"block"}}>
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
              );
            })()}
          </div>

          {/* Panneau de détail latéral */}
          <div style={{width:260,flexShrink:0,minWidth:220}}>
            {selectedTable?(()=>{
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
            })():(
              <div style={{background:C.bg,border:`1.5px dashed ${C.border}`,
                borderRadius:16,padding:24,textAlign:"center",
                display:"flex",flexDirection:"column",alignItems:"center",
                justifyContent:"center",gap:10,minHeight:200}}>
                <span style={{fontSize:32,opacity:0.4}}>🍽</span>
                <div style={{fontSize:13,color:C.muted,fontFamily:F.body}}>
                  Cliquez sur une table pour voir ses détails
                </div>
              </div>
            )}
          </div>
        </div>
      ):(
        /* ══════════════════════════════════════════════════
           VUE GRILLE (ancienne vue conservée)
        ══════════════════════════════════════════════════ */
        <div style={{display:"grid",gridTemplateColumns:bp.isMobile?"1fr 1fr":bp.isTablet?"repeat(auto-fill,minmax(200px,1fr))":"repeat(auto-fill,minmax(220px,1fr))",gap:bp.isMobile?8:12}}>
          {tables.map(t=>{

            const isMange=t.status==="mange";
            const isNettoyage=t.status==="nettoyage";
            const bill=isMange?t.order.reduce((s,o)=>s+o.price*o.qty,0):0;
            const themedBill=+(bill*menuTheme.priceMult).toFixed(2);
            const isEating=isMange&&t.eatUntil&&now<t.eatUntil;
            const eatPct=isEating?Math.min(100,Math.round(((t.eatDur*1000-(t.eatUntil-now))/(t.eatDur*1000))*100)):100;
            const eatSecsLeft=isEating?Math.ceil((t.eatUntil-now)/1000):0;
            const cleanPct=isNettoyage&&t.cleanUntil?Math.min(100,Math.round(((t.cleanDur*1000-(t.cleanUntil-now))/(t.cleanDur*1000))*100)):0;
            const cleanSecsLeft=isNettoyage&&t.cleanUntil?Math.max(0,Math.ceil((t.cleanUntil-now)/1000)):0;
            const myQ=queue.filter(g=>g.size<=t.capacity&&t.status==="libre");
            const srvObj=servers.find(s=>s.name===t.server);
            const isOrdering=t.status==="occupée"&&t.svcUntil&&now<t.svcUntil;
            const secsLeft=isOrdering?Math.max(0,Math.ceil((t.svcUntil-now)/1000)):0;
            const accentColor=isNettoyage?C.amber:isMange?C.green:isOrdering?C.navy:t.status==="occupée"?C.terra:C.muted;

            return(
              <div key={t.id} style={{
                background:isNettoyage?C.amberP:isMange?C.greenP:isOrdering?C.navyP:t.status==="occupée"?C.terraP:C.card,
                border:`1.5px solid ${t.group?.isVIP?"#d4af37":accentColor+"44"}`,
                borderRadius:14,padding:16,paddingLeft:22,position:"relative",
                boxShadow:t.group?.isVIP?"0 0 20px #d4af3755":isMange?`0 0 16px ${C.green}33`:isNettoyage?`0 0 14px ${C.amber}33`:`0 1px 5px rgba(0,0,0,0.07)`,
                transition:"all 0.3s ease",
                animation:t.status==="libre"&&myQ.length>0?"breathe 2.4s ease-in-out infinite":undefined,
              }}>
                <div style={{position:"absolute",left:0,top:0,bottom:0,width:5,
                  borderRadius:"14px 0 0 14px",
                  background:t.group?.isVIP?"linear-gradient(180deg,#d4af37,#f5d878,#d4af37)":
                    isNettoyage?C.amber:isMange?C.green:isOrdering?C.navy:
                    t.status==="occupée"?C.terra:myQ.length>0?C.green:C.muted+"44",
                  animation:isOrdering?"ledPulse 1.2s ease-in-out infinite":
                    isMange&&isEating?"ledPulse 2s ease-in-out infinite":undefined,
                }}/>
                {t.group?.isVIP&&(
                  <div style={{position:"absolute",top:8,right:8,fontSize:18}}>🎩</div>
                )}
                {t.status==="libre"&&t.capLv<2&&(()=>{
                  const up=CAP_UPGRADES[t.capLv];
                  const canAfford=cash>=up.cost;
                  return(
                    <button onClick={(e)=>{
                      e.stopPropagation();
                      if(!canAfford)return;
                      setTables(p=>p.map(x=>x.id!==t.id?x:{...x,capacity:up.newCap,capLv:t.capLv+1}));
                      setCash(c=>+(c-up.cost).toFixed(2));
                      addTx("achat",`Agrandissement ${t.name} → ${up.newCap} couverts`,up.cost);
                      addToast({icon:"🪑",title:"Table agrandie !",msg:`${t.name} passe à ${up.newCap} couverts`,color:C.navy,tab:"tables"});
                      if(onTableUpgrade)onTableUpgrade();
                    }} title={`${up.label} — ${up.cost}€`} style={{
                      position:"absolute",top:10,right:10,
                      background:canAfford?C.navyP:"transparent",
                      border:`1.5px solid ${canAfford?C.navy:C.border}`,
                      borderRadius:7,padding:"3px 8px",cursor:canAfford?"pointer":"not-allowed",
                      opacity:canAfford?1:0.45,fontFamily:F.body,
                      display:"flex",alignItems:"center",gap:4}}>
                      <span style={{fontSize:10}}>🪑</span>
                      <span style={{fontSize:10,color:canAfford?C.navy:C.muted,fontWeight:600}}>Amélioration · {up.cost}€</span>
                    </button>
                  );
                })()}
                <div>
                  <div style={{fontSize:15,fontWeight:600,color:C.ink,fontFamily:F.title,marginBottom:5}}>
                    {t.name}
                  </div>

                  <div style={{fontSize:11,color:C.muted,fontFamily:F.body}}>👥 {t.capacity} couverts</div>
                  {t.status==="libre"&&t.freedAt&&(
                    <div style={{fontSize:10,color:C.green,fontWeight:600,fontFamily:F.body,marginTop:3}}>
                      ✓ Libre depuis {new Date(t.freedAt).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}
                    </div>
                  )}
                </div>
                {/* ── Phase timeline — toutes phases d'une table occupée ── */}
                {(t.status==="occupée"||isMange||isNettoyage)&&(()=>{
                  // Phases : commande → cuisine → repas → nettoyage
                  const orderPct=isOrdering?Math.min(100,Math.round(((t.svcUntil-(now))/(t.svcUntil-t.placedAt||1))*100*-1+100)):100;
                  const orderDoneTime=t.svcUntil&&!isOrdering?t.svcUntil:null;
                  const isCooking=t.status==="occupée"&&!isOrdering;
                  // Cuisine : plat le plus long encore en cuisson pour cette table
                  const cookingForTable=kitchen.cooking.filter(d=>d.tableId===t.id);
                  const slowestDish=cookingForTable.length>0
                    ?cookingForTable.reduce((a,b)=>(b.startedAt+b.timerMax*1000)>(a.startedAt+a.timerMax*1000)?b:a)
                    :null;
                  const cookPct=slowestDish
                    ?Math.min(100,Math.round(((now-slowestDish.startedAt)/(slowestDish.timerMax*1000))*100))
                    :isCooking?null:isMange||isNettoyage?100:0;
                  const cookRemaining=slowestDish
                    ?Math.max(0,Math.ceil((slowestDish.startedAt+slowestDish.timerMax*1000-now)/1000))
                    :null;
                  const phases=[
                    {
                      id:"commande",icon:"🛎",label:"Commande",
                      color:C.navy,
                      done:!isOrdering&&(isCooking||isMange||isNettoyage),
                      active:isOrdering,
                      pct:isOrdering?Math.min(100,Math.round((1-(secsLeft/((t.svcUntil-t.placedAt)/1000||1)))*100)):100,
                      timer:isOrdering?secsLeft:null,
                    },
                    {
                      id:"cuisine",icon:"🔥",label:"Cuisine",
                      color:C.terra,
                      done:isMange||isNettoyage,
                      active:isCooking,
                      pct:cookPct,
                      timer:cookRemaining,
                    },
                    {
                      id:"repas",icon:"🍴",label:"Repas",
                      color:C.green,
                      done:isNettoyage,
                      active:isMange,
                      pct:isMange?(isEating?eatPct:100):isNettoyage?100:0,
                      timer:isEating?eatSecsLeft:null,
                    },
                    {
                      id:"nettoyage",icon:"🧹",label:"Nettoyage",
                      color:C.amber,
                      done:false,
                      active:isNettoyage,
                      pct:isNettoyage?cleanPct:0,
                      timer:isNettoyage?cleanSecsLeft:null,
                    },
                  ];
                  const activePhase=phases.find(p=>p.active);

                  return(
                    <div style={{borderTop:`1px solid ${accentColor}22`,paddingTop:10,marginTop:8}}>

                      {/* Groupe info */}
                      {t.group&&(
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
                          marginBottom:8,fontSize:10,fontFamily:F.body,color:C.muted}}>
                          <span>{t.group.mood.e} <strong style={{color:C.ink}}>{t.group.name}</strong> · {t.group.size}p</span>
                          {t.server&&<span>👔 {t.server}</span>}
                        </div>
                      )}

                      {/* ── Phase timeline ── */}
                      <div style={{marginBottom:10}}>
                        {/* Steps row */}
                        <div style={{display:"flex",alignItems:"center",gap:0,marginBottom:6}}>
                          {phases.map((ph,pi)=>(
                            <div key={ph.id} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",position:"relative"}}>
                              {/* Connector line before */}
                              {pi>0&&(
                                <div style={{position:"absolute",left:0,top:"50%",transform:"translateY(-8px)",
                                  width:"50%",height:2,
                                  background:phases[pi-1].done||phases[pi-1].active?accentColor+"66":C.border}}/>
                              )}
                              {/* Connector line after */}
                              {pi<phases.length-1&&(
                                <div style={{position:"absolute",right:0,top:"50%",transform:"translateY(-8px)",
                                  width:"50%",height:2,
                                  background:ph.done?ph.color+"66":C.border}}/>
                              )}
                              {/* Step circle */}
                              <div style={{
                                width:22,height:22,borderRadius:"50%",
                                background:ph.done?"#fff":ph.active?ph.color:C.bg,
                                border:`2px solid ${ph.done?ph.color:ph.active?ph.color:C.border}`,
                                display:"flex",alignItems:"center",justifyContent:"center",
                                fontSize:ph.active?11:10,
                                zIndex:1,position:"relative",
                                boxShadow:ph.active?`0 0 0 3px ${ph.color}22`:"none",
                                transition:"all 0.3s",
                              }}>
                                {ph.done
                                  ?<span style={{color:ph.color,fontWeight:800,fontSize:10}}>✓</span>
                                  :ph.active
                                    ?<span style={{animation:ph.pct===null?"pulse 1s infinite":undefined}}>{ph.icon}</span>
                                    :<span style={{fontSize:8,color:C.muted,fontWeight:600}}>{pi+1}</span>
                                }
                              </div>
                              {/* Label */}
                              <div style={{
                                fontSize:8,fontFamily:F.body,marginTop:3,
                                color:ph.active?ph.color:ph.done?ph.color+"99":C.muted,
                                fontWeight:ph.active?700:400,
                                whiteSpace:"nowrap",textAlign:"center",
                              }}>{ph.label}</div>
                            </div>
                          ))}
                        </div>

                        {/* Active phase progress bar */}
                        {activePhase&&(
                          <div>
                            <div style={{display:"flex",justifyContent:"space-between",
                              alignItems:"center",marginBottom:4}}>
                              <span style={{fontSize:10,color:activePhase.color,fontWeight:700,fontFamily:F.body}}>
                                {activePhase.icon} {activePhase.label} en cours
                              </span>
                              {activePhase.timer!==null&&(
                                <span style={{fontSize:10,color:C.muted,fontFamily:F.body,fontWeight:600}}>
                                  {Math.floor(activePhase.timer/60)}:{String(activePhase.timer%60).padStart(2,"0")}
                                </span>
                              )}
                            </div>
                            <div style={{background:C.border,borderRadius:99,height:7,overflow:"hidden",position:"relative"}}>
                              {activePhase.pct===null?(
                                /* Indeterminate shimmer bar for "en cuisine" */
                                <div style={{
                                  position:"absolute",inset:0,
                                  background:`linear-gradient(90deg,transparent,${activePhase.color}88,transparent)`,
                                  backgroundSize:"200% 100%",
                                  animation:"shimmerBar 1.6s ease-in-out infinite",
                                }}/>
                              ):(
                                <div style={{
                                  width:`${activePhase.pct}%`,height:"100%",
                                  background:`linear-gradient(90deg,${activePhase.color}cc,${activePhase.color})`,
                                  borderRadius:99,transition:"width 0.5s linear",
                                  position:"relative",overflow:"hidden",
                                }}>
                                  <div style={{
                                    position:"absolute",inset:0,
                                    background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.25),transparent)",
                                    backgroundSize:"200% 100%",
                                    animation:"shimmerBar 2s ease-in-out infinite",
                                  }}/>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>



                      {/* Encaisser section (phase repas terminé) */}
                      {isMange&&!isEating&&(()=>{
                        const r=calcRating(t.patienceLeftRatio??0.5,t.group.mood.b);
                        const tip=+(themedBill*(r-1)*0.04).toFixed(2);
                        const rc=ratingColor(r);
                        return(
                          <>
                            <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:10}}>
                              <span style={{fontSize:14,color:rc,letterSpacing:"1px"}}>{ratingStars(r)}</span>
                              {tip>0&&<span style={{fontSize:10,color:rc,fontWeight:700,fontFamily:F.body}}>+{tip.toFixed(2)}€</span>}
                              <span style={{marginLeft:"auto",fontSize:18,fontWeight:800,color:C.terra,fontFamily:F.title}}>{themedBill.toFixed(2)}€</span>
                            </div>
                            <Btn full v="primary" onClick={()=>checkout(t.id)} icon="💰">Encaisser</Btn>
                          </>
                        );
                      })()}
                    </div>
                  );
                })()}
                {t.status==="libre"&&myQ.length>0&&(
                  <div style={{marginTop:10}}>
                    <Sel value="" style={{fontSize:11,padding:"6px 10px"}}
                      onChange={e=>{
                        const id=parseFloat(e.target.value);
                        const g=queue.find(x=>x.id===id);
                        if(g)openAssign(g);
                      }}>
                      <option value="">↳ Assigner un groupe…</option>
                      {myQ.map(g=>(
                        <option key={g.id} value={g.id}>
                          {g.mood.e} {g.name} ({g.size}p)
                        </option>
                      ))}
                    </Sel>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
           VUE COMPACTE MOBILE — remplace le plan SVG
      ═══════════════════════════════════════════════════ */}
      {bp.isMobile&&(
        <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:80}}>
          {tables.map(t=>{
            const isMange2      = t.status==="mange";
            const isNettoyage2  = t.status==="nettoyage";
            const isOrdering2   = t.status==="occupée"&&t.svcUntil&&now<t.svcUntil;
            const isLibre2      = t.status==="libre";
            const isCooking2    = t.status==="occupée"&&!isOrdering2;
            const isEating2     = isMange2&&t.eatUntil&&now<t.eatUntil;
            const myQ2          = queue.filter(g=>g.size<=t.capacity&&isLibre2);
            const activeSrv2    = servers.filter(s=>s.status==="actif"&&(s.moral??100)>10);

            // Phase & couleur
            const phase2 = isOrdering2?0:isCooking2?1:isMange2?2:isNettoyage2?3:-1;
            const phaseColors2 = ["#3a5f8a","#e07a45","#4a9e78","#f5a623"];
            const phaseIcons2  = ["🛎","🔥","🍴","🧹"];
            const phaseLabels2 = ["Commande","Cuisine","Repas","Nettoyage"];
            const pColor2 = phase2>=0?phaseColors2[phase2]:C.green;

            // Pct phase
            const cookingT2 = kitchen.cooking.filter(d=>d.tableId===t.id);
            const slowest2  = cookingT2.length>0
              ?cookingT2.reduce((a,b)=>(b.startedAt+b.timerMax*1000)>(a.startedAt+a.timerMax*1000)?b:a)
              :null;
            const pct2 =
              phase2===0?Math.min(100,Math.round((1-(Math.max(0,(t.svcUntil-now))/((t.svcUntil-t.placedAt)||1)))*100)):
              phase2===1?( slowest2?Math.min(100,Math.round(((now-slowest2.startedAt)/(slowest2.timerMax*1000))*100)):0 ):
              phase2===2?( isEating2?Math.min(100,Math.round(((t.eatDur*1000-(t.eatUntil-now))/(t.eatDur*1000))*100)):100 ):
              phase2===3?( t.cleanUntil?Math.min(100,Math.round(((t.cleanDur*1000-(t.cleanUntil-now))/(t.cleanDur*1000))*100)):0 ):
              0;

            // Timer
            const timer2 =
              phase2===0&&t.svcUntil?Math.max(0,Math.ceil((t.svcUntil-now)/1000)):
              phase2===1&&slowest2?Math.max(0,Math.ceil((slowest2.startedAt+slowest2.timerMax*1000-now)/1000)):
              phase2===2&&t.eatUntil?Math.max(0,Math.ceil((t.eatUntil-now)/1000)):
              phase2===3&&t.cleanUntil?Math.max(0,Math.ceil((t.cleanUntil-now)/1000)):
              null;
            const timerFmt2 = timer2!==null?(timer2>=60?Math.floor(timer2/60)+"m"+String(timer2%60).padStart(2,"0")+"s":timer2+"s"):null;

            const bill2 = isMange2?+(t.order.reduce((s,o)=>s+o.price*o.qty,0)*menuTheme.priceMult).toFixed(2):0;

            return(
              <div key={t.id} style={{
                background:C.surface,
                border:`1.5px solid ${phase2>=0?pColor2+"55":C.border}`,
                borderLeft:`4px solid ${phase2>=0?pColor2:C.green}`,
                borderRadius:12,padding:"12px 14px",
                boxShadow:`0 2px 8px ${phase2>=0?pColor2+"18":"rgba(0,0,0,0.05)"}`,
                minHeight:80,
              }}>
                {/* Ligne 1 : nom + statut + timer */}
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:16,fontWeight:800,color:C.ink,fontFamily:F.title}}>
                      {t.name}
                    </span>
                    <span style={{fontSize:10,color:C.muted,fontFamily:F.body}}>
                      {t.capacity}p
                    </span>
                    {t.group?.isVIP&&<span style={{fontSize:12}}>🎩</span>}
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    {timerFmt2&&(
                      <span style={{fontSize:11,fontWeight:700,color:pColor2,fontFamily:F.body}}>
                        {timerFmt2}
                      </span>
                    )}
                    <span style={{
                      fontSize:10,background:phase2>=0?pColor2+"18":C.greenP,
                      color:phase2>=0?pColor2:C.green,
                      border:`1px solid ${phase2>=0?pColor2+"33":C.green+"33"}`,
                      borderRadius:20,padding:"2px 8px",fontFamily:F.body,fontWeight:600
                    }}>
                      {phase2>=0?phaseIcons2[phase2]+" "+phaseLabels2[phase2]:"✅ Libre"}
                    </span>
                  </div>
                </div>

                {/* Barre de progression */}
                {phase2>=0&&(
                  <div style={{height:5,background:pColor2+"22",borderRadius:99,overflow:"hidden",marginBottom:8}}>
                    <div style={{
                      height:"100%",width:`${pct2}%`,
                      background:pColor2,borderRadius:99,
                      transition:"width 0.5s linear"
                    }}/>
                  </div>
                )}

                {/* Groupe + serveur */}
                {t.group&&(
                  <div style={{fontSize:10,color:C.muted,fontFamily:F.body,marginBottom:6}}>
                    {t.group.mood.e} {t.group.name} · {t.group.size}p
                    {t.server&&<span> · 👔 {t.server}</span>}
                  </div>
                )}

                {/* Bouton action */}
                <div style={{marginTop:4}}>
                  {isMange2&&!isEating2&&(
                    <Btn full v="primary" sm onClick={()=>checkout(t.id)} icon="💰">
                      Encaisser {bill2}€
                    </Btn>
                  )}
                  {isLibre2&&myQ2.length>0&&activeSrv2.length>0&&(
                    <Btn full v="terra" sm onClick={()=>quickPlace(myQ2[0])} icon="👥">
                      Placer {myQ2[0].mood.e} {myQ2[0].name}
                    </Btn>
                  )}
                  {isLibre2&&myQ2.length>0&&activeSrv2.length===0&&(
                    <Btn full v="secondary" sm onClick={()=>openAssign(myQ2[0])} icon="👥">
                      Placer (choisir serveur)
                    </Btn>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
           FAB — Bouton d'action flottant (tous écrans)
      ═══════════════════════════════════════════════════ */}
      {(()=>{
        const fabQueue = queue.filter(g=>tables.some(t=>t.status==="libre"&&t.capacity>=g.size));
        const fabActiveSrv = servers.filter(s=>s.status==="actif"&&(s.moral??100)>10);
        if(fabQueue.length===0||fabActiveSrv.length===0) return null;
        const urgentCount = fabQueue.filter(g=>g.expiresAt-now<g.patMax*1000*0.3).length;
        const fabColor = urgentCount>0?C.red:fabQueue.length>=3?C.amber:C.green;
        return(
          <div style={{
            position:"fixed",bottom:bp.isMobile?90:24,right:20,
            zIndex:900,
            display:"flex",flexDirection:"column",alignItems:"flex-end",gap:8,
          }}>
            {/* Mini-liste groupes urgents (si ouverte) */}
            <div id="fab-list" style={{display:"none"}}>
              {fabQueue.slice(0,4).map(g=>{
                const pct3 = Math.max(0,(g.expiresAt-now)/(g.patMax*1000));
                const pc3  = pct3>0.5?C.green:pct3>0.25?C.amber:C.red;
                const ft3  = tables.find(t=>t.status==="libre"&&t.capacity>=g.size);
                return(
                  <div key={g.id}
                    onClick={()=>{ft3&&(fabActiveSrv.length>0?quickPlace(g):openAssign(g));}}
                    style={{
                      background:C.surface,border:`1.5px solid ${pc3}44`,
                      borderLeft:`3px solid ${pc3}`,borderRadius:10,
                      padding:"8px 12px",marginBottom:6,cursor:"pointer",
                      minWidth:180,boxShadow:"0 4px 16px rgba(0,0,0,0.12)",
                      display:"flex",alignItems:"center",gap:10,
                    }}>
                    <span style={{fontSize:18}}>{g.mood.e}</span>
                    <div style={{flex:1}}>
                      <div style={{fontSize:11,fontWeight:700,color:C.ink,fontFamily:F.body}}>
                        {g.name} · {g.size}p
                      </div>
                      <div style={{height:3,background:pc3+"22",borderRadius:99,marginTop:4}}>
                        <div style={{height:"100%",width:`${pct3*100}%`,
                          background:pc3,borderRadius:99,transition:"width 0.5s"}}/>
                      </div>
                    </div>
                    <span style={{fontSize:10,color:C.muted,fontFamily:F.body}}>
                      {ft3?ft3.name:"—"}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Bouton FAB principal */}
            <button
              onClick={()=>{
                const list = document.getElementById("fab-list");
                if(list) list.style.display = list.style.display==="none"?"flex":"none";
                list.style.flexDirection="column";
              }}
              style={{
                width:56,height:56,borderRadius:"50%",
                background:fabColor,border:"none",cursor:"pointer",
                boxShadow:`0 6px 20px ${fabColor}66`,
                display:"flex",flexDirection:"column",
                alignItems:"center",justifyContent:"center",
                position:"relative",
                transition:"transform 0.15s, box-shadow 0.15s",
              }}>
              <span style={{fontSize:20}}>👥</span>
              {/* Badge compte */}
              <div style={{
                position:"absolute",top:-4,right:-4,
                width:20,height:20,borderRadius:"50%",
                background:urgentCount>0?"#c0392b":C.navy,
                border:"2px solid white",
                display:"flex",alignItems:"center",justifyContent:"center",
              }}>
                <span style={{fontSize:10,fontWeight:800,color:"white",fontFamily:F.body}}>
                  {fabQueue.length}
                </span>
              </div>
            </button>
          </div>
        );
      })()}

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


/* ═══════════════════════════════════════════════════════
   SERVERS VIEW
═══════════════════════════════════════════════════════ */