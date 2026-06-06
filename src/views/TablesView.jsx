/* ═══════════════════════════════════════════════════════
   src/views/TablesView.jsx
   Extrait du monolithe restaurant-manager.jsx
   Dépendances déclarées dans les imports ci-dessous.
═══════════════════════════════════════════════════════ */
import { useState, useEffect } from "react";
import { C, F, CAP_UPGRADES, SRV_LVL, GAME_EVENTS, RESTO_LVL } from "../constants/gameData.js";
import { getRepTier } from "../constants/gameConstants.js";
import { REP_DELTA } from "../constants/gameConstants.js";
import { isOnShift } from "../hooks/useGameClock.js";
import { Badge, Btn, Sel, Modal, XpBar, Lbl, Inp } from "../components/ui/index.js";
import { useLang } from "../i18n/index.jsx";
import { useClockNow } from "../contexts/ClockContext.jsx";
import { srvLv, calcRating, ratingColor, ratingStars, calcTip, restoXpFromCheckout, srvXpFromCheckout, SRV_MAX_XP } from "../utils/levelUtils.js";
import { generateOrderWithFormulas } from "../utils/randomUtils.js";
import { buildKitchenTickets, svcDuration, eatDuration, calcBill } from "../utils/orderUtils.js";
import { DetailPanel } from "./tables/DetailPanel.jsx";
import { SvgFloorPlan } from "./tables/SvgFloorPlan.jsx";


export function TablesView({tables,setTables,servers,setServers,menu,setMenu,setKitchen,kitchen,addToast,addRestoXp,cash,setCash,addTx,queue,setQueue,waitlist,setWaitlist,addDayStat,gameTime,onTableUpgrade,setComplaints,dailySpecials,activeEvent,setChallengeProgress,reputation,updateReputation,restoLvN=0,formulas=[],stock=[],bp={}}) {

  const { t: tr } = useLang();
  const now = useClockNow();

  const [selectedTable, setSelectedTable] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [modal, setModal] = useState(null);
  const [tgtT, setTgtT] = useState(null);
  const [tgtS, setTgtS] = useState(null);
  const [preview, setPreview] = useState([]);

  const freeTbl = (g) => tables.filter(t => t.status==="libre" && t.capacity>=g.size);
  const absMin = gameTime?.absMin ?? 0;
  const activeSrv = servers.filter(s => s.status==="actif" && (s.moral??100)>10 && (!s.shift || isOnShift(s.shift, absMin)));

  const quickPlace = (g) => {
    const ft = freeTbl(g)[0];
    const sv = activeSrv[0];
    if (!ft || !sv) return;
    openKitchen(g, ft, sv);
  };

  const openAssign = (g) => setModal(g);

  const toggleSelectClient = (g) => {
    setSelectedClient(prev => prev?.id === g.id ? null : g);
    setSelectedTable(null);
  };

  useEffect(() => {
    if (!selectedClient) return;
    const onKey = (e) => { if (e.key === "Escape") setSelectedClient(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedClient]);

  const placeClientAtTable = (g, table) => {
    const sv = activeSrv[0];
    if (!sv) {
      addToast({icon:"⚠️",title:tr("tables.noServerAvailable"),msg:tr("tables.allBusy"),color:C.red,tab:"tables",silent:true});
      setSelectedClient(null);
      return;
    }
    openKitchen(g, table, sv);
    setSelectedClient(null);
  };

  const recallGroup = (g) => {
    const newGroup = {
      ...g,
      expiresAt: Date.now() + g.patMax*1000,
      mood: {...g.mood, b: Math.min(g.mood.b+0.3, 2)},
      recalled: true,
    };
    setQueue(q=>[newGroup,...q]);
    setWaitlist(w=>w.filter(x=>x.id!==g.id));
  };

  const checkout = (tid) => {
    const t = tables.find(x=>x.id===tid);
    if (!t?.group) return;
    const bill = t.order.reduce((s,o)=>s+o.price*o.qty,0);
    const themedBill = +bill.toFixed(2);
    const hasStaleIngredient = t.order.some(o=>{
      const mi=menu.find(m=>m.id===o.id);
      if(!mi)return false;
      return (mi.ingredients||[]).some(ing=>{
        const si=stock.find(s=>s.id===ing.stockId);
        return si&&(si.freshness??100)<20;
      });
    });
    const r = Math.max(1, calcRating(t.patienceLeftRatio??0.5, t.group.mood.b) - (hasStaleIngredient?0.5:0));
    const tip = +(themedBill*(r-1)*0.04).toFixed(2);
    const total = +(themedBill+tip).toFixed(2);
    const srvObj = servers.find(s=>s.name===t.server);
    setCash(c=>+(c+total).toFixed(2));
    addTx("revenu",`Encaissement ${t.name} — ${t.group.size}cov`,total);
    addDayStat("revenue", total);
    addDayStat("served", t.group.size ?? 1);
    addDayStat("rating", r);
    if (srvObj) {
      const xp = srvXpFromCheckout(r, t.group.size);
      setServers(p=>p.map(s=>s.id===srvObj.id?{
        ...s,
        totalXp:Math.min(SRV_MAX_XP,s.totalXp+xp),
        rating:+(s.rating*0.9+r*0.1).toFixed(1),
        dayCheckouts:(s.dayCheckouts||0)+1,
        dayCovers:(s.dayCovers||0)+(t.group.size??1),
        dayRevenue:+((s.dayRevenue||0)+total).toFixed(2),
      }:s));
    }
    addRestoXp(restoXpFromCheckout(t.group.size, t.group.mood.b, t.group.isVIP||false));
    if (updateReputation) {
      const repKey = r>=4.5?"rating5":r>=3.5?"rating4":r>=2.5?"rating3":r>=1.5?"rating2":"rating1";
      updateReputation(REP_DELTA[repKey], `note ${r.toFixed(1)}/5`);
    }
    setTables(p=>p.map(x=>x.id!==tid?x:{...x,
      status:"nettoyage",group:null,order:[],server:null,
      patienceLeftRatio:null,svcUntil:null,placedAt:null,
      cleanUntil:null,cleanDur:30,cleanServer:null,freedAt:null
    }));
    setChallengeProgress&&setChallengeProgress(p=>({
      ...p,
      served: (p.served||0)+1,
      revenue: p.revenue+total,
      tips: +((p.tips||0)+tip).toFixed(2),
      highRating: r>=4?(p.highRating||0)+1:(p.highRating||0),
      vip: t.group?.isVIP?Math.max(p.vip||0,1):p.vip||0,
    }));
    if (selectedTable?.id===tid) setSelectedTable(null);
  };

  const openKitchen = (g, table, srv) => {
    const speedMult = srv.specialty?.id==="speed"?(srv.specialty.speedMult||1.0):1.0;
    const svcDur = Math.round(svcDuration(g.size).ms * speedMult);
    const svcUntil = Date.now()+svcDur;
    const orderLines = generateOrderWithFormulas(g, menu, formulas, restoLvN);
    const kitchenTickets = buildKitchenTickets(orderLines, table);
    const drinkTickets = kitchenTickets.filter(d=>d.cat==="Boissons");
    const foodTickets  = kitchenTickets.filter(d=>d.cat!=="Boissons");
    setMenu(p=>p.map(m=>{const l=orderLines.find(o=>o.menuId===m.id);if(!l)return m;return{...m,orderCount:(m.orderCount||0)+l.qty,formulaRevenue:l.isFormula?(m.formulaRevenue||0)+l.price*l.qty:(m.formulaRevenue||0),dayOrderCount:(m.dayOrderCount||0)+l.qty,dayFormulaRevenue:l.isFormula?(m.dayFormulaRevenue||0)+l.price*l.qty:(m.dayFormulaRevenue||0)};}));
    setServers(p=>p.map(s=>s.id!==srv.id?s:{...s,status:"service",serviceUntil:svcUntil}));
    setTables(p=>p.map(t=>t.id!==table.id?t:
      {...t,status:"occupée",server:srv.name,group:g,order:orderLines,svcTimer:0,svcMax:0,svcUntil,
        placedAt:Date.now(),patienceLeftRatio:Math.max(0,(g.expiresAt-Date.now())/(g.patMax*1000))}));
    setQueue(q=>q.filter(c=>c.id!==g.id));
    setChallengeProgress&&setChallengeProgress(p=>({...p,fastPlace:p.fastPlace+1}));
    const formulaUsed = orderLines.find(o => o.isFormula);
    addToast({icon: formulaUsed?"🍽️":"🛎️",
      title: formulaUsed?tr("toast.formulaOrdered",{formula:formulaUsed.formulaName}):tr("toast.orderTaken"),
      msg:tr("toast.orderTakenMsg",{server:srv.name,table:table.name}),color:C.navy,tab:"tables",silent:true});
    setTimeout(()=>{
      setKitchen(k=>({...k,
        queue:[...k.queue,...foodTickets],
        done:[...k.done,...drinkTickets],
      }));
      setServers(p=>p.map(s=>s.id!==srv.id?s:{...s,status:"actif",serviceUntil:null}));
      setTables(p=>p.map(t=>t.id!==table.id?t:{...t,svcUntil:null,server:null}));
    }, svcDur);
    setModal(null);
  };

  const confirm = () => {
    if (!tgtT || !tgtS || preview.length===0) return;
    const table = tables.find(t=>String(t.id)===tgtT);
    const srv   = servers.find(s=>s.name===tgtS);
    if (!table || !srv) return;
    openKitchen(modal, table, srv);
    setTgtT(null); setTgtS(null); setPreview([]);
  };

  const activeTables = tables;

  // Seul le prochain slot verrouillé est affiché (SVG + liste)
  const lockedSlots = (() => {
    let prev = tables.length;
    for (const lv of RESTO_LVL.filter(l => l.l > restoLvN)) {
      if (prev < lv.tables) return [{ num: prev + 1, unlocksAt: lv }];
      prev = lv.tables;
    }
    return [];
  })();

  return(
    <div style={{
      display:"flex",flexDirection:"column",
      height:"100vh",overflow:"hidden",
      background:C.bg,
    }}>

      {/* ══ 1. BARRE STATUT — haut 42px ══════════════════════ */}
      <div style={{height:42,flexShrink:0,background:C.surface,
        borderBottom:`1px solid ${C.border}`,
        display:"flex",alignItems:"center",
        paddingLeft:14,paddingRight:14,gap:14,zIndex:10}}>
        <span style={{fontSize:11,color:C.muted,fontFamily:F.body}}>
          {tr("tables.freeStatus",{current:tables.filter(t=>t.status==="libre").length,total:tables.length})}
        </span>
        {queue.length>0&&(
          <span style={{fontSize:11,fontWeight:700,
            color:queue.length>=3?C.red:C.amber,fontFamily:F.body}}>
            {tr("tables.waiting",{count:queue.length})}
          </span>
        )}
        {reputation!==undefined&&(
          <div style={{display:"flex",alignItems:"center",gap:5,marginLeft:"auto"}}>
            <span style={{fontSize:10,color:C.muted,fontFamily:F.body}}>{tr("tables.repLabel")}</span>
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

      {/* ══ 2. ZONE CENTRALE — layout flexbox ════════════════ */}
      {!bp.isMobile&&(
        <div style={{flex:1,display:"flex",flexDirection:"row",minHeight:0,overflow:"hidden"}}>

          {/* ── Panneau gauche — File d'attente + Détail table ── */}
          {(true)&&(
            <div style={{
              width:bp.isTablet?210:240,flexShrink:0,
              borderRight:`1px solid ${C.border}`,
              background:C.surface,
              display:"flex",flexDirection:"column",
              overflowY:"hidden",
            }}>

              {/* File d'attente */}
              {(true)&&(
                <>
                  <div style={{padding:"8px 12px",borderBottom:`1px solid ${C.border}`,
                    fontWeight:700,fontSize:12,color:C.navy,fontFamily:F.title,
                    display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
                    {tr("tables.queue")}
                    {queue.length>=5&&<span style={{fontSize:9,background:C.redP,color:C.red,
                      borderRadius:20,padding:"1px 6px",fontWeight:700,fontFamily:F.body,
                      animation:"pulse 1.2s infinite"}}>🚨</span>}
                  </div>
                  <div style={{overflowY:"auto",padding:8,display:"flex",
                    flexDirection:"column",gap:6,
                    maxHeight: selectedTable ? "40%" : undefined,
                    flex: selectedTable ? "0 0 auto" : 1,
                  }}>
                    {queue.map(g=>{
                      const pct=Math.max(0,(g.expiresAt-now)/(g.patMax*1000));
                      const col=pct>0.5?C.green:pct>0.25?C.amber:C.red;
                      const freeT=tables.filter(t=>t.status==="libre"&&t.capacity>=g.size);
                      const aS=servers.filter(s=>s.status==="actif"&&(s.moral??100)>10&&(!s.shift||isOnShift(s.shift,absMin)));
                      const isSelected=selectedClient?.id===g.id;
                      return(
                        <div key={g.id}
                          style={{background:isSelected?C.navyP:C.bg,
                            border:`1px solid ${isSelected?C.navy:col+"33"}`,
                            borderLeft:`3px solid ${isSelected?C.navy:col}`,
                            borderRadius:9,padding:"8px 10px",
                            transition:"background 0.15s,border 0.15s"}}>
                          <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:4}}>
                            <span style={{fontSize:18}}>{g.mood.e}</span>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{fontSize:11,fontWeight:700,color:isSelected?C.navy:C.ink,fontFamily:F.body,
                                overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{g.name}</div>
                              <div style={{fontSize:9,color:C.muted,fontFamily:F.body}}>{g.size}p · {g.mood.l}{g.isVIP?" 🎩":""}</div>
                            </div>
                          </div>
                          <div style={{height:3,background:col+"22",borderRadius:99,overflow:"hidden",marginBottom:5}}>
                            <div style={{height:"100%",width:`${pct*100}%`,background:col,borderRadius:99,transition:"width 0.3s"}}/>
                          </div>
                          {isSelected?(
                            <div style={{display:"flex",flexDirection:"column",gap:4}}>
                              <div style={{fontSize:9,color:C.navy,fontFamily:F.body,textAlign:"center",padding:"2px 0",fontWeight:600}}>
                                {tr("tables.clickTable")}
                              </div>
                              <Btn full sm v="ghost" onClick={()=>setSelectedClient(null)}>✕ Annuler</Btn>
                            </div>
                          ):freeT.length>0?(
                            <div style={{display:"flex",gap:3}}>
                              {aS.length>0&&<Btn full sm v="primary" onClick={()=>quickPlace(g)} icon="➡️">{tr("tables.place")}</Btn>}
                              <Btn full sm v="navy" onClick={()=>toggleSelectClient(g)} icon="🪑">{tr("tables.tableBtn")}</Btn>
                              {aS.length===0&&<Btn full sm v="secondary" onClick={()=>openAssign(g)} icon="👤">{tr("tables.serverBtn")}</Btn>}
                            </div>
                          ):(
                            <div style={{fontSize:9,color:C.muted,fontFamily:F.body,textAlign:"center",padding:"2px 0"}}>{freeT.length===0?tr("tables.noTable"):tr("tables.noServer")}</div>
                          )}
                        </div>
                      );
                    })}
                    {queue.length===0&&waitlist.length===0&&(
                      <div style={{textAlign:"center",color:C.muted,fontSize:10,fontFamily:F.body,padding:"12px 0",fontStyle:"italic"}}>
                        {tr("tables.noWaiting")}
                      </div>
                    )}
                    {waitlist.length>0&&(
                      <div style={{borderTop:`1px solid ${C.border}`,paddingTop:8,marginTop:4}}>
                        <div style={{fontSize:9,color:C.muted,fontFamily:F.body,fontWeight:600,
                          textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:5}}>{tr("tables.recallable")}</div>
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
                </>
              )}

              {/* Détail table sélectionnée — en dessous de la file */}
              {selectedTable&&(
                <div style={{
                  flex:1,minHeight:0,
                  borderTop: (queue.length>0||waitlist.length>0) ? `1px solid ${C.border}` : undefined,
                  display:"flex",flexDirection:"column",
                  overflowY:"hidden",
                }}>
                  <div style={{padding:"8px 12px",borderBottom:`1px solid ${C.border}`,
                    display:"flex",justifyContent:"space-between",alignItems:"center",
                    flexShrink:0}}>
                    <span style={{fontSize:12,fontWeight:700,color:C.ink,fontFamily:F.title}}>
                      📋 {selectedTable.name}
                    </span>
                    <button onClick={()=>setSelectedTable(null)} style={{
                      background:"none",border:"none",fontSize:16,cursor:"pointer",
                      color:C.muted,padding:"0 4px",lineHeight:1}}>✕</button>
                  </div>
                  <div style={{padding:10,flex:1,overflowY:"auto"}}>
                    <DetailPanel
                      t={selectedTable}
                      tables={tables}
                      servers={servers}
                      kitchen={kitchen}
                      queue={queue}
                      now={now}
                      cash={cash}
                      C={C} F={F}
                      quickPlace={quickPlace}
                      openAssign={openAssign}
                      checkout={checkout}
                      setSelectedTable={setSelectedTable}
                      addTx={addTx}
                      setCash={setCash}
                      addToast={addToast}
                      setTables={setTables}
                      onTableUpgrade={onTableUpgrade}
                      CAP_UPGRADES={CAP_UPGRADES}
                      calcRating={calcRating}
                      ratingColor={ratingColor}
                      ratingStars={ratingStars}
                      activeSrv={activeSrv}
                    />
                  </div>
                </div>
              )}

            </div>
          )}

          {/* ── Plan SVG — flex:1, prend tout l'espace restant ── */}
          <div style={{flex:1,minWidth:0,background:"#faf7f0",overflow:"hidden",position:"relative"}}>
            <SvgFloorPlan
              tables={tables} servers={servers} kitchen={kitchen}
              queue={queue} now={now} C={C} F={F}
              selectedTable={selectedTable} setSelectedTable={setSelectedTable}
              srvLv={srvLv} SRV_LVL={SRV_LVL}
              calcRating={calcRating} ratingColor={ratingColor}
              ratingStars={ratingStars} calcTip={calcTip}
              quickPlace={quickPlace} openAssign={openAssign}
              checkout={checkout} activeSrv={activeSrv}
              lockedSlots={lockedSlots}
              selectedClient={selectedClient}
              onPlaceClient={placeClientAtTable}
              onCancelClientSelect={()=>setSelectedClient(null)}
            />
          </div>

        </div>
      )}

      {/* Mobile — vue compacte plein écran */}
      {bp.isMobile&&(
        <div style={{flex:1,overflowY:"auto",
          padding:8,background:"rgba(250,247,240,0.97)"}}>
            {tables.map(t=>{
              const isMm=t.status==="mange";const isNm=t.status==="nettoyage";
              const isOm=t.status==="occupée"&&t.svcUntil&&now<t.svcUntil;
              const isLm=t.status==="libre";const isCm=t.status==="occupée"&&!isOm;
              const isEm=isMm&&t.eatUntil&&now<t.eatUntil;
              const myQm=queue.filter(g=>g.size<=t.capacity&&isLm);
              const aSm=servers.filter(s=>s.status==="actif"&&(s.moral??100)>10&&(!s.shift||isOnShift(s.shift,absMin)));
              const ph=isOm?0:isCm?1:isMm?2:isNm?3:-1;
              const pCs=["#3a5f8a","#e07a45","#4a9e78","#f5a623"];
              const pIs=["🛎","🔥","🍴","🧹"];const pLs=[tr("tables.phaseOrder"),tr("tables.phaseKitchen"),tr("tables.phaseEating"),tr("tables.phaseCleaning")];
              const pC=ph>=0?pCs[ph]:C.green;
              const ckT=kitchen.cooking.filter(d=>d.tableId===t.id);
              const slw=ckT.length>0?ckT.reduce((a,b)=>(b.startedAt+b.timerMax*1000)>(a.startedAt+a.timerMax*1000)?b:a):null;
              const pc=ph===0?Math.min(100,Math.round((1-(Math.max(0,(t.svcUntil-now))/((t.svcUntil-t.placedAt)||1)))*100)):ph===1?(slw?Math.min(100,Math.round(((now-slw.startedAt)/(slw.timerMax*1000))*100)):0):ph===2?(isEm?Math.min(100,Math.round(((t.eatDur*1000-(t.eatUntil-now))/(t.eatDur*1000))*100)):100):ph===3?(t.cleanUntil?Math.min(100,Math.round(((t.cleanDur*1000-(t.cleanUntil-now))/(t.cleanDur*1000))*100)):0):0;
              const bl=isMm?+t.order.reduce((s,o)=>s+o.price*o.qty,0).toFixed(2):0;
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
                      {ph>=0?pIs[ph]+" "+pLs[ph]:tr("tables.status.free")}
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
                  {isNm&&(()=>{
                    const cleanSrv=t.cleanServer?servers.find(s=>s.id===t.cleanServer):null;
                    const rem=t.cleanUntil?Math.max(0,Math.ceil((t.cleanUntil-now)/1000)):null;
                    return(
                      <div style={{fontSize:10,color:C.amber,fontFamily:F.body,marginBottom:5}}>
                        {cleanSrv?`👔 ${cleanSrv.name}`:tr("tables.waitingServer")}
                        {rem!==null&&` · ${rem}s`}
                      </div>
                    );
                  })()}
                  {isMm&&!isEm&&<Btn full v="primary" sm onClick={()=>checkout(t.id)} icon="💰">{tr("tables.checkout",{amount:bl})}</Btn>}
                  {isLm&&myQm.length>0&&aSm.length>0&&<Btn full v="terra" sm onClick={()=>quickPlace(myQm[0])} icon="👥">Placer</Btn>}
                  {isLm&&myQm.length>0&&aSm.length===0&&<Btn full v="secondary" sm onClick={()=>openAssign(myQm[0])} icon="👥">Placer</Btn>}
                </div>
              );
            })}
            {lockedSlots.map(slot=>(
              <div key={"locked"+slot.num} style={{
                background:C.bg,border:`1px dashed ${C.border}`,
                borderRadius:12,padding:"10px 14px",opacity:0.55,
                display:"flex",alignItems:"center",gap:10,marginBottom:6
              }}>
                <span style={{fontSize:22}}>🔒</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:12,fontWeight:700,color:C.muted,fontFamily:F.body}}>
                    {tr("tables.lockedTable",{num:slot.num})}
                  </div>
                  <div style={{fontSize:10,color:C.muted,fontFamily:F.body}}>
                    {tr("tables.lockedLevel",{level:slot.unlocksAt.l,name:slot.unlocksAt.name})}
                  </div>
                </div>
                <span style={{fontSize:11,color:slot.unlocksAt.color,
                  fontWeight:700,fontFamily:F.body,whiteSpace:"nowrap"}}>
                  {slot.unlocksAt.icon} Niv.{slot.unlocksAt.l}
                </span>
              </div>
            ))}
        </div>
      )}


      {/* ══ 3. BARRE CUISINE — bas 64px ═══════════════════════ */}
      <div style={{height:64,flexShrink:0,background:C.surface,
        borderTop:`1px solid ${C.border}`,
        display:"flex",alignItems:"center",
        overflowX:"auto",scrollbarWidth:"none",zIndex:10}}>
        {kitchen.cooking.length===0&&tables.filter(t=>t.status==="nettoyage").length===0?(
          <div style={{padding:"0 18px",fontSize:11,color:C.muted,
            fontFamily:F.body,fontStyle:"italic",whiteSpace:"nowrap"}}>
            {tr("tables.quietDining")}
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
                      {done?tr("tables.ready"):fmt(rem)}
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
              const cleanSrv=t.cleanServer?servers.find(s=>s.id===t.cleanServer):null;
              return(
                <div key={"cl"+t.id} style={{flexShrink:0,padding:"0 12px",
                  borderRight:`1px solid ${C.border}`,height:"100%",
                  display:"flex",flexDirection:"column",justifyContent:"center",
                  gap:2,minWidth:110}}>
                  <span style={{fontSize:11,color:C.amber,fontWeight:600,fontFamily:F.body}}>
                    🧹 {t.name}
                  </span>
                  <span style={{fontSize:10,color:C.muted,fontFamily:F.body}}>
                    {cleanSrv?`👔 ${cleanSrv.name}`:tr("tables.waitingServerShort")}
                  </span>
                  {cleanSrv&&<span style={{fontSize:9,color:C.amber,fontFamily:F.body}}>
                    {rem>0?rem+"s":tr("tables.cleanDone")}
                  </span>}
                </div>
              );
            })}
          </>
        )}
      </div>

            {/* Assign modal */}
      {modal&&(
        <Modal title={tr("tables.placeModal")} onClose={()=>setModal(null)}>
          <div style={{display:"flex",flexDirection:"column",gap:18}}>
            {/* Client info */}
            <div style={{background:C.navyP,border:`1px solid ${C.navy}22`,
              borderRadius:12,padding:"14px 16px",display:"flex",alignItems:"center",gap:14}}>
              <span style={{fontSize:38}}>{modal.mood.e}</span>
              <div>
                <div style={{fontSize:17,fontWeight:600,color:C.ink,fontFamily:F.title}}>{modal.name}</div>
                <div style={{fontSize:12,color:C.muted,fontFamily:F.body}}>
                  {tr("tables.groupOf",{size:modal.size,mood:modal.mood.l})}
                </div>
                <div style={{fontSize:11,color:C.navy,fontWeight:600,marginTop:3,fontFamily:F.body}}>
                  {tr("tables.xpBonus",{mult:modal.mood.b})}
                </div>
              </div>
            </div>

            {/* Table picker */}
            <div>
              <Lbl>{tr("tables.chooseTable")}</Lbl>
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
                        👥 {t.capacity} {tr("tables.covers")}
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
                    {tr("tables.noAvailable")}
                  </div>
                )}
              </div>
            </div>

            {/* Server picker */}
            <div>
              <Lbl>{tr("tables.chooseServer")}</Lbl>
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
                  {tr("tables.orderPreview")}
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {(()=>{const catColors={Entrées:C.green,Plats:C.terra,Desserts:C.purple,Boissons:C.navy,Formules:C.amber};return preview.map((o,i)=>(
                    <div key={i} style={{display:"flex",justifyContent:"space-between",
                      alignItems:"center",fontSize:12,fontFamily:F.body}}>
                      <div style={{display:"flex",gap:7,alignItems:"center"}}>
                        <Badge color={catColors[o.cat]||C.navy} sm>{o.cat}</Badge>
                        <span style={{color:C.ink}}>{o.qty}× {o.item}</span>
                      </div>
                      <span style={{color:C.terra,fontWeight:600}}>{(o.price*o.qty).toFixed(2)}€</span>
                    </div>
                  ))})()}
                  <div style={{borderTop:`1px solid ${C.terra}33`,paddingTop:8,marginTop:2,
                    display:"flex",justifyContent:"space-between",fontWeight:700,fontFamily:F.title}}>
                    <span style={{fontSize:12,color:C.muted}}>{tr("tables.totalEst")}</span>
                    <span style={{color:C.terra,fontSize:16}}>
                      {preview.reduce((s,o)=>s+o.price*o.qty,0).toFixed(2)}€
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
              <Btn onClick={()=>setModal(null)} v="ghost">{tr("app.cancel")}</Btn>
              <Btn onClick={confirm} disabled={!tgtT||!tgtS||preview.length===0} v="terra" icon="🔥">
                {tr("tables.sendKitchen")}
              </Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
