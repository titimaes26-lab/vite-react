import { memo } from "react";
import { useLang } from "../../i18n/index.jsx";
import { C, F, COMMIS_LVL } from "../../constants/gameData.js";
import { Btn, Modal } from "../../components/ui/index.js";
import { commisLv } from "../../utils/levelUtils.js";

export const CommisFireModal = memo(function CommisFireModal({ slot, kitchen, cash, setCash, addTx, setCommisConfirmSlot, setCommisHireSlot }) {
  const { t: tr } = useLang();
  const cm = kitchen?.commis?.[slot];
  if (!cm) return null;
  const cml=commisLv(cm.totalXp); const cmlD=COMMIS_LVL[Math.min(cml.l,COMMIS_LVL.length-1)];
  const severance=(cm.salary||8)*24;
  const canAfford=cash>=severance;
  return(
    <Modal title={tr("servers.fireTitle")} onClose={()=>setCommisConfirmSlot(null)}>
      <div style={{display:"flex",flexDirection:"column",gap:16}}>
        <div style={{display:"flex",gap:14,alignItems:"center",background:C.bg,borderRadius:12,padding:"14px 16px"}}>
          <div style={{width:50,height:50,background:cmlD.color+"1a",border:`2px solid ${cmlD.color}33`,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26}}>{cmlD.icon}</div>
          <div style={{flex:1}}>
            <div style={{fontSize:16,fontWeight:700,color:C.ink,fontFamily:F.title}}>{cm.name}</div>
            <div style={{fontSize:11,color:C.muted,fontFamily:F.body,marginTop:3}}>
              {cmlD.name} · Niv.{cml.l} · {cm.salary}€/h{cm.specialty&&` · ${cm.specialty.icon} ${cm.specialty.name}`}
            </div>
          </div>
        </div>
        <div style={{background:canAfford?C.bg:C.redP,border:`1.5px solid ${canAfford?C.border:C.red}44`,borderRadius:10,padding:"12px 16px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontSize:12,fontWeight:700,color:C.ink,fontFamily:F.body}}>{tr("servers.severance")}</div>
              <div style={{fontSize:10,color:C.muted,fontFamily:F.body,marginTop:2}}>{cm.salary||8}€/h × 24h (1 mois)</div>
            </div>
            <div style={{fontSize:18,fontWeight:800,color:canAfford?C.ink:C.red,fontFamily:F.title}}>{severance}€</div>
          </div>
          {!canAfford&&<div style={{marginTop:8,fontSize:10,color:C.red,fontFamily:F.body,fontWeight:600}}>{tr("servers.insufficientFire",{available:cash.toFixed(2),required:severance})}</div>}
        </div>
        <div style={{display:"flex",gap:10}}>
          <Btn full v="ghost" onClick={()=>setCommisConfirmSlot(null)}>{tr("app.cancel")}</Btn>
          <Btn full v={canAfford?"danger":"disabled"} disabled={!canAfford}
            onClick={()=>{setCash(c=>+(c-severance).toFixed(2));addTx("dépense",`Indemnité licenciement — ${cm.name}`,severance);setCommisConfirmSlot(null);setCommisHireSlot(slot);}} icon="👋">
            {canAfford?tr("servers.fireConfirm",{cost:severance}):tr("servers.noFunds")}
          </Btn>
        </div>
      </div>
    </Modal>
  );
});
