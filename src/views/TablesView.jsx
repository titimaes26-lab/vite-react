import { memo } from "react";
import { C, F, GAME_EVENTS, SRV_LVL, CAP_UPGRADES } from "../constants/gameData.js";
import { useLang } from "../i18n/index.jsx";
import { isOnShift } from "../hooks/useGameClock.js";
import { Btn } from "../components/ui/index.js";
import { calcRating, ratingColor, ratingStars, calcTip, srvLv } from "../utils/levelUtils.js";
import { DetailPanel } from "./tables/DetailPanel.jsx";
import { SvgFloorPlan } from "./tables/SvgFloorPlan.jsx";
import { useTablesView } from "./tables/useTablesView.js";
import { QueuePanel } from "./tables/QueuePanel.jsx";
import { KitchenBar } from "./tables/KitchenBar.jsx";
import { AssignModal } from "./tables/AssignModal.jsx";

export const TablesView = memo(function TablesView({tables,setTables,servers,setServers,menu,setMenu,setKitchen,kitchen,addToast,addRestoXp,cash,setCash,addTx,queue,setQueue,waitlist,setWaitlist,addDayStat,gameTime,onTableUpgrade,activeEvent,setChallengeProgress,reputation,updateReputation,restoLvN=0,formulas=[],stock=[],bp={}}) {
  const { t: tr } = useLang();
  const {
    now, selectedTable, setSelectedTable, selectedClient, setSelectedClient,
    modal, setModal, tgtT, setTgtT, tgtS, setTgtS, preview,
    absMin, activeSrv, freeTbl, lockedSlots,
    quickPlace, openAssign, toggleSelectClient, placeClientAtTable, recallGroup, checkout, confirm,
  } = useTablesView({tables,setTables,servers,setServers,menu,setMenu,setKitchen,kitchen,addToast,addRestoXp,cash,setCash,addTx,queue,setQueue,waitlist,setWaitlist,addDayStat,gameTime,setChallengeProgress,updateReputation,restoLvN,formulas,stock});

  return(
    <div style={{display:"flex",flexDirection:"column",height:"100vh",overflow:"hidden",background:C.bg}}>

      <div style={{height:42,flexShrink:0,background:C.surface,borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",paddingLeft:14,paddingRight:14,gap:14,zIndex:10}}>
        <span style={{fontSize:11,color:C.muted,fontFamily:F.body}}>{tr("tables.freeStatus",{current:tables.filter(t=>t.status==="libre").length,total:tables.length})}</span>
        {queue.length>0&&<span style={{fontSize:11,fontWeight:700,color:queue.length>=3?C.red:C.amber,fontFamily:F.body}}>{tr("tables.waiting",{count:queue.length})}</span>}
        {reputation!==undefined&&(
          <div style={{display:"flex",alignItems:"center",gap:5,marginLeft:"auto"}}>
            <span style={{fontSize:10,color:C.muted,fontFamily:F.body}}>{tr("tables.repLabel")}</span>
            <div style={{width:48,height:5,background:C.border,borderRadius:99,overflow:"hidden"}}>
              <div style={{height:"100%",width:"100%",background:reputation>=60?C.green:reputation>=30?C.amber:C.red,borderRadius:99,transformOrigin:"left center",transform:`scaleX(${reputation/100})`,transition:"transform 0.5s"}}/>
            </div>
          </div>
        )}
        {activeEvent&&(()=>{const evt=GAME_EVENTS.find(e=>e.id===activeEvent);return evt?<div style={{display:"flex",alignItems:"center",gap:5,background:C.amberP,border:`1px solid ${C.amber}44`,borderRadius:8,padding:"2px 9px",flexShrink:0}}><span style={{fontSize:12}}>{evt.icon}</span><span style={{fontSize:10,color:C.amber,fontWeight:700,fontFamily:F.body}}>{evt.title}</span></div>:null;})()}
      </div>

      {!bp.isMobile&&(
        <div style={{flex:1,display:"flex",flexDirection:"row",minHeight:0,overflow:"hidden"}}>
          <div style={{width:bp.isTablet?210:240,flexShrink:0,borderRight:`1px solid ${C.border}`,background:C.surface,display:"flex",flexDirection:"column",overflowY:"hidden"}}>
            <QueuePanel queue={queue} waitlist={waitlist} now={now} tables={tables} servers={servers} absMin={absMin} selectedClient={selectedClient} quickPlace={quickPlace} openAssign={openAssign} toggleSelectClient={toggleSelectClient} setSelectedClient={setSelectedClient} recallGroup={recallGroup}/>
            {selectedTable&&(
              <div style={{flex:1,minHeight:0,borderTop:(queue.length>0||waitlist.length>0)?`1px solid ${C.border}`:undefined,display:"flex",flexDirection:"column",overflowY:"hidden"}}>
                <div style={{padding:"8px 12px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
                  <span style={{fontSize:12,fontWeight:700,color:C.ink,fontFamily:F.title}}>📋 {selectedTable.name}</span>
                  <button onClick={()=>setSelectedTable(null)} style={{background:"none",border:"none",fontSize:16,cursor:"pointer",color:C.muted,padding:"0 4px",lineHeight:1}}>✕</button>
                </div>
                <div style={{padding:10,flex:1,overflowY:"auto"}}>
                  <DetailPanel t={selectedTable} tables={tables} servers={servers} kitchen={kitchen} queue={queue} now={now} cash={cash} C={C} F={F} quickPlace={quickPlace} openAssign={openAssign} checkout={checkout} setSelectedTable={setSelectedTable} addTx={addTx} setCash={setCash} addToast={addToast} setTables={setTables} onTableUpgrade={onTableUpgrade} CAP_UPGRADES={CAP_UPGRADES} calcRating={calcRating} ratingColor={ratingColor} ratingStars={ratingStars} activeSrv={activeSrv}/>
                </div>
              </div>
            )}
          </div>
          <div style={{flex:1,minWidth:0,background:"#faf7f0",overflow:"hidden",position:"relative"}}>
            <SvgFloorPlan tables={tables} servers={servers} kitchen={kitchen} queue={queue} now={now} C={C} F={F} selectedTable={selectedTable} setSelectedTable={setSelectedTable} srvLv={srvLv} SRV_LVL={SRV_LVL} calcRating={calcRating} ratingColor={ratingColor} ratingStars={ratingStars} calcTip={calcTip} quickPlace={quickPlace} openAssign={openAssign} checkout={checkout} activeSrv={activeSrv} lockedSlots={lockedSlots} selectedClient={selectedClient} onPlaceClient={placeClientAtTable} onCancelClientSelect={()=>setSelectedClient(null)}/>
          </div>
        </div>
      )}

      {bp.isMobile&&(
        <div style={{flex:1,overflowY:"auto",padding:8,background:"rgba(250,247,240,0.97)"}}>
          {tables.map(t=>{
            const isOm=t.status==="occupée"&&t.svcUntil&&now<t.svcUntil;
            const isMm=t.status==="mange",isNm=t.status==="nettoyage",isLm=t.status==="libre";
            const isCm=t.status==="occupée"&&!isOm,isEm=isMm&&t.eatUntil&&now<t.eatUntil;
            const myQm=queue.filter(g=>g.size<=t.capacity&&isLm);
            const aSm=servers.filter(s=>s.status==="actif"&&(s.moral??100)>10&&(!s.shift||isOnShift(s.shift,absMin)));
            const ph=isOm?0:isCm?1:isMm?2:isNm?3:-1;
            const pCs=["#3a5f8a","#e07a45","#4a9e78","#f5a623"],pIs=["🛎","🔥","🍴","🧹"];
            const pLs=[tr("tables.phaseOrder"),tr("tables.phaseKitchen"),tr("tables.phaseEating"),tr("tables.phaseCleaning")];
            const pC=ph>=0?pCs[ph]:C.green;
            const ckT=kitchen.cooking.filter(d=>d.tableId===t.id);
            const slw=ckT.length>0?ckT.reduce((a,b)=>(b.startedAt+b.timerMax*1000)>(a.startedAt+a.timerMax*1000)?b:a):null;
            const pc=ph===0?Math.min(100,Math.round((1-(Math.max(0,(t.svcUntil-now))/((t.svcUntil-t.placedAt)||1)))*100)):ph===1?(slw?Math.min(100,Math.round(((now-slw.startedAt)/(slw.timerMax*1000))*100)):0):ph===2?(isEm?Math.min(100,Math.round(((t.eatDur*1000-(t.eatUntil-now))/(t.eatDur*1000))*100)):100):ph===3?(t.cleanUntil?Math.min(100,Math.round(((t.cleanDur*1000-(t.cleanUntil-now))/(t.cleanDur*1000))*100)):0):0;
            const bl=isMm?+t.order.reduce((s,o)=>s+o.price*o.qty,0).toFixed(2):0;
            return(
              <div key={t.id} style={{background:C.surface,border:`1.5px solid ${ph>=0?pC+"55":C.border}`,borderLeft:`4px solid ${ph>=0?pC:C.green}`,borderRadius:11,padding:"9px 11px",marginBottom:7}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                  <span style={{fontSize:13,fontWeight:800,color:C.ink,fontFamily:F.title}}>{t.name}</span>
                  <span style={{fontSize:9,background:ph>=0?pC+"18":C.greenP,color:ph>=0?pC:C.green,borderRadius:20,padding:"1px 7px",fontWeight:600,fontFamily:F.body}}>{ph>=0?pIs[ph]+" "+pLs[ph]:tr("tables.status.free")}</span>
                </div>
                {ph>=0&&<div style={{height:3,background:pC+"22",borderRadius:99,overflow:"hidden",marginBottom:5}}><div style={{height:"100%",width:"100%",background:pC,borderRadius:99,transformOrigin:"left center",transform:`scaleX(${pc/100})`,transition:"transform 0.5s"}}/></div>}
                {t.group&&<div style={{fontSize:10,color:C.muted,fontFamily:F.body,marginBottom:5}}>{t.group.mood.e} {t.group.name} · {t.group.size}p{t.server?" · 👔 "+t.server:""}</div>}
                {isNm&&(()=>{const cs=t.cleanServer?servers.find(s=>s.id===t.cleanServer):null;const rem=t.cleanUntil?Math.max(0,Math.ceil((t.cleanUntil-now)/1000)):null;return <div style={{fontSize:10,color:C.amber,fontFamily:F.body,marginBottom:5}}>{cs?`👔 ${cs.name}`:tr("tables.waitingServer")}{rem!==null&&` · ${rem}s`}</div>;})()}
                {isMm&&!isEm&&<Btn full v="primary" sm onClick={()=>checkout(t.id)} icon="💰">{tr("tables.checkout",{amount:bl})}</Btn>}
                {isLm&&myQm.length>0&&aSm.length>0&&<Btn full v="terra" sm onClick={()=>quickPlace(myQm[0])} icon="👥">Placer</Btn>}
                {isLm&&myQm.length>0&&aSm.length===0&&<Btn full v="secondary" sm onClick={()=>openAssign(myQm[0])} icon="👥">Placer</Btn>}
              </div>
            );
          })}
          {lockedSlots.map(slot=>(
            <div key={"locked"+slot.num} style={{background:C.bg,border:`1px dashed ${C.border}`,borderRadius:12,padding:"10px 14px",opacity:0.55,display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
              <span style={{fontSize:22}}>🔒</span>
              <div style={{flex:1}}>
                <div style={{fontSize:12,fontWeight:700,color:C.muted,fontFamily:F.body}}>{tr("tables.lockedTable",{num:slot.num})}</div>
                <div style={{fontSize:10,color:C.muted,fontFamily:F.body}}>{tr("tables.lockedLevel",{level:slot.unlocksAt.l,name:slot.unlocksAt.name})}</div>
              </div>
              <span style={{fontSize:11,color:slot.unlocksAt.color,fontWeight:700,fontFamily:F.body,whiteSpace:"nowrap"}}>{slot.unlocksAt.icon} Niv.{slot.unlocksAt.l}</span>
            </div>
          ))}
        </div>
      )}

      <KitchenBar kitchen={kitchen} tables={tables} servers={servers} now={now} setSelectedTable={setSelectedTable}/>
      <AssignModal modal={modal} setModal={setModal} tgtT={tgtT} setTgtT={setTgtT} tgtS={tgtS} setTgtS={setTgtS} preview={preview} confirm={confirm} freeTbl={freeTbl} activeSrv={activeSrv}/>
    </div>
  );
});
