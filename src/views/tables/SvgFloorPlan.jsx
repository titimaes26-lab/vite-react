import { useLang } from "../../i18n/index.jsx";
import { SvgTable } from "./SvgTable.jsx";
import { SvgLockedSlot } from "./SvgLockedSlot.jsx";

function SvgFloorPlan({tables,servers,kitchen,queue,now,C,F,
  selectedTable,setSelectedTable,
  srvLv,SRV_LVL,calcRating,ratingColor,ratingStars,calcTip,
  quickPlace,openAssign,checkout,activeSrv,lockedSlots=[],
  selectedClient,onPlaceClient,onCancelClientSelect}) {
  const { t: tr } = useLang();
  const n = tables.length + lockedSlots.length;

  const cols = n===1?1:n<=3?n:n<=6?3:n<=9?3:4;
  const rows = Math.ceil(n / cols);

  const ML=0, MT=52, MR=47, MB=48;
  const VW=800;
  const gridW = VW - ML - MR;
  const CELL_W = Math.min(220, Math.floor(gridW / cols));
  const CELL_H = Math.min(90, Math.floor(400 / rows));
  const VH = MT + rows * CELL_H + MB;

  const getTW = (cap) => Math.round(CELL_W * (cap<=2?0.60:cap<=4?0.68:0.76));
  const getTH = (cap) => Math.round(CELL_H * (cap<=2?0.55:cap<=4?0.62:0.70));
  const getPos = (i) => ({
    cx: ML + (i % cols) * CELL_W + CELL_W / 2,
    cy: MT + Math.floor(i / cols) * CELL_H + CELL_H / 2,
  });

  return(
    <svg viewBox={`0 0 ${VW} ${VH}`} width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style={{display:"block",position:"absolute",inset:0}}>
      <rect x="0" y="0" width={VW} height={VH} fill="#faf7f0"/>

      {selectedClient&&(
        <g>
          <rect x="0" y="0" width={VW} height={22} fill="#1a4f9f" opacity="0.92"/>
          <text x={VW/2} y={14} textAnchor="middle" fontSize="9" fontWeight="700"
            fill="white" fontFamily="sans-serif">
            {tr("tables.selectionMode",{emoji:selectedClient.mood.e,name:selectedClient.name,size:selectedClient.size})}
          </text>
        </g>
      )}
      {Array.from({length:Math.ceil(VH/20)+1},(_,i)=>(
        <line key={`h${i}`} x1="0" y1={i*20} x2={VW} y2={i*20} stroke="#e8e0d0" strokeWidth="0.5"/>
      ))}
      {Array.from({length:Math.ceil(VW/20)+1},(_,i)=>(
        <line key={`v${i}`} x1={i*20} y1="0" x2={i*20} y2={VH} stroke="#e8e0d0" strokeWidth="0.5"/>
      ))}

      <rect x={VW/2-50} y={VH-20} width={100} height={20} rx="4" fill="#d4c9b0" opacity="0.8"/>
      <text x={VW/2} y={VH-8} textAnchor="middle" fontSize="9" fill="#8a7d6a" fontFamily="sans-serif">
        {tr("tables.entrance")}
      </text>

      <image href="/bar.png" x={VW-MR+6-100} y={MT} width={130} height={CELL_H*2}
        preserveAspectRatio="xMidYMid slice"/>

      {tables.map((t, i) => (
        <SvgTable key={t.id} t={t} pos={getPos(i)}
          tw={getTW(t.capacity)} th={getTH(t.capacity)}
          CELL_W={CELL_W} CELL_H={CELL_H} cols={cols} C={C}
          queue={queue} kitchen={kitchen} now={now}
          selectedTable={selectedTable} setSelectedTable={setSelectedTable}
          selectedClient={selectedClient} onPlaceClient={onPlaceClient} onCancelClientSelect={onCancelClientSelect}
          quickPlace={quickPlace} openAssign={openAssign} checkout={checkout}/>
      ))}

      {lockedSlots.map((slot, li) => (
        <SvgLockedSlot key={"locked"+slot.num} slot={slot} pos={getPos(tables.length+li)}
          tw={getTW(2)} th={getTH(2)}/>
      ))}
    </svg>
  );
}

export { SvgFloorPlan };
