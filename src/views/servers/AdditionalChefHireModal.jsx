import { memo } from "react";
import { C, F } from "../../constants/gameData.js";
import { Btn, Modal } from "../../components/ui/index.js";

export const AdditionalChefFireModal = memo(function AdditionalChefFireModal({ idx, kitchen, cash, setCash, addTx, setKitchen, setChefConfirmIdx }) {
  const ac=(kitchen?.chefs??[])[idx];
  if (!ac) return null;
  const severance=Math.round((ac.salary||20)*2);
  const canAfford=cash>=severance;
  return(
    <Modal title={`Licencier ${ac.name} ?`} onClose={()=>setChefConfirmIdx(null)}>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div style={{background:C.redP,border:`1px solid ${C.red}22`,borderRadius:8,padding:"10px 14px",fontSize:11,color:C.red,fontFamily:F.body,fontWeight:600}}>
          Indemnité de départ : {severance}€
        </div>
        <div style={{display:"flex",gap:10}}>
          <Btn full v="ghost" onClick={()=>setChefConfirmIdx(null)}>Annuler</Btn>
          <Btn full v={canAfford?"danger":"disabled"} disabled={!canAfford}
            onClick={()=>{setCash(c=>+(c-severance).toFixed(2));addTx("dépense",`Indemnité licenciement — ${ac.name}`,severance);setKitchen(k=>({...k,chefs:(k.chefs??[]).filter((_,i)=>i!==idx)}));setChefConfirmIdx(null);}} icon="👋">
            {canAfford?`Confirmer (−${severance}€)`:"Fonds insuffisants"}
          </Btn>
        </div>
      </div>
    </Modal>
  );
});

export const AdditionalChefHireModal = memo(function AdditionalChefHireModal({ chefPool, cash, setChefHireIdx, hireChef }) {
  return(
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
              <div key={cand.id} style={{background:C.bg,border:`1.5px solid ${C.border}`,borderRadius:11,padding:"9px 13px",display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}>
                <div style={{display:"flex",alignItems:"center",gap:9}}>
                  <span style={{fontSize:20}}>{cand.icon}</span>
                  <div>
                    <div style={{fontSize:12,fontWeight:700,color:C.ink,fontFamily:F.body}}>{cand.name}</div>
                    <div style={{fontSize:10,color:C.muted,fontFamily:F.body}}>
                      <span style={{color:cand.lvlColor,fontWeight:700}}>{cand.lvlName}</span>{" · "}{cand.salary}€/h
                    </div>
                  </div>
                </div>
                <button disabled={!canAfford} onClick={()=>hireChef(cand)}
                  style={{background:canAfford?C.amber:"#e5e7eb",color:canAfford?"#fff":"#9ca3af",border:"none",borderRadius:8,padding:"6px 14px",fontSize:12,fontWeight:700,fontFamily:F.body,cursor:canAfford?"pointer":"not-allowed"}}>
                  {canAfford?`${cand.hireCost}€`:"Trop cher"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});
