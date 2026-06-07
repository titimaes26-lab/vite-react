import { memo } from "react";
import { C, F } from "../../constants/gameData.js";
import { Btn } from "../../components/ui/index.js";
import { useLang } from "../../i18n/index.jsx";

export const QueueColumn = memo(function QueueColumn({ queueByTable, queueLength, cookingLength, maxConcurrent, slotsLeft, chefOnShift, clD, unlockedCommis, upgDishCookTime, moveTicket, startDish, startAll }) {
  const { t: tl } = useLang();
  const queueGroups = Object.values(queueByTable);
  const late = queueGroups.filter(t=>
    t.dishes.some(d=>d.addedAt&&(Date.now()-d.addedAt)>300000)).length;

  return (
    <div style={{minWidth:0}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <div style={{display:"flex",alignItems:"center",gap:6,minWidth:0}}>
          <span style={{fontSize:13}}>🎫</span>
          <span style={{fontSize:12,fontWeight:700,color:C.amber,fontFamily:F.title,whiteSpace:"nowrap"}}>
            {tl("kitchen.orders")} ({queueLength})
          </span>
          {late>0&&(
            <span style={{fontSize:9,background:C.redP,color:C.red,border:`1px solid ${C.red}33`,
              borderRadius:20,padding:"1px 6px",fontFamily:F.body,fontWeight:700,
              animation:"pulse 1s infinite",whiteSpace:"nowrap"}}>
              ⏰{late}
            </span>
          )}
        </div>
        {queueLength>0&&slotsLeft>0&&(
          <Btn sm v={chefOnShift?"terra":"disabled"} disabled={!chefOnShift} onClick={startAll}>▶ {tl("kitchen.all")}</Btn>
        )}
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:7,maxHeight:420,overflowY:"auto"}}>
        {queueLength===0&&(
          <div style={{background:C.card,border:`1px dashed ${C.border}`,borderRadius:9,
            padding:14,textAlign:"center",color:C.muted,fontSize:11,fontStyle:"italic",fontFamily:F.body}}>
            {tl("kitchen.noOrders")}
          </div>
        )}
        {queueGroups.map((tblQ,tIdx,arr)=>{
          const canStart = cookingLength<maxConcurrent;
          const firstDish = tblQ.dishes[0];
          const elapsedMs = firstDish?.addedAt?(Date.now()-firstDish.addedAt):0;
          const elapsedSec = Math.floor(elapsedMs/1000);
          const isLate = elapsedMs>300000;
          const isWarning = elapsedMs>180000;
          const tc = isLate?C.red:C.amber;
          return(
            <div key={tblQ.tableId||"nt"} style={{
              background:isLate?C.redP:C.amberP,
              border:`1.5px solid ${tc}44`,borderRadius:10,overflow:"hidden",
              boxShadow:isLate?`0 0 0 2px ${C.red}18`:"none"}}>
              <div style={{background:tc+"20",padding:"5px 9px",borderBottom:`1px solid ${tc}22`,
                display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{display:"flex",alignItems:"center",gap:5}}>
                  <div style={{display:"flex",flexDirection:"column",gap:1}}>
                    <button onClick={()=>moveTicket(tblQ.tableId,-1)} disabled={tIdx===0}
                      style={{width:22,height:20,fontSize:9,border:`1px solid ${tc}33`,borderRadius:3,
                        background:tIdx===0?"transparent":tc+"14",color:tIdx===0?C.muted:tc,
                        cursor:tIdx===0?"not-allowed":"pointer",lineHeight:1,
                        display:"flex",alignItems:"center",justifyContent:"center"}}>▲</button>
                    <button onClick={()=>moveTicket(tblQ.tableId,+1)} disabled={tIdx===arr.length-1}
                      style={{width:22,height:20,fontSize:9,border:`1px solid ${tc}33`,borderRadius:3,
                        background:tIdx===arr.length-1?"transparent":tc+"14",color:tIdx===arr.length-1?C.muted:tc,
                        cursor:tIdx===arr.length-1?"not-allowed":"pointer",lineHeight:1,
                        display:"flex",alignItems:"center",justifyContent:"center"}}>▼</button>
                  </div>
                  <div style={{width:17,height:17,borderRadius:"50%",background:tc,color:"#fff",
                    display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:800}}>{tIdx+1}</div>
                  <span style={{fontSize:10,fontWeight:700,color:isLate?C.red:C.amber,fontFamily:F.body,whiteSpace:"nowrap"}}>
                    📍{tblQ.tableName}
                  </span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:5}}>
                  {elapsedSec>0&&<span style={{fontSize:8,fontWeight:700,color:tc,fontFamily:F.body}}>
                    {isLate?"🔴":isWarning?"🟡":"🟢"}{elapsedSec>=60?`${Math.floor(elapsedSec/60)}m`:elapsedSec+"s"}
                  </span>}
                  <span style={{fontSize:9,color:C.muted,fontFamily:F.body}}>{tblQ.dishes.length}×</span>
                </div>
              </div>
              {tblQ.dishes.map((d,i)=>{
                const estSec = upgDishCookTime(d.prepTime||60,clD.speed,unlockedCommis,d.cat||"");
                const estFmt = estSec>=60?`${Math.floor(estSec/60)}m${String(estSec%60).padStart(2,"0")}s`:estSec+"s";
                return(
                  <div key={d.id} style={{padding:"5px 9px",borderTop:i>0?`1px dashed ${tc}22`:undefined,
                    display:"flex",alignItems:"center",gap:6}}>
                    <span style={{fontSize:8,color:tc,fontWeight:800,minWidth:12}}>{i+1}</span>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:11,fontWeight:600,color:C.ink,fontFamily:F.body,
                        overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.name}</div>
                      <span style={{fontSize:9,color:C.amber,fontWeight:600,fontFamily:F.body}}>⏱{estFmt}</span>
                    </div>
                    <Btn sm v={canStart?"terra":"ghost"} disabled={!canStart} onClick={()=>startDish(d)}>
                      {canStart?"▶":"⛔"}
                    </Btn>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
});
