import { memo } from "react";
import { C } from "../../constants/gameData.js";

export const PieChart = memo(function PieChart({ data, size=100 }) {
  const cx=size/2, cy=size/2, r=size/2-8;
  let cumAngle = -Math.PI/2;
  const slices = data.filter(d=>d.value>0);
  const total = slices.reduce((s,d)=>s+d.value, 0) || 1;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {slices.map((d,i)=>{
        const angle=(d.value/total)*2*Math.PI;
        const x1=cx+r*Math.cos(cumAngle);
        const y1=cy+r*Math.sin(cumAngle);
        cumAngle+=angle;
        const x2=cx+r*Math.cos(cumAngle);
        const y2=cy+r*Math.sin(cumAngle);
        const largeArc=angle>Math.PI?1:0;
        return (
          <path key={i}
            d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`}
            fill={d.color} stroke="#fff" strokeWidth="1.5" opacity="0.9"/>
        );
      })}
      <circle cx={cx} cy={cy} r={r*0.52} fill={C.surface}/>
    </svg>
  );
});
