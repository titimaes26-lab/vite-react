import { C, F, SRV_LVL, Z } from "../../constants/gameData.js";
import { Btn } from "../../components/ui/index.js";
import { useLang } from "../../i18n/index.jsx";
import { srvLv } from "../../utils/levelUtils.js";

export function HireModal({ candidatePool, cash, restoLvN, tierCap, servers, maxSlots, onClose, hireCandidate }) {
  const { t: tr } = useLang();
  const shown = candidatePool.slice(0, 3);
  return (
    <div onClick={onClose}
      style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.5)",
        zIndex:Z.modal,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div onClick={e=>e.stopPropagation()} className="modal-inner"
        style={{background:C.surface,border:`1.5px solid ${C.border}`,borderRadius:18,
          width:"100%",maxWidth:560,maxHeight:"90vh",overflowY:"auto",
          boxShadow:"0 20px 60px rgba(0,0,0,0.2)"}}>

        <div style={{padding:"18px 22px",borderBottom:`1px solid ${C.border}`,
          display:"flex",justifyContent:"space-between",alignItems:"center",
          position:"sticky",top:0,background:C.surface,zIndex:10}}>
          <div>
            <div style={{fontSize:16,fontWeight:700,color:C.ink,fontFamily:F.title}}>
              {tr("servers.candidates")}
            </div>
            <div style={{fontSize:11,color:C.muted,fontFamily:F.body,marginTop:3}}>
              {tr("servers.candidatesInfo",{shown:shown.length,s:shown.length>1?"s":"",total:candidatePool.length,hired:servers.length,max:maxSlots})}
            </div>
          </div>
          <button onClick={onClose}
            style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,
              width:44,height:44,cursor:"pointer",fontSize:18,color:C.muted,
              display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        </div>

        <div style={{padding:"10px 22px",background:C.bg,borderBottom:`1px solid ${C.border}`,
          display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:12,color:C.muted,fontFamily:F.body}}>{tr("servers.balance")}</span>
            <span style={{fontSize:14,fontWeight:700,color:C.green,fontFamily:F.title}}>
              {cash.toLocaleString("fr-FR",{minimumFractionDigits:2})} €
            </span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6,
            background:C.navyP,border:`1px solid ${C.navy}22`,borderRadius:7,padding:"3px 10px"}}>
            <span style={{fontSize:11}}>🎓</span>
            <span style={{fontSize:10,color:C.navy,fontWeight:600,fontFamily:F.body}}>
              {tr("servers.candidateTierBadge",{level:restoLvN||0,tierName:SRV_LVL[Math.min(tierCap,SRV_LVL.length-1)].name})}
            </span>
          </div>
        </div>

        <div style={{padding:"16px 22px",display:"flex",flexDirection:"column",gap:14}}>
          {candidatePool.length===0?(
            <div style={{textAlign:"center",padding:"32px 0",color:C.muted,fontFamily:F.body}}>
              <div style={{fontSize:32,marginBottom:8}}>📅</div>
              <div style={{fontSize:13,fontWeight:600}}>{tr("servers.noCandidates")}</div>
              <div style={{fontSize:11,marginTop:4}}>{tr("servers.noCandidatesMsg")}</div>
            </div>
          ):shown.map(c=>{
            const sl = srvLv(c.totalXp);
            const slD = SRV_LVL[Math.min(sl.l, SRV_LVL.length-1)];
            const canAffordC = cash >= c.hireCost;
            return(
              <div key={c.id} style={{background:canAffordC?C.card:C.bg,
                border:`1.5px solid ${canAffordC?slD.color+"44":C.border}`,
                borderRadius:14,padding:"16px",opacity:canAffordC?1:0.65}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                  <div style={{display:"flex",gap:12,alignItems:"center"}}>
                    <div style={{width:46,height:46,background:slD.color+"1a",
                      border:`2px solid ${slD.color}33`,borderRadius:12,
                      display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>
                      {slD.icon}
                    </div>
                    <div>
                      <div style={{fontSize:14,fontWeight:700,color:C.ink,fontFamily:F.title}}>{c.name}</div>
                      <div style={{display:"flex",alignItems:"center",gap:6,marginTop:3}}>
                        <span style={{fontSize:10,background:slD.color+"18",color:slD.color,
                          border:`1px solid ${slD.color}33`,borderRadius:5,padding:"1px 7px",
                          fontFamily:F.body,fontWeight:700}}>{slD.icon} {slD.name}</span>
                        {c.specialty&&(
                          <span style={{fontSize:10,background:C.purpleP,color:C.purple,
                            border:`1px solid ${C.purple}33`,borderRadius:5,padding:"1px 7px",
                            fontFamily:F.body,fontWeight:600}}>{c.specialty.icon} {c.specialty.name}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:16,fontWeight:800,color:canAffordC?C.green:C.red,fontFamily:F.title}}>
                      {c.hireCost}€
                    </div>
                    <div style={{fontSize:9,color:C.muted,fontFamily:F.body}}>{tr("servers.hireCost")}</div>
                  </div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:8,marginBottom:12}}>
                  {[
                    {icon:"💶",label:"Salaire",val:`${c.salary}€/h`},
                    {icon:"😊",label:"Moral",  val:`${c.moral}/100`},
                    {icon:"⭐",label:"Note",   val:`${c.rating}★`},
                    {icon:"📈",label:"XP",     val:`${c.totalXp} XP`},
                  ].map(stat=>(
                    <div key={stat.label} style={{background:C.bg,borderRadius:8,padding:"7px 8px",textAlign:"center"}}>
                      <div style={{fontSize:13}}>{stat.icon}</div>
                      <div style={{fontSize:12,fontWeight:700,color:C.ink,fontFamily:F.title}}>{stat.val}</div>
                      <div style={{fontSize:9,color:C.muted,fontFamily:F.body}}>{stat.label}</div>
                    </div>
                  ))}
                </div>
                {c.specialty&&(
                  <div style={{background:C.purpleP,border:`1px solid ${C.purple}22`,
                    borderRadius:8,padding:"7px 10px",marginBottom:10,fontSize:11,
                    color:C.purple,fontFamily:F.body}}>
                    {c.specialty.icon} <strong>{c.specialty.name}</strong> — {c.specialty.desc}
                  </div>
                )}
                <Btn full v={canAffordC?"primary":"disabled"}
                  onClick={()=>canAffordC&&hireCandidate(c)}
                  icon={canAffordC?"👔":"🔒"}>
                  {canAffordC?tr("servers.hireBtn",{cost:c.hireCost}):tr("servers.noFunds")}
                </Btn>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
