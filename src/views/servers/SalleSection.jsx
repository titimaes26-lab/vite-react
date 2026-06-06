import { useClockNow } from "../../contexts/ClockContext.jsx";
import { C, F, SRV_LVL, RESTO_LVL, SERVER_SLOTS_BY_LEVEL } from "../../constants/gameData.js";
import { Btn } from "../../components/ui/index.js";
import { TIER_UNLOCK_LV } from "../../utils/levelUtils.js";
import { ServerCard } from "./ServerCard.jsx";
import { TrainModal } from "./TrainModal.jsx";
import { HireModal } from "./HireModal.jsx";
import { FireModal } from "./FireModal.jsx";
import { useSalleSection } from "./useSalleSection.js";

export function SalleSection({ servers, setServers, tables, restoLvN, cash, setCash, addTx, addToast, candidatePool, setCandidatePool, candidateDate, setCandidateDate, bp }) {
  const clockNow = useClockNow();
  const {
    tr, modal, setModal, fireId, trainId, setFireId, setTrainId,
    maxSlots, tierCap, activeReq, canHire, nextReq, reqMet,
    doTrain, openHire, hireCandidate, openTrain, openFire,
  } = useSalleSection({ servers, setServers, restoLvN, cash, setCash, addTx, addToast, candidatePool, setCandidatePool, candidateDate, setCandidateDate });

  const trainSv = modal==="train" ? servers.find(s=>s.id===trainId) : null;
  const fireSv  = modal==="fire"  ? servers.find(s=>s.id===fireId)  : null;

  return (
    <>
      {/* Header barre */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:10}}>
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

      {/* Bandeau exigences & plafond */}
      <div style={{display:"flex",gap:10,marginBottom:14,flexWrap:"wrap"}}>
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

        <div style={{flex:1,minWidth:200,
          background:activeReq?(reqMet?C.greenP:C.redP):C.bg,
          border:`1px solid ${activeReq?(reqMet?C.green:C.red):C.border}33`,
          borderRadius:10,padding:"9px 14px",display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:18}}>{activeReq?(reqMet?"✅":"⚠️"):"🟢"}</span>
          <div style={{flex:1}}>
            {activeReq ? (
              <>
                <div style={{fontSize:11,fontWeight:700,color:reqMet?C.green:C.red,fontFamily:F.body}}>
                  {reqMet?tr("servers.reqMet"):tr("servers.reqNotMet")} — {activeReq.icon} {activeReq.label}
                </div>
                <div style={{fontSize:10,color:C.muted,fontFamily:F.body,marginTop:1}}>
                  {reqMet
                    ? nextReq ? tr("servers.nextReq",{icon:nextReq.icon,label:nextReq.label,level:nextReq.atLv}) : tr("servers.maxReq")
                    : tr("servers.recruitOrTrain")}
                </div>
              </>
            ) : (
              <>
                <div style={{fontSize:11,fontWeight:700,color:C.muted,fontFamily:F.body}}>{tr("servers.noReq")}</div>
                <div style={{fontSize:10,color:C.muted,fontFamily:F.body,marginTop:1}}>
                  {nextReq ? tr("servers.firstReq",{icon:nextReq.icon,label:nextReq.label,level:nextReq.atLv}) : ""}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Grille des serveurs */}
      <div style={{display:"grid",gridTemplateColumns:bp.isMobile?"1fr":bp.isTablet?"1fr 1fr":"repeat(auto-fill,minmax(270px,1fr))",gap:bp.isMobile?10:13}}>
        {servers.map(sv=>{
          const isWorking     = sv.status==="service";
          const isNettoyage   = sv.status==="nettoyage";
          const cleaningTable = isNettoyage?tables.find(t=>t.cleanServer===sv.id):null;
          const serviceRemSecs = isWorking&&sv.serviceUntil
            ? Math.max(0,Math.ceil((sv.serviceUntil-clockNow)/1000)) : null;
          const cleanRemSecs = isNettoyage&&sv.cleanUntil
            ? Math.max(0,Math.ceil((sv.cleanUntil-clockNow)/1000)) : 0;
          return(
            <ServerCard key={sv.id} sv={sv}
              serviceRemSecs={serviceRemSecs} cleanRemSecs={cleanRemSecs}
              cleaningTableName={cleaningTable?.name??null}
              tables={tables} tierCap={tierCap} cash={cash} tr={tr}
              setServers={setServers} setCash={setCash} addTx={addTx} addToast={addToast}
              onFire={openFire} onTrain={openTrain}/>
          );
        })}

        {canHire&&Array.from({length:maxSlots-servers.length},(_,i)=>(
          <div key={`free-${i}`} onClick={openHire} className="hovcard"
            style={{background:C.bg,border:`1.5px dashed ${C.green}55`,borderRadius:14,
              padding:"18px 16px",display:"flex",flexDirection:"column",alignItems:"center",
              justifyContent:"center",minHeight:160,gap:10,cursor:"pointer",transition:"all 0.2s"}}>
            <div style={{width:44,height:44,background:C.greenP,border:`2px dashed ${C.green}66`,
              borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>➕</div>
            <div style={{fontSize:12,color:C.green,fontWeight:600,fontFamily:F.body}}>{tr("servers.freeSlot")}</div>
            <div style={{fontSize:10,color:C.muted,fontFamily:F.body,textAlign:"center"}}>{tr("servers.clickHire")}</div>
          </div>
        ))}

        {(()=>{
          const nextLevelSlots = Object.entries(SERVER_SLOTS_BY_LEVEL)
            .filter(([lv,sl])=>parseInt(lv)>restoLvN&&sl>maxSlots).slice(0,2);
          if(!nextLevelSlots.length) return null;
          return nextLevelSlots.map(([lv])=>{
            const r = RESTO_LVL.find(x=>x.l===parseInt(lv));
            return(
              <div key={`lock-${lv}`} style={{background:C.bg,border:`1.5px dashed ${C.border}`,
                borderRadius:14,padding:"18px 16px",display:"flex",flexDirection:"column",
                alignItems:"center",justifyContent:"center",minHeight:160,gap:8,opacity:0.6}}>
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

      {modal==="train"&&trainSv&&(
        <TrainModal sv={trainSv} cash={cash} tr={tr}
          onClose={()=>{setModal(false);setTrainId(null);}}
          doTrain={doTrain}/>
      )}
      {modal==="hire"&&(
        <HireModal candidatePool={candidatePool} cash={cash} restoLvN={restoLvN}
          tierCap={tierCap} servers={servers} maxSlots={maxSlots} tr={tr}
          onClose={()=>setModal(false)} hireCandidate={hireCandidate}/>
      )}
      {modal==="fire"&&fireSv&&(
        <FireModal sv={fireSv} cash={cash} tables={tables} tr={tr}
          onClose={()=>{setModal(false);setFireId(null);}}
          doFire={doFire}/>
      )}
    </>
  );
}
