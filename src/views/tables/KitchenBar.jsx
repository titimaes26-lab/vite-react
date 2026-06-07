import { memo } from "react";
import { useLang } from "../../i18n/index.jsx";
import { C, F } from "../../constants/gameData.js";

export const KitchenBar = memo(function KitchenBar({ kitchen, tables, servers, now, setSelectedTable }) {
  const { t: tr } = useLang();
  const fmt = s => s>=60?Math.floor(s/60)+"m"+String(s%60).padStart(2,"0")+"s":s+"s";
  return (
    <div style={{height:64,flexShrink:0,background:C.surface,
      borderTop:`1px solid ${C.border}`,display:"flex",alignItems:"center",
      overflowX:"auto",scrollbarWidth:"none",zIndex:10}}>
      {kitchen.cooking.length===0&&tables.filter(t=>t.status==="nettoyage").length===0?(
        <div style={{padding:"0 18px",fontSize:11,color:C.muted,fontFamily:F.body,fontStyle:"italic",whiteSpace:"nowrap"}}>
          {tr("tables.quietDining")}
        </div>
      ):(
        <>
          {kitchen.cooking.map(d=>{
            const rem=Math.max(0,Math.ceil((d.startedAt+d.timerMax*1000-now)/1000));
            const pct=d.timerMax>0?Math.min(100,((d.timerMax-rem)/d.timerMax)*100):0;
            const done=pct>=100;
            return(
              <div key={d.id}
                onClick={()=>{const t=tables.find(x=>x.id===d.tableId);if(t)setSelectedTable(t);}}
                style={{flexShrink:0,padding:"0 13px",borderRight:`1px solid ${C.border}`,
                  height:"100%",display:"flex",flexDirection:"column",justifyContent:"center",
                  gap:3,cursor:"pointer",minWidth:120,background:done?"#eaf7ef":"transparent"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:11,fontWeight:600,color:done?C.green:C.terra,
                    fontFamily:F.body,maxWidth:80,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                    {done?"✅ ":"🔥 "}{d.name}
                  </span>
                  <span style={{fontSize:10,color:done?C.green:C.terra,fontWeight:700,fontFamily:F.body,marginLeft:4}}>
                    {done?tr("tables.ready"):fmt(rem)}
                  </span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:4}}>
                  <div style={{height:3,flex:1,background:C.terra+"22",borderRadius:99,overflow:"hidden"}}>
                    <div style={{height:"100%",width:"100%",background:done?C.green:C.terra,
                      borderRadius:99,transformOrigin:"left center",transform:`scaleX(${pct/100})`,transition:"transform 0.3s"}}/>
                  </div>
                  {d.tableName&&<span style={{fontSize:9,color:C.muted,fontFamily:F.body,flexShrink:0}}>{d.tableName}</span>}
                </div>
              </div>
            );
          })}
          {tables.filter(t=>t.status==="nettoyage").map(t=>{
            const rem=t.cleanUntil?Math.max(0,Math.ceil((t.cleanUntil-now)/1000)):0;
            const cleanSrv=t.cleanServer?servers.find(s=>s.id===t.cleanServer):null;
            return(
              <div key={"cl"+t.id} style={{flexShrink:0,padding:"0 12px",
                borderRight:`1px solid ${C.border}`,height:"100%",
                display:"flex",flexDirection:"column",justifyContent:"center",gap:2,minWidth:110}}>
                <span style={{fontSize:11,color:C.amber,fontWeight:600,fontFamily:F.body}}>🧹 {t.name}</span>
                <span style={{fontSize:10,color:C.muted,fontFamily:F.body}}>
                  {cleanSrv?`👔 ${cleanSrv.name}`:tr("tables.waitingServerShort")}
                </span>
                {cleanSrv&&<span style={{fontSize:9,color:C.amber,fontFamily:F.body}}>
                  {rem>0?rem+"s":tr("tables.cleanDone")}
                </span>}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
});
