import { memo } from "react";
import { useLang } from "../../i18n/index.jsx";
import { C, F, SRV_LVL } from "../../constants/gameData.js";
import { Badge, Btn, Lbl, Modal, XpBar } from "../../components/ui/index.js";
import { srvLv } from "../../utils/levelUtils.js";

export const AssignModal = memo(function AssignModal({
  modal, setModal, tgtT, setTgtT, tgtS, setTgtS, preview, confirm, freeTbl, activeSrv,
}) {
  const { t: tr } = useLang();
  if (!modal) return null;
  return (
    <Modal title={tr("tables.placeModal")} onClose={()=>setModal(null)}>
      <div style={{display:"flex",flexDirection:"column",gap:18}}>

        <div style={{background:C.navyP,border:`1px solid ${C.navy}22`,
          borderRadius:12,padding:"14px 16px",display:"flex",alignItems:"center",gap:14}}>
          <span style={{fontSize:38}}>{modal.mood.e}</span>
          <div>
            <div style={{fontSize:17,fontWeight:600,color:C.ink,fontFamily:F.title}}>{modal.name}</div>
            <div style={{fontSize:12,color:C.muted,fontFamily:F.body}}>{tr("tables.groupOf",{size:modal.size,mood:modal.mood.l})}</div>
            <div style={{fontSize:11,color:C.navy,fontWeight:600,marginTop:3,fontFamily:F.body}}>{tr("tables.xpBonus",{mult:modal.mood.b})}</div>
          </div>
        </div>

        <div>
          <Lbl>{tr("tables.chooseTable")}</Lbl>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
            {freeTbl(modal).map(t=>{
              const sel=tgtT===String(t.id);
              return(
                <div key={t.id} onClick={()=>setTgtT(String(t.id))}
                  style={{background:sel?C.greenP:C.bg,border:`2px solid ${sel?C.green:C.border}`,borderRadius:10,padding:"11px 13px",cursor:"pointer"}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                    <span style={{fontWeight:600,color:C.ink,fontSize:13,fontFamily:F.body}}>{t.name}</span>
                    <span style={{fontSize:17}}>🪑</span>
                  </div>
                  <div style={{fontSize:10,color:C.muted,fontFamily:F.body}}>👥 {t.capacity} {tr("tables.covers")}</div>
                  {t.freedAt&&<div style={{fontSize:9,color:C.green,fontWeight:600,marginTop:3,fontFamily:F.body}}>✓ Libre depuis {new Date(t.freedAt).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}</div>}
                </div>
              );
            })}
            {freeTbl(modal).length===0&&<div style={{color:C.red,fontSize:13,gridColumn:"1/-1",fontFamily:F.body,padding:"8px 0"}}>{tr("tables.noAvailable")}</div>}
          </div>
        </div>

        <div>
          <Lbl>{tr("tables.chooseServer")}</Lbl>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {activeSrv.map(sv=>{
              const sl=srvLv(sv.totalXp); const slD=SRV_LVL[Math.min(sl.l,SRV_LVL.length-1)];
              const sel=tgtS===sv.name;
              return(
                <div key={sv.id} onClick={()=>setTgtS(sv.name)}
                  style={{background:sel?C.greenP:C.bg,border:`2px solid ${sel?C.green:C.border}`,
                    borderRadius:10,padding:"11px 13px",cursor:"pointer",
                    display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <div style={{fontWeight:600,color:C.ink,fontSize:13,fontFamily:F.body}}>{sv.name}</div>
                    <div style={{display:"flex",gap:6,marginTop:4}}>
                      <Badge color={slD.color} sm>{slD.icon} {slD.name}</Badge>
                      <span style={{fontSize:10,color:C.muted,fontFamily:F.body}}>⭐ {sv.rating}</span>
                    </div>
                  </div>
                  <div style={{width:72}}>
                    <div style={{fontSize:10,color:C.muted,textAlign:"right",marginBottom:3,fontFamily:F.body}}>{sl.r}/{sl.n}</div>
                    <XpBar xp={sl.r} needed={sl.n} color={slD.color} h={3}/>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {preview.length>0&&(
          <div style={{background:C.terraP,border:`1.5px solid ${C.terra}33`,borderRadius:12,padding:14}}>
            <div style={{fontSize:12,fontWeight:600,color:C.terra,marginBottom:10,fontFamily:F.body}}>{tr("tables.orderPreview")}</div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {preview.map((o,i)=>{
                const catColors={Entrées:C.green,Plats:C.terra,Desserts:C.purple,Boissons:C.navy,Formules:C.amber};
                return(
                  <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:12,fontFamily:F.body}}>
                    <div style={{display:"flex",gap:7,alignItems:"center"}}>
                      <Badge color={catColors[o.cat]||C.navy} sm>{o.cat}</Badge>
                      <span style={{color:C.ink}}>{o.qty}× {o.item}</span>
                    </div>
                    <span style={{color:C.terra,fontWeight:600}}>{(o.price*o.qty).toFixed(2)}€</span>
                  </div>
                );
              })}
              <div style={{borderTop:`1px solid ${C.terra}33`,paddingTop:8,marginTop:2,
                display:"flex",justifyContent:"space-between",fontWeight:700,fontFamily:F.title}}>
                <span style={{fontSize:12,color:C.muted}}>{tr("tables.totalEst")}</span>
                <span style={{color:C.terra,fontSize:16}}>{preview.reduce((s,o)=>s+o.price*o.qty,0).toFixed(2)}€</span>
              </div>
            </div>
          </div>
        )}

        <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
          <Btn onClick={()=>setModal(null)} v="ghost">{tr("app.cancel")}</Btn>
          <Btn onClick={confirm} disabled={!tgtT||!tgtS||preview.length===0} v="terra" icon="🔥">
            {tr("tables.sendKitchen")}
          </Btn>
        </div>
      </div>
    </Modal>
  );
});
