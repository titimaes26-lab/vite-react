import { useState, useEffect, useRef, useMemo } from "react";
import { useLang } from "../../i18n/index.jsx";
import { C, CHEF_LVL, KITCHEN_UPGRADES, CHEF_TRAININGS } from "../../constants/gameData.js";
import { chefLv, CHEF_MAX_XP } from "../../utils/levelUtils.js";
import { consumeStock } from "../../utils/orderUtils.js";
import { isOnShift } from "../../hooks/useGameClock.js";

export function useKitchenView({ kitchen, setKitchen, stock, setStock, setTables, servers, setServers, addToast, gameTime }) {
  const { t: tl } = useLang();
  const chf = kitchen.chef;
  const cl = chefLv(chf.totalXp);
  const clD = CHEF_LVL[Math.min(cl.l, CHEF_LVL.length-1)];
  const unlockedCommis = clD.commis;

  const upg = {fourneau:0,four:0,stockage:0,plonge:0,salamandre:0,dressage:0,sousvide:0,brigade:0,...(kitchen.upgrades||{})};
  const slotSources = ["fourneau","dressage","brigade"];
  const speedSources = ["four","salamandre","sousvide"];
  const extraSlots = slotSources.reduce((tot,id)=>{
    const item = KITCHEN_UPGRADES.find(u=>u.id===id);
    return tot+(item?item.levels.slice(0,upg[id]).reduce((s,l)=>s+(l.bonus.slots||0),0):0);
  },0);
  const speedBonus = speedSources.reduce((tot,id)=>{
    const item = KITCHEN_UPGRADES.find(u=>u.id===id);
    return tot+(item?item.levels.slice(0,upg[id]).reduce((s,l)=>s+(l.bonus.speed||0),0):0);
  },0);

  const morale = kitchen.morale??100;
  const moraleMult = morale>=70?1.10:morale<30?0.85:1.0;
  const activeCommisArr = kitchen.commis
    .filter((_,i) => i < unlockedCommis)
    .filter(c => !c.shift || isOnShift(c.shift, gameTime?.absMin ?? 0));
  const specBonus = (cat)=>activeCommisArr.filter(c=>c.specialty?.cat===cat).reduce((s,c)=>s+(c.specialty?.bonus||0),0);
  const trainingBonus = (cat)=>{
    const t = kitchen.chefTrainings||{};
    const pt = CHEF_TRAININGS.find(x=>x.id==="pastry");
    const st = CHEF_TRAININGS.find(x=>x.id==="sauces");
    let b = 0;
    if(t.pastry && pt?.catBonus?.cat===cat) b+=pt.catBonus.mult;
    if(t.sauces && st?.catBonus?.cat===cat) b+=st.catBonus.mult;
    return b;
  };
  const brigadeSlot = (kitchen.chefTrainings?.brigade&&kitchen.chefTrainings.brigadeUntil>Date.now())?1:0;
  const absMin = gameTime?.absMin ?? 0;
  const activeAdditionalChefs = (kitchen.chefs ?? []).filter(
    c => c.status === "actif" && isOnShift(c.shift, absMin)
  );
  const maxConcurrent = 4+unlockedCommis+extraSlots+brigadeSlot+activeAdditionalChefs.length;
  const upgDishCookTime = (prepTime, chefSpeed, commisCount, cat="") =>
    Math.max(5, Math.round(prepTime/((chefSpeed+speedBonus)*(1+commisCount*0.15)*(1+activeAdditionalChefs.length*0.10)*moraleMult*(1+specBonus(cat)+trainingBonus(cat)))));

  const [now, setNow] = useState(Date.now());
  const [pianoCompact, setPianoCompact] = useState(()=>{
    try{return localStorage.getItem("pianoCompact")==="1";}catch{return false;}
  });
  const togglePiano = ()=>setPianoCompact(v=>{
    try{localStorage.setItem("pianoCompact",v?"0":"1");}catch{}
    return !v;
  });
  useEffect(()=>{
    const iv = setInterval(()=>setNow(Date.now()),250);
    return()=>clearInterval(iv);
  },[]);

  useEffect(()=>{
    const iv = setInterval(()=>{
      const t = Date.now();
      setKitchen(k=>{
        const justDone = k.cooking.filter(d=>t>=d.startedAt+d.timerMax*1000);
        if(justDone.length===0)return k;
        const stillCooking = k.cooking.filter(d=>t<d.startedAt+d.timerMax*1000);
        const xpPerDish = 12;
        const activeCommis = k.commis.filter(c=>c.status==="actif").slice(0,unlockedCommis);
        const activeChefs = (k.chefs??[]).filter(c=>c.status==="actif");
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

  useEffect(()=>{
    const iv = setInterval(()=>{
      setKitchen(k=>{
        const q = k.queue.length;
        const delta = q>4?-2:q===0?+1:0;
        if(delta===0)return k;
        return{...k,morale:Math.min(100,Math.max(0,(k.morale??100)+delta))};
      });
    },5000);
    return()=>clearInterval(iv);
  },[]);

  const prevChefLvRef = useRef(cl.l);
  useEffect(()=>{
    if(cl.l>prevChefLvRef.current){
      const d = CHEF_LVL[Math.min(cl.l,CHEF_LVL.length-1)];
      addToast({icon:"👨‍🍳",title:tl("kitchen.chefLvl",{l:cl.l}),
        msg:`${chf.name} → ${d.name}`,color:C.purple,tab:"cuisine",silent:true});
      const prevCommis = CHEF_LVL[Math.min(prevChefLvRef.current,CHEF_LVL.length-1)].commis;
      if(d.commis>prevCommis){
        addToast({icon:"👥",title:tl("kitchen.newSlot"),
          msg:tl("kitchen.newSlotMsg",{n:d.commis}),
          color:C.green,tab:"cuisine",silent:true});
      }
    }
    prevChefLvRef.current = cl.l;
  },[cl.l]);

  const chefOnShift = isOnShift(kitchen.chef?.shift, absMin) || activeAdditionalChefs.length > 0;

  const startDish = (dish)=>{
    if(!chefOnShift)return;
    if(kitchen.cooking.length>=maxConcurrent)return;
    const ct = upgDishCookTime(dish.prepTime||60,clD.speed,unlockedCommis,dish.cat||"");
    let blocked = false;
    setStock(s=>{
      const{newStock,missing} = consumeStock([dish],s);
      if(missing.length>0){
        blocked = true;
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

  const startAll = ()=>{
    if(!chefOnShift)return;
    const slots = maxConcurrent-kitchen.cooking.length;
    if(slots<=0)return;
    const toStart = kitchen.queue.slice(0,slots);
    if(toStart.length===0)return;
    const ts = Date.now();
    setStock(s=>{
      const{newStock,missing} = consumeStock(toStart,s);
      if(missing.length>0){
        missing.forEach(m=>addToast({icon:"⚠️",title:tl("kitchen.noStock"),
          msg:tl("kitchen.noStockMsg",{item:m.ing}),
          color:C.red,tab:"stock"}));
      }
      return newStock;
    });
    setKitchen(k=>{
      const stillInQueue = toStart.filter(d=>k.queue.some(q=>q.id===d.id));
      if(stillInQueue.length===0)return k;
      return {
        ...k,
        queue:k.queue.filter(d=>!stillInQueue.find(x=>x.id===d.id)),
        cooking:[...k.cooking,...stillInQueue.map(d=>({
          ...d,
          startedAt:ts,
          timerMax:upgDishCookTime(d.prepTime||60,clD.speed,unlockedCommis,d.cat||""),
        }))],
      };
    });
  };

  const freeSrvForServing = servers.find(s=>s.status==="actif"&&(s.moral??100)>10);

  const serveTable = (tableId)=>{
    if(!freeSrvForServing)return;
    const dishes = kitchen.done.filter(d=>d.tableId===tableId);
    if(dishes.length===0)return;
    const maxPrep = Math.max(...dishes.map(d=>d.prepTime||60),60);
    const eatSec = Math.round(maxPrep*(2/3));
    setKitchen(k=>({...k,done:k.done.filter(d=>d.tableId!==tableId)}));
    setTables(p=>p.map(t=>t.id!==tableId?t:{...t,status:"mange",eatUntil:Date.now()+eatSec*1000,eatDur:eatSec}));
    if(setServers) setServers(p=>{
      const srv = p.find(s=>s.status==="actif"&&(s.moral??100)>10);
      if(!srv)return p;
      return p.map(s=>s.id!==srv.id?s:{...s,status:"service",serviceUntil:Date.now()+20000});
    });
  };

  const doneByTable = useMemo(()=>{
    const m = {};
    kitchen.done.forEach(d=>{
      const key = d.tableId||"sans-table";
      if(!m[key])m[key]={tableId:d.tableId,tableName:d.tableName||"Sans table",dishes:[]};
      m[key].dishes.push(d);
    });
    return m;
  },[kitchen.done]);

  const queueByTable = useMemo(()=>{
    const m = {};
    kitchen.queue.forEach(d=>{
      const key = d.tableId||"sans-table";
      if(!m[key])m[key]={tableId:d.tableId,tableName:d.tableName||"Sans table",dishes:[]};
      m[key].dishes.push(d);
    });
    return m;
  },[kitchen.queue]);

  const canServeTable = (tableId)=>{
    const inQ = kitchen.queue.filter(d=>d.tableId===tableId).length;
    const inC = kitchen.cooking.filter(d=>d.tableId===tableId).length;
    return inQ===0&&inC===0;
  };

  const slotsLeft = maxConcurrent-kitchen.cooking.length;

  const moveTicket = (tableId, dir)=>{
    setKitchen(k=>{
      const groups = Object.values(k.queue.reduce((acc,d)=>{
        const key = d.tableId||"nt";
        if(!acc[key])acc[key]=[];
        acc[key].push(d);
        return acc;
      },{}));
      const idx = groups.findIndex(g=>g[0].tableId===tableId);
      const next = idx+dir;
      if(next<0||next>=groups.length)return k;
      [groups[idx],groups[next]]=[groups[next],groups[idx]];
      return{...k,queue:groups.flat()};
    });
  };

  return {
    cl, clD, unlockedCommis, maxConcurrent, upgDishCookTime, upg,
    now, pianoCompact, togglePiano,
    chefOnShift, freeSrvForServing,
    startDish, startAll, serveTable, moveTicket,
    doneByTable, queueByTable, canServeTable, slotsLeft,
  };
}
