import { useState, useCallback } from "react";
import { C, SERVER_SLOTS_BY_LEVEL, STAFF_QUALITY_REQ } from "../../constants/gameData.js";
import { SRV_SPECIALTIES, getMaxMoral } from "../../constants/serverConstants.js";
import { useLang } from "../../i18n/index.jsx";
import { srvLv, srvTierCap, SRV_MAX_XP } from "../../utils/levelUtils.js";

const _candidateXpRange  = (lv) => [[0,100],[80,350],[300,800],[700,1500],[1200,2500]][Math.min(Math.floor(lv/5),4)];
const _candidateSalRange = (lv) => [[10,13],[11,15],[13,17],[15,20],[18,25]][Math.min(Math.floor(lv/5),4)];
const _candidateSpecRate = (lv) => lv<5?0.10:lv<10?0.25:lv<20?0.40:0.60;

function generatePool(dateStr, restoLv) {
  let seed = dateStr.split("").reduce((a,c)=>a+c.charCodeAt(0), 0) + restoLv * 17;
  const rng = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  const names1 = ["Alice","Bruno","Clara","Denis","Elena","Félix","Gina","Hugo","Iris","Jean","Katia","Luc","Mona","Noé","Olivia","Paul","Rosa","Sam","Tina","Vera"];
  const names2 = ["Martin","Dupont","Bernard","Thomas","Robert","Petit","Moreau","Simon","Laurent","Michel"];
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
      id: `${dateStr}-${i}`, name, salary, totalXp:xp, moral,
      rating: +(3.5 + rng()*1.5).toFixed(1),
      specialty: hasSpec && xp >= 80 ? SRV_SPECIALTIES[specIdx] : null,
      hireCost: salary * 3,
    };
  });
}

export function useSalleSection({
  servers, setServers, restoLvN, cash, setCash, addTx, addToast,
  candidatePool, setCandidatePool, candidateDate, setCandidateDate,
}) {
  const { t: tr } = useLang();
  const [modal,   setModal]   = useState(false);
  const [fireId,  setFireId]  = useState(null);
  const [trainId, setTrainId] = useState(null);

  const maxSlots  = SERVER_SLOTS_BY_LEVEL[restoLvN||0] ?? 2;
  const tierCap   = srvTierCap(restoLvN||0);
  const activeReq = STAFF_QUALITY_REQ.find(r => (restoLvN||0) >= r.atLv) || null;
  const canHire   = servers.length < maxSlots;
  const nextReq   = STAFF_QUALITY_REQ.find(r => (restoLvN||0) < r.atLv) || null;
  const reqMet    = !activeReq || servers.filter(s => srvLv(s.totalXp||0).l >= activeReq.tier).length >= activeReq.count;

  const doTrain = (sv, domain, level) => {
    if(cash < level.cost){
      addToast&&addToast({icon:"❌",title:tr("servers.noFunds"),msg:tr("servers.noFundsTrain",{cost:level.cost}),color:C.red,tab:"servers"});
      return;
    }
    const prevLevel = (sv.trainings||{})[domain.id] || 0;
    if(prevLevel >= domain.levels.length){
      addToast&&addToast({icon:"✅",title:tr("servers.trainingMax"),msg:tr("servers.trainingMaxMsg",{name:sv.name}),color:C.muted,tab:"servers",silent:true});
      return;
    }
    setCash&&setCash(c=>+(c-level.cost).toFixed(2));
    addTx&&addTx("achat",`Formation ${domain.name} N${level.l} — ${sv.name}`,level.cost);
    setServers(p=>p.map(s=>{
      if(s.id!==sv.id) return s;
      const newTrainings  = {...(s.trainings||{}), [domain.id]: level.l};
      const newXp         = Math.min(SRV_MAX_XP, s.totalXp + level.xp);
      const newMoral      = Math.min(getMaxMoral({...s,trainings:newTrainings}),(s.moral??100)+level.moralBonus);
      let newSpec         = s.specialty;
      let newSpecUpgraded = s.specialtyUpgraded;
      if(level.specialtyId){
        const sp = SRV_SPECIALTIES.find(x=>x.id===level.specialtyId);
        if(!s.specialty) newSpec = sp;
        else if(s.specialty.id===level.specialtyId && level.l===3 && !s.specialtyUpgraded) newSpecUpgraded = true;
      }
      return {...s, trainings:newTrainings, totalXp:newXp, moral:newMoral,
        specialty:newSpec, specialtyUpgraded:newSpecUpgraded, lastTrainedAt:Date.now()};
    }));
    addToast&&addToast({icon:domain.icon,
      title:tr("servers.trainingDone",{name:sv.name,domain:domain.name,level:level.l}),
      msg:tr("servers.trainingDoneMsg",{effect:level.effect,xp:level.xp,moral:level.moralBonus}),
      color:domain.color,tab:"servers",silent:true});
    setModal(false); setTrainId(null);
  };

  const openHire = () => {
    const today = new Date().toLocaleDateString("fr-FR");
    if(candidateDate !== today || candidatePool.length === 0){
      setCandidatePool(generatePool(today, restoLvN||0));
      setCandidateDate(today);
    }
    setModal("hire");
  };

  const hireCandidate = (candidate) => {
    if(servers.length >= maxSlots){
      addToast&&addToast({icon:"🚫",title:tr("servers.teamComplete"),msg:tr("servers.teamCompleteMsg"),color:C.red,tab:"servers",silent:true});
      return;
    }
    if(cash < candidate.hireCost){
      addToast&&addToast({icon:"❌",title:tr("servers.noFunds"),msg:tr("servers.noFundsHire",{cost:candidate.hireCost}),color:C.red,tab:"servers"});
      return;
    }
    setCash&&setCash(c=>+(c-candidate.hireCost).toFixed(2));
    addTx&&addTx("achat",`Recrutement — ${candidate.name}`,candidate.hireCost);
    setServers(p=>[...p,{id:Date.now(),name:candidate.name,status:"actif",
      totalXp:candidate.totalXp,rating:candidate.rating,salary:candidate.salary,
      moral:candidate.moral,specialty:candidate.specialty,shift:null}]);
    const remaining = candidatePool.filter(c=>c.id!==candidate.id);
    setCandidatePool(remaining);
    addToast&&addToast({icon:"👔",title:tr("servers.hired",{name:candidate.name}),
      msg:tr("servers.hiredMsg",{cost:candidate.hireCost,remaining:remaining.length,s:remaining.length>1?"s":""}),
      color:C.green,tab:"servers",silent:true});
    if(remaining.length === 0 || servers.length + 1 >= maxSlots) setModal(false);
  };

  const openTrain = useCallback((sv) => { setTrainId(sv.id); setModal("train"); }, []);
  const openFire  = useCallback((sv) => { setFireId(sv.id);  setModal("fire");  }, []);

  const doFire = () => {
    const sv = servers.find(s=>s.id===fireId);
    if(!sv) return;
    const severance = (sv.salary||12) * 24;
    if(cash < severance){
      addToast&&addToast({icon:"❌",title:tr("servers.noFunds"),msg:`${tr("servers.severance")} : ${severance}€`,color:C.red,tab:"servers"});
      return;
    }
    setCash&&setCash(c=>+(c-severance).toFixed(2));
    addTx&&addTx("dépense",`Indemnité licenciement — ${sv.name}`,severance);
    setServers(p=>p.filter(s=>s.id!==fireId));
    addToast&&addToast({icon:"👋",title:tr("servers.fired",{name:sv.name}),
      msg:tr("servers.firedMsg",{cost:severance}),color:C.terra,tab:"servers",silent:true});
    setModal(false); setFireId(null);
  };

  return {
    modal, setModal, fireId, trainId, setFireId, setTrainId,
    maxSlots, tierCap, activeReq, canHire, nextReq, reqMet,
    doTrain, openHire, hireCandidate, openTrain, openFire, doFire,
  };
}
