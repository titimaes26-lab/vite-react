import { useState, useEffect } from "react";
import { C, RESTO_LVL } from "../../constants/gameData.js";
import { REP_DELTA } from "../../constants/gameConstants.js";
import { isOnShift } from "../../hooks/useGameClock.js";
import { useLang } from "../../i18n/index.jsx";
import { useClockNow } from "../../contexts/ClockContext.jsx";
import { calcRating, restoXpFromCheckout, srvXpFromCheckout, SRV_MAX_XP } from "../../utils/levelUtils.js";
import { generateOrderWithFormulas } from "../../utils/randomUtils.js";
import { buildKitchenTickets, svcDuration } from "../../utils/orderUtils.js";

export function useTablesView({
  tables, setTables, servers, setServers, menu, setMenu,
  setKitchen, addToast, addRestoXp, setCash, addTx,
  setQueue, setWaitlist, addDayStat, gameTime,
  setChallengeProgress, updateReputation,
  restoLvN=0, formulas=[], stock=[],
}) {
  const { t: tr } = useLang();
  const now = useClockNow();
  const [selectedTable, setSelectedTable] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [modal, setModal] = useState(null);
  const [tgtT, setTgtT] = useState(null);
  const [tgtS, setTgtS] = useState(null);
  const [preview, setPreview] = useState([]);

  const absMin = gameTime?.absMin ?? 0;
  const activeSrv = servers.filter(s =>
    s.status==="actif" && (s.moral??100)>10 && (!s.shift || isOnShift(s.shift, absMin))
  );
  const freeTbl = (g) => tables.filter(t => t.status==="libre" && t.capacity>=g.size);
  const lockedSlots = (() => {
    let prev = tables.length;
    for (const lv of RESTO_LVL.filter(l => l.l > restoLvN)) {
      if (prev < lv.tables) return [{ num: prev+1, unlocksAt: lv }];
      prev = lv.tables;
    }
    return [];
  })();

  useEffect(() => {
    if (!selectedClient) return;
    const onKey = (e) => { if (e.key==="Escape") setSelectedClient(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedClient]);

  const openKitchen = (g, table, srv) => {
    const speedMult = srv.specialty?.id==="speed"?(srv.specialty.speedMult||1.0):1.0;
    const svcDur = Math.round(svcDuration(g.size).ms * speedMult);
    const svcUntil = Date.now()+svcDur;
    const orderLines = generateOrderWithFormulas(g, menu, formulas, restoLvN);
    const kitchenTickets = buildKitchenTickets(orderLines, table);
    setMenu(p=>p.map(m=>{
      const l=orderLines.find(o=>o.menuId===m.id); if(!l) return m;
      return{...m,orderCount:(m.orderCount||0)+l.qty,
        formulaRevenue:l.isFormula?(m.formulaRevenue||0)+l.price*l.qty:(m.formulaRevenue||0),
        dayOrderCount:(m.dayOrderCount||0)+l.qty,
        dayFormulaRevenue:l.isFormula?(m.dayFormulaRevenue||0)+l.price*l.qty:(m.dayFormulaRevenue||0)};
    }));
    setServers(p=>p.map(s=>s.id!==srv.id?s:{...s,status:"service",serviceUntil:svcUntil}));
    setTables(p=>p.map(t=>t.id!==table.id?t:{
      ...t,status:"occupée",server:srv.name,group:g,order:orderLines,
      svcTimer:0,svcMax:0,svcUntil,placedAt:Date.now(),
      patienceLeftRatio:Math.max(0,(g.expiresAt-Date.now())/(g.patMax*1000)),
    }));
    setQueue(q=>q.filter(c=>c.id!==g.id));
    setChallengeProgress&&setChallengeProgress(p=>({...p,fastPlace:p.fastPlace+1}));
    const formulaUsed = orderLines.find(o=>o.isFormula);
    addToast({icon:formulaUsed?"🍽️":"🛎️",
      title:formulaUsed?tr("toast.formulaOrdered",{formula:formulaUsed.formulaName}):tr("toast.orderTaken"),
      msg:tr("toast.orderTakenMsg",{server:srv.name,table:table.name}),color:C.navy,tab:"tables",silent:true});
    setTimeout(()=>{
      setKitchen(k=>({...k,
        queue:[...k.queue,...kitchenTickets.filter(d=>d.cat!=="Boissons")],
        done:[...k.done,...kitchenTickets.filter(d=>d.cat==="Boissons")],
      }));
      setServers(p=>p.map(s=>s.id!==srv.id?s:{...s,status:"actif",serviceUntil:null}));
      setTables(p=>p.map(t=>t.id!==table.id?t:{...t,svcUntil:null,server:null}));
    }, svcDur);
    setModal(null);
  };

  const checkout = (tid) => {
    const t = tables.find(x=>x.id===tid); if (!t?.group) return;
    const bill = +t.order.reduce((s,o)=>s+o.price*o.qty,0).toFixed(2);
    const hasStale = t.order.some(o=>{
      const mi=menu.find(m=>m.id===o.menuId); if(!mi) return false;
      return (mi.ingredients||[]).some(ing=>{const si=stock.find(s=>s.id===ing.stockId);return si&&(si.freshness??100)<20;});
    });
    const r = Math.max(1, calcRating(t.patienceLeftRatio??0.5, t.group.mood.b)-(hasStale?0.5:0));
    const tip = +(bill*(r-1)*0.04).toFixed(2);
    const total = +(bill+tip).toFixed(2);
    const srvObj = servers.find(s=>s.name===t.server);
    setCash(c=>+(c+total).toFixed(2));
    addTx("revenu",`Encaissement ${t.name} — ${t.group.size}cov`,total);
    addDayStat("revenue",total); addDayStat("served",t.group.size??1); addDayStat("rating",r);
    if (srvObj) {
      const xp = srvXpFromCheckout(r, t.group.size);
      setServers(p=>p.map(s=>s.id===srvObj.id?{...s,totalXp:Math.min(SRV_MAX_XP,s.totalXp+xp),rating:+(s.rating*0.9+r*0.1).toFixed(1),dayCheckouts:(s.dayCheckouts||0)+1,dayCovers:(s.dayCovers||0)+(t.group.size??1),dayRevenue:+((s.dayRevenue||0)+total).toFixed(2)}:s));
    }
    addRestoXp(restoXpFromCheckout(t.group.size, t.group.mood.b, t.group.isVIP||false, restoLvN));
    if (updateReputation) {
      const repKey=r>=4.5?"rating5":r>=3.5?"rating4":r>=2.5?"rating3":r>=1.5?"rating2":"rating1";
      updateReputation(REP_DELTA[repKey],`note ${r.toFixed(1)}/5`);
    }
    setTables(p=>p.map(x=>x.id!==tid?x:{...x,status:"nettoyage",group:null,order:[],server:null,patienceLeftRatio:null,svcUntil:null,placedAt:null,cleanUntil:null,cleanDur:30,cleanServer:null,freedAt:null}));
    setChallengeProgress&&setChallengeProgress(p=>({...p,served:(p.served||0)+1,revenue:(p.revenue||0)+total,tips:+((p.tips||0)+tip).toFixed(2),highRating:r>=4?(p.highRating||0)+1:(p.highRating||0),vip:t.group?.isVIP?(p.vip||0)+1:p.vip||0}));
    if (selectedTable?.id===tid) setSelectedTable(null);
  };

  const quickPlace = (g) => { const ft=freeTbl(g)[0],sv=activeSrv[0]; if(ft&&sv) openKitchen(g,ft,sv); };
  const openAssign = (g) => {
    setPreview(generateOrderWithFormulas(g, menu, formulas, restoLvN));
    setModal(g);
  };
  const toggleSelectClient = (g) => { setSelectedClient(prev=>prev?.id===g.id?null:g); setSelectedTable(null); };
  const placeClientAtTable = (g, table) => {
    const sv = activeSrv[0];
    if (!sv) { addToast({icon:"⚠️",title:tr("tables.noServerAvailable"),msg:tr("tables.allBusy"),color:C.red,tab:"tables",silent:true}); setSelectedClient(null); return; }
    openKitchen(g, table, sv); setSelectedClient(null);
  };
  const recallGroup = (g) => {
    setQueue(q=>[{...g,expiresAt:Date.now()+g.patMax*1000,mood:{...g.mood,b:Math.min(g.mood.b+0.3,2)},recalled:true},...q]);
    setWaitlist(w=>w.filter(x=>x.id!==g.id));
  };
  const confirm = () => {
    if (!tgtT||!tgtS||preview.length===0) return;
    const table=tables.find(t=>String(t.id)===tgtT), srv=servers.find(s=>s.name===tgtS);
    if (!table||!srv) return;
    openKitchen(modal, table, srv); setTgtT(null); setTgtS(null); setPreview([]);
  };

  return {
    now, selectedTable, setSelectedTable, selectedClient, setSelectedClient,
    modal, setModal, tgtT, setTgtT, tgtS, setTgtS, preview,
    absMin, activeSrv, freeTbl, lockedSlots,
    quickPlace, openAssign, toggleSelectClient, placeClientAtTable, recallGroup, checkout, confirm,
  };
}
