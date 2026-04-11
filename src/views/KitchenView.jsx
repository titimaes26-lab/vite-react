/* ═══════════════════════════════════════════════════════
   src/views/KitchenView.jsx
   Extrait du monolithe restaurant-manager.jsx
   Dépendances déclarées dans les imports ci-dessous.
═══════════════════════════════════════════════════════ */
import { useState, useEffect, useRef } from "react";
import { C, F, CHEF_LVL, CHEF_XP_CAP, COMMIS_LVL, COMMIS_XP_CAP,
         KITCHEN_UPGRADES, COMMIS_SPECIALTIES, CHEF_TRAININGS } from "../constants/gameData.js";
import { Btn, XpBar, Badge } from "../components/ui/index.js";
import { chefLv, commisLv, dishCookTimeWithUpgrades, CHEF_MAX_XP, COMMIS_MAX_XP } from "../utils/levelUtils.js";

export function KitchenView({kitchen,setKitchen,stock,setStock,tables,setTables,servers=[],setServers,addToast,cash,setCash,addTx,restoLvN=0,commisPool=[],setCommisPool=()=>{},commisPoolDate="",setCommisPoolDate=()=>{},bp={}}){
  const chf=kitchen.chef;
  const cl=chefLv(chf.totalXp);
  const clD=CHEF_LVL[Math.min(cl.l,CHEF_LVL.length-1)];
  const unlockedCommis=clD.commis;

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

  const maxConcurrent=4+unlockedCommis+extraSlots+brigadeSlot;

  const upgDishCookTime=(prepTime,chefSpeed,commisCount,cat="")=>
    Math.max(5,Math.round(prepTime/((chefSpeed+speedBonus)*(1+commisCount*0.15)*moraleMult*(1+specBonus(cat)+trainingBonus(cat)))));

  const catColors={Entrées:C.green,Plats:C.terra,Desserts:C.purple,Boissons:C.navy};

  // Live clock for rendering (independent of logic intervals)
  const [now,setNow]=useState(Date.now());
  const [chefSalaryEdit,setChefSalaryEdit]=useState(false);
  const [chefSalaryVal,setChefSalaryVal]=useState(String(kitchen.chef.salary||28));
  const [chefModal,setChefModal]=useState(false);   // false | "train" | "replace"
  const [commisHireSlot,setCommisHireSlot]=useState(null); // null | slotIndex

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
        s=s.map(x=>x.id===ing.stockId?{...x,qty:Math.max(0,+(x.qty-ing.qty).toFixed(3))}:x);
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
        return {
          ...k,
          chef:{...k.chef,totalXp:Math.min(CHEF_MAX_XP,k.chef.totalXp+justDone.length*xpPerDish)},
          commis:k.commis.map(c=>
            activeCommis.find(a=>a.id===c.id)
              ?{...c,totalXp:Math.min(COMMIS_MAX_XP,c.totalXp+Math.round(xpPerDish*0.4))}
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

  // Chef level-up toast
  useEffect(()=>{
    const cl2=chefLv(kitchen.chef.totalXp);
    if(cl2.l>0&&cl2.r<12){
      const d=CHEF_LVL[Math.min(cl2.l,CHEF_LVL.length-1)];
      addToast({icon:"👨‍🍳",title:`Chef niveau ${cl2.l} !`,
        msg:`${kitchen.chef.name} → ${d.name}`,color:C.purple,tab:"cuisine"});
    }
  },[chefLv(kitchen.chef.totalXp).l]);

  // Start one dish
  const startDish=(dish)=>{
    if(kitchen.cooking.length>=maxConcurrent)return;
    const ct=upgDishCookTime(dish.prepTime||60,clD.speed,unlockedCommis,dish.cat||"");
    let blocked=false;
    setStock(s=>{
      const{newStock,missing}=consumeStock([dish],s);
      if(missing.length>0){
        blocked=true;
        missing.forEach(m=>addToast({icon:"⚠️",title:"Stock insuffisant !",
          msg:`${m.dish} : manque ${m.ing} (${m.have.toFixed(2)}/${m.need.toFixed(2)})`,
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
    addToast({icon:"🔥",title:"Cuisson démarrée",
      msg:`${dish.name}${dish.tableName?" · "+dish.tableName:""}`,color:C.terra,tab:"cuisine"});
  };

  // Start all dishes filling free slots
  const startAll=()=>{
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
    addToast({icon:"🍽",title:"Plats servis !",
      msg:`${tableName} · ${freeSrvForServing.name} apporte les plats`,color:C.green,tab:"tables"});
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

  // ── Générateurs de candidats ─────────────────────────
  const buildCommisPool = (dateStr)=>{
    let seed=dateStr.split("").reduce((a,c)=>a+c.charCodeAt(0),0)+31;
    const rng=()=>{seed=(seed*9301+49297)%233280;return seed/233280;};
    const names1=["Ambre","Baptiste","Chloé","Dylan","Emma","Florian","Gaëlle","Hugo","Inès","Jules","Léa","Maxime","Nina","Oscar","Pauline","Robin","Sara","Théo"];
    const names2=["Martin","Dupont","Renard","Moreau","Simon","Laurent","Petit","Bernard","Thomas"];
    return Array.from({length:6},(_,i)=>{
      const spec=rng()<0.6?COMMIS_SPECIALTIES[Math.floor(rng()*COMMIS_SPECIALTIES.length)]:null;
      const xp=Math.round(rng()*150);
      const salary=Math.round(rng()*5+8);
      return{
        id:`cp-${dateStr}-${i}`,
        name:names1[Math.floor(rng()*names1.length)]+" "+names2[Math.floor(rng()*names2.length)],
        totalXp:xp, salary, hireCost:salary*3,
        specialty:spec,
      };
    });
  };

  // Génère et stocke le pool quand le modal s'ouvre
  useEffect(()=>{
    if(commisHireSlot===null)return;
    const today=new Date().toLocaleDateString("fr-FR");
    if(commisPoolDate===today&&commisPool.length>0)return;
    const pool=buildCommisPool(today);
    setCommisPool(pool);
    setCommisPoolDate(today);
  },[commisHireSlot]);

  const generateChefCandidates = ()=>{
    const today=new Date().toLocaleDateString("fr-FR");
    let seed=today.split("").reduce((a,c)=>a+c.charCodeAt(0),0)+77;
    const rng=()=>{seed=(seed*9301+49297)%233280;return seed/233280;};
    const firstNames=["Antoine","Bernard","Claire","Didier","Elena","François","Gisèle","Henri","Isabelle","Jacques"];
    const lastNames=["Bourdin","Cauchet","Delarue","Ferrière","Gauthier","Homme","Joly","Kerner","Lafosse"];
    return Array.from({length:3},(_,i)=>{
      const lvl=Math.min(5,Math.floor(rng()*4));
      const xpBase=[0,120,380,830,1530,2230][lvl];
      const speed=CHEF_LVL[lvl]?.speed||1.0;
      const salary=Math.round(20+lvl*6+rng()*8);
      return{
        id:`cc-${today}-${i}`,
        name:firstNames[Math.floor(rng()*firstNames.length)]+" "+lastNames[Math.floor(rng()*lastNames.length)],
        totalXp:xpBase+Math.round(rng()*60),
        salary, hireCost:salary*8,
        lvl, speed,
        lvlName:CHEF_LVL[lvl]?.name||"Apprenti",
        lvlColor:CHEF_LVL[lvl]?.color||C.muted,
        lvlIcon:CHEF_LVL[lvl]?.icon||"👨‍🍳",
      };
    });
  };

  return(
    <div>
      {/* ── Chef + Commis — barre compacte ── */}
      <div style={{background:`linear-gradient(135deg,${clD.bg},${C.surface})`,
        border:`1.5px solid ${clD.color}33`,borderRadius:14,
        padding:bp.isMobile?"9px 12px":"10px 14px",
        marginBottom:10}}>
        <div style={{display:"flex",alignItems:"center",gap:bp.isMobile?8:12,flexWrap:"wrap"}}>
          {/* Avatar */}
          <div style={{width:44,height:44,background:clD.color+"22",border:`2px solid ${clD.color}44`,
            borderRadius:11,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>
            {clD.icon}
          </div>
          {/* Chef info */}
          <div style={{minWidth:0,flex:1}}>
            <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
              <span style={{fontSize:13,fontWeight:700,color:C.ink,fontFamily:F.title,whiteSpace:"nowrap"}}>{chf.name}</span>
              <Badge color={clD.color} bg={clD.bg} sm>{clD.name} N{cl.l}</Badge>
              <span style={{fontSize:10,color:clD.color,fontWeight:600,fontFamily:F.body,whiteSpace:"nowrap"}}>
                ⚡×{clD.speed} · {slotsLeft}/{maxConcurrent} feux · 🍽{kitchen.totalDishes}
              </span>
            </div>
            <div style={{marginTop:4,display:"flex",alignItems:"center",gap:6}}>
              <div style={{flex:1,minWidth:80}}>
                <XpBar xp={cl.r} needed={cl.n} color={clD.color} h={5}/>
              </div>
              <span style={{fontSize:9,color:C.muted,fontFamily:F.body,whiteSpace:"nowrap"}}>{cl.r}/{cl.n} XP</span>
            </div>
          </div>
          {/* Chef action buttons */}
          <div style={{display:"flex",gap:5,flexShrink:0}}>
            <button onClick={()=>setChefModal("train")} style={{
              fontSize:10,fontWeight:700,fontFamily:F.body,cursor:"pointer",
              padding:"5px 10px",borderRadius:7,border:`1.5px solid ${C.navy}44`,
              background:C.navyP,color:C.navy}}>📚 Former</button>
            <button onClick={()=>setChefModal("replace")} style={{
              fontSize:10,fontWeight:700,fontFamily:F.body,cursor:"pointer",
              padding:"5px 10px",borderRadius:7,border:`1.5px solid ${C.red}33`,
              background:C.redP,color:C.red}}>🔄 Remplacer</button>
          </div>
        </div>

        {/* Morale brigade */}
        <div style={{marginTop:9,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
          <span style={{fontSize:12}}>{moraleIcon}</span>
          <span style={{fontSize:10,fontWeight:700,color:moraleColor,fontFamily:F.body,minWidth:58}}>
            Moral {morale}%
          </span>
          <div style={{flex:1,minWidth:80,height:5,background:C.border,borderRadius:99,overflow:"hidden"}}>
            <div style={{height:"100%",width:`${morale}%`,background:moraleColor,borderRadius:99,transition:"width 0.5s"}}/>
          </div>
          {morale<60&&(
            <button onClick={()=>{
              const cost=150;
              if(cash<cost)return;
              setCash(c=>+(c-cost).toFixed(2));
              addTx("dépense","Prime brigade",cost);
              setKitchen(k=>({...k,morale:Math.min(100,(k.morale??100)+30)}));
              addToast({icon:"🎉",title:"Brigade motivée !",msg:"Moral +30% · −150€",color:C.green,tab:"cuisine"});
            }} style={{
              fontSize:10,fontWeight:700,fontFamily:F.body,cursor:cash>=150?"pointer":"not-allowed",
              padding:"3px 9px",borderRadius:6,border:`1.5px solid ${C.amber}44`,
              background:C.amberP,color:cash>=150?C.amber:C.muted,opacity:cash>=150?1:0.5}}>
              💸 Prime 150€
            </button>
          )}
          {morale>=70&&<span style={{fontSize:9,color:C.green,fontFamily:F.body,fontWeight:600}}>⚡+10% vitesse</span>}
          {morale<30&&<span style={{fontSize:9,color:C.red,fontFamily:F.body,fontWeight:600}}>⚠️−15% vitesse</span>}
        </div>

        {/* Commis inline */}
        <div style={{marginTop:9,display:"flex",gap:5,flexWrap:"wrap"}}>
          {kitchen.commis.map((cm,idx)=>{
            const locked=idx>=unlockedCommis;
            const cml=commisLv(cm.totalXp);
            const cmlD=COMMIS_LVL[Math.min(cml.l,COMMIS_LVL.length-1)];
            const isEmpty=!cm.name;
            return(
              <div key={cm.id} style={{
                background:locked?C.bg:cmlD.color+"12",
                border:`1px solid ${locked?C.border:cmlD.color+"33"}`,
                borderRadius:8,padding:"5px 9px",opacity:locked?0.4:1,
                display:"flex",gap:5,alignItems:"center",cursor:!locked&&!isEmpty?"default":"pointer"}}
                onClick={!locked&&isEmpty?()=>setCommisHireSlot(idx):undefined}>
                <span style={{fontSize:14}}>{locked?"🔒":cmlD.icon}</span>
                <div>
                  <div style={{fontSize:10,fontWeight:600,color:C.ink,fontFamily:F.body,whiteSpace:"nowrap"}}>{cm.name}</div>
                  {!locked&&<div style={{fontSize:9,color:C.muted,fontFamily:F.body,display:"flex",gap:4,alignItems:"center"}}>
                    <span>{cmlD.name}</span>
                    {cm.specialty&&<span style={{background:cm.specialty.cat==="Desserts"?C.purpleP:cm.specialty.cat==="Plats"?C.terraP:cm.specialty.cat==="Entrées"?C.greenP:C.navyP,
                      color:cm.specialty.cat==="Desserts"?C.purple:cm.specialty.cat==="Plats"?C.terra:cm.specialty.cat==="Entrées"?C.green:C.navy,
                      borderRadius:4,padding:"0 4px",fontSize:8,fontWeight:700}}>
                      {cm.specialty.icon} {cm.specialty.name}
                    </span>}
                  </div>}
                </div>
                {!locked&&<button onClick={(e)=>{e.stopPropagation();setCommisHireSlot(idx);}} style={{
                  fontSize:9,padding:"2px 6px",borderRadius:5,cursor:"pointer",border:`1px solid ${C.border}`,
                  background:C.bg,color:C.muted,fontFamily:F.body}}>↺</button>}
              </div>
            );
          })}
          {/* Bouton embauche si slot chef disponible mais commis manquant */}
          {kitchen.commis.length<unlockedCommis&&(
            <button onClick={()=>setCommisHireSlot(kitchen.commis.length)} style={{
              fontSize:10,fontWeight:700,fontFamily:F.body,cursor:"pointer",
              padding:"5px 10px",borderRadius:8,border:`1.5px dashed ${C.green}`,
              background:C.greenP,color:C.green}}>+ Embaucher commis</button>
          )}
        </div>
      </div>

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
                    Commandes ({kitchen.queue.length})
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
                  <Btn sm v="terra" onClick={startAll}>▶ Tout</Btn>
                )}
              </div>
            );
          })()}

          <div style={{display:"flex",flexDirection:"column",gap:7,maxHeight:420,overflowY:"auto"}}>
            {kitchen.queue.length===0&&(
              <div style={{background:C.card,border:`1px dashed ${C.border}`,borderRadius:9,
                padding:14,textAlign:"center",color:C.muted,fontSize:11,fontStyle:"italic",fontFamily:F.body}}>
                🍽 Les commandes arriveront ici
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
                Piano ({kitchen.cooking.length}/{maxConcurrent})
              </span>
            </div>
            <span style={{fontSize:9,background:slotsLeft>0?C.greenP:C.redP,
              color:slotsLeft>0?C.green:C.red,border:`1px solid ${slotsLeft>0?C.green:C.red}33`,
              borderRadius:20,padding:"2px 7px",fontFamily:F.body,fontWeight:700,whiteSpace:"nowrap"}}>
              {slotsLeft>0?`${slotsLeft} libres`:"Complet"}
            </span>
          </div>

          {(()=>{
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
                    {kitchen.totalDishes} plats
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
                          Feu {i+1}
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
            <span style={{whiteSpace:"nowrap"}}>Prêts ({kitchen.done.length})</span>
          </div>

          {Object.keys(doneByTable).length===0&&(
            <div style={{background:C.card,border:`1px dashed ${C.border}`,borderRadius:9,
              padding:14,textAlign:"center",color:C.muted,fontSize:11,fontStyle:"italic",fontFamily:F.body}}>
              🍽 Les plats terminés apparaîtront ici
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
                      <div style={{fontSize:9,color:C.muted,fontFamily:F.body}}>{tbl.dishes.length} plat{tbl.dishes.length>1?"s":""}</div>
                    </div>
                    {ready?(
                      <div style={{display:"flex",flexDirection:"column",gap:3,alignItems:"flex-end"}}>
                        <span style={{fontSize:8,fontWeight:800,color:C.green,background:C.green+"18",
                          borderRadius:20,padding:"1px 6px",animation:"pulse 1.5s infinite"}}>
                          ✦ PRÊT
                        </span>
                        {freeSrvForServing?(
                          <Btn v="primary" sm onClick={()=>serveTable(tbl.tableId,tbl.tableName)} icon="🍽">
                            Servir
                          </Btn>
                        ):(
                          <div style={{fontSize:9,color:C.muted,fontFamily:F.body,
                            background:C.border,borderRadius:6,padding:"4px 8px",
                            opacity:0.7,whiteSpace:"nowrap"}}>
                            🚫 Pas de serveur
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
          🔧 Améliorations
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
                    🔒 Disponible au niveau {upItem.minRestoLevel}
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
                          msg:nextLv.label,color:C.amber,tab:"cuisine"});
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

      {/* ══ MODAL : Formation chef ══ */}
      {chefModal==="train"&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center"}}
          onClick={()=>setChefModal(false)}>
          <div style={{background:C.card,borderRadius:16,padding:24,maxWidth:380,width:"90%",boxShadow:"0 8px 40px rgba(0,0,0,0.25)"}}
            onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:14,fontWeight:800,color:C.ink,fontFamily:F.title,marginBottom:16,display:"flex",justifyContent:"space-between"}}>
              📚 Formation chef — {chf.name}
              <button onClick={()=>setChefModal(false)} style={{background:"none",border:"none",cursor:"pointer",fontSize:18,color:C.muted}}>✕</button>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {CHEF_TRAININGS.map(tr=>{
                const done=!!(kitchen.chefTrainings||{})[tr.id];
                const canAfford=cash>=tr.cost;
                return(
                  <div key={tr.id} style={{background:done?C.greenP:C.bg,border:`1.5px solid ${done?C.green:C.border}`,borderRadius:11,padding:"10px 14px",
                    display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}>
                    <div>
                      <div style={{fontSize:12,fontWeight:700,color:C.ink,fontFamily:F.body}}>{tr.icon} {tr.name}</div>
                      <div style={{fontSize:10,color:C.muted,fontFamily:F.body}}>{tr.desc}</div>
                      {tr.id==="brigade"&&done&&kitchen.chefTrainings.brigadeUntil&&(
                        <div style={{fontSize:9,color:C.amber,fontFamily:F.body}}>
                          ⏱ Expire : {new Date(kitchen.chefTrainings.brigadeUntil).toLocaleString("fr-FR",{hour:"2-digit",minute:"2-digit"})}
                        </div>
                      )}
                    </div>
                    {done&&tr.id!=="brigade"?(
                      <span style={{fontSize:10,color:C.green,fontWeight:700,fontFamily:F.body}}>✅</span>
                    ):(
                      <button disabled={!canAfford} onClick={()=>{
                        if(!canAfford)return;
                        setCash(c=>+(c-tr.cost).toFixed(2));
                        addTx("dépense",`Formation chef : ${tr.name}`,tr.cost);
                        setKitchen(k=>{
                          const t={...(k.chefTrainings||{}),[tr.id]:true};
                          if(tr.id==="brigade") t.brigadeUntil=Date.now()+72*3600*1000;
                          return{...k,
                            chef:{...k.chef,totalXp:Math.min(CHEF_MAX_XP,k.chef.totalXp+tr.xp)},
                            chefTrainings:t};
                        });
                        addToast({icon:tr.icon,title:`${tr.name} acquise !`,msg:`${tr.desc} · −${tr.cost}€`,color:C.navy,tab:"cuisine"});
                        if(tr.id!=="brigade") setChefModal(false);
                      }} style={{
                        fontSize:11,fontWeight:700,fontFamily:F.body,
                        padding:"5px 12px",borderRadius:8,
                        background:canAfford?C.navyP:"transparent",
                        color:canAfford?C.navy:C.muted,
                        border:`1.5px solid ${canAfford?C.navy:C.border}`,
                        cursor:canAfford?"pointer":"not-allowed"}}>
                        💰 {tr.cost}€
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL : Remplacer le chef ══ */}
      {chefModal==="replace"&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center"}}
          onClick={()=>setChefModal(false)}>
          <div style={{background:C.card,borderRadius:16,padding:24,maxWidth:420,width:"90%",boxShadow:"0 8px 40px rgba(0,0,0,0.25)"}}
            onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:14,fontWeight:800,color:C.ink,fontFamily:F.title,marginBottom:4,display:"flex",justifyContent:"space-between"}}>
              🔄 Remplacer {chf.name}
              <button onClick={()=>setChefModal(false)} style={{background:"none",border:"none",cursor:"pointer",fontSize:18,color:C.muted}}>✕</button>
            </div>
            <div style={{fontSize:10,color:C.muted,fontFamily:F.body,marginBottom:14}}>
              Le nouveau chef hérite de 30 % de l'XP actuel.
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {generateChefCandidates().map(cand=>{
                const canAfford=cash>=cand.hireCost;
                return(
                  <div key={cand.id} style={{background:C.bg,border:`1.5px solid ${cand.lvlColor}33`,borderRadius:11,padding:"10px 14px",
                    display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <span style={{fontSize:22}}>{cand.lvlIcon}</span>
                      <div>
                        <div style={{fontSize:12,fontWeight:700,color:C.ink,fontFamily:F.body}}>{cand.name}</div>
                        <div style={{fontSize:10,color:cand.lvlColor,fontFamily:F.body,fontWeight:600}}>
                          {cand.lvlName} · ⚡×{cand.speed} · {cand.salary}€/h
                        </div>
                      </div>
                    </div>
                    <button disabled={!canAfford} onClick={()=>{
                      if(!canAfford)return;
                      const transferXp=Math.round(chf.totalXp*0.3);
                      setCash(c=>+(c-cand.hireCost).toFixed(2));
                      addTx("achat",`Recrutement chef : ${cand.name}`,cand.hireCost);
                      setKitchen(k=>({...k,
                        chef:{...k.chef,name:cand.name,totalXp:cand.totalXp+transferXp,salary:cand.salary,status:"actif"},
                        chefTrainings:{},
                        morale:Math.min(100,(k.morale??100)+10),
                      }));
                      addToast({icon:"👨‍🍳",title:`${cand.name} recruté !`,msg:`−${cand.hireCost}€ · +${transferXp} XP transmis`,color:C.purple,tab:"cuisine"});
                      setChefModal(false);
                    }} style={{
                      fontSize:11,fontWeight:700,fontFamily:F.body,whiteSpace:"nowrap",
                      padding:"6px 12px",borderRadius:8,
                      background:canAfford?C.amberP:"transparent",
                      color:canAfford?C.amber:C.muted,
                      border:`1.5px solid ${canAfford?C.amber:C.border}`,
                      cursor:canAfford?"pointer":"not-allowed"}}>
                      💰 {cand.hireCost}€
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL : Embaucher un commis ══ */}
      {commisHireSlot!==null&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center"}}
          onClick={()=>setCommisHireSlot(null)}>
          <div style={{background:C.card,borderRadius:16,padding:24,maxWidth:400,width:"90%",boxShadow:"0 8px 40px rgba(0,0,0,0.25)"}}
            onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:14,fontWeight:800,color:C.ink,fontFamily:F.title,marginBottom:4,display:"flex",justifyContent:"space-between"}}>
              👨‍🍳 Embaucher un commis
              <button onClick={()=>setCommisHireSlot(null)} style={{background:"none",border:"none",cursor:"pointer",fontSize:18,color:C.muted}}>✕</button>
            </div>
            <div style={{fontSize:10,color:C.muted,fontFamily:F.body,marginBottom:14}}>Pool rafraîchi chaque jour.</div>
            {commisPool.length===0&&<div style={{color:C.muted,fontSize:11,fontFamily:F.body,textAlign:"center",padding:20}}>Aucun candidat disponible aujourd'hui.</div>}
            <div style={{display:"flex",flexDirection:"column",gap:9}}>
              {commisPool.map(cand=>{
                const canAfford=cash>=cand.hireCost;
                const cl2=commisLv(cand.totalXp);
                const clD2=COMMIS_LVL[Math.min(cl2.l,COMMIS_LVL.length-1)];
                return(
                  <div key={cand.id} style={{background:C.bg,border:`1.5px solid ${C.border}`,borderRadius:11,padding:"9px 13px",
                    display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}>
                    <div style={{display:"flex",alignItems:"center",gap:9}}>
                      <span style={{fontSize:18}}>{clD2.icon}</span>
                      <div>
                        <div style={{fontSize:12,fontWeight:700,color:C.ink,fontFamily:F.body}}>{cand.name}</div>
                        <div style={{fontSize:10,color:C.muted,fontFamily:F.body}}>
                          {clD2.name} · {cand.salary}€/h
                          {cand.specialty&&<span style={{marginLeft:6,fontWeight:700,color:cand.specialty.cat==="Desserts"?C.purple:cand.specialty.cat==="Plats"?C.terra:cand.specialty.cat==="Entrées"?C.green:C.navy}}>
                            {cand.specialty.icon} {cand.specialty.name}
                          </span>}
                        </div>
                      </div>
                    </div>
                    <button disabled={!canAfford} onClick={()=>{
                      if(!canAfford)return;
                      setCash(c=>+(c-cand.hireCost).toFixed(2));
                      addTx("achat",`Recrutement commis : ${cand.name}`,cand.hireCost);
                      setKitchen(k=>{
                        const slot=commisHireSlot;
                        const newCommis=[...k.commis];
                        const newEntry={id:Date.now(),name:cand.name,totalXp:cand.totalXp,status:"actif",task:null,salary:cand.salary,specialty:cand.specialty};
                        if(slot<newCommis.length) newCommis[slot]=newEntry;
                        else newCommis.push(newEntry);
                        return{...k,commis:newCommis};
                      });
                      setCommisPool(p=>p.filter(x=>x.id!==cand.id));
                      addToast({icon:"🔪",title:`${cand.name} recruté !`,msg:`−${cand.hireCost}€${cand.specialty?" · "+cand.specialty.icon+" "+cand.specialty.name:""}`,color:C.green,tab:"cuisine"});
                      setCommisHireSlot(null);
                    }} style={{
                      fontSize:11,fontWeight:700,fontFamily:F.body,whiteSpace:"nowrap",
                      padding:"5px 11px",borderRadius:8,
                      background:canAfford?C.greenP:"transparent",
                      color:canAfford?C.green:C.muted,
                      border:`1.5px solid ${canAfford?C.green:C.border}`,
                      cursor:canAfford?"pointer":"not-allowed"}}>
                      💰 {cand.hireCost}€
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}