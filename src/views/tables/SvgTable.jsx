import { memo } from "react";

export const SvgTable = memo(function SvgTable({
  t, pos, tw, th, CELL_W, CELL_H, cols, C,
  queue, kitchen, now,
  selectedTable, setSelectedTable,
  selectedClient, onPlaceClient, onCancelClientSelect,
  quickPlace, openAssign, checkout,
}) {
  const isMange = t.status==="mange";
  const isNettoyage = t.status==="nettoyage";
  const isOrdering = t.status==="occupée"&&t.svcUntil&&now<t.svcUntil;
  const isLibre = t.status==="libre";
  const myQ = queue.filter(g=>g.size<=t.capacity&&isLibre);
  const isClientTarget = selectedClient&&isLibre&&t.capacity>=selectedClient.size;
  const isClientIncompat = selectedClient&&isLibre&&t.capacity<selectedClient.size;

  const queuedForT = kitchen.queue.filter(d=>d.tableId===t.id);
  const queueStale = queuedForT.length>0&&queuedForT.some(d=>d.addedAt&&(now-d.addedAt)>5000);

  const fill = queueStale?"#e03030":isNettoyage?"#f5d878":isMange?"#4a9e78":isOrdering?"#3a5f8a":
    t.status==="occupée"?"#e07a45":myQ.length>0?"#5ab88a":"#c8e6d8";

  const bill = isMange?(t.order||[]).reduce((s,o)=>s+o.price*o.qty,0):0;
  const themedBill = +bill.toFixed(2);
  const isEating = isMange&&t.eatUntil&&now<t.eatUntil;
  const eatPct = isEating
    ? Math.min(100,Math.round(((t.eatDur*1000-(t.eatUntil-now))/(t.eatDur*1000))*100))
    : isMange?100:0;

  const isCooking = t.status==="occupée"&&!isOrdering;
  const cookingForT = kitchen.cooking.filter(d=>d.tableId===t.id);
  const slowestT = cookingForT.length>0
    ?cookingForT.reduce((a,b)=>(b.startedAt+b.timerMax*1000)>(a.startedAt+a.timerMax*1000)?b:a)
    :null;
  const cookPctSvg = slowestT
    ?Math.min(100,Math.round(((now-slowestT.startedAt)/(slowestT.timerMax*1000))*100)):0;
  const isActive = t.status==="occupée"||isMange||isNettoyage;

  const svgPhase = isOrdering?0:isCooking?1:isMange?2:isNettoyage?3:-1;
  const svgPhasePct =
    svgPhase===0?Math.min(100,Math.round((1-(Math.max(0,(t.svcUntil-now))/((t.svcUntil-t.placedAt)||1)))*100)):
    svgPhase===1?cookPctSvg:
    svgPhase===2?eatPct:
    svgPhase===3?(t.cleanUntil?Math.min(100,Math.round(((t.cleanDur*1000-(t.cleanUntil-now))/(t.cleanDur*1000))*100)):0):0;
  const svgPhaseColor =
    svgPhase===0?"#3a5f8a":svgPhase===1?"#e07a45":svgPhase===2?"#4a9e78":svgPhase===3?"#f5a623":"#888";
  const svgTimer =
    svgPhase===0&&t.svcUntil?Math.max(0,Math.ceil((t.svcUntil-now)/1000)):
    svgPhase===1&&slowestT?Math.max(0,Math.ceil((slowestT.startedAt+slowestT.timerMax*1000-now)/1000)):
    svgPhase===2&&t.eatUntil?Math.max(0,Math.ceil((t.eatUntil-now)/1000)):
    svgPhase===3&&t.cleanUntil?Math.max(0,Math.ceil((t.cleanUntil-now)/1000)):null;
  const svgTimerFmt = svgTimer!==null
    ?(svgTimer>=60?Math.floor(svgTimer/60)+"m"+String(svgTimer%60).padStart(2,"0")+"s":svgTimer+"s"):null;

  return (
    <g key={t.id} onClick={()=>{
      if(isClientTarget){onPlaceClient(selectedClient,t);}
      else if(selectedClient&&!isLibre){/* occupied — ignore */}
      else if(selectedClient&&isClientIncompat){/* too small — ignore */}
      else{if(selectedClient)onCancelClientSelect();setSelectedTable(t);}
    }} onDoubleClick={isMange&&!isEating?()=>{checkout(t.id);setSelectedTable(null);}:null}
    style={{cursor:isClientTarget?"crosshair":selectedClient&&!isClientTarget?"not-allowed":isMange&&!isEating?"cell":"pointer"}}>

      {t.id===selectedTable?.id&&!selectedClient&&(
        <rect x={pos.cx-tw/2-7} y={pos.cy-th/2-7} width={tw+14} height={th+14} rx="13"
          fill="none" stroke="#1a1612" strokeWidth="2.5" opacity="0.25" strokeDasharray="5 3"/>
      )}
      {isClientTarget&&(
        <rect x={pos.cx-tw/2-7} y={pos.cy-th/2-7} width={tw+14} height={th+14} rx="13"
          fill="none" stroke="#1a4f9f" strokeWidth="2.5" opacity="0.6" strokeDasharray="6 3">
          <animate attributeName="opacity" values="0.6;0.15;0.6" dur="1s" repeatCount="indefinite"/>
        </rect>
      )}
      <image
        href={t.capacity<=2?"/table-2.png":t.capacity<=4?"/table-4.png":"/table-6.png"}
        x={pos.cx-CELL_W/2} y={pos.cy-CELL_H/2}
        width={CELL_W} height={CELL_H}
        preserveAspectRatio="xMidYMid meet"/>
      {!isLibre&&(
        <rect x={pos.cx-tw/2} y={pos.cy-th/2} width={tw} height={th} rx="8"
          fill={fill} opacity="0.45"/>
      )}
      {t.group?.isVIP&&(
        <rect x={pos.cx-tw/2-3} y={pos.cy-th/2-3} width={tw+6} height={th+6} rx="10"
          fill="none" stroke="#d4af37" strokeWidth="2" opacity="0.8"/>
      )}
      {isActive&&svgPhase>=0&&(
        <g>
          <rect x={pos.cx-tw/2+3} y={pos.cy+th/2-9} width={tw-6} height={6} rx="3" fill="rgba(0,0,0,0.25)"/>
          <rect x={pos.cx-tw/2+3} y={pos.cy+th/2-9} width={Math.max(0,(tw-6)*svgPhasePct/100)} height={6} rx="3"
            fill={svgPhaseColor} opacity="0.95"/>
          {svgTimerFmt&&(
            <text x={pos.cx} y={pos.cy+th/2-13} textAnchor="middle"
              fontSize="7" fontWeight="700" fill="rgba(255,255,255,0.9)" fontFamily="sans-serif">
              {svgTimerFmt}
            </text>
          )}
        </g>
      )}
      <text x={pos.cx} y={pos.cy-3} textAnchor="middle"
        fontSize={cols<=3?12:10} fontWeight="700"
        fill={isLibre&&myQ.length===0?"#2a5c3f":"white"} fontFamily="Georgia,serif">
        {t.name.replace("Table ","")}
      </text>
      <text x={pos.cx} y={pos.cy+10} textAnchor="middle"
        fontSize={cols<=3?9:8}
        fill={isLibre&&myQ.length===0?"#4a7c5f":"rgba(255,255,255,0.9)"} fontFamily="sans-serif">
        {isNettoyage?"🧹":isMange&&isEating?"🍴":isMange?"💰":
          isOrdering?"🛎":t.status==="occupée"?"🔥":
          myQ.length>0?"👥":`✓ ${t.capacity}p`}
      </text>
      {isMange&&!isEating&&(
        <g>
          <rect x={pos.cx-19} y={pos.cy-th/2-16} width={38} height={14} rx="7" fill={C.green} opacity="0.95"/>
          <text x={pos.cx} y={pos.cy-th/2-6} textAnchor="middle" fontSize="8" fontWeight="800"
            fill="white" fontFamily="sans-serif">💰{themedBill.toFixed(0)}€</text>
        </g>
      )}
      {t.group?.isVIP&&(
        <text x={pos.cx+tw/2-5} y={pos.cy-th/2+10} textAnchor="middle" fontSize="10">🎩</text>
      )}
      {isLibre&&myQ.length>0&&!selectedClient&&(
        <rect x={pos.cx-tw/2} y={pos.cy-th/2} width={tw} height={th} rx="8"
          fill="none" stroke={C.green} strokeWidth="2.5" opacity="0.7">
          <animate attributeName="opacity" values="0.7;0.1;0.7" dur="1.8s" repeatCount="indefinite"/>
        </rect>
      )}
    </g>
  );
});
