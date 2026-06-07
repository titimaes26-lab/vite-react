import { memo } from "react";
import { C, F, CHEF_LVL } from "../constants/gameData.js";
import { Btn } from "../components/ui/index.js";
import { chefLv } from "../utils/levelUtils.js";
import { useServersView } from "./servers/useServersView.js";
import { ChefCard } from "./servers/ChefCard.jsx";
import { CommisSlotCard } from "./servers/CommisSlotCard.jsx";
import { CommisFireModal } from "./servers/CommisFireModal.jsx";
import { CommisHireModal } from "./servers/CommisHireModal.jsx";
import { AdditionalChefFireModal, AdditionalChefHireModal } from "./servers/AdditionalChefHireModal.jsx";
import { AdditionalChefCard } from "./servers/AdditionalChefCard.jsx";
import { SalleSection } from "./servers/SalleSection.jsx";

export const ServersView = memo(function ServersView({
  servers, setServers, tables, restoLvN=0,
  cash, setCash, addTx, addToast,
  candidatePool=[], setCandidatePool, candidateDate="", setCandidateDate,
  kitchen, setKitchen,
  commisPool=[], setCommisPool=()=>{}, commisPoolDate="", setCommisPoolDate=()=>{},
  bp={},
}) {
  const {
    chefModal, setChefModal,
    commisHireSlot, setCommisHireSlot,
    commisConfirmSlot, setCommisConfirmSlot,
    staffFilter, setStaffFilter,
    chefHireIdx, setChefHireIdx,
    chefConfirmIdx, setChefConfirmIdx,
    chefPool, brigMorale, brigMoraleColor, brigMoraleIcon, chf,
    hireCommis, hireChef,
  } = useServersView({ kitchen, setKitchen, cash, setCash, addTx, addToast, restoLvN,
    commisPool, setCommisPool, commisPoolDate, setCommisPoolDate });

  const cl = chefLv(chf.totalXp ?? 0);
  const clD = CHEF_LVL[Math.min(cl.l, CHEF_LVL.length-1)];
  const unlockedCommis = clD?.commis ?? 0;
  const maxCommisSlots = Math.max(...CHEF_LVL.map(l=>l.commis));
  const maxChefSlots = restoLvN>=8?3:restoLvN>=3?2:1;
  const gridCols = bp.isMobile?"1fr":bp.isTablet?"1fr 1fr":"repeat(auto-fill,minmax(270px,1fr))";
  const gridGap = bp.isMobile?10:13;

  return (
    <div>
      <div style={{display:"flex",gap:6,marginBottom:16,background:C.bg,border:`1px solid ${C.border}`,borderRadius:11,padding:4,width:"fit-content"}}>
        {[{id:"cuisine",icon:"👨‍🍳",label:"Cuisine"},{id:"salle",icon:"👤",label:"Salle"}].map(f=>{
          const active=staffFilter===f.id;
          return(
            <button key={f.id} onClick={()=>setStaffFilter(f.id)} style={{
              display:"flex",alignItems:"center",gap:6,padding:"6px 16px",borderRadius:8,
              background:active?C.surface:"transparent",
              border:active?`1px solid ${C.border}`:"1px solid transparent",
              color:active?C.ink:C.muted,fontSize:12,fontWeight:active?700:500,fontFamily:F.body,
              cursor:"pointer",boxShadow:active?"0 1px 4px rgba(0,0,0,0.08)":"none",transition:"all 0.15s"}}>
              <span>{f.icon}</span>{f.label}
            </button>
          );
        })}
      </div>

      {kitchen && staffFilter==="cuisine" && (
        <>
          <div style={{fontSize:13,fontWeight:700,color:C.ink,fontFamily:F.title,marginBottom:8,display:"flex",alignItems:"center",gap:6}}>
            👨‍🍳 Brigade de cuisine
          </div>
          <div style={{display:"grid",gridTemplateColumns:gridCols,gap:gridGap,marginBottom:16}}>
            <ChefCard chf={chf} kitchen={kitchen} cash={cash} setCash={setCash} addTx={addTx}
              addToast={addToast} setKitchen={setKitchen} setChefModal={setChefModal}
              brigMorale={brigMorale} brigMoraleColor={brigMoraleColor} brigMoraleIcon={brigMoraleIcon}/>
            {Array.from({length:maxCommisSlots},(_,idx)=>(
              <CommisSlotCard key={`commis-${idx}`} idx={idx} cm={kitchen.commis?.[idx]}
                locked={idx>=unlockedCommis} unlockedCommis={unlockedCommis}
                setKitchen={setKitchen} setCommisHireSlot={setCommisHireSlot}
                setCommisConfirmSlot={setCommisConfirmSlot}/>
            ))}
          </div>

          <div style={{fontSize:13,fontWeight:700,color:C.ink,fontFamily:F.title,marginTop:16,marginBottom:8,display:"flex",alignItems:"center",gap:6}}>
            🧑‍🍳 Chefs supplémentaires
            <span style={{fontSize:10,background:C.amberP,color:C.amber,border:`1px solid ${C.amber}33`,borderRadius:6,padding:"1px 8px",fontWeight:600}}>
              {(kitchen.chefs??[]).length}/{maxChefSlots} slot{maxChefSlots>1?"s":""}
            </span>
          </div>
          <div style={{display:"grid",gridTemplateColumns:gridCols,gap:gridGap,marginBottom:16}}>
            {Array.from({length:maxChefSlots},(_,idx)=>{
              const ac=(kitchen.chefs??[])[idx];
              if(ac) return <AdditionalChefCard key={ac.id} idx={idx} ac={ac} setKitchen={setKitchen} setChefConfirmIdx={setChefConfirmIdx}/>;
              return(
                <div key={`chef-empty-${idx}`} style={{background:C.bg,border:`1.5px dashed ${C.border}`,borderRadius:14,padding:"18px 16px",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:140,gap:8}}>
                  <span style={{fontSize:28}}>🧑‍🍳</span>
                  <div style={{fontSize:11,color:C.muted,fontFamily:F.body}}>Poste libre</div>
                  <Btn sm v="amber" onClick={()=>setChefHireIdx(idx)}>+ Recruter</Btn>
                </div>
              );
            })}
          </div>
        </>
      )}

      {staffFilter==="salle" && (
        <SalleSection servers={servers} setServers={setServers} tables={tables} restoLvN={restoLvN}
          cash={cash} setCash={setCash} addTx={addTx} addToast={addToast}
          candidatePool={candidatePool} setCandidatePool={setCandidatePool}
          candidateDate={candidateDate} setCandidateDate={setCandidateDate} bp={bp}/>
      )}

      {commisConfirmSlot!==null && (
        <CommisFireModal slot={commisConfirmSlot} kitchen={kitchen} cash={cash} setCash={setCash}
          addTx={addTx} setCommisConfirmSlot={setCommisConfirmSlot} setCommisHireSlot={setCommisHireSlot}/>
      )}
      {commisHireSlot!==null && (
        <CommisHireModal commisPool={commisPool} cash={cash} setCommisHireSlot={setCommisHireSlot} hireCommis={hireCommis}/>
      )}
      {chefConfirmIdx!==null && (
        <AdditionalChefFireModal idx={chefConfirmIdx} kitchen={kitchen} cash={cash} setCash={setCash}
          addTx={addTx} setKitchen={setKitchen} setChefConfirmIdx={setChefConfirmIdx}/>
      )}
      {chefHireIdx!==null && (
        <AdditionalChefHireModal chefPool={chefPool} cash={cash} setChefHireIdx={setChefHireIdx} hireChef={hireChef}/>
      )}
    </div>
  );
});
