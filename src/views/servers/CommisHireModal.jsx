import { memo } from "react";
import { useLang } from "../../i18n/index.jsx";
import { C, F, COMMIS_LVL } from "../../constants/gameData.js";
import { commisLv } from "../../utils/levelUtils.js";

export const CommisHireModal = memo(function CommisHireModal({ commisPool, cash, setCommisHireSlot, hireCommis }) {
  const { t: tr } = useLang();
  return(
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
            const cl2=commisLv(cand.totalXp); const clD2=COMMIS_LVL[Math.min(cl2.l,COMMIS_LVL.length-1)];
            return(
              <div key={cand.id} style={{background:C.bg,border:`1.5px solid ${C.border}`,borderRadius:11,padding:"9px 13px",display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}>
                <div style={{display:"flex",alignItems:"center",gap:9}}>
                  <span style={{fontSize:18}}>{clD2.icon}</span>
                  <div>
                    <div style={{fontSize:12,fontWeight:700,color:C.ink,fontFamily:F.body}}>{cand.name}</div>
                    <div style={{fontSize:10,color:C.muted,fontFamily:F.body}}>
                      {clD2.name} · {cand.salary}€/h
                      {cand.specialty&&<span style={{marginLeft:6,fontWeight:700,color:cand.specialty.cat==="Desserts"?C.purple:cand.specialty.cat==="Plats"?C.terra:cand.specialty.cat==="Entrées"?C.green:C.navy}}>{cand.specialty.icon} {cand.specialty.name}</span>}
                    </div>
                  </div>
                </div>
                <button disabled={!canAfford} onClick={()=>hireCommis(cand)} style={{fontSize:11,fontWeight:700,fontFamily:F.body,whiteSpace:"nowrap",padding:"5px 11px",borderRadius:8,background:canAfford?C.greenP:"transparent",color:canAfford?C.green:C.muted,border:`1.5px solid ${canAfford?C.green:C.border}`,cursor:canAfford?"pointer":"not-allowed"}}>
                  💰 {cand.hireCost}€
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});
