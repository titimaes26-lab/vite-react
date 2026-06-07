import { useLang } from "../../i18n/index.jsx";
import { Btn, Sel } from "../../components/ui/index.js";
import { PhaseTimeline } from "./PhaseTimeline.jsx";

function DetailPanel({t,tables,servers,kitchen,queue,now,cash,
  C,F,quickPlace,openAssign,checkout,
  addTx,setCash,addToast,setTables,onTableUpgrade,CAP_UPGRADES,
  calcRating,ratingColor,ratingStars,setSelectedTable,activeSrv}) {
  const { t: tr } = useLang();
  const tLive = tables.find(x=>x.id===t.id)||t;
  const isMange = tLive.status==="mange";
  const isNettoyage = tLive.status==="nettoyage";
  const isOrdering = tLive.status==="occupée"&&tLive.svcUntil&&now<tLive.svcUntil;
  const bill = isMange?tLive.order.reduce((s,o)=>s+o.price*o.qty,0):0;
  const themedBill = +bill.toFixed(2);
  const isEating = isMange&&tLive.eatUntil&&now<tLive.eatUntil;
  const eatSecsLeft = isEating?Math.ceil((tLive.eatUntil-now)/1000):0;
  const cleanSecsLeft = isNettoyage&&tLive.cleanUntil?Math.max(0,Math.ceil((tLive.cleanUntil-now)/1000)):0;
  const cleanPct = isNettoyage&&tLive.cleanUntil?Math.min(100,Math.round(((tLive.cleanDur*1000-(tLive.cleanUntil-now))/(tLive.cleanDur*1000))*100)):0;
  const cleanSrvDetail = isNettoyage&&tLive.cleanServer?(servers||[]).find(s=>s.id===tLive.cleanServer):null;
  const eatPct = isEating?Math.min(100,Math.round(((tLive.eatDur*1000-(tLive.eatUntil-now))/(tLive.eatDur*1000))*100)):100;
  const secsLeft = isOrdering?Math.max(0,Math.ceil((tLive.svcUntil-now)/1000)):0;
  const myQ = queue.filter(g=>g.size<=tLive.capacity&&tLive.status==="libre");
  const accentColor = isNettoyage?C.amber:isMange?C.green:isOrdering?C.navy:tLive.status==="occupée"?C.terra:C.green;

  return(
    <div style={{background:C.surface,border:`1.5px solid ${accentColor}44`,borderRadius:16,overflow:"hidden",boxShadow:`0 4px 20px ${accentColor}18`}}>
      <div style={{background:`linear-gradient(135deg,${accentColor}18,${accentColor}08)`,padding:"14px 16px",borderBottom:`1px solid ${accentColor}22`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:18,fontWeight:800,color:C.ink,fontFamily:F.title}}>
              {tLive.name}{tLive.group?.isVIP&&<span style={{marginLeft:6}}>🎩</span>}
            </div>
            <div style={{fontSize:11,color:accentColor,fontWeight:600,fontFamily:F.body,marginTop:3}}>
              {isNettoyage?tr("tables.status.cleaning"):isMange&&isEating?tr("tables.status.eating"):
                isMange?tr("tables.status.readyCheckout"):isOrdering?tr("tables.status.ordering"):
                tLive.status==="occupée"?tr("tables.status.kitchen"):tr("tables.status.free")}
            </div>
            {isNettoyage&&(
              <div style={{fontSize:11,color:accentColor,fontFamily:F.body,marginTop:2}}>
                {cleanSrvDetail
                  ?`👔 ${cleanSrvDetail.name}${cleanSecsLeft>0?" · "+cleanSecsLeft+"s":""}`
                  :tr("tables.waitingServer")}
              </div>
            )}
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:22,fontWeight:800,color:accentColor,fontFamily:F.title}}>{tLive.capacity}</div>
            <div style={{fontSize:9,color:C.muted,fontFamily:F.body}}>{tr("tables.covers")}</div>
          </div>
        </div>
      </div>

      <div style={{padding:"12px 16px",display:"flex",flexDirection:"column",gap:10}}>
        {tLive.group&&(
          <div style={{background:C.bg,borderRadius:10,padding:"10px 12px"}}>
            <div style={{fontSize:13,fontWeight:700,color:C.ink,fontFamily:F.body,marginBottom:3}}>
              {tLive.group.mood.e} {tLive.group.name}
            </div>
            <div style={{fontSize:11,color:C.muted,fontFamily:F.body}}>
              👥 {tLive.group.size}p · {tLive.group.mood.l}{tLive.server&&<span> · 👔 {tLive.server}</span>}
            </div>
          </div>
        )}

        {(tLive.order||[]).length>0&&(
          <div>
            <div style={{fontSize:10,color:C.muted,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.06em",fontFamily:F.body,marginBottom:5}}>{tr("tables.orderLabel")}</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
              {tLive.order.map((o,i)=>(
                <span key={i} style={{fontSize:10,background:o.isSpecial?C.purpleP:C.terraP,color:o.isSpecial?C.purple:C.terra,borderRadius:5,padding:"2px 6px",fontFamily:F.body}}>
                  {o.qty}× {o.item}
                </span>
              ))}
            </div>
          </div>
        )}

        {(tLive.status==="occupée"||isMange||isNettoyage)&&(
          <PhaseTimeline tLive={tLive} kitchen={kitchen} now={now}
            isOrdering={isOrdering} isMange={isMange} isNettoyage={isNettoyage}
            secsLeft={secsLeft} eatSecsLeft={eatSecsLeft} eatPct={eatPct}
            cleanSecsLeft={cleanSecsLeft} cleanPct={cleanPct}/>
        )}

        {isMange&&tLive.group&&(()=>{
          const r=calcRating(tLive.patienceLeftRatio??0.5,tLive.group.mood.b);
          const rc=ratingColor(r);
          return(
            <div style={{background:rc+"11",border:`1px solid ${rc}33`,borderRadius:8,padding:"7px 10px",marginBottom:6,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:14,color:rc,letterSpacing:"2px"}}>{ratingStars(r)}</span>
              <span style={{fontSize:11,color:rc,fontWeight:700,fontFamily:F.body}}>{themedBill.toFixed(2)}€</span>
            </div>
          );
        })()}

        <div style={{display:"flex",flexDirection:"column",gap:6,paddingTop:4}}>
          {isMange&&(
            <Btn full v={isEating?"disabled":"primary"}
              onClick={isEating?null:()=>{checkout(tLive.id);setSelectedTable(null);}}
              icon={isEating?"⏳":"💰"}>
              {isEating?tr("tables.waitBtn"):tr("tables.checkout",{amount:themedBill.toFixed(2)})}
            </Btn>
          )}
          {tLive.status==="libre"&&(
            <>
              {myQ.length>0?(
                <Sel value="" style={{fontSize:11,padding:"6px 10px"}}
                  onChange={e=>{
                    const id=parseFloat(e.target.value);
                    const g=queue.find(x=>x.id===id);
                    if(g){activeSrv.length>0?quickPlace(g):openAssign(g);}
                  }}>
                  <option value="">↳ {tr("app.placeGroup")}</option>
                  {myQ.map(g=>(
                    <option key={g.id} value={g.id}>{g.mood.e} {g.name} ({g.size}p)</option>
                  ))}
                </Sel>
              ):(
                <div style={{fontSize:11,color:C.muted,fontStyle:"italic",fontFamily:F.body,textAlign:"center",padding:"6px 0"}}>
                  {tr("tables.noCompatible")}
                </div>
              )}
            </>
          )}
          {tLive.status==="libre"&&tLive.capLv<2&&(()=>{
            const up=CAP_UPGRADES[tLive.capLv];
            const canAfford=cash>=up.cost;
            return(
              <Btn sm v={canAfford?"navy":"disabled"} disabled={!canAfford}
                onClick={()=>{
                  if(!canAfford)return;
                  setTables(p=>p.map(x=>x.id!==tLive.id?x:{...x,capacity:up.newCap,capLv:tLive.capLv+1}));
                  setCash(c=>+(c-up.cost).toFixed(2));
                  addTx("achat",tr("tables.tableExpand",{name:tLive.name,cap:up.newCap}),up.cost);
                  if(onTableUpgrade)onTableUpgrade();
                }}>
                {tr("tables.expandBtn",{label:up.label,cost:up.cost})}
              </Btn>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

export { DetailPanel };
