import { memo } from "react";
import { C } from "../../constants/gameData.js";

export const LineChart = memo(function LineChart({ data, color, unit="", hov, setHov, chartDays, height=110, fillOpacity=0.15 }) {
  const W=320, H=height, PAD=20, BOTTOM=22;
  const vals = data.map(d=>d||0);
  const maxV = Math.max(...vals, 1);
  const pts = vals.map((v,i)=>[
    PAD+(i/(vals.length-1||1))*(W-PAD*2),
    H-BOTTOM-((v/maxV)*(H-BOTTOM-8))
  ]);
  const path = pts.length<2 ? "" : [
    `M ${pts[0][0]} ${pts[0][1]}`,
    ...pts.slice(1).map((p,i)=>{
      const prev=pts[i];
      const cp1x=prev[0]+(p[0]-prev[0])/3;
      const cp2x=p[0]-(p[0]-prev[0])/3;
      return `C ${cp1x} ${prev[1]} ${cp2x} ${p[1]} ${p[0]} ${p[1]}`;
    })
  ].join(" ");
  const fillPath = path + ` L ${pts[pts.length-1][0]} ${H-BOTTOM} L ${pts[0][0]} ${H-BOTTOM} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{overflow:"visible"}} onMouseLeave={()=>setHov(null)}>
      {[0.25,0.5,0.75,1].map(f=>(
        <line key={f} x1={PAD} y1={H-BOTTOM-(f*(H-BOTTOM-8))} x2={W-PAD} y2={H-BOTTOM-(f*(H-BOTTOM-8))}
          stroke={C.border} strokeWidth="0.8" strokeDasharray="4 3"/>
      ))}
      <line x1={PAD} y1={H-BOTTOM} x2={W-PAD} y2={H-BOTTOM} stroke={C.border} strokeWidth="1"/>
      {pts.length>=2 && <path d={fillPath} fill={color} opacity={fillOpacity}/>}
      {pts.length>=2 && <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>}
      {pts.map(([x,y],i)=>(
        <g key={i} onMouseEnter={()=>setHov(i)} style={{cursor:"pointer"}}>
          <circle cx={x} cy={y} r={hov===i?6:4} fill={color} stroke="#fff" strokeWidth="2"
            opacity={hov===i||hov===null?1:0.6} style={{transition:"r 0.15s,opacity 0.15s"}}/>
          {hov===i && (
            <g>
              <rect x={x-36} y={y-32} width={72} height={22} rx="6" fill={C.ink} opacity="0.9"/>
              <text x={x} y={y-17} textAnchor="middle" fontSize="10" fontWeight="700" fill="#fff" fontFamily="sans-serif">
                {vals[i].toFixed(0)}{unit}
              </text>
            </g>
          )}
        </g>
      ))}
      {(chartDays||[]).map((d,i)=>(
        <text key={i} x={pts[i]?.[0]||0} y={H-5} textAnchor="middle"
          fontSize="8" fill={i===chartDays.length-1?color:C.muted}
          fontFamily="sans-serif" fontWeight={i===chartDays.length-1?"700":"400"}>
          {`J${d.day??""}`}
        </text>
      ))}
    </svg>
  );
});
