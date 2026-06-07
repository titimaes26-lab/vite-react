import { useState, useEffect } from "react";
import { C, CHEF_LVL, COMMIS_LVL, COMMIS_SPECIALTIES } from "../../constants/gameData.js";

export function useServersView({ kitchen, setKitchen, cash, setCash, addTx, addToast, restoLvN=0, commisPool=[], setCommisPool=()=>{}, commisPoolDate="", setCommisPoolDate=()=>{} }) {
  const [chefModal, setChefModal] = useState(false);
  const [commisHireSlot, setCommisHireSlot] = useState(null);
  const [commisConfirmSlot, setCommisConfirmSlot] = useState(null);
  const [staffFilter, setStaffFilter] = useState("cuisine");
  const [chefHireIdx, setChefHireIdx] = useState(null);
  const [chefConfirmIdx, setChefConfirmIdx] = useState(null);
  const [chefPool, setChefPool] = useState([]);
  const [chefPoolDate, setChefPoolDate] = useState("");

  const chf = kitchen?.chef ?? {};
  const brigMorale = kitchen?.morale ?? 100;
  const brigMoraleColor = brigMorale>=70?C.green:brigMorale>=40?C.amber:C.red;
  const brigMoraleIcon = brigMorale>=70?"😊":brigMorale>=40?"😐":brigMorale<20?"💀":"😓";

  const buildCommisPool = (dateStr) => {
    let seed=dateStr.split("").reduce((a,c)=>a+c.charCodeAt(0),0)+31;
    const rng=()=>{seed=(seed*9301+49297)%233280;return seed/233280;};
    const n1=["Ambre","Baptiste","Chloé","Dylan","Emma","Florian","Gaëlle","Hugo","Inès","Jules","Léa","Maxime","Nina","Oscar","Pauline","Robin","Sara","Théo"];
    const n2=["Martin","Dupont","Renard","Moreau","Simon","Laurent","Petit","Bernard","Thomas"];
    return Array.from({length:6},(_,i)=>{
      const spec=rng()<0.6?COMMIS_SPECIALTIES[Math.floor(rng()*COMMIS_SPECIALTIES.length)]:null;
      return{id:`cp-${dateStr}-${i}`,name:n1[Math.floor(rng()*n1.length)]+" "+n2[Math.floor(rng()*n2.length)],
        totalXp:Math.round(rng()*150),salary:Math.round(rng()*5+8),hireCost:Math.round(rng()*5+8)*3,specialty:spec};
    });
  };

  const buildAdditionalChefPool = (dateStr) => {
    let seed=dateStr.split("").reduce((a,c)=>a+c.charCodeAt(0),0)+99;
    const rng=()=>{seed=(seed*9301+49297)%233280;return seed/233280;};
    const fn=["Baptiste","Cédric","Élodie","Franck","Gaëtan","Héloïse","Ivan","Julie","Karim","Laura","Marc","Nadia","Olivier","Pauline","Quentin","Rachel","Sébastien","Tania"];
    const ln=["Aubert","Besson","Collet","Dumas","Évrard","Fournier","Gros","Hamelin","Imbert","Jourdain","Kilic","Leconte","Moulin","Nguyen","Ortega","Pasquier"];
    return Array.from({length:4},(_,i)=>{
      const lvl=Math.min(3,Math.floor(rng()*4));
      const xpBase=[0,120,380,830][lvl];
      const salary=Math.round(18+lvl*5+rng()*6);
      const aclD=CHEF_LVL[lvl];
      return{id:`acp-${dateStr}-${i}`,name:fn[Math.floor(rng()*fn.length)]+" "+ln[Math.floor(rng()*ln.length)],
        totalXp:xpBase+Math.round(rng()*80),salary,hireCost:Math.round(salary*5),
        lvl,icon:aclD?.icon||"🧑‍🍳",lvlName:aclD?.name||"Apprenti",lvlColor:aclD?.color||C.muted};
    });
  };

  useEffect(()=>{
    if(commisHireSlot===null)return;
    const today=new Date().toLocaleDateString("fr-FR");
    if(commisPoolDate===today&&commisPool.length>0)return;
    setCommisPool(buildCommisPool(today)); setCommisPoolDate(today);
  },[commisHireSlot]);

  useEffect(()=>{
    if(chefHireIdx===null)return;
    const today=new Date().toLocaleDateString("fr-FR");
    if(chefPoolDate===today&&chefPool.length>0)return;
    setChefPool(buildAdditionalChefPool(today)); setChefPoolDate(today);
  },[chefHireIdx]);

  const hireCommis = (cand) => {
    if(cash<cand.hireCost)return;
    setCash(c=>+(c-cand.hireCost).toFixed(2));
    addTx("achat",`Recrutement commis : ${cand.name}`,cand.hireCost);
    setKitchen(k=>{
      const slot=commisHireSlot; const newCommis=[...k.commis];
      const entry={id:Date.now(),name:cand.name,totalXp:cand.totalXp,status:"actif",task:null,salary:cand.salary,specialty:cand.specialty,shift:null};
      if(slot<newCommis.length)newCommis[slot]=entry; else newCommis.push(entry);
      return{...k,commis:newCommis};
    });
    setCommisPool(p=>p.filter(x=>x.id!==cand.id));
    addToast({icon:"🔪",title:`${cand.name} recruté(e) !`,msg:`−${cand.hireCost}€${cand.specialty?" · "+cand.specialty.icon+" "+cand.specialty.name:""}`,color:C.green,tab:"servers",silent:true});
    setCommisHireSlot(null);
  };

  const hireChef = (cand) => {
    if(cash<cand.hireCost)return;
    setCash(c=>+(c-cand.hireCost).toFixed(2));
    addTx("achat",`Recrutement chef : ${cand.name}`,cand.hireCost);
    setKitchen(k=>{
      const newChefs=[...(k.chefs??[])];
      const entry={id:Date.now(),name:cand.name,totalXp:cand.totalXp,status:"actif",salary:cand.salary,shift:null};
      if(chefHireIdx<newChefs.length)newChefs[chefHireIdx]=entry; else newChefs.push(entry);
      return{...k,chefs:newChefs};
    });
    setChefPool(p=>p.filter(x=>x.id!==cand.id));
    addToast&&addToast({icon:"🧑‍🍳",title:`${cand.name} recruté(e) !`,msg:`−${cand.hireCost}€`,color:C.green,tab:"servers",silent:true});
    setChefHireIdx(null);
  };

  return {
    chefModal, setChefModal, commisHireSlot, setCommisHireSlot,
    commisConfirmSlot, setCommisConfirmSlot,
    staffFilter, setStaffFilter,
    chefHireIdx, setChefHireIdx, chefConfirmIdx, setChefConfirmIdx,
    chefPool, chefPoolDate, brigMorale, brigMoraleColor, brigMoraleIcon, chf,
    hireCommis, hireChef,
  };
}
