/* ═══════════════════════════════════════════════════════
   src/views/tables/DetailPanel.jsx
   Panneau de détail d'une table sélectionnée.
═══════════════════════════════════════════════════════ */
import { useLang } from "../../i18n/index.jsx";
import { Btn, Sel } from "../../components/ui/index.js";

function DetailPanel({t,tables,servers,kitchen,queue,now,cash,
  C,F,quickPlace,openAssign,checkout,
  addTx,setCash,addToast,setTables,onTableUpgrade,CAP_UPGRADES,
  calcRating,ratingColor,ratingStars,setSelectedTable,activeSrv}) {
  // t is passed as prop — tr used for i18n to avoid conflict
  const { t: tr } = useLang();
              // Refresh from live tables
              const tLive=tables.find(x=>x.id===t.id)||t;
              const isMange=tLive.status==="mange";
              const isNettoyage=tLive.status==="nettoyage";
              const isOrdering=tLive.status==="occupée"&&tLive.svcUntil&&now<tLive.svcUntil;
              const bill=isMange?tLive.order.reduce((s,o)=>s+o.price*o.qty,0):0;
              const themedBill=+bill.toFixed(2);
              const isEating=isMange&&tLive.eatUntil&&now<tLive.eatUntil;
              const eatSecsLeft=isEating?Math.ceil((tLive.eatUntil-now)/1000):0;
              const cleanSecsLeft=isNettoyage&&tLive.cleanUntil?Math.max(0,Math.ceil((tLive.cleanUntil-now)/1000)):0;
              const cleanPct=isNettoyage&&tLive.cleanUntil?Math.min(100,Math.round(((tLive.cleanDur*1000-(tLive.cleanUntil-now))/(tLive.cleanDur*1000))*100)):0;
              const cleanSrvDetail=isNettoyage&&tLive.cleanServer?(servers||[]).find(s=>s.id===tLive.cleanServer):null;
              const eatPct=isEating?Math.min(100,Math.round(((tLive.eatDur*1000-(tLive.eatUntil-now))/(tLive.eatDur*1000))*100)):100;
              const secsLeft=isOrdering?Math.max(0,Math.ceil((tLive.svcUntil-now)/1000)):0;
              const myQ=queue.filter(g=>g.size<=tLive.capacity&&tLive.status==="libre");
              const accentColor=isNettoyage?C.amber:isMange?C.green:isOrdering?C.navy:tLive.status==="occupée"?C.terra:C.green;

              return(
                <div style={{background:C.surface,border:`1.5px solid ${accentColor}44`,
                  borderRadius:16,overflow:"hidden",
                  boxShadow:`0 4px 20px ${accentColor}18`}}>

                  {/* Header */}
                  <div style={{background:`linear-gradient(135deg,${accentColor}18,${accentColor}08)`,
                    padding:"14px 16px",borderBottom:`1px solid ${accentColor}22`}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div>
                        <div style={{fontSize:18,fontWeight:800,color:C.ink,fontFamily:F.title}}>
                          {tLive.name}
                          {tLive.group?.isVIP&&<span style={{marginLeft:6}}>🎩</span>}
                        </div>
                        <div style={{fontSize:11,color:accentColor,fontWeight:600,
                          fontFamily:F.body,marginTop:3}}>
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
                        <div style={{fontSize:22,fontWeight:800,color:accentColor,fontFamily:F.title}}>
                          {tLive.capacity}
                        </div>
                        <div style={{fontSize:9,color:C.muted,fontFamily:F.body}}>{tr("tables.covers")}</div>
                      </div>
                    </div>
                  </div>

                  <div style={{padding:"12px 16px",display:"flex",flexDirection:"column",gap:10}}>

                    {/* Groupe */}
                    {tLive.group&&(
                      <div style={{background:C.bg,borderRadius:10,padding:"10px 12px"}}>
                        <div style={{fontSize:13,fontWeight:700,color:C.ink,fontFamily:F.body,marginBottom:3}}>
                          {tLive.group.mood.e} {tLive.group.name}
                        </div>
                        <div style={{fontSize:11,color:C.muted,fontFamily:F.body}}>
                          👥 {tLive.group.size}p · {tLive.group.mood.l}
                          {tLive.server&&<span> · 👔 {tLive.server}</span>}
                        </div>
                      </div>
                    )}

                    {/* Commande */}
                    {(tLive.order||[]).length>0&&(
                      <div>
                        <div style={{fontSize:10,color:C.muted,fontWeight:600,
                          textTransform:"uppercase",letterSpacing:"0.06em",
                          fontFamily:F.body,marginBottom:5}}>{tr("tables.orderLabel")}</div>
                        <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                          {tLive.order.map((o,i)=>(
                            <span key={i} style={{fontSize:10,
                              background:o.isSpecial?C.purpleP:C.terraP,
                              color:o.isSpecial?C.purple:C.terra,
                              borderRadius:5,padding:"2px 6px",fontFamily:F.body}}>
                              {o.qty}× {o.item}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ── Phase timeline — panneau détail ── */}
                    {(tLive.status==="occupée"||isMange||isNettoyage)&&(()=>{
                      const isCooking=tLive.status==="occupée"&&!isOrdering;
                      const panelCooking=kitchen.cooking.filter(d=>d.tableId===tLive.id);
                      const panelSlowest=panelCooking.length>0
                        ?panelCooking.reduce((a,b)=>(b.startedAt+b.timerMax*1000)>(a.startedAt+a.timerMax*1000)?b:a)
                        :null;
                      const panelCookPct=panelSlowest
                        ?Math.min(100,Math.round(((now-panelSlowest.startedAt)/(panelSlowest.timerMax*1000))*100))
                        :isCooking?null:isMange||isNettoyage?100:0;
                      const panelCookRemaining=panelSlowest
                        ?Math.max(0,Math.ceil((panelSlowest.startedAt+panelSlowest.timerMax*1000-now)/1000))
                        :null;
                      const panelPhases=[
                        {id:"commande",icon:"🛎",label:tr("tables.phaseOrder"),color:C.navy,
                          done:!isOrdering&&(isCooking||isMange||isNettoyage),
                          active:isOrdering,
                          pct:isOrdering?Math.min(100,Math.round((1-secsLeft/((tLive.svcUntil-tLive.placedAt)/1000||30))*100)):100,
                          timer:isOrdering?secsLeft:null},
                        {id:"cuisine",icon:"🔥",label:tr("tables.phaseKitchen"),color:C.terra,
                          done:isMange||isNettoyage,active:isCooking,
                          pct:panelCookPct,timer:panelCookRemaining},
                        {id:"repas",icon:"🍴",label:tr("tables.phaseEating"),color:C.green,
                          done:isNettoyage,active:isMange,
                          pct:isMange?(isEating?eatPct:100):isNettoyage?100:0,
                          timer:isEating?eatSecsLeft:null},
                        {id:"nettoyage",icon:"🧹",label:tr("tables.phaseCleaning"),color:C.amber,
                          done:false,active:isNettoyage,
                          pct:isNettoyage?cleanPct:0,timer:isNettoyage?cleanSecsLeft:null},
                      ];
                      const activeP=panelPhases.find(p=>p.active);
                      return(
                        <div>
                          {/* Steps */}
                          <div style={{display:"flex",alignItems:"center",marginBottom:8}}>
                            {panelPhases.map((ph,pi)=>(
                              <div key={ph.id} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",position:"relative"}}>
                                {pi>0&&<div style={{position:"absolute",left:0,top:11,width:"50%",height:2,background:panelPhases[pi-1].done||panelPhases[pi-1].active?ph.color+"55":C.border}}/>}
                                {pi<panelPhases.length-1&&<div style={{position:"absolute",right:0,top:11,width:"50%",height:2,background:ph.done?ph.color+"55":C.border}}/>}
                                <div style={{
                                  width:24,height:24,borderRadius:"50%",zIndex:1,position:"relative",
                                  background:ph.done?"#fff":ph.active?ph.color:C.bg,
                                  border:`2px solid ${ph.done||ph.active?ph.color:C.border}`,
                                  display:"flex",alignItems:"center",justifyContent:"center",
                                  fontSize:11,
                                  boxShadow:ph.active?`0 0 0 4px ${ph.color}22`:"none",
                                  transition:"all 0.3s",
                                }}>
                                  {ph.done?<span style={{color:ph.color,fontWeight:800,fontSize:11}}>✓</span>
                                    :ph.active?<span style={{animation:ph.pct===null?"pulse 1s infinite":undefined}}>{ph.icon}</span>
                                    :<span style={{fontSize:8,color:C.muted,fontWeight:700}}>{pi+1}</span>}
                                </div>
                                <div style={{fontSize:8,color:ph.active?ph.color:ph.done?ph.color+"88":C.muted,
                                  fontWeight:ph.active?700:400,marginTop:4,fontFamily:F.body,whiteSpace:"nowrap"}}>
                                  {ph.label}
                                </div>
                              </div>
                            ))}
                          </div>
                          {/* Active phase bar */}
                          {activeP&&(
                            <div style={{marginBottom:10}}>
                              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4,fontSize:10,fontFamily:F.body}}>
                                <span style={{color:activeP.color,fontWeight:700}}>{tr("tables.phaseInProgress",{icon:activeP.icon,label:activeP.label})}</span>
                                {activeP.timer!==null&&<span style={{color:C.muted,fontWeight:600}}>
                                  {Math.floor(activeP.timer/60)}:{String(activeP.timer%60).padStart(2,"0")}
                                </span>}
                              </div>
                              <div style={{height:8,background:C.border,borderRadius:99,overflow:"hidden",position:"relative"}}>
                                {activeP.pct===null
                                  ?<div style={{position:"absolute",inset:0,background:`linear-gradient(90deg,transparent,${activeP.color}77,transparent)`,backgroundSize:"200% 100%",animation:"shimmerBar 1.6s ease-in-out infinite"}}/>
                                  :<div style={{width:"100%",height:"100%",background:`linear-gradient(90deg,${activeP.color}cc,${activeP.color})`,borderRadius:99,transformOrigin:"left center",transform:`scaleX(${activeP.pct/100})`,transition:"transform 0.5s linear",position:"relative",overflow:"hidden"}}>
                                    <div style={{position:"absolute",inset:0,background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.28),transparent)",backgroundSize:"200% 100%",animation:"shimmerBar 2s ease-in-out infinite"}}/>
                                  </div>
                                }
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Note prévisionnelle */}
                    {isMange&&tLive.group&&(()=>{
                      const r=calcRating(tLive.patienceLeftRatio??0.5,tLive.group.mood.b);
                      const rc=ratingColor(r);
                      return(
                        <div style={{background:rc+"11",border:`1px solid ${rc}33`,
                          borderRadius:8,padding:"7px 10px",marginBottom:6,
                          display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                          <span style={{fontSize:14,color:rc,letterSpacing:"2px"}}>{ratingStars(r)}</span>
                          <span style={{fontSize:11,color:rc,fontWeight:700,fontFamily:F.body}}>
                            {themedBill.toFixed(2)}€
                          </span>
                        </div>
                      );
                    })()}

                    {/* Actions */}
                    <div style={{display:"flex",flexDirection:"column",gap:6,paddingTop:4}}>

                      {/* Encaisser */}
                      {isMange&&(
                        <Btn full v={isEating?"disabled":"primary"}
                          onClick={isEating?null:()=>{checkout(tLive.id);setSelectedTable(null);}}
                          icon={isEating?"⏳":"💰"}>
                          {isEating?tr("tables.waitBtn"):tr("tables.checkout",{amount:themedBill.toFixed(2)})}
                        </Btn>
                      )}

                      {/* Placer un groupe */}
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
                                <option key={g.id} value={g.id}>
                                  {g.mood.e} {g.name} ({g.size}p)
                                </option>
                              ))}
                            </Sel>
                          ):(
                            <div style={{fontSize:11,color:C.muted,fontStyle:"italic",
                              fontFamily:F.body,textAlign:"center",padding:"6px 0"}}>
                              {tr("tables.noCompatible")}
                            </div>
                          )}
                        </>
                      )}

                      {/* Agrandir table */}
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
