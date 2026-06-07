import { C, F } from "../../constants/gameData.js";
import { Btn } from "../../components/ui/index.js";
import { useLang } from "../../i18n/index.jsx";

export function DoneColumn({ doneByTable, doneCount, freeSrvForServing, serveTable, canServeTable }) {
  const { t: tl } = useLang();

  return (
    <div style={{minWidth:0}}>
      <div style={{fontSize:12,fontWeight:700,color:C.green,fontFamily:F.title,marginBottom:8,
        display:"flex",alignItems:"center",gap:6}}>
        <span>✅</span>
        <span style={{whiteSpace:"nowrap"}}>{tl("kitchen.readyDishes")} ({doneCount})</span>
      </div>

      {Object.keys(doneByTable).length===0&&(
        <div style={{background:C.card,border:`1px dashed ${C.border}`,borderRadius:9,
          padding:14,textAlign:"center",color:C.muted,fontSize:11,fontStyle:"italic",fontFamily:F.body}}>
          {tl("kitchen.noReadyDishes")}
        </div>
      )}

      <div style={{display:"flex",flexDirection:"column",gap:8,maxHeight:420,overflowY:"auto"}}>
        {Object.values(doneByTable).map(tbl=>{
          const ready = canServeTable(tbl.tableId);
          return(
            <div key={tbl.tableId} style={{
              background:ready?"linear-gradient(135deg,#f0fdf4,#e8f5e9)":C.amberP,
              border:`1.5px solid ${ready?C.green:C.amber}44`,borderRadius:11,overflow:"hidden",
              boxShadow:ready?`0 3px 12px ${C.green}18`:"none",
              animation:ready?"popIn 0.4s ease":undefined}}>
              <div style={{padding:"7px 10px",background:ready?C.green+"14":C.amber+"14",
                borderBottom:`1px solid ${ready?C.green:C.amber}22`,
                display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontSize:11,fontWeight:700,color:C.ink,fontFamily:F.body,whiteSpace:"nowrap"}}>{tbl.tableName}</div>
                  <div style={{fontSize:9,color:C.muted,fontFamily:F.body}}>{tbl.dishes.length} {tl("kitchen.dishes")}</div>
                </div>
                {ready?(
                  <div style={{display:"flex",flexDirection:"column",gap:3,alignItems:"flex-end"}}>
                    <span style={{fontSize:8,fontWeight:800,color:C.green,background:C.green+"18",
                      borderRadius:20,padding:"1px 6px",animation:"pulse 1.5s infinite"}}>
                      ✦ PRÊT
                    </span>
                    {freeSrvForServing?(
                      <Btn v="primary" sm onClick={()=>serveTable(tbl.tableId,tbl.tableName)}>
                        {tl("kitchen.serve")}
                      </Btn>
                    ):(
                      <div style={{fontSize:9,color:C.muted,fontFamily:F.body,
                        background:C.border,borderRadius:6,padding:"4px 8px",
                        opacity:0.7,whiteSpace:"nowrap"}}>
                        {tl("kitchen.noServer")}
                      </div>
                    )}
                  </div>
                ):(
                  <span style={{fontSize:10,color:C.amber,fontFamily:F.body,fontWeight:600}}>⏳</span>
                )}
              </div>
              <div style={{padding:"6px 10px",display:"flex",flexWrap:"wrap",gap:3}}>
                {tbl.dishes.map((d,i)=>(
                  <span key={i} style={{fontSize:9,background:C.surface,border:`1px solid ${C.green}33`,
                    borderRadius:4,padding:"1px 6px",fontFamily:F.body,color:C.ink}}>
                    ✓{d.name.length>12?d.name.slice(0,11)+"…":d.name}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
