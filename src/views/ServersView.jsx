/* ═══════════════════════════════════════════════════════
   src/views/ServersView.jsx
   Extrait du monolithe restaurant-manager.jsx
   Dépendances déclarées dans les imports ci-dessous.
═══════════════════════════════════════════════════════ */
import { useState, useEffect } from "react";
import { C, F, CHEF_LVL, COMMIS_LVL, CHEF_TRAININGS, KITCHEN_UPGRADES, COMMIS_SPECIALTIES } from "../constants/gameData.js";
import { Badge, Card, Btn, Modal, XpBar } from "../components/ui/index.js";
import { useLang } from "../i18n/index.jsx";
import { chefLv, commisLv, CHEF_MAX_XP, COMMIS_MAX_XP } from "../utils/levelUtils.js";
import { SalleSection } from "./servers/SalleSection.jsx";
/* ─── Helpers locaux ────────────────────────────────── */
const moralIcon   = (m) => m>=70?"😊":m>=40?"😐":m>=20?"😓":"💀";
const moralKey    = (m) => m>=70?"moralFine":m>=40?"moralTired":m>=20?"moralExhausted":"moralBurnout";
const moralColor  = (m) => m>=70 ? "#236b47" : m>=40 ? "#a86e08" : "#b83025";

const SHIFT_OPTIONS = [
  { id: null,    label: "—",               bg: "transparent",  color: "#8a7a65", border: "#ddd0b8" },
  { id: "matin", label: "🌅 07h–15h",      bg: "#fef3c7",      color: "#92400e", border: "#f59e0b" },
  { id: "soir",  label: "🌙 15h–23h",      bg: "#ede9fe",      color: "#5b21b6", border: "#8b5cf6" },
];

const ShiftPicker = ({ shift, onChange }) => (
  <div style={{marginBottom:10}}>
    <div style={{fontSize:10,color:"#8a7a65",fontFamily:"'Inter','Segoe UI',system-ui,sans-serif",marginBottom:5,fontWeight:600}}>
      🕐 Créneau
    </div>
    <div style={{display:"flex",gap:4}}>
      {SHIFT_OPTIONS.map(opt=>(
        <button key={String(opt.id)} onClick={()=>onChange(opt.id)} style={{
          flex:1,padding:"4px 0",borderRadius:7,fontSize:10,fontWeight:700,
          fontFamily:"'Inter','Segoe UI',system-ui,sans-serif",cursor:"pointer",
          background:shift===opt.id?opt.bg:"transparent",
          color:shift===opt.id?opt.color:"#8a7a65",
          border:`1.5px solid ${shift===opt.id?opt.border:"#ddd0b8"}`,
          transition:"all 0.12s",
        }}>{opt.label}</button>
      ))}
    </div>
  </div>
);

// Plages XP, salaire et taux de spécialité des candidats selon le niveau resto
const _candidateXpRange  = (lv) => [[0,100],[80,350],[300,800],[700,1500],[1200,2500]][Math.min(Math.floor(lv/5),4)];
const _candidateSalRange = (lv) => [[10,13],[11,15],[13,17],[15,20],[18,25]][Math.min(Math.floor(lv/5),4)];
const _candidateSpecRate = (lv) => lv<5?0.10:lv<10?0.25:lv<20?0.40:0.60;




export function ServersView({servers,setServers,tables,clockNow,restoLvN,cash,setCash,addTx,addToast,candidatePool=[],setCandidatePool,candidateDate="",setCandidateDate,kitchen,setKitchen,commisPool=[],setCommisPool=()=>{},commisPoolDate="",setCommisPoolDate=()=>{},bp={}}){
  const { t: tr, lang } = useLang();

  /* ── État chef / commis ────────────────────────────── */
  const [chefModal,setChefModal]=useState(false);      // false | "train" | "confirmReplace" | "replace"
  const [commisHireSlot,setCommisHireSlot]=useState(null);
  const [commisConfirmSlot,setCommisConfirmSlot]=useState(null);

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

  const [staffFilter,setStaffFilter]=useState("cuisine"); // "cuisine" | "salle"

  /* ── Chefs supplémentaires ─────────────────────────── */
  const [chefHireIdx,setChefHireIdx]=useState(null);
  const [chefConfirmIdx,setChefConfirmIdx]=useState(null);
  const [chefPool,setChefPool]=useState([]);
  const [chefPoolDate,setChefPoolDate]=useState("");

  const buildAdditionalChefPool=(dateStr)=>{
    let seed=dateStr.split("").reduce((a,c)=>a+c.charCodeAt(0),0)+99;
    const rng=()=>{seed=(seed*9301+49297)%233280;return seed/233280;};
    const fn=["Baptiste","Cédric","Élodie","Franck","Gaëtan","Héloïse","Ivan","Julie","Karim","Laura","Marc","Nadia","Olivier","Pauline","Quentin","Rachel","Sébastien","Tania"];
    const ln=["Aubert","Besson","Collet","Dumas","Évrard","Fournier","Gros","Hamelin","Imbert","Jourdain","Kilic","Leconte","Moulin","Nguyen","Ortega","Pasquier"];
    return Array.from({length:4},(_,i)=>{
      const lvl=Math.min(3,Math.floor(rng()*4));
      const xpBase=[0,120,380,830][lvl];
      const salary=Math.round(18+lvl*5+rng()*6);
      const aclD=CHEF_LVL[lvl];
      return{
        id:`acp-${dateStr}-${i}`,
        name:fn[Math.floor(rng()*fn.length)]+" "+ln[Math.floor(rng()*ln.length)],
        totalXp:xpBase+Math.round(rng()*80),
        salary,
        hireCost:Math.round(salary*5),
        lvl,
        icon:aclD?.icon||"🧑‍🍳",
        lvlName:aclD?.name||"Apprenti",
        lvlColor:aclD?.color||C.muted,
      };
    });
  };

  useEffect(()=>{
    if(chefHireIdx===null)return;
    const today=new Date().toLocaleDateString("fr-FR");
    if(chefPoolDate===today&&chefPool.length>0)return;
    setChefPool(buildAdditionalChefPool(today));
    setChefPoolDate(today);
  },[chefHireIdx]);

  return(
    <div>

      {/* ══ Toggle Cuisine / Salle ══ */}
      <div style={{display:"flex",gap:6,marginBottom:16,background:C.bg,
        border:`1px solid ${C.border}`,borderRadius:11,padding:4,width:"fit-content"}}>
        {[{id:"cuisine",icon:"👨‍🍳",label:"Cuisine"},{id:"salle",icon:"👤",label:"Salle"}].map(f=>{
          const active=staffFilter===f.id;
          return(
            <button key={f.id} onClick={()=>setStaffFilter(f.id)} style={{
              display:"flex",alignItems:"center",gap:6,
              padding:"6px 16px",borderRadius:8,
              background:active?C.surface:"transparent",
              border:active?`1px solid ${C.border}`:"1px solid transparent",
              color:active?C.ink:C.muted,
              fontSize:12,fontWeight:active?700:500,fontFamily:F.body,
              cursor:"pointer",boxShadow:active?"0 1px 4px rgba(0,0,0,0.08)":"none",
              transition:"all 0.15s"}}>
              <span>{f.icon}</span>{f.label}
            </button>
          );
        })}
      </div>

      {/* ══ BRIGADE DE CUISINE ══ */}
      {kitchen&&staffFilter==="cuisine"&&(
        <>
          <div style={{fontSize:13,fontWeight:700,color:C.ink,fontFamily:F.title,marginBottom:8,display:"flex",alignItems:"center",gap:6}}>
            👨‍🍳 Brigade de cuisine
          </div>

          <div style={{display:"grid",gridTemplateColumns:bp.isMobile?"1fr":bp.isTablet?"1fr 1fr":"repeat(auto-fill,minmax(270px,1fr))",gap:bp.isMobile?10:13,marginBottom:16}}>

            {/* ── Carte Chef ── */}
            <Card accent={clD.color+"44"}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
                <div style={{display:"flex",gap:10,alignItems:"center"}}>
                  <div style={{width:44,height:44,background:clD.color+"1a",
                    border:`2px solid ${clD.color}33`,borderRadius:12,
                    display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,
                    position:"relative"}}>
                    {clD.icon}
                    <div style={{position:"absolute",bottom:-5,right:-5,
                      width:18,height:18,borderRadius:"50%",fontSize:10,
                      background:C.surface,border:`1.5px solid ${brigMoraleColor}`,
                      display:"flex",alignItems:"center",justifyContent:"center"}}>
                      {brigMoraleIcon}
                    </div>
                  </div>
                  <div>
                    <div style={{fontSize:14,fontWeight:600,color:C.ink,fontFamily:F.title}}>{chf.name}</div>
                    <div style={{display:"flex",gap:5,marginTop:4,flexWrap:"wrap"}}>
                      <Badge color={clD.color} sm>{clD.name} N{cl.l}</Badge>
                      <Badge color={C.amber} bg={C.amberP} sm>⚡×{clD.speed}</Badge>
                    </div>
                  </div>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{fontSize:13,fontWeight:700,color:C.ink,fontFamily:F.title}}>
                    {slotsLeft}/{maxConcurrent}<span style={{fontSize:10,color:C.muted}}> 🔥</span>
                  </div>
                  <div style={{fontSize:10,color:C.muted,fontFamily:F.body}}>🍽 {kitchen.totalDishes}</div>
                </div>
              </div>

              {/* Barre XP chef */}
              <div style={{marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",
                  fontSize:10,color:C.muted,marginBottom:4,fontFamily:F.body}}>
                  <span>XP · Niv.{cl.l}</span>
                  <span style={{color:clD.color,fontWeight:600}}>{cl.r}/{cl.n}</span>
                </div>
                <XpBar xp={cl.r} needed={cl.n} color={clD.color}/>
              </div>

              {/* Moral brigade */}
              <div style={{marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",
                  fontSize:10,marginBottom:4,fontFamily:F.body}}>
                  <span style={{color:C.muted}}>{tr("kitchen.moral")} {brigMoraleIcon}</span>
                  <span style={{fontWeight:700,color:brigMoraleColor}}>{brigMorale}/100</span>
                </div>
                <div style={{height:6,background:C.border,borderRadius:99,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${brigMorale}%`,background:brigMoraleColor,
                    borderRadius:99,transition:"width 0.5s ease"}}/>
                </div>
                {brigMorale>=70&&<span style={{fontSize:9,color:C.green,fontFamily:F.body,fontWeight:600,marginTop:3,display:"block"}}>{tr("kitchen.speedBoost")}</span>}
                {brigMorale<30&&<span style={{fontSize:9,color:C.red,fontFamily:F.body,fontWeight:600,marginTop:3,display:"block"}}>{tr("kitchen.speedPenalty")}</span>}
              </div>

              <div style={{fontSize:11,color:C.muted,marginBottom:12,fontFamily:F.body}}>
                💶 {chf.salary}€/h
              </div>

              <ShiftPicker shift={chf.shift??null} onChange={s=>setKitchen(k=>({...k,chef:{...k.chef,shift:s}}))}/>
              <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
                <Btn sm v="navy" onClick={()=>setChefModal("train")} icon="📚">{tr("kitchen.trainChef")}</Btn>
                <Btn sm v="danger" onClick={()=>setChefModal("confirmReplace")}>{tr("servers.fire")}</Btn>
                {brigMorale<60&&(
                  <Btn sm v={cash>=150?"amber":"disabled"} disabled={cash<150}
                    onClick={()=>{
                      const cost=150;
                      if(cash<cost)return;
                      setCash(c=>+(c-cost).toFixed(2));
                      addTx("dépense","Prime brigade",cost);
                      setKitchen(k=>({...k,morale:Math.min(100,(k.morale??100)+30)}));
                      addToast({icon:"🎉",title:tr("kitchen.incentive"),msg:tr("kitchen.incentiveDesc"),color:C.green,tab:"servers",silent:true});
                    }}>
                    💸 Prime 150€
                  </Btn>
                )}
              </div>
            </Card>

            {/* ── Cartes Commis ── */}
            {Array.from({length:maxCommisSlots},(_,idx)=>{
              const cm=kitchen.commis[idx];
              const locked=idx>=unlockedCommis;
              if(cm){
                const cml=commisLv(cm.totalXp);
                const cmlD=COMMIS_LVL[Math.min(cml.l,COMMIS_LVL.length-1)];
                const specColor=cm.specialty?.cat==="Desserts"?C.purple:cm.specialty?.cat==="Plats"?C.terra:cm.specialty?.cat==="Entrées"?C.green:C.navy;
                const specBg=cm.specialty?.cat==="Desserts"?C.purpleP:cm.specialty?.cat==="Plats"?C.terraP:cm.specialty?.cat==="Entrées"?C.greenP:C.navyP;
                return(
                  <Card key={cm.id} accent={cmlD.color+"44"}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
                      <div style={{display:"flex",gap:10,alignItems:"center"}}>
                        <div style={{width:44,height:44,background:cmlD.color+"1a",
                          border:`2px solid ${cmlD.color}33`,borderRadius:12,
                          display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>
                          {cmlD.icon}
                        </div>
                        <div>
                          <div style={{fontSize:14,fontWeight:600,color:C.ink,fontFamily:F.title}}>{cm.name}</div>
                          <div style={{display:"flex",gap:5,marginTop:4,flexWrap:"wrap"}}>
                            <Badge color={cmlD.color} sm>{cmlD.name}</Badge>
                          </div>
                        </div>
                      </div>
                      <div style={{textAlign:"right",flexShrink:0}}>
                        <div style={{fontSize:11,color:C.muted,fontFamily:F.body}}>💶 {cm.salary}€/h</div>
                      </div>
                    </div>

                    {cm.specialty?(
                      <div style={{background:specBg,border:`1px solid ${specColor}33`,
                        borderRadius:8,padding:"6px 10px",marginBottom:10,
                        display:"flex",alignItems:"center",gap:8}}>
                        <span style={{fontSize:16}}>{cm.specialty.icon}</span>
                        <div style={{flex:1}}>
                          <div style={{fontSize:11,fontWeight:700,color:specColor,fontFamily:F.body}}>{cm.specialty.name}</div>
                          {cm.specialty.desc&&<div style={{fontSize:9,color:C.muted,fontFamily:F.body}}>{cm.specialty.desc}</div>}
                        </div>
                      </div>
                    ):(
                      <div style={{background:C.bg,border:`1px dashed ${C.border}`,
                        borderRadius:8,padding:"6px 10px",marginBottom:10,
                        fontSize:10,color:C.muted,fontFamily:F.body}}>
                        Pas de spécialité
                      </div>
                    )}

                    <div style={{marginBottom:10}}>
                      <div style={{display:"flex",justifyContent:"space-between",
                        fontSize:10,color:C.muted,marginBottom:4,fontFamily:F.body}}>
                        <span>XP · Niv.{cml.l}</span>
                        <span style={{color:cmlD.color,fontWeight:600}}>{cml.r}/{cml.n}</span>
                      </div>
                      <XpBar xp={cml.r} needed={cml.n} color={cmlD.color}/>
                    </div>

                    <ShiftPicker shift={cm.shift??null} onChange={s=>setKitchen(k=>({...k,commis:k.commis.map((c,i)=>i===idx?{...c,shift:s}:c)}))}/>
                    <div style={{display:"flex",gap:7}}>
                      <Btn sm v="danger" onClick={()=>setCommisConfirmSlot(idx)}>{tr("servers.fire")}</Btn>
                    </div>
                  </Card>
                );
              }
              if(!locked){
                return(
                  <div key={`hire-${idx}`} onClick={()=>setCommisHireSlot(idx)}
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
                    <div style={{fontSize:12,color:C.green,fontWeight:600,fontFamily:F.body}}>{tr("kitchen.addCommis")} {idx+1}</div>
                    <div style={{fontSize:10,color:C.muted,fontFamily:F.body,textAlign:"center"}}>{tr("servers.clickHire")}</div>
                  </div>
                );
              }
              const unlockLvlIdx=CHEF_LVL.findIndex(l=>l.commis>idx);
              const unlockName=unlockLvlIdx>=0?CHEF_LVL[unlockLvlIdx].name:"?";
              return(
                <div key={`locked-${idx}`} style={{background:C.bg,border:`1.5px dashed ${C.border}`,
                  borderRadius:14,padding:"18px 16px",
                  display:"flex",flexDirection:"column",alignItems:"center",
                  justifyContent:"center",minHeight:160,gap:8,opacity:0.6}}>
                  <span style={{fontSize:32}}>🔒</span>
                  <div style={{fontSize:11,color:C.muted,fontFamily:F.body,textAlign:"center"}}>{tr("kitchen.commis")} {idx+1}</div>
                  <span style={{fontSize:11,background:C.bg,color:C.muted,
                    border:`1px solid ${C.border}`,borderRadius:6,padding:"2px 8px",
                    fontFamily:F.body,fontWeight:600}}>
                    {unlockName}
                  </span>
                </div>
              );
            })}
          </div>

          {/* ── Chefs supplémentaires ── */}
          {(()=>{
            const maxChefSlots=restoLvN>=8?3:restoLvN>=3?2:1;
            return(
              <>
                <div style={{fontSize:13,fontWeight:700,color:C.ink,fontFamily:F.title,marginTop:16,marginBottom:8,display:"flex",alignItems:"center",gap:6}}>
                  🧑‍🍳 Chefs supplémentaires
                  <span style={{fontSize:10,background:C.amberP,color:C.amber,border:`1px solid ${C.amber}33`,borderRadius:6,padding:"1px 8px",fontWeight:600}}>
                    {(kitchen.chefs??[]).length}/{maxChefSlots} slot{maxChefSlots>1?"s":""}
                  </span>
                </div>
                <div style={{display:"grid",gridTemplateColumns:bp.isMobile?"1fr":bp.isTablet?"1fr 1fr":"repeat(auto-fill,minmax(270px,1fr))",gap:bp.isMobile?10:13,marginBottom:16}}>
                  {Array.from({length:maxChefSlots},(_,idx)=>{
                    const ac=(kitchen.chefs??[])[idx];
                    if(ac){
                      const acl=chefLv(ac.totalXp??0);
                      const aclD=CHEF_LVL[Math.min(acl.l,CHEF_LVL.length-1)];
                      const severance=Math.round((ac.salary||20)*2);
                      return(
                        <Card key={ac.id} accent={aclD.color+"44"}>
                          <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
                            <div style={{display:"flex",gap:10,alignItems:"center"}}>
                              <div style={{width:40,height:40,background:aclD.color+"1a",
                                border:`2px solid ${aclD.color}33`,borderRadius:11,
                                display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>
                                {aclD.icon}
                              </div>
                              <div>
                                <div style={{fontSize:13,fontWeight:600,color:C.ink,fontFamily:F.title}}>{ac.name}</div>
                                <div style={{display:"flex",gap:5,marginTop:3}}>
                                  <Badge color={aclD.color} sm>{aclD.name}</Badge>
                                  <Badge color={C.amber} bg={C.amberP} sm>💶 {ac.salary}€/h</Badge>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div style={{marginBottom:10}}>
                            <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:C.muted,marginBottom:4,fontFamily:F.body}}>
                              <span>XP · Niv.{acl.l}</span>
                              <span style={{color:aclD.color,fontWeight:600}}>{acl.r}/{acl.n}</span>
                            </div>
                            <XpBar xp={acl.r} needed={acl.n} color={aclD.color}/>
                          </div>
                          <ShiftPicker shift={ac.shift??null} onChange={s=>setKitchen(k=>({...k,chefs:(k.chefs??[]).map((c,i)=>i===idx?{...c,shift:s}:c)}))}/>
                          <div style={{display:"flex",gap:7}}>
                            <Btn sm v="danger" onClick={()=>setChefConfirmIdx(idx)}>{tr("servers.fire")}</Btn>
                          </div>
                        </Card>
                      );
                    }
                    return(
                      <div key={`chef-empty-${idx}`} style={{background:C.bg,border:`1.5px dashed ${C.border}`,
                        borderRadius:14,padding:"18px 16px",display:"flex",flexDirection:"column",
                        alignItems:"center",justifyContent:"center",minHeight:140,gap:8}}>
                        <span style={{fontSize:28}}>🧑‍🍳</span>
                        <div style={{fontSize:11,color:C.muted,fontFamily:F.body}}>Poste libre</div>
                        <Btn sm v="amber" onClick={()=>setChefHireIdx(idx)}>+ Recruter</Btn>
                      </div>
                    );
                  })}
                </div>
              </>
            );
          })()}

        </>
      )}

      {staffFilter==="salle"&&<SalleSection servers={servers} setServers={setServers} tables={tables} clockNow={clockNow} restoLvN={restoLvN} cash={cash} setCash={setCash} addTx={addTx} addToast={addToast} candidatePool={candidatePool} setCandidatePool={setCandidatePool} candidateDate={candidateDate} setCandidateDate={setCandidateDate} bp={bp}/>}
      {/* ══ MODAL : Confirmation licenciement commis ══ */}
      {commisConfirmSlot!==null&&(()=>{
        const cm=kitchen?.commis?.[commisConfirmSlot];
        if(!cm) return null;
        const cml=commisLv(cm.totalXp);
        const cmlD=COMMIS_LVL[Math.min(cml.l,COMMIS_LVL.length-1)];
        const severance=(cm.salary||8)*24;
        const canAffordFire=cash>=severance;
        return(
          <Modal title={tr("servers.fireTitle")} onClose={()=>setCommisConfirmSlot(null)}>
            <div style={{display:"flex",flexDirection:"column",gap:16}}>

              {/* Profil commis */}
              <div style={{display:"flex",gap:14,alignItems:"center",
                background:C.bg,borderRadius:12,padding:"14px 16px"}}>
                <div style={{width:50,height:50,background:cmlD.color+"1a",
                  border:`2px solid ${cmlD.color}33`,borderRadius:12,
                  display:"flex",alignItems:"center",justifyContent:"center",fontSize:26}}>
                  {cmlD.icon}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:16,fontWeight:700,color:C.ink,fontFamily:F.title}}>{cm.name}</div>
                  <div style={{fontSize:11,color:C.muted,fontFamily:F.body,marginTop:3}}>
                    {cmlD.name} · Niv.{cml.l} · {cm.salary}€/h
                    {cm.specialty&&` · ${cm.specialty.icon} ${cm.specialty.name}`}
                  </div>
                </div>
              </div>

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
                      {cm.salary||8}€/h × 24h (1 mois)
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

              {/* Boutons */}
              <div style={{display:"flex",gap:10}}>
                <Btn full v="ghost" onClick={()=>setCommisConfirmSlot(null)}>
                  {tr("app.cancel")}
                </Btn>
                <Btn full v={canAffordFire?"danger":"disabled"} disabled={!canAffordFire}
                  onClick={()=>{
                    setCash(c=>+(c-severance).toFixed(2));
                    addTx("dépense",`Indemnité licenciement — ${cm.name}`,severance);
                    setCommisConfirmSlot(null);
                    setCommisHireSlot(commisConfirmSlot);
                  }} icon="👋">
                  {canAffordFire?tr("servers.fireConfirm",{cost:severance}):tr("servers.noFunds")}
                </Btn>
              </div>
            </div>
          </Modal>
        );
      })()}

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
                        const newEntry={id:Date.now(),name:cand.name,totalXp:cand.totalXp,status:"actif",task:null,salary:cand.salary,specialty:cand.specialty,shift:null};
                        if(slot<newCommis.length) newCommis[slot]=newEntry;
                        else newCommis.push(newEntry);
                        return{...k,commis:newCommis};
                      });
                      setCommisPool(p=>p.filter(x=>x.id!==cand.id));
                      addToast({icon:"🔪",title:tr("kitchen.recruited",{name:cand.name}),msg:`−${cand.hireCost}€${cand.specialty?" · "+cand.specialty.icon+" "+cand.specialty.name:""}`,color:C.green,tab:"servers",silent:true});
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

      {/* ══ MODAL : Confirmation licenciement chef suppl. ══ */}
      {chefConfirmIdx!==null&&(()=>{
        const ac=(kitchen?.chefs??[])[chefConfirmIdx];
        if(!ac)return null;
        const severance=Math.round((ac.salary||20)*2);
        const canAffordFire=cash>=severance;
        return(
          <Modal title={`Licencier ${ac.name} ?`} onClose={()=>setChefConfirmIdx(null)}>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <div style={{background:C.redP,border:`1px solid ${C.red}22`,borderRadius:8,
                padding:"10px 14px",fontSize:11,color:C.red,fontFamily:F.body,fontWeight:600}}>
                Indemnité de départ : {severance}€
              </div>
              <div style={{display:"flex",gap:10}}>
                <Btn full v="ghost" onClick={()=>setChefConfirmIdx(null)}>{tr("app.cancel")}</Btn>
                <Btn full v={canAffordFire?"danger":"disabled"} disabled={!canAffordFire}
                  onClick={()=>{
                    setCash(c=>+(c-severance).toFixed(2));
                    addTx("dépense",`Indemnité licenciement — ${ac.name}`,severance);
                    setKitchen(k=>({...k,chefs:(k.chefs??[]).filter((_,i)=>i!==chefConfirmIdx)}));
                    setChefConfirmIdx(null);
                  }} icon="👋">
                  {canAffordFire?`Confirmer (−${severance}€)`:"Fonds insuffisants"}
                </Btn>
              </div>
            </div>
          </Modal>
        );
      })()}

      {/* ══ MODAL : Recruter un chef supplémentaire ══ */}
      {chefHireIdx!==null&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center"}}
          onClick={()=>setChefHireIdx(null)}>
          <div style={{background:C.card,borderRadius:16,padding:24,maxWidth:420,width:"90%",boxShadow:"0 8px 40px rgba(0,0,0,0.25)"}}
            onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:14,fontWeight:800,color:C.ink,fontFamily:F.title,marginBottom:4,display:"flex",justifyContent:"space-between"}}>
              🧑‍🍳 Recruter un chef
              <button onClick={()=>setChefHireIdx(null)} style={{background:"none",border:"none",cursor:"pointer",fontSize:18,color:C.muted}}>✕</button>
            </div>
            <div style={{fontSize:10,color:C.muted,fontFamily:F.body,marginBottom:14}}>Candidats disponibles aujourd'hui</div>
            {chefPool.length===0&&<div style={{color:C.muted,fontSize:11,fontFamily:F.body,textAlign:"center",padding:20}}>Aucun candidat disponible</div>}
            <div style={{display:"flex",flexDirection:"column",gap:9}}>
              {chefPool.map(cand=>{
                const canAfford=cash>=cand.hireCost;
                return(
                  <div key={cand.id} style={{background:C.bg,border:`1.5px solid ${C.border}`,borderRadius:11,padding:"9px 13px",
                    display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}>
                    <div style={{display:"flex",alignItems:"center",gap:9}}>
                      <span style={{fontSize:20}}>{cand.icon}</span>
                      <div>
                        <div style={{fontSize:12,fontWeight:700,color:C.ink,fontFamily:F.body}}>{cand.name}</div>
                        <div style={{fontSize:10,color:C.muted,fontFamily:F.body}}>
                          <span style={{color:cand.lvlColor,fontWeight:700}}>{cand.lvlName}</span>
                          {" · "}{cand.salary}€/h
                        </div>
                      </div>
                    </div>
                    <button disabled={!canAfford} onClick={()=>{
                      if(!canAfford)return;
                      setCash(c=>+(c-cand.hireCost).toFixed(2));
                      addTx("achat",`Recrutement chef : ${cand.name}`,cand.hireCost);
                      setKitchen(k=>{
                        const newChefs=[...(k.chefs??[])];
                        const newEntry={id:Date.now(),name:cand.name,totalXp:cand.totalXp,status:"actif",salary:cand.salary,shift:null};
                        if(chefHireIdx<newChefs.length)newChefs[chefHireIdx]=newEntry;
                        else newChefs.push(newEntry);
                        return{...k,chefs:newChefs};
                      });
                      setChefPool(p=>p.filter(x=>x.id!==cand.id));
                      addToast&&addToast({icon:"🧑‍🍳",title:`${cand.name} recruté(e) !`,msg:`−${cand.hireCost}€`,color:C.green,tab:"servers",silent:true});
                      setChefHireIdx(null);
                    }} style={{
                      background:canAfford?C.amber:"#e5e7eb",color:canAfford?"#fff":"#9ca3af",
                      border:"none",borderRadius:8,padding:"6px 14px",
                      fontSize:12,fontWeight:700,fontFamily:F.body,cursor:canAfford?"pointer":"not-allowed"}}>
                      {canAfford?`${cand.hireCost}€`:"Trop cher"}
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