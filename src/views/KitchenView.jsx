/* ═══════════════════════════════════════════════════════
   src/views/KitchenView.jsx
   Extrait du monolithe restaurant-manager.jsx
   Dépendances déclarées dans les imports ci-dessous.
═══════════════════════════════════════════════════════ */
import { useState, useEffect, useRef } from "react";
import { useLang } from "../i18n/index.jsx";
import { C, F, CHEF_LVL, CHEF_XP_CAP, COMMIS_LVL, COMMIS_XP_CAP,
         KITCHEN_UPGRADES, COMMIS_SPECIALTIES, CHEF_TRAININGS } from "../constants/gameData.js";
import { Btn, XpBar, Badge } from "../components/ui/index.js";
import { chefLv, commisLv, dishCookTimeWithUpgrades, CHEF_MAX_XP, COMMIS_MAX_XP } from "../utils/levelUtils.js";
import { consumeLots } from "../utils/orderUtils.js";
import { isOnShift } from "../hooks/useGameClock.js";

export function KitchenView({kitchen,setKitchen,stock,setStock,tables,setTables,servers=[],setServers,addToast,cash,setCash,addTx,gameTime,restoLvN=0,bp={}}){
  const { t: tl, lang } = useLang();
  const chf=kitchen.chef;
  const cl=chefLv(chf.totalXp);
  const clD=CHEF_LVL[Math.min(cl.l,CHEF_LVL.length-1)];
  const unlockedCommis=clD.commis;
  const maxCommisSlots=Math.max(...CHEF_LVL.map(l=>l.commis));

  // Compute upgrade bonuses (all slot/speed sources combined)
  const upg={fourneau:0,four:0,stockage:0,plonge:0,salamandre:0,dressage:0,sousvide:0,brigade:0,...(kitchen.upgrades||{})};
  const slotSources=["fourneau","dressage","brigade"];
  const speedSources=["four","salamandre","sousvide"];
  const extraSlots=slotSources.reduce((tot,id)=>{
    const item=KITCHEN_UPGRADES.find(u=>u.id===id);
    return tot+(item?item.levels.slice(0,upg[id]).reduce((s,l)=>s+(l.bonus.slots||0),0):0);
  },0);
  const speedBonus=speedSources.reduce((tot,id)=>{
    const item=KITCHEN_UPGRADES.find(u=>u.id===id);
    return tot+(item?item.levels.slice(0,upg[id]).reduce((s,l)=>s+(l.bonus.speed||0),0):0);
  },0);

  // Morale & specialty helpers — must be declared before maxConcurrent/upgDishCookTime
  const morale=kitchen.morale??100;
  const moraleMult=morale>=70?1.10:morale<30?0.85:1.0;
  const moraleColor=morale>=70?C.green:morale>=40?C.amber:C.red;
  const moraleIcon=morale>=70?"😊":morale>=40?"😐":morale<20?"💀":"😓";
  const activeCommisArr=kitchen.commis.filter((_,i)=>i<unlockedCommis);
  const specBonus=(cat)=>activeCommisArr.filter(c=>c.specialty?.cat===cat).reduce((s,c)=>s+(c.specialty?.bonus||0),0);
  const trainingBonus=(cat)=>{
    const t=kitchen.chefTrainings||{};
    const tr=CHEF_TRAININGS.find(x=>x.id==="pastry");
    const ts=CHEF_TRAININGS.find(x=>x.id==="sauces");
    let b=0;
    if(t.pastry && tr?.catBonus?.cat===cat) b+=tr.catBonus.mult;
    if(t.sauces && ts?.catBonus?.cat===cat) b+=ts.catBonus.mult;
    return b;
  };
  const brigadeSlot=(kitchen.chefTrainings?.brigade&&kitchen.chefTrainings.brigadeUntil>Date.now())?1:0;

  // Chefs supplémentaires actifs et en créneau
  const absMin = gameTime?.absMin ?? 0;
  const activeAdditionalChefs = (kitchen.chefs ?? []).filter(
    c => c.status === "actif" && isOnShift(c.shift, absMin)
  );

  const maxConcurrent=4+unlockedCommis+extraSlots+brigadeSlot+activeAdditionalChefs.length;

  const upgDishCookTime=(prepTime,chefSpeed,commisCount,cat="")=>
    Math.max(5,Math.round(prepTime/((chefSpeed+speedBonus)*(1+commisCount*0.15)*(1+activeAdditionalChefs.length*0.10)*moraleMult*(1+specBonus(cat)+trainingBonus(cat)))));

  const catColors={Entrées:C.green,Plats:C.terra,Desserts:C.purple,Boissons:C.navy};

  // Live clock for rendering (independent of logic intervals)
  const [now,setNow]=useState(Date.now());
  const [pianoCompact,setPianoCompact]=useState(()=>{
    try{return localStorage.getItem("pianoCompact")==="1";}catch{return false;}
  });
  const togglePiano=()=>setPianoCompact(v=>{
    try{localStorage.setItem("pianoCompact",v?"0":"1");}catch{}
    return !v;
  });

  useEffect(()=>{
    const iv=setInterval(()=>setNow(Date.now()),250);
    return()=>clearInterval(iv);
  },[]);

  // Consume ingredients from stock + return total cost deducted + missing list
  const consumeStock=(dishes,prevStock)=>{
    let s=[...prevStock];
    let cost=0;
    const missing=[];
    dishes.forEach(d=>(d.ingredients||[]).forEach(ing=>{
      const item=s.find(x=>x.id===ing.stockId);
      if(item){
        if(item.qty<ing.qty) missing.push({dish:d.name,ing:item.name,need:ing.qty,have:item.qty});
        cost+=+(ing.qty*(item.price||0)).toFixed(4);
        s=s.map(x=>x.id===ing.stockId?consumeLots(x,ing.qty):x);
      }
    }));
    return{newStock:s,cost:+cost.toFixed(2),missing};
  };

  // Completion check — runs every 500ms, compares timestamps only
  useEffect(()=>{
    const iv=setInterval(()=>{
      const t=Date.now();
      setKitchen(k=>{
        const justDone=k.cooking.filter(d=>t>=d.startedAt+d.timerMax*1000);
        if(justDone.length===0)return k;
        const stillCooking=k.cooking.filter(d=>t<d.startedAt+d.timerMax*1000);
        const xpPerDish=12;
        const activeCommis=k.commis.filter(c=>c.status==="actif").slice(0,unlockedCommis);
        const activeChefs=(k.chefs??[]).filter(c=>c.status==="actif");
        return {
          ...k,
          chef:{...k.chef,totalXp:Math.min(CHEF_MAX_XP,k.chef.totalXp+justDone.length*xpPerDish)},
          commis:k.commis.map(c=>
            activeCommis.find(a=>a.id===c.id)
              ?{...c,totalXp:Math.min(CHEF_MAX_XP,c.totalXp+Math.round(xpPerDish*0.6))}
              :c
          ),
          chefs:(k.chefs??[]).map(c=>
            activeChefs.find(a=>a.id===c.id)
              ?{...c,totalXp:Math.min(CHEF_MAX_XP,c.totalXp+Math.round(xpPerDish*0.8))}
              :c
          ),
          cooking:stillCooking,
          done:[...k.done,...justDone.map(d=>({...d,completedAt:t}))],
          totalDishes:k.totalDishes+justDone.length,
          morale:Math.min(100,(k.morale??100)+justDone.length*2),
        };
      });
    },500);
    return()=>clearInterval(iv);
  },[unlockedCommis]);

  // Morale decay/rise — runs every 5s
  useEffect(()=>{
    const iv=setInterval(()=>{
      setKitchen(k=>{
        const q=k.queue.length;
        const delta=q>4?-2:q===0?+1:0;
        if(delta===0)return k;
        return{...k,morale:Math.min(100,Math.max(0,(k.morale??100)+delta))};
      });
    },5000);
    return()=>clearInterval(iv);
  },[]);

  // Chef level-up toast + commis unlock notification
  const prevChefLvRef=useRef(cl.l);
  useEffect(()=>{
    if(cl.l>prevChefLvRef.current){
      const d=CHEF_LVL[Math.min(cl.l,CHEF_LVL.length-1)];
      addToast({icon:"👨‍🍳",title:tl("kitchen.chefLvl",{l:cl.l}),
        msg:`${chf.name} → ${d.name}`,color:C.purple,tab:"cuisine",silent:true});
      const prevCommis=CHEF_LVL[Math.min(prevChefLvRef.current,CHEF_LVL.length-1)].commis;
      if(d.commis>prevCommis){
        addToast({icon:"👥",title:tl("kitchen.newSlot"),
          msg:tl("kitchen.newSlotMsg",{n:d.commis}),
          color:C.green,tab:"cuisine",silent:true});
      }
    }
    prevChefLvRef.current=cl.l;
  },[cl.l]);

  const chefOnShift = isOnShift(kitchen.chef?.shift, gameTime?.absMin ?? 0);

  // Start one dish
  const startDish=(dish)=>{
    if(!chefOnShift)return;
    if(kitchen.cooking.length>=maxConcurrent)return;
    const ct=upgDishCookTime(dish.prepTime||60,clD.speed,unlockedCommis,dish.cat||"");
    let blocked=false;
    setStock(s=>{
      const{newStock,missing}=consumeStock([dish],s);
      if(missing.length>0){
        blocked=true;
        missing.forEach(m=>addToast({icon:"⚠️",title:tl("kitchen.noStock"),
          msg:tl("kitchen.noStockMsg",{item:m.ing}),
          color:C.red,tab:"stock"}));
        return s;
      }
      return newStock;
    });
    if(blocked)return;
    setKitchen(k=>({
      ...k,
      queue:k.queue.filter(d=>d.id!==dish.id),
      cooking:[...k.cooking,{...dish,startedAt:Date.now(),timerMax:ct}],
    }));
  };

  // Start all dishes filling free slots
  const startAll=()=>{
    if(!chefOnShift)return;
    const slots=maxConcurrent-kitchen.cooking.length;
    if(slots<=0)return;
    const toStart=kitchen.queue.slice(0,slots);
    if(toStart.length===0)return;
    const ts=Date.now();
    setStock(s=>{
      const{newStock}=consumeStock(toStart,s);
      return newStock;
    });
    setKitchen(k=>({
      ...k,
      queue:k.queue.filter(d=>!toStart.find(x=>x.id===d.id)),
      cooking:[...k.cooking,...toStart.map(d=>({
        ...d,
        startedAt:ts,
        timerMax:upgDishCookTime(d.prepTime||60,clD.speed,unlockedCommis,d.cat||""),
      }))],
    }));
  };

  // Serve all done dishes for a table → table becomes "mange" with eating timer
  // Requires an available server to carry the dishes
  const freeSrvForServing = servers.find(s => s.status === "actif" && (s.moral ?? 100) > 10);

  const serveTable=(tableId,tableName)=>{
    if (!freeSrvForServing) return;
    setKitchen(k=>{
      const dishes=k.done.filter(d=>d.tableId===tableId);
      const maxPrep=Math.max(...dishes.map(d=>d.prepTime||60),60);
      const eatSec=Math.round(maxPrep*(2/3));
      setTables(p=>p.map(t=>t.id!==tableId?t:{...t,status:"mange",eatUntil:Date.now()+eatSec*1000,eatDur:eatSec}));
      return {...k,done:k.done.filter(d=>d.tableId!==tableId)};
    });
    // Le serveur est occupé 20s le temps d'apporter les plats
    if (setServers) setServers(p=>p.map(s=>s.id!==freeSrvForServing.id?s:
      {...s,status:"service",serviceUntil:Date.now()+20000}));
  };

  // Group done dishes by table
  const doneByTable={};
  kitchen.done.forEach(d=>{
    const key=d.tableId||"sans-table";
    if(!doneByTable[key])doneByTable[key]={tableId:d.tableId,tableName:d.tableName||"Sans table",dishes:[]};
    doneByTable[key].dishes.push(d);
  });
  // Group queue by table
  const queueByTable={};
  kitchen.queue.forEach(d=>{
    const key=d.tableId||"sans-table";
    if(!queueByTable[key])queueByTable[key]={tableId:d.tableId,tableName:d.tableName||"Sans table",dishes:[]};
    queueByTable[key].dishes.push(d);
  });
  // A table can be served only if no dishes still queued or cooking for it
  const canServeTable=(tableId)=>{
    const inQ=kitchen.queue.filter(d=>d.tableId===tableId).length;
    const inC=kitchen.cooking.filter(d=>d.tableId===tableId).length;
    return inQ===0&&inC===0;
  };

  const slotsLeft=maxConcurrent-kitchen.cooking.length;

  const IngBadges=({ingredients})=>{
    if(!ingredients||ingredients.length===0)return null;
    return(
      <div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:5}}>
        {ingredients.map(ing=>{
          const s=stock.find(x=>x.id===ing.stockId);
          return(
            <span key={ing.stockId} style={{fontSize:9,background:C.amberP,color:C.amber,
              border:`1px solid ${C.amber}22`,borderRadius:4,padding:"1px 6px",fontFamily:F.body}}>
              🧂{s?.name||"?"} −{ing.qty}{s?.unit||""}
            </span>
          );
        })}
      </div>
    );
  };

  // Throughput : plats terminés dans la dernière minute réelle
  const completedTimestamps = useRef([]);
  useEffect(()=>{
    kitchen.done.forEach(d=>{
      if(d.completedAt && !completedTimestamps.current.find(t=>t.id===d.id)){
        completedTimestamps.current.push({id:d.id, ts:d.completedAt});
      }
    });
    // Purge > 60s
    const cutoff=Date.now()-60000;
    completedTimestamps.current=completedTimestamps.current.filter(t=>t.ts>cutoff);
  },[kitchen.done.length]);

  const throughput = completedTimestamps.current.filter(t=>t.ts>Date.now()-60000).length;

  // Flash visuel quand un plat finit : id → timestamp fin
  const flashRef = useRef({});
  const prevCookingLen = useRef(kitchen.cooking.length);
  useEffect(()=>{
    if(kitchen.cooking.length < prevCookingLen.current){
      // Un plat a fini, on flash tous les feux récemment terminés
      kitchen.done.slice(-(prevCookingLen.current - kitchen.cooking.length)).forEach(d=>{
        flashRef.current[d.id]=Date.now();
        setTimeout(()=>{ delete flashRef.current[d.id]; },1200);
      });
    }
    prevCookingLen.current=kitchen.cooking.length;
  },[kitchen.cooking.length]);

  // Reorder queue by table ticket
  const moveTicket=(tableId,dir)=>{
    setKitchen(k=>{
      const groups=Object.values(k.queue.reduce((acc,d)=>{
        const key=d.tableId||"nt";
        if(!acc[key])acc[key]=[];
        acc[key].push(d);
        return acc;
      },{}));
      const idx=groups.findIndex(g=>g[0].tableId===tableId);
      const next=idx+dir;
      if(next<0||next>=groups.length)return k;
      [groups[idx],groups[next]]=[groups[next],groups[idx]];
      return {...k,queue:groups.flat()};
    });
  };

  return(
    <div>
      {/* Bandeau hors créneau */}
      {kitchen.chef?.shift && !chefOnShift && (
        <div style={{background:"#fef3c7",border:"1.5px solid #f59e0b",borderRadius:10,
          padding:"8px 14px",marginBottom:12,display:"flex",alignItems:"center",gap:10,
          fontSize:11,fontFamily:F.body,fontWeight:700,color:"#92400e"}}>
          <span style={{fontSize:18}}>💤</span>
          <span>{kitchen.chef.name} est hors créneau — la cuisine est à l'arrêt.</span>
        </div>
      )}
      {!kitchen.chef?.shift && (
        <div style={{background:"#fdf3dc",border:"1.5px solid #a86e08",borderRadius:10,
          padding:"8px 14px",marginBottom:12,display:"flex",alignItems:"center",gap:10,
          fontSize:11,fontFamily:F.body,fontWeight:600,color:"#a86e08"}}>
          <span style={{fontSize:16}}>⚠️</span>
          <span>Aucun créneau assigné au chef — assigner un créneau dans l'onglet Personnel.</span>
        </div>
      )}

      {/* ══ PIPELINE responsive ══ */}
      <div style={{display:"grid",gridTemplateColumns:bp.isMobile?"1fr":bp.isTablet?"1fr 1fr":"minmax(200px,1fr) minmax(240px,1.2fr) minmax(200px,1fr)",
        gap:12,marginBottom:20}}>

        {/* ── COL 1 : Tickets de commande ── */}
        <div style={{minWidth:0}}>
          {/* Header avec backlog */}
          {(()=>{
            const totalBacklogSec=Object.values(queueByTable).reduce((s,t)=>
              s+upgDishCookTime((t.dishes[0]?.prepTime||60),clD.speed,unlockedCommis,t.dishes[0]?.cat||"")*t.dishes.length,0);
            const late=Object.values(queueByTable).filter(t=>
              t.dishes.some(d=>d.addedAt&&(Date.now()-d.addedAt)>300000)).length;
            return(
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <div style={{display:"flex",alignItems:"center",gap:6,minWidth:0}}>
                  <span style={{fontSize:13}}>🎫</span>
                  <span style={{fontSize:12,fontWeight:700,color:C.amber,fontFamily:F.title,whiteSpace:"nowrap"}}>
                    {tl("kitchen.orders")} ({kitchen.queue.length})
                  </span>
                  {late>0&&(
                    <span style={{fontSize:9,background:C.redP,color:C.red,border:`1px solid ${C.red}33`,
                      borderRadius:20,padding:"1px 6px",fontFamily:F.body,fontWeight:700,
                      animation:"pulse 1s infinite",whiteSpace:"nowrap"}}>
                      ⏰{late}
                    </span>
                  )}
                </div>
                {kitchen.queue.length>0&&slotsLeft>0&&(
                  <Btn sm v={chefOnShift?"terra":"disabled"} disabled={!chefOnShift} onClick={startAll}>▶ {tl("kitchen.all")}</Btn>
                )}
              </div>
            );
          })()}

          <div style={{display:"flex",flexDirection:"column",gap:7,maxHeight:420,overflowY:"auto"}}>
            {kitchen.queue.length===0&&(
              <div style={{background:C.card,border:`1px dashed ${C.border}`,borderRadius:9,
                padding:14,textAlign:"center",color:C.muted,fontSize:11,fontStyle:"italic",fontFamily:F.body}}>
                {tl("kitchen.noOrders")}
              </div>
            )}
            {Object.values(queueByTable).map((tblQ,tIdx,arr)=>{
              const canStart=kitchen.cooking.length<maxConcurrent;
              const firstDish=tblQ.dishes[0];
              const elapsedMs=firstDish?.addedAt?(Date.now()-firstDish.addedAt):0;
              const elapsedSec=Math.floor(elapsedMs/1000);
              const isLate=elapsedMs>300000;
              const isWarning=elapsedMs>180000;
              const tc=isLate?C.red:isWarning?C.amber:C.amber;
              return(
                <div key={tblQ.tableId||"nt"} style={{
                  background:isLate?C.redP:C.amberP,
                  border:`1.5px solid ${tc}44`,borderRadius:10,overflow:"hidden",
                  boxShadow:isLate?`0 0 0 2px ${C.red}18`:"none"}}>
                  {/* Ticket header */}
                  <div style={{background:tc+"20",padding:"5px 9px",borderBottom:`1px solid ${tc}22`,
                    display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div style={{display:"flex",alignItems:"center",gap:5}}>
                      <div style={{display:"flex",flexDirection:"column",gap:1}}>
                        <button onClick={()=>moveTicket(tblQ.tableId,-1)} disabled={tIdx===0}
                          style={{width:14,height:12,fontSize:7,border:`1px solid ${tc}33`,borderRadius:2,
                            background:tIdx===0?"transparent":tc+"14",color:tIdx===0?C.muted:tc,
                            cursor:tIdx===0?"not-allowed":"pointer",lineHeight:1}}>▲</button>
                        <button onClick={()=>moveTicket(tblQ.tableId,+1)} disabled={tIdx===arr.length-1}
                          style={{width:14,height:12,fontSize:7,border:`1px solid ${tc}33`,borderRadius:2,
                            background:tIdx===arr.length-1?"transparent":tc+"14",color:tIdx===arr.length-1?C.muted:tc,
                            cursor:tIdx===arr.length-1?"not-allowed":"pointer",lineHeight:1}}>▼</button>
                      </div>
                      <div style={{width:17,height:17,borderRadius:"50%",background:tc,color:"#fff",
                        display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:800}}>{tIdx+1}</div>
                      <span style={{fontSize:10,fontWeight:700,color:isLate?C.red:C.amber,fontFamily:F.body,whiteSpace:"nowrap"}}>
                        📍{tblQ.tableName}
                      </span>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:5}}>
                      {elapsedSec>0&&<span style={{fontSize:8,fontWeight:700,color:tc,fontFamily:F.body}}>
                        {isLate?"🔴":isWarning?"🟡":"🟢"}{elapsedSec>=60?`${Math.floor(elapsedSec/60)}m`:elapsedSec+"s"}
                      </span>}
                      <span style={{fontSize:9,color:C.muted,fontFamily:F.body}}>{tblQ.dishes.length}×</span>
                    </div>
                  </div>
                  {/* Dishes */}
                  {tblQ.dishes.map((d,i)=>{
                    const estSec=upgDishCookTime(d.prepTime||60,clD.speed,unlockedCommis,d.cat||"");
                    const estFmt=estSec>=60?`${Math.floor(estSec/60)}m${String(estSec%60).padStart(2,"0")}s`:estSec+"s";
                    return(
                      <div key={d.id} style={{padding:"5px 9px",borderTop:i>0?`1px dashed ${tc}22`:undefined,
                        display:"flex",alignItems:"center",gap:6}}>
                        <span style={{fontSize:8,color:tc,fontWeight:800,minWidth:12}}>{i+1}</span>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:11,fontWeight:600,color:C.ink,fontFamily:F.body,
                            overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.name}</div>
                          <span style={{fontSize:9,color:C.amber,fontWeight:600,fontFamily:F.body}}>⏱{estFmt}</span>
                        </div>
                        <Btn sm v={canStart?"terra":"ghost"} disabled={!canStart} onClick={()=>startDish(d)}>
                          {canStart?"▶":"⛔"}
                        </Btn>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── COL 2 : Piano de cuisine SVG compact ── */}
        <div style={{minWidth:0}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:13}}>🔥</span>
              <span style={{fontSize:12,fontWeight:700,color:C.terra,fontFamily:F.title,whiteSpace:"nowrap"}}>
                {tl("kitchen.piano")} ({kitchen.cooking.length}/{maxConcurrent})
              </span>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:5}}>
              <span style={{fontSize:9,background:slotsLeft>0?C.greenP:C.redP,
                color:slotsLeft>0?C.green:C.red,border:`1px solid ${slotsLeft>0?C.green:C.red}33`,
                borderRadius:20,padding:"2px 7px",fontFamily:F.body,fontWeight:700,whiteSpace:"nowrap"}}>
                {slotsLeft>0?tl("kitchen.slotsAvailable",{n:slotsLeft}):tl("kitchen.full")}
              </span>
              <button onClick={togglePiano} title={pianoCompact?"Agrandir le piano":"Réduire le piano"} style={{
                background:"#2a2018",border:"1px solid #3a2e24",borderRadius:6,
                color:"#8a7a6a",fontSize:11,cursor:"pointer",padding:"2px 6px",lineHeight:1,
                fontFamily:F.body,fontWeight:700}}>
                {pianoCompact?"▶":"▼"}
              </button>
            </div>
          </div>

          {/* ── Barre compacte ── */}
          {pianoCompact&&(
            <div style={{background:"#1a1612",borderRadius:10,border:"2px solid #3a2e24",
              padding:"6px 10px",display:"flex",flexWrap:"wrap",gap:5}}>
              {Array.from({length:maxConcurrent},(_,i)=>{
                const dish=kitchen.cooking[i]||null;
                const remaining=dish?Math.max(0,Math.ceil((dish.startedAt+dish.timerMax*1000-now)/1000)):0;
                const pct=dish&&dish.timerMax>0?Math.min(100,((dish.timerMax-remaining)/dish.timerMax)*100):0;
                const almostDone=pct>80;
                const col=dish?(almostDone?"#4ade80":"#f97316"):"#3a2e24";
                const timer=remaining>=60?`${Math.floor(remaining/60)}m${String(remaining%60).padStart(2,"0")}s`:remaining+"s";
                return(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:4,
                    background:"#2a2018",borderRadius:6,padding:"3px 7px",
                    border:`1px solid ${col}44`,minWidth:0}}>
                    <div style={{width:8,height:8,borderRadius:"50%",background:col,flexShrink:0,
                      boxShadow:dish?`0 0 4px ${col}`:"none"}}/>
                    {dish?(
                      <>
                        <span style={{fontSize:9,color:"#fbbf24",fontFamily:F.body,fontWeight:700,
                          whiteSpace:"nowrap",maxWidth:60,overflow:"hidden",textOverflow:"ellipsis"}}>
                          {dish.name.length>9?dish.name.slice(0,8)+"…":dish.name}
                        </span>
                        <span style={{fontSize:9,color:col,fontFamily:F.body,fontWeight:800,whiteSpace:"nowrap"}}>
                          {timer}
                        </span>
                      </>
                    ):(
                      <span style={{fontSize:9,color:"#4a3c2c",fontFamily:F.body}}>libre</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Vue SVG pleine ── */}
          {!pianoCompact&&(()=>{
            const cols=maxConcurrent<=4?2:maxConcurrent<=6?3:4;
            const rows=Math.ceil(maxConcurrent/cols);
            // Compact cell sizes
            const CW=76,CH=80,PAD=8;
            const VW=cols*CW+PAD*2;
            const VH=rows*CH+PAD*2+16;
            const getPos=(i)=>({
              cx:PAD+(i%cols)*CW+CW/2,
              cy:PAD+12+Math.floor(i/cols)*CH+CH/2,
            });
            return(
              <div style={{background:"#1a1612",borderRadius:14,overflow:"hidden",
                border:"2px solid #3a2e24",boxShadow:"0 6px 24px rgba(0,0,0,0.35)"}}>
                <div style={{padding:"5px 10px",borderBottom:"1px solid #3a2e24",
                  display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:9,color:"#8a7a6a",fontFamily:F.body,fontWeight:600,letterSpacing:"0.08em"}}>
                    ✦ PIANO
                  </span>
                  <span style={{fontSize:9,color:C.terra,fontFamily:F.body,fontWeight:700}}>
                    {kitchen.totalDishes} {tl("kitchen.dishes")}
                  </span>
                </div>
                <svg viewBox={`0 0 ${VW} ${VH}`} width="100%" style={{display:"block"}}>
                  <rect width={VW} height={VH} fill="#1a1612"/>
                  {Array.from({length:Math.ceil(VH/8)},(_,i)=>(
                    <line key={i} x1="0" y1={i*8} x2={VW} y2={i*8}
                      stroke="#2a2018" strokeWidth="0.5" opacity="0.4"/>
                  ))}
                  {Array.from({length:maxConcurrent},(_,i)=>{
                    const pos=getPos(i);
                    const {cx,cy}=pos;
                    const dish=kitchen.cooking[i]||null;
                    const r=26;// radius
                    const remaining=dish?Math.max(0,Math.ceil((dish.startedAt+dish.timerMax*1000-now)/1000)):0;
                    const pct=dish&&dish.timerMax>0?Math.min(100,((dish.timerMax-remaining)/dish.timerMax)*100):0;
                    const almostDone=pct>80;
                    const burnerColor=dish?(almostDone?"#4ade80":"#f97316"):"#3a2e24";
                    const circumference=2*Math.PI*r;
                    return(
                      <g key={i}>
                        {/* Glow */}
                        {dish&&(
                          <circle cx={cx} cy={cy} r={r+8} fill={burnerColor} opacity="0.06">
                            <animate attributeName="opacity" values="0.06;0.14;0.06"
                              dur={almostDone?"0.7s":"1.5s"} repeatCount="indefinite"/>
                          </circle>
                        )}
                        {/* Outer ring */}
                        <circle cx={cx} cy={cy} r={r} fill="#2a2018"
                          stroke={burnerColor} strokeWidth={dish?1.5:1}/>
                        {/* Inner rings */}
                        <circle cx={cx} cy={cy} r={r*0.72} fill="none" stroke="#3a2e24" strokeWidth="1"/>
                        <circle cx={cx} cy={cy} r={r*0.44} fill="none" stroke="#3a2e24" strokeWidth="1"/>
                        {/* Flames */}
                        {dish&&[0,72,144,216,288].map((angle,fi)=>{
                          const rad=(angle*Math.PI)/180;
                          return(
                            <ellipse key={fi}
                              cx={cx+r*0.62*Math.cos(rad)} cy={cy+r*0.62*Math.sin(rad)}
                              rx="2" ry="3.5" fill={almostDone?"#4ade80":"#f97316"} opacity="0.8">
                              <animate attributeName="ry" values="3.5;5;3.5"
                                dur={`${0.35+fi*0.07}s`} repeatCount="indefinite"/>
                              <animate attributeName="opacity" values="0.8;0.3;0.8"
                                dur={`${0.4+fi*0.06}s`} repeatCount="indefinite"/>
                            </ellipse>
                          );
                        })}
                        {/* Empty indicator */}
                        {!dish&&<text x={cx} y={cy+4} textAnchor="middle" fontSize="12"
                          fill="#4a3c2c" fontFamily="sans-serif" opacity="0.4">○</text>}
                        {/* Progress arc */}
                        {dish&&(
                          <circle cx={cx} cy={cy} r={r}
                            fill="none"
                            stroke={almostDone?"#4ade80":pct>50?"#fbbf24":"#f97316"}
                            strokeWidth="3"
                            strokeDasharray={circumference}
                            strokeDashoffset={circumference*(1-pct/100)}
                            strokeLinecap="round"
                            transform={`rotate(-90 ${cx} ${cy})`}
                            opacity="0.9"/>
                        )}
                        {/* Steam */}
                        {dish&&almostDone&&[cx-5,cx+5].map((sx,si)=>(
                          <line key={si} x1={sx} y1={cy-r-4} x2={sx+2} y2={cy-r-11}
                            stroke="#94a3b8" strokeWidth="1.2" strokeLinecap="round" opacity="0.5">
                            <animate attributeName="opacity" values="0.5;0;0.5" dur={`${0.7+si*0.2}s`} repeatCount="indefinite"/>
                          </line>
                        ))}
                        {/* Feu label */}
                        <text x={cx} y={cy+r+10} textAnchor="middle" fontSize="7"
                          fill={dish?"#8a7a6a":"#3a3028"} fontFamily="sans-serif">
                          {tl("kitchen.burner")} {i+1}
                        </text>
                        {/* Dish name */}
                        {dish&&<text x={cx} y={cy-3} textAnchor="middle" fontSize="7"
                          fill={almostDone?"#4ade80":"#fbbf24"} fontFamily="sans-serif" fontWeight="700">
                          {dish.name.length>10?dish.name.slice(0,9)+"…":dish.name}
                        </text>}
                        {/* Timer */}
                        {dish&&<text x={cx} y={cy+7} textAnchor="middle" fontSize="8"
                          fill={almostDone?"#4ade80":"#f97316"} fontFamily="sans-serif" fontWeight="800">
                          {remaining>=60?`${Math.floor(remaining/60)}m${String(remaining%60).padStart(2,"0")}s`:remaining+"s"}
                        </text>}
                      </g>
                    );
                  })}
                </svg>
              </div>
            );
          })()}
        </div>

        {/* ── COL 3 : Prêts à servir ── */}
        <div style={{minWidth:0}}>
          <div style={{fontSize:12,fontWeight:700,color:C.green,fontFamily:F.title,marginBottom:8,
            display:"flex",alignItems:"center",gap:6}}>
            <span>✅</span>
            <span style={{whiteSpace:"nowrap"}}>{tl("kitchen.readyDishes")} ({kitchen.done.length})</span>
          </div>

          {Object.keys(doneByTable).length===0&&(
            <div style={{background:C.card,border:`1px dashed ${C.border}`,borderRadius:9,
              padding:14,textAlign:"center",color:C.muted,fontSize:11,fontStyle:"italic",fontFamily:F.body}}>
              {tl("kitchen.noReadyDishes")}
            </div>
          )}

          <div style={{display:"flex",flexDirection:"column",gap:8,maxHeight:420,overflowY:"auto"}}>
            {Object.values(doneByTable).map(tbl=>{
              const ready=canServeTable(tbl.tableId);
              return(
                <div key={tbl.tableId} style={{
                  background:ready?"linear-gradient(135deg,#f0fdf4,#e8f5e9)":C.amberP,
                  border:`1.5px solid ${ready?C.green:C.amber}44`,borderRadius:11,overflow:"hidden",
                  boxShadow:ready?`0 3px 12px ${C.green}18`:"none",
                  animation:ready?"popIn 0.4s ease":undefined}}>
                  <div style={{padding:"7px 10px",background:ready?C.green+"14":C.amber+"14",
                    borderBottom:`1px solid ${ready?C.green:C.amber}22`,
                    display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div>
                      <div style={{fontSize:11,fontWeight:700,color:C.ink,fontFamily:F.body,whiteSpace:"nowrap"}}>{tbl.tableName}</div>
                      <div style={{fontSize:9,color:C.muted,fontFamily:F.body}}>{tbl.dishes.length} {tl("kitchen.dishes")}</div>
                    </div>
                    {ready?(
                      <div style={{display:"flex",flexDirection:"column",gap:3,alignItems:"flex-end"}}>
                        <span style={{fontSize:8,fontWeight:800,color:C.green,background:C.green+"18",
                          borderRadius:20,padding:"1px 6px",animation:"pulse 1.5s infinite"}}>
                          ✦ PRÊT
                        </span>
                        {freeSrvForServing?(
                          <Btn v="primary" sm onClick={()=>serveTable(tbl.tableId,tbl.tableName)}>
                            {tl("kitchen.serve")}
                          </Btn>
                        ):(
                          <div style={{fontSize:9,color:C.muted,fontFamily:F.body,
                            background:C.border,borderRadius:6,padding:"4px 8px",
                            opacity:0.7,whiteSpace:"nowrap"}}>
                            {tl("kitchen.noServer")}
                          </div>
                        )}
                      </div>
                    ):(
                      <span style={{fontSize:10,color:C.amber,fontFamily:F.body,fontWeight:600}}>⏳</span>
                    )}
                  </div>
                  <div style={{padding:"6px 10px",display:"flex",flexWrap:"wrap",gap:3}}>
                    {tbl.dishes.map((d,i)=>(
                      <span key={i} style={{fontSize:9,background:C.surface,border:`1px solid ${C.green}33`,
                        borderRadius:4,padding:"1px 6px",fontFamily:F.body,color:C.ink}}>
                        ✓{d.name.length>12?d.name.slice(0,11)+"…":d.name}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Améliorations cuisine — bande compacte ── */}
      <div>
        <div style={{fontSize:13,fontWeight:700,color:C.ink,fontFamily:F.title,
          marginBottom:10,display:"flex",alignItems:"center",gap:7}}>
          🔧 {tl("kitchen.upgrades")}
        </div>
        <div style={{display:"grid",gridTemplateColumns:bp.isMobile?"1fr 1fr":"repeat(auto-fill,minmax(200px,1fr))",gap:bp.isMobile?8:10}}>
          {KITCHEN_UPGRADES.map(upItem=>{
            const isLocked=restoLvN<(upItem.minRestoLevel||0);
            const curLv=upg[upItem.id]||0;
            const maxLv=upItem.levels.length;
            const nextLv=upItem.levels[curLv]||null;
            const isMax=curLv>=maxLv;
            const canAfford=nextLv&&cash>=nextLv.cost;
            const activeBonuses=upItem.levels.slice(0,curLv).map(l=>{
              if(l.bonus.slots) return `+${l.bonus.slots} feu`;
              if(l.bonus.speed) return `−${Math.round(l.bonus.speed*100)}% cuisson`;
              if(l.bonus.storage) return `Stock ×${1+upItem.levels.slice(0,curLv).reduce((s,x)=>s+(x.bonus.storage||0),0)}`;
              if(l.bonus.clean) return `Nettoyage −${l.bonus.clean}s`;
              return "";
            }).filter(Boolean);

            if(isLocked){
              return(
                <div key={upItem.id} style={{
                  background:C.card,opacity:0.55,
                  border:`1.5px dashed ${C.border}`,
                  borderRadius:12,padding:12,position:"relative"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:7}}>
                    <span style={{fontSize:20,filter:"grayscale(1)"}}>{upItem.icon}</span>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12,fontWeight:700,color:C.muted,fontFamily:F.body,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{upItem.name}</div>
                    </div>
                  </div>
                  <div style={{fontSize:10,color:C.muted,fontFamily:F.body}}>{upItem.desc}</div>
                  <div style={{marginTop:7,fontSize:10,fontWeight:700,color:C.terra,fontFamily:F.body}}>
                    {tl("kitchen.lockedUpgrade",{n:upItem.minRestoLevel})}
                  </div>
                </div>
              );
            }

            return(
              <div key={upItem.id} style={{
                background:isMax?C.greenP:C.card,
                border:`1.5px solid ${isMax?C.green:C.border}`,
                borderRadius:12,padding:12}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:7}}>
                  <span style={{fontSize:20}}>{upItem.icon}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:700,color:C.ink,fontFamily:F.body,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{upItem.name}</div>
                  </div>
                </div>
                <div style={{display:"flex",gap:3,marginBottom:7}}>
                  {upItem.levels.map((_,i)=>(
                    <div key={i} style={{flex:1,height:3,borderRadius:3,
                      background:i<curLv?C.green:C.border}}/>
                  ))}
                </div>
                {activeBonuses.length>0&&(
                  <div style={{fontSize:9,color:C.green,fontFamily:F.body,fontWeight:600,marginBottom:6}}>
                    ✓ {activeBonuses.join(" · ")}
                  </div>
                )}
                {isMax?(
                  <div style={{fontSize:10,color:C.green,fontWeight:700,fontFamily:F.body}}>✅ Max</div>
                ):(
                  <div>
                    <div style={{fontSize:10,color:C.muted,fontFamily:F.body,marginBottom:5}}>{nextLv.label}</div>
                    <Btn v={canAfford?"amber":"disabled"} sm
                      onClick={()=>{
                        if(!canAfford)return;
                        const newUpg={...upg,[upItem.id]:curLv+1};
                        setKitchen(k=>({...k,upgrades:newUpg}));
                        setCash(p=>+(p-nextLv.cost).toFixed(2));
                        addTx("dépense",`Amélioration cuisine : ${upItem.name} N${curLv+1}`,nextLv.cost);
                        addToast({icon:upItem.icon,title:`${upItem.name} N${curLv+1}`,
                          msg:nextLv.label,color:C.amber,tab:"cuisine",silent:true});
                      }}>
                      💰 {nextLv.cost}€
                    </Btn>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}