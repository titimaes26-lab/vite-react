import { C, F, SRV_LVL } from "../../constants/gameData.js";
import { Btn, Modal } from "../../components/ui/index.js";
import { useLang } from "../../i18n/index.jsx";
import { srvLv } from "../../utils/levelUtils.js";

export function FireModal({ sv, cash, tables, onClose, doFire }) {
  const { t: tr } = useLang();
  const totalXp        = sv.totalXp  ?? 0;
  const salary         = sv.salary   ?? 12;
  const moral          = sv.moral    ?? 100;
  const rating         = sv.rating   ?? 4.0;
  const specialty      = sv.specialty?? null;
  const sl             = srvLv(totalXp);
  const slD            = SRV_LVL[Math.min(sl.l, SRV_LVL.length-1)];
  const severance      = salary * 24;
  const canAffordFire  = cash >= severance;
  const assignedTables = tables.filter(t => t.server === sv.name);

  return(
    <Modal title={tr("servers.fireTitle")} onClose={onClose}>
      <div style={{display:"flex",flexDirection:"column",gap:16}}>

        <div style={{display:"flex",gap:14,alignItems:"center",
          background:C.bg,borderRadius:12,padding:"14px 16px"}}>
          <div style={{width:50,height:50,background:slD.color+"1a",
            border:`2px solid ${slD.color}33`,borderRadius:12,
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:26}}>
            {slD.icon}
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:16,fontWeight:700,color:C.ink,fontFamily:F.title}}>{sv.name}</div>
            <div style={{fontSize:11,color:C.muted,fontFamily:F.body,marginTop:3}}>
              {slD.name} · Niv.{sl.l}{specialty&&` · ${specialty.icon} ${specialty.name}`}
            </div>
          </div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:8}}>
          {[
            {icon:"📈",label:"XP",     val:`${totalXp} XP`},
            {icon:"😊",label:"Moral",  val:`${moral}/100`},
            {icon:"⭐",label:"Note",   val:`${(rating||0).toFixed(1)}/5`},
            {icon:"💶",label:"Salaire",val:`${salary}€/h`},
          ].map(stat=>(
            <div key={stat.label} style={{background:C.bg,borderRadius:8,padding:"8px",textAlign:"center"}}>
              <div style={{fontSize:14}}>{stat.icon}</div>
              <div style={{fontSize:12,fontWeight:700,color:C.ink,fontFamily:F.title}}>{stat.val}</div>
              <div style={{fontSize:9,color:C.muted,fontFamily:F.body}}>{stat.label}</div>
            </div>
          ))}
        </div>

        {assignedTables.length>0&&(
          <div style={{background:C.amberP,border:`1px solid ${C.amber}33`,
            borderRadius:8,padding:"8px 12px",fontSize:11,color:C.amber,fontFamily:F.body}}>
            {tr("servers.assignedTo",{count:assignedTables.length,s:assignedTables.length>1?"s":"",tables:assignedTables.map(t=>t.name).join(", ")})}
          </div>
        )}

        <div style={{background:canAffordFire?C.bg:C.redP,
          border:`1.5px solid ${canAffordFire?C.border:C.red}44`,borderRadius:10,padding:"12px 16px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontSize:12,fontWeight:700,color:C.ink,fontFamily:F.body}}>{tr("servers.severance")}</div>
              <div style={{fontSize:10,color:C.muted,fontFamily:F.body,marginTop:2}}>
                {tr("servers.severanceDetail",{salary})}
              </div>
            </div>
            <div style={{fontSize:18,fontWeight:800,color:canAffordFire?C.ink:C.red,fontFamily:F.title}}>
              {severance}€
            </div>
          </div>
          {!canAffordFire&&(
            <div style={{marginTop:8,fontSize:10,color:C.red,fontFamily:F.body,fontWeight:600}}>
              {tr("servers.insufficientFire",{available:cash.toFixed(2),required:severance})}
            </div>
          )}
        </div>

        <div style={{fontSize:11,color:C.muted,fontFamily:F.body,textAlign:"center",lineHeight:1.5}}>
          <span dangerouslySetInnerHTML={{__html:tr("servers.irreversible")}}/><br/>
          {tr("servers.fireWarning",{name:sv.name})}
        </div>

        <div style={{display:"flex",gap:10}}>
          <Btn full v="ghost" onClick={onClose}>{tr("app.cancel")}</Btn>
          <Btn full v={canAffordFire?"danger":"disabled"} onClick={doFire} icon="👋">
            {canAffordFire?tr("servers.fireConfirm",{cost:severance}):tr("servers.noFunds")}
          </Btn>
        </div>
      </div>
    </Modal>
  );
}
