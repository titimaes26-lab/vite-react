import { memo } from "react";
import { useLang } from "../../i18n/index.jsx";
import { C, F } from "../../constants/gameData.js";
import { isOnShift } from "../../hooks/useGameClock.js";
import { Btn } from "../../components/ui/index.js";

export const QueuePanel = memo(function QueuePanel({
  queue, waitlist, now, tables, servers, absMin,
  selectedClient, quickPlace, openAssign, toggleSelectClient, setSelectedClient, recallGroup,
}) {
  const { t: tr } = useLang();
  return (
    <>
      <div style={{padding:"8px 12px",borderBottom:`1px solid ${C.border}`,
        fontWeight:700,fontSize:12,color:C.navy,fontFamily:F.title,
        display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
        {tr("tables.queue")}
        {queue.length>=5&&<span style={{fontSize:9,background:C.redP,color:C.red,
          borderRadius:20,padding:"1px 6px",fontWeight:700,fontFamily:F.body,
          animation:"pulse 1.2s infinite"}}>🚨</span>}
      </div>
      <div style={{overflowY:"auto",padding:8,display:"flex",flexDirection:"column",gap:6,flex:1}}>
        {queue.map(g=>{
          const pct=Math.max(0,(g.expiresAt-now)/(g.patMax*1000));
          const col=pct>0.5?C.green:pct>0.25?C.amber:C.red;
          const freeT=tables.filter(t=>t.status==="libre"&&t.capacity>=g.size);
          const aS=servers.filter(s=>s.status==="actif"&&(s.moral??100)>10&&(!s.shift||isOnShift(s.shift,absMin)));
          const isSel=selectedClient?.id===g.id;
          return(
            <div key={g.id} style={{background:isSel?C.navyP:C.bg,
              border:`1px solid ${isSel?C.navy:col+"33"}`,
              borderLeft:`3px solid ${isSel?C.navy:col}`,
              borderRadius:9,padding:"8px 10px",transition:"background 0.15s,border 0.15s"}}>
              <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:4}}>
                <span style={{fontSize:18}}>{g.mood.e}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:11,fontWeight:700,color:isSel?C.navy:C.ink,fontFamily:F.body,
                    overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{g.name}</div>
                  <div style={{fontSize:9,color:C.muted,fontFamily:F.body}}>{g.size}p · {g.mood.l}{g.isVIP?" 🎩":""}</div>
                </div>
              </div>
              <div style={{height:3,background:col+"22",borderRadius:99,overflow:"hidden",marginBottom:5}}>
                <div style={{height:"100%",width:"100%",background:col,borderRadius:99,transformOrigin:"left center",transform:`scaleX(${pct})`,transition:"transform 0.3s"}}/>
              </div>
              {isSel?(
                <div style={{display:"flex",flexDirection:"column",gap:4}}>
                  <div style={{fontSize:9,color:C.navy,fontFamily:F.body,textAlign:"center",padding:"2px 0",fontWeight:600}}>{tr("tables.clickTable")}</div>
                  <Btn full sm v="ghost" onClick={()=>setSelectedClient(null)}>✕ Annuler</Btn>
                </div>
              ):freeT.length>0?(
                <div style={{display:"flex",gap:3}}>
                  {aS.length>0&&<Btn full sm v="primary" onClick={()=>quickPlace(g)} icon="➡️">{tr("tables.place")}</Btn>}
                  <Btn full sm v="navy" onClick={()=>toggleSelectClient(g)} icon="🪑">{tr("tables.tableBtn")}</Btn>
                  {aS.length===0&&<Btn full sm v="secondary" onClick={()=>openAssign(g)} icon="👤">{tr("tables.serverBtn")}</Btn>}
                </div>
              ):(
                <div style={{fontSize:9,color:C.muted,fontFamily:F.body,textAlign:"center",padding:"2px 0"}}>
                  {freeT.length===0?tr("tables.noTable"):tr("tables.noServer")}
                </div>
              )}
            </div>
          );
        })}
        {queue.length===0&&waitlist.length===0&&(
          <div style={{textAlign:"center",color:C.muted,fontSize:10,fontFamily:F.body,padding:"12px 0",fontStyle:"italic"}}>
            {tr("tables.noWaiting")}
          </div>
        )}
        {waitlist.length>0&&(
          <div style={{borderTop:`1px solid ${C.border}`,paddingTop:8,marginTop:4}}>
            <div style={{fontSize:9,color:C.muted,fontFamily:F.body,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:5}}>{tr("tables.recallable")}</div>
            {waitlist.map(g=>{
              const rem=Math.max(0,Math.ceil((g.recallUntil-now)/1000));
              return(
                <div key={"w"+g.id} style={{background:C.bg,borderRadius:8,padding:"5px 8px",marginBottom:3,display:"flex",alignItems:"center",gap:6}}>
                  <span style={{fontSize:13}}>{g.mood.e}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:10,fontWeight:600,color:C.ink,fontFamily:F.body,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{g.name}</div>
                    <div style={{fontSize:9,color:C.muted,fontFamily:F.body}}>{g.size}p · {rem}s</div>
                  </div>
                  <Btn sm v="ghost" onClick={()=>recallGroup(g)}>📞</Btn>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
});
