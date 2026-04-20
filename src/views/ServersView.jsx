/* ═══════════════════════════════════════════════════════
   src/views/ServersView.jsx
   Extrait du monolithe restaurant-manager.jsx
   Dépendances déclarées dans les imports ci-dessous.
═══════════════════════════════════════════════════════ */
import { useState, useEffect } from "react";
import { C, F, SRV_LVL, RESTO_LVL, SERVER_SLOTS_BY_LEVEL, STAFF_QUALITY_REQ,
         CHEF_LVL, COMMIS_LVL, CHEF_TRAININGS, KITCHEN_UPGRADES, COMMIS_SPECIALTIES } from "../constants/gameData.js";
import { SRV_SPECIALTIES, TRAINING_CATALOG, pickSpecialty, getMaxMoral } from "../constants/serverConstants.js";
import { Badge, Card, Btn, Modal, Lbl, Inp, Sel, XpBar } from "../components/ui/index.js";
import { useLang } from "../i18n/index.jsx";
import { srvLv, srvTierCap, TIER_UNLOCK_LV, SRV_MAX_XP, chefLv, commisLv, CHEF_MAX_XP, COMMIS_MAX_XP } from "../utils/levelUtils.js";
import { rName } from "../utils/randomUtils.js";
/* ─── Helpers locaux ────────────────────────────────── */
const moralIcon   = (m) => m>=70?"😊":m>=40?"😐":m>=20?"😓":"💀";
const moralKey    = (m) => m>=70?"moralFine":m>=40?"moralTired":m>=20?"moralExhausted":"moralBurnout";
const moralColor  = (m) => m>=70 ? "#236b47" : m>=40 ? "#a86e08" : "#b83025";

// Plages XP, salaire et taux de spécialité des candidats selon le niveau resto
const _candidateXpRange  = (lv) => [[0,100],[80,350],[300,800],[700,1500],[1200,2500]][Math.min(Math.floor(lv/5),4)];
const _candidateSalRange = (lv) => [[10,13],[11,15],[13,17],[15,20],[18,25]][Math.min(Math.floor(lv/5),4)];
const _candidateSpecRate = (lv) => lv<5?0.10:lv<10?0.25:lv<20?0.40:0.60;




export function ServersView({servers,setServers,tables,clockNow,restoLvN,cash,setCash,addTx,addToast,candidatePool=[],setCandidatePool,candidateDate="",setCandidateDate,kitchen,setKitchen,commisPool=[],setCommisPool=()=>{},commisPoolDate="",setCommisPoolDate=()=>{},bp={}}){
  const { t: tr, lang } = useLang();

  /* ── État chef / commis ────────────────────────────── */
  const [chefModal,setChefModal]=useState(false);      // false | "train" | "replace"
  const [commisHireSlot,setCommisHireSlot]=useState(null);

  /* ── Valeurs dérivées cuisine (guard si kitchen absent) ── */
  const chf   = kitchen?.chef ?? {};
  const cl    = chefLv(chf.totalXp ?? 0);
  const clD   = CHEF_LVL[Math.min(cl.l, CHEF_LVL.length-1)];
  const unlockedCommis = clD?.commis ?? 0;
  const maxCommisSlots = Math.max(...CHEF_LVL.map(l=>l.commis));
  const brigMorale     = kitchen?.morale ?? 100;
  const brigMoraleColor= brigMorale>=70?C.green:brigMorale>=40?C.amber:C.red;
  const brigMoraleIcon = brigMorale>=70?"😊":brigMorale>=40?"😐":brigMorale<20?"💀":"😓";
  const upg = {fourneau:0,four:0,stockage:0,plonge:0,salamandre:0,dressage:0,sousvide:0,brigade:0,...(kitchen?.upgrades||{})};
  const extraSlots = ["fourneau","dressage","brigade"].reduce((tot,id)=>{
    const item=KITCHEN_UPGRADES.find(u=>u.id===id);
    return tot+(item?item.levels.slice(0,upg[id]).reduce((s,l)=>s+(l.bonus.slots||0),0):0);
  },0);
  const brigadeSlot = (kitchen?.chefTrainings?.brigade && kitchen?.chefTrainings?.brigadeUntil > Date.now())?1:0;
  const maxConcurrent = 4 + unlockedCommis + extraSlots + brigadeSlot;
  const slotsLeft     = maxConcurrent - (kitchen?.cooking?.length ?? 0);

  /* ── Générateurs de candidats ──────────────────────── */
  const buildCommisPool = (dateStr)=>{
    let seed=dateStr.split("").reduce((a,c)=>a+c.charCodeAt(0),0)+31;
    const rng=()=>{seed=(seed*9301+49297)%233280;return seed/233280;};
    const names1=["Ambre","Baptiste","Chloé","Dylan","Emma","Florian","Gaëlle","Hugo","Inès","Jules","Léa","Maxime","Nina","Oscar","Pauline","Robin","Sara","Théo"];
    const names2=["Martin","Dupont","Renard","Moreau","Simon","Laurent","Petit","Bernard","Thomas"];
    return Array.from({length:6},(_,i)=>{
      const spec=rng()<0.6?COMMIS_SPECIALTIES[Math.floor(rng()*COMMIS_SPECIALTIES.length)]:null;
      const xp=Math.round(rng()*150);
      const salary=Math.round(rng()*5+8);
      return{id:`cp-${dateStr}-${i}`,name:names1[Math.floor(rng()*names1.length)]+" "+names2[Math.floor(rng()*names2.length)],totalXp:xp,salary,hireCost:salary*3,specialty:spec};
    });
  };

  useEffect(()=>{
    if(commisHireSlot===null) return;
    const today=new Date().toLocaleDateString("fr-FR");
    if(commisPoolDate===today&&commisPool.length>0) return;
    setCommisPool(buildCommisPool(today));
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
      const salary=Math.round(20+lvl*6+rng()*8);
      return{id:`cc-${today}-${i}`,name:firstNames[Math.floor(rng()*firstNames.length)]+" "+lastNames[Math.floor(rng()*lastNames.length)],totalXp:xpBase+Math.round(rng()*60),salary,hireCost:salary*8,lvl,speed:CHEF_LVL[lvl]?.speed||1.0,lvlName:CHEF_LVL[lvl]?.name||"Apprenti",lvlColor:CHEF_LVL[lvl]?.color||C.muted,lvlIcon:CHEF_LVL[lvl]?.icon||"👨‍🍳"};
    });
  };

  const [modal,setModal]=useState(false);   // "hire" | "edit" | "fire" | "train" | false
  const [form,setForm]=useState({name:"",status:"actif",salary:"12"});
  const [editId,setEditId]=useState(null);
  const [fireId,setFireId]=useState(null);
  const [trainId,setTrainId]=useState(null);

  const openTrain = (sv) => { setTrainId(sv.id); setModal("train"); };

  const doTrain = (sv, domain, level) => {
    const cost = level.cost;
    if(cash < cost){
      addToast&&addToast({icon:"❌",title:tr("servers.noFunds"),msg:tr("servers.noFundsTrain",{cost}),color:C.red,tab:"servers"});
      return;
    }
    const prevLevel = (sv.trainings||{})[domain.id] || 0;
    if(prevLevel >= domain.levels.length){
      addToast&&addToast({icon:"✅",title:tr("servers.trainingMax"),msg:tr("servers.trainingMaxMsg",{name:sv.name}),color:C.muted,tab:"servers"});
      return;
    }
    setCash&&setCash(c=>+(c-cost).toFixed(2));
    addTx&&addTx("achat",`Formation ${domain.name} N${level.l} — ${sv.name}`,cost);

    setServers(p=>p.map(s=>{
      if(s.id!==sv.id) return s;
      const newTrainings = {...(s.trainings||{}), [domain.id]: level.l};
      const newXp = Math.min(SRV_MAX_XP, s.totalXp + level.xp);
      const newMoral = Math.min(getMaxMoral({...s,trainings:newTrainings}),(s.moral??100)+level.moralBonus);
      // Assign/upgrade specialty if domain has one
      let newSpecialty = s.specialty;
      let newSpecUpgraded = s.specialtyUpgraded;
      if(level.specialtyId){
        const sp = SRV_SPECIALTIES.find(x=>x.id===level.specialtyId);
        if(!s.specialty){
          newSpecialty = sp;
        } else if(s.specialty.id===level.specialtyId && level.l===3 && !s.specialtyUpgraded){
          newSpecUpgraded = true;
        } else if(!s.specialty){
          newSpecialty = sp;
        }
      }
      return {...s,
        trainings: newTrainings,
        totalXp: newXp,
        moral: newMoral,
        specialty: newSpecialty,
        specialtyUpgraded: newSpecUpgraded,
        lastTrainedAt: Date.now(),
      };
    }));

    addToast&&addToast({
      icon:domain.icon,
      title:tr("servers.trainingDone",{name:sv.name,domain:domain.name,level:level.l}),
      msg:tr("servers.trainingDoneMsg",{effect:level.effect,xp:level.xp,moral:level.moralBonus}),
      color:domain.color, tab:"servers"
    });
    setModal(false);
    setTrainId(null);
  };

  const maxSlots = SERVER_SLOTS_BY_LEVEL[Math.min(restoLvN||0, RESTO_LVL.length-1)]||2;
  const canHire  = servers.length < maxSlots;
  // Coût de recrutement : 3× le salaire horaire
  const hireCost = Math.round(+(form.salary||12)*3);
  const canAfford = cash >= hireCost;

  // ── Plafond de tier serveur lié au niveau resto ──────
  const tierCap = srvTierCap(restoLvN||0);

  // ── Exigence de qualité du personnel active ──────────
  const activeReq = [...STAFF_QUALITY_REQ].reverse().find(r => (restoLvN||0) >= r.atLv) || null;
  const nextReq   = STAFF_QUALITY_REQ.find(r => (restoLvN||0) < r.atLv) || null;
  const reqMet    = !activeReq || servers.filter(s => srvLv(s.totalXp||0).l >= activeReq.tier).length >= activeReq.count;


  // Générer un pool de 9 candidats reproductibles par date, qualité liée au niveau resto
  const generatePool = (dateStr, restoLv = 0) => {
    let seed = dateStr.split("").reduce((a,c)=>a+c.charCodeAt(0), 0) + restoLv * 17;
    const rng = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    const names1=["Alice","Bruno","Clara","Denis","Elena","Félix","Gina","Hugo","Iris","Jean","Katia","Luc","Mona","Noé","Olivia","Paul","Rosa","Sam","Tina","Vera"];
    const names2=["Martin","Dupont","Bernard","Thomas","Robert","Petit","Moreau","Simon","Laurent","Michel"];
    const [xpMin,xpMax]   = _candidateXpRange(restoLv);
    const [salMin,salMax] = _candidateSalRange(restoLv);
    const specRate        = _candidateSpecRate(restoLv);
    return Array.from({length:9}, (_,i) => {
      const salary  = Math.round(rng()*(salMax-salMin)+salMin);
      const xp      = Math.round(rng()*(xpMax-xpMin)+xpMin);
      const moral   = Math.round(rng()*30+70);
      const hasSpec = rng() < specRate;
      const specIdx = Math.floor(rng()*SRV_SPECIALTIES.length);
      const name    = names1[Math.floor(rng()*names1.length)]+" "+names2[Math.floor(rng()*names2.length)];
      return {
        id      : `${dateStr}-${i}`,
        name,
        salary,
        totalXp : xp,
        moral,
        rating  : +(3.5 + rng()*1.5).toFixed(1),
        specialty: hasSpec && xp >= 80 ? SRV_SPECIALTIES[specIdx] : null,
        hireCost: salary * 3,
      };
    });
  };

  const openHire = () => {
    const today = new Date().toLocaleDateString("fr-FR");
    if(candidateDate !== today || candidatePool.length === 0) {
      setCandidatePool(generatePool(today, restoLvN||0));
      setCandidateDate(today);
    }
    setModal("hire");
  };

  const hireCandidate = (candidate) => {
    if(servers.length >= maxSlots){
      addToast&&addToast({icon:"🚫",title:tr("servers.teamComplete"),msg:tr("servers.teamCompleteMsg"),color:C.red,tab:"servers"});
      return;
    }
    if(cash < candidate.hireCost){
      addToast&&addToast({icon:"❌",title:tr("servers.noFunds"),msg:tr("servers.noFundsHire",{cost:candidate.hireCost}),color:C.red,tab:"servers"});
      return;
    }
    setCash&&setCash(c=>+(c-candidate.hireCost).toFixed(2));
    addTx&&addTx("achat",`Recrutement — ${candidate.name}`,candidate.hireCost);
    setServers(p=>[...p,{
      id      : Date.now(),
      name    : candidate.name,
      status  : "actif",
      totalXp : candidate.totalXp,
      rating  : candidate.rating,
      salary  : candidate.salary,
      moral   : candidate.moral,
      specialty: candidate.specialty,
    }]);
    const remaining = candidatePool.filter(c=>c.id!==candidate.id);
    setCandidatePool(remaining);
    addToast&&addToast({icon:"👔",title:tr("servers.hired",{name:candidate.name}),
      msg:tr("servers.hiredMsg",{cost:candidate.hireCost,remaining:remaining.length,s:remaining.length>1?"s":""}),
      color:C.green,tab:"servers"});
    if(remaining.length === 0 || servers.length + 1 >= maxSlots) setModal(false);
  };
  const openEdit = (sv) => {
    setEditId(sv.id);
    setForm({name:sv.name,status:sv.status,salary:String(sv.salary||12)});
    setModal("edit");
  };
  const openFire = (sv) => {
    setFireId(sv.id);
    setModal("fire");
  };

  const save = () => {
    if(!form.name.trim()) return;
    if(modal==="add"){
      if(!canAfford){ addToast&&addToast({icon:"❌",title:"Fonds insuffisants",msg:`Recrutement : ${hireCost}€ requis`,color:C.red,tab:"servers"}); return; }
      setCash&&setCash(c=>+(c-hireCost).toFixed(2));
      addTx&&addTx("achat",`Recrutement — ${form.name}`,hireCost);
      setServers(p=>[...p,{id:Date.now(),name:form.name,status:form.status,totalXp:0,rating:4.0,salary:+(form.salary||12)}]);
      addToast&&addToast({icon:"👔",title:`${form.name} embauché·e !`,msg:`−${hireCost}€ · Salaire ${form.salary}€/h`,color:C.green,tab:"servers"});
    } else {
      setServers(p=>p.map(s=>s.id===editId?{...s,name:form.name,status:form.status,salary:+(form.salary||0)}:s));
    }
    setModal(false);
  };

  const doFire = () => {
    const sv = servers.find(s=>s.id===fireId);
    if(!sv) return;
    const severance = (sv.salary||12) * 24; // 1 mois = 24h de salaire
    if(cash < severance){
      addToast&&addToast({icon:"❌",title:tr("servers.noFunds"),
        msg:`${tr("servers.severance")} : ${severance}€`,color:C.red,tab:"servers"});
      return;
    }
    setCash&&setCash(c=>+(c-severance).toFixed(2));
    addTx&&addTx("dépense",`Indemnité licenciement — ${sv.name}`,severance);
    setServers(p=>p.filter(s=>s.id!==fireId));
    addToast&&addToast({icon:"👋",title:tr("servers.fired",{name:sv.name}),
      msg:tr("servers.firedMsg",{cost:severance}),color:C.terra,tab:"servers"});
    setModal(false);
    setFireId(null);
  };

  const sColor={actif:C.green,pause:C.terra,repos:C.muted,service:C.amber,nettoyage:C.amber};
  const sBg   ={actif:C.greenP,pause:C.terraP,repos:C.bg,service:C.amberP,nettoyage:C.amberP};

  return(
    <div>

      {/* ══ BRIGADE DE CUISINE ══ */}
      {kitchen&&(
        <>
          <div style={{fontSize:13,fontWeight:700,color:C.ink,fontFamily:F.title,marginBottom:8,display:"flex",alignItems:"center",gap:6}}>
            👨‍🍳 Brigade de cuisine
          </div>

          {/* ── Chef + Commis — barre compacte ── */}
          <div style={{background:`linear-gradient(135deg,${clD.bg},${C.surface})`,
            border:`1.5px solid ${clD.color}33`,borderRadius:14,
            padding:bp.isMobile?"9px 12px":"10px 14px",
            marginBottom:16}}>
            <div style={{display:"flex",alignItems:"center",gap:bp.isMobile?8:12,flexWrap:"wrap"}}>
              <div style={{width:44,height:44,background:clD.color+"22",border:`2px solid ${clD.color}44`,
                borderRadius:11,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>
                {clD.icon}
              </div>
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
              <div style={{display:"flex",gap:5,flexShrink:0}}>
                <button onClick={()=>setChefModal("train")} style={{
                  fontSize:10,fontWeight:700,fontFamily:F.body,cursor:"pointer",
                  padding:"5px 10px",borderRadius:7,border:`1.5px solid ${C.navy}44`,
                  background:C.navyP,color:C.navy}}>📚 {tr("kitchen.trainChef")}</button>
                <button onClick={()=>setChefModal("replace")} style={{
                  fontSize:10,fontWeight:700,fontFamily:F.body,cursor:"pointer",
                  padding:"5px 10px",borderRadius:7,border:`1.5px solid ${C.red}33`,
                  background:C.redP,color:C.red}}>🔄 {tr("kitchen.replace")}</button>
              </div>
            </div>

            {/* Morale brigade */}
            <div style={{marginTop:9,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
              <span style={{fontSize:12}}>{brigMoraleIcon}</span>
              <span style={{fontSize:10,fontWeight:700,color:brigMoraleColor,fontFamily:F.body,minWidth:58}}>
                {tr("kitchen.moral")} {brigMorale}%
              </span>
              <div style={{flex:1,minWidth:80,height:5,background:C.border,borderRadius:99,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${brigMorale}%`,background:brigMoraleColor,borderRadius:99,transition:"width 0.5s"}}/>
              </div>
              {brigMorale<60&&(
                <button onClick={()=>{
                  const cost=150;
                  if(cash<cost)return;
                  setCash(c=>+(c-cost).toFixed(2));
                  addTx("dépense","Prime brigade",cost);
                  setKitchen(k=>({...k,morale:Math.min(100,(k.morale??100)+30)}));
                  addToast({icon:"🎉",title:tr("kitchen.incentive"),msg:tr("kitchen.incentiveDesc"),color:C.green,tab:"servers"});
                }} style={{
                  fontSize:10,fontWeight:700,fontFamily:F.body,cursor:cash>=150?"pointer":"not-allowed",
                  padding:"3px 9px",borderRadius:6,border:`1.5px solid ${C.amber}44`,
                  background:C.amberP,color:cash>=150?C.amber:C.muted,opacity:cash>=150?1:0.5}}>
                  💸 Prime 150€
                </button>
              )}
              {brigMorale>=70&&<span style={{fontSize:9,color:C.green,fontFamily:F.body,fontWeight:600}}>{tr("kitchen.speedBoost")}</span>}
              {brigMorale<30&&<span style={{fontSize:9,color:C.red,fontFamily:F.body,fontWeight:600}}>{tr("kitchen.speedPenalty")}</span>}
            </div>

            {/* Slots commis */}
            <div style={{marginTop:9,display:"flex",gap:5,flexWrap:"wrap"}}>
              {Array.from({length:maxCommisSlots},(_,idx)=>{
                const cm=kitchen.commis[idx];
                const locked=idx>=unlockedCommis;
                if(cm){
                  const cml=commisLv(cm.totalXp);
                  const cmlD=COMMIS_LVL[Math.min(cml.l,COMMIS_LVL.length-1)];
                  return(
                    <div key={cm.id} style={{background:cmlD.color+"12",border:`1px solid ${cmlD.color+"33"}`,
                      borderRadius:8,padding:"5px 9px",display:"flex",gap:5,alignItems:"center"}}>
                      <span style={{fontSize:14}}>{cmlD.icon}</span>
                      <div>
                        <div style={{fontSize:10,fontWeight:600,color:C.ink,fontFamily:F.body,whiteSpace:"nowrap"}}>{cm.name}</div>
                        <div style={{fontSize:9,color:C.muted,fontFamily:F.body,display:"flex",gap:4,alignItems:"center"}}>
                          <span>{cmlD.name}</span>
                          {cm.specialty&&<span style={{background:cm.specialty.cat==="Desserts"?C.purpleP:cm.specialty.cat==="Plats"?C.terraP:cm.specialty.cat==="Entrées"?C.greenP:C.navyP,
                            color:cm.specialty.cat==="Desserts"?C.purple:cm.specialty.cat==="Plats"?C.terra:cm.specialty.cat==="Entrées"?C.green:C.navy,
                            borderRadius:4,padding:"0 4px",fontSize:8,fontWeight:700}}>
                            {cm.specialty.icon} {cm.specialty.name}
                          </span>}
                        </div>
                      </div>
                      <button onClick={(e)=>{e.stopPropagation();setCommisHireSlot(idx);}} style={{
                        fontSize:9,padding:"2px 6px",borderRadius:5,cursor:"pointer",border:`1px solid ${C.border}`,
                        background:C.bg,color:C.muted,fontFamily:F.body}}>↺</button>
                    </div>
                  );
                }
                if(!locked){
                  return(
                    <button key={`hire-${idx}`} onClick={()=>setCommisHireSlot(idx)} style={{
                      fontSize:10,fontWeight:700,fontFamily:F.body,cursor:"pointer",
                      padding:"5px 10px",borderRadius:8,border:`1.5px dashed ${C.green}`,
                      background:C.greenP,color:C.green}}>{tr("kitchen.addCommis")} {idx+1}</button>
                  );
                }
                const unlockLvlIdx=CHEF_LVL.findIndex(l=>l.commis>idx);
                const unlockName=unlockLvlIdx>=0?CHEF_LVL[unlockLvlIdx].name:"?";
                return(
                  <div key={`locked-${idx}`} style={{background:C.bg,border:`1px solid ${C.border}`,
                    borderRadius:8,padding:"5px 9px",opacity:0.45,display:"flex",gap:5,alignItems:"center"}}>
                    <span style={{fontSize:14}}>🔒</span>
                    <div>
                      <div style={{fontSize:10,fontWeight:600,color:C.muted,fontFamily:F.body,whiteSpace:"nowrap"}}>{tr("kitchen.commis")} {idx+1}</div>
                      <div style={{fontSize:9,color:C.muted,fontFamily:F.body}}>{unlockName}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{fontSize:13,fontWeight:700,color:C.ink,fontFamily:F.title,marginBottom:8,display:"flex",alignItems:"center",gap:6}}>
            👤 Personnels en salle
          </div>
        </>
      )}

      {/* ── Header barre ── */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
        marginBottom:16,flexWrap:"wrap",gap:10}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:15,fontWeight:700,color:C.ink,fontFamily:F.title}}>
            {tr("servers.team",{count:servers.length,max:maxSlots})}
          </span>
          <span style={{fontSize:11,background:canHire?C.greenP:C.redP,
            color:canHire?C.green:C.red,border:`1px solid ${canHire?C.green:C.red}33`,
            borderRadius:20,padding:"2px 10px",fontFamily:F.body,fontWeight:600}}>
            {canHire?tr("servers.slotsAvailable",{n:maxSlots-servers.length,s:maxSlots-servers.length>1?"s":""}):tr("servers.teamFull")}
          </span>
        </div>
        <Btn onClick={openHire} disabled={!canHire} v={canHire?"primary":"disabled"} icon="➕">
          {tr("servers.hire")}
        </Btn>
      </div>

      {/* ── Bandeau exigences & plafond ── */}
      <div style={{display:"flex",gap:10,marginBottom:14,flexWrap:"wrap"}}>

        {/* Plafond de tier */}
        <div style={{flex:1,minWidth:200,background:C.navyP,border:`1px solid ${C.navy}33`,
          borderRadius:10,padding:"9px 14px",display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:18}}>🎓</span>
          <div style={{flex:1}}>
            <div style={{fontSize:11,fontWeight:700,color:C.navy,fontFamily:F.body}}>
              {tr("servers.tierMax",{icon:SRV_LVL[Math.min(tierCap,SRV_LVL.length-1)].icon,name:SRV_LVL[Math.min(tierCap,SRV_LVL.length-1)].name})}
            </div>
            <div style={{fontSize:10,color:C.muted,fontFamily:F.body,marginTop:1}}>
              {tierCap < 4
                ? tr("servers.tierUnlocks",{icon:SRV_LVL[Math.min(tierCap+1,SRV_LVL.length-1)].icon,name:SRV_LVL[Math.min(tierCap+1,SRV_LVL.length-1)].name,level:TIER_UNLOCK_LV[tierCap+1]})
                : tr("servers.allTiersUnlocked")}
            </div>
          </div>
        </div>

        {/* Exigence de personnel */}
        <div style={{flex:1,minWidth:200,
          background:activeReq?(reqMet?C.greenP:C.redP):C.bg,
          border:`1px solid ${activeReq?(reqMet?C.green:C.red):C.border}33`,
          borderRadius:10,padding:"9px 14px",display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:18}}>{activeReq?(reqMet?"✅":"⚠️"):"🟢"}</span>
          <div style={{flex:1}}>
            {activeReq ? (
              <>
                <div style={{fontSize:11,fontWeight:700,
                  color:reqMet?C.green:C.red,fontFamily:F.body}}>
                  {reqMet?tr("servers.reqMet"):tr("servers.reqNotMet")} — {activeReq.icon} {activeReq.label}
                </div>
                <div style={{fontSize:10,color:C.muted,fontFamily:F.body,marginTop:1}}>
                  {reqMet
                    ? nextReq
                      ? tr("servers.nextReq",{icon:nextReq.icon,label:nextReq.label,level:nextReq.atLv})
                      : tr("servers.maxReq")
                    : tr("servers.recruitOrTrain")}
                </div>
              </>
            ) : (
              <>
                <div style={{fontSize:11,fontWeight:700,color:C.muted,fontFamily:F.body}}>
                  {tr("servers.noReq")}
                </div>
                <div style={{fontSize:10,color:C.muted,fontFamily:F.body,marginTop:1}}>
                  {nextReq ? tr("servers.firstReq",{icon:nextReq.icon,label:nextReq.label,level:nextReq.atLv}) : ""}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Grille des serveurs ── */}
      <div style={{display:"grid",gridTemplateColumns:bp.isMobile?"1fr":bp.isTablet?"1fr 1fr":"repeat(auto-fill,minmax(270px,1fr))",gap:bp.isMobile?10:13}}>
        {servers.map(sv=>{
          const sl=srvLv(sv.totalXp||0);
          const slD=SRV_LVL[Math.min(sl.l,SRV_LVL.length-1)];
          const asgn=tables.filter(t=>t.server===sv.name);
          const isWorking=sv.status==="service";
          const isNettoyage=sv.status==="nettoyage";
          const cleaningTable=isNettoyage?tables.find(t=>t.cleanServer===sv.id):null;
          const cleanRemSecs=isNettoyage&&sv.cleanUntil?Math.max(0,Math.ceil((sv.cleanUntil-clockNow)/1000)):0;
          const moral=sv.moral??100;
          const mc=moralColor(moral);
          const mi=moralIcon(moral);
          const ml=tr("servers."+moralKey(moral));
          const isBurnout=moral<=10;
          const isExhausted=moral<=20;
          const sp=sv.specialty;
          const primeCost=50;
          const canAffordPrime=cash>=primeCost;

          return(
            <Card key={sv.id} accent={isBurnout?C.red+"66":slD.color+"44"}>
              {/* Ligne 1 : avatar + nom + note */}
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
                <div style={{display:"flex",gap:10,alignItems:"center"}}>
                  <div style={{width:44,height:44,background:slD.color+"1a",
                    border:`2px solid ${isBurnout?C.red:slD.color}33`,borderRadius:12,
                    display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,
                    position:"relative"}}>
                    {slD.icon}
                    {/* Moral badge */}
                    <div style={{position:"absolute",bottom:-5,right:-5,
                      width:18,height:18,borderRadius:"50%",fontSize:10,
                      background:C.surface,border:`1.5px solid ${mc}`,
                      display:"flex",alignItems:"center",justifyContent:"center"}}>
                      {mi}
                    </div>
                  </div>
                  <div>
                    <div style={{fontSize:14,fontWeight:600,color:C.ink,fontFamily:F.title}}>{sv.name}</div>
                    <div style={{display:"flex",gap:5,marginTop:4,flexWrap:"wrap"}}>
                      <Badge color={slD.color} sm>{slD.name}</Badge>
                      <Badge color={sColor[sv.status]||C.muted} bg={sBg[sv.status]||C.bg} sm>
                        {isWorking
                          ?`🛎 (${Math.max(0,Math.ceil((sv.serviceUntil-clockNow)/1000))}s)`
                          :isNettoyage
                            ?`🧹 ${cleaningTable?cleaningTable.name:"..."}${cleanRemSecs>0?" · "+cleanRemSecs+"s":""}`
                            :sv.status}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{fontSize:22,fontWeight:700,color:C.amber,fontFamily:F.title}}>
                    {sv.rating}<span style={{fontSize:10,color:C.muted}}>/5</span>
                  </div>
                </div>
              </div>

              {/* Spécialité */}
              {sp?(
                <div style={{background:sp.color+"12",border:`1px solid ${sp.color}33`,
                  borderRadius:8,padding:"6px 10px",marginBottom:10,
                  display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:16}}>{sp.icon}</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:11,fontWeight:700,color:sp.color,fontFamily:F.body}}>
                      {sp.name}{sv.specialtyUpgraded?" ✦":""}
                    </div>
                    <div style={{fontSize:9,color:C.muted,fontFamily:F.body}}>{sp.desc}</div>
                  </div>
                </div>
              ):sl.l>=1?(
                <div style={{background:C.bg,border:`1px dashed ${C.border}`,
                  borderRadius:8,padding:"6px 10px",marginBottom:10,
                  fontSize:10,color:C.muted,fontFamily:F.body}}>
                  {tr("servers.specialtyLocked")}
                </div>
              ):null}

              {/* Barre XP + plafond de tier */}
              <div style={{marginBottom:10}}>
                {sl.l >= tierCap ? (
                  <>
                    <div style={{display:"flex",justifyContent:"space-between",
                      fontSize:10,marginBottom:4,fontFamily:F.body}}>
                      <span style={{color:C.muted}}>XP · Niv.{sl.l} <span style={{color:C.amber,fontWeight:700}}>{tr("servers.tierCapped")}</span></span>
                      <span style={{color:C.amber,fontWeight:600}}>{sl.r}/{sl.n}</span>
                    </div>
                    <XpBar xp={sl.r} needed={sl.n} color={C.amber}/>
                    {tierCap < 4 && (
                      <div style={{fontSize:9,color:C.amber,fontFamily:F.body,marginTop:3,fontWeight:600}}>
                        {tr("servers.tierNextUnlocks",{icon:SRV_LVL[Math.min(tierCap+1,SRV_LVL.length-1)].icon,level:TIER_UNLOCK_LV[tierCap+1]})}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div style={{display:"flex",justifyContent:"space-between",
                      fontSize:10,color:C.muted,marginBottom:4,fontFamily:F.body}}>
                      <span>XP · Niv.{sl.l}</span>
                      <span style={{color:slD.color,fontWeight:600}}>{sl.r}/{sl.n}</span>
                    </div>
                    <XpBar xp={sl.r} needed={sl.n} color={slD.color}/>
                  </>
                )}
              </div>

              {/* Jauge Moral */}
              <div style={{marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",
                  fontSize:10,marginBottom:4,fontFamily:F.body}}>
                  <span style={{color:C.muted}}>{tr("servers.moralLabel")} {mi} {ml}</span>
                  <span style={{fontWeight:700,color:mc}}>{moral}/100</span>
                </div>
                <div style={{height:6,background:C.border,borderRadius:99,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${moral}%`,background:mc,
                    borderRadius:99,transition:"width 0.5s ease"}}/>
                </div>
                {isBurnout&&(
                  <div style={{fontSize:9,color:C.red,fontWeight:700,fontFamily:F.body,marginTop:3,
                    animation:"pulse 1s infinite"}}>
                    {tr("servers.burnoutWarning")}
                  </div>
                )}
                {!isBurnout&&isExhausted&&(
                  <div style={{fontSize:9,color:C.amber,fontFamily:F.body,marginTop:3}}>
                    {tr("servers.exhaustedWarning")}
                  </div>
                )}
              </div>

              {/* Infos */}
              <div style={{fontSize:11,color:C.muted,marginBottom:12,fontFamily:F.body}}>
                <div>{asgn.length>0?"📍 "+asgn.map(t=>t.name).join(", "):tr("servers.noTable")}</div>
                <div style={{marginTop:2}}>{tr("servers.xpInfo",{xp:sv.totalXp,salary:(sv.salary||0).toFixed(0)})}</div>
                {Object.keys(sv.trainings||{}).length>0&&(
                  <div style={{marginTop:5,display:"flex",gap:4,flexWrap:"wrap"}}>
                    {TRAINING_CATALOG.filter(d=>(sv.trainings||{})[d.id]>0).map(d=>(
                      <span key={d.id} style={{fontSize:9,background:d.color+"14",color:d.color,
                        border:`1px solid ${d.color}22`,borderRadius:5,padding:"1px 6px",
                        fontFamily:F.body,fontWeight:600}}>
                        {d.icon} N{(sv.trainings||{})[d.id]}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
                {sv.status==="actif"&&!isWorking&&(
                  <Btn sm v="terra" onClick={()=>setServers(p=>p.map(x=>x.id===sv.id?{...x,status:"pause"}:x))}>
                    {tr("servers.pause")}
                  </Btn>
                )}
                {sv.status==="pause"&&(
                  <Btn sm v="primary" onClick={()=>setServers(p=>p.map(x=>x.id===sv.id?{...x,status:"actif"}:x))}>
                    {tr("servers.activate")}
                  </Btn>
                )}
                {isWorking&&(
                  <span style={{fontSize:11,color:C.amber,fontFamily:F.body,alignSelf:"center"}}>
                    {tr("servers.inService")}
                  </span>
                )}
                {/* Prime de motivation */}
                {moral<60&&!isWorking&&(
                  <Btn sm v={canAffordPrime?"navy":"disabled"}
                    disabled={!canAffordPrime}
                    onClick={()=>{
                      if(!canAffordPrime)return;
                      setCash&&setCash(c=>+(c-primeCost).toFixed(2));
                      addTx&&addTx("achat",`Prime motivation — ${sv.name}`,primeCost);
                      setServers(p=>p.map(x=>x.id!==sv.id?x:{...x,moral:Math.min(100,x.moral+50)}));
                      addToast&&addToast({icon:"🎁",title:tr("servers.incentivePaid",{name:sv.name}),
                        msg:tr("servers.incentiveMsg",{cost:primeCost}),color:C.navy,tab:"servers"});
                    }}>
                    {tr("servers.incentive",{cost:primeCost})}
                  </Btn>
                )}
                {isWorking?(
                  <div style={{fontSize:9,color:C.amber,fontFamily:F.body,fontWeight:600,
                    background:C.amberP,borderRadius:6,padding:"3px 8px",border:`1px solid ${C.amber}33`}}>
                    {tr("servers.inServiceShort")}
                  </div>
                ):(
                  <Btn sm v="danger" onClick={()=>openFire(sv)}>{tr("servers.fire")}</Btn>
                )}
                <Btn sm v="secondary" onClick={()=>openTrain(sv)} icon="🎓">
                  {tr("servers.train")}
                </Btn>
              </div>
            </Card>
          );
        })}

        {/* ── Slots libres cliquables ── */}
        {canHire&&Array.from({length:maxSlots-servers.length},(_,i)=>(
          <div key={`free-${i}`} onClick={openHire}
            className="hovcard"
            style={{background:C.bg,border:`1.5px dashed ${C.green}55`,
              borderRadius:14,padding:"18px 16px",
              display:"flex",flexDirection:"column",alignItems:"center",
              justifyContent:"center",minHeight:160,gap:10,cursor:"pointer",
              transition:"all 0.2s"}}>
            <div style={{width:44,height:44,background:C.greenP,border:`2px dashed ${C.green}66`,
              borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>
              ➕
            </div>
            <div style={{fontSize:12,color:C.green,fontWeight:600,fontFamily:F.body}}>
              {tr("servers.freeSlot")}
            </div>
            <div style={{fontSize:10,color:C.muted,fontFamily:F.body,textAlign:"center"}}>
              {tr("servers.clickHire")}
            </div>
          </div>
        ))}

        {/* ── Slots verrouillés ── */}
        {(()=>{
          const nextLevelSlots=Object.entries(SERVER_SLOTS_BY_LEVEL)
            .filter(([lv,sl])=>parseInt(lv)>restoLvN&&sl>maxSlots)
            .slice(0,2);
          if(!nextLevelSlots.length)return null;
          return nextLevelSlots.map(([lv])=>{
            const r=RESTO_LVL.find(x=>x.l===parseInt(lv));
            return(
              <div key={`lock-${lv}`} style={{background:C.bg,border:`1.5px dashed ${C.border}`,
                borderRadius:14,padding:"18px 16px",
                display:"flex",flexDirection:"column",alignItems:"center",
                justifyContent:"center",minHeight:160,gap:8,opacity:0.6}}>
                <span style={{fontSize:32}}>🔒</span>
                <div style={{fontSize:11,color:C.muted,fontFamily:F.body,textAlign:"center"}}>
                  {tr("servers.lockedSlot")}
                </div>
                {r&&<span style={{fontSize:11,background:r.color+"18",color:r.color,
                  border:`1px solid ${r.color}33`,borderRadius:6,padding:"2px 8px",
                  fontFamily:F.body,fontWeight:600}}>
                  {tr("servers.levelUnlock",{icon:r.icon,level:r.l,name:r.name})}
                </span>}
              </div>
            );
          });
        })()}
      </div>

      {/* ── Modale Formation ── */}
      {modal==="train"&&(()=>{
        const sv=servers.find(s=>s.id===trainId);
        if(!sv)return null;
        const sl=srvLv(sv.totalXp);
        const slD=SRV_LVL[Math.min(sl.l,SRV_LVL.length-1)];
        return(
          <div onClick={()=>{setModal(false);setTrainId(null);}}
            style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",
              zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
            <div onClick={e=>e.stopPropagation()}
              style={{background:C.surface,border:`1.5px solid ${C.border}`,borderRadius:18,
                width:"100%",maxWidth:620,maxHeight:"90vh",overflowY:"auto",
                boxShadow:"0 20px 60px rgba(0,0,0,0.2)"}}>

              {/* Header */}
              <div style={{padding:"18px 22px",borderBottom:`1px solid ${C.border}`,
                display:"flex",justifyContent:"space-between",alignItems:"center",
                position:"sticky",top:0,background:C.surface,zIndex:10}}>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <div style={{width:40,height:40,background:slD.color+"1a",
                    border:`2px solid ${slD.color}33`,borderRadius:10,
                    display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>
                    {slD.icon}
                  </div>
                  <div>
                    <div style={{fontSize:16,fontWeight:700,color:C.ink,fontFamily:F.title}}>
                      {tr("servers.trainTitle",{name:sv.name})}
                    </div>
                    <div style={{fontSize:11,color:C.muted,fontFamily:F.body,marginTop:2}}>
                      {tr("servers.trainSubtitle",{level:sl.l,xp:sv.totalXp,moral:sv.moral??100})}
                      {sv.specialty?.name&&` · ${sv.specialty.icon||""} ${sv.specialty.name}`}
                    </div>
                  </div>
                </div>
                <button onClick={()=>{setModal(false);setTrainId(null);}}
                  style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,
                    width:32,height:32,cursor:"pointer",fontSize:16,color:C.muted,
                    display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
              </div>

              {/* Solde */}
              <div style={{padding:"10px 22px",background:C.bg,borderBottom:`1px solid ${C.border}`,
                display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:12,color:C.muted,fontFamily:F.body}}>{tr("servers.balance")}</span>
                <span style={{fontSize:14,fontWeight:700,color:cash<100?C.red:C.green,fontFamily:F.title}}>
                  {cash.toLocaleString("fr-FR",{minimumFractionDigits:2})} €
                </span>
              </div>

              {/* Domaines */}
              <div style={{padding:"16px 22px",display:"flex",flexDirection:"column",gap:20}}>
                {TRAINING_CATALOG.map(domain=>{
                  const currentLevel=(sv.trainings||{})[domain.id]||0;
                  const isMaxed=currentLevel>=domain.levels.length;
                  const nextLevel=domain.levels[currentLevel]||null;
                  return(
                    <div key={domain.id} style={{
                      border:`1.5px solid ${domain.color}33`,borderRadius:14,overflow:"hidden"}}>

                      {/* Domain header */}
                      <div style={{background:domain.color+"12",padding:"12px 16px",
                        display:"flex",alignItems:"center",gap:12,
                        borderBottom:`1px solid ${domain.color}22`}}>
                        <span style={{fontSize:22}}>{domain.icon}</span>
                        <div style={{flex:1}}>
                          <div style={{fontSize:14,fontWeight:700,color:domain.color,fontFamily:F.title}}>
                            {domain.name}
                          </div>
                          <div style={{fontSize:11,color:C.muted,fontFamily:F.body,marginTop:1}}>
                            {domain.desc}
                          </div>
                        </div>
                        {/* Niveau actuel */}
                        <div style={{display:"flex",gap:4,flexShrink:0}}>
                          {domain.levels.map((_,i)=>(
                            <div key={i} style={{
                              width:10,height:10,borderRadius:"50%",
                              background:i<currentLevel?domain.color:C.border,
                              border:`1.5px solid ${domain.color}`,
                              transition:"background 0.3s"}}/>
                          ))}
                        </div>
                        {isMaxed&&(
                          <span style={{fontSize:11,background:domain.color,color:"#fff",
                            borderRadius:20,padding:"2px 8px",fontFamily:F.body,fontWeight:700}}>
                            ✓ Max
                          </span>
                        )}
                      </div>

                      {/* Niveaux */}
                      <div style={{padding:"10px 16px",display:"flex",flexDirection:"column",gap:8}}>
                        {domain.levels.map((level,i)=>{
                          const isDone=i<currentLevel;
                          const isNext=i===currentLevel;
                          const isLocked=i>currentLevel;
                          const canAffordThis=cash>=level.cost;
                          return(
                            <div key={i} style={{
                              display:"flex",alignItems:"center",gap:12,padding:"10px 12px",
                              borderRadius:10,
                              background:isDone?C.greenP:isNext?domain.color+"0a":C.bg,
                              border:`1px solid ${isDone?C.green+"33":isNext?domain.color+"33":C.border}`,
                              opacity:isLocked?0.45:1}}>

                              {/* Indicateur niveau */}
                              <div style={{width:28,height:28,borderRadius:"50%",flexShrink:0,
                                background:isDone?C.green:isNext?domain.color:C.border,
                                display:"flex",alignItems:"center",justifyContent:"center",
                                fontSize:12,fontWeight:800,color:"#fff"}}>
                                {isDone?"✓":level.l}
                              </div>

                              {/* Infos */}
                              <div style={{flex:1,minWidth:0}}>
                                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                                  <span style={{fontSize:12,fontWeight:700,
                                    color:isDone?C.green:isNext?domain.color:C.muted,
                                    fontFamily:F.body}}>
                                    {tr("servers.levelN",{n:level.l,name:level.name})}
                                  </span>
                                  {isDone&&<span style={{fontSize:9,background:C.green,color:"#fff",
                                    borderRadius:99,padding:"1px 7px",fontFamily:F.body,fontWeight:700}}>
                                    {tr("servers.acquired")}
                                  </span>}
                                </div>
                                <div style={{fontSize:11,color:C.muted,fontFamily:F.body,marginBottom:4}}>
                                  {level.desc}
                                </div>
                                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                                  <span style={{fontSize:10,background:domain.color+"14",
                                    color:domain.color,border:`1px solid ${domain.color}22`,
                                    borderRadius:5,padding:"1px 7px",fontFamily:F.body,fontWeight:600}}>
                                    ✦ {level.effect}
                                  </span>
                                  <span style={{fontSize:10,background:C.greenP,color:C.green,
                                    border:`1px solid ${C.green}22`,
                                    borderRadius:5,padding:"1px 7px",fontFamily:F.body,fontWeight:600}}>
                                    +{level.xp} XP
                                  </span>
                                  {level.moralBonus>0&&(
                                    <span style={{fontSize:10,background:C.amberP,color:C.amber,
                                      border:`1px solid ${C.amber}22`,
                                      borderRadius:5,padding:"1px 7px",fontFamily:F.body,fontWeight:600}}>
                                      +{level.moralBonus} moral
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Prix + bouton */}
                              {isNext&&(
                                <div style={{flexShrink:0,textAlign:"right"}}>
                                  <div style={{fontSize:14,fontWeight:800,
                                    color:canAffordThis?domain.color:C.red,
                                    fontFamily:F.title,marginBottom:6}}>
                                    {level.cost} €
                                  </div>
                                  <Btn sm
                                    v={canAffordThis?"primary":"disabled"}
                                    disabled={!canAffordThis}
                                    onClick={()=>doTrain(sv,domain,level)}>
                                    {canAffordThis?tr("servers.fund"):tr("servers.noFunds")}
                                  </Btn>
                                </div>
                              )}
                              {isDone&&(
                                <div style={{fontSize:11,color:C.green,fontFamily:F.body,flexShrink:0}}>
                                  ✅
                                </div>
                              )}
                              {isLocked&&(
                                <div style={{fontSize:11,color:C.muted,fontFamily:F.body,flexShrink:0}}>
                                  🔒
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ══ Modal embauche — 3 candidats ═════════════════════ */}
      {modal==="hire"&&(
        <div onClick={()=>setModal(false)}
          style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",
            zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div onClick={e=>e.stopPropagation()}
            style={{background:C.surface,border:`1.5px solid ${C.border}`,borderRadius:18,
              width:"100%",maxWidth:560,maxHeight:"90vh",overflowY:"auto",
              boxShadow:"0 20px 60px rgba(0,0,0,0.2)"}}>

            {/* Header */}
            <div style={{padding:"18px 22px",borderBottom:`1px solid ${C.border}`,
              display:"flex",justifyContent:"space-between",alignItems:"center",
              position:"sticky",top:0,background:C.surface,zIndex:10}}>
              <div>
                <div style={{fontSize:16,fontWeight:700,color:C.ink,fontFamily:F.title}}>
                  {tr("servers.candidates")}
                </div>
                <div style={{fontSize:11,color:C.muted,fontFamily:F.body,marginTop:3}}>
                  {tr("servers.candidatesInfo",{shown:candidatePool.slice(0,3).length,s:candidatePool.slice(0,3).length>1?"s":"",total:candidatePool.length,hired:servers.length,max:maxSlots})}
                </div>
              </div>
              <button onClick={()=>setModal(false)}
                style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,
                  width:32,height:32,cursor:"pointer",fontSize:16,color:C.muted,
                  display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
            </div>

            {/* Solde + plafond de tier */}
            <div style={{padding:"10px 22px",background:C.bg,borderBottom:`1px solid ${C.border}`,
              display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:12,color:C.muted,fontFamily:F.body}}>Solde :</span>
                <span style={{fontSize:14,fontWeight:700,color:C.green,fontFamily:F.title}}>
                  {cash.toLocaleString("fr-FR",{minimumFractionDigits:2})} €
                </span>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:6,
                background:C.navyP,border:`1px solid ${C.navy}22`,borderRadius:7,
                padding:"3px 10px"}}>
                <span style={{fontSize:11}}>🎓</span>
                <span style={{fontSize:10,color:C.navy,fontWeight:600,fontFamily:F.body}}>
                  Candidats niv. {restoLvN||0} · Tier max : {SRV_LVL[Math.min(tierCap,SRV_LVL.length-1)].name}
                </span>
              </div>
            </div>

            {/* Liste des candidats */}
            <div style={{padding:"16px 22px",display:"flex",flexDirection:"column",gap:14}}>
              {candidatePool.length===0?(
                <div style={{textAlign:"center",padding:"32px 0",color:C.muted,fontFamily:F.body}}>
                  <div style={{fontSize:32,marginBottom:8}}>📅</div>
                  <div style={{fontSize:13,fontWeight:600}}>{tr("servers.noCandidates")}</div>
                  <div style={{fontSize:11,marginTop:4}}>{tr("servers.noCandidatesMsg")}</div>
                </div>
              ):candidatePool.slice(0,3).map(c=>{
                const sl = srvLv(c.totalXp);
                const slD = SRV_LVL[Math.min(sl.l, SRV_LVL.length-1)];
                const canAfford = cash >= c.hireCost;
                return(
                  <div key={c.id} style={{
                    background: canAfford?C.card:C.bg,
                    border: `1.5px solid ${canAfford?slD.color+"44":C.border}`,
                    borderRadius:14,padding:"16px",
                    opacity: canAfford?1:0.65,
                  }}>
                    {/* Ligne principale */}
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                      <div style={{display:"flex",gap:12,alignItems:"center"}}>
                        {/* Avatar */}
                        <div style={{width:46,height:46,background:slD.color+"1a",
                          border:`2px solid ${slD.color}33`,borderRadius:12,
                          display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>
                          {slD.icon}
                        </div>
                        <div>
                          <div style={{fontSize:14,fontWeight:700,color:C.ink,fontFamily:F.title}}>
                            {c.name}
                          </div>
                          <div style={{display:"flex",alignItems:"center",gap:6,marginTop:3}}>
                            <span style={{fontSize:10,background:slD.color+"18",color:slD.color,
                              border:`1px solid ${slD.color}33`,borderRadius:5,padding:"1px 7px",
                              fontFamily:F.body,fontWeight:700}}>
                              {slD.icon} {slD.name}
                            </span>
                            {c.specialty&&(
                              <span style={{fontSize:10,background:C.purpleP,color:C.purple,
                                border:`1px solid ${C.purple}33`,borderRadius:5,padding:"1px 7px",
                                fontFamily:F.body,fontWeight:600}}>
                                {c.specialty.icon} {c.specialty.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {/* Coût */}
                      <div style={{textAlign:"right"}}>
                        <div style={{fontSize:16,fontWeight:800,color:canAfford?C.green:C.red,fontFamily:F.title}}>
                          {c.hireCost}€
                        </div>
                        <div style={{fontSize:9,color:C.muted,fontFamily:F.body}}>{tr("servers.hireCost")}</div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:8,marginBottom:12}}>
                      {[
                        {icon:"💶",label:"Salaire",val:`${c.salary}€/h`},
                        {icon:"😊",label:"Moral",  val:`${c.moral}/100`},
                        {icon:"⭐",label:"Note",   val:`${c.rating}★`},
                        {icon:"📈",label:"XP",     val:`${c.totalXp} XP`},
                      ].map(stat=>(
                        <div key={stat.label} style={{background:C.bg,borderRadius:8,
                          padding:"7px 8px",textAlign:"center"}}>
                          <div style={{fontSize:13}}>{stat.icon}</div>
                          <div style={{fontSize:12,fontWeight:700,color:C.ink,fontFamily:F.title}}>{stat.val}</div>
                          <div style={{fontSize:9,color:C.muted,fontFamily:F.body}}>{stat.label}</div>
                        </div>
                      ))}
                    </div>

                    {/* Spécialité détail */}
                    {c.specialty&&(
                      <div style={{background:C.purpleP,border:`1px solid ${C.purple}22`,
                        borderRadius:8,padding:"7px 10px",marginBottom:10,fontSize:11,
                        color:C.purple,fontFamily:F.body}}>
                        {c.specialty.icon} <strong>{c.specialty.name}</strong> — {c.specialty.desc}
                      </div>
                    )}

                    {/* Bouton embaucher */}
                    <Btn full v={canAfford?"primary":"disabled"}
                      onClick={()=>canAfford&&hireCandidate(c)}
                      icon={canAfford?"👔":"🔒"}>
                      {canAfford?tr("servers.hireBtn",{cost:c.hireCost}):tr("servers.noFunds")}
                    </Btn>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {modal==="fire"&&(()=>{
        const sv=servers.find(s=>s.id===fireId);
        if(!sv)return null;
        const totalXp    = sv.totalXp  ?? 0;
        const salary     = sv.salary    ?? 12;
        const moral      = sv.moral     ?? 100;
        const rating     = sv.rating    ?? 4.0;
        const specialty  = sv.specialty ?? null;
        const sl         = srvLv(totalXp);
        const slD        = SRV_LVL[Math.min(sl.l, SRV_LVL.length-1)];
        const severance  = salary * 24;
        const canAffordFire  = cash >= severance;
        const assignedTables = tables.filter(t => t.server === sv.name);
        return(
          <Modal title={tr("servers.fireTitle")} onClose={()=>{setModal(false);setFireId(null);}}>
            <div style={{display:"flex",flexDirection:"column",gap:16}}>

              {/* Profil */}
              <div style={{display:"flex",gap:14,alignItems:"center",
                background:C.bg,borderRadius:12,padding:"14px 16px"}}>
                <div style={{width:50,height:50,background:slD.color+"1a",
                  border:`2px solid ${slD.color}33`,borderRadius:12,
                  display:"flex",alignItems:"center",justifyContent:"center",fontSize:26}}>
                  {slD.icon}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:16,fontWeight:700,color:C.ink,fontFamily:F.title}}>
                    {sv.name}
                  </div>
                  <div style={{fontSize:11,color:C.muted,fontFamily:F.body,marginTop:3}}>
                    {slD.name} · Niv.{sl.l}
                    {specialty&&` · ${specialty.icon} ${specialty.name}`}
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:8}}>
                {[
                  {icon:"📈",label:"XP",     val:`${totalXp} XP`},
                  {icon:"😊",label:"Moral",  val:`${moral}/100`},
                  {icon:"⭐",label:"Note",   val:`${(rating||0).toFixed(1)}/5`},
                  {icon:"💶",label:"Salaire",val:`${salary}€/h`},
                ].map(stat=>(
                  <div key={stat.label} style={{background:C.bg,borderRadius:8,
                    padding:"8px",textAlign:"center"}}>
                    <div style={{fontSize:14}}>{stat.icon}</div>
                    <div style={{fontSize:12,fontWeight:700,color:C.ink,fontFamily:F.title}}>{stat.val}</div>
                    <div style={{fontSize:9,color:C.muted,fontFamily:F.body}}>{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Tables assignées */}
              {assignedTables.length>0&&(
                <div style={{background:C.amberP,border:`1px solid ${C.amber}33`,
                  borderRadius:8,padding:"8px 12px",fontSize:11,color:C.amber,fontFamily:F.body}}>
                  {tr("servers.assignedTo",{count:assignedTables.length,s:assignedTables.length>1?"s":"",tables:assignedTables.map(t=>t.name).join(", ")})}
                </div>
              )}

              {/* Indemnité */}
              <div style={{background:canAffordFire?C.bg:C.redP,
                border:`1.5px solid ${canAffordFire?C.border:C.red}44`,
                borderRadius:10,padding:"12px 16px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <div style={{fontSize:12,fontWeight:700,color:C.ink,fontFamily:F.body}}>
                      {tr("servers.severance")}
                    </div>
                    <div style={{fontSize:10,color:C.muted,fontFamily:F.body,marginTop:2}}>
                      {tr("servers.severanceDetail",{salary})}
                    </div>
                  </div>
                  <div style={{fontSize:18,fontWeight:800,
                    color:canAffordFire?C.ink:C.red,fontFamily:F.title}}>
                    {severance}€
                  </div>
                </div>
                {!canAffordFire&&(
                  <div style={{marginTop:8,fontSize:10,color:C.red,fontFamily:F.body,fontWeight:600}}>
                    {tr("servers.insufficientFire",{available:cash.toFixed(2),required:severance})}
                  </div>
                )}
              </div>

              {/* Avertissement */}
              <div style={{fontSize:11,color:C.muted,fontFamily:F.body,
                textAlign:"center",lineHeight:1.5}}>
                <span dangerouslySetInnerHTML={{__html:tr("servers.irreversible")}}/><br/>
                {tr("servers.fireWarning",{name:sv.name})}
              </div>

              {/* Boutons */}
              <div style={{display:"flex",gap:10}}>
                <Btn full v="ghost" onClick={()=>{setModal(false);setFireId(null);}}>
                  {tr("app.cancel")}
                </Btn>
                <Btn full v={canAffordFire?"danger":"disabled"} onClick={doFire} icon="👋">
                  {canAffordFire?tr("servers.fireConfirm",{cost:severance}):tr("servers.noFunds")}
                </Btn>
              </div>
            </div>
          </Modal>
        );
      })()}

      {/* ══ MODAL : Formation chef ══ */}
      {chefModal==="train"&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center"}}
          onClick={()=>setChefModal(false)}>
          <div style={{background:C.card,borderRadius:16,padding:24,maxWidth:380,width:"90%",boxShadow:"0 8px 40px rgba(0,0,0,0.25)"}}
            onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:14,fontWeight:800,color:C.ink,fontFamily:F.title,marginBottom:16,display:"flex",justifyContent:"space-between"}}>
              📚 {tr("kitchen.trainChef")} — {chf.name}
              <button onClick={()=>setChefModal(false)} style={{background:"none",border:"none",cursor:"pointer",fontSize:18,color:C.muted}}>✕</button>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {CHEF_TRAININGS.map(training=>{
                const done=!!(kitchen?.chefTrainings||{})[training.id];
                const canAfford=cash>=training.cost;
                return(
                  <div key={training.id} style={{background:done?C.greenP:C.bg,border:`1.5px solid ${done?C.green:C.border}`,borderRadius:11,padding:"10px 14px",
                    display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}>
                    <div>
                      <div style={{fontSize:12,fontWeight:700,color:C.ink,fontFamily:F.body}}>{training.icon} {training.name}</div>
                      <div style={{fontSize:10,color:C.muted,fontFamily:F.body}}>{training.desc}</div>
                      {training.id==="brigade"&&done&&kitchen?.chefTrainings?.brigadeUntil&&(
                        <div style={{fontSize:9,color:C.amber,fontFamily:F.body}}>
                          ⏱ {tr("kitchen.expires")} {new Date(kitchen.chefTrainings.brigadeUntil).toLocaleString(lang==="en"?"en-US":"fr-FR",{hour:"2-digit",minute:"2-digit"})}
                        </div>
                      )}
                    </div>
                    {done&&training.id!=="brigade"?(
                      <span style={{fontSize:10,color:C.green,fontWeight:700,fontFamily:F.body}}>✅</span>
                    ):(
                      <button disabled={!canAfford} onClick={()=>{
                        if(!canAfford)return;
                        setCash(c=>+(c-training.cost).toFixed(2));
                        addTx("dépense",`Formation chef : ${training.name}`,training.cost);
                        setKitchen(k=>{
                          const t={...(k.chefTrainings||{}),[training.id]:true};
                          if(training.id==="brigade") t.brigadeUntil=Date.now()+72*3600*1000;
                          return{...k,chef:{...k.chef,totalXp:Math.min(CHEF_MAX_XP,k.chef.totalXp+training.xp)},chefTrainings:t};
                        });
                        addToast({icon:training.icon,title:training.name+" — "+tr("kitchen.acquired")+"!",msg:`${training.desc} · −${training.cost}€`,color:C.navy,tab:"servers"});
                        if(training.id!=="brigade") setChefModal(false);
                      }} style={{
                        fontSize:11,fontWeight:700,fontFamily:F.body,
                        padding:"5px 12px",borderRadius:8,
                        background:canAfford?C.navyP:"transparent",
                        color:canAfford?C.navy:C.muted,
                        border:`1.5px solid ${canAfford?C.navy:C.border}`,
                        cursor:canAfford?"pointer":"not-allowed"}}>
                        💰 {training.cost}€
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
              🔄 {tr("kitchen.replace")} {chf.name}
              <button onClick={()=>setChefModal(false)} style={{background:"none",border:"none",cursor:"pointer",fontSize:18,color:C.muted}}>✕</button>
            </div>
            <div style={{fontSize:10,color:C.muted,fontFamily:F.body,marginBottom:14}}>{tr("kitchen.replaceNote")}</div>
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
                        <div style={{fontSize:10,color:cand.lvlColor,fontFamily:F.body,fontWeight:600}}>{cand.lvlName} · ⚡×{cand.speed} · {cand.salary}€/h</div>
                      </div>
                    </div>
                    <button disabled={!canAfford} onClick={()=>{
                      if(!canAfford)return;
                      const transferXp=Math.round(chf.totalXp*0.3);
                      setCash(c=>+(c-cand.hireCost).toFixed(2));
                      addTx("achat",`Recrutement chef : ${cand.name}`,cand.hireCost);
                      setKitchen(k=>({...k,chef:{...k.chef,name:cand.name,totalXp:cand.totalXp+transferXp,salary:cand.salary,status:"actif"},chefTrainings:{},morale:Math.min(100,(k.morale??100)+10)}));
                      addToast({icon:"👨‍🍳",title:tr("kitchen.recruited",{name:cand.name}),msg:`−${cand.hireCost}€ · +${transferXp} XP transmis`,color:C.purple,tab:"servers"});
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
              👨‍🍳 {tr("kitchen.hireCommis")}
              <button onClick={()=>setCommisHireSlot(null)} style={{background:"none",border:"none",cursor:"pointer",fontSize:18,color:C.muted}}>✕</button>
            </div>
            <div style={{fontSize:10,color:C.muted,fontFamily:F.body,marginBottom:14}}>{tr("kitchen.poolRefresh")}</div>
            {commisPool.length===0&&<div style={{color:C.muted,fontSize:11,fontFamily:F.body,textAlign:"center",padding:20}}>{tr("kitchen.noCandidates")}</div>}
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
                      addToast({icon:"🔪",title:tr("kitchen.recruited",{name:cand.name}),msg:`−${cand.hireCost}€${cand.specialty?" · "+cand.specialty.icon+" "+cand.specialty.name:""}`,color:C.green,tab:"servers"});
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

/* ═══════════════════════════════════════════════════════
   KITCHEN VIEW
═══════════════════════════════════════════════════════ */